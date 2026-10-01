import { api } from "../../core/api.js";

export async function fetchSupplierPrices(showInactive = false, filters = {}) {
    const params = new URLSearchParams();

    if (showInactive) params.set("show_inactive", "1");
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });

    const query = params.toString();

    return api(`/supplier-products${query ? `?${query}` : ""}`);
}

export async function fetchSupplierPriceOptions() {
    return api("/supplier-products/options");
}

export async function createSupplierPrice(details) {
    return api("/supplier-products", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateSupplierPrice(id, details) {
    return api("/supplier-products", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteSupplierPrice(id) {
    return api("/supplier-products", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
