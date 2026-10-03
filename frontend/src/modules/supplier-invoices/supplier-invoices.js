import {
    fetchSupplierInvoices, fetchSupplierInvoice, fetchBillableOrders, fetchOrderForBilling, checkInvoiceMatch,
    createSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice, supplierInvoiceAction
} from "./supplier-invoices.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";
import { todayISO } from "../../core/timezone.js";

// Keep in step with SupplierInvoiceService::RECORDER_ROLES / APPROVER_ROLES.
const RECORDER_ROLES = ["admin", "receptionist", "doctor", "accountant"];
const APPROVER_ROLES = ["admin", "accountant"];
const canRecord = () => RECORDER_ROLES.includes(getUser()?.role);
const isApprover = () => APPROVER_ROLES.includes(getUser()?.role);

// Prices on orders and invoices are VAT-exclusive (PurchaseOrderService::VAT_RATE).
const VAT_PERCENT = 12;
const VAT_LABELS = { vatable: "VAT", exempt: "VAT-exempt", zero_rated: "Zero-rated" };

const STATUS_LABELS = {
    draft: "Draft",
    pending_approval: "For approval",
    approved: "Approved for payment",
    rejected: "Rejected",
    cancelled: "Cancelled"
};

const MATCH_LABELS = {
    matched: "Matched",
    under_billed: "Billed less",
    qty_variance: "Qty over received",
    price_variance: "Price over order",
    vat_mismatch: "VAT differs",
    not_received: "Not received"
};

const HISTORY_LABELS = {
    created: "Recorded",
    submitted: "Submitted for approval",
    resubmitted: "Resubmitted for approval",
    approved: "Approved for payment",
    rejected: "Rejected",
    cancelled: "Cancelled"
};

const TABS = [
    { id: "all", label: "All", filter: () => true },
    { id: "pending_approval", label: "For Approval", filter: (i) => i.status === "pending_approval" },
    { id: "open", label: "Drafts & Rejected", filter: (i) => i.status === "draft" || i.status === "rejected" },
    { id: "approved", label: "Approved", filter: (i) => i.status === "approved" },
    { id: "cancelled", label: "Cancelled", filter: (i) => i.status === "cancelled" }
];

let invoices = [];
let billable = [];
let activeTab = "all";

// Editor state
let order = null;          // from /supplier-invoices/order
let editing = null;        // the invoice being edited, or null for a new one
let selected = new Set();  // receipt ids billed
let lines = [];            // [{ key, purchase_order_item_id, drug_id, order_unit, quantity, unit_price, discount_amount, vat_type }]
let lineKey = 0;
let match = null;          // last match result from the server
let matchTimer = null;
let matchSeq = 0;
let dueManual = false;

const $ = (id) => document.getElementById(id);

export async function initSupplierInvoices() {
    $("siNewBtn").hidden = !canRecord();
    $("siNewBtn").addEventListener("click", showPicker);
    $("siSearch").addEventListener("input", renderList);
    $("siPickSearch").addEventListener("input", renderPicker);
    document.querySelectorAll("[data-si-back]").forEach((btn) => btn.addEventListener("click", showList));

    setupEditor();

    // Opened from a purchase order's "Record Supplier Invoice" button.
    window.addEventListener("po:invoice", onInvoiceRequest);

    const requested = window.__pendingInvoicePoId;
    window.__pendingInvoicePoId = null;

    await loadList();

    if (requested) await openEditor(requested);
}

function onInvoiceRequest(event) {
    if (!document.querySelector(".si-page")) {
        window.removeEventListener("po:invoice", onInvoiceRequest);
        return;
    }

    window.__pendingInvoicePoId = null;
    openEditor(event.detail.id);
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    $("siList").innerHTML = `<div class="si-empty">Loading...</div>`;

    const result = await fetchSupplierInvoices();
    const billableResult = canRecord() ? await fetchBillableOrders() : { success: true, data: [] };

    if (!result?.success) {
        $("siList").innerHTML = `
            <div class="si-empty">
                <strong>Couldn't load supplier invoices.</strong>
                <span class="si-sub">${escapeHtml(result?.message || "The server didn't respond.")}</span>
                <button type="button" class="si-btn small" id="siRetry" style="margin-top:10px;">Try Again</button>
            </div>`;
        $("siRetry").addEventListener("click", loadList);
        return;
    }

    invoices = result.data || [];
    billable = billableResult?.success ? billableResult.data || [] : [];

    $("siStatPending").textContent = invoices.filter((i) => i.status === "pending_approval").length;
    $("siStatVariance").textContent = invoices.filter((i) => ["pending_approval", "draft", "rejected"].includes(i.status) && i.match_status === "variance").length;
    $("siStatApproved").textContent = invoices.filter((i) => i.status === "approved").length;
    $("siStatUnbilled").textContent = canRecord() ? billable.length : "—";

    // Approvers land on what's waiting for them.
    if (isApprover() && activeTab === "all" && invoices.some((i) => i.status === "pending_approval" && i.can_approve)) {
        activeTab = "pending_approval";
    }

    renderTabs();
    renderList();
}

