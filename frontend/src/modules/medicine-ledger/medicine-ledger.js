import { fetchLedgerOptions, fetchStockCard, fetchMovementSummary } from "./medicine-ledger.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

/** Movement type -> badge style. */
const TYPE_STYLE = {
    opening: "neutral", received: "in", receipt_voided: "out", transfer_in: "move", transfer_out: "move",
    transfer_cancelled: "move", returned: "out", destroyed: "out", adjusted: "adjust", dispensed: "out", dispense_voided: "in"
};
const SUMMARY_COLUMNS = [
    ["opening", "Opening"], ["received", "Received"], ["transfer_in", "Transfers In"], ["transfer_out", "Transfers Out"],
    ["returned", "Returned"], ["destroyed", "Destroyed"], ["adjusted", "Count Adj."], ["dispensed", "Dispensed"], ["closing", "Closing"]
];

let options = null;
let card = null;
let summary = null;

const $ = (id) => document.getElementById(id);

export async function initMedicineLedger() {
    // The page is rebuilt each time the tab opens; start clean.
    options = null;
    card = null;
    summary = null;
    $("mlTabs").querySelectorAll("[data-ml-tab]").forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.mlTab)));
    $("mlItemSearch").addEventListener("input", renderDrugOptions);
    $("mlDrug").addEventListener("change", () => { renderLotOptions(); loadCard(); });
    $("mlWarehouse").addEventListener("change", renderLotOptions);
    $("mlShow").addEventListener("click", loadCard);
    $("mlCsv").addEventListener("click", () => card && downloadCsv(cardCsv(card), `stock-card-${slug(card.drug.name)}`));
    $("mlPrint").addEventListener("click", () => card && printCard(card));
    $("mlSumShow").addEventListener("click", loadSummary);
    $("mlSumCsv").addEventListener("click", () => summary && downloadCsv(summaryCsv(summary), "stock-movement-summary"));
    $("mlSumPrint").addEventListener("click", () => summary && printSummary(summary));

    const today = todayISO();
    const monthStart = `${today.slice(0, 8)}01`;
    $("mlFrom").value = monthStart;
    $("mlTo").value = today;
    $("mlSumFrom").value = monthStart;
    $("mlSumTo").value = today;

    const result = await fetchLedgerOptions();
    if (!result?.success) {
        $("mlCardBody").innerHTML = `<div class="ml-empty">${escapeHtml(result?.message || "Couldn't load the items.")}</div>`;
        return;
    }

    options = result.data;
    const locations = `<option value="">All locations</option>` + options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    $("mlWarehouse").innerHTML = locations;
    $("mlSumWarehouse").innerHTML = locations;
    $("mlType").innerHTML = `<option value="">All movements</option>` + options.types.map((t) => `<option value="${t.value}">${escapeHtml(t.label)}</option>`).join("");
    renderDrugOptions();
    renderLotOptions();
}

function showTab(name) {
    $("mlTabs").querySelectorAll("[data-ml-tab]").forEach((b) => b.classList.toggle("active", b.dataset.mlTab === name));
    $("mlCardPanel").hidden = name !== "card";
    $("mlSummaryPanel").hidden = name !== "summary";
    if (name === "summary" && !summary) loadSummary();
}

function renderDrugOptions() {
    const term = $("mlItemSearch").value.trim().toLowerCase();
    const chosen = $("mlDrug").value;
    const list = options.drugs.filter((d) => !term || d.name.toLowerCase().includes(term) || String(d.id) === chosen);

    $("mlDrug").innerHTML = `<option value="">-- Choose an item (${list.length}) --</option>` + list.map((d) =>
        `<option value="${d.id}" ${String(d.id) === chosen ? "selected" : ""}>${escapeHtml(d.name)} — ${formatQty(d.on_hand)} ${escapeHtml(d.unit_name || "units")}${d.is_active ? "" : " (inactive)"}</option>`).join("");

    // Typing a name that matches one item picks it.
    if (term && list.length === 1 && String(list[0].id) !== chosen) {
        $("mlDrug").value = String(list[0].id);
        renderLotOptions();
        loadCard();
    }
}

