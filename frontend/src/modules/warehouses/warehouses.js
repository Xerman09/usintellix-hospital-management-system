import {
    fetchWarehouses, fetchWarehouseOptions, fetchStockCheck, saveStockLevel, removeStockLevel,
    createWarehouse, updateWarehouse, deleteWarehouse
} from "./warehouses.service.js?v=2";
import { showToast } from "../../core/toast.js";
import { getUser } from "../../core/session.js";

// Adding / editing locations and their stock levels is admin-only (the
// server enforces it); everyone else can look and run the stock check.
const canManage = () => getUser()?.role === "admin";

const STATUS_LABELS = { out: "Out", low: "Low", ok: "OK", over: "Over max", no_level: "No minimum set" };

let facilities = [];
let warehouses = [];
let formOptions = null;
let stock = null;       // current stock check
let stockLocationId = null;

const $ = (id) => document.getElementById(id);

export async function initWarehouses() {
    const overlay = $("whModalOverlay");

    $("whAddBtn").hidden = !canManage();
    $("whAddBtn").addEventListener("click", () => openModal(null));
    $("whCloseModal").addEventListener("click", closeModal);
    $("whCancelBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    $("whForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveWarehouse();
    });

    $("wh_custodian_user_id").addEventListener("change", syncAlternateOptions);

    $("whBackBtn").addEventListener("click", async () => {
        showPanel("list");
        await loadWarehouses();
    });
    $("whStockEditBtn").addEventListener("click", () => {
        const location = warehouses.find((w) => w.id === stockLocationId);
        if (location) openModal(location);
    });
    $("whStockSearch").addEventListener("input", renderStock);
    $("whStockFilter").addEventListener("change", renderStock);
    $("whAddLevel").addEventListener("change", () => {
        const drugId = Number($("whAddLevel").value);
        $("whAddLevel").value = "";
        if (drugId) addLevelRow(drugId);
    });

    await loadWarehouses();
}

/* ---------------------------------------------------------------
 * List
 * ------------------------------------------------------------- */

async function loadWarehouses() {
    $("whList").innerHTML = `<div class="wh-empty">Loading...</div>`;

    const result = await fetchWarehouses();

    if (!result?.success) {
        $("whList").innerHTML = `<div class="wh-empty">Couldn't load storage locations.<span class="wh-sub">${escapeHtml(result?.message || "")}</span></div>`;
        return;
    }

    warehouses = result.data.warehouses || [];
    facilities = result.data.facilities || [];

    const active = warehouses.filter((w) => w.is_active);
    $("whStatActive").textContent = active.length;
    $("whStatNoCustodian").textContent = active.filter((w) => !w.custodian_user_id).length;
    $("whStatBelowMin").textContent = active.reduce((sum, w) => sum + (w.below_min_count || 0), 0);
    $("whStatNoLevels").textContent = active.filter((w) => !w.levels_count).length;

    renderTable();
}

