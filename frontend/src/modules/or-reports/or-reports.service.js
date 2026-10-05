import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};

export const fetchOrReportOptions = () => api("/or-reports/options");
/** report: utilization | timeliness | cancellations | volume | compliance | ssi; filters: date_from, date_to, specialization_id?, suite_id?, hours_per_day?, operating_days? */
export const fetchOrReport = (report, filters) => api(`/or-reports/${report}${query(filters)}`);
