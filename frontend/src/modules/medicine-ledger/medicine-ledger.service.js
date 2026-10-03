import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

export async function fetchLedgerOptions() {
    return api("/medicine-ledger/options");
}

/** filters: drug_id, warehouse_id?, lot_id?, date_from?, date_to?, type? */
export async function fetchStockCard(filters) {
    return api(`/medicine-ledger${query(filters)}`);
}

/** filters: date_from?, date_to?, warehouse_id?, only_moved? */
export async function fetchMovementSummary(filters) {
    return api(`/medicine-ledger/summary${query(filters)}`);
}