function renderTable() {
    if (!warehouses.length) {
        $("whList").innerHTML = `<div class="wh-empty">No storage locations yet${canManage() ? ` &mdash; click &ldquo;+ Add Storage Location&rdquo; to create one` : ""}.</div>`;
        return;
    }

    $("whList").innerHTML = `
        <div class="wh-table-wrap">
            <table class="wh-table">
                <thead><tr>
                    <th>Location</th><th>Department</th><th>Custodian</th><th>Minimum Stock</th><th class="num">Lots</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>${warehouses.map((w) => `
                    <tr class="${w.is_active ? "" : "is-inactive"}">
                        <td>
                            <span class="wh-name">${escapeHtml(w.name)}</span>${w.code ? ` <span class="wh-sub" style="display:inline;">&middot; ${escapeHtml(w.code)}</span>` : ""}
                            <span class="wh-sub">${escapeHtml([w.location_type, w.physical_location, w.facility_name].filter(Boolean).join(" · ") || "—")}</span>
                        </td>
                        <td>${escapeHtml(w.department_name || "—")}</td>
                        <td>${w.custodian_name
                            ? `${escapeHtml(w.custodian_name)}${w.alternate_custodian_name ? `<span class="wh-sub">Alternate: ${escapeHtml(w.alternate_custodian_name)}</span>` : ""}`
                            : `<span class="wh-badge missing">Not assigned</span>`}</td>
                        <td>${w.levels_count
                            ? `${w.levels_count} item${w.levels_count === 1 ? "" : "s"} tracked
                               ${w.below_min_count ? `<span class="wh-badge low" style="margin-left:4px;">${w.below_min_count} below minimum</span>` : `<span class="wh-badge ok" style="margin-left:4px;">All OK</span>`}`
                            : `<span class="wh-sub" style="margin:0;">Not set</span>`}</td>
                        <td class="num">${w.lot_count}</td>
                        <td><span class="wh-badge ${w.is_active ? "active" : "inactive"}">${w.is_active ? "Active" : "Inactive"}</span></td>
                        <td>
                            <div class="wh-actions">
                                <button type="button" class="wh-btn small primary" data-stock-id="${w.id}">Stock Check</button>
                                ${canManage() ? `
                                    <button type="button" class="wh-btn small" data-edit-id="${w.id}">Edit</button>
                                    <button type="button" class="wh-btn small danger" data-delete-id="${w.id}">Delete</button>` : ""}
                            </div>
                        </td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    $("whList").querySelectorAll("[data-stock-id]").forEach((btn) => {
        btn.addEventListener("click", () => openStockCheck(Number(btn.dataset.stockId)));
    });
    $("whList").querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(warehouses.find((w) => w.id === Number(btn.dataset.editId))));
    });
    $("whList").querySelectorAll("[data-delete-id]").forEach((btn) => {
        btn.addEventListener("click", () => removeWarehouse(Number(btn.dataset.deleteId)));
    });
}

function showPanel(name) {
    $("whListPanel").hidden = name !== "list";
    $("whStockPanel").hidden = name !== "stock";
    document.querySelector(".wh-page").scrollIntoView({ block: "start" });
}

/* ---------------------------------------------------------------
 * Add / edit
 * ------------------------------------------------------------- */

async function openModal(warehouse) {
    if (!formOptions) {
        const result = await fetchWarehouseOptions();

        if (!result?.success) {
            showToast(result?.message || "Couldn't load departments and staff.", "error");
            return;
        }

        formOptions = result.data;
    }

    $("whFormAlert").innerHTML = "";
    document.querySelectorAll("#whForm .form-error").forEach((el) => { el.textContent = ""; });

    $("wh_location_type").innerHTML = `<option value="">-- Select a type --</option>` +
        formOptions.location_types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    $("wh_facility_id").innerHTML = `<option value="">N/A</option>` +
        facilities.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");

    const withStock = formOptions.departments.filter((d) => d.has_medication_inventory);
    const others = formOptions.departments.filter((d) => !d.has_medication_inventory);
    $("wh_department_id").innerHTML = `<option value="">-- Select a department --</option>` +
        (withStock.length ? `<optgroup label="Departments that keep medicine stock">${withStock.map(deptOption).join("")}</optgroup>` : "") +
        (others.length ? `<optgroup label="${withStock.length ? "Other departments" : "Departments"}">${others.map(deptOption).join("")}</optgroup>` : "");

    $("wh_custodian_user_id").innerHTML = `<option value="">-- Select a staff member --</option>` + formOptions.staff.map(staffOption).join("");

    $("whModalTitle").textContent = warehouse ? `Edit ${warehouse.name}` : "Add Storage Location";
    $("wh_id").value = warehouse ? warehouse.id : "";
    $("wh_name").value = warehouse?.name || "";
    $("wh_code").value = warehouse?.code || "";
    $("wh_location_type").value = warehouse?.location_type || "";
    $("wh_physical_location").value = warehouse?.physical_location || "";
    $("wh_facility_id").value = warehouse?.facility_id || "";
    $("wh_department_id").value = warehouse?.department_id || "";
    $("wh_custodian_user_id").value = warehouse?.custodian_user_id || "";
    $("wh_notes").value = warehouse?.notes || "";
    syncAlternateOptions();
    $("wh_alternate_custodian_user_id").value = warehouse?.alternate_custodian_user_id || "";

    $("whActiveRow").hidden = !warehouse;
    $("wh_is_active").checked = warehouse ? Boolean(warehouse.is_active) : true;

    $("whModalOverlay").classList.add("open");
    $("wh_name").focus();
}

