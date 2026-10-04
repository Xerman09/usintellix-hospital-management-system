import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

export async function fetchPharmacyReportOptions() {
    return api("/pharmacy-reports/options");
}

/** report: dispensing-log | dangerous-drugs | unfilled | by-prescriber */
export async function fetchPharmacyReport(report, filters = {}) {
    return api(`/pharmacy-reports/${report}${query(filters)}`);
}
