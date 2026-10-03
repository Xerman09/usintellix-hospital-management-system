import {
    fetchPendingDeliveries, fetchOrderToReceive, fetchReceipts, fetchReceipt, receiveDelivery, fetchWarehouseOptions, voidReceipt
} from "./receiving.service.js?v=2";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";
import { systemNow } from "../../core/timezone.js";
import { custodianHint } from "../../core/custodian.js";

// Keep in step with PurchaseOrderService::CREATOR_ROLES (the receiving
// roles). Approver-only roles (e.g. accountant) see past deliveries only.
const RECEIVER_ROLES = ["admin", "receptionist", "doctor"];
const canReceive = () => RECEIVER_ROLES.includes(getUser()?.role);

const MEDICINE_TYPES = ["Drug", "Vaccine"];
const STATUS_LABELS = { approved: "Ready for receiving", partially_received: "Partially received", received: "Fully received", closed: "Closed" };

let pending = [];
let receipts = [];
let activeTab = "pending";

// Receive form state
let order = null;     // the purchase order being received
let rows = [];        // [{ key, lineId, quantity, lot_number, expires_date, rejected_quantity, rejection_reason }]
let rowKey = 0;

const $ = (id) => document.getElementById(id);

export async function initReceiving() {
    if (!canReceive()) {
        document.querySelector(".rv-header p").textContent =
            "Approved purchase orders ready for receiving, and deliveries already received. "
            + "Deliveries are received into stock by admin, receptionist or doctor accounts.";
    }

    document.querySelectorAll("[data-rv-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.rvTab;
        document.querySelectorAll("[data-rv-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        renderList();
    }));
    $("rvSearch").addEventListener("input", renderList);
    document.querySelectorAll("[data-rv-back]").forEach((btn) => btn.addEventListener("click", showList));

    setupForm();

    // Opened from a purchase order's "Receive Delivery" button.
    window.addEventListener("po:receive", onReceiveRequest);

    const requested = window.__pendingReceivePoId;
    window.__pendingReceivePoId = null;

    await loadLists();

    if (requested) await openForm(requested);
}

function onReceiveRequest(event) {
    // Only the live page reacts (the tab may have been closed and reopened).
    if (!document.querySelector(".rv-page")) {
        window.removeEventListener("po:receive", onReceiveRequest);
        return;
    }

    window.__pendingReceivePoId = null;
    openForm(event.detail.id);
}

/* ---------------------------------------------------------------
 * Lists
 * ------------------------------------------------------------- */

async function loadLists() {
    $("rvList").innerHTML = `<div class="rv-empty">Loading...</div>`;

    const [pendingResult, receiptsResult] = await Promise.all([fetchPendingDeliveries(), fetchReceipts()]);

    if (!pendingResult?.success || !receiptsResult?.success) {
        const message = (!pendingResult?.success ? pendingResult : receiptsResult)?.message;
        $("rvList").innerHTML = `
            <div class="rv-empty">
                <strong>Couldn't load deliveries.</strong>
                <span class="rv-sub">${escapeHtml(message || "The server didn't respond.")}</span>
                <button type="button" class="rv-btn small" id="rvRetry" style="margin-top:10px;">Try Again</button>
            </div>`;
        $("rvRetry").addEventListener("click", loadLists);
        return;
    }

    pending = pendingResult.data || [];
    receipts = receiptsResult.data || [];

    const month = isoToday().slice(0, 7);
    $("rvStatAwaiting").textContent = pending.length;
    $("rvStatOverdue").textContent = pending.filter((o) => o.is_overdue).length;
    $("rvStatPartial").textContent = pending.filter((o) => o.status === "partially_received").length;
    $("rvStatMonth").textContent = receipts.filter((r) => !r.voided_at && String(r.received_date).slice(0, 7) === month).length;

    renderList();
}

