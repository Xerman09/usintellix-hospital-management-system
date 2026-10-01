import {
    fetchPurchaseOrders, fetchPurchaseOrder, fetchPurchaseOrderOptions,
    createPurchaseOrder, updatePurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder
} from "./purchase-orders.service.js?v=1";
import { formatMoney, formatQty, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";

const STATUS_LABELS = { draft: "Draft", submitted: "Submitted", cancelled: "Cancelled" };
const LICENSE_WARNING_DAYS = 60;

let orders = [];
let options = { suppliers: [], warehouses: [], drugs: [], listings: [] };

// Editor state
let editing = null;        // the draft being edited (null = new order)
let lines = [];            // [{ key, drug_id, order_unit, quantity, unit_price, discount_amount, notes, priceManual, discountManual }]
let lineKey = 0;
let expectedManual = false;
let current = null;        // order shown in the detail panel

const $ = (id) => document.getElementById(id);

export async function initPurchaseOrders() {
    $("poSearch").addEventListener("input", renderList);
    $("poStatusFilter").addEventListener("change", renderList);
    $("poSupplierFilter").addEventListener("change", renderList);
    $("poNewBtn").addEventListener("click", () => openEditor());

    document.querySelectorAll("[data-po-back]").forEach((btn) => btn.addEventListener("click", showList));

    setupEditor();
    setupCancelDialog();

    await loadList();
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadList() {
    const result = await fetchPurchaseOrders();

    if (!result.success) {
        orders = [];
        $("poList").innerHTML = `<div class="po-empty">Failed to load purchase orders.</div>`;
        return;
    }

    orders = result.data || [];

    const supplierFilter = $("poSupplierFilter");
    const chosen = supplierFilter.value;
    const suppliers = new Map(orders.map((o) => [o.supplier_id, o.supplier_name]));
    supplierFilter.innerHTML = `<option value="">All suppliers</option>` +
        [...suppliers.entries()].sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join("");
    supplierFilter.value = suppliers.has(Number(chosen)) ? chosen : "";

    renderStats();
    renderList();
}

function renderStats() {
    const month = isoToday().slice(0, 7);

    $("poStatDrafts").textContent = orders.filter((o) => o.status === "draft").length;
    $("poStatOpen").textContent = orders.filter((o) => o.status === "submitted").length;
    $("poStatOverdue").textContent = orders.filter((o) => o.is_overdue).length;
    $("poStatMonth").textContent = formatMoney(orders
        .filter((o) => o.status === "submitted" && String(o.order_date).slice(0, 7) === month)
        .reduce((sum, o) => sum + o.total, 0));
}

function renderList() {
    const term = $("poSearch").value.trim().toLowerCase();
    const status = $("poStatusFilter").value;
    const supplierId = $("poSupplierFilter").value;

    const rows = orders.filter((o) => {
        if (status && o.status !== status) return false;
        if (supplierId && String(o.supplier_id) !== supplierId) return false;
        if (!term) return true;

        return [o.po_number, o.supplier_name, o.supplier_code, o.supplier_reference, o.warehouse_name]
            .some((v) => (v || "").toLowerCase().includes(term));
    });

    $("poCount").textContent = `${rows.length} ${rows.length === 1 ? "order" : "orders"}`;

    if (!rows.length) {
        $("poList").innerHTML = `<div class="po-empty">${orders.length
            ? "No purchase orders match these filters."
            : "No purchase orders yet. Click &ldquo;+ New Purchase Order&rdquo; to create one."}</div>`;
        return;
    }

    $("poList").innerHTML = `
        <div class="po-table-wrap">
            <table class="po-table">
                <thead><tr>
                    <th>PO No.</th><th>Supplier</th><th>Order Date</th><th>Expected</th><th>Deliver To</th>
                    <th class="num">Items</th><th class="num">Total</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>${rows.map((o) => `
                    <tr class="po-row" data-po-open="${o.id}">
                        <td style="white-space:nowrap;"><strong>${escapeHtml(o.po_number)}</strong>
                            ${o.supplier_reference ? `<span class="po-sub">Ref. ${escapeHtml(o.supplier_reference)}</span>` : ""}</td>
                        <td>${escapeHtml(o.supplier_name)}<span class="po-sub">${escapeHtml(o.supplier_code || "")}</span></td>
                        <td style="white-space:nowrap;">${formatDate(o.order_date)}</td>
                        <td style="white-space:nowrap;">${o.expected_date ? formatDate(o.expected_date) : "—"}</td>
                        <td>${escapeHtml(o.warehouse_name || "—")}</td>
                        <td class="num">${o.item_count}</td>
                        <td class="num"><strong>${formatMoney(o.total)}</strong></td>
                        <td style="white-space:nowrap;">${statusBadge(o)}</td>
                        <td><button type="button" class="po-btn small">${o.status === "draft" ? "Edit" : "View"}</button></td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>
    `;

    $("poList").querySelectorAll("[data-po-open]").forEach((row) => {
        row.addEventListener("click", () => openOrder(Number(row.dataset.poOpen)));
    });
}

function statusBadge(o) {
    return `<span class="po-status ${o.status}">${STATUS_LABELS[o.status] || o.status}</span>` +
        (o.is_overdue ? `<span class="po-status overdue" title="Expected ${escapeHtml(formatDate(o.expected_date))}">Overdue</span>` : "");
}

function showPanel(name) {
    $("poListPanel").hidden = name !== "list";
    $("poEditorPanel").hidden = name !== "editor";
    $("poDetailPanel").hidden = name !== "detail";
    document.querySelector(".po-page").scrollIntoView({ block: "start" });
}

async function showList() {
    showPanel("list");
    await loadList();
}

async function openOrder(id) {
    const result = await fetchPurchaseOrder(id);

    if (!result.success) {
        showToast(result.message || "Couldn't open the purchase order.", "error");
        return;
    }

    if (result.data.status === "draft") {
        await openEditor(result.data);
    } else {
        showDetail(result.data);
    }
}

/* ---------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------- */

function setupEditor() {
    $("po_supplier_id").addEventListener("change", onSupplierChange);
    $("po_order_date").addEventListener("change", () => { applyExpectedDate(); });
    $("po_expected_date").addEventListener("input", () => { expectedManual = Boolean($("po_expected_date").value); });
    $("po_shipping_fee").addEventListener("input", renderTotals);

    $("poAddItem").addEventListener("change", () => {
        const drugId = Number($("poAddItem").value);
        $("poAddItem").value = "";
        if (drugId) addLine(drugId);
    });

    $("poAddLowStock").addEventListener("click", addLowStock);

    $("poForm").addEventListener("submit", (event) => {
        event.preventDefault();
        save(true);
    });
    $("poSaveDraft").addEventListener("click", () => save(false));

    $("poDeleteDraft").addEventListener("click", async () => {
        if (!editing || !confirm(`Delete draft ${editing.po_number}? This can't be undone.`)) return;

        const result = await deletePurchaseOrder(editing.id);

        if (!result.success) {
            showEditorAlert(result.message || "Failed to delete the draft.");
            return;
        }

        showToast(result.message || "Draft deleted.", "success");
        await showList();
    });

    // Line edits: update that row's numbers in place so typing keeps focus.
    $("poLines").addEventListener("input", (event) => {
        const row = event.target.closest("[data-line]");
        if (!row) return;

        const line = lines.find((l) => l.key === Number(row.dataset.line));
        const name = event.target.dataset.field;
        if (!line || !name) return;

        line[name] = event.target.value;

        if (name === "unit_price") line.priceManual = true;
        if (name === "discount_amount") line.discountManual = event.target.value !== "";
        if (name === "quantity" || name === "unit_price") applyAutoDiscount(line);

        refreshLine(line);
        renderTotals();
    });

    $("poLines").addEventListener("change", (event) => {
        const row = event.target.closest("[data-line]");
        if (!row || event.target.dataset.field !== "order_unit") return;

        const line = lines.find((l) => l.key === Number(row.dataset.line));
        changeUnit(line, event.target.value);
        renderLines();
    });

    $("poLines").addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove-line]");
        if (remove) {
            lines = lines.filter((l) => l.key !== Number(remove.dataset.removeLine));
            renderLines();
            return;
        }

        const reprice = event.target.closest("[data-reprice-line]");
        if (reprice) {
            const line = lines.find((l) => l.key === Number(reprice.dataset.repriceLine));
            line.priceManual = false;
            line.discountManual = false;
            priceLine(line);
            renderLines();
            return;
        }

        const resetDiscount = event.target.closest("[data-reset-discount]");
        if (resetDiscount) {
            const line = lines.find((l) => l.key === Number(resetDiscount.dataset.resetDiscount));
            line.discountManual = false;
            applyAutoDiscount(line);
            renderLines();
        }
    });
}

