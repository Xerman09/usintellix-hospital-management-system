import { api } from "../../core/api.js";

function query(params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
    const text = search.toString();
    return text ? `?${text}` : "";
}

export async function fetchPayablesSummary() {
    return api("/payables/summary");
}

export async function fetchOpenBills(supplierId = null) {
    return api(`/payables/bills${query({ supplier_id: supplierId })}`);
}

export async function fetchPayableSuppliers() {
    return api("/payables/suppliers");
}

export async function fetchPayments(filters = {}) {
    return api(`/payables/payments${query(filters)}`);
}

export async function fetchPayment(id) {
    return api(`/payables/payments/detail?id=${encodeURIComponent(id)}`);
}

export async function recordPayment(details) {
    return api("/payables/payments", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function voidPayment(id, reason) {
    return api("/payables/payments/void", {
        method: "POST",
        body: JSON.stringify({ id, reason })
    });
}

export async function fetchCredits(supplierId = null) {
    return api(`/payables/credits${query({ supplier_id: supplierId })}`);
}

/** Use a returned-goods credit to settle invoices. details: { allocations, payment_date?, notes? } */
export async function applyCredit(returnId, details) {
    return api("/payables/credits/apply", {
        method: "POST",
        body: JSON.stringify({ supplier_return_id: returnId, ...details })
    });
}

export async function fetchAging(asOf) {
    return api(`/payables/aging${query({ as_of: asOf })}`);
}

export async function fetchLedger(supplierId, from, to) {
    return api(`/payables/ledger${query({ supplier_id: supplierId, from, to })}`);
}
