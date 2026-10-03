import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

export async function fetchProcurementOptions() {
    return api("/procurement/options");
}

/** report: open-orders | supplier-performance | spend | price-history | price-differences */
export async function fetchProcurementReport(report, filters = {}) {
    return api(`/procurement/${report}${query(filters)}`);
}
