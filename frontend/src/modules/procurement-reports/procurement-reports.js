import { fetchProcurementOptions, fetchProcurementReport } from "./procurement-reports.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO } from "../../core/timezone.js";

const SPEND_GROUPS = { supplier: "Supplier", item: "Item", department: "Department", location: "Storage location", month: "Month" };

let options = { suppliers: [], warehouses: [], departments: [], drugs: [] };
let activeTab = "open";
let lastData = null;
const filters = {
    date_from: "", date_to: "", supplier_id: "", warehouse_id: "", late_only: false,
    group_by: "supplier", department_id: "", drug_id: "", direction: ""
};

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------
 * Tabs: which filters each uses, how it draws, and its CSV
 * ------------------------------------------------------------- */

const TABS = [
    {
        id: "open", label: "Open Orders & Late Deliveries", report: "open-orders",
        fields: ["supplier_id", "warehouse_id", "late_only", "date_from", "date_to"],
        dateHint: "Late deliveries received between",
        render: renderOpen, csv: csvOpen
    },
    {
        id: "performance", label: "Supplier Performance", report: "supplier-performance",
        fields: ["date_from", "date_to", "supplier_id", "warehouse_id"],
        render: renderPerformance, csv: csvPerformance
    },
    {
        id: "spend", label: "Spend", report: "spend",
        fields: ["group_by", "date_from", "date_to", "supplier_id", "warehouse_id", "department_id"],
        render: renderSpend, csv: csvSpend
    },
    {
        id: "price", label: "Price History", report: "price-history",
        fields: ["drug_id", "date_from", "date_to", "supplier_id"],
        needs: () => filters.drug_id ? null : "Choose an item to see what it has cost.",
        render: renderPriceHistory, csv: csvPriceHistory
    },
    {
        id: "diffs", label: "Price Differences", report: "price-differences",
        fields: ["date_from", "date_to", "supplier_id", "direction"],
        render: renderDifferences, csv: csvDifferences
    }
];

export async function initProcurementReports() {
    filters.date_from = `${todayISO().slice(0, 4)}-01-01`;
    filters.date_to = todayISO();

    const result = await fetchProcurementOptions();
    if (result?.success) options = result.data;

    renderTabs();
    renderFilters();
    await run();
}

function tab() {
    return TABS.find((t) => t.id === activeTab) || TABS[0];
}

function renderTabs() {
    $("pqTabs").innerHTML = TABS.map((t) => `<button type="button" data-pq-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}">${t.label}</button>`).join("");
    $("pqTabs").querySelectorAll("[data-pq-tab]").forEach((btn) => btn.addEventListener("click", async () => {
        activeTab = btn.dataset.pqTab;
        renderTabs();
        renderFilters();
        await run();
    }));
}

