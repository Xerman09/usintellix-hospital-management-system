import { api } from "../../core/api.js";

export async function fetchStockTransfers() {
    return api("/stock-transfers");
}

export async function fetchStockTransfer(id) {
    return api(`/stock-transfers/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchStockTransferOptions() {
    return api("/stock-transfers/options");
}

/** details: { from_warehouse_id, to_warehouse_id, priority, needed_by, notes, items, action: draft|request|send, sent_date?, sent_via? } */
export async function createStockTransfer(details) {
    return api("/stock-transfers", { method: "POST", body: JSON.stringify(details) });
}

export async function updateStockTransfer(id, details) {
    return api("/stock-transfers", { method: "PUT", body: JSON.stringify({ id, ...details }) });
}

export async function deleteStockTransfer(id) {
    return api("/stock-transfers", { method: "DELETE", body: JSON.stringify({ id }) });
}

/** action: send | receive | cancel */
export async function stockTransferAction(action, id, body = {}) {
    return api(`/stock-transfers/${action}`, { method: "POST", body: JSON.stringify({ id, ...body }) });
}