/**
 * @param {object} [order]  a draft to edit, or an order to copy (copy: true)
 * @param {boolean} [copy]  start a new order from `order`'s supplier + items
 */
async function openEditor(order = null, copy = false) {
    const result = await fetchPurchaseOrderOptions();

    if (!result.success) {
        showToast(result.message || "Couldn't load suppliers and items.", "error");
        return;
    }

    options = result.data;
    editing = order && !copy ? order : null;
    expectedManual = Boolean(editing?.expected_date);

    clearErrors();
    $("poForm").reset();

    const supplierChoices = [...options.suppliers];
    if (order && !supplierChoices.some((s) => s.id === order.supplier_id)) {
        supplierChoices.push({ id: order.supplier_id, name: `${order.supplier_name} (inactive)`, inactive: true });
    }

    $("po_supplier_id").innerHTML = `<option value="">-- Select a supplier --</option>` +
        supplierChoices.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}${s.code ? ` (${escapeHtml(s.code)})` : ""}</option>`).join("");
    $("po_warehouse_id").innerHTML = `<option value="">-- Select a location --</option>` +
        options.warehouses.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");

    $("poEditorTitle").textContent = editing ? `Edit ${editing.po_number}` : "New Purchase Order";
    $("poEditorSub").textContent = editing
        ? "Draft — not yet sent. Submit it when it's ready to go to the supplier."
        : "Fill in the supplier and items, then save as a draft or submit the order.";
    $("poDeleteDraft").hidden = !editing;

    if (order) {
        $("po_supplier_id").value = order.supplier_id;
        $("po_warehouse_id").value = order.warehouse_id || "";
        $("po_payment_terms").value = order.payment_terms || "";
        $("po_supplier_reference").value = copy ? "" : order.supplier_reference || "";
        $("po_notes").value = order.notes || "";
        $("po_shipping_fee").value = !copy && order.shipping_fee ? order.shipping_fee : "";
        $("po_order_date").value = copy ? isoToday() : order.order_date;
        $("po_expected_date").value = copy ? "" : order.expected_date || "";

        lines = (order.items || []).map((item) => ({
            key: ++lineKey,
            drug_id: item.drug_id,
            order_unit: item.order_unit,
            quantity: String(item.quantity),
            unit_price: String(item.unit_price),
            discount_amount: item.discount_amount ? String(item.discount_amount) : "",
            notes: item.notes || "",
            supplier_item_code: item.supplier_item_code || "",
            priceManual: true,
            discountManual: true
        }));

        // A copy is a fresh order: take today's prices.
        if (copy) {
            lines = lines.filter((l) => drugById(l.drug_id));
            lines.forEach((l) => { l.priceManual = false; l.discountManual = false; priceLine(l); });
        }
    } else {
        $("po_order_date").value = isoToday();
        if (options.warehouses.length === 1) $("po_warehouse_id").value = options.warehouses[0].id;
        lines = [];
    }

    if (copy) expectedManual = false;

    renderSupplierInfo();
    if (!order || copy) applySupplierDefaults(false);
    renderAddOptions();
    renderLines();
    showPanel("editor");
}

function supplierById(id) {
    return options.suppliers.find((s) => s.id === Number(id)) || null;
}

function drugById(id) {
    return options.drugs.find((d) => d.id === Number(id)) || null;
}

function selectedSupplierId() {
    return Number($("po_supplier_id").value) || 0;
}

function listingFor(drugId, supplierId = selectedSupplierId()) {
    return options.listings.find((l) => l.supplier_id === supplierId && l.drug_id === Number(drugId)) || null;
}

function onSupplierChange() {
    clearFieldError("supplier_id");
    applySupplierDefaults(true);
    renderSupplierInfo();
    renderAddOptions();

    // Re-price lines that weren't typed in by hand.
    lines.forEach((line) => {
        if (!line.priceManual) priceLine(line);
        else applyAutoDiscount(line);
    });
    renderLines();
}

/** Payment terms and expected delivery from the supplier's record. */
function applySupplierDefaults(overwriteTerms) {
    const supplier = supplierById(selectedSupplierId());
    if (!supplier) return;

    if (supplier.payment_terms && (overwriteTerms || !$("po_payment_terms").value)) {
        $("po_payment_terms").value = supplier.payment_terms;
    }

    applyExpectedDate();
}

function applyExpectedDate() {
    const supplier = supplierById(selectedSupplierId());
    const orderDate = $("po_order_date").value;

    $("poExpectedHint").textContent = supplier?.lead_time_days != null
        ? `${supplier.name.split(" ")[0]}'s lead time is ${supplier.lead_time_days} day${supplier.lead_time_days === 1 ? "" : "s"}`
        : "";

    if (expectedManual || !supplier || supplier.lead_time_days == null || !orderDate) return;

    const date = new Date(`${orderDate}T00:00:00`);
    date.setDate(date.getDate() + supplier.lead_time_days);
    $("po_expected_date").value = toIso(date);
}

