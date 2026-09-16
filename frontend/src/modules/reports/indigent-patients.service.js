import { api } from "../../core/api.js";

export async function fetchIndigentPatientsReport(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    return api(`/reports/insurance/indigents?${params.toString()}`);
}
