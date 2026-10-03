import { searchBatches, fetchTrace } from "./lot-trace.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

/** Movement type -> badge style (same as the Medicine Ledger). */
const TYPE_STYLE = {
    opening: "neutral", received: "in", receipt_voided: "out", transfer_in: "move", transfer_out: "move",
    transfer_cancelled: "move", returned: "out", destroyed: "out", adjusted: "adjust", dispensed: "out"
};
const TRANSFER_STATUS = { in_transit: ["In transit", "adjust"], received: ["Received", "in"], cancelled: ["Cancelled", "neutral"] };
const NEAR_EXPIRY_DAYS = 90;

let results = null;
let trace = null;

const $ = (id) => document.getElementById(id);

export async function initLotTrace() {
    $("ltSearch").addEventListener("click", runSearch);
    $("ltQuery").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
    $("ltInStock").addEventListener("change", runSearch);
    $("ltExpiresBy").addEventListener("change", runSearch);
    $("ltBack").addEventListener("click", showSearch);
    $("ltCsv").addEventListener("click", () => trace && downloadCsv(traceCsv(trace), `lot-trace-${slug(trace.drug.name)}-${slug(trace.lot_number)}`));
    $("ltPrint").addEventListener("click", () => trace && printTrace(trace));
    await runSearch();
}

/* ---------------------------------------------------------------
 * Search
 * ------------------------------------------------------------- */

async function runSearch() {
    $("ltResults").innerHTML = `<div class="lt-empty">Searching...</div>`;
    $("ltSearch").disabled = true;
    const result = await searchBatches({ q: $("ltQuery").value.trim(), in_stock: $("ltInStock").checked ? 1 : "", expires_by: $("ltExpiresBy").value });
    $("ltSearch").disabled = false;

    if (!result?.success) {
        results = null;
        $("ltResults").innerHTML = `<div class="lt-empty">${escapeHtml(result?.message || "Couldn't search the batches.")}</div>`;
        return;
    }

    results = result.data;
    renderResults();
}

function renderResults() {
    const q = $("ltQuery").value.trim();
    const rows = results.rows;

    if (!rows.length) {
        $("ltResults").innerHTML = `<div class="lt-empty">No batches found${q ? ` for “${escapeHtml(q)}”` : ""}${$("ltInStock").checked ? " that are still in stock — untick “Only batches still in stock” to include used-up ones" : ""}.</div>`;
        return;
    }

    $("ltResults").innerHTML = `
        <div class="lt-card">
            <div class="lt-card-title"><span>${rows.length} batch${rows.length === 1 ? "" : "es"}</span><small>Earliest expiry first · click a batch to trace it</small></div>
            <div class="lt-table-wrap"><table class="lt-table wide">
                <thead><tr><th>Item</th><th>Lot</th><th>Expiry</th><th class="num">On Hand</th><th>Where It Is Now</th><th>Supplier</th>${q ? "<th>Found By</th>" : ""}</tr></thead>
                <tbody>${rows.map((b, i) => `
                    <tr class="lt-click" data-lt-row="${i}" title="Trace this batch">
                        <td><strong>${escapeHtml(b.drug_name)}</strong><span class="lt-sub">${escapeHtml(b.unit_name || "units")}</span></td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(b.lot_number)}</strong></td>
                        <td style="white-space:nowrap;">${expiryCell(b.expires_date)}</td>
                        <td class="num"><strong>${formatQty(b.on_hand)}</strong></td>
                        <td>${b.locations.length ? `<div class="lt-chips">${b.locations.map((l) => `<span class="lt-badge move">${escapeHtml(l.name)} · ${formatQty(l.quantity)}</span>`).join("")}</div>` : `<span class="lt-sub" style="margin:0;">None left</span>`}</td>
                        <td>${escapeHtml(b.suppliers.join(", ") || "—")}${b.first_received ? `<span class="lt-sub">First received ${formatDate(b.first_received)}</span>` : ""}</td>
                        ${q ? `<td>${b.matched_by.map((m) => `<span class="lt-sub" style="margin:0;">${escapeHtml(m)}</span>`).join("")}</td>` : ""}
                    </tr>`).join("")}</tbody>
            </table></div>
            ${results.truncated ? `<p class="lt-note">Only the first 300 batches are listed; search for something more specific.</p>` : ""}
        </div>`;

    $("ltResults").querySelectorAll("[data-lt-row]").forEach((row) => row.addEventListener("click", () => {
        const b = rows[Number(row.dataset.ltRow)];
        openTrace({ drug_id: b.drug_id, lot_number: b.lot_number });
    }));
}