function renderSupplierInfo() {
    const supplier = supplierById(selectedSupplierId());
    const notes = [];

    if (!supplier) {
        $("poSupplierMeta").textContent = selectedSupplierId() ? "This supplier is inactive." : "";
        $("poSupplierNotes").innerHTML = "";
        return;
    }

    const sold = options.listings.filter((l) => l.supplier_id === supplier.id).length;
    $("poSupplierMeta").textContent = [
        supplier.payment_terms ? `Terms: ${supplier.payment_terms}` : null,
        supplier.lead_time_days != null ? `Lead time: ${supplier.lead_time_days} day${supplier.lead_time_days === 1 ? "" : "s"}` : null,
        `${sold} priced product${sold === 1 ? "" : "s"}`
    ].filter(Boolean).join(" · ");

    if (supplier.license_expiry) {
        const days = daysUntil(supplier.license_expiry);

        if (days < 0) {
            notes.push(`<div class="po-note warn">&#9888; This supplier's FDA License to Operate expired on ${escapeHtml(formatDate(supplier.license_expiry))}. Ask for the renewed LTO before ordering.</div>`);
        } else if (days <= LICENSE_WARNING_DAYS) {
            notes.push(`<div class="po-note info">This supplier's LTO expires on ${escapeHtml(formatDate(supplier.license_expiry))} (in ${days} day${days === 1 ? "" : "s"}).</div>`);
        }
    }

    if (!sold) {
        notes.push(`<div class="po-note info">No prices on file for this supplier yet. You can still add items and type the price; add their prices under Pharmacy &gt; Supplier Prices to have them filled in next time.</div>`);
    }

    $("poSupplierNotes").innerHTML = notes.join("");
}

/** The "add an item" picker: this supplier's products first, then everything else. */
function renderAddOptions() {
    const supplierId = selectedSupplierId();
    const onOrder = new Set(lines.map((l) => Number(l.drug_id)));
    const fromSupplier = [];
    const others = [];

    options.drugs.forEach((d) => {
        const listing = supplierId ? listingFor(d.id, supplierId) : null;
        const taken = onOrder.has(d.id);
        const low = d.min_level > 0 && d.on_hand < d.min_level;
        const label = `${d.name}${listing ? ` — ${formatMoney(listing.discounted_price)} / ${basisName(listing.price_basis, d)}` : ""}${low ? " · low stock" : ""}${taken ? " (on this order)" : ""}`;
        const option = `<option value="${d.id}" ${taken ? "disabled" : ""}>${escapeHtml(label)}</option>`;

        (listing ? fromSupplier : others).push(option);
    });

    $("poAddItem").innerHTML = `<option value="">+ Add an item...</option>` +
        (fromSupplier.length ? `<optgroup label="Sold by this supplier">${fromSupplier.join("")}</optgroup>` : "") +
        (others.length ? `<optgroup label="${supplierId ? "Other items (no price on file from this supplier)" : "Items"}">${others.join("")}</optgroup>` : "");

    const lowCount = lowStockCandidates().length;
    $("poAddLowStock").disabled = !lowCount;
    $("poAddLowStock").textContent = lowCount ? `+ Add low-stock items (${lowCount})` : "+ Add low-stock items";
}

function lowStockCandidates() {
    const supplierId = selectedSupplierId();
    if (!supplierId) return [];

    const onOrder = new Set(lines.map((l) => Number(l.drug_id)));

    return options.drugs.filter((d) => d.min_level > 0 && d.on_hand < d.min_level && !onOrder.has(d.id) && listingFor(d.id, supplierId));
}

