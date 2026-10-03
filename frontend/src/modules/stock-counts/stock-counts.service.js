import { api } from "../../core/api.js";

export async function fetchStockCounts() {
    return api("/stock-counts");
}

export async function fetchStockCount(id) {
    return api(`/stock-counts/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchStockCountOptions() {
    return api("/stock-counts/options");
}

export async function fetchDifferenceReport(filters = {}) {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return api(`/stock-counts/report${query ? `?${query}` : ""}`);
}

export async function startStockCount(details) {
    return api("/stock-counts", { method: "POST", body: JSON.stringify(details) });
}

/** details: { items, added, notes, submit } */
export async function saveStockCount(id, details) {
    return api("/stock-counts", { method: "PUT", body: JSON.stringify({ id, ...details }) });
}

/** action: approve | reject | cancel */
export async function stockCountAction(action, id, body = {}) {
    return api(`/stock-counts/${action}`, { method: "POST", body: JSON.stringify({ id, ...body }) });
}