function showSearch() {
    $("ltTracePanel").hidden = true;
    $("ltSearchPanel").hidden = false;
}

/* ---------------------------------------------------------------
 * Trace
 * ------------------------------------------------------------- */

async function openTrace(filters) {
    $("ltSearchPanel").hidden = true;
    $("ltTracePanel").hidden = false;
    $("ltTraceBody").innerHTML = `<div class="lt-empty">Tracing...</div>`;
    $("ltCsv").disabled = $("ltPrint").disabled = true;

    const result = await fetchTrace(filters);
    if (!result?.success) {
        trace = null;
        $("ltTraceBody").innerHTML = `<div class="lt-empty">${escapeHtml(result?.message || "Couldn't trace this batch.")}</div>`;
        return;
    }

    trace = result.data;
    $("ltCsv").disabled = $("ltPrint").disabled = false;
    renderTrace();
}

function renderTrace() {
    const t = trace;
    const unit = escapeHtml(t.drug.unit_name || "units");
    const tt = t.totals;
    const stat = (value, label, cls = "") => `<div class="lt-stat ${cls}"><strong>${value}</strong><span>${label}</span></div>`;
    const banners = [];

    if (!t.reconciled) {
        banners.push(`<div class="lt-banner bad">&#9888; The ledger for this batch ends at ${formatQty(t.ledger_total)} but ${formatQty(tt.on_hand)} ${unit} are on hand — stock was changed somewhere without a ledger entry.</div>`);
    }
    if (t.is_expired && tt.on_hand > 0) {
        banners.push(`<div class="lt-banner bad">&#9888; This batch has expired and ${formatQty(tt.on_hand)} ${unit} are still in stock — see "Where it is now".</div>`);
    }
    if (tt.in_transit > 0) {
        banners.push(`<div class="lt-banner warn">${formatQty(tt.in_transit)} ${unit} are on the way between locations and not yet received.</div>`);
    }

    $("ltTraceBody").innerHTML = `
        <div class="lt-title">
            <div>
                <h2>${escapeHtml(t.drug.name)} — Lot ${escapeHtml(t.lot_numbers.join(" / "))}</h2>
                <span class="lt-sub">${[
                    t.drug.generic_name, t.drug.strength, t.drug.manufacturer ? `Mfr. ${t.drug.manufacturer}` : null,
                    t.expiries.length ? `Expiry ${t.expiries.map(formatDate).join(", ")}` : "No expiry on file", `quantities in ${t.drug.unit_name || "units"}`
                ].filter(Boolean).map(escapeHtml).join(" · ")}</span>
            </div>
            ${t.expiries.length ? expiryCell(t.expiries[0]) : ""}
        </div>
        <div class="lt-stats">
            ${stat(formatQty(tt.received), "Received from suppliers", "in")}
            ${tt.opening ? stat(formatQty(tt.opening), "Balance before the ledger") : ""}
            ${tt.returned ? stat(`−${formatQty(tt.returned)}`, "Returned to supplier", "out") : ""}
            ${tt.destroyed ? stat(`−${formatQty(tt.destroyed)}`, "Destroyed", "out") : ""}
            ${tt.adjusted ? stat(`${tt.adjusted > 0 ? "+" : "−"}${formatQty(Math.abs(tt.adjusted))}`, "Stock count corrections", tt.adjusted < 0 ? "out" : "in") : ""}
            ${tt.lost_in_transit ? stat(`−${formatQty(tt.lost_in_transit)}`, "Short / lost in transit", "out") : ""}
            ${tt.dispensed ? stat(`−${formatQty(tt.dispensed)}`, "Dispensed", "out") : ""}
            ${tt.in_transit ? stat(formatQty(tt.in_transit), "In transit now", "warn") : ""}
            ${stat(formatQty(tt.on_hand), `On hand now · ${tt.locations_holding} location${tt.locations_holding === 1 ? "" : "s"}`, "main")}
        </div>
        ${banners.join("")}
        ${flowCard(t)}
        ${locationsCard(t)}
        ${sourcesCard(t)}
        ${transfersCard(t)}
        ${outflowsCard(t)}
        ${documentsCard(t)}
        ${movementsCard(t)}
        <p class="lt-note">Medicine given to patients isn't deducted from stock yet, so this trace stops at the pharmacy shelf — it can't list which patients received this batch.</p>`;
}

