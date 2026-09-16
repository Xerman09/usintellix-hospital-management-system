import { api } from "../../core/api.js";

export async function fetchInventoryActivity(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined && value !== false) {
            params.set(key, value === true ? "1" : value);
        }
    });

    return api(`/reports/inventory/activity?${params.toString()}`);
}
