import { api } from "../../core/api.js";

export async function fetchSupplierInvoices(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });

    const query = params.toString();

    return api(`/supplier-invoices${query ? `?${query}` : ""}`);
}

export async function fetchSupplierInvoice(id) {
    return api(`/supplier-invoices/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchBillableOrders() {
    return api("/supplier-invoices/billable-orders");
}

export async function fetchOrderForBilling(orderId, invoiceId = null) {
    return api(`/supplier-invoices/order?id=${encodeURIComponent(orderId)}${invoiceId ? `&invoice_id=${encodeURIComponent(invoiceId)}` : ""}`);
}

export async function checkInvoiceMatch(details) {
    return api("/supplier-invoices/match", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function createSupplierInvoice(details) {
    return api("/supplier-invoices", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateSupplierInvoice(id, details) {
    return api("/supplier-invoices", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteSupplierInvoice(id) {
    return api("/supplier-invoices", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

/** action: approve (notes) | reject (reason) | cancel (reason) */
export async function supplierInvoiceAction(action, id, text) {
    return api(`/supplier-invoices/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "approve" ? { id, notes: text } : { id, reason: text })
    });
}
