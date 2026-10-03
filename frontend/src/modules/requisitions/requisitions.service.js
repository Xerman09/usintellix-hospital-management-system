import { api } from "../../core/api.js";

export async function fetchRequisitions() {
    return api("/requisitions");
}

export async function fetchRequisition(id) {
    return api(`/requisitions/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchRequisitionOptions() {
    return api("/requisitions/options");
}

export async function fetchLowStock(warehouseId) {
    return api(`/requisitions/low-stock?warehouse_id=${encodeURIComponent(warehouseId)}`);
}

export async function fetchOutstanding() {
    return api("/requisitions/outstanding");
}

export async function createRequisition(details) {
    return api("/requisitions", { method: "POST", body: JSON.stringify(details) });
}

export async function updateRequisition(id, details) {
    return api("/requisitions", { method: "PUT", body: JSON.stringify({ id, ...details }) });
}

export async function deleteRequisition(id) {
    return api("/requisitions", { method: "DELETE", body: JSON.stringify({ id }) });
}

/** action: approve | reject | cancel | close */
export async function requisitionAction(action, id, body = {}) {
    return api(`/requisitions/${action}`, { method: "POST", body: JSON.stringify({ id, ...body }) });
}

export async function convertRequisitions(lines) {
    return api("/requisitions/convert", { method: "POST", body: JSON.stringify({ lines }) });
}