/** Adds each low-stock item this supplier sells, enough to get back up to its max (or twice its reorder level). */
function addLowStock() {
    const candidates = lowStockCandidates();

    candidates.forEach((d) => {
        const target = d.max_level > d.min_level ? d.max_level : d.min_level * 2;
        const needUnits = Math.max(target - d.on_hand, 1);
        const line = addLine(d.id, { render: false });
        const listing = listingFor(d.id);

        let qty = line.order_unit === "package" && d.package_quantity ? Math.ceil(needUnits / d.package_quantity) : Math.ceil(needUnits);
        const minOrder = listing?.min_order_qty ? minOrderIn(line.order_unit, listing, d) : 0;
        if (minOrder && qty < minOrder) qty = Math.ceil(minOrder);

        line.quantity = String(qty);
        applyAutoDiscount(line);
    });

    renderLines();
    showToast(`Added ${candidates.length} low-stock item${candidates.length === 1 ? "" : "s"}. Check the quantities.`, "success");
}

function addLine(drugId, { render = true } = {}) {
    const drug = drugById(drugId);
    const listing = listingFor(drugId);

    const line = {
        key: ++lineKey,
        drug_id: drugId,
        order_unit: listing ? listing.price_basis : (drug?.package_quantity ? "package" : "unit"),
        quantity: "1",
        unit_price: "",
        discount_amount: "",
        notes: "",
        supplier_item_code: "",
        priceManual: false,
        discountManual: false
    };

    if (line.order_unit === "package" && !drug?.package_quantity) line.order_unit = "unit";

    if (listing?.min_order_qty) {
        line.quantity = String(Math.max(1, Math.ceil(minOrderIn(line.order_unit, listing, drug))));
    }

    priceLine(line);
    lines.push(line);
    clearFieldError("items");

    if (render) {
        renderLines();
        const input = document.querySelector(`[data-line="${line.key}"] [data-field="quantity"]`);
        input?.focus();
        input?.select();
    }

    return line;
}

/** The listing's minimum order expressed in `unit` (unit or package). */
function minOrderIn(unit, listing, drug) {
    return convertQty(listing.min_order_qty, listing.price_basis, unit, drug);
}

function convertQty(qty, from, to, drug) {
    if (from === to) return qty;
    const per = drug?.package_quantity;
    if (!per) return qty;
    return from === "package" ? qty * per : qty / per;
}

/** Price per order unit from this supplier's listing, else the catalog's unit cost. */
function priceLine(line) {
    const drug = drugById(line.drug_id);
    const listing = listingFor(line.drug_id);

    if (listing) {
        line.unit_price = String(round(priceIn(line.order_unit, listing, drug), 4));
        line.supplier_item_code = listing.supplier_item_code || "";
    } else if (drug?.unit_cost != null && !line.priceManual) {
        line.unit_price = String(round(line.order_unit === "package" && drug.package_quantity ? drug.unit_cost * drug.package_quantity : drug.unit_cost, 4));
        line.supplier_item_code = "";
    } else if (!line.priceManual) {
        line.unit_price = "";
        line.supplier_item_code = "";
    }

    applyAutoDiscount(line);
}

/** The listing's list price (before discount) per `unit`. */
function priceIn(unit, listing, drug) {
    if (listing.price_basis === unit) return listing.price;
    const per = drug?.package_quantity;
    if (!per) return listing.price;
    return listing.price_basis === "package" ? listing.price / per : listing.price * per;
}

/**
 * The supplier's running discount, if this line qualifies: a percent
 * off the line, or a peso amount off per unit it's quoted in.
 */
function autoDiscount(line) {
    const drug = drugById(line.drug_id);
    const listing = listingFor(line.drug_id);
    const qty = Number(line.quantity) || 0;
    const gross = round(qty * (Number(line.unit_price) || 0), 2);

    if (!listing || listing.discount_status !== "active" || !(qty > 0)) return { amount: 0, applies: false, listing };

    const qtyInBasis = convertQty(qty, line.order_unit, listing.price_basis, drug);

    if (listing.discount_min_qty && qtyInBasis < listing.discount_min_qty) {
        return { amount: 0, applies: false, listing, short: listing.discount_min_qty };
    }

    const amount = listing.discount_type === "percent"
        ? gross * listing.discount_value / 100
        : listing.discount_value * qtyInBasis;

    return { amount: Math.min(round(amount, 2), gross), applies: true, listing };
}

function applyAutoDiscount(line) {
    if (line.discountManual) return;

    const { amount } = autoDiscount(line);
    line.discount_amount = amount > 0 ? amount.toFixed(2) : "";
}

function changeUnit(line, unit) {
    const drug = drugById(line.drug_id);
    const per = drug?.package_quantity;

    if (unit === line.order_unit) return;

    // Keep the same physical amount and cost when switching units.
    if (per) {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price);
        line.quantity = qty ? String(round(unit === "package" ? qty / per : qty * per, 3)) : line.quantity;
        if (line.unit_price !== "" && !Number.isNaN(price)) {
            line.unit_price = String(round(unit === "package" ? price * per : price / per, 4));
        }
    }

    line.order_unit = unit;
    applyAutoDiscount(line);
}

function lineAmounts(line) {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    const gross = round(qty * price, 2);
    const discount = Math.min(Number(line.discount_amount) || 0, gross);

    return { gross, discount, total: round(gross - discount, 2) };
}

