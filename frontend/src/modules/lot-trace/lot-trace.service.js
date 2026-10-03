import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

/** filters: q?, in_stock?, expires_by? */
export async function searchBatches(filters) {
    return api(`/lot-trace/search${query(filters)}`);
}

/** filters: drug_id + lot_number, or lot_id */
export async function fetchTrace(filters) {
    return api(`/lot-trace${query(filters)}`);
}
