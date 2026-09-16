import { api } from "../../core/api.js";

export async function fetchFinancialSummaryByServiceCode(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    return api(`/reports/financial/summary-by-service-code?${params.toString()}`);
}
