import { api } from "../../core/api.js";

export async function fetchSupplierReturns() {
    return api("/supplier-returns");
}

export async function fetchSupplierReturn(id) {
    return api(`/supplier-returns/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchReturnSources(supplierId, returnId = null) {
    return api(`/supplier-returns/sources?supplier_id=${encodeURIComponent(supplierId)}${returnId ? `&return_id=${encodeURIComponent(returnId)}` : ""}`);
}

export async function fetchReturnSuppliers() {
    return api("/suppliers");
}

export async function createSupplierReturn(details) {
    return api("/supplier-returns", { method: "POST", body: JSON.stringify(details) });
}

export async function updateSupplierReturn(id, details) {
    return api("/supplier-returns", { method: "PUT", body: JSON.stringify({ id, ...details }) });
}

export async function deleteSupplierReturn(id) {
    return api("/supplier-returns", { method: "DELETE", body: JSON.stringify({ id }) });
}

/** action: approve | reject | send | credit | cancel */
export async function supplierReturnAction(action, id, body = {}) {
    return api(`/supplier-returns/${action}`, { method: "POST", body: JSON.stringify({ id, ...body }) });
}
