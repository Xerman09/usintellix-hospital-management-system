import {
    fetchDrugInventory, fetchDrugInventoryOptions, createDrug, transferDrugLot
} from "./drug-inventory.service.js";
import { showToast } from "../../core/toast.js";

let allRows = [];
let filteredRows = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";

let options = { warehouses: [], facilities: [], product_types: [] };
let activeTransferLot = null;

export async function initDrugInventory() {
    await loadOptions();

    document.getElementById("diFacilityFilter").addEventListener("change", loadInventory);
    document.getElementById("diWarehouseFilter").addEventListener("change", loadInventory);
    document.getElementById("diProductTypeFilter").addEventListener("change", loadInventory);
    document.getElementById("diShowEmptyLots").addEventListener("change", loadInventory);
    document.getElementById("diShowInactive").addEventListener("change", loadInventory);
    document.getElementById("diRefreshBtn").addEventListener("click", loadInventory);

    document.getElementById("diPageSize").addEventListener("change", (event) => {
        pageSize = Number(event.target.value);
        currentPage = 1;
        render();
    });

    document.getElementById("diSearchInput").addEventListener("input", (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        currentPage = 1;
        applySearch();
        render();
    });

    setupAddDrugModal();
    setupTransferModal();

    await loadInventory();
}

async function loadOptions() {
    const result = await fetchDrugInventoryOptions();
    options = result.success ? result.data : { warehouses: [], facilities: [], product_types: [] };

    const facilityFilter = document.getElementById("diFacilityFilter");
    const warehouseFilter = document.getElementById("diWarehouseFilter");
    const productTypeFilter = document.getElementById("diProductTypeFilter");
    const facilityField = document.getElementById("di_facility_id");
    const warehouseField = document.getElementById("di_warehouse_id");
    const tranFacilityField = document.getElementById("di_tran_facility_id");
    const tranWarehouseField = document.getElementById("di_tran_warehouse_id");
    const productTypeField = document.getElementById("di_product_type");

    options.facilities.forEach((f) => {
        facilityFilter.appendChild(new Option(f.name, f.id));
        facilityField.appendChild(new Option(f.name, f.id));
        tranFacilityField.appendChild(new Option(f.name, f.id));
    });

    options.warehouses.forEach((w) => {
        warehouseFilter.appendChild(new Option(w.name, w.id));
        warehouseField.appendChild(new Option(w.name, w.id));
        tranWarehouseField.appendChild(new Option(w.name, w.id));
    });

    options.product_types.forEach((t) => {
        productTypeFilter.appendChild(new Option(t, t));
        productTypeField.appendChild(new Option(t, t));
    });
}