function deptOption(d) {
    return `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
}

function staffOption(s) {
    const meta = [s.role ? capitalize(s.role) : null, s.department_name].filter(Boolean).join(", ");
    return `<option value="${s.id}">${escapeHtml(s.name)}${meta ? ` (${escapeHtml(meta)})` : ""}</option>`;
}

/** The alternate can't be the custodian, and needs a custodian first. */
function syncAlternateOptions() {
    const custodian = $("wh_custodian_user_id").value;
    const select = $("wh_alternate_custodian_user_id");
    const current = select.value;

    select.innerHTML = `<option value="">${custodian ? "-- None --" : "-- Choose the custodian first --"}</option>` +
        (custodian ? formOptions.staff.filter((s) => String(s.id) !== custodian).map(staffOption).join("") : "");
    select.disabled = !custodian;
    select.value = current !== custodian ? current : "";
}

function closeModal() {
    $("whModalOverlay").classList.remove("open");
}

async function saveWarehouse() {
    $("whFormAlert").innerHTML = "";
    document.querySelectorAll("#whForm .form-error").forEach((el) => { el.textContent = ""; });

    const id = $("wh_id").value;
    const details = {
        name: $("wh_name").value.trim(),
        code: $("wh_code").value.trim(),
        location_type: $("wh_location_type").value,
        physical_location: $("wh_physical_location").value.trim(),
        facility_id: $("wh_facility_id").value,
        department_id: $("wh_department_id").value,
        custodian_user_id: $("wh_custodian_user_id").value,
        alternate_custodian_user_id: $("wh_alternate_custodian_user_id").value,
        notes: $("wh_notes").value.trim()
    };

    if (id) details.is_active = $("wh_is_active").checked;

    $("whSaveBtn").disabled = true;
    const result = id ? await updateWarehouse(Number(id), details) : await createWarehouse(details);
    $("whSaveBtn").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;

        if (errors) {
            Object.entries(errors).forEach(([field, message]) => {
                const el = $(`err-wh_${field}`);
                if (el) el.textContent = message;
            });
        }

        $("whFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(errors ? "Please fix the highlighted fields." : (result?.message || "Failed to save the storage location."))}</div>`;
        return;
    }

    closeModal();
    showToast(result.message || "Saved.", "success");
    await loadWarehouses();

    if (!$("whStockPanel").hidden && stockLocationId) await openStockCheck(stockLocationId);
}

async function removeWarehouse(id) {
    const location = warehouses.find((w) => w.id === id);
    if (!location) return;

    const ok = await confirmDialog(
        `Delete ${location.name}?`,
        `<p style="margin:0 0 8px;">It will no longer appear when receiving, stocking or transferring items.</p>
         <p style="margin:0;color:var(--text-muted);font-size:12.5px;">Lots already stored there stay on record${location.lot_count ? ` (${location.lot_count} lot${location.lot_count === 1 ? "" : "s"})` : ""}.</p>`
    );
    if (!ok) return;

    const result = await deleteWarehouse(id);

    if (!result?.success) {
        showToast(result?.message || "Failed to delete the storage location.", "error");
        return;
    }

    showToast(result.message || "Deleted.", "success");
    await loadWarehouses();
}

/* ---------------------------------------------------------------
 * Stock check
 * ------------------------------------------------------------- */

