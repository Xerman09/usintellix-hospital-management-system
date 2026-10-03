import { fetchPharmacyDashboard } from "./pharmacy-dashboard.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { getUser } from "../../core/session.js";

const REFRESH_MS = 5 * 60 * 1000;
const ITEMS_PER_LOCATION = 5;

/** Which tabs each role can open from here (matches the Pharmacy menu). */
const TAB_ROLES = {
    pharmacy_stock_levels: ["admin", "receptionist", "doctor"],
    pharmacy_stock_transfers: ["admin", "receptionist", "doctor", "accountant"],
    pharmacy_medicine_ledger: ["admin", "receptionist", "doctor", "accountant"],
    pharmacy_lot_trace: ["admin", "receptionist", "doctor", "accountant"],
    pharmacy_stock_counts: ["admin", "receptionist", "doctor", "accountant"],
    pharmacy_payables: ["admin", "accountant"]
};
const TAB_TITLES = {
    pharmacy_stock_levels: "Stock Levels", pharmacy_stock_transfers: "Stock Transfers", pharmacy_medicine_ledger: "Medicine Ledger",
    pharmacy_lot_trace: "Lot Tracing", pharmacy_stock_counts: "Stock Count"
};
const MOVE_SIGN_STYLE = (qty) => (qty >= 0 ? "pd-in" : "pd-out");

let data = null;
let role = "";
let timer = null;
let loading = false;

const $ = (id) => document.getElementById(id);

export async function initPharmacyDashboard() {
    role = getUser()?.role || "";
    data = null;
    clearInterval(timer);

    $("pdLocation").addEventListener("change", load);
    $("pdRefresh").addEventListener("click", load);
    $("pdBody").addEventListener("click", onBodyClick);

    // Keep the numbers fresh while the tab stays open; stop once it's closed.
    timer = setInterval(() => {
        if (!document.body.contains($("pdBody"))) {
            clearInterval(timer);
            return;
        }
        if (!document.hidden) load();
    }, REFRESH_MS);

    await load();
}

function canOpen(tab) {
    return !TAB_ROLES[tab] || TAB_ROLES[tab].includes(role);
}

function openTab(tab, title) {
    if (typeof window.__openDashboardTab === "function") {
        window.__openDashboardTab(tab, title || TAB_TITLES[tab] || "");
    }
}

function onBodyClick(event) {
    const target = event.target.closest("[data-pd-open]");
    if (target) openTab(target.dataset.pdOpen, target.dataset.pdTitle);
}

const tabLink = (tab, label, title = "") =>
    canOpen(tab) ? `<button type="button" class="pd-link" data-pd-open="${tab}" data-pd-title="${escapeHtml(title || TAB_TITLES[tab] || "")}">${escapeHtml(label)} &rarr;</button>` : "";

async function load() {
    if (loading) return;
    loading = true;
    $("pdRefresh").disabled = true;
    if (!data) $("pdBody").innerHTML = `<div class="pd-empty">Loading...</div>`;

    const result = await fetchPharmacyDashboard({ warehouse_id: $("pdLocation").value });
    loading = false;
    if (!$("pdBody")) return;
    $("pdRefresh").disabled = false;

    if (!result?.success) {
        if (!data) $("pdBody").innerHTML = `<div class="pd-empty">${escapeHtml(result?.message || "Couldn't load the dashboard.")}</div>`;
        $("pdAsOf").textContent = result?.message || "Couldn't refresh.";
        return;
    }

    data = result.data;
    const chosen = $("pdLocation").value;
    $("pdLocation").innerHTML = `<option value="">All locations</option>` + data.locations.map((l) =>
        `<option value="${l.id}" ${String(l.id) === chosen ? "selected" : ""}>${escapeHtml(l.name)}</option>`).join("");
    $("pdAsOf").textContent = `As of ${formatDateTime(data.as_of)} · refreshes every 5 minutes`;
    render();
}

