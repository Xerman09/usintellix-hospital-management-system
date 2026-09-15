import { api } from "../../core/api.js";

export async function searchInvoices(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });

    const query = params.toString();

    return api(`/eob-posting/search${query ? `?${query}` : ""}`);
}

export async function postEobPayment(details) {
    return api("/eob-posting/post", {
        method: "POST",
        body: JSON.stringify(details)
    });
}
