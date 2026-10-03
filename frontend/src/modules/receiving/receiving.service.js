import { api } from "../../core/api.js";

export async function fetchPendingDeliveries() {
    return api("/receiving/pending");
}

export async function fetchOrderToReceive(id) {
    return api(`/receiving/order?id=${encodeURIComponent(id)}`);
}

export async function fetchReceipts(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });

    const query = params.toString();

    return api(`/receiving${query ? `?${query}` : ""}`);
}

export async function fetchReceipt(id) {
    return api(`/receiving/detail?id=${encodeURIComponent(id)}`);
}

export async function receiveDelivery(details) {
    return api("/receiving", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function voidReceipt(id, reason) {
    return api("/receiving/void", {
        method: "POST",
        body: JSON.stringify({ id, reason })
    });
}

export async function fetchWarehouseOptions() {
    return api("/warehouses");
}