function render() {
    const d = data;
    const low = d.low_stock.totals;
    const ex = d.expiry.buckets;
    const t = d.transfers;
    const waiting = d.pending.reduce((sum, p) => sum + p.count, 0);
    const kpi = (value, label, cls = "", tab = "") => tab && canOpen(tab)
        ? `<button type="button" class="pd-kpi ${cls}" data-pd-open="${tab}" data-pd-title="${escapeHtml(TAB_TITLES[tab] || "")}"><strong>${value}</strong><span>${label}</span></button>`
        : `<div class="pd-kpi ${cls}"><strong>${value}</strong><span>${label}</span></div>`;

    $("pdBody").innerHTML = `
        <div class="pd-kpis">
            ${kpi(low.locations_with_low, `Location${low.locations_with_low === 1 ? "" : "s"} with low stock`, low.locations_with_low ? "red" : "green", "pharmacy_stock_levels")}
            ${kpi(low.out, "Items out of stock", low.out ? "red" : "", "pharmacy_stock_levels")}
            ${kpi(low.low, "Items below minimum", low.low ? "amber" : "", "pharmacy_stock_levels")}
            ${kpi(ex.expired.count, `Expired lots still in stock · ${formatMoney(ex.expired.value)}`, ex.expired.count ? "red" : "", "pharmacy_lot_trace")}
            ${kpi(ex.soon.count, `Lots expiring within ${d.thresholds.expiry_soon_days} days · ${formatMoney(ex.soon.value)}`, ex.soon.count ? "amber" : "", "pharmacy_lot_trace")}
            ${kpi(t.to_send + t.in_transit, `Transfers open · ${t.to_send} to send, ${t.in_transit} on the way`, t.overdue ? "amber" : "", "pharmacy_stock_transfers")}
            ${kpi(formatMoney(d.stock.value), `Stock value · ${d.stock.items} item${d.stock.items === 1 ? "" : "s"} on hand`)}
            ${kpi(waiting, "Documents waiting on someone", waiting ? "amber" : "")}
        </div>
        <div class="pd-grid">
            <div class="pd-col">
                ${lowStockCard(d)}
                ${expiryCard(d)}
                ${transfersCard(d)}
            </div>
            <div class="pd-col">
                ${pendingCard(d)}
                ${stockCard(d)}
                ${recentCard(d)}
            </div>
        </div>`;
}

