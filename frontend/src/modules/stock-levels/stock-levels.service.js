import { api } from "../../core/api.js";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

export async function fetchStockLevelOptions() {
    return api("/stock-levels/options");
}

export async function fetchLocationLevels(warehouseId) {
    return api(`/stock-levels${query({ warehouse_id: warehouseId })}`);
}

/** levels: [{drug_id, min_level, max_level}] -- a blank min_level clears the level. */
export async function saveLocationLevels(warehouseId, levels) {
    return api("/stock-levels", { method: "POST", body: JSON.stringify({ warehouse_id: warehouseId, levels }) });
}

export async function copyLocationLevels(fromId, toId, overwrite) {
    return api("/stock-levels/copy", { method: "POST", body: JSON.stringify({ from_warehouse_id: fromId, to_warehouse_id: toId, overwrite: overwrite ? 1 : 0 }) });
}

/** filters: warehouse_id? */
export async function fetchLowStock(filters = {}) {
    return api(`/stock-levels/low-stock${query(filters)}`);
}