function renderLotOptions() {
    const drugId = Number($("mlDrug").value);
    const warehouseId = Number($("mlWarehouse").value);
    const chosen = $("mlLot").value;
    const lots = options.lots.filter((l) => l.drug_id === drugId && (!warehouseId || l.warehouse_id === warehouseId));
    const where = (l) => warehouseId ? "" : ` · ${options.warehouses.find((w) => Number(w.id) === l.warehouse_id)?.name || ""}`;

    $("mlLot").innerHTML = `<option value="">All lots</option>` + lots.map((l) =>
        `<option value="${l.id}" ${String(l.id) === chosen ? "selected" : ""}>${escapeHtml(l.lot_number)}${l.expires_date ? ` (exp ${formatDate(l.expires_date)})` : ""}${escapeHtml(where(l))}${l.is_deleted ? " — removed" : ""}</option>`).join("");
    $("mlLot").disabled = !drugId;
}

/* ---------------------------------------------------------------
 * Stock card
 * ------------------------------------------------------------- */

async function loadCard() {
    if (!$("mlDrug").value) {
        showToast("Choose an item first.", "info");
        return;
    }

    if ($("mlFrom").value && $("mlTo").value && $("mlFrom").value > $("mlTo").value) {
        showToast("The From date is after the To date.", "error");
        return;
    }

    $("mlCardBody").innerHTML = `<div class="ml-empty">Loading...</div>`;
    $("mlShow").disabled = true;
    const result = await fetchStockCard({
        drug_id: $("mlDrug").value, warehouse_id: $("mlWarehouse").value, lot_id: $("mlLot").value,
        date_from: $("mlFrom").value, date_to: $("mlTo").value, type: $("mlType").value
    });
    $("mlShow").disabled = false;

    if (!result?.success) {
        card = null;
        $("mlCardBody").innerHTML = `<div class="ml-empty">${escapeHtml(result?.message || "Couldn't load the stock card.")}</div>`;
        $("mlCsv").disabled = $("mlPrint").disabled = true;
        return;
    }

    card = result.data;
    $("mlCsv").disabled = $("mlPrint").disabled = false;
    renderCard();
}

function scopeText(c) {
    const location = options.warehouses.find((w) => String(w.id) === String(c.filters.warehouse_id || ""))?.name || "All locations";
    const lot = c.filters.lot_id ? options.lots.find((l) => String(l.id) === String(c.filters.lot_id)) : null;
    const period = c.filters.date_from || c.filters.date_to
        ? `${c.filters.date_from ? formatDate(c.filters.date_from) : "the start"} to ${c.filters.date_to ? formatDate(c.filters.date_to) : "today"}`
        : "All dates";
    return [location, lot ? `Lot ${lot.lot_number}` : "All lots", period].join(" · ");
}