function lowStockCard(d) {
    const locations = d.low_stock.locations;

    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Low Stock by Location</span>${tabLink("pharmacy_stock_levels", "Stock Levels")}</div>
            ${locations.length ? `<div class="pd-locs">${locations.map((l) => {
                const c = l.counts;
                const cls = c.out ? "red" : c.low ? "amber" : c.tracked ? "green" : "grey";
                const shown = l.items.slice(0, ITEMS_PER_LOCATION);
                const more = l.items.length - shown.length;
                return `
                    <div class="pd-loc ${cls}">
                        <div class="pd-loc-head">
                            <div><h3>${escapeHtml(l.name)}</h3>${l.custodian_name ? `<span class="pd-sub">${escapeHtml(l.custodian_name)}</span>` : ""}</div>
                            <div class="pd-chips">
                                ${c.out ? `<span class="pd-badge red">${c.out} out</span>` : ""}
                                ${c.low ? `<span class="pd-badge amber">${c.low} low</span>` : ""}
                                ${!c.out && !c.low ? (c.tracked ? `<span class="pd-badge green">OK</span>` : `<span class="pd-badge grey">No levels</span>`) : ""}
                            </div>
                        </div>
                        ${shown.length ? `<ul class="pd-items">${shown.map((i) => `
                            <li><span>${i.status === "out" ? `<span class="pd-out">&#9679;</span>` : `<span style="color:#d97706;">&#9679;</span>`} ${escapeHtml(i.drug_name)}</span>
                                <span>${formatQty(i.usable)} / ${formatQty(i.min_level)}${i.incoming ? ` · ${formatQty(i.incoming)} coming` : ""}</span></li>`).join("")}
                        </ul>${more > 0 ? `<p class="pd-muted">+ ${more} more</p>` : ""}`
                        : `<p class="pd-muted">${c.tracked ? `&#10003; All ${c.tracked} tracked item${c.tracked === 1 ? " is" : "s are"} at or above minimum.` : "No minimum levels set yet."}</p>`}
                    </div>`;
            }).join("")}</div>
            <p class="pd-muted" style="margin-top:10px;">Usable stock / minimum. Expired lots don't count as usable.</p>`
            : `<div class="pd-empty">No storage locations.</div>`}
        </div>`;
}

function expiryCard(d) {
    const e = d.expiry;
    const badge = (l) => l.bucket === "expired"
        ? `<span class="pd-badge red">Expired ${Math.abs(l.days_left)}d ago</span>`
        : `<span class="pd-badge ${l.bucket === "soon" ? "amber" : "blue"}">${l.days_left === 0 ? "Today" : `${l.days_left}d left`}</span>`;

    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Expired &amp; Expiring Stock</span><small>Within ${d.thresholds.expiry_watch_days} days · ${e.buckets.watch.count} more lot${e.buckets.watch.count === 1 ? "" : "s"} in ${d.thresholds.expiry_soon_days + 1}–${d.thresholds.expiry_watch_days} days</small></div>
            ${e.lots.length ? `<div class="pd-table-wrap"><table class="pd-table">
                <thead><tr><th>Item / Lot</th><th>Location</th><th>Expiry</th><th class="num">Qty</th><th class="num">Value</th></tr></thead>
                <tbody>${e.lots.map((l) => `
                    <tr>
                        <td><strong>${escapeHtml(l.drug_name)}</strong><span class="pd-sub">Lot ${escapeHtml(l.lot_number)}</span></td>
                        <td>${escapeHtml(l.warehouse_name)}</td>
                        <td style="white-space:nowrap;">${formatDate(l.expires_date)}<span class="pd-sub">${badge(l)}</span></td>
                        <td class="num">${formatQty(l.quantity)}<span class="pd-sub">${escapeHtml(l.unit_name || "")}</span></td>
                        <td class="num">${formatMoney(l.value)}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${e.truncated ? `<p class="pd-muted" style="margin-top:8px;">Showing the first ${e.lots.length}.</p>` : ""}
            <p class="pd-muted" style="margin-top:8px;">Pull expired stock and return or destroy it. ${tabLink("pharmacy_lot_trace", "Trace a lot")}</p>`
            : `<div class="pd-empty">&#10003; Nothing expired or expiring within ${d.thresholds.expiry_watch_days} days.</div>`}
        </div>`;
}

function transfersCard(d) {
    const t = d.transfers;

    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Stock Transfers</span>${tabLink("pharmacy_stock_transfers", "Stock Transfers")}</div>
            ${t.rows.length ? `<div class="pd-table-wrap"><table class="pd-table">
                <thead><tr><th>Transfer</th><th>From → To</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>${t.rows.map((x) => `
                    <tr>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(x.st_number || "—")}</strong><span class="pd-sub">${x.item_count} item${x.item_count === 1 ? "" : "s"}</span></td>
                        <td>${escapeHtml(x.from_name)} → ${escapeHtml(x.to_name)}</td>
                        <td>${x.status === "requested" ? `<span class="pd-badge amber">To send</span>` : `<span class="pd-badge blue">On the way</span>`}
                            ${x.priority === "urgent" ? ` <span class="pd-badge red">Urgent</span>` : ""}</td>
                        <td style="white-space:nowrap;">${x.status === "requested"
                            ? (x.needed_by ? `Needed ${formatDate(x.needed_by)}${x.is_overdue ? `<span class="pd-sub pd-out">Overdue</span>` : ""}` : `Asked ${formatDate(String(x.requested_at || "").slice(0, 10))}`)
                            : `Sent ${formatDate(x.sent_date)}`}</td>
                    </tr>`).join("")}</tbody>
            </table></div>`
            : `<div class="pd-empty">No transfers waiting to be sent or received.</div>`}
        </div>`;
}

function pendingCard(d) {
    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Waiting on Someone</span></div>
            <ul class="pd-list">${d.pending.map((p) => {
                const inner = `
                    <span><span class="pd-row-label">${escapeHtml(p.label)}</span>
                        ${p.overdue ? `<span class="pd-sub pd-out">${p.overdue} ${escapeHtml(p.overdue_label || "overdue")}</span>` : ""}
                        ${p.all_locations && d.warehouse_id ? `<span class="pd-sub">All locations</span>` : ""}</span>
                    <span class="pd-count ${p.count ? "hot" : ""}">${p.count}</span>`;
                return `<li>${canOpen(p.tab)
                    ? `<button type="button" class="pd-row" data-pd-open="${p.tab}" data-pd-title="${escapeHtml(p.title)}">${inner}</button>`
                    : inner}</li>`;
            }).join("")}</ul>
        </div>`;
}

function stockCard(d) {
    const s = d.stock;

    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Stock on Hand</span>${tabLink("pharmacy_medicine_ledger", "Medicine Ledger")}</div>
            ${s.locations.length ? `<div class="pd-table-wrap"><table class="pd-table">
                <thead><tr><th>Location</th><th class="num">Items</th><th class="num">Value</th></tr></thead>
                <tbody>${s.locations.map((l) => `<tr><td>${escapeHtml(l.name)}</td><td class="num">${l.items}</td><td class="num">${formatMoney(l.value)}</td></tr>`).join("")}</tbody>
                ${s.locations.length > 1 ? `<tfoot><tr><td><strong>Total</strong></td><td class="num"><strong>${s.items}</strong></td><td class="num"><strong>${formatMoney(s.value)}</strong></td></tr></tfoot>` : ""}
            </table></div>
            <p class="pd-muted" style="margin-top:8px;">Valued at each lot's latest receiving cost. Items counts distinct medicines.</p>`
            : `<div class="pd-empty">No stock on hand.</div>`}
        </div>`;
}

function recentCard(d) {
    return `
        <div class="pd-card">
            <div class="pd-card-title"><span>Latest Stock Movements</span>${tabLink("pharmacy_medicine_ledger", "Medicine Ledger")}</div>
            ${d.recent.length ? `<ul class="pd-list">${d.recent.map((m) => `
                <li>
                    <span style="min-width:0;"><strong>${escapeHtml(m.drug_name)}</strong>
                        <span class="pd-sub">${escapeHtml(m.type_label)} · ${escapeHtml(m.warehouse_name)}${m.reference_no ? ` · ${escapeHtml(m.reference_no)}` : ""} · ${formatDate(m.date)}</span></span>
                    <span class="${MOVE_SIGN_STYLE(m.quantity)}" style="white-space:nowrap;">${m.quantity >= 0 ? "+" : "−"}${formatQty(Math.abs(m.quantity))}</span>
                </li>`).join("")}</ul>`
            : `<div class="pd-empty">No stock movements yet.</div>`}
        </div>`;
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
