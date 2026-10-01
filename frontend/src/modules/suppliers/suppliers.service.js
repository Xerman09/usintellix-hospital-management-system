import { api } from "../../core/api.js";

export async function fetchSuppliers(showInactive = false) {
    return api(`/suppliers${showInactive ? "?show_inactive=1" : ""}`);
}

export async function fetchSupplier(id) {
    return api(`/suppliers/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchSupplierOptions() {
    return api("/suppliers/options");
}

export async function createSupplier(details) {
    return api("/suppliers", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateSupplier(id, details) {
    return api("/suppliers", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteSupplier(id) {
    return api("/suppliers", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