/** The batch's path in date order: supplier → location, location → location, location → out. */
function flowSteps(t) {
    const steps = [];
    t.sources.filter((s) => !s.is_voided).forEach((s) => steps.push({
        date: s.date, from: s.supplier_name || "Supplier", fromCls: "supplier", fromSub: "Supplier",
        to: s.warehouse_name, toCls: "place", qty: s.quantity, label: s.gr_number || s.invoice_no || "Received"
    }));
    t.transfers.filter((x) => x.status !== "cancelled").forEach((x) => steps.push({
        date: x.date, from: x.from_name, fromCls: "place", to: x.to_name, toCls: "place",
        qty: x.quantity_received ?? x.quantity_sent, label: x.reference_no || "Transfer",
        note: x.status === "in_transit" ? "in transit" : (x.short ? `${formatQty(x.short)} short` : "")
    }));
    t.outflows.filter((o) => (o.type === "returned" && !o.is_pending) || o.type === "destroyed" || o.type === "dispensed").forEach((o) => steps.push({
        date: o.date, from: o.warehouse_name, fromCls: "place",
        to: o.type === "returned" ? `Returned to ${o.party}` : o.label, toCls: "gone", qty: o.quantity, label: o.reference_no || o.reason || o.label
    }));

    return steps.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function flowCard(t) {
    const steps = flowSteps(t);
    if (!steps.length) return "";

    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Path of the Batch</span><small>In date order</small></div>
            <div class="lt-flow">${steps.map((s) => `
                <div class="lt-hop">
                    <div class="lt-node ${s.fromCls}"><strong>${escapeHtml(s.from)}</strong><span class="lt-sub">${formatDate(s.date)}</span></div>
                    <div class="lt-arrow"><b>${formatQty(s.qty)}</b>${escapeHtml(s.label)}${s.note ? `<span>${escapeHtml(s.note)}</span>` : ""}</div>
                    <div class="lt-node ${s.toCls}"><strong>${escapeHtml(s.to)}</strong></div>
                </div>`).join("")}
            </div>
        </div>`;
}

function locationsCard(t) {
    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Where It Is Now</span></div>
            <div class="lt-table-wrap"><table class="lt-table">
                <thead><tr><th>Location</th><th>Lot</th><th>Expiry</th><th class="num">On Hand</th><th>First In</th><th>Last Movement</th></tr></thead>
                <tbody>${t.locations.map((l) => `
                    <tr class="${l.on_hand > 0 ? "" : "muted"}">
                        <td><strong>${escapeHtml(l.warehouse_name)}</strong>${l.is_removed ? `<span class="lt-sub">Lot record removed</span>` : ""}</td>
                        <td>${escapeHtml(l.lot_number)}</td>
                        <td style="white-space:nowrap;">${expiryCell(l.expires_date, l.on_hand > 0)}</td>
                        <td class="num"><strong>${formatQty(l.on_hand)}</strong></td>
                        <td>${l.first_date ? formatDate(l.first_date) : "—"}</td>
                        <td>${l.last_date ? formatDate(l.last_date) : "—"}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
        </div>`;
}

function sourcesCard(t) {
    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Where It Came From</span></div>
            ${t.sources.length ? `<div class="lt-table-wrap"><table class="lt-table wide">
                <thead><tr><th>Received</th><th>Supplier</th><th>Purchase Order</th><th>Receiving Report</th><th>Invoice</th><th>Into</th><th class="num">Qty</th><th class="num">Unit Cost</th><th>By</th></tr></thead>
                <tbody>${t.sources.map((s) => `
                    <tr class="${s.is_voided ? "muted" : ""}">
                        <td style="white-space:nowrap;">${formatDate(s.date)}${s.is_voided ? `<span class="lt-sub"><span class="lt-badge out">Voided</span></span>` : ""}</td>
                        <td>${escapeHtml(s.supplier_name || "—")}</td>
                        <td>${s.po_number ? `${escapeHtml(s.po_number)}<span class="lt-sub">${formatDate(s.po_date)}</span>` : `<span class="lt-sub" style="margin:0;">${s.kind === "manual" ? "Received without a PO" : "—"}</span>`}</td>
                        <td>${escapeHtml(s.gr_number || "—")}${s.delivery_receipt_no ? `<span class="lt-sub">DR ${escapeHtml(s.delivery_receipt_no)}</span>` : ""}</td>
                        <td>${s.supplier_invoices.length
                            ? s.supplier_invoices.map((si) => `${escapeHtml(si.ap_number)}<span class="lt-sub">${escapeHtml(si.supplier_invoice_no)} · ${escapeHtml(si.payment_status || si.status)}</span>`).join("")
                            : escapeHtml(s.invoice_no || "—")}</td>
                        <td>${escapeHtml(s.warehouse_name)}<span class="lt-sub">Lot ${escapeHtml(s.lot_number)}</span></td>
                        <td class="num"><strong>${formatQty(s.quantity)}</strong></td>
                        <td class="num">${s.unit_cost != null ? formatMoney(s.unit_cost, 4) : "—"}</td>
                        <td>${escapeHtml(s.received_by || "—")}${s.void_reason ? `<span class="lt-sub">Void: ${escapeHtml(s.void_reason)}</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>`
            : `<div class="lt-empty">No receipts on file — this stock was on hand before receiving was recorded${t.totals.opening ? ` (${formatQty(t.totals.opening)} as an opening balance)` : ""}.</div>`}
        </div>`;
}

function transfersCard(t) {
    if (!t.transfers.length) return "";

    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Movements Between Locations</span></div>
            <div class="lt-table-wrap"><table class="lt-table wide">
                <thead><tr><th>Sent</th><th>Reference</th><th>From</th><th>To</th><th class="num">Sent</th><th class="num">Received</th><th class="num">Short</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>${t.transfers.map((x) => {
                    const [label, cls] = TRANSFER_STATUS[x.status] || [x.status, "neutral"];
                    return `
                    <tr class="${x.status === "cancelled" ? "muted" : ""}">
                        <td style="white-space:nowrap;">${formatDate(x.date)}${x.received_date && x.received_date !== x.date && x.status === "received" ? `<span class="lt-sub">Received ${formatDate(x.received_date)}</span>` : ""}</td>
                        <td style="white-space:nowrap;">${escapeHtml(x.reference_no || "Quick transfer")}</td>
                        <td>${escapeHtml(x.from_name)}</td>
                        <td>${escapeHtml(x.to_name)}</td>
                        <td class="num">${formatQty(x.quantity_sent)}</td>
                        <td class="num">${x.quantity_received != null ? formatQty(x.quantity_received) : "—"}</td>
                        <td class="num">${x.short ? `<span class="lt-out">${formatQty(x.short)}</span>` : ""}</td>
                        <td><span class="lt-badge ${cls}">${escapeHtml(label)}</span></td>
                        <td>${escapeHtml(x.short_reason || "")}${x.notes ? `<span class="lt-sub">${escapeHtml(x.notes)}</span>` : ""}</td>
                    </tr>`;
                }).join("")}</tbody>
            </table></div>
        </div>`;
}

function outflowsCard(t) {
    if (!t.outflows.length) return "";

    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Returned, Destroyed &amp; Corrected</span></div>
            <div class="lt-table-wrap"><table class="lt-table wide">
                <thead><tr><th>Date</th><th>What</th><th>Reference</th><th>Location</th><th class="num">Qty</th><th>Details</th></tr></thead>
                <tbody>${t.outflows.map((o) => `
                    <tr class="${o.is_pending ? "muted" : ""}">
                        <td style="white-space:nowrap;">${o.date ? formatDate(o.date) : "—"}</td>
                        <td><span class="lt-badge ${o.is_gain ? "in" : o.type === "adjusted" ? "adjust" : o.is_pending ? "neutral" : "out"}">${escapeHtml(o.label)}</span></td>
                        <td style="white-space:nowrap;">${escapeHtml(o.reference_no || "—")}</td>
                        <td>${escapeHtml(o.warehouse_name)}</td>
                        <td class="num"><span class="${o.is_gain ? "lt-in" : "lt-out"}">${o.is_gain ? "+" : "−"}${formatQty(o.quantity)}</span></td>
                        <td>${escapeHtml(o.party || "")}${o.reason ? `<span class="lt-sub">${escapeHtml(o.reason)}</span>` : ""}${o.notes ? `<span class="lt-sub">${escapeHtml(o.notes)}</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${t.outflows.some((o) => o.is_pending) ? `<p class="lt-note">Greyed-out returns haven't been sent yet; the stock is still on hand.</p>` : ""}
        </div>`;
}

function documentsCard(t) {
    if (!t.documents.length) return "";

    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Documents</span><small>Every document this batch appears on</small></div>
            <div class="lt-table-wrap"><table class="lt-table">
                <thead><tr><th>Document</th><th>Number</th><th>Date</th><th>Details</th><th>Status</th></tr></thead>
                <tbody>${t.documents.map((d) => `
                    <tr>
                        <td>${escapeHtml(d.kind)}</td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(d.number)}</strong></td>
                        <td style="white-space:nowrap;">${d.date ? formatDate(d.date) : "—"}</td>
                        <td>${escapeHtml(d.detail || "")}</td>
                        <td>${d.status ? `<span class="lt-badge neutral">${escapeHtml(humanize(d.status))}</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
        </div>`;
}

function movementsCard(t) {
    return `
        <div class="lt-card">
            <div class="lt-card-title"><span>Full Movement History</span><small>From the Medicine Ledger · Batch Balance counts every location</small></div>
            ${t.movements.length ? `<div class="lt-table-wrap"><table class="lt-table wide">
                <thead><tr><th>Date</th><th>Movement</th><th>Reference</th><th>Location</th><th>Details</th><th class="num">In</th><th class="num">Out</th><th class="num">Location Balance</th><th class="num">Batch Balance</th><th>By</th></tr></thead>
                <tbody>${t.movements.map((m) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(m.date)}</td>
                        <td><span class="lt-badge ${TYPE_STYLE[m.type] || "neutral"}">${escapeHtml(m.type_label)}</span></td>
                        <td style="white-space:nowrap;">${escapeHtml(m.reference_no || "—")}</td>
                        <td>${escapeHtml(m.warehouse_name)}<span class="lt-sub">Lot ${escapeHtml(m.lot_number)}</span></td>
                        <td>${escapeHtml(m.counterparty || "")}${m.reason ? `<span class="lt-sub">${escapeHtml(m.reason)}</span>` : ""}${m.notes ? `<span class="lt-sub">${escapeHtml(m.notes)}</span>` : ""}</td>
                        <td class="num">${m.quantity > 0 ? `<span class="lt-in">${formatQty(m.quantity)}</span>` : ""}</td>
                        <td class="num">${m.quantity < 0 ? `<span class="lt-out">${formatQty(-m.quantity)}</span>` : ""}</td>
                        <td class="num">${formatQty(m.location_balance)}</td>
                        <td class="num"><strong>${formatQty(m.balance)}</strong></td>
                        <td>${escapeHtml(m.recorded_by || "—")}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            ${t.totals.in_transit ? `<p class="lt-note">While stock is in transit it has left one location and not reached the next, so the Batch Balance is lower than what was sent by ${formatQty(t.totals.in_transit)}.</p>` : ""}`
            : `<div class="lt-empty">No ledger movements for this batch.</div>`}
        </div>`;
}

/* ---------------------------------------------------------------
 * Helpers, export & print
 * ------------------------------------------------------------- */

function expiryCell(date, flag = true) {
    if (!date) return `<span class="lt-sub" style="margin:0;">No expiry</span>`;
    const days = Math.round((new Date(`${date}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 86400000);
    const badge = !flag ? "" : days < 0 ? ` <span class="lt-badge out">Expired</span>` : days <= NEAR_EXPIRY_DAYS ? ` <span class="lt-badge adjust">${days} day${days === 1 ? "" : "s"} left</span>` : "";
    return `${formatDate(date)}${badge}`;
}

function humanize(text) {
    const s = String(text || "").replace(/_/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function traceCsv(t) {
    const tt = t.totals;
    return [
        ["Lot Trace"], ["Item", t.drug.name], ["Lot", t.lot_numbers.join(" / ")], ["Expiry", t.expiries.join(", ")], ["Unit", t.drug.unit_name || ""], [],
        ["Received", tt.received], ["Opening balance", tt.opening], ["Returned", tt.returned], ["Destroyed", tt.destroyed], ["Count corrections", tt.adjusted],
        ["Short / lost in transit", tt.lost_in_transit], ["Dispensed", tt.dispensed], ["In transit", tt.in_transit], ["On hand", tt.on_hand], [],
        ["WHERE IT IS NOW"], ["Location", "Lot", "Expiry", "On Hand", "First In", "Last Movement"],
        ...t.locations.map((l) => [l.warehouse_name, l.lot_number, l.expires_date || "", l.on_hand, l.first_date || "", l.last_date || ""]), [],
        ["WHERE IT CAME FROM"], ["Received", "Supplier", "PO", "Receiving Report", "DR", "Invoice", "Into", "Qty", "Unit Cost", "Voided"],
        ...t.sources.map((s) => [s.date, s.supplier_name || "", s.po_number || "", s.gr_number || "", s.delivery_receipt_no || "",
            s.supplier_invoices.map((si) => `${si.ap_number} (${si.supplier_invoice_no})`).join("; ") || s.invoice_no || "", s.warehouse_name, s.quantity, s.unit_cost ?? "", s.is_voided ? "Yes" : ""]), [],
        ["MOVEMENTS BETWEEN LOCATIONS"], ["Sent", "Reference", "From", "To", "Sent", "Received", "Short", "Status", "Reason / Notes"],
        ...t.transfers.map((x) => [x.date, x.reference_no || "Quick transfer", x.from_name, x.to_name, x.quantity_sent, x.quantity_received ?? "", x.short ?? "",
            TRANSFER_STATUS[x.status]?.[0] || x.status, [x.short_reason, x.notes].filter(Boolean).join(" · ")]), [],
        ["RETURNED, DESTROYED & CORRECTED"], ["Date", "What", "Reference", "Location", "Qty", "Party", "Reason", "Notes"],
        ...t.outflows.map((o) => [o.date || "", o.label, o.reference_no || "", o.warehouse_name, o.is_gain ? o.quantity : -o.quantity, o.party || "", o.reason || "", o.notes || ""]), [],
        ["DOCUMENTS"], ["Document", "Number", "Date", "Details", "Status"],
        ...t.documents.map((d) => [d.kind, d.number, d.date || "", d.detail || "", d.status || ""]), [],
        ["FULL MOVEMENT HISTORY"], ["Date", "Movement", "Reference", "Location", "Lot", "Counterparty", "Reason", "Notes", "Quantity", "Location Balance", "Batch Balance", "Recorded By"],
        ...t.movements.map((m) => [m.date, m.type_label, m.reference_no || "", m.warehouse_name, m.lot_number, m.counterparty || "", m.reason || "", m.notes || "",
            m.quantity, m.location_balance, m.balance, m.recorded_by || ""])
    ];
}

function downloadCsv(rows, name) {
    const cell = (v) => {
        const text = String(v ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${name}-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printTrace(t) {
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const tt = t.totals;
    const table = (head, rows) => rows.length ? `<table><thead><tr>${head.map((h) => `<th${h.startsWith("#") ? ' class="num"' : ""}>${escapeHtml(h.replace(/^#/, ""))}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : `<p class="muted">None.</p>`;
    const summary = [["Received from suppliers", tt.received], ["Balance before the ledger", tt.opening], ["Returned to supplier", tt.returned], ["Destroyed", tt.destroyed],
        ["Stock count corrections", tt.adjusted], ["Short / lost in transit", tt.lost_in_transit], ["Dispensed", tt.dispensed], ["In transit now", tt.in_transit]]
        .filter(([, v]) => v).map(([label, v]) => `<tr><td>${label}</td><td class="num">${formatQty(v)}</td></tr>`).join("")
        + `<tr><td class="b">On hand now</td><td class="num b">${formatQty(tt.on_hand)}</td></tr>`;

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(`Lot Trace - ${t.drug.name} - ${t.lot_number}`)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; margin: 0; padding: 20px; }
    h1 { margin: 0 0 2px; font-size: 18px; letter-spacing: .5px; } h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .4px; margin: 16px 0 6px; }
    .muted { color: #4b5563; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px; border: 1px solid #d1d5db; }
    td { padding: 5px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
    .sub { display: block; color: #4b5563; font-size: 10px; } .summary { width: 340px; }
    .sign { display: flex; gap: 40px; margin-top: 36px; } .sign div { flex: 1; border-top: 1px solid #111827; padding-top: 4px; text-align: center; }
</style></head><body>
    <h1>LOT TRACE REPORT — ${escapeHtml(t.drug.name)}</h1>
    <div class="muted">Lot ${escapeHtml(t.lot_numbers.join(" / "))} · ${t.expiries.length ? `expiry ${t.expiries.map(formatDate).join(", ")}` : "no expiry on file"}${t.drug.manufacturer ? ` · Mfr. ${escapeHtml(t.drug.manufacturer)}` : ""} · quantities in ${escapeHtml(t.drug.unit_name || "units")} · printed ${formatDate(todayISO())}</div>
    <table class="summary"><tbody>${summary}</tbody></table>
    <h2>Where it is now</h2>
    ${table(["Location", "Lot", "Expiry", "#On Hand", "Last Movement"], t.locations.map((l) => `<tr><td>${escapeHtml(l.warehouse_name)}</td><td>${escapeHtml(l.lot_number)}</td><td>${l.expires_date ? formatDate(l.expires_date) : ""}</td><td class="num b">${formatQty(l.on_hand)}</td><td>${l.last_date ? formatDate(l.last_date) : ""}</td></tr>`))}
    <h2>Where it came from</h2>
    ${table(["Received", "Supplier", "PO", "Receiving Report", "Invoice", "Into", "#Qty"], t.sources.map((s) => `<tr><td>${formatDate(s.date)}${s.is_voided ? '<span class="sub">VOIDED</span>' : ""}</td><td>${escapeHtml(s.supplier_name || "")}</td><td>${escapeHtml(s.po_number || "")}</td>
        <td>${escapeHtml(s.gr_number || "")}${s.delivery_receipt_no ? `<span class="sub">DR ${escapeHtml(s.delivery_receipt_no)}</span>` : ""}</td>
        <td>${escapeHtml(s.supplier_invoices.map((si) => `${si.ap_number} (${si.supplier_invoice_no})`).join(", ") || s.invoice_no || "")}</td><td>${escapeHtml(s.warehouse_name)}</td><td class="num">${formatQty(s.quantity)}</td></tr>`))}
    <h2>Movements between locations</h2>
    ${table(["Sent", "Reference", "From", "To", "#Sent", "#Received", "#Short", "Status"], t.transfers.map((x) => `<tr><td>${formatDate(x.date)}</td><td>${escapeHtml(x.reference_no || "Quick transfer")}</td><td>${escapeHtml(x.from_name)}</td><td>${escapeHtml(x.to_name)}</td>
        <td class="num">${formatQty(x.quantity_sent)}</td><td class="num">${x.quantity_received != null ? formatQty(x.quantity_received) : ""}</td><td class="num">${x.short ? formatQty(x.short) : ""}</td><td>${escapeHtml(TRANSFER_STATUS[x.status]?.[0] || x.status)}${x.short_reason ? `<span class="sub">${escapeHtml(x.short_reason)}</span>` : ""}</td></tr>`))}
    <h2>Returned, destroyed &amp; corrected</h2>
    ${table(["Date", "What", "Reference", "Location", "#Qty", "Details"], t.outflows.map((o) => `<tr><td>${o.date ? formatDate(o.date) : ""}</td><td>${escapeHtml(o.label)}</td><td>${escapeHtml(o.reference_no || "")}</td><td>${escapeHtml(o.warehouse_name)}</td>
        <td class="num">${o.is_gain ? "+" : "−"}${formatQty(o.quantity)}</td><td>${escapeHtml([o.party, o.reason, o.notes].filter(Boolean).join(" · "))}</td></tr>`))}
    <h2>Documents</h2>
    ${table(["Document", "Number", "Date", "Details", "Status"], t.documents.map((d) => `<tr><td>${escapeHtml(d.kind)}</td><td class="b">${escapeHtml(d.number)}</td><td>${d.date ? formatDate(d.date) : ""}</td><td>${escapeHtml(d.detail || "")}</td><td>${escapeHtml(d.status ? humanize(d.status) : "")}</td></tr>`))}
    <h2>Full movement history</h2>
    ${table(["Date", "Movement", "Reference", "Location", "#In", "#Out", "#Batch Balance", "By"], t.movements.map((m) => `<tr><td>${formatDate(m.date)}</td><td>${escapeHtml(m.type_label)}</td><td>${escapeHtml(m.reference_no || "")}</td><td>${escapeHtml(m.warehouse_name)}</td>
        <td class="num">${m.quantity > 0 ? formatQty(m.quantity) : ""}</td><td class="num">${m.quantity < 0 ? formatQty(-m.quantity) : ""}</td><td class="num b">${formatQty(m.balance)}</td><td>${escapeHtml(m.recorded_by || "")}</td></tr>`))}
    <div class="sign"><div>Prepared by</div><div>Checked by</div><div>Pharmacist-in-charge</div></div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