function renderList() {
    const term = $("rvSearch").value.trim().toLowerCase();
    const match = (values) => !term || values.some((v) => (v || "").toLowerCase().includes(term));

    if (activeTab === "pending") {
        const list = pending.filter((o) => match([o.po_number, o.supplier_name, o.supplier_code, o.supplier_reference, o.warehouse_name]));
        $("rvCount").textContent = `${list.length} ${list.length === 1 ? "order" : "orders"}`;

        if (!list.length) {
            $("rvList").innerHTML = `<div class="rv-empty">${pending.length
                ? "No orders match your search."
                : "Nothing ready for receiving. As soon as a purchase order is approved it shows up here, and stays until everything on it has arrived."}</div>`;
            return;
        }

        $("rvList").innerHTML = `
            <div class="rv-table-wrap">
                <table class="rv-table">
                    <thead><tr><th>PO No.</th><th>Supplier</th><th>Expected</th><th>Deliver To</th><th>Received so far</th><th class="num">Total</th><th>Status</th><th></th></tr></thead>
                    <tbody>${list.map((o) => `
                        <tr class="rv-row" data-rv-receive="${o.id}">
                            <td style="white-space:nowrap;"><strong>${escapeHtml(o.po_number)}</strong><span class="rv-sub">Ordered ${formatDate(o.order_date)}</span></td>
                            <td>${escapeHtml(o.supplier_name)}<span class="rv-sub">${escapeHtml(o.supplier_code || "")}</span></td>
                            <td style="white-space:nowrap;">${o.expected_date ? formatDate(o.expected_date) : "—"}${o.is_overdue ? `<span class="rv-badge overdue">Overdue</span>` : ""}</td>
                            <td>${escapeHtml(o.warehouse_name || "—")}</td>
                            <td class="rv-progress">
                                <div class="rv-bar"><span style="width:${o.percent_received}%;"></span></div>
                                <span class="rv-sub">${o.lines_complete} of ${o.line_count} item${o.line_count === 1 ? "" : "s"} complete · ${o.percent_received}%</span>
                                ${o.delivery_count ? `<span class="rv-sub">${o.delivery_count} deliver${o.delivery_count === 1 ? "y" : "ies"} so far</span>` : ""}
                            </td>
                            <td class="num">${formatMoney(o.total)}</td>
                            <td><span class="rv-badge ${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
                            <td>${canReceive()
                                ? `<button type="button" class="rv-btn small primary">${o.status === "partially_received" ? "Receive More" : "Receive"}</button>`
                                : `<span class="rv-sub" title="Received by admin, receptionist or doctor accounts">Awaiting pharmacy</span>`}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>`;

        if (canReceive()) {
            $("rvList").querySelectorAll("[data-rv-receive]").forEach((row) => {
                row.addEventListener("click", () => openForm(Number(row.dataset.rvReceive)));
            });
        } else {
            $("rvList").querySelectorAll("[data-rv-receive]").forEach((row) => { row.style.cursor = "default"; });
        }
        return;
    }

    const list = receipts.filter((r) => match([r.gr_number, r.po_number, r.supplier_name, r.delivery_receipt_no, r.invoice_no, r.warehouse_name]));
    $("rvCount").textContent = `${list.length} ${list.length === 1 ? "delivery" : "deliveries"}`;

    if (!list.length) {
        $("rvList").innerHTML = `<div class="rv-empty">${receipts.length ? "No deliveries match your search." : "No deliveries received yet."}</div>`;
        return;
    }

    $("rvList").innerHTML = `
        <div class="rv-table-wrap">
            <table class="rv-table">
                <thead><tr><th>RR No.</th><th>Date</th><th>PO No.</th><th>Supplier</th><th>DR / Invoice</th><th>Received Into</th><th class="num">Items</th><th class="num">Cost</th><th>Received By</th></tr></thead>
                <tbody>${list.map((r) => `
                    <tr class="rv-row ${r.voided_at ? "is-voided" : ""}" data-rv-receipt="${r.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(r.gr_number)}</strong>
                            ${r.voided_at ? `<span class="rv-badge voided">Voided</span>` : ""}
                            ${r.invoice ? `<span class="rv-sub"><span class="rv-badge billed" title="Billed on supplier invoice ${escapeHtml(r.invoice.ap_number)}">Billed ${escapeHtml(r.invoice.ap_number)}</span></span>` : ""}</td>
                        <td style="white-space:nowrap;">${formatDate(r.received_date)}</td>
                        <td style="white-space:nowrap;">${escapeHtml(r.po_number)}</td>
                        <td>${escapeHtml(r.supplier_name)}</td>
                        <td>${escapeHtml([r.delivery_receipt_no ? `DR ${r.delivery_receipt_no}` : null, r.invoice_no ? `SI ${r.invoice_no}` : null].filter(Boolean).join(" · ") || "—")}</td>
                        <td>${escapeHtml(r.warehouse_name || "—")}</td>
                        <td class="num">${r.item_count}
                            ${r.over_count ? `<span class="rv-over" title="More than ordered on ${r.over_count} line(s)">Over</span>` : ""}
                            ${r.extra_count ? `<span class="rv-badge extra" title="${r.extra_count} item(s) not on the purchase order">+${r.extra_count} not on PO</span>` : ""}
                            ${r.rejected_total > 0 ? `<span class="rv-badge rejected" title="Some items were rejected on arrival">Rejected ${formatQty(r.rejected_total)}</span>` : ""}</td>
                        <td class="num">${formatMoney(r.total_cost)}</td>
                        <td>${escapeHtml(r.received_by_name || "—")}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("rvList").querySelectorAll("[data-rv-receipt]").forEach((row) => {
        row.addEventListener("click", () => openReceipt(Number(row.dataset.rvReceipt)));
    });
}

function showPanel(name) {
    $("rvListPanel").hidden = name !== "list";
    $("rvFormPanel").hidden = name !== "form";
    $("rvDetailPanel").hidden = name !== "detail";
    document.querySelector(".rv-page").scrollIntoView({ block: "start" });
}

async function showList() {
    showPanel("list");
    await loadLists();
}

/* ---------------------------------------------------------------
 * Receive form
 * ------------------------------------------------------------- */

function setupForm() {
    $("rvForm").addEventListener("submit", (event) => {
        event.preventDefault();
        save();
    });

    $("rvFillAll").addEventListener("click", () => {
        // One row per order line, set to everything still outstanding.
        // Items not on the order are left as they are.
        const seen = new Set();
        rows = rows.filter((r) => !r.lineId || (!seen.has(r.lineId) && seen.add(r.lineId)));
        rows.forEach((r) => { if (r.lineId) r.quantity = formatInput(lineById(r.lineId).quantity_remaining); });
        renderRows();
    });

    $("rvClearAll").addEventListener("click", () => {
        rows.forEach((r) => { r.quantity = ""; r.rejected_quantity = ""; r.rejection_reason = ""; });
        renderRows();
    });

    $("rvAddExtra").addEventListener("change", () => {
        const drugId = Number($("rvAddExtra").value);
        $("rvAddExtra").value = "";
        if (!drugId) return;

        const product = extraProduct(drugId);
        const row = newExtraRow(product);
        rows.push(row);
        renderRows();
        document.querySelector(`[data-row="${row.key}"] [data-field="quantity"]`)?.focus();
    });

    $("rvLines").addEventListener("input", (event) => {
        const tr = event.target.closest("[data-row]");
        const field = event.target.dataset.field;
        if (!tr || !field) return;

        const row = rows.find((r) => r.key === Number(tr.dataset.row));
        row[field] = event.target.value;

        const err = $(`err-rv_row_${row.key}_${field}`);
        if (err) err.textContent = "";

        refreshFlags();
        refreshSummary();
    });

    $("rvLines").addEventListener("change", (event) => {
        const tr = event.target.closest("[data-row]");
        if (!tr || event.target.dataset.field !== "order_unit") return;

        // Switching an extra item between units and packages: keep the
        // price per unit right.
        const row = rows.find((r) => r.key === Number(tr.dataset.row));
        const product = extraProduct(row.drugId);
        const per = product?.package_quantity;
        const price = Number(row.unit_price);

        if (per && row.unit_price !== "" && !Number.isNaN(price)) {
            row.unit_price = formatPrice(event.target.value === "package" ? price * per : price / per);
        }

        row.order_unit = event.target.value;
        renderRows();
    });

    $("rvLines").addEventListener("click", (event) => {
        const add = event.target.closest("[data-add-lot]");
        if (add) {
            const source = rows.find((r) => r.key === Number(add.dataset.addLot));
            const index = rows.lastIndexOf(rows.filter((r) => groupKey(r) === groupKey(source)).at(-1));
            const row = source.lineId ? newRow(source.lineId, "") : { ...newExtraRow(extraProduct(source.drugId)), order_unit: source.order_unit, unit_price: source.unit_price };
            rows.splice(index + 1, 0, row);
            renderRows();
            document.querySelector(`[data-row="${row.key}"] [data-field="quantity"]`)?.focus();
            return;
        }

        const remove = event.target.closest("[data-remove-row]");
        if (remove) {
            rows = rows.filter((r) => r.key !== Number(remove.dataset.removeRow));
            renderRows();
        }
    });
}

async function openForm(orderId) {
    const [orderResult, warehouseResult] = await Promise.all([fetchOrderToReceive(orderId), fetchWarehouseOptions()]);

    if (!orderResult?.success) {
        showToast(orderResult?.message || "Couldn't open the purchase order.", "error");
        return;
    }

    order = orderResult.data;

    if (!order.can_receive) {
        showToast(`${order.po_number} can't take deliveries (${(STATUS_LABELS[order.status] || order.status).toLowerCase()}).`, "error");
        return;
    }

    const warehouses = (warehouseResult?.success ? warehouseResult.data.warehouses || [] : [])
        .filter((w) => Number(w.is_active) === 1 || Number(w.id) === order.warehouse_id);

    clearErrors();
    $("rvForm").reset();

    const deliveryNo = (order.receipts?.length || 0) + 1;
    $("rvFormTitle").textContent = `Receive Delivery #${deliveryNo} — ${order.po_number}`;
    $("rvFormSub").textContent = `From ${order.supplier_name}. Count what arrived in this delivery and enter only that.`;

    // A purchase order can be delivered in several parts; each part gets
    // its own Receiving Report until everything has arrived.
    $("rvPartialNote").innerHTML = `
        <strong>Enter what actually arrived.</strong>
        Partial deliveries are fine: whatever is still missing stays open on ${escapeHtml(order.po_number)} for the next delivery.
        If the supplier sent more than ordered, enter the full amount (it's marked as over-delivery), and add anything
        that isn't on the order with &ldquo;Add an item not on this PO&rdquo; below.
        ${order.receipts?.length ? `<br>Already received on this order: ${order.receipts.map((r) =>
            `<strong>${escapeHtml(r.gr_number)}</strong> (${formatDate(r.received_date)})`).join(", ")}.` : ""}`;

    $("rvOrderInfo").innerHTML = [
        ["Purchase Order", `<strong>${escapeHtml(order.po_number)}</strong><span class="rv-sub">${STATUS_LABELS[order.status] || order.status}</span>`],
        ["Supplier", `${escapeHtml(order.supplier_name)}${order.supplier_code ? `<span class="rv-sub">${escapeHtml(order.supplier_code)}</span>` : ""}`],
        ["Ordered", formatDate(order.order_date)],
        ["Expected", order.expected_date ? `${formatDate(order.expected_date)}${order.is_overdue ? ` <span class="rv-badge overdue">Overdue</span>` : ""}` : "—"],
        ["Approved by", escapeHtml(order.approved_by_name || "—")],
        ["Previous deliveries", order.receipts?.length
            ? order.receipts.map((r) => `${escapeHtml(r.gr_number)}<span class="rv-sub">${formatDate(r.received_date)}</span>`).join("")
            : "None yet — this is the first"]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

    $("rv_warehouse_id").innerHTML = `<option value="">-- Select a location --</option>` +
        warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    $("rv_warehouse_id").value = order.warehouse_id || "";

    // Receiving into a location is its custodian's job -- say who that is, and whether it's you.
    const showCustodian = () => {
        const hint = custodianHint(warehouses.find((w) => Number(w.id) === Number($("rv_warehouse_id").value)), "Receiving into");
        $("rvCustodian").textContent = hint.text;
        $("rvCustodian").classList.toggle("warn", hint.warn);
    };
    $("rv_warehouse_id").onchange = showCustodian;
    showCustodian();
    $("rv_received_date").value = isoToday();
    $("rv_received_date").max = isoToday();

    // Items not on the order, for the "add an item" picker.
    const onOrder = new Set(order.items.map((i) => i.drug_id));
    const extras = (order.extra_products || []).filter((p) => !onOrder.has(p.id));
    $("rvAddExtra").innerHTML = `<option value="">+ Add an item not on this PO...</option>` +
        extras.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}${p.unit_price != null
            ? ` — ${formatMoney(p.unit_price, 4)} / ${escapeHtml(p.unit_name || "unit")}${p.price_source === "supplier" ? " (supplier price)" : ""}` : ""}</option>`).join("");
    $("rvAddExtra").disabled = !extras.length;

    // One empty row per outstanding line: enter what was counted, so a
    // short delivery isn't accidentally received in full. "Fill all
    // remaining" fills everything for a complete delivery.
    rows = order.items.filter((i) => i.quantity_remaining > 0).map((i) => newRow(i.id, ""));

    renderRows();
    showPanel("form");
}

function newRow(lineId, quantity) {
    return { key: ++rowKey, lineId, drugId: null, quantity, lot_number: "", expires_date: "", rejected_quantity: "", rejection_reason: "" };
}

/** A row for an item that isn't on the order. unit_price is per order_unit. */
function newExtraRow(product) {
    return {
        key: ++rowKey,
        lineId: null,
        drugId: product.id,
        order_unit: "unit",
        unit_price: product.unit_price != null ? formatPrice(product.unit_price) : "",
        quantity: "",
        lot_number: "",
        expires_date: "",
        rejected_quantity: "",
        rejection_reason: ""
    };
}

function lineById(id) {
    return order.items.find((i) => i.id === id);
}

function extraProduct(id) {
    return (order.extra_products || []).find((p) => p.id === Number(id)) || null;
}

function groupKey(row) {
    return row.lineId ? `line-${row.lineId}` : `extra-${row.drugId}`;
}

/** Name, unit and rules for a row, whether it's an order line or not. */
function rowInfo(row) {
    if (row.lineId) {
        const line = lineById(row.lineId);
        return {
            name: line.drug_name,
            unit: unitLabel(line),
            unitName: line.unit_name || "units",
            needsLot: needsLot(line),
            costPerUnit: line.net_unit_price,
            line
        };
    }

    const product = extraProduct(row.drugId);
    const isPackage = row.order_unit === "package";
    return {
        name: product?.name || "Item",
        unit: isPackage ? (product?.package_unit_name || "package") : (product?.unit_name || "unit"),
        unitName: product?.unit_name || "units",
        needsLot: MEDICINE_TYPES.includes(product?.product_type),
        costPerUnit: Number(row.unit_price) || 0,
        product
    };
}

function unitLabel(line) {
    return line.order_unit === "package" ? (line.package_unit_name || "package") : (line.unit_name || "unit");
}

function needsLot(line) {
    return MEDICINE_TYPES.includes(line.product_type);
}

/** How much of each order-line row goes past what was still due (in row order). */
function overByRow() {
    const used = new Map();
    const over = new Map();

    rows.forEach((row) => {
        if (!row.lineId) return;
        const line = lineById(row.lineId);
        const qty = Math.max(0, Number(row.quantity) || 0);
        const before = used.get(row.lineId) || 0;
        const stillDue = Math.max(0, line.quantity_remaining - before);
        over.set(row.key, Math.max(0, qty - stillDue));
        used.set(row.lineId, before + qty);
    });

    return over;
}

function renderRows() {
    const outstanding = order.items.filter((i) => i.quantity_remaining > 0);
    const done = order.items.length - outstanding.length;

    if (!rows.length) {
        $("rvLines").innerHTML = `<div class="rv-empty">${outstanding.length
            ? "No rows. Use “Fill all remaining” to start again, or add an item not on this PO."
            : "Everything on this order has been received. You can still add an item not on this PO below."}</div>`;
        refreshSummary();
        return;
    }

    let previousGroup = null;

    $("rvLines").innerHTML = `
        <div class="rv-lines-wrap">
            <table class="rv-lines">
                <thead><tr>
                    <th>Item</th><th class="col-qty">Received</th><th class="col-lot">Lot / Batch No.</th><th class="col-exp">Expiry Date</th>
                    <th class="col-rej">Rejected</th><th class="col-reason">Reason for Rejection</th><th style="width:34px;"></th>
                </tr></thead>
                <tbody>${rows.map((row) => {
                    const info = rowInfo(row);
                    const group = groupKey(row);
                    const first = previousGroup !== group;
                    previousGroup = group;
                    const lotsInGroup = rows.filter((r) => groupKey(r) === group).length;
                    const canRemove = !row.lineId || lotsInGroup > 1;

                    return `
                    <tr data-row="${row.key}" class="${first ? "line-start" : "lot-extra"} ${row.lineId ? "" : "is-extra"}">
                        <td style="min-width:260px;">
                            ${first ? itemCell(row, info) : `<span class="rv-sub" style="padding-left:14px;">&#8627; another lot of ${escapeHtml(info.name)}</span>`}
                            <span class="form-error" id="err-rv_row_${row.key}_line"></span>
                            <span class="form-error" id="err-rv_row_${row.key}_drug_id"></span>
                        </td>
                        <td class="col-qty">
                            <input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(row.quantity)}" aria-label="Quantity received">
                            <span class="rv-unit">${escapeHtml(info.unit)}</span>
                            <span class="rv-over" data-flag="over" hidden></span>
                            <span class="form-error" id="err-rv_row_${row.key}_quantity"></span>
                        </td>
                        <td class="col-lot">
                            <input type="text" maxlength="100" data-field="lot_number" value="${escapeHtml(row.lot_number)}" placeholder="${info.needsLot ? "Required" : "Optional"}" aria-label="Lot number">
                            ${info.needsLot ? `<span class="rv-unit" style="text-align:left;">Required for medicines</span>` : ""}
                            <span class="form-error" id="err-rv_row_${row.key}_lot_number"></span>
                        </td>
                        <td class="col-exp">
                            <input type="date" data-field="expires_date" value="${escapeHtml(row.expires_date)}" aria-label="Expiry date">
                            <span class="form-error" id="err-rv_row_${row.key}_expires_date"></span>
                        </td>
                        <td class="col-rej">
                            <input type="number" min="0" step="any" data-field="rejected_quantity" value="${escapeHtml(row.rejected_quantity)}" placeholder="0" aria-label="Quantity rejected">
                            <span class="form-error" id="err-rv_row_${row.key}_rejected_quantity"></span>
                        </td>
                        <td class="col-reason">
                            <input type="text" maxlength="255" data-field="rejection_reason" value="${escapeHtml(row.rejection_reason)}" placeholder="e.g. Damaged, near expiry" aria-label="Reason for rejection">
                            <span class="form-error" id="err-rv_row_${row.key}_rejection_reason"></span>
                        </td>
                        <td>${canRemove ? `<button type="button" class="rv-remove" data-remove-row="${row.key}" title="${row.lineId ? "Remove this lot" : "Remove this item"}" aria-label="Remove">&times;</button>` : ""}</td>
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
        </div>
        ${done ? `<div class="rv-done-note">${done} item${done === 1 ? " is" : "s are"} already fully received and not shown.</div>` : ""}`;

    refreshFlags();
    refreshSummary();
}

function itemCell(row, info) {
    if (row.lineId) {
        const line = info.line;
        return `
            <div class="rv-item-name">${line.line_no}. ${escapeHtml(line.drug_name)}</div>
            <div class="rv-qtybar">
                <span class="rv-chip">Ordered ${formatQty(line.quantity)} ${escapeHtml(info.unit)}</span>
                ${line.quantity_received > 0 ? `<span class="rv-chip">Received ${formatQty(line.quantity_received)}</span>` : ""}
                <span class="rv-chip todo">To receive ${formatQty(line.quantity_remaining)}</span>
            </div>
            ${line.order_unit === "package" && line.units_per_package ? `<span class="rv-sub">1 ${escapeHtml(info.unit)} = ${formatQty(line.units_per_package)} ${escapeHtml(info.unitName)}</span>` : ""}
            <button type="button" class="rv-btn link" data-add-lot="${row.key}" style="margin-top:4px;" title="The delivery has more than one lot of this item">+ Another lot</button>`;
    }

    const product = info.product;
    const hasPackage = Boolean(product?.package_quantity && product?.package_unit_name);

    return `
        <div class="rv-item-name">${escapeHtml(info.name)} <span class="rv-badge extra">Not on PO</span></div>
        <div class="rv-extra-fields">
            <select data-field="order_unit" aria-label="Unit">
                <option value="unit" ${row.order_unit === "unit" ? "selected" : ""}>${escapeHtml(capitalize(product?.unit_name || "unit"))}</option>
                ${hasPackage ? `<option value="package" ${row.order_unit === "package" ? "selected" : ""}>${escapeHtml(capitalize(product.package_unit_name))} of ${formatQty(product.package_quantity)}</option>` : ""}
            </select>
            <label class="rv-price">&#8369;<input type="number" min="0" step="any" data-field="unit_price" value="${escapeHtml(row.unit_price)}" placeholder="0.00" aria-label="Price per ${escapeHtml(info.unit)}"><span>/ ${escapeHtml(info.unit)}</span></label>
        </div>
        <span class="form-error" id="err-rv_row_${row.key}_order_unit"></span>
        <span class="form-error" id="err-rv_row_${row.key}_unit_price"></span>
        <button type="button" class="rv-btn link" data-add-lot="${row.key}" style="margin-top:4px;">+ Another lot</button>`;
}

/** Live "Over by N" flags, without re-rendering the inputs. */
function refreshFlags() {
    const over = overByRow();

    rows.forEach((row) => {
        const flag = document.querySelector(`[data-row="${row.key}"] [data-flag="over"]`);
        if (!flag) return;
        const amount = over.get(row.key) || 0;
        flag.hidden = !(amount > 0.0005);
        flag.textContent = amount > 0.0005 ? `Over by ${formatQty(round3(amount))}` : "";
    });
}

function refreshSummary() {
    const items = new Set();
    let cost = 0;
    let rejected = 0;
    let extras = 0;
    const over = overByRow();
    const overLines = new Set();

    rows.forEach((row) => {
        const qty = Number(row.quantity) || 0;

        if (qty > 0) {
            items.add(groupKey(row));
            cost += qty * rowInfo(row).costPerUnit;
            if (!row.lineId) extras += 1;
        }

        if ((over.get(row.key) || 0) > 0.0005) overLines.add(row.lineId);
        if (Number(row.rejected_quantity) > 0) rejected += 1;
    });

    const notes = [
        overLines.size ? `<span class="rv-over">${overLines.size} over the order</span>` : null,
        extras ? `<span class="rv-badge extra">${extras} not on PO</span>` : null,
        rejected ? `${rejected} with rejected quantity` : null
    ].filter(Boolean);

    $("rvSummary").innerHTML = items.size
        ? `Receiving <strong>${items.size} item${items.size === 1 ? "" : "s"}</strong> worth <strong>${formatMoney(cost)}</strong>${notes.length ? ` · ${notes.join(" · ")}` : ""}`
        : "Enter the quantity that arrived for each item.";
}

async function save() {
    clearErrors();

    // Quick checks so the obvious mistakes don't need a round trip.
    let problems = 0;

    rows.forEach((row) => {
        const info = rowInfo(row);
        const qty = Number(row.quantity) || 0;

        if (qty > 0 && info.needsLot) {
            if (!row.lot_number.trim()) { setRowError(row, "lot_number", "Lot / batch number is required."); problems++; }
            if (!row.expires_date) { setRowError(row, "expires_date", "Expiry date is required."); problems++; }
        }

        if (!row.lineId && qty > 0 && row.unit_price !== "" && Number(row.unit_price) < 0) {
            setRowError(row, "unit_price", "Enter zero or more."); problems++;
        }

        if (Number(row.rejected_quantity) > 0 && !row.rejection_reason.trim()) {
            setRowError(row, "rejection_reason", "Say why it was rejected."); problems++;
        }
    });

    const hasAnything = rows.some((r) => Number(r.quantity) > 0 || Number(r.rejected_quantity) > 0);

    if (!hasAnything) {
        $("err-rv_items").textContent = "Enter the quantity received for at least one item.";
        showAlert("Enter the quantity received for at least one item.");
        return;
    }

    if (!$("rv_warehouse_id").value) {
        $("err-rv_warehouse_id").textContent = "Choose where the stock is going.";
        problems++;
    }

    if (problems) {
        showAlert("Please fix the highlighted fields.");
        return;
    }

    if (!(await confirmReceive())) return;

    const payload = {
        purchase_order_id: order.id,
        received_date: $("rv_received_date").value,
        warehouse_id: $("rv_warehouse_id").value,
        delivery_receipt_no: $("rv_delivery_receipt_no").value.trim(),
        invoice_no: $("rv_invoice_no").value.trim(),
        notes: $("rv_notes").value.trim(),
        items: rows.map((r) => ({
            ...(r.lineId
                ? { purchase_order_item_id: r.lineId }
                : { drug_id: r.drugId, order_unit: r.order_unit, unit_price: r.unit_price }),
            quantity: r.quantity,
            lot_number: r.lot_number.trim(),
            expires_date: r.expires_date,
            rejected_quantity: r.rejected_quantity,
            rejection_reason: r.rejection_reason.trim()
        }))
    };

    $("rvSave").disabled = true;
    const result = await receiveDelivery(payload);
    $("rvSave").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;

        if (errors) {
            Object.entries(errors).forEach(([name, message]) => {
                const match = name.match(/^items\.(\d+)\.(\w+)$/);
                if (match) {
                    const row = rows[Number(match[1])];
                    if (row) setRowError(row, match[2], message);
                } else {
                    const el = $(`err-rv_${name}`);
                    if (el) el.textContent = message;
                }
            });
            showAlert("Nothing was received. Please fix the highlighted fields.");
        } else {
            showAlert(result?.message || "Failed to save the delivery.");
        }
        return;
    }

    showToast(result.message, "success");
    await openReceipt(result.data.id);
}

function confirmReceive() {
    const received = rows.filter((r) => Number(r.quantity) > 0);
    const items = new Set(received.map(groupKey));
    const rejected = rows.filter((r) => Number(r.rejected_quantity) > 0).length;
    const over = overByRow();
    const overRows = rows.filter((r) => (over.get(r.key) || 0) > 0.0005);
    const extras = received.filter((r) => !r.lineId);
    const allDone = order.items.every((i) => {
        const now = rows.filter((r) => r.lineId === i.id).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        return i.quantity_remaining - now <= 0.0005;
    });

    const overList = [...new Set(overRows.map((r) => r.lineId))].map((lineId) => {
        const line = lineById(lineId);
        const amount = overRows.filter((r) => r.lineId === lineId).reduce((sum, r) => sum + over.get(r.key), 0);
        return `${escapeHtml(line.drug_name)}: +${formatQty(round3(amount))} ${escapeHtml(unitLabel(line))}`;
    });
    const extraList = [...new Set(extras.map((r) => r.drugId))].map((drugId) => {
        const qty = extras.filter((r) => r.drugId === drugId).reduce((sum, r) => sum + Number(r.quantity), 0);
        const sample = extras.find((r) => r.drugId === drugId);
        return `${escapeHtml(rowInfo(sample).name)}: ${formatQty(round3(qty))} ${escapeHtml(rowInfo(sample).unit)}`;
    });

    const body = `
        <dl class="rv-confirm-summary">
            <dt>Purchase order</dt><dd>${escapeHtml(order.po_number)}</dd>
            <dt>Supplier</dt><dd>${escapeHtml(order.supplier_name)}</dd>
            <dt>Received into</dt><dd>${escapeHtml($("rv_warehouse_id").selectedOptions[0]?.textContent || "—")}</dd>
            <dt>Date</dt><dd>${formatDate($("rv_received_date").value)}</dd>
            <dt>Items</dt><dd>${items.size} (${received.length} lot${received.length === 1 ? "" : "s"})</dd>
            ${rejected ? `<dt>With rejected quantity</dt><dd>${rejected}</dd>` : ""}
            <dt>After this</dt><dd>${allDone ? "Order fully received" : "Order stays open for the rest"}</dd>
        </dl>
        ${overList.length ? `<div class="po-note-like rv-warn"><strong>More than ordered:</strong> ${overList.join("; ")}. The extra is accepted and marked as over-delivery.</div>` : ""}
        ${extraList.length ? `<div class="po-note-like rv-warn"><strong>Not on the purchase order:</strong> ${extraList.join("; ")}. Received into stock and marked &ldquo;Not on PO&rdquo;; the order itself isn't changed.</div>` : ""}
        <p class="rv-confirm-note">The quantities go into stock now, under the lot numbers and expiry dates entered. Rejected quantities are recorded but not stocked.</p>`;

    return new Promise((resolve) => {
        const overlay = $("rvConfirmOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("rvConfirmOk").removeEventListener("click", onOk);
            $("rvConfirmCancel").removeEventListener("click", onCancel);
            $("rvConfirmClose").removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onBackdrop = (event) => { if (event.target === overlay) finish(false); };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("rvConfirmBody").innerHTML = body;
        $("rvConfirmOk").addEventListener("click", onOk);
        $("rvConfirmCancel").addEventListener("click", onCancel);
        $("rvConfirmClose").addEventListener("click", onCancel);
        overlay.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        $("rvConfirmOk").focus();
    });
}

function setRowError(row, field, message) {
    const el = $(`err-rv_row_${row.key}_${field}`) || $(`err-rv_row_${row.key}_line`);
    if (el) el.textContent = message;
}

function clearErrors() {
    $("rvFormAlert").innerHTML = "";
    document.querySelectorAll("#rvForm .form-error").forEach((el) => { el.textContent = ""; });
}

function showAlert(message) {
    $("rvFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $("rvFormAlert").scrollIntoView({ block: "nearest" });
}

/* ---------------------------------------------------------------
 * Receipt detail + Receiving Report printout
 * ------------------------------------------------------------- */

async function openReceipt(id) {
    const result = await fetchReceipt(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the receipt.", "error");
        return;
    }

    const r = result.data;
    const status = {
        received: "The order is now fully received.",
        partially_received: "The rest of the order is still open for the next delivery.",
        closed: "The order was closed."
    }[r.po_status] || "";
    const moreToCome = r.po_status === "partially_received" && canReceive() && !r.voided_at;
    // Voiding: not once billed, and only while the order still takes deliveries / is complete.
    const canVoid = canReceive() && !r.voided_at && !r.invoice && ["approved", "partially_received", "received"].includes(r.po_status);

    $("rvDetail").innerHTML = `
        ${r.voided_at ? `
        <div class="rv-banner voided">
            <div>
                <strong>${escapeHtml(r.gr_number)} was voided</strong>
                <span>${escapeHtml(formatDate(String(r.voided_at).slice(0, 10)))}${r.voided_by_name ? ` by ${escapeHtml(r.voided_by_name)}` : ""}: &ldquo;${escapeHtml(r.void_reason || "")}&rdquo;. Its stock was taken back out and the order's quantities reversed.</span>
            </div>
            <div class="rv-actions"><button type="button" class="rv-btn" id="rvPrintBtn">Print Receiving Report</button></div>
        </div>` : `
        <div class="rv-banner">
            <div>
                <strong>${escapeHtml(r.gr_number)} &mdash; received ${formatDate(r.received_date)}</strong>
                <span>${escapeHtml(r.po_number)} &middot; ${escapeHtml(r.supplier_name)} &middot; ${status}</span>
            </div>
            <div class="rv-actions">
                <button type="button" class="rv-btn" id="rvPrintBtn">Print Receiving Report</button>
                ${canVoid ? `<button type="button" class="rv-btn danger" id="rvVoidBtn" title="Entered by mistake? Take it back out of stock">Void</button>` : ""}
                ${moreToCome ? `<button type="button" class="rv-btn primary" id="rvNextBtn">Receive Next Delivery</button>` : ""}
            </div>
        </div>`}

        <div class="rv-card">
            <dl class="rv-info">${[
                ["Receiving Report", `<strong>${escapeHtml(r.gr_number)}</strong>`],
                ["Purchase Order", escapeHtml(r.po_number)],
                ["Supplier", escapeHtml(r.supplier_name)],
                ["Received Into", escapeHtml(r.warehouse_name || "—")],
                ["Supplier DR No.", escapeHtml(r.delivery_receipt_no || "—")],
                ["Supplier Invoice No.", escapeHtml(r.invoice_no || "—")],
                ["Received By", escapeHtml(r.received_by_name || "—")],
                ["Billed On", r.invoice
                    ? `<span class="rv-badge billed">${escapeHtml(r.invoice.ap_number)}</span>`
                    : (r.voided_at ? "—" : `<span class="rv-sub" style="margin:0;">Not billed yet</span>`)],
                ["Notes", escapeHtml(r.notes || "—")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="rv-card">
            <div class="rv-card-title">Items</div>
            <div class="rv-lines-wrap">
                <table class="rv-lines" style="min-width:760px;">
                    <thead><tr><th>Item</th><th>Lot / Batch</th><th>Expiry</th><th class="num">Received</th><th class="num">Into Stock</th><th>Rejected</th><th class="num">Cost</th></tr></thead>
                    <tbody>${r.items.map((i) => `
                        <tr>
                            <td><span class="rv-item-name">${i.on_order ? `${i.line_no}. ` : ""}${escapeHtml(i.drug_name)}</span>
                                ${i.on_order ? "" : ` <span class="rv-badge extra">Not on PO</span>`}
                                ${i.over_quantity > 0 ? ` <span class="rv-over">Over by ${formatQty(i.over_quantity)}</span>` : ""}
                                ${i.supplier_item_code ? `<span class="rv-sub">Item ${escapeHtml(i.supplier_item_code)}</span>` : ""}</td>
                            <td>${escapeHtml(i.lot_number || "—")}</td>
                            <td style="white-space:nowrap;">${i.expires_date ? formatDate(i.expires_date) : "—"}</td>
                            <td class="num">${formatQty(i.quantity)} ${escapeHtml(itemUnit(i))}</td>
                            <td class="num">${formatQty(i.base_quantity)} ${escapeHtml(i.unit_name || "units")}</td>
                            <td>${i.rejected_quantity > 0 ? `<span class="rv-badge rejected">${formatQty(i.rejected_quantity)} ${escapeHtml(itemUnit(i))}</span><span class="rv-sub">${escapeHtml(i.rejection_reason || "")}</span>` : "—"}</td>
                            <td class="num">${i.line_cost != null ? formatMoney(i.line_cost) : "—"}<span class="rv-sub">${i.unit_cost != null ? `${formatMoney(i.unit_cost, 4)} / ${escapeHtml(i.unit_name || "unit")}` : ""}</span></td>
                        </tr>`).join("")}
                    </tbody>
                    <tfoot><tr><td colspan="6" class="num"><strong>Total cost</strong></td><td class="num"><strong>${formatMoney(r.total_cost)}</strong></td></tr></tfoot>
                </table>
            </div>
        </div>`;

    $("rvPrintBtn").addEventListener("click", () => printReceipt(r));
    $("rvNextBtn")?.addEventListener("click", () => openForm(r.purchase_order_id));
    $("rvVoidBtn")?.addEventListener("click", () => confirmVoid(r));
    showPanel("detail");
}

/** Ask for a reason, then void the receipt (stock back out, order reversed). */
function confirmVoid(r) {
    const overlay = $("rvVoidOverlay");
    const close = () => {
        overlay.classList.remove("open");
        $("rvVoidOk").onclick = null;
        document.removeEventListener("keydown", onKey);
    };
    const onKey = (event) => { if (event.key === "Escape") close(); };

    $("rvVoidTitle").textContent = `Void ${r.gr_number}?`;
    $("rvVoidBody").innerHTML = `
        <dl class="rv-confirm-summary">
            <dt>Purchase order</dt><dd>${escapeHtml(r.po_number)}</dd>
            <dt>Received</dt><dd>${formatDate(r.received_date)} into ${escapeHtml(r.warehouse_name || "—")}</dd>
            <dt>Items</dt><dd>${r.item_count}</dd>
            <dt>Cost</dt><dd>${formatMoney(r.total_cost)}</dd>
        </dl>
        <p class="rv-confirm-note">Use this for a receipt entered by mistake. Everything it put into stock is taken back out,
        and ${escapeHtml(r.po_number)} goes back to waiting for these items. It only works while none of this stock has been
        dispensed, moved or disposed of. The receipt stays on file, marked voided.</p>`;
    $("rvVoidAlert").innerHTML = "";
    $("err-rv_void_reason").textContent = "";
    $("rvVoidReason").value = "";

    $("rvVoidOk").onclick = async () => {
        const reason = $("rvVoidReason").value.trim();
        $("err-rv_void_reason").textContent = "";

        if (!reason) {
            $("err-rv_void_reason").textContent = "Say why this receipt is being voided.";
            $("rvVoidReason").focus();
            return;
        }

        $("rvVoidOk").disabled = true;
        const result = await voidReceipt(r.id, reason);
        $("rvVoidOk").disabled = false;

        if (!result?.success) {
            if (result?.errors?.reason) $("err-rv_void_reason").textContent = result.errors.reason;
            $("rvVoidAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Failed to void the receipt.")}</div>`;
            return;
        }

        close();
        showToast(result.message, "success");
        await openReceipt(r.id);
    };

    $("rvVoidClose").onclick = close;
    $("rvVoidCancel").onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    document.addEventListener("keydown", onKey);

    overlay.classList.add("open");
    $("rvVoidReason").focus();
}

function itemUnit(item) {
    return item.order_unit === "package" ? (item.package_unit_name || "package") : (item.unit_name || "unit");
}

function printReceipt(r) {
    const win = window.open("", "_blank", "width=900,height=1000");

    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print the receiving report.", "error");
        return;
    }

    const buyer = r.buyer || {};

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(r.gr_number)} - Receiving Report</title>
<style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
    .org { font-size: 18px; font-weight: 700; }
    .muted { color: #4b5563; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
    .title table td { padding: 1px 0 1px 12px; text-align: right; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; border-radius: 4px; margin: 16px 0; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; }
    .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; letter-spacing: .4px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #f3f4f6; text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; padding: 7px 8px; border: 1px solid #d1d5db; }
    table.items td { padding: 7px 8px; border: 1px solid #d1d5db; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .notes { margin-top: 14px; white-space: pre-wrap; }
    .flag { display: inline-block; margin-top: 3px; padding: 0 5px; border: 1px solid #b45309; color: #b45309; font-size: 9.5px; font-weight: 700; letter-spacing: .3px; }
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
        <div class="muted">${escapeHtml([buyer.phone, buyer.email].filter(Boolean).join(" · "))}</div>
    </div>
    <div class="title">
        <h1>RECEIVING REPORT</h1>
        ${r.voided_at ? `<div style="color:#b91c1c;font-weight:700;font-size:14px;letter-spacing:1px;">VOIDED ${formatDate(String(r.voided_at).slice(0, 10))}</div><div class="muted">${escapeHtml(r.void_reason || "")}</div>` : ""}
        <table>
            <tr><td class="muted">RR No.</td><td><strong>${escapeHtml(r.gr_number)}</strong></td></tr>
            <tr><td class="muted">Date Received</td><td>${formatDate(r.received_date)}</td></tr>
            <tr><td class="muted">PO No.</td><td>${escapeHtml(r.po_number)}</td></tr>
        </table>
    </div>
</div>

<div class="meta">
    <div><span>Supplier</span>${escapeHtml(r.supplier_name)}${r.supplier_tin ? `<br><span style="display:inline;text-transform:none;">TIN ${escapeHtml(r.supplier_tin)}</span>` : ""}</div>
    <div><span>Received Into</span>${escapeHtml(r.warehouse_name || "—")}</div>
    <div><span>Supplier DR No.</span>${escapeHtml(r.delivery_receipt_no || "—")}</div>
    <div><span>Supplier Invoice No.</span>${escapeHtml(r.invoice_no || "—")}</div>
</div>

<table class="items">
    <thead><tr><th>#</th><th>Item</th><th>Lot / Batch</th><th>Expiry</th><th class="num">Qty Received</th><th class="num">Rejected</th><th>Remarks</th><th class="num">Unit Cost</th><th class="num">Amount</th></tr></thead>
    <tbody>${r.items.map((i) => `
        <tr>
            <td>${i.on_order ? i.line_no : "&ndash;"}</td>
            <td>${escapeHtml(i.drug_name)}${i.supplier_item_code ? `<div class="muted">${escapeHtml(i.supplier_item_code)}</div>` : ""}
                ${i.on_order ? "" : `<div class="flag">NOT ON PO</div>`}
                ${i.over_quantity > 0 ? `<div class="flag">OVER BY ${formatQty(i.over_quantity)} ${escapeHtml(itemUnit(i))}</div>` : ""}</td>
            <td>${escapeHtml(i.lot_number || "")}</td>
            <td>${i.expires_date ? formatDate(i.expires_date) : ""}</td>
            <td class="num">${formatQty(i.quantity)} ${escapeHtml(itemUnit(i))}${i.order_unit === "package" ? `<div class="muted">${formatQty(i.base_quantity)} ${escapeHtml(i.unit_name || "units")}</div>` : ""}</td>
            <td class="num">${i.rejected_quantity > 0 ? formatQty(i.rejected_quantity) : ""}</td>
            <td>${escapeHtml(i.rejection_reason || "")}</td>
            <td class="num">${i.unit_cost != null ? formatMoney(i.unit_cost, 4) : ""}</td>
            <td class="num">${i.line_cost != null ? formatMoney(i.line_cost) : ""}</td>
        </tr>`).join("")}
        <tr><td colspan="8" class="num"><strong>TOTAL</strong></td><td class="num"><strong>${formatMoney(r.total_cost)}</strong></td></tr>
    </tbody>
</table>

${r.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(r.notes)}</div>` : ""}

<div class="signs">
    <div>${r.received_by_name ? `<strong>${escapeHtml(r.received_by_name)}</strong><br>` : ""}Received by</div>
    <div>Inspected / Checked by</div>
    <div>Supplier's Representative</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body>
</html>`);
    win.document.close();
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function formatPrice(value) {
    return String(Number(Number(value).toFixed(4)));
}

function round3(value) {
    return Math.round(Number(value) * 1000) / 1000;
}

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatInput(value) {
    return String(Number(Number(value).toFixed(3)));
}

function isoToday() {
    const d = systemNow();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
