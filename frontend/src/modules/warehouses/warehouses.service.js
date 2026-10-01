import { api } from "../../core/api.js";

export async function fetchWarehouses() {
    return api("/warehouses");
}

export async function fetchWarehouseOptions() {
    return api("/warehouses/options");
}

export async function fetchStockCheck(id) {
    return api(`/warehouses/stock?id=${encodeURIComponent(id)}`);
}

export async function saveStockLevel(warehouseId, details) {
    return api("/warehouses/stock-levels", {
        method: "POST",
        body: JSON.stringify({ warehouse_id: warehouseId, ...details })
    });
}

export async function removeStockLevel(warehouseId, drugId) {
    return api("/warehouses/stock-levels", {
        method: "DELETE",
        body: JSON.stringify({ warehouse_id: warehouseId, drug_id: drugId })
    });
}

export async function createWarehouse(details) {
    return api("/warehouses", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateWarehouse(id, details) {
    return api("/warehouses", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteWarehouse(id) {
    return api("/warehouses", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