function renderLines() {
    $("poLineCount").textContent = lines.length ? `(${lines.length})` : "";

    if (!lines.length) {
        $("poLines").innerHTML = `<div class="po-lines-empty">No items yet. Pick one from &ldquo;+ Add an item&rdquo; above${selectedSupplierId() ? ", or add the supplier's low-stock items" : ""}.</div>`;
    } else {
        $("poLines").innerHTML = `
            <div class="po-lines-wrap">
                <table class="po-lines">
                    <thead><tr>
                        <th style="width:28px;">#</th><th>Item</th><th class="col-qty">Qty</th><th class="col-unit">Unit</th>
                        <th class="col-price">Price / Unit (&#8369;)</th><th class="col-disc">Discount (&#8369;)</th>
                        <th class="col-amt num">Amount</th><th style="width:34px;"></th>
                    </tr></thead>
                    <tbody>${lines.map(renderLine).join("")}</tbody>
                </table>
            </div>`;
        lines.forEach(refreshLine);
    }

    renderAddOptions();
    renderTotals();
}

function renderLine(line, index) {
    const drug = drugById(line.drug_id);
    const unit = drug?.unit_name || "unit";
    const hasPackage = Boolean(drug?.package_quantity && drug?.package_unit_name);

    return `
        <tr data-line="${line.key}">
            <td>${index + 1}</td>
            <td style="min-width:240px;">
                <div class="po-line-name">${escapeHtml(drug?.name || "Item no longer active")}</div>
                <span class="po-sub" data-cell="meta"></span>
                <div class="po-line-tags" data-cell="tags"></div>
                <span class="form-error" id="err-po_item_${index}_drug_id"></span>
            </td>
            <td class="col-qty">
                <input type="number" min="0" step="any" data-field="quantity" value="${escapeHtml(line.quantity)}" aria-label="Quantity">
                <span class="form-error" id="err-po_item_${index}_quantity"></span>
            </td>
            <td class="col-unit">
                <select data-field="order_unit" aria-label="Unit">
                    <option value="unit" ${line.order_unit === "unit" ? "selected" : ""}>${escapeHtml(capitalize(unit))}</option>
                    ${hasPackage ? `<option value="package" ${line.order_unit === "package" ? "selected" : ""}>${escapeHtml(capitalize(drug.package_unit_name))} of ${formatQty(drug.package_quantity)}</option>` : ""}
                </select>
                <span class="form-error" id="err-po_item_${index}_order_unit"></span>
            </td>
            <td class="col-price">
                <input type="number" min="0" step="any" data-field="unit_price" value="${escapeHtml(line.unit_price)}" placeholder="0.00" aria-label="Price per unit">
                <span class="form-error" id="err-po_item_${index}_unit_price"></span>
            </td>
            <td class="col-disc">
                <input type="number" min="0" step="0.01" data-field="discount_amount" value="${escapeHtml(line.discount_amount)}" placeholder="0.00" aria-label="Discount">
                <span class="form-error" id="err-po_item_${index}_discount_amount"></span>
            </td>
            <td class="col-amt num"><strong data-cell="amount"></strong><span class="po-sub" data-cell="gross"></span></td>
            <td><button type="button" class="po-remove" data-remove-line="${line.key}" title="Remove item" aria-label="Remove item">&times;</button></td>
        </tr>`;
}

/** Recomputes one row's amount, stock line and tags without re-rendering inputs. */
function refreshLine(line) {
    const row = document.querySelector(`[data-line="${line.key}"]`);
    if (!row) return;

    const drug = drugById(line.drug_id);
    const listing = listingFor(line.drug_id);
    const { gross, discount, total } = lineAmounts(line);
    const unit = drug?.unit_name || "unit";
    const qty = Number(line.quantity) || 0;

    // The auto-discount follows quantity changes; show it unless it's being typed in.
    const discountInput = row.querySelector('[data-field="discount_amount"]');
    if (document.activeElement !== discountInput && discountInput.value !== line.discount_amount) {
        discountInput.value = line.discount_amount;
    }

    row.querySelector('[data-cell="amount"]').textContent = formatMoney(total);
    row.querySelector('[data-cell="gross"]').textContent = discount > 0 ? `${formatMoney(gross)} less ${formatMoney(discount)}` : "";

    const meta = [];
    if (line.supplier_item_code) meta.push(`Item ${line.supplier_item_code}`);
    if (drug) {
        meta.push(`On hand: ${formatQty(drug.on_hand)} ${unit}`);
        if (drug.min_level > 0) meta.push(`reorder at ${formatQty(drug.min_level)}`);
        if (line.order_unit === "package" && drug.package_quantity && qty > 0) meta.push(`ordering ${formatQty(round(qty * drug.package_quantity, 3))} ${unit}`);
    }
    row.querySelector('[data-cell="meta"]').textContent = meta.join(" · ");

    const tags = [];
    const auto = autoDiscount(line);

    if (drug && drug.min_level > 0 && drug.on_hand < drug.min_level) tags.push(`<span class="po-tag low">Low stock</span>`);

    if (!listing && selectedSupplierId()) {
        tags.push(`<span class="po-tag info">No price on file from this supplier</span>`);
    } else if (listing) {
        const listPrice = round(priceIn(line.order_unit, listing, drug), 4);

        if (auto.applies && !line.discountManual) {
            tags.push(`<span class="po-tag promo">${escapeHtml(listing.discount_label || "Discount")}: ${listing.discount_type === "percent" ? `${formatQty(listing.discount_value)}% off` : `${formatMoney(listing.discount_value)} off per ${basisName(listing.price_basis, drug)}`} applied</span>`);
        } else if (auto.short && !line.discountManual) {
            tags.push(`<span class="po-tag info">${escapeHtml(listing.discount_label || "Discount")} from ${formatQty(auto.short)} ${basisName(listing.price_basis, drug)}</span>`);
        }

        if (listing.min_order_qty && qty > 0 && convertQty(qty, line.order_unit, listing.price_basis, drug) < listing.min_order_qty) {
            tags.push(`<span class="po-tag warn">Below supplier minimum of ${formatQty(listing.min_order_qty)} ${basisName(listing.price_basis, drug)}</span>`);
        }

        if (line.unit_price !== "" && Math.abs(Number(line.unit_price) - listPrice) > 0.00005) {
            tags.push(`<span class="po-tag info">Price list: ${formatMoney(listPrice, 4)} <button type="button" class="po-btn link" data-reprice-line="${line.key}">Use it</button></span>`);
        }

        if (listing.best_unit_price != null && listing.effective_unit_price != null && listing.effective_unit_price - listing.best_unit_price > 0.00001) {
            tags.push(`<span class="po-tag info">Cheaper at ${escapeHtml(listing.best_supplier_name)}: ${formatMoney(listing.best_unit_price, 4)} / ${escapeHtml(unit)}</span>`);
        }
    }

    if (line.discountManual && Number(line.discount_amount) > 0 && auto.listing?.discount_status === "active") {
        tags.push(`<span class="po-tag info">Discount typed by hand <button type="button" class="po-btn link" data-reset-discount="${line.key}">Reset</button></span>`);
    }

    row.querySelector('[data-cell="tags"]').innerHTML = tags.join("");
}

