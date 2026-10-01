import { api } from "../../core/api.js";

export async function fetchPurchaseOrders(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });

    const query = params.toString();

    return api(`/purchase-orders${query ? `?${query}` : ""}`);
}

export async function fetchPurchaseOrder(id) {
    return api(`/purchase-orders/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchPurchaseOrderOptions() {
    return api("/purchase-orders/options");
}

export async function createPurchaseOrder(details) {
    return api("/purchase-orders", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updatePurchaseOrder(id, details) {
    return api("/purchase-orders", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function approvePurchaseOrder(id, notes) {
    return api("/purchase-orders/approve", {
        method: "POST",
        body: JSON.stringify({ id, notes })
    });
}

export async function rejectPurchaseOrder(id, reason) {
    return api("/purchase-orders/reject", {
        method: "POST",
        body: JSON.stringify({ id, reason })
    });
}

export async function cancelPurchaseOrder(id, reason) {
    return api("/purchase-orders/cancel", {
        method: "POST",
        body: JSON.stringify({ id, reason })
    });
}

export async function deletePurchaseOrder(id) {
    return api("/purchase-orders", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