function renderTabs() {
    $("siTabs").innerHTML = TABS.map((t) => {
        const count = invoices.filter(t.filter).length;
        return `<button type="button" data-si-tab="${t.id}" class="${t.id === activeTab ? "active" : ""}" role="tab">${t.label}${t.id !== "all" && count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("");

    $("siTabs").querySelectorAll("[data-si-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.siTab;
        renderTabs();
        renderList();
    }));
}

function renderList() {
    const term = $("siSearch").value.trim().toLowerCase();
    const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
    const list = invoices.filter(tab.filter).filter((i) => !term
        || [i.ap_number, i.supplier_invoice_no, i.supplier_name, i.po_number, i.receipt_numbers]
            .some((v) => (v || "").toLowerCase().includes(term)));

    $("siCount").textContent = `${list.length} ${list.length === 1 ? "invoice" : "invoices"}`;

    if (!list.length) {
        $("siList").innerHTML = `<div class="si-empty">${invoices.length
            ? "No invoices here."
            : `No supplier invoices yet.${canRecord() ? " When a supplier's bill arrives, use &ldquo;+ New Supplier Invoice&rdquo; to record it against the deliveries received." : ""}`}</div>`;
        return;
    }

    $("siList").innerHTML = `
        <div class="si-table-wrap">
            <table class="si-table">
                <thead><tr><th>AP No.</th><th>Supplier Invoice</th><th>Supplier</th><th>PO / Deliveries</th><th>Match</th><th class="num">Total</th><th>Status</th></tr></thead>
                <tbody>${list.map((i) => `
                    <tr class="si-row ${i.status === "cancelled" ? "is-cancelled" : ""}" data-si-open="${i.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(i.ap_number)}</strong><span class="si-sub">by ${escapeHtml(i.created_by_name || "—")}</span></td>
                        <td>${escapeHtml(i.supplier_invoice_no)}<span class="si-sub">${formatDate(i.invoice_date)}${i.due_date ? ` · due ${formatDate(i.due_date)}` : ""}</span></td>
                        <td>${escapeHtml(i.supplier_name)}</td>
                        <td style="white-space:nowrap;">${escapeHtml(i.po_number)}<span class="si-sub">${escapeHtml(i.receipt_numbers || "—")}</span></td>
                        <td>${matchBadge(i)}</td>
                        <td class="num">${formatMoney(i.total)}</td>
                        <td><span class="si-badge ${i.status}">${STATUS_LABELS[i.status] || i.status}</span>
                            ${i.status === "pending_approval" && i.can_approve ? `<span class="si-sub">Waiting for you</span>` : ""}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("siList").querySelectorAll("[data-si-open]").forEach((row) => row.addEventListener("click", () => openInvoice(Number(row.dataset.siOpen))));
}

function matchBadge(invoice) {
    if (!invoice.match_status) return `<span class="si-match pending">Not checked</span>`;
    return invoice.match_status === "matched"
        ? `<span class="si-match matched">&#10003; Matched</span>`
        : `<span class="si-match variance">${invoice.variance_count} difference${invoice.variance_count === 1 ? "" : "s"} · ${formatMoney(invoice.variance_amount)}</span>`;
}

function showPanel(name) {
    ["list", "pick", "edit", "detail"].forEach((panel) => {
        $(`si${panel.charAt(0).toUpperCase()}${panel.slice(1)}Panel`).hidden = panel !== name;
    });
    document.querySelector(".si-page").scrollIntoView({ block: "start" });
}

async function showList() {
    clearTimeout(matchTimer);
    showPanel("list");
    await loadList();
}

/* ---------------------------------------------------------------
 * Pick the order to bill
 * ------------------------------------------------------------- */

async function showPicker() {
    const result = await fetchBillableOrders();

    if (!result?.success) {
        showToast(result?.message || "Couldn't load the orders to bill.", "error");
        return;
    }

    billable = result.data || [];
    $("siPickSearch").value = "";
    renderPicker();
    showPanel("pick");
}

function renderPicker() {
    const term = $("siPickSearch").value.trim().toLowerCase();
    const list = billable.filter((o) => !term || [o.po_number, o.supplier_name].some((v) => (v || "").toLowerCase().includes(term)));

    if (!list.length) {
        $("siPickList").innerHTML = `<div class="si-empty">${billable.length
            ? "No orders match your search."
            : "Every delivery received so far is already on a supplier invoice. Orders show up here once something is received under Pharmacy &gt; Receiving."}</div>`;
        return;
    }

    $("siPickList").innerHTML = `
        <div class="si-table-wrap">
            <table class="si-table">
                <thead><tr><th>PO No.</th><th>Supplier</th><th>Order Status</th><th class="num">Deliveries not billed</th><th class="num">Received value</th><th></th></tr></thead>
                <tbody>${list.map((o) => `
                    <tr class="si-row" data-si-bill="${o.id}">
                        <td><strong>${escapeHtml(o.po_number)}</strong><span class="si-sub">Ordered ${formatDate(o.order_date)}</span></td>
                        <td>${escapeHtml(o.supplier_name)}</td>
                        <td>${escapeHtml({ approved: "Approved", partially_received: "Partially received", received: "Fully received", closed: "Closed" }[o.status] || o.status)}</td>
                        <td class="num">${o.unbilled_count}<span class="si-sub">last ${formatDate(o.last_received)}</span></td>
                        <td class="num">${formatMoney(o.unbilled_cost)}<span class="si-sub">before VAT</span></td>
                        <td><button type="button" class="si-btn small primary">Record Invoice</button></td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("siPickList").querySelectorAll("[data-si-bill]").forEach((row) => row.addEventListener("click", () => openEditor(Number(row.dataset.siBill))));
}

/* ---------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------- */

function setupEditor() {
    $("siForm").addEventListener("submit", (event) => {
        event.preventDefault();
        save(true);
    });
    $("siSaveDraft").addEventListener("click", () => save(false));
    $("siDeleteDraft").addEventListener("click", deleteDraft);

    $("si_invoice_date").addEventListener("change", applyDueDate);
    $("si_due_date").addEventListener("input", () => { dueManual = Boolean($("si_due_date").value); });
    $("si_other_charges").addEventListener("input", () => { renderTotals(); scheduleMatch(); });

    $("siReceipts").addEventListener("change", (event) => {
        const box = event.target.closest("[data-si-receipt]");
        if (!box) return;

        const id = Number(box.dataset.siReceipt);
        if (box.checked) selected.add(id); else selected.delete(id);
        $("err-si_receipt_ids").textContent = "";

        // Add lines for anything newly delivered; keep what was typed.
        addMissingLines();
        renderLines();
    });

    $("siRefill").addEventListener("click", () => {
        lines = [];
        addMissingLines();
        renderLines();
    });

    $("siAddLine").addEventListener("change", () => {
        const id = Number($("siAddLine").value);
        $("siAddLine").value = "";
        if (!id) return;

        const item = order.items.find((i) => i.id === id);
        lines.push(lineForOrderItem(item, 0));
        renderLines();
        document.querySelector(`[data-si-line="${lines.at(-1).key}"] [data-field="quantity"]`)?.focus();
    });

    $("siLines").addEventListener("input", (event) => {
        const tr = event.target.closest("[data-si-line]");
        const field = event.target.dataset.field;
        if (!tr || !field) return;

        const line = lines.find((l) => l.key === Number(tr.dataset.siLine));
        line[field] = event.target.value;

        const index = lines.indexOf(line);
        const err = $(`err-si_item_${index}_${field}`);
        if (err) err.textContent = "";

        refreshLineAmount(line);
        renderTotals();
        scheduleMatch();
    });

    $("siLines").addEventListener("change", (event) => {
        const tr = event.target.closest("[data-si-line]");
        const field = event.target.dataset.field;
        if (!tr || (field !== "vat_type" && field !== "order_unit")) return;

        const line = lines.find((l) => l.key === Number(tr.dataset.siLine));
        line[field] = event.target.value;
        renderLines();
    });

    $("siLines").addEventListener("click", (event) => {
        const remove = event.target.closest("[data-si-remove]");
        if (!remove) return;

        lines = lines.filter((l) => l.key !== Number(remove.dataset.siRemove));
        renderLines();
    });
}

/** Open the editor for a new invoice on `orderId`, or for an existing `invoice`. */
async function openEditor(orderId, invoice = null) {
    const result = await fetchOrderForBilling(orderId, invoice?.id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the purchase order.", "error");
        return;
    }

    order = result.data;
    editing = invoice;
    match = null;
    dueManual = Boolean(invoice?.due_date);

    if (!invoice && !order.receipts.length) {
        showToast(`Everything received on ${order.po_number} is already billed.`, "error");
        return;
    }

    clearErrors();
    $("siForm").reset();

    $("siEditTitle").textContent = invoice ? `Edit ${invoice.ap_number}` : `New Supplier Invoice — ${order.po_number}`;
    $("siEditSub").textContent = invoice?.status === "rejected"
        ? `Rejected: “${invoice.rejection_reason || ""}”. Correct it and submit again.`
        : `${order.supplier_name} — enter the invoice exactly as the supplier wrote it. Differences from the order and deliveries are flagged for the approver.`;

    $("si_supplier_invoice_no").value = invoice?.supplier_invoice_no || "";
    $("si_invoice_date").value = invoice?.invoice_date || todayISO();
    $("si_invoice_date").max = todayISO();
    $("si_due_date").value = invoice?.due_date || "";
    $("si_notes").value = invoice?.notes || "";
    $("si_other_charges").value = invoice ? (invoice.other_charges || "") : (chargesLeft() > 0 ? chargesLeft().toFixed(2) : "");
    $("siDeleteDraft").hidden = invoice?.status !== "draft";

    $("siTermsHint").textContent = order.payment_terms ? `Order terms: ${order.payment_terms}` : "";
    applyDueDate();

    $("siOrderInfo").innerHTML = [
        ["Purchase Order", `<strong>${escapeHtml(order.po_number)}</strong>`],
        ["Supplier", escapeHtml(order.supplier_name)],
        ["Ordered", formatDate(order.order_date)],
        ["Order Total", `${formatMoney(order.total)}${order.vat_rate > 0 ? `<span class="si-sub">incl. VAT</span>` : `<span class="si-sub">VAT not on the order</span>`}`]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

    if (invoice) {
        selected = new Set(invoice.receipts.map((r) => r.id));
        lines = invoice.items.map((i) => ({
            key: ++lineKey,
            purchase_order_item_id: i.purchase_order_item_id,
            drug_id: i.drug_id,
            order_unit: i.order_unit,
            quantity: String(i.quantity),
            unit_price: String(i.unit_price),
            discount_amount: i.discount_amount ? String(i.discount_amount) : "",
            vat_type: i.vat_type
        }));
    } else {
        selected = new Set(order.receipts.map((r) => r.id));
        lines = [];
        addMissingLines();
    }

    renderReceipts();
    renderLines();
    showPanel("edit");
    $("si_supplier_invoice_no").focus();
}

function chargesLeft() {
    return Math.max(0, Math.round(((order?.shipping_fee || 0) - (order?.other_charges_billed || 0)) * 100) / 100);
}

/** Suggest a due date from the order's payment terms ("30 days", "Net 60"...). */
function applyDueDate() {
    if (dueManual || !order) return;

    const days = Number(String(order.payment_terms || "").match(/(\d+)\s*(?:days?|d\b)|net\s*(\d+)/i)?.slice(1).find(Boolean));
    const invoiceDate = $("si_invoice_date").value;

    if (!days || !invoiceDate) return;

    const due = new Date(`${invoiceDate}T00:00:00`);
    due.setDate(due.getDate() + days);
    $("si_due_date").value = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

function renderReceipts() {
    $("siReceipts").innerHTML = order.receipts.map((r) => `
        <label class="si-receipt">
            <input type="checkbox" data-si-receipt="${r.id}" ${selected.has(r.id) ? "checked" : ""}>
            <span class="grow">
                <strong>${escapeHtml(r.gr_number)}</strong> &middot; ${formatDate(r.received_date)} &middot; ${escapeHtml(r.warehouse_name || "")}
                <span class="si-sub">${escapeHtml([r.delivery_receipt_no ? `DR ${r.delivery_receipt_no}` : null, r.invoice_no ? `SI ${r.invoice_no} noted at receiving` : null].filter(Boolean).join(" · ") || "No DR / invoice no. noted")}
                    &middot; ${r.rows.length} item${r.rows.length === 1 ? "" : "s"}</span>
            </span>
            <span class="num" style="white-space:nowrap;">${formatMoney(r.total_cost)}<span class="si-sub" style="text-align:right;">before VAT</span></span>
        </label>`).join("") || `<div class="si-empty">No deliveries left to bill on this order.</div>`;
}

/** Received quantities (dispensing units) per line key in the chosen deliveries. */
function receivedByKey() {
    const map = new Map();

    order.receipts.filter((r) => selected.has(r.id)).forEach((r) => r.rows.forEach((row) => {
        const key = row.purchase_order_item_id ? `L${row.purchase_order_item_id}` : `D${row.drug_id}`;
        const entry = map.get(key) || { base: 0, cost: 0, row };
        entry.base += row.base_quantity;
        entry.cost += (row.unit_cost || 0) * row.base_quantity;
        map.set(key, entry);
    }));

    return map;
}

function keyOf(line) {
    return line.purchase_order_item_id ? `L${line.purchase_order_item_id}` : `D${line.drug_id}`;
}

/** A line for an order item, priced as on the order (discount pro-rated). */
function lineForOrderItem(item, qty) {
    const discount = item.quantity > 0 ? round(item.discount_amount * qty / item.quantity, 2) : 0;

    return {
        key: ++lineKey,
        purchase_order_item_id: item.id,
        drug_id: item.drug_id,
        order_unit: item.order_unit,
        quantity: qty ? formatInput(qty) : "",
        unit_price: String(item.unit_price),
        discount_amount: discount > 0 ? discount.toFixed(2) : "",
        vat_type: order.vat_rate > 0 ? item.vat_type : "vatable"
    };
}

/** Lines for whatever the chosen deliveries received that isn't on the invoice yet. */
function addMissingLines() {
    const have = new Set(lines.map(keyOf));

    receivedByKey().forEach((entry, key) => {
        if (have.has(key)) return;

        const row = entry.row;

        if (row.purchase_order_item_id) {
            const item = order.items.find((i) => i.id === row.purchase_order_item_id);
            if (!item) return;
            const per = item.order_unit === "package" && item.units_per_package ? item.units_per_package : 1;
            lines.push(lineForOrderItem(item, round(entry.base / per, 3)));
            return;
        }

        // Not on the order: bill in the unit it was received in, at the cost recorded then.
        const unit = row.order_unit === "package" && row.package_quantity ? "package" : "unit";
        const per = unit === "package" ? row.package_quantity : 1;
        const costPerBase = entry.base > 0 ? entry.cost / entry.base : 0;

        lines.push({
            key: ++lineKey,
            purchase_order_item_id: null,
            drug_id: row.drug_id,
            order_unit: unit,
            quantity: formatInput(round(entry.base / per, 3)),
            unit_price: String(round(costPerBase * per, 4)),
            discount_amount: "",
            vat_type: "vatable"
        });
    });
}

/** Name, units and package size for a line, whether it's on the order or not. */
function lineInfo(line) {
    if (line.purchase_order_item_id) {
        const item = order.items.find((i) => i.id === line.purchase_order_item_id);
        return {
            name: item?.drug_name || "Order line",
            lineNo: item?.line_no,
            unit: item?.order_unit === "package" ? (item.package_unit_name || "package") : (item?.unit_name || "unit"),
            per: item?.order_unit === "package" && item.units_per_package ? item.units_per_package : 1,
            item
        };
    }

    const row = order.receipts.flatMap((r) => r.rows).find((r) => !r.purchase_order_item_id && r.drug_id === line.drug_id);
    const isPackage = line.order_unit === "package" && row?.package_quantity;

    return {
        name: row?.drug_name || "Item",
        unit: isPackage ? (row.package_unit_name || "package") : (row?.unit_name || "unit"),
        per: isPackage ? row.package_quantity : 1,
        row,
        extra: true
    };
}

function lineAmounts(line) {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    const gross = round(qty * price, 2);
    const discount = Math.min(Number(line.discount_amount) || 0, gross);
    const total = round(gross - discount, 2);
    const vat = line.vat_type === "vatable" ? round(total * VAT_PERCENT / 100, 2) : 0;

    return { gross, discount, total, vat };
}

function renderLines() {
    const received = receivedByKey();

    // Order lines that can still be added (not on the invoice yet).
    const onInvoice = new Set(lines.map(keyOf));
    const addable = order.items.filter((i) => !onInvoice.has(`L${i.id}`));
    $("siAddLine").innerHTML = `<option value="">+ Add an order line not in these deliveries...</option>` +
        addable.map((i) => `<option value="${i.id}">${i.line_no}. ${escapeHtml(i.drug_name)}</option>`).join("");
    $("siAddLine").disabled = !addable.length;

    if (!lines.length) {
        $("siLines").innerHTML = `<div class="si-empty">${selected.size
            ? "No lines. Use &ldquo;Refill from deliveries&rdquo; or add an order line below."
            : "Choose the deliveries this invoice bills above."}</div>`;
        renderTotals();
        scheduleMatch();
        return;
    }

    $("siLines").innerHTML = `
        <div class="si-lines-wrap">
            <table class="si-lines">
                <thead><tr>
                    <th>Item</th><th class="num">Received</th><th class="col-qty">Qty Billed</th><th class="col-price">Price / Unit (&#8369;)</th>
                    <th class="col-disc">Discount (&#8369;)</th><th class="col-vat">VAT</th><th class="col-amt num">Amount</th><th class="col-match">Match</th><th style="width:34px;"></th>
                </tr></thead>
                <tbody>${lines.map((line, index) => {
                    const info = lineInfo(line);
                    const got = received.get(keyOf(line));
                    const receivedQty = got ? round(got.base / info.per, 3) : 0;
                    const hasPackage = info.extra && info.row?.package_quantity && info.row?.package_unit_name;

                    return `
                    <tr data-si-line="${line.key}" class="${info.extra ? "is-extra" : ""}">
                        <td style="min-width:220px;">
                            <div class="si-item-name">${info.lineNo ? `${info.lineNo}. ` : ""}${escapeHtml(info.name)}</div>
                            ${info.extra ? `<span class="si-chip extra">Not on PO</span>` : ""}
                            ${info.item ? `<span class="si-chip">Ordered ${formatQty(info.item.quantity)} at ${formatMoney(info.item.unit_price, 4)}</span>` : ""}
                            ${hasPackage ? `
                                <select data-field="order_unit" style="margin-top:6px;width:auto;height:30px;" aria-label="Unit">
                                    <option value="unit" ${line.order_unit === "unit" ? "selected" : ""}>${escapeHtml(capitalize(info.row.unit_name || "unit"))}</option>
                                    <option value="package" ${line.order_unit === "package" ? "selected" : ""}>${escapeHtml(capitalize(info.row.package_unit_name))} of ${formatQty(info.row.package_quantity)}</option>
                                </select>` : ""}
                        </td>
                        <td class="num">${formatQty(receivedQty)}<span class="si-sub">${escapeHtml(info.unit)}</span></td>
                        <td class="col-qty">
                            <input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(line.quantity)}" aria-label="Quantity billed">
                            <span class="si-sub" style="text-align:right;">${escapeHtml(info.unit)}</span>
                            <span class="form-error" id="err-si_item_${index}_quantity"></span>
                        </td>
                        <td class="col-price">
                            <input type="number" min="0" step="any" data-field="unit_price" value="${escapeHtml(line.unit_price)}" placeholder="0.00" aria-label="Price per unit before VAT">
                            <span class="form-error" id="err-si_item_${index}_unit_price"></span>
                        </td>
                        <td class="col-disc">
                            <input type="number" min="0" step="0.01" data-field="discount_amount" value="${escapeHtml(line.discount_amount)}" placeholder="0.00" aria-label="Discount">
                            <span class="form-error" id="err-si_item_${index}_discount_amount"></span>
                        </td>
                        <td class="col-vat">
                            <select data-field="vat_type" aria-label="VAT">
                                ${Object.entries(VAT_LABELS).map(([value, label]) => `<option value="${value}" ${line.vat_type === value ? "selected" : ""}>${label}</option>`).join("")}
                            </select>
                            <span class="form-error" id="err-si_item_${index}_vat_type"></span>
                        </td>
                        <td class="col-amt num"><strong data-cell="amount"></strong><span class="si-sub" data-cell="vat"></span></td>
                        <td class="col-match" data-cell="match"><span class="si-match pending">Checking...</span></td>
                        <td><button type="button" class="si-remove" data-si-remove="${line.key}" title="Remove this line" aria-label="Remove">&times;</button></td>
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
        </div>`;

    lines.forEach(refreshLineAmount);
    renderTotals();
    scheduleMatch();
}

function refreshLineAmount(line) {
    const row = document.querySelector(`[data-si-line="${line.key}"]`);
    if (!row) return;

    const { total, vat } = lineAmounts(line);
    row.querySelector('[data-cell="amount"]').textContent = formatMoney(total);
    row.querySelector('[data-cell="vat"]').textContent = vat > 0 ? `+ ${formatMoney(vat)} VAT` : "";
}

function renderTotals() {
    let subtotal = 0;
    let discounts = 0;
    let vat = 0;

    lines.forEach((line) => {
        const a = lineAmounts(line);
        subtotal += a.gross;
        discounts += a.discount;
        vat += a.vat;
    });

    const charges = Math.max(0, Number($("si_other_charges").value) || 0);

    $("siSubtotal").textContent = formatMoney(subtotal);
    $("siDiscounts").textContent = discounts > 0 ? `− ${formatMoney(discounts)}` : formatMoney(0);
    $("siVat").textContent = formatMoney(round(vat, 2));
    $("siTotal").textContent = formatMoney(round(subtotal - discounts + vat + charges, 2));
    $("siChargesHint").textContent = order
        ? `The order allows ${formatMoney(chargesLeft())} in delivery / other charges${order.other_charges_billed ? ` (after ${formatMoney(order.other_charges_billed)} already billed)` : ""}.`
        : "";
}

/* ---- Live 3-way match (the server decides; this just asks it) ---- */

function scheduleMatch() {
    clearTimeout(matchTimer);
    $("siMatchSummary").className = "si-summary";
    $("siMatchSummary").innerHTML = "Checking against the order and deliveries...";
    matchTimer = setTimeout(runMatch, 450);
}

async function runMatch() {
    if (!order || $("siEditPanel").hidden) return;

    if (!selected.size || !lines.length) {
        $("siMatchSummary").innerHTML = "Choose the deliveries and lines billed to check the invoice.";
        return;
    }

    const seq = ++matchSeq;
    const result = await checkInvoiceMatch({ ...payload(false), id: editing?.id || undefined });

    if (seq !== matchSeq) return; // a newer check is on its way

    if (!result?.success) {
        match = null;
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : {};
        showServerErrors(errors);
        $("siMatchSummary").innerHTML = `<strong>Can't check the match yet</strong>${escapeHtml(
            Object.keys(errors).length ? "Fix the highlighted fields first." : (result?.message || "The server didn't respond."))}`;
        document.querySelectorAll('[data-cell="match"]').forEach((cell) => { cell.innerHTML = "—"; });
        return;
    }

    match = result.data;
    renderMatch();
}

function renderMatch() {
    match.lines.forEach((m, index) => {
        const line = lines[index];
        const row = line && document.querySelector(`[data-si-line="${line.key}"]`);
        if (!row) return;

        const flagged = ["qty_variance", "price_variance", "vat_mismatch"].includes(m.match_status);
        row.classList.toggle("is-flagged", flagged);
        row.classList.toggle("is-missing", m.match_status === "not_received");
        row.querySelector('[data-cell="match"]').innerHTML = `
            <span class="si-match ${m.match_status}">${m.match_status === "matched" ? "&#10003; " : ""}${MATCH_LABELS[m.match_status] || m.match_status}</span>
            ${m.variance_amount > 0 ? `<span class="si-match-note"><strong>${formatMoney(m.variance_amount)}</strong> over</span>` : ""}
            ${m.match_notes ? `<span class="si-match-note">${escapeHtml(m.match_notes)}</span>` : ""}`;
    });

    const ok = match.match_status === "matched";
    $("siMatchSummary").className = `si-summary ${match.match_status}`;
    $("siMatchSummary").innerHTML = `
        <strong>${ok ? "&#10003; Matches the order and deliveries" : `${match.variance_count} difference${match.variance_count === 1 ? "" : "s"} · ${formatMoney(match.variance_amount)} more than expected`}</strong>
        ${ok
            ? "Quantities are within what was received, and prices are within the order's (allowing " + `${order.price_tolerance_percent}%).`
            : "You can still submit it. The approver must give a reason to accept the difference, or reject it so the supplier can correct the invoice."}
        ${match.notes.length ? `<ul>${match.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}`;
}

/* ---- Saving ---- */

function payload(submit) {
    return {
        purchase_order_id: order.id,
        supplier_invoice_no: $("si_supplier_invoice_no").value.trim(),
        invoice_date: $("si_invoice_date").value,
        due_date: $("si_due_date").value,
        notes: $("si_notes").value.trim(),
        other_charges: $("si_other_charges").value,
        receipt_ids: [...selected],
        submit,
        items: lines.map((l) => ({
            ...(l.purchase_order_item_id
                ? { purchase_order_item_id: l.purchase_order_item_id }
                : { drug_id: l.drug_id, order_unit: l.order_unit }),
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_amount: l.discount_amount,
            vat_type: l.vat_type
        }))
    };
}

async function save(submit) {
    clearErrors();

    if (submit) {
        if (!$("si_supplier_invoice_no").value.trim()) {
            $("err-si_supplier_invoice_no").textContent = "Enter the invoice number printed on the supplier's invoice.";
            showEditorAlert("Please fix the highlighted fields.");
            return;
        }

        if (!selected.size || !lines.length) {
            showEditorAlert(!selected.size ? "Choose the deliveries this invoice bills." : "Add the lines billed on the invoice.");
            return;
        }

        // Make sure the summary reflects exactly what's being sent.
        clearTimeout(matchTimer);
        await runMatch();
        if (!match) {
            showEditorAlert("Please fix the highlighted fields.");
            return;
        }

        if (!(await confirmSubmit())) return;
    }

    $("siSubmit").disabled = true;
    $("siSaveDraft").disabled = true;
    const result = editing ? await updateSupplierInvoice(editing.id, payload(submit)) : await createSupplierInvoice(payload(submit));
    $("siSubmit").disabled = false;
    $("siSaveDraft").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;

        if (errors) {
            showServerErrors(errors);
            showEditorAlert("Nothing was saved. Please fix the highlighted fields.");
        } else {
            showEditorAlert(result?.message || "Failed to save the supplier invoice.");
        }
        return;
    }

    showToast(result.message, "success");

    if (submit) {
        await openInvoice(result.data.id);
        return;
    }

    // Keep editing the saved draft, so the next save updates it.
    const saved = await fetchSupplierInvoice(result.data.id);
    if (saved?.success) {
        editing = saved.data;
        $("siEditTitle").textContent = `Edit ${editing.ap_number}`;
        $("siDeleteDraft").hidden = editing.status !== "draft";
    }
}

function confirmSubmit() {
    const ok = match.match_status === "matched";

    return openDialog({
        title: "Submit for approval?",
        body: `
            <dl class="si-dialog-summary">
                <dt>Supplier invoice</dt><dd>${escapeHtml($("si_supplier_invoice_no").value.trim())}</dd>
                <dt>Supplier</dt><dd>${escapeHtml(order.supplier_name)}</dd>
                <dt>Purchase order</dt><dd>${escapeHtml(order.po_number)}</dd>
                <dt>Deliveries</dt><dd>${escapeHtml(order.receipts.filter((r) => selected.has(r.id)).map((r) => r.gr_number).join(", "))}</dd>
                <dt>Invoice total</dt><dd>${formatMoney(match.total)}</dd>
                <dt>Match</dt><dd>${ok ? "&#10003; Matches" : `${match.variance_count} difference${match.variance_count === 1 ? "" : "s"} · ${formatMoney(match.variance_amount)}`}</dd>
            </dl>
            <p>${ok
                ? "An administrator or accountant (not you) approves it for payment."
                : "The differences are shown to the approver, who has to give a reason to accept them or send the invoice back."}</p>`,
        okLabel: "Submit for Approval",
        okClass: "primary",
        onConfirm: async () => ({ success: true })
    });
}

async function deleteDraft() {
    if (!editing) return;

    const done = await openDialog({
        title: `Delete ${editing.ap_number}?`,
        body: `<p>This draft is removed, and its deliveries can be billed on another invoice. This can't be undone.</p>`,
        okLabel: "Delete Draft",
        okClass: "danger solid",
        onConfirm: () => deleteSupplierInvoice(editing.id)
    });

    if (done) await showList();
}

function showServerErrors(errors) {
    Object.entries(errors).forEach(([name, message]) => {
        const lineMatch = name.match(/^items\.(\d+)\.(\w+)$/);
        const el = lineMatch ? $(`err-si_item_${lineMatch[1]}_${lineMatch[2]}`) : $(`err-si_${name}`);
        if (el) el.textContent = message;
    });
}

function clearErrors() {
    $("siEditAlert").innerHTML = "";
    document.querySelectorAll("#siForm .form-error").forEach((el) => { el.textContent = ""; });
}

function showEditorAlert(message) {
    $("siEditAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $("siEditAlert").scrollIntoView({ block: "nearest" });
}

/* ---------------------------------------------------------------
 * Detail
 * ------------------------------------------------------------- */

async function openInvoice(id) {
    const result = await fetchSupplierInvoice(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the invoice.", "error");
        return;
    }

    showDetail(result.data);
}

function showDetail(inv) {
    const variance = inv.match_status === "variance";
    const info = [
        ["Supplier", escapeHtml(inv.supplier_name)],
        ["Supplier Invoice No.", `<strong>${escapeHtml(inv.supplier_invoice_no)}</strong>`],
        ["Invoice Date", formatDate(inv.invoice_date)],
        ["Due Date", inv.due_date ? formatDate(inv.due_date) : "—"],
        ["Purchase Order", `${escapeHtml(inv.po_number)}${inv.payment_terms ? `<span class="si-sub">Terms: ${escapeHtml(inv.payment_terms)}</span>` : ""}`],
        ["Deliveries", inv.receipts.map((r) => `${escapeHtml(r.gr_number)}<span class="si-sub">${formatDate(r.received_date)}</span>`).join("") || "—"],
        ["Recorded by", escapeHtml(inv.created_by_name || "—")],
        ["Notes", escapeHtml(inv.notes || "—")]
    ];

    $("siDetail").innerHTML = `
        ${statusBanner(inv)}
        <div class="si-card">
            <div class="si-detail-head">
                <h2>${escapeHtml(inv.ap_number)} <span class="si-badge ${inv.status}">${STATUS_LABELS[inv.status]}</span> ${matchBadge(inv)}</h2>
                <div class="si-actions">
                    <button type="button" class="si-btn" id="siPrintBtn">Print</button>
                    ${inv.can_edit && canRecord() ? `<button type="button" class="si-btn" id="siEditBtn">${inv.status === "rejected" ? "Correct & Resubmit" : "Edit"}</button>` : ""}
                    ${inv.can_cancel ? `<button type="button" class="si-btn danger" id="siCancelBtn">Cancel Invoice</button>` : ""}
                </div>
            </div>
            <dl class="si-info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="si-card">
            <div class="si-card-title">3-Way Match <span style="text-transform:none;font-weight:500;">ordered &middot; received &middot; billed</span></div>
            <div class="si-lines-wrap">
                <table class="si-lines" style="min-width:900px;">
                    <thead><tr><th>Item</th><th class="num">Received</th><th class="num">Billed</th><th class="num">Expected Price</th><th class="num">Billed Price</th><th>VAT</th><th class="num">Amount</th><th>Match</th></tr></thead>
                    <tbody>${inv.items.map((i) => {
                        const unit = i.order_unit === "package" ? (i.package_unit_name || "package") : (i.unit_name || "unit");
                        const net = i.quantity > 0 ? i.line_total / i.quantity : 0;
                        return `
                        <tr class="${["qty_variance", "price_variance", "vat_mismatch"].includes(i.match_status) ? "is-flagged" : i.match_status === "not_received" ? "is-missing" : ""}">
                            <td><span class="si-item-name">${i.po_line_no ? `${i.po_line_no}. ` : ""}${escapeHtml(i.drug_name)}</span>
                                ${i.on_order ? "" : `<span class="si-chip extra">Not on PO</span>`}</td>
                            <td class="num">${formatQty(i.received_quantity)}<span class="si-sub">${escapeHtml(unit)}</span></td>
                            <td class="num">${formatQty(i.quantity)}<span class="si-sub">${escapeHtml(unit)}</span></td>
                            <td class="num">${i.expected_unit_price != null ? formatMoney(i.expected_unit_price, 4) : "—"}<span class="si-sub">net, before VAT</span></td>
                            <td class="num">${formatMoney(net, 4)}<span class="si-sub">${i.discount_amount ? `${formatMoney(i.unit_price, 4)} less ${formatMoney(i.discount_amount)}` : "net"}</span></td>
                            <td>${VAT_LABELS[i.vat_type] || i.vat_type}${i.expected_vat_type && i.expected_vat_type !== i.vat_type ? `<span class="si-sub">order: ${VAT_LABELS[i.expected_vat_type]}</span>` : ""}</td>
                            <td class="num">${formatMoney(i.line_total)}${i.vat_amount ? `<span class="si-sub">+ ${formatMoney(i.vat_amount)} VAT</span>` : ""}</td>
                            <td style="min-width:200px;"><span class="si-match ${i.match_status}">${i.match_status === "matched" ? "&#10003; " : ""}${MATCH_LABELS[i.match_status] || "—"}</span>
                                ${i.variance_amount > 0 ? `<span class="si-match-note"><strong>${formatMoney(i.variance_amount)}</strong> over</span>` : ""}
                                ${i.match_notes ? `<span class="si-match-note">${escapeHtml(i.match_notes)}</span>` : ""}</td>
                        </tr>`;
                    }).join("")}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="si-bottom">
            <div class="si-summary ${inv.match_status || ""}">
                <strong>${variance ? `${inv.variance_count} difference${inv.variance_count === 1 ? "" : "s"} · ${formatMoney(inv.variance_amount)} more than expected` : "&#10003; Matches the order and deliveries"}</strong>
                ${inv.match_notes.length ? `<ul>${inv.match_notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
                ${inv.approval_notes ? `<p style="margin:8px 0 0;"><strong style="display:inline;font-size:13px;">Approver's note:</strong> ${escapeHtml(inv.approval_notes)}</p>` : ""}
            </div>
            <div class="si-card" style="margin:0;">
                <div class="si-totals">
                    <span class="label">Subtotal</span><span class="val">${formatMoney(inv.subtotal)}</span>
                    <span class="label">Discounts</span><span class="val">${inv.discount_total ? `− ${formatMoney(inv.discount_total)}` : formatMoney(0)}</span>
                    <span class="label">VAT (${formatQty(inv.vat_rate)}%)</span><span class="val">${formatMoney(inv.vat_amount)}</span>
                    <span class="label">Delivery / Other Charges</span><span class="val">${formatMoney(inv.other_charges)}</span>
                    <span class="label grand">Invoice Total</span><span class="val grand">${formatMoney(inv.total)}</span>
                </div>
            </div>
        </div>

        <div class="si-card" style="margin-top:14px;">
            <div class="si-card-title">History</div>
            <ol class="si-timeline">${(inv.history || []).map((h) => `
                <li class="${h.action}">
                    <strong>${HISTORY_LABELS[h.action] || escapeHtml(h.action)}</strong>${h.user_name ? ` by ${escapeHtml(h.user_name)}` : ""}
                    <span class="when">${escapeHtml(formatDateTime(h.created_at))}</span>
                    ${h.notes ? `<span class="note">&ldquo;${escapeHtml(h.notes)}&rdquo;</span>` : ""}
                </li>`).join("") || "<li>No history recorded.</li>"}
            </ol>
        </div>`;

    $("siPrintBtn").addEventListener("click", () => printInvoice(inv));
    $("siEditBtn")?.addEventListener("click", () => openEditor(inv.purchase_order_id, inv));
    $("siCancelBtn")?.addEventListener("click", () => runAction(inv, "cancel"));
    $("siApproveBtn")?.addEventListener("click", () => runAction(inv, "approve"));
    $("siRejectBtn")?.addEventListener("click", () => runAction(inv, "reject"));

    showPanel("detail");
}

function statusBanner(inv) {
    if (inv.status === "pending_approval") {
        return `
            <div class="si-banner pending_approval">
                <div>
                    <strong>Waiting for approval${inv.match_status === "variance" ? " — differences to review" : ""}</strong>
                    <span>${inv.can_approve
                        ? (inv.match_status === "variance"
                            ? "Check the flagged lines. Approve with a reason if the difference is acceptable, or reject so the supplier can correct the invoice."
                            : "The invoice matches the order and what was received.")
                        : escapeHtml(inv.approval_blocker || "An administrator or accountant approves it.")}</span>
                </div>
                ${inv.can_approve ? `
                <div class="si-actions">
                    <button type="button" class="si-btn" id="siRejectBtn">Reject</button>
                    <button type="button" class="si-btn success" id="siApproveBtn">Approve for Payment</button>
                </div>` : ""}
            </div>`;
    }

    const text = {
        draft: ["Draft", "Not submitted yet. It isn't counted as owed until it's approved."],
        approved: ["Approved for payment", `${formatDateTime(inv.approved_at)}${inv.approved_by_name ? ` by ${escapeHtml(inv.approved_by_name)}` : ""}.`],
        rejected: ["Rejected", `${escapeHtml(inv.rejected_by_name || "")}: “${escapeHtml(inv.rejection_reason || "")}”. Correct it and submit again, or cancel it.`],
        cancelled: ["Cancelled", `“${escapeHtml(inv.cancel_reason || "")}”. Its deliveries can be billed on another invoice.`]
    }[inv.status];

    return text ? `<div class="si-banner ${inv.status}"><div><strong>${text[0]}</strong><span>${text[1]}</span></div></div>` : "";
}

/** Approve / reject / cancel through the in-app dialog. */
async function runAction(inv, action) {
    const variance = inv.match_status === "variance";
    const config = {
        approve: {
            title: `Approve ${inv.ap_number} for payment?`,
            label: variance ? "Reason for accepting the difference" : "Notes (optional)",
            placeholder: variance ? "e.g. Price increase confirmed by supplier letter dated ..." : "",
            required: variance,
            requiredMessage: "Explain why the difference is accepted.",
            okLabel: "Approve for Payment",
            okClass: "success"
        },
        reject: {
            title: `Reject ${inv.ap_number}?`,
            label: "What has to be fixed",
            placeholder: "e.g. Billed price is higher than the PO. Ask the supplier for a corrected invoice.",
            required: true,
            requiredMessage: "Say what has to be fixed.",
            okLabel: "Reject",
            okClass: "danger solid"
        },
        cancel: {
            title: `Cancel ${inv.ap_number}?`,
            label: "Reason",
            placeholder: "e.g. Supplier replaced it with invoice no. ...",
            required: true,
            requiredMessage: "Say why this invoice is being cancelled.",
            okLabel: "Cancel Invoice",
            okClass: "danger solid"
        }
    }[action];

    const done = await openDialog({
        ...config,
        body: `
            <dl class="si-dialog-summary">
                <dt>Supplier</dt><dd>${escapeHtml(inv.supplier_name)}</dd>
                <dt>Supplier invoice</dt><dd>${escapeHtml(inv.supplier_invoice_no)}</dd>
                <dt>Total</dt><dd>${formatMoney(inv.total)}</dd>
                <dt>Match</dt><dd>${variance ? `${inv.variance_count} difference${inv.variance_count === 1 ? "" : "s"} · ${formatMoney(inv.variance_amount)}` : "&#10003; Matches"}</dd>
            </dl>
            ${action === "cancel" ? `<p>Its deliveries become free to bill on another invoice. The record stays, marked cancelled.</p>` : ""}`,
        withText: true,
        onConfirm: (text) => supplierInvoiceAction(action, inv.id, text)
    });

    if (done) await openInvoice(inv.id);
}

/**
 * In-app confirm dialog (never the browser's). onConfirm(text) returns an
 * API result; the dialog stays open on failure to show the error.
 * Resolves true when confirmed and successful, false when dismissed.
 */
function openDialog({ title, body, label = "", placeholder = "", required = false, requiredMessage = "", okLabel = "Confirm", okClass = "primary", withText = false, onConfirm }) {
    return new Promise((resolve) => {
        const overlay = $("siDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("siDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("siDialogTitle").textContent = title;
        $("siDialogBody").innerHTML = body;
        $("siDialogAlert").innerHTML = "";
        $("siDialogField").hidden = !withText;
        $("siDialogLabel").innerHTML = `${escapeHtml(label)}${required ? `<span style="color:#dc2626;">*</span>` : ""}`;
        $("siDialogText").value = "";
        $("siDialogText").placeholder = placeholder;
        $("err-si_dialog").textContent = "";
        $("siDialogOk").textContent = okLabel;
        $("siDialogOk").className = `si-btn ${okClass}`;

        $("siDialogOk").onclick = async () => {
            const text = $("siDialogText").value.trim();
            $("err-si_dialog").textContent = "";

            if (withText && required && !text) {
                $("err-si_dialog").textContent = requiredMessage;
                $("siDialogText").focus();
                return;
            }

            $("siDialogOk").disabled = true;
            const result = await onConfirm(text);
            $("siDialogOk").disabled = false;

            if (!result?.success) {
                const fieldError = result?.errors && Object.values(result.errors)[0];
                if (fieldError) $("err-si_dialog").textContent = fieldError;
                $("siDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Something went wrong.")}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("siDialogClose").onclick = () => finish(false);
        $("siDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        (withText ? $("siDialogText") : $("siDialogOk")).focus();
    });
}

/* ---------------------------------------------------------------
 * Printout (accounts payable voucher with the match)
 * ------------------------------------------------------------- */

function printInvoice(inv) {
    const win = window.open("", "_blank", "width=900,height=1000");

    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    const buyer = inv.buyer || {};

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(inv.ap_number)} - Supplier Invoice</title>
<style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
    .org { font-size: 18px; font-weight: 700; }
    .muted { color: #4b5563; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .title table td { padding: 1px 0 1px 12px; text-align: right; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin: 16px 0; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; }
    .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; letter-spacing: .4px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #d1d5db; }
    table.items td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .flag { font-weight: 700; color: #b45309; }
    .totals { margin-left: auto; margin-top: 10px; width: 300px; border-collapse: collapse; }
    .totals td { padding: 4px 6px; }
    .totals .grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
    .box { margin-top: 14px; padding: 8px 10px; border: 1px solid #d1d5db; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
    @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="head">
    <div>
        <div class="org">${escapeHtml(buyer.name || "")}</div>
        <div class="muted">${escapeHtml(buyer.address || "")}</div>
    </div>
    <div class="title">
        <h1>SUPPLIER INVOICE</h1>
        <div class="muted">Accounts Payable &middot; 3-Way Match</div>
        <table>
            <tr><td class="muted">AP No.</td><td><strong>${escapeHtml(inv.ap_number)}</strong></td></tr>
            <tr><td class="muted">Status</td><td>${STATUS_LABELS[inv.status]}</td></tr>
        </table>
    </div>
</div>

<div class="meta">
    <div><span>Supplier</span>${escapeHtml(inv.supplier_name)}${inv.supplier_tin ? `<br>TIN ${escapeHtml(inv.supplier_tin)}` : ""}</div>
    <div><span>Supplier Invoice No.</span>${escapeHtml(inv.supplier_invoice_no)}<br>${formatDate(inv.invoice_date)}</div>
    <div><span>Purchase Order</span>${escapeHtml(inv.po_number)}<br>${escapeHtml(inv.payment_terms || "")}</div>
    <div><span>Deliveries (RR)</span>${escapeHtml(inv.receipts.map((r) => r.gr_number).join(", "))}</div>
</div>

<table class="items">
    <thead><tr><th>Item</th><th class="num">Received</th><th class="num">Billed</th><th class="num">Expected Price</th><th class="num">Billed Price</th><th>VAT</th><th class="num">Amount</th><th>Match</th></tr></thead>
    <tbody>${inv.items.map((i) => {
        const unit = i.order_unit === "package" ? (i.package_unit_name || "package") : (i.unit_name || "unit");
        return `
        <tr>
            <td>${escapeHtml(i.drug_name)}${i.on_order ? "" : " <span class=\"flag\">(not on PO)</span>"}</td>
            <td class="num">${formatQty(i.received_quantity)} ${escapeHtml(unit)}</td>
            <td class="num">${formatQty(i.quantity)} ${escapeHtml(unit)}</td>
            <td class="num">${i.expected_unit_price != null ? formatMoney(i.expected_unit_price, 4) : ""}</td>
            <td class="num">${formatMoney(i.quantity > 0 ? i.line_total / i.quantity : 0, 4)}</td>
            <td>${VAT_LABELS[i.vat_type] || ""}</td>
            <td class="num">${formatMoney(i.line_total)}</td>
            <td class="${i.match_status === "matched" || i.match_status === "under_billed" ? "" : "flag"}">${MATCH_LABELS[i.match_status] || ""}${i.variance_amount > 0 ? ` (${formatMoney(i.variance_amount)})` : ""}</td>
        </tr>`;
    }).join("")}
    </tbody>
</table>

<table class="totals">
    <tr><td>Subtotal</td><td class="num">${formatMoney(inv.subtotal)}</td></tr>
    ${inv.discount_total ? `<tr><td>Less: Discounts</td><td class="num">(${formatMoney(inv.discount_total)})</td></tr>` : ""}
    <tr><td>VAT (${formatQty(inv.vat_rate)}%)</td><td class="num">${formatMoney(inv.vat_amount)}</td></tr>
    ${inv.other_charges ? `<tr><td>Delivery / Other Charges</td><td class="num">${formatMoney(inv.other_charges)}</td></tr>` : ""}
    <tr class="grand"><td>TOTAL</td><td class="num">${formatMoney(inv.total)}</td></tr>
</table>

<div class="box">
    <strong>Match result:</strong> ${inv.match_status === "variance"
        ? `${inv.variance_count} difference(s), ${formatMoney(inv.variance_amount)} more than expected.`
        : "Matches the purchase order and deliveries."}
    ${inv.match_notes.length ? `<br>${inv.match_notes.map(escapeHtml).join("<br>")}` : ""}
    ${inv.approval_notes ? `<br><strong>Approver's note:</strong> ${escapeHtml(inv.approval_notes)}` : ""}
</div>

<div class="signs">
    <div>${inv.created_by_name ? `<strong>${escapeHtml(inv.created_by_name)}</strong><br>` : ""}Prepared by</div>
    <div>Checked / Matched by</div>
    <div>${inv.status === "approved" && inv.approved_by_name ? `<strong>${escapeHtml(inv.approved_by_name)}</strong> &middot; ${formatDate(String(inv.approved_at).slice(0, 10))}<br>` : ""}Approved for payment by</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body>
</html>`);
    win.document.close();
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(Number(value) * factor) / factor;
}

function formatInput(value) {
    return String(Number(Number(value).toFixed(3)));
}

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