function renderTotals() {
    let subtotal = 0;
    let discounts = 0;

    lines.forEach((line) => {
        const { gross, discount } = lineAmounts(line);
        subtotal += gross;
        discounts += discount;
    });

    const shipping = Math.max(0, Number($("po_shipping_fee").value) || 0);

    $("poSubtotal").textContent = formatMoney(subtotal);
    $("poDiscountTotal").textContent = discounts > 0 ? `− ${formatMoney(discounts)}` : formatMoney(0);
    $("poTotal").textContent = formatMoney(round(subtotal - discounts + shipping, 2));
}

async function save(submit) {
    clearErrors();

    if (submit) {
        const supplier = $("po_supplier_id").selectedOptions[0]?.textContent || "the supplier";

        if (!lines.length) {
            setFieldError("items", "Add at least one item before submitting the order.");
            showEditorAlert("Add at least one item before submitting the order.");
            return;
        }

        if (!confirm(`Submit this order to ${supplier} for ${$("poTotal").textContent}?\n\nA submitted order is locked; you can still print or cancel it.`)) return;
    }

    const payload = {
        supplier_id: $("po_supplier_id").value,
        order_date: $("po_order_date").value,
        expected_date: $("po_expected_date").value,
        warehouse_id: $("po_warehouse_id").value,
        payment_terms: $("po_payment_terms").value.trim(),
        supplier_reference: $("po_supplier_reference").value.trim(),
        notes: $("po_notes").value.trim(),
        shipping_fee: $("po_shipping_fee").value,
        submit,
        items: lines.map((l) => ({
            drug_id: l.drug_id,
            order_unit: l.order_unit,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_amount: l.discount_amount,
            supplier_item_code: l.supplier_item_code,
            notes: l.notes
        }))
    };

    $("poSubmit").disabled = true;
    $("poSaveDraft").disabled = true;
    const result = editing ? await updatePurchaseOrder(editing.id, payload) : await createPurchaseOrder(payload);
    $("poSubmit").disabled = false;
    $("poSaveDraft").disabled = false;

    if (!result.success) {
        const errors = result.errors && typeof result.errors === "object" ? result.errors : null;

        if (errors) {
            Object.entries(errors).forEach(([name, message]) => {
                const match = name.match(/^items\.(\d+)\.(\w+)$/);
                const el = match ? $(`err-po_item_${match[1]}_${match[2]}`) : $(`err-po_${name}`);
                if (el) el.textContent = message;
            });
            showEditorAlert("Please fix the highlighted fields.");
        } else {
            showEditorAlert(result.message || "Failed to save the purchase order.");
        }
        return;
    }

    showToast(result.message, "success");

    if (submit) {
        const detail = await fetchPurchaseOrder(result.data.id);
        if (detail.success) {
            showDetail(detail.data);
            return;
        }
    } else if (!editing) {
        // Keep editing the new draft so a second save doesn't create another order.
        const detail = await fetchPurchaseOrder(result.data.id);
        if (detail.success) {
            editing = detail.data;
            $("poEditorTitle").textContent = `Edit ${editing.po_number}`;
            $("poEditorSub").textContent = "Draft — not yet sent. Submit it when it's ready to go to the supplier.";
            $("poDeleteDraft").hidden = false;
            return;
        }
    }

    if (!submit) return;
    await showList();
}

function clearErrors() {
    $("poEditorAlert").innerHTML = "";
    document.querySelectorAll("#poForm .form-error").forEach((el) => { el.textContent = ""; });
}

function clearFieldError(name) {
    const el = $(`err-po_${name}`);
    if (el) el.textContent = "";
}

function setFieldError(name, message) {
    const el = $(`err-po_${name}`);
    if (el) el.textContent = message;
}