async function openStockCheck(id) {
    const result = await fetchStockCheck(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't load the stock check.", "error");
        return;
    }

    stock = result.data;
    stockLocationId = id;
    const w = stock.location;

    $("whStockTitle").textContent = `Stock Check — ${w.name}`;
    $("whStockSub").textContent = "What this location has on hand compared with the minimum it should keep.";
    $("whStockEditBtn").hidden = !canManage();
    $("whAddLevel").hidden = !canManage();

    $("whStockInfo").innerHTML = [
        ["Type", escapeHtml(w.location_type || "—")],
        ["Where", escapeHtml(w.physical_location || "—")],
        ["Department", escapeHtml(w.department_name || "—")],
        ["Custodian", w.custodian_name
            ? `${escapeHtml(w.custodian_name)}${w.alternate_custodian_name ? `<span class="wh-sub">Alternate: ${escapeHtml(w.alternate_custodian_name)}</span>` : ""}`
            : `<span class="wh-badge missing">Not assigned</span>`],
        ["Notes", escapeHtml(w.notes || "—")]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

    const s = stock.summary;
    $("whStockStats").innerHTML = `
        <div class="wh-stat"><strong>${s.tracked}</strong><span>Items with a minimum</span></div>
        <div class="wh-stat bad"><strong>${s.out}</strong><span>Out of stock</span></div>
        <div class="wh-stat warn"><strong>${s.low}</strong><span>Below minimum</span></div>
        <div class="wh-stat"><strong>${s.no_level}</strong><span>In stock, no minimum set</span></div>`;

    const tracked = new Set(stock.items.filter((i) => i.min_level !== null).map((i) => i.drug_id));
    $("whAddLevel").innerHTML = `<option value="">+ Set a minimum for an item...</option>` +
        stock.drugs.filter((d) => !tracked.has(d.id))
            .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");

    $("whStockFilter").value = s.out || s.low ? "attention" : "";
    $("whStockSearch").value = "";
    renderStock();
    showPanel("stock");
}

/** Adds an item to the list with empty minimum / maximum, ready to fill in. */
function addLevelRow(drugId) {
    const drug = stock.drugs.find((d) => d.id === drugId);
    if (!drug) return;

    if (!stock.items.some((i) => i.drug_id === drugId)) {
        stock.items.push({
            drug_id: drug.id, drug_name: drug.name, unit_name: drug.unit_name, on_hand: 0, lot_count: 0, next_expiry: null,
            min_level: null, max_level: null, suggested_qty: 0, catalog_reorder_level: drug.catalog_reorder_level,
            status: "no_level", is_new: true
        });
    }

    $("whStockFilter").value = "";
    $("whStockSearch").value = drug.name;
    renderStock();
    document.querySelector(`[data-level-drug="${drugId}"] [data-level="min"]`)?.focus();
}

function renderStock() {
    const term = $("whStockSearch").value.trim().toLowerCase();
    const filter = $("whStockFilter").value;
    const manage = canManage();

    const items = stock.items.filter((i) => {
        if (term && !i.drug_name.toLowerCase().includes(term)) return false;
        if (filter === "attention") return i.status === "out" || i.status === "low";
        if (filter) return i.status === filter;
        return true;
    });

    // Most urgent first.
    const order = { out: 0, low: 1, no_level: 2, over: 3, ok: 4 };
    items.sort((a, b) => (order[a.status] - order[b.status]) || a.drug_name.localeCompare(b.drug_name));

    if (!items.length) {
        $("whStockList").innerHTML = `<div class="wh-empty">${stock.items.length
            ? (filter === "attention" ? "Nothing is out or below its minimum here. &#10003;" : "No items match.")
            : `Nothing is stocked here and no minimums are set yet.${manage ? " Use &ldquo;+ Set a minimum for an item&rdquo; to start." : ""}`}</div>`;
        return;
    }

    $("whStockList").innerHTML = `
        <div class="wh-table-wrap">
            <table class="wh-table">
                <thead><tr>
                    <th>Item</th><th class="num">On Hand</th><th>Minimum</th><th>Maximum</th><th>Status</th><th class="num">Suggested Order</th>${manage ? "<th></th>" : ""}
                </tr></thead>
                <tbody>${items.map((i) => {
                    const unit = escapeHtml(i.unit_name || "units");
                    return `
                    <tr data-level-drug="${i.drug_id}">
                        <td>
                            <span class="wh-name" style="font-weight:600;">${escapeHtml(i.drug_name)}</span>
                            <span class="wh-sub">${[
                                i.lot_count ? `${i.lot_count} lot${i.lot_count === 1 ? "" : "s"}` : null,
                                i.next_expiry ? `next expiry ${formatDate(i.next_expiry)}` : null,
                                i.catalog_reorder_level ? `catalog reorder level ${formatQty(i.catalog_reorder_level)}` : null
                            ].filter(Boolean).join(" · ") || "&nbsp;"}</span>
                        </td>
                        <td class="num"><strong>${formatQty(i.on_hand)}</strong> ${unit}</td>
                        <td class="wh-level-cell">${manage
                            ? `<input type="number" min="0" step="any" class="wh-level-input" data-level="min" value="${i.min_level ?? ""}" placeholder="${i.catalog_reorder_level || ""}" aria-label="Minimum">
                               <span class="form-error" data-level-error="min_level"></span>`
                            : (i.min_level !== null ? `${formatQty(i.min_level)} ${unit}` : "—")}</td>
                        <td class="wh-level-cell">${manage
                            ? `<input type="number" min="0" step="any" class="wh-level-input" data-level="max" value="${i.max_level ?? ""}" placeholder="Optional" aria-label="Maximum">
                               <span class="form-error" data-level-error="max_level"></span>`
                            : (i.max_level !== null ? `${formatQty(i.max_level)} ${unit}` : "—")}</td>
                        <td><span class="wh-badge ${i.status}">${STATUS_LABELS[i.status]}</span></td>
                        <td class="num">${i.suggested_qty > 0 ? `<strong>${formatQty(i.suggested_qty)}</strong> ${unit}` : "—"}</td>
                        ${manage ? `<td><div class="wh-actions">
                            <button type="button" class="wh-btn small primary" data-level-save>Save</button>
                            ${i.min_level !== null ? `<button type="button" class="wh-btn small" data-level-remove title="Stop checking this item here">Remove</button>` : ""}
                        </div></td>` : ""}
                    </tr>`;
                }).join("")}
                </tbody>
            </table>
        </div>`;

    $("whStockList").querySelectorAll("[data-level-save]").forEach((btn) => {
        btn.addEventListener("click", () => saveLevel(btn.closest("tr")));
    });
    $("whStockList").querySelectorAll("[data-level-remove]").forEach((btn) => {
        btn.addEventListener("click", () => removeLevel(btn.closest("tr")));
    });
    $("whStockList").querySelectorAll(".wh-level-input").forEach((input) => {
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                saveLevel(input.closest("tr"));
            }
        });
    });
}