function select(name, list, placeholder, label) {
    return `<label>${label}<select data-pq-filter="${name}"><option value="">${placeholder}</option>${list.map((o) =>
        `<option value="${o.id}" ${String(filters[name]) === String(o.id) ? "selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}</select></label>`;
}

function renderFilters() {
    const t = tab();
    const parts = t.fields.map((f) => ({
        date_from: `<label>${t.dateHint ? `${t.dateHint}` : "From"}<input type="date" data-pq-filter="date_from" value="${filters.date_from}"></label>`,
        date_to: `<label>To<input type="date" data-pq-filter="date_to" value="${filters.date_to}"></label>`,
        supplier_id: select("supplier_id", options.suppliers, "All suppliers", "Supplier"),
        warehouse_id: select("warehouse_id", options.warehouses, "All locations", "Location"),
        department_id: select("department_id", options.departments, "All departments", "Department"),
        drug_id: select("drug_id", options.drugs, "-- Choose an item --", "Item"),
        late_only: `<label class="pq-check"><input type="checkbox" data-pq-filter="late_only" ${filters.late_only ? "checked" : ""}> Only late orders</label>`,
        group_by: `<label>Group by<select data-pq-filter="group_by">${Object.entries(SPEND_GROUPS).map(([k, v]) =>
            `<option value="${k}" ${filters.group_by === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
        direction: `<label>Billed<select data-pq-filter="direction"><option value="">Higher or lower</option>
            <option value="higher" ${filters.direction === "higher" ? "selected" : ""}>Higher than the PO</option>
            <option value="lower" ${filters.direction === "lower" ? "selected" : ""}>Lower than the PO</option></select></label>`
    }[f])).join("");

    $("pqFilters").innerHTML = `${parts}
        <div class="pq-actions">
            <button type="button" class="pq-btn small primary" id="pqRun">Show</button>
            <button type="button" class="pq-btn small" id="pqCsv">Export CSV</button>
            <button type="button" class="pq-btn small" id="pqPrint">Print</button>
        </div>`;

    $("pqFilters").querySelectorAll("[data-pq-filter]").forEach((el) => el.addEventListener("change", () => {
        filters[el.dataset.pqFilter] = el.type === "checkbox" ? el.checked : el.value;
        // Pickers re-run straight away; dates wait for "Show".
        if (el.type !== "date") run();
    }));
    $("pqRun").addEventListener("click", run);
    $("pqCsv").addEventListener("click", exportCsv);
    $("pqPrint").addEventListener("click", printReport);
}

async function run() {
    const t = tab();
    const missing = t.needs?.();
    lastData = null;

    if (missing) {
        $("pqBody").innerHTML = `<div class="pq-empty">${missing}</div>`;
        return;
    }

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
        $("pqBody").innerHTML = `<div class="pq-empty">The "from" date is after the "to" date.</div>`;
        return;
    }

    $("pqBody").innerHTML = `<div class="pq-empty">Loading...</div>`;
    const params = Object.fromEntries(t.fields.map((f) => [f, filters[f] === true ? 1 : filters[f]]));
    const result = await fetchProcurementReport(t.report, params);

    if (activeTab !== t.id) return; // switched tabs while loading

    if (!result?.success) {
        $("pqBody").innerHTML = `<div class="pq-empty">${escapeHtml(result?.message || "Couldn't load the report.")}</div>`;
        return;
    }

    lastData = result.data;
    $("pqBody").innerHTML = t.render(result.data);
}

/* ---------------------------------------------------------------
 * Open orders & late deliveries
 * ------------------------------------------------------------- */

function renderOpen(d) {
    const t = d.totals;
    return `
        <div class="pq-stats">
            <div class="pq-stat"><strong>${t.open_count}</strong><span>Open purchase orders</span></div>
            <div class="pq-stat"><strong>${formatMoney(t.open_value)}</strong><span>Still to be delivered</span></div>
            <div class="pq-stat ${t.late_count ? "bad" : ""}"><strong>${t.late_count}</strong><span>Past the expected date · ${formatMoney(t.late_value)}</span></div>
            <div class="pq-stat ${t.late_receipts ? "bad" : ""}"><strong>${t.late_receipts}</strong><span>Deliveries that came late (in the period)</span></div>
        </div>
        <div class="pq-card">
            <div class="pq-card-title">Open Purchase Orders <span style="text-transform:none;font-weight:400;">Approved, not fully received</span></div>
            ${d.orders.length ? `
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>PO No.</th><th>Supplier</th><th>Deliver To</th><th>Ordered</th><th>Expected</th><th>Status</th><th class="num">Lines Open</th><th class="num">Received</th><th class="num">Still to Come</th></tr></thead>
                <tbody>${d.orders.map((o) => `
                    <tr>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(o.po_number)}</strong><span class="pq-sub">${o.days_open} day${o.days_open === 1 ? "" : "s"} open</span></td>
                        <td>${escapeHtml(o.supplier_name)}</td>
                        <td>${escapeHtml(o.warehouse_name || "—")}</td>
                        <td style="white-space:nowrap;">${formatDate(o.order_date)}</td>
                        <td style="white-space:nowrap;">${o.expected_date ? formatDate(o.expected_date) : "—"}</td>
                        <td>${o.is_late ? `<span class="pq-badge late">${o.days_late} day${o.days_late === 1 ? "" : "s"} late</span>` : o.expected_date ? `<span class="pq-badge ok">On schedule</span>` : `<span class="pq-badge muted">No date</span>`}
                            ${o.status === "partially_received" ? `<span class="pq-sub">Partly received${o.last_received ? `, last ${formatDate(o.last_received)}` : ""}</span>` : ""}</td>
                        <td class="num">${o.open_lines} of ${o.line_count}</td>
                        <td class="num">${o.received_value ? formatMoney(o.received_value) : "—"}</td>
                        <td class="num"><strong>${formatMoney(o.open_value)}</strong></td>
                    </tr>`).join("")}</tbody>
            </table></div>` : `<div class="pq-empty">${filters.late_only ? "No late orders." : "No open purchase orders."}</div>`}
            <p class="pq-note">Values are at the order price, before VAT.</p>
        </div>
        <div class="pq-card">
            <div class="pq-card-title">Late Deliveries <span style="text-transform:none;font-weight:400;">Received after the expected date, ${formatDate(filters.date_from)} – ${formatDate(filters.date_to)}</span></div>
            ${d.late_receipts.length ? `
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>Received</th><th>Receiving Report</th><th>PO No.</th><th>Supplier</th><th>Expected</th><th class="num">Days Late</th><th class="num">Value</th></tr></thead>
                <tbody>${d.late_receipts.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(r.received_date)}</td>
                        <td>${escapeHtml(r.gr_number)}<span class="pq-sub">${escapeHtml(r.warehouse_name || "")}</span></td>
                        <td>${escapeHtml(r.po_number)}</td>
                        <td>${escapeHtml(r.supplier_name)}</td>
                        <td style="white-space:nowrap;">${formatDate(r.expected_date)}</td>
                        <td class="num"><span class="pq-badge late">${r.days_late}</span></td>
                        <td class="num">${formatMoney(r.value)}</td>
                    </tr>`).join("")}</tbody>
            </table></div>` : `<div class="pq-empty">No late deliveries in this period.</div>`}
        </div>`;
}

function csvOpen(d) {
    return [
        ["PO No.", "Supplier", "Deliver To", "Ordered", "Expected", "Days Late", "Lines Open", "Lines", "Received Value", "Open Value"],
        ...d.orders.map((o) => [o.po_number, o.supplier_name, o.warehouse_name || "", o.order_date, o.expected_date || "", o.days_late, o.open_lines, o.line_count, o.received_value, o.open_value]),
        [],
        ["Late deliveries"],
        ["Received", "Receiving Report", "PO No.", "Supplier", "Expected", "Days Late", "Value"],
        ...d.late_receipts.map((r) => [r.received_date, r.gr_number, r.po_number, r.supplier_name, r.expected_date, r.days_late, r.value])
    ];
}

/* ---------------------------------------------------------------
 * Supplier performance
 * ------------------------------------------------------------- */

function rate(value, goodHigh = true, good = 90, poor = 75) {
    if (value === null || value === undefined) return `<span class="pq-sub" style="margin:0;">—</span>`;
    const ok = goodHigh ? value >= good : value <= good;
    const bad = goodHigh ? value < poor : value > poor;
    return `<span class="pq-badge ${ok ? "ok" : bad ? "bad" : "warn"} pq-rate">${value}%</span>`;
}

function renderPerformance(d) {
    const t = d.totals;
    if (!d.suppliers.length) return `<div class="pq-empty">No deliveries or orders in this period.</div>`;

    return `
        <div class="pq-stats">
            <div class="pq-stat"><strong>${t.deliveries}</strong><span>Deliveries received</span></div>
            <div class="pq-stat ${t.on_time_rate !== null && t.on_time_rate < 75 ? "bad" : "good"}"><strong>${t.on_time_rate === null ? "—" : `${t.on_time_rate}%`}</strong><span>On time (delivered by the expected date)</span></div>
            <div class="pq-stat ${t.rejection_rate > 5 ? "bad" : ""}"><strong>${t.rejection_rate === null ? "—" : `${t.rejection_rate}%`}</strong><span>Rejected at receiving</span></div>
            <div class="pq-stat"><strong>${formatMoney(t.received_value)}</strong><span>Value received</span></div>
        </div>
        <div class="pq-card">
            <div class="pq-card-title">By Supplier</div>
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>Supplier</th><th class="num">Orders</th><th class="num">Deliveries</th><th>On Time</th><th class="num">Avg Days Late</th><th>Rejected</th><th>Fill Rate</th><th class="num">Avg Lead Time</th><th class="num">Returns</th><th class="num">Value Received</th></tr></thead>
                <tbody>${d.suppliers.map((s) => `
                    <tr>
                        <td><strong>${escapeHtml(s.supplier_name)}</strong></td>
                        <td class="num">${s.orders}</td>
                        <td class="num">${s.deliveries}</td>
                        <td>${rate(s.on_time_rate)}<span class="pq-sub">${s.on_time} on time · ${s.late} late</span></td>
                        <td class="num">${s.avg_days_late ?? "—"}</td>
                        <td>${rate(s.rejection_rate, false, 2, 5)}<span class="pq-sub">${formatQty(s.rejected_qty)} of ${formatQty(s.accepted_qty + s.rejected_qty)}${s.rejected_lines ? ` · ${s.rejected_lines} line${s.rejected_lines === 1 ? "" : "s"}` : ""}</span></td>
                        <td>${rate(s.fill_rate, true, 95, 80)}${s.short_closed_lines ? `<span class="pq-sub">${s.short_closed_lines} line${s.short_closed_lines === 1 ? "" : "s"} closed short</span>` : ""}</td>
                        <td class="num">${s.avg_lead_days === null ? "—" : `${s.avg_lead_days} days`}</td>
                        <td class="num">${s.returns ? `${s.returns}<span class="pq-sub">${formatMoney(s.return_value)}</span>` : "—"}</td>
                        <td class="num">${formatMoney(s.received_value)}</td>
                    </tr>`).join("")}</tbody>
            </table></div>
            <p class="pq-note">On time counts deliveries whose order had an expected date. Rejected is the share of delivered quantity refused at receiving. Fill rate is how much of what was ordered in the period has arrived. Lead time is order date to delivery.</p>
        </div>`;
}

function csvPerformance(d) {
    return [
        ["Supplier", "Orders", "Deliveries", "On Time", "Late", "On-Time %", "Avg Days Late", "Accepted Qty", "Rejected Qty", "Rejection %", "Fill Rate %", "Avg Lead Days", "Returns", "Return Value", "Value Received"],
        ...d.suppliers.map((s) => [s.supplier_name, s.orders, s.deliveries, s.on_time, s.late, s.on_time_rate ?? "", s.avg_days_late ?? "", s.accepted_qty, s.rejected_qty,
            s.rejection_rate ?? "", s.fill_rate ?? "", s.avg_lead_days ?? "", s.returns, s.return_value, s.received_value])
    ];
}

/* ---------------------------------------------------------------
 * Spend
 * ------------------------------------------------------------- */

function renderSpend(d) {
    if (!d.rows.length) return `<div class="pq-empty">Nothing received in this period.</div>`;
    const isItem = d.group_by === "item";
    const top = Math.max(...d.rows.map((r) => r.amount), 0.01);

    return `
        <div class="pq-stats">
            <div class="pq-stat"><strong>${formatMoney(d.total)}</strong><span>Received, ${formatDate(filters.date_from)} – ${formatDate(filters.date_to)}</span></div>
            <div class="pq-stat"><strong>${d.rows.length}</strong><span>${SPEND_GROUPS[d.group_by]}${d.rows.length === 1 ? "" : "s"}</span></div>
            ${d.group_by !== "month" ? `<div class="pq-stat"><strong>${escapeHtml(d.rows[0].label)}</strong><span>Largest · ${d.rows[0].share}% of spend</span></div>` : ""}
        </div>
        <div class="pq-card">
            <div class="pq-card-title">Spend by ${SPEND_GROUPS[d.group_by]}</div>
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>${SPEND_GROUPS[d.group_by]}</th>${isItem ? `<th class="num">Quantity</th><th class="num">Avg Unit Cost</th>` : ""}<th class="num">Lines</th><th class="num">Amount</th><th style="min-width:140px;">Share</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr>
                        <td><strong>${escapeHtml(r.label)}</strong></td>
                        ${isItem ? `<td class="num">${formatQty(r.quantity)} ${escapeHtml(r.unit_name || "")}</td><td class="num">${formatMoney(r.avg_unit_cost, 4)}</td>` : ""}
                        <td class="num">${r.lines}</td>
                        <td class="num"><strong>${formatMoney(r.amount)}</strong></td>
                        <td>${r.share}%<div class="pq-bar"><span style="width:${Math.round(r.amount / top * 100)}%;"></span></div></td>
                    </tr>`).join("")}</tbody>
                <tfoot><tr><td>Total</td>${isItem ? "<td></td><td></td>" : ""}<td></td><td class="num">${formatMoney(d.total)}</td><td></td></tr></tfoot>
            </table></div>
            <p class="pq-note">Value of what was received (accepted quantity × cost, before VAT); voided receiving reports are left out.${d.group_by === "department"
                ? " Deliveries for a purchase request count for the requesting department; the rest for the receiving location's department." : ""}</p>
        </div>`;
}