async function loadInventory() {
    const tbody = document.getElementById("diTableBody");
    tbody.innerHTML = `<tr><td colspan="13" class="di-empty-state">Loading...</td></tr>`;

    const result = await fetchDrugInventory({
        facility_id: document.getElementById("diFacilityFilter").value,
        warehouse_id: document.getElementById("diWarehouseFilter").value,
        product_type: document.getElementById("diProductTypeFilter").value,
        show_empty_lots: document.getElementById("diShowEmptyLots").checked,
        show_inactive: document.getElementById("diShowInactive").checked
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="13" class="di-empty-state">Failed to load inventory.</td></tr>`;
        return;
    }

    allRows = result.data || [];
    currentPage = 1;
    applySearch();
    render();
}

function applySearch() {
    filteredRows = !searchTerm ? allRows : allRows.filter((row) => [
        row.name, row.ndc, row.form, row.lot_number, row.facility_name, row.warehouse_name, row.product_type
    ].some((field) => (field || "").toLowerCase().includes(searchTerm)));
}

function render() {
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);

    renderTable(pageRows);
    renderFooter(total, start, pageRows.length);
    renderPagination(totalPages);
}

function renderTable(rows) {
    const tbody = document.getElementById("diTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="13" class="di-empty-state">No inventory records match.</td></tr>`;
        return;
    }

    const today = new Date().toISOString().slice(0, 10);

    tbody.innerHTML = rows.map((row) => {
        const expired = row.expires_date && row.expires_date.slice(0, 10) < today;

        return `
            <tr>
                <td class="di-drug-name">${escapeHtml(row.name)}</td>
                <td>${row.is_active ? "Yes" : "No"}</td>
                <td>${row.is_consumable ? "Yes" : "No"}</td>
                <td>${escapeHtml(row.ndc || "-")}</td>
                <td>${escapeHtml(row.form || "-")}</td>
                <td>${row.size != null ? row.size : "-"}</td>
                <td>${escapeHtml(row.unit || "-")}</td>
                <td><button type="button" class="di-tran-btn" data-tran-lot="${row.lot_id}">Tran</button></td>
                <td>${escapeHtml(row.lot_number)}</td>
                <td>${escapeHtml(row.facility_name || "N/A")}</td>
                <td>${escapeHtml(row.warehouse_name)}</td>
                <td>${formatQuantity(row.quantity_on_hand)}</td>
                <td class="${expired ? "di-expired" : ""}">${row.expires_date ? formatDate(row.expires_date) : "-"}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-tran-lot]").forEach((btn) => {
        btn.addEventListener("click", () => openTransferModal(Number(btn.getAttribute("data-tran-lot"))));
    });
}

function renderFooter(total, start, shown) {
    document.getElementById("diFooterInfo").textContent = total
        ? `Showing ${start + 1} to ${start + shown} of ${total} entries`
        : "Showing 0 entries";
}

function renderPagination(totalPages) {
    const wrap = document.getElementById("diPagination");

    let html = `<button type="button" class="di-page-btn" id="diPrevPage" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

    for (let p = 1; p <= totalPages; p++) {
        html += `<button type="button" class="di-page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }

    html += `<button type="button" class="di-page-btn" id="diNextPage" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => { currentPage = Number(btn.getAttribute("data-page")); render(); });
    });

    document.getElementById("diPrevPage")?.addEventListener("click", () => { currentPage--; render(); });
    document.getElementById("diNextPage")?.addEventListener("click", () => { currentPage++; render(); });
}

function setupAddDrugModal() {
    const overlay = document.getElementById("diAddDrugModalOverlay");
    const form = document.getElementById("diAddDrugForm");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diAddDrugBtn").addEventListener("click", () => {
        form.reset();
        document.getElementById("di_lot_number").value = "1";
        document.getElementById("di_quantity_on_hand").value = "0";
        document.getElementById("diAddDrugAlert").innerHTML = "";
        document.querySelectorAll("#diAddDrugForm .form-error").forEach((el) => { el.textContent = ""; });
        overlay.classList.add("open");
    });

    document.getElementById("diCloseAddDrugModal").addEventListener("click", closeModal);
    document.getElementById("diCancelAddDrug").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("diAddDrugAlert").innerHTML = "";
        document.querySelectorAll("#diAddDrugForm .form-error").forEach((el) => { el.textContent = ""; });

        const result = await createDrug({
            name: document.getElementById("di_name").value.trim(),
            ndc: document.getElementById("di_ndc").value.trim(),
            form: document.getElementById("di_form").value.trim(),
            size: document.getElementById("di_size").value,
            unit: document.getElementById("di_unit").value.trim(),
            product_type: document.getElementById("di_product_type").value,
            is_consumable: document.getElementById("di_is_consumable").checked,
            lot_number: document.getElementById("di_lot_number").value.trim(),
            facility_id: document.getElementById("di_facility_id").value,
            warehouse_id: document.getElementById("di_warehouse_id").value,
            quantity_on_hand: document.getElementById("di_quantity_on_hand").value,
            expires_date: document.getElementById("di_expires_date").value
        });

        if (!result.success) {
            const hasFieldErrors = result.errors && Object.keys(result.errors).length > 0;

            showAlert("diAddDrugAlert", hasFieldErrors ? Object.values(result.errors).join(" ") : (result.message || "Failed to add the drug."), "error");

            if (hasFieldErrors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const el = document.getElementById(`err-di_${field}`);
                    if (el) el.textContent = message;
                });
            }

            return;
        }

        closeModal();
        showToast("Drug added successfully.", "success");
        await loadInventory();
    });
}

function setupTransferModal() {
    const overlay = document.getElementById("diTransferModalOverlay");
    const form = document.getElementById("diTransferForm");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("diCloseTransferModal").addEventListener("click", closeModal);
    document.getElementById("diCancelTransfer").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("diTransferAlert").innerHTML = "";
        document.querySelectorAll("#diTransferForm .form-error").forEach((el) => { el.textContent = ""; });

        const result = await transferDrugLot(activeTransferLot.lot_id, {
            warehouse_id: document.getElementById("di_tran_warehouse_id").value,
            facility_id: document.getElementById("di_tran_facility_id").value,
            lot_number: document.getElementById("di_tran_lot_number").value.trim(),
            quantity: document.getElementById("di_tran_quantity").value,
            notes: document.getElementById("di_tran_notes").value.trim()
        });

        if (!result.success) {
            showAlert("diTransferAlert", result.message || "Failed to transfer.", "error");
            return;
        }

        closeModal();
        showToast("Transferred successfully.", "success");
        await loadInventory();
    });
}

function openTransferModal(lotId) {
    activeTransferLot = allRows.find((r) => r.lot_id === lotId);

    if (!activeTransferLot) return;

    document.getElementById("diTransferSource").innerHTML = `
        <strong>${escapeHtml(activeTransferLot.name)}</strong> &middot; Lot ${escapeHtml(activeTransferLot.lot_number)}
        &middot; ${formatQuantity(activeTransferLot.quantity_on_hand)} on hand at ${escapeHtml(activeTransferLot.warehouse_name)}
    `;

    document.getElementById("diTransferAlert").innerHTML = "";
    document.querySelectorAll("#diTransferForm .form-error").forEach((el) => { el.textContent = ""; });

    document.getElementById("di_tran_warehouse_id").value = "";
    document.getElementById("di_tran_facility_id").value = activeTransferLot.facility_id || "";
    document.getElementById("di_tran_lot_number").value = activeTransferLot.lot_number;
    document.getElementById("di_tran_quantity").value = "";
    document.getElementById("di_tran_notes").value = "";

    document.getElementById("diTransferModalOverlay").classList.add("open");
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, "");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
}

function showAlert(containerId, message, type) {
    document.getElementById(containerId).innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
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
