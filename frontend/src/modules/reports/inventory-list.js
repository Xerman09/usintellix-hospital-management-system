import { fetchDrugInventory, fetchDrugInventoryOptions } from "../drug-inventory/drug-inventory.service.js";

export async function initInventoryListReport() {
    await loadOptions();

    document.getElementById("ilFacilityFilter").addEventListener("change", loadInventory);
    document.getElementById("ilWarehouseFilter").addEventListener("change", loadInventory);
    document.getElementById("ilProductTypeFilter").addEventListener("change", loadInventory);
    document.getElementById("ilShowEmptyLots").addEventListener("change", loadInventory);
    document.getElementById("ilShowInactive").addEventListener("change", loadInventory);
    document.getElementById("ilRefreshBtn").addEventListener("click", loadInventory);

    await loadInventory();
}

async function loadOptions() {
    const result = await fetchDrugInventoryOptions();
    const options = result.success ? result.data : { warehouses: [], facilities: [], product_types: [] };

    const facilityFilter = document.getElementById("ilFacilityFilter");
    const warehouseFilter = document.getElementById("ilWarehouseFilter");
    const productTypeFilter = document.getElementById("ilProductTypeFilter");

    options.facilities.forEach((f) => facilityFilter.appendChild(new Option(f.name, f.id)));
    options.warehouses.forEach((w) => warehouseFilter.appendChild(new Option(w.name, w.id)));
    options.product_types.forEach((t) => productTypeFilter.appendChild(new Option(t, t)));
}

async function loadInventory() {
    const tbody = document.getElementById("ilTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">Loading...</td></tr>`;

    const result = await fetchDrugInventory({
        facility_id: document.getElementById("ilFacilityFilter").value,
        warehouse_id: document.getElementById("ilWarehouseFilter").value,
        product_type: document.getElementById("ilProductTypeFilter").value,
        show_empty_lots: document.getElementById("ilShowEmptyLots").checked,
        show_inactive: document.getElementById("ilShowInactive").checked
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">Failed to load inventory.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
}

function renderTable(rows) {
    const tbody = document.getElementById("ilTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">No inventory records match.</td></tr>`;
        document.getElementById("ilFooterInfo").textContent = "";
        return;
    }

    const today = new Date().toISOString().slice(0, 10);

    tbody.innerHTML = rows.map((row) => {
        const expired = row.expires_date && row.expires_date.slice(0, 10) < today;

        return `
            <tr>
                <td class="il-drug-name">${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.ndc || "-")}</td>
                <td>${escapeHtml(row.form || "-")}</td>
                <td>${row.size != null ? row.size : "-"}</td>
                <td>${escapeHtml(row.unit || "-")}</td>
                <td>${escapeHtml(row.lot_number)}</td>
                <td>${escapeHtml(row.facility_name || "N/A")}</td>
                <td>${escapeHtml(row.warehouse_name)}</td>
                <td>${formatQuantity(row.quantity_on_hand)}</td>
                <td class="${expired ? "il-expired" : ""}">${row.expires_date ? formatDate(row.expires_date) : "-"}</td>
            </tr>
        `;
    }).join("");

    document.getElementById("ilFooterInfo").textContent = `Showing ${rows.length} record${rows.length === 1 ? "" : "s"}`;
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

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
