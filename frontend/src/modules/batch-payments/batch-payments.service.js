import { api } from "../../core/api.js";

export async function fetchBatchPayments(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });

    const query = params.toString();

    return api(`/batch-payments${query ? `?${query}` : ""}`);
}

export async function fetchBatchPayment(id) {
    return api(`/batch-payments/show?id=${id}`);
}

export async function createBatchPayment(details) {
    return api("/batch-payments", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateBatchPayment(id, details) {
    return api("/batch-payments", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteBatchPayment(id) {
    return api("/batch-payments", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function setBatchPaymentGlobal(id, distributedToGlobal) {
    return api("/batch-payments/global", {
        method: "PUT",
        body: JSON.stringify({ id, distributed_to_global: distributedToGlobal })
    });
}

export async function allocateBatchPayment(batchPaymentId, details) {
    return api("/batch-payments/allocate", {
        method: "POST",
        body: JSON.stringify({ batch_payment_id: batchPaymentId, ...details })
    });
}

export async function removeBatchPaymentAllocation(id) {
    return api("/batch-payments/allocations", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
