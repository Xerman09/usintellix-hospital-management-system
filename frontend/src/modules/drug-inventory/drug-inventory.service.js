import { api } from "../../core/api.js";

export async function fetchDrugInventory(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined && value !== false) {
            params.set(key, value === true ? "1" : value);
        }
    });

    const query = params.toString();

    return api(`/drug-inventory${query ? `?${query}` : ""}`);
}

export async function fetchDrugInventoryOptions() {
    return api("/drug-inventory/options");
}

export async function createDrug(details) {
    return api("/drug-inventory", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function transferDrugLot(lotId, details) {
    return api("/drug-inventory/transfer", {
        method: "POST",
        body: JSON.stringify({ lot_id: lotId, ...details })
    });
}