function showEditorAlert(message) {
    $("poEditorAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $("poEditorAlert").scrollIntoView({ block: "nearest" });
}

/* ---------------------------------------------------------------
 * Detail (submitted / cancelled)
 * ------------------------------------------------------------- */

function showDetail(order) {
    current = order;

    const s = order.supplier || {};
    const info = [
        ["Supplier", `${escapeHtml(order.supplier_name)}${order.supplier_code ? `<span class="po-sub">${escapeHtml(order.supplier_code)}</span>` : ""}`],
        ["Contact", escapeHtml([s.contact_person, s.phone || s.mobile, s.email].filter(Boolean).join(" · ") || "—")],
        ["Order Date", formatDate(order.order_date)],
        ["Expected Delivery", order.expected_date ? `${formatDate(order.expected_date)}${order.is_overdue ? ` <span class="po-status overdue">Overdue</span>` : ""}` : "—"],
        ["Deliver To", escapeHtml(order.warehouse_name || "—")],
        ["Payment Terms", escapeHtml(order.payment_terms || "—")],
        ["Supplier Ref.", escapeHtml(order.supplier_reference || "—")],
        ["Submitted", order.submitted_at ? formatDateTime(order.submitted_at) : "—"]
    ];

    if (order.status === "cancelled") {
        info.push(["Cancelled", `${formatDateTime(order.cancelled_at)}${order.cancel_reason ? `<span class="po-sub">${escapeHtml(order.cancel_reason)}</span>` : ""}`]);
    }

    $("poDetail").innerHTML = `
        <div class="po-card">
            <div class="po-detail-head">
                <div>
                    <h2>${escapeHtml(order.po_number)} ${statusBadge(order)}</h2>
                    <div class="po-sub">${order.item_count} item${order.item_count === 1 ? "" : "s"} · ${formatMoney(order.total)}</div>
                </div>
                <div class="po-header-actions">
                    <button type="button" class="po-btn" id="poPrintBtn">Print / Save PDF</button>
                    <button type="button" class="po-btn" id="poCopyBtn" title="Start a new draft with the same supplier and items">Reorder</button>
                    ${order.status === "submitted" ? `<button type="button" class="po-btn danger" id="poCancelBtn">Cancel Order</button>` : ""}
                </div>
            </div>
            <dl class="po-info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="po-card">
            <div class="po-card-title">Items</div>
            <div class="po-lines-wrap">
                <table class="po-lines" style="min-width:640px;">
                    <thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Price / Unit</th><th class="num">Discount</th><th class="num">Amount</th></tr></thead>
                    <tbody>${order.items.map((item) => `
                        <tr>
                            <td>${item.line_no}</td>
                            <td><span class="po-line-name">${escapeHtml(item.drug_name)}</span>
                                <span class="po-sub">${escapeHtml([item.supplier_item_code ? `Item ${item.supplier_item_code}` : null,
                                    item.order_unit === "package" && item.units_per_package ? `${formatQty(item.base_quantity)} ${item.unit_name || "units"}` : null].filter(Boolean).join(" · "))}</span></td>
                            <td class="num">${formatQty(item.quantity)} ${escapeHtml(itemUnit(item))}</td>
                            <td class="num">${formatMoney(item.unit_price, 4)}</td>
                            <td class="num">${item.discount_amount ? `− ${formatMoney(item.discount_amount)}` : "—"}</td>
                            <td class="num"><strong>${formatMoney(item.line_total)}</strong></td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="po-bottom">
            <div class="po-card">
                <div class="po-card-title">Notes</div>
                <div style="white-space:pre-wrap;color:var(--text-primary);">${escapeHtml(order.notes || "—")}</div>
            </div>
            <div class="po-card">
                <div class="po-totals">
                    <span class="label">Subtotal</span><span class="val">${formatMoney(order.subtotal)}</span>
                    <span class="label">Discounts</span><span class="val">${order.discount_total ? `− ${formatMoney(order.discount_total)}` : formatMoney(0)}</span>
                    <span class="label">Delivery / Other Charges</span><span class="val">${formatMoney(order.shipping_fee)}</span>
                    <span class="label grand">Total</span><span class="val grand">${formatMoney(order.total)}</span>
                </div>
            </div>
        </div>
    `;

    $("poPrintBtn").addEventListener("click", () => printOrder(order));
    $("poCopyBtn").addEventListener("click", () => openEditor(order, true));
    $("poCancelBtn")?.addEventListener("click", openCancelDialog);

    showPanel("detail");
}

function setupCancelDialog() {
    const overlay = $("poCancelOverlay");
    const close = () => overlay.classList.remove("open");

    $("poCancelClose").addEventListener("click", close);
    $("poCancelBack").addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });

    $("poCancelForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        $("err-po_cancel_reason").textContent = "";

        const reason = $("po_cancel_reason").value.trim();

        if (!reason) {
            $("err-po_cancel_reason").textContent = "Say why the order is being cancelled.";
            return;
        }

        $("poCancelConfirm").disabled = true;
        const result = await cancelPurchaseOrder(current.id, reason);
        $("poCancelConfirm").disabled = false;

        if (!result.success) {
            $("err-po_cancel_reason").textContent = result.errors?.cancel_reason || result.message || "Failed to cancel the order.";
            return;
        }

        close();
        showToast(result.message, "success");

        const detail = await fetchPurchaseOrder(current.id);
        if (detail.success) showDetail(detail.data);
    });
}

function openCancelDialog() {
    $("poCancelTitle").textContent = `Cancel ${current.po_number}`;
    $("po_cancel_reason").value = "";
    $("err-po_cancel_reason").textContent = "";
    $("poCancelOverlay").classList.add("open");
    $("po_cancel_reason").focus();
}

/* ---------------------------------------------------------------
 * Printable purchase order
 * ------------------------------------------------------------- */

function printOrder(order) {
    const win = window.open("", "_blank", "width=900,height=1000");

    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print the purchase order.", "error");
        return;
    }

    const buyer = order.buyer || {};
    const s = order.supplier || {};
    const stamp = order.status === "cancelled" ? "CANCELLED" : order.status === "draft" ? "DRAFT" : "";

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(order.po_number)} - Purchase Order</title>
<style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; position: relative; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
    .org { font-size: 18px; font-weight: 700; }
    .muted { color: #4b5563; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
    .title table td { padding: 1px 0 1px 12px; text-align: right; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px 12px; }
    .box h3 { margin: 0 0 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; color: #4b5563; }
    .terms { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 16px; }
    .terms div { padding: 8px 10px; border-right: 1px solid #d1d5db; }
    .terms div:last-child { border-right: none; }
    .terms span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; letter-spacing: .4px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #f3f4f6; text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; padding: 7px 8px; border: 1px solid #d1d5db; }
    table.items td { padding: 7px 8px; border: 1px solid #d1d5db; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: 300px; margin-top: 10px; border-collapse: collapse; }
    .totals td { padding: 4px 8px; }
    .totals tr.grand td { font-size: 15px; font-weight: 700; border-top: 2px solid #111827; padding-top: 8px; }
    .notes { margin-top: 16px; white-space: pre-wrap; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
    .stamp { position: fixed; top: 38%; left: 0; right: 0; text-align: center; font-size: 96px; font-weight: 800; color: rgba(220,38,38,.12); transform: rotate(-24deg); pointer-events: none; }
    @media print { body { padding: 0; } }
</style>
</head>
<body>
${stamp ? `<div class="stamp">${stamp}</div>` : ""}
<div class="head">
    <div>
        <div class="org">${escapeHtml(buyer.name || "")}</div>
        <div class="muted">${escapeHtml(buyer.address || "")}</div>
        <div class="muted">${escapeHtml([buyer.phone, buyer.email].filter(Boolean).join(" · "))}</div>
    </div>
    <div class="title">
        <h1>PURCHASE ORDER</h1>
        <table>
            <tr><td class="muted">PO No.</td><td><strong>${escapeHtml(order.po_number)}</strong></td></tr>
            <tr><td class="muted">Date</td><td>${formatDate(order.order_date)}</td></tr>
            ${order.supplier_reference ? `<tr><td class="muted">Your Ref.</td><td>${escapeHtml(order.supplier_reference)}</td></tr>` : ""}
        </table>
    </div>
</div>

<div class="parties">
    <div class="box">
        <h3>Supplier</h3>
        <strong>${escapeHtml(order.supplier_name)}</strong><br>
        ${s.address ? `${escapeHtml(s.address)}<br>` : ""}
        ${s.contact_person ? `Attn: ${escapeHtml(s.contact_person)}<br>` : ""}
        ${escapeHtml([s.phone, s.mobile, s.email].filter(Boolean).join(" · "))}
        ${s.tin ? `<br>TIN: ${escapeHtml(s.tin)}` : ""}
        ${s.license_number ? `<br>LTO: ${escapeHtml(s.license_number)}` : ""}
    </div>
    <div class="box">
        <h3>Deliver To</h3>
        <strong>${escapeHtml(buyer.name || "")}</strong><br>
        ${order.warehouse_name ? `${escapeHtml(order.warehouse_name)}<br>` : ""}
        ${escapeHtml(buyer.address || "")}
    </div>
</div>

<div class="terms">
    <div><span>Payment Terms</span>${escapeHtml(order.payment_terms || "—")}</div>
    <div><span>Expected Delivery</span>${order.expected_date ? formatDate(order.expected_date) : "—"}</div>
    <div><span>Items</span>${order.item_count}</div>
    <div><span>Status</span>${STATUS_LABELS[order.status] || order.status}</div>
</div>

<table class="items">
    <thead><tr><th style="width:30px;">#</th><th>Item Code</th><th>Description</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit Price</th><th class="num">Discount</th><th class="num">Amount</th></tr></thead>
    <tbody>${order.items.map((item) => `
        <tr>
            <td>${item.line_no}</td>
            <td>${escapeHtml(item.supplier_item_code || "")}</td>
            <td>${escapeHtml(item.drug_name)}${item.order_unit === "package" && item.units_per_package ? `<div class="muted">${formatQty(item.units_per_package)} ${escapeHtml(item.unit_name || "units")} per ${escapeHtml(item.package_unit_name || "package")}</div>` : ""}</td>
            <td class="num">${formatQty(item.quantity)}</td>
            <td>${escapeHtml(itemUnit(item))}</td>
            <td class="num">${formatMoney(item.unit_price, 4)}</td>
            <td class="num">${item.discount_amount ? formatMoney(item.discount_amount) : ""}</td>
            <td class="num">${formatMoney(item.line_total)}</td>
        </tr>`).join("")}
    </tbody>
</table>

<table class="totals">
    <tr><td>Subtotal</td><td class="num">${formatMoney(order.subtotal)}</td></tr>
    ${order.discount_total ? `<tr><td>Less: Discounts</td><td class="num">(${formatMoney(order.discount_total)})</td></tr>` : ""}
    ${order.shipping_fee ? `<tr><td>Delivery / Other Charges</td><td class="num">${formatMoney(order.shipping_fee)}</td></tr>` : ""}
    <tr class="grand"><td>TOTAL</td><td class="num">${formatMoney(order.total)}</td></tr>
</table>

${order.notes ? `<div class="notes"><strong>Notes / Instructions:</strong><br>${escapeHtml(order.notes)}</div>` : ""}

<div class="signs">
    <div>Prepared by</div>
    <div>Approved by</div>
    <div>Supplier's Conforme / Date</div>
</div>
<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script>
</body>
</html>`);
    win.document.close();
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

function itemUnit(item) {
    return item.order_unit === "package" ? (item.package_unit_name || "package") : (item.unit_name || "unit");
}

function basisName(basis, drug) {
    return basis === "package" ? (drug?.package_unit_name || "package") : (drug?.unit_name || "unit");
}

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function daysUntil(isoDate) {
    const target = new Date(`${String(isoDate).slice(0, 10)}T00:00:00`);
    const today = new Date(`${isoToday()}T00:00:00`);
    return Math.round((target - today) / 86400000);
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toIso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isoToday() {
    return toIso(new Date());
}
