import { api } from "../../core/api.js?v=10";

export async function fetchInsuranceDistribution(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    return api(`/reports/insurance/distribution?${params.toString()}`);
}
