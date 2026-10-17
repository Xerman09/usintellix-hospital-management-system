import { api } from "../../core/api.js?v=10";

/** filters: warehouse_id? */
export async function fetchPharmacyDashboard(filters = {}) {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return api(`/pharmacy-dashboard${q ? `?${q}` : ""}`);
}