function renderCard() {
    const c = card;
    const unit = escapeHtml(c.drug.unit_name || "units");
    const typeLabel = options.types.find((t) => t.value === c.filters.type)?.label;
    const check = c.reconciled === null ? ""
        : c.reconciled
            ? `<div class="ml-check-ok">&#10003; The ledger matches the stock on hand now (${formatQty(c.on_hand)} ${unit}).</div>`
            : `<div class="ml-check-bad">&#9888; The ledger ends at ${formatQty(c.closing_balance)} but ${formatQty(c.on_hand)} ${unit} are on hand — stock was changed somewhere without a ledger entry.</div>`;

    $("mlCardBody").innerHTML = `
        <div class="ml-stats">
            <div class="ml-stat"><strong>${formatQty(c.opening_balance)}</strong><span>Opening balance${c.filters.date_from ? ` (${formatDate(c.filters.date_from)})` : ""}</span></div>
            <div class="ml-stat in"><strong>+${formatQty(c.totals.in)}</strong><span>In · ${formatMoney(c.totals.value_in)}</span></div>
            <div class="ml-stat out"><strong>−${formatQty(c.totals.out)}</strong><span>Out · ${formatMoney(c.totals.value_out)}</span></div>
            <div class="ml-stat"><strong>${formatQty(c.closing_balance)}</strong><span>Closing balance${c.filters.date_to ? ` (${formatDate(c.filters.date_to)})` : ""}</span></div>
        </div>
        ${check}
        <div class="ml-card">
            <div class="ml-card-title"><span style="text-transform:none;font-size:15px;color:var(--text-primary);">${escapeHtml(c.drug.name)}</span>
                <span style="text-transform:none;font-weight:400;">${escapeHtml(scopeText(c))}${typeLabel ? ` · only ${escapeHtml(typeLabel)}` : ""} · in ${unit}</span></div>
            ${c.rows.length || c.opening_balance ? `
            <div class="ml-table-wrap"><table class="ml-table card">
                <thead><tr><th>Date</th><th>Movement</th><th>Reference</th><th>Location / Lot</th><th>Details</th><th class="num">In</th><th class="num">Out</th><th class="num">Balance</th><th class="num">Unit Cost</th><th class="num">Value</th><th>By</th></tr></thead>
                <tbody>
                    ${c.filters.date_from ? `<tr class="opening"><td>${formatDate(c.filters.date_from)}</td><td colspan="6">Opening balance</td><td class="num">${formatQty(c.opening_balance)}</td><td colspan="3"></td></tr>` : ""}
                    ${c.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(r.date)}</td>
                        <td><span class="ml-badge ${TYPE_STYLE[r.type] || "neutral"}">${escapeHtml(r.type_label)}</span></td>
                        <td style="white-space:nowrap;">${escapeHtml(r.reference_no || "—")}</td>
                        <td class="place">${escapeHtml(r.warehouse_name)}<span class="ml-sub">Lot ${escapeHtml(r.lot_number)}${r.expires_date ? ` · exp ${formatDate(r.expires_date)}` : ""}</span></td>
                        <td class="details">${escapeHtml(r.counterparty || "")}${r.reason ? `<span class="ml-sub">${escapeHtml(r.reason)}</span>` : ""}${r.notes ? `<span class="ml-sub">${escapeHtml(r.notes)}</span>` : ""}</td>
                        <td class="num">${r.quantity_in != null ? `<span class="ml-in">${formatQty(r.quantity_in)}</span>` : ""}</td>
                        <td class="num">${r.quantity_out != null ? `<span class="ml-out">${formatQty(r.quantity_out)}</span>` : ""}</td>
                        <td class="num"><strong>${formatQty(r.balance)}</strong></td>
                        <td class="num">${formatMoney(r.unit_cost, 4)}</td>
                        <td class="num">${signedMoney(r.value)}</td>
                        <td>${escapeHtml(r.recorded_by || "—")}<span class="ml-sub">${escapeHtml(formatDateTime(r.recorded_at))}</span></td>
                    </tr>`).join("")}
                </tbody>
                <tfoot><tr><td colspan="5">Closing balance</td><td class="num">${formatQty(c.totals.in)}</td><td class="num">${formatQty(c.totals.out)}</td><td class="num">${formatQty(c.closing_balance)}</td><td colspan="3"></td></tr></tfoot>
            </table></div>
            ${c.truncated ? `<p class="ml-note">Only the first 5,000 movements are listed; narrow the dates to see the rest. The balances include everything.</p>` : ""}
            ${typeLabel ? `<p class="ml-note">Only ${escapeHtml(typeLabel)} rows are listed; the Balance column still counts every movement.</p>` : ""}`
            : `<div class="ml-empty">No movements${c.filters.date_from || c.filters.date_to ? " in this period" : ""}.</div>`}
        </div>`;
}

function cardCsv(c) {
    return [
        ["Item", c.drug.name], ["Scope", scopeText(c)], ["Unit", c.drug.unit_name || ""], [],
        ["Date", "Movement", "Reference", "Location", "Lot", "Expiry", "Counterparty", "Reason", "Notes", "In", "Out", "Balance", "Unit Cost", "Value", "Recorded By", "Recorded At"],
        ...(c.filters.date_from ? [[c.filters.date_from, "Opening balance", "", "", "", "", "", "", "", "", "", c.opening_balance]] : []),
        ...c.rows.map((r) => [r.date, r.type_label, r.reference_no || "", r.warehouse_name, r.lot_number, r.expires_date || "", r.counterparty || "", r.reason || "", r.notes || "",
            r.quantity_in ?? "", r.quantity_out ?? "", r.balance, r.unit_cost, r.value, r.recorded_by || "", r.recorded_at || ""]),
        ["", "Closing balance", "", "", "", "", "", "", "", c.totals.in, c.totals.out, c.closing_balance]
    ];
}

/* ---------------------------------------------------------------
 * Movement summary
 * ------------------------------------------------------------- */

async function loadSummary() {
    if ($("mlSumFrom").value && $("mlSumTo").value && $("mlSumFrom").value > $("mlSumTo").value) {
        showToast("The From date is after the To date.", "error");
        return;
    }

    $("mlSummaryBody").innerHTML = `<div class="ml-empty">Loading...</div>`;
    $("mlSumShow").disabled = true;
    const result = await fetchMovementSummary({
        date_from: $("mlSumFrom").value, date_to: $("mlSumTo").value, warehouse_id: $("mlSumWarehouse").value, only_moved: $("mlSumMoved").checked ? 1 : ""
    });
    $("mlSumShow").disabled = false;

    if (!result?.success) {
        summary = null;
        $("mlSummaryBody").innerHTML = `<div class="ml-empty">${escapeHtml(result?.message || "Couldn't load the summary.")}</div>`;
        $("mlSumCsv").disabled = $("mlSumPrint").disabled = true;
        return;
    }

    summary = result.data;
    $("mlSumCsv").disabled = $("mlSumPrint").disabled = false;
    renderSummary();
}

function summaryColumns(s) {
    // Dispensing isn't recorded yet; show the column only once there is some.
    return SUMMARY_COLUMNS.filter(([key]) => key !== "dispensed" || s.rows.some((r) => r.dispensed));
}

function renderSummary() {
    const s = summary;
    const columns = summaryColumns(s);
    const cell = (key, value) => {
        if (key === "opening" || key === "closing") return `<strong>${formatQty(value)}</strong>`;
        if (!value) return `<span class="ml-sub" style="margin:0;">—</span>`;
        return `<span class="${value > 0 ? "ml-in" : "ml-out"}">${value > 0 ? "+" : "−"}${formatQty(Math.abs(value))}</span>`;
    };

    $("mlSummaryBody").innerHTML = s.rows.length ? `
        <div class="ml-card">
            <div class="ml-card-title"><span>Stock Movement by Item</span><span style="text-transform:none;font-weight:400;">${escapeHtml(summaryScope(s))}</span></div>
            <div class="ml-table-wrap"><table class="ml-table">
                <thead><tr><th>Item</th>${columns.map(([, label]) => `<th class="num">${label}</th>`).join("")}</tr></thead>
                <tbody>${s.rows.map((r) => `
                    <tr class="ml-click" data-ml-drug="${r.drug_id}" title="Open the stock card">
                        <td><strong>${escapeHtml(r.drug_name)}</strong><span class="ml-sub">${escapeHtml(r.unit_name || "units")} · ${r.movements} movement${r.movements === 1 ? "" : "s"}</span></td>
                        ${columns.map(([key]) => `<td class="num">${cell(key, r[key])}</td>`).join("")}
                    </tr>`).join("")}</tbody>
            </table></div>
            <p class="ml-note">Quantities in each item's dispensing unit. Received is net of voided receipts; Transfers Out is net of cancelled transfers; Dispensed is net of undone dispensings. ${$("mlSumWarehouse").value ? "" : "For all locations, transfers in and out mostly cancel out — what's left was lost in transit or is still on the way."} Click an item for its stock card.</p>
        </div>`
        : `<div class="ml-empty">No stock movements${$("mlSumMoved").checked ? " in this period" : ""}.</div>`;

    $("mlSummaryBody").querySelectorAll("[data-ml-drug]").forEach((row) => row.addEventListener("click", () => openCardFromSummary(row.dataset.mlDrug)));
}

function summaryScope(s) {
    const location = options.warehouses.find((w) => String(w.id) === String(s.filters.warehouse_id || ""))?.name || "All locations";
    const period = `${s.filters.date_from ? formatDate(s.filters.date_from) : "the start"} to ${s.filters.date_to ? formatDate(s.filters.date_to) : "today"}`;
    return `${location} · ${period}`;
}

function openCardFromSummary(drugId) {
    $("mlItemSearch").value = "";
    renderDrugOptions();
    $("mlDrug").value = String(drugId);
    $("mlWarehouse").value = $("mlSumWarehouse").value;
    renderLotOptions();
    $("mlLot").value = "";
    $("mlType").value = "";
    $("mlFrom").value = $("mlSumFrom").value;
    $("mlTo").value = $("mlSumTo").value;
    showTab("card");
    loadCard();
}

function summaryCsv(s) {
    const columns = summaryColumns(s);
    return [
        ["Stock Movement Summary"], ["Scope", summaryScope(s)], [],
        ["Item", "Unit", ...columns.map(([, label]) => label), "Movements"],
        ...s.rows.map((r) => [r.drug_name, r.unit_name || "", ...columns.map(([key]) => r[key]), r.movements])
    ];
}

/* ---------------------------------------------------------------
 * Export & print
 * ------------------------------------------------------------- */

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

function openPrint(title, body) {
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; margin: 0; padding: 20px; }
    h1 { margin: 0 0 2px; font-size: 18px; letter-spacing: .5px; } .muted { color: #4b5563; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px; border: 1px solid #d1d5db; }
    td { padding: 5px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; white-space: nowrap; } .b { font-weight: 700; }
    .sub { display: block; color: #4b5563; font-size: 10px; }
</style></head><body>${body}
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

function printCard(c) {
    openPrint(`Stock Card - ${c.drug.name}`, `
        <h1>STOCK CARD — ${escapeHtml(c.drug.name)}</h1>
        <div class="muted">${escapeHtml(scopeText(c))} · quantities in ${escapeHtml(c.drug.unit_name || "units")} · printed ${formatDate(todayISO())}</div>
        <table><thead><tr><th>Date</th><th>Movement</th><th>Reference</th><th>Location / Lot</th><th>Details</th><th class="num">In</th><th class="num">Out</th><th class="num">Balance</th><th class="num">Value</th><th>By</th></tr></thead>
        <tbody>
            ${c.filters.date_from ? `<tr><td>${formatDate(c.filters.date_from)}</td><td colspan="6" class="b">Opening balance</td><td class="num b">${formatQty(c.opening_balance)}</td><td colspan="2"></td></tr>` : ""}
            ${c.rows.map((r) => `<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.type_label)}</td><td>${escapeHtml(r.reference_no || "")}</td>
                <td>${escapeHtml(r.warehouse_name)}<span class="sub">Lot ${escapeHtml(r.lot_number)}${r.expires_date ? ` · exp ${formatDate(r.expires_date)}` : ""}</span></td>
                <td>${escapeHtml([r.counterparty, r.reason, r.notes].filter(Boolean).join(" · "))}</td>
                <td class="num">${r.quantity_in != null ? formatQty(r.quantity_in) : ""}</td><td class="num">${r.quantity_out != null ? formatQty(r.quantity_out) : ""}</td>
                <td class="num b">${formatQty(r.balance)}</td><td class="num">${signedMoney(r.value)}</td><td>${escapeHtml(r.recorded_by || "")}</td></tr>`).join("")}
            <tr><td colspan="5" class="b">Closing balance</td><td class="num b">${formatQty(c.totals.in)}</td><td class="num b">${formatQty(c.totals.out)}</td><td class="num b">${formatQty(c.closing_balance)}</td><td colspan="2"></td></tr>
        </tbody></table>`);
}

function printSummary(s) {
    const columns = summaryColumns(s);
    openPrint("Stock Movement Summary", `
        <h1>STOCK MOVEMENT SUMMARY</h1>
        <div class="muted">${escapeHtml(summaryScope(s))} · quantities in each item's dispensing unit · printed ${formatDate(todayISO())}</div>
        <table><thead><tr><th>Item</th>${columns.map(([, label]) => `<th class="num">${label}</th>`).join("")}</tr></thead>
        <tbody>${s.rows.map((r) => `<tr><td>${escapeHtml(r.drug_name)}<span class="sub">${escapeHtml(r.unit_name || "units")}</span></td>
            ${columns.map(([key]) => `<td class="num ${key === "opening" || key === "closing" ? "b" : ""}">${r[key] ? formatQty(r[key]) : (key === "opening" || key === "closing" ? "0" : "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
}

/** −₱60.00 rather than ₱-60.00. */
function signedMoney(value) {
    return value < 0 ? `−${formatMoney(-value)}` : formatMoney(value);
}

function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