function csvSpend(d) {
    const isItem = d.group_by === "item";
    return [
        [SPEND_GROUPS[d.group_by], ...(isItem ? ["Quantity", "Unit", "Avg Unit Cost"] : []), "Lines", "Amount", "Share %"],
        ...d.rows.map((r) => [r.label, ...(isItem ? [r.quantity, r.unit_name || "", r.avg_unit_cost] : []), r.lines, r.amount, r.share]),
        ["Total", ...(isItem ? ["", "", ""] : []), "", d.total, 100]
    ];
}

/* ---------------------------------------------------------------
 * Price history
 * ------------------------------------------------------------- */

function changeHtml(value, pct) {
    if (value === null || value === undefined || Math.abs(value) < 0.00005) return `<span class="pq-sub" style="margin:0;">—</span>`;
    return `<span class="${value > 0 ? "pq-up" : "pq-down"}">${value > 0 ? "▲" : "▼"} ${pct === null ? "" : `${Math.abs(pct)}%`}</span>`;
}

function renderPriceHistory(d) {
    const unit = escapeHtml(d.drug.unit_name || "unit");
    const s = d.summary;

    return `
        ${s ? `
        <div class="pq-stats">
            <div class="pq-stat"><strong>${formatMoney(s.latest, 4)}</strong><span>Latest, per ${unit}</span></div>
            <div class="pq-stat"><strong>${formatMoney(s.average, 4)}</strong><span>Average paid (by quantity)</span></div>
            <div class="pq-stat good"><strong>${formatMoney(s.lowest, 4)}</strong><span>Lowest</span></div>
            <div class="pq-stat bad"><strong>${formatMoney(s.highest, 4)}</strong><span>Highest</span></div>
            <div class="pq-stat"><strong>${s.change_pct === null ? "—" : `${s.change_pct > 0 ? "+" : ""}${s.change_pct}%`}</strong><span>Change, first to latest delivery</span></div>
        </div>` : ""}
        <div class="pq-card">
            <div class="pq-card-title">${escapeHtml(d.drug.name)} — Deliveries <span style="text-transform:none;font-weight:400;">Newest first${d.drug.package_quantity ? ` · ${escapeHtml(d.drug.package_unit_name || "package")} of ${formatQty(d.drug.package_quantity)}` : ""}</span></div>
            ${d.rows.length ? `
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>Received</th><th>Supplier</th><th>PO / Receiving</th><th class="num">Quantity</th><th class="num">Cost per ${unit}</th><th class="num">Per Package</th><th>Change</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(r.received_date)}</td>
                        <td>${escapeHtml(r.supplier_name)}</td>
                        <td>${escapeHtml(r.po_number)}<span class="pq-sub">${escapeHtml(r.gr_number)}</span></td>
                        <td class="num">${formatQty(r.base_quantity)} ${unit}</td>
                        <td class="num"><strong>${formatMoney(r.unit_cost, 4)}</strong></td>
                        <td class="num">${r.package_cost !== null ? formatMoney(r.package_cost) : "—"}</td>
                        <td>${changeHtml(r.change, r.change_pct)}</td>
                    </tr>`).join("")}</tbody>
            </table></div>` : `<div class="pq-empty">No deliveries of this item in this period.</div>`}
        </div>
        <div class="pq-card">
            <div class="pq-card-title">Current Supplier Prices</div>
            ${d.listings.length ? `
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>Supplier</th><th class="num">Price</th><th class="num">Per ${unit}</th><th>vs Latest Paid</th><th>As Of</th></tr></thead>
                <tbody>${d.listings.map((l) => {
                    const diff = s ? l.unit_price - s.latest : null;
                    return `
                    <tr>
                        <td>${escapeHtml(l.supplier_name)}</td>
                        <td class="num">${formatMoney(l.price)} <span class="pq-sub" style="display:inline;">/ ${l.price_basis === "package" ? escapeHtml(d.drug.package_unit_name || "package") : unit}</span></td>
                        <td class="num">${formatMoney(l.unit_price, 4)}</td>
                        <td>${diff === null ? "—" : changeHtml(diff, s.latest ? Math.round(diff / s.latest * 1000) / 10 : null)}</td>
                        <td>${l.price_as_of ? formatDate(l.price_as_of) : "—"}</td>
                    </tr>`;
                }).join("")}</tbody>
            </table></div>` : `<div class="pq-empty">No supplier prices on file for this item.</div>`}
            ${d.drug.catalog_cost !== null ? `<p class="pq-note">Catalog cost: ${formatMoney(d.drug.catalog_cost, 4)} per ${unit}.</p>` : ""}
        </div>`;
}

function csvPriceHistory(d) {
    return [
        ["Item", d.drug.name],
        [],
        ["Received", "Supplier", "PO No.", "Receiving Report", "Quantity", "Unit", "Cost per Unit", "Per Package", "Change", "Change %"],
        ...d.rows.map((r) => [r.received_date, r.supplier_name, r.po_number, r.gr_number, r.base_quantity, d.drug.unit_name || "", r.unit_cost, r.package_cost ?? "", r.change ?? "", r.change_pct ?? ""])
    ];
}

/* ---------------------------------------------------------------
 * Price differences
 * ------------------------------------------------------------- */

const INVOICE_STATUS = { draft: "Draft", pending_approval: "For approval", approved: "Approved", rejected: "Rejected" };

function renderDifferences(d) {
    const t = d.totals;

    return `
        <div class="pq-stats">
            <div class="pq-stat"><strong>${t.lines}</strong><span>Invoice lines billed at another price</span></div>
            <div class="pq-stat bad"><strong>${formatMoney(t.overcharged)}</strong><span>Billed above the PO price</span></div>
            <div class="pq-stat good"><strong>${formatMoney(t.undercharged)}</strong><span>Billed below the PO price</span></div>
            <div class="pq-stat ${t.net > 0 ? "bad" : ""}"><strong>${t.net > 0 ? "+" : ""}${formatMoney(t.net)}</strong><span>Net difference · ${t.approved_lines} approved line${t.approved_lines === 1 ? "" : "s"}</span></div>
        </div>
        <div class="pq-card">
            <div class="pq-card-title">Supplier Invoice Prices vs Purchase Order</div>
            ${d.rows.length ? `
            <div class="pq-table-wrap"><table class="pq-table">
                <thead><tr><th>Invoice</th><th>Supplier</th><th>Item</th><th class="num">Quantity</th><th class="num">PO Price</th><th class="num">Billed</th><th>Difference</th><th class="num">Impact</th><th>Status</th></tr></thead>
                <tbody>${d.rows.map((r) => `
                    <tr>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.ap_number)}</strong><span class="pq-sub">Inv. ${escapeHtml(r.supplier_invoice_no)} · ${formatDate(r.invoice_date)}</span><span class="pq-sub">${escapeHtml(r.po_number)}</span></td>
                        <td>${escapeHtml(r.supplier_name)}</td>
                        <td>${escapeHtml(r.drug_name)}${r.order_unit === "package" && r.units_per_package ? `<span class="pq-sub">per package of ${formatQty(r.units_per_package)}</span>` : ""}</td>
                        <td class="num">${formatQty(r.quantity)}</td>
                        <td class="num">${formatMoney(r.po_price, 4)}</td>
                        <td class="num"><strong>${formatMoney(r.invoice_price, 4)}</strong></td>
                        <td>${changeHtml(r.difference, r.difference_pct)}</td>
                        <td class="num"><span class="${r.impact > 0 ? "pq-up" : "pq-down"}">${r.impact > 0 ? "+" : "−"}${formatMoney(Math.abs(r.impact))}</span></td>
                        <td><span class="pq-badge ${r.invoice_status === "approved" ? "warn" : "muted"}">${INVOICE_STATUS[r.invoice_status] || escapeHtml(r.invoice_status)}</span>
                            ${r.invoice_status === "approved" && r.approval_notes ? `<span class="pq-sub">&ldquo;${escapeHtml(r.approval_notes)}&rdquo;</span>` : ""}</td>
                    </tr>`).join("")}</tbody>
            </table></div>` : `<div class="pq-empty">Every invoice in this period was billed at the purchase order price.</div>`}
            <p class="pq-note">Net prices per order unit: after line discounts, before VAT. Impact = difference × quantity billed. Cancelled invoices are left out.</p>
        </div>`;
}

function csvDifferences(d) {
    return [
        ["AP No.", "Supplier Invoice No.", "Invoice Date", "PO No.", "Supplier", "Item", "Order Unit", "Quantity", "PO Price", "Billed Price", "Difference", "Difference %", "Impact", "Invoice Status"],
        ...d.rows.map((r) => [r.ap_number, r.supplier_invoice_no, r.invoice_date, r.po_number, r.supplier_name, r.drug_name, r.order_unit, r.quantity,
            r.po_price, r.invoice_price, r.difference, r.difference_pct ?? "", r.impact, r.invoice_status])
    ];
}

/* ---------------------------------------------------------------
 * Export & print
 * ------------------------------------------------------------- */

function exportCsv() {
    if (!lastData) {
        showToast("Show the report first.", "info");
        return;
    }

    const rows = tab().csv(lastData);
    const cell = (v) => {
        const text = String(v ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${tab().report}-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printReport() {
    if (!lastData) {
        showToast("Show the report first.", "info");
        return;
    }

    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const scope = [...$("pqFilters").querySelectorAll("select")].map((s) => s.value ? s.selectedOptions[0].textContent : "").filter(Boolean).join(" · ");
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(tab().label)}</title>
<style>
    @page { size: A4 landscape; margin: 10mm; } * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; margin: 0; padding: 16px; }
    h1 { margin: 0 0 2px; font-size: 18px; } .muted, .pq-sub, .pq-note { color: #4b5563; font-size: 10px; display: block; }
    .pq-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; } .pq-stat { border: 1px solid #d1d5db; padding: 6px 10px; min-width: 150px; }
    .pq-stat strong { display: block; font-size: 14px; } .pq-card { margin-bottom: 14px; } .pq-card-title { font-weight: 700; text-transform: uppercase; font-size: 10.5px; margin: 10px 0 6px; }
    table { width: 100%; border-collapse: collapse; } th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; padding: 5px; border: 1px solid #d1d5db; }
    td { padding: 5px; border: 1px solid #d1d5db; vertical-align: top; } .num { text-align: right; white-space: nowrap; } tr { page-break-inside: avoid; }
    .pq-bar { display: none; } .pq-badge { font-weight: 700; } .pq-empty { padding: 10px; border: 1px dashed #d1d5db; color: #4b5563; }
</style></head><body>
<h1>${escapeHtml(tab().label)}</h1>
<div class="muted">${filters.date_from && tab().fields.includes("date_from") ? `${formatDate(filters.date_from)} – ${formatDate(filters.date_to)} · ` : ""}${escapeHtml(scope || "All")} · printed ${formatDate(todayISO())}</div>
${$("pqBody").innerHTML}
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body></html>`);
    win.document.close();
}