async function saveLevel(row) {
    const drugId = Number(row.dataset.levelDrug);
    row.querySelectorAll("[data-level-error]").forEach((el) => { el.textContent = ""; });

    const result = await saveStockLevel(stockLocationId, {
        drug_id: drugId,
        min_level: row.querySelector('[data-level="min"]').value,
        max_level: row.querySelector('[data-level="max"]').value
    });

    if (!result?.success) {
        const errors = result?.errors || {};
        Object.entries(errors).forEach(([field, message]) => {
            const el = row.querySelector(`[data-level-error="${field}"]`);
            if (el) el.textContent = message;
        });
        if (!Object.keys(errors).length) showToast(result?.message || "Failed to save.", "error");
        return;
    }

    showToast(result.message, "success");
    await refreshStockKeepingView();
}

async function removeLevel(row) {
    const drugId = Number(row.dataset.levelDrug);
    const item = stock.items.find((i) => i.drug_id === drugId);

    const ok = await confirmDialog(
        `Stop checking ${item?.drug_name || "this item"} here?`,
        `<p style="margin:0;">Its minimum and maximum for ${escapeHtml(stock.location.name)} will be removed. Stock on hand isn't affected.</p>`,
        "Remove"
    );
    if (!ok) return;

    const result = await removeStockLevel(stockLocationId, drugId);

    if (!result?.success) {
        showToast(result?.message || "Failed to remove.", "error");
        return;
    }

    showToast(result.message, "success");
    await refreshStockKeepingView();
}

/** Reload the stock check but keep the search / filter the user had. */
async function refreshStockKeepingView() {
    const term = $("whStockSearch").value;
    const filter = $("whStockFilter").value;
    await openStockCheck(stockLocationId);
    $("whStockSearch").value = term;
    $("whStockFilter").value = filter;
    renderStock();
}

/* ---------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

/** In-app confirmation (instead of the browser's confirm()). */
function confirmDialog(title, body, confirmLabel = "Delete") {
    const overlay = $("whConfirmOverlay");

    $("whConfirmTitle").textContent = title;
    $("whConfirmBody").innerHTML = body;
    $("whConfirmOk").textContent = confirmLabel;

    return new Promise((resolve) => {
        const finish = (value) => {
            overlay.classList.remove("open");
            $("whConfirmOk").removeEventListener("click", onOk);
            $("whConfirmCancel").removeEventListener("click", onCancel);
            $("whConfirmClose").removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onBackdrop = (event) => { if (event.target === overlay) finish(false); };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("whConfirmOk").addEventListener("click", onOk);
        $("whConfirmCancel").addEventListener("click", onCancel);
        $("whConfirmClose").addEventListener("click", onCancel);
        overlay.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        $("whConfirmOk").focus();
    });
}

function formatQty(value) {
    const num = Number(value);
    return Number.isInteger(num) ? num.toLocaleString() : String(Number(num.toFixed(3)));
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
