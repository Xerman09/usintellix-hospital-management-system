import { api } from "../../core/api.js";

export async function fetchDestroyedDrugs(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    const query = params.toString();

    return api(`/drug-inventory/destroyed${query ? `?${query}` : ""}`);
}
