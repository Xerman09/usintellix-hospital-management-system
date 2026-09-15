import { api } from "../../core/api.js";

export async function fetchWarehouses() {
    return api("/warehouses");
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
