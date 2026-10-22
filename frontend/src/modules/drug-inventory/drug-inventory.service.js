import { api } from "../../core/api.js?v=10";

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

export async function fetchDrugCatalog(showInactive = false) {
    return api(`/drug-inventory/catalog${showInactive ? "?show_inactive=1" : ""}`);
}

export async function fetchDrug(id) {
    return api(`/drug-inventory/drug?id=${encodeURIComponent(id)}`);
}

export async function createDrug(details) {
    return api("/drug-inventory", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function updateDrug(id, details) {
    return api("/drug-inventory", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function deleteDrug(id) {
    return api("/drug-inventory", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function receiveStock(details) {
    return api("/drug-inventory/receive", {
        method: "POST",
        body: JSON.stringify(details)
    });
}

export async function importDrugs(rows) {
    return api("/drug-inventory/import", {
        method: "POST",
        body: JSON.stringify({ rows })
    });
}

export async function transferDrugLot(lotId, details) {
    return api("/drug-inventory/transfer", {
        method: "POST",
        body: JSON.stringify({ lot_id: lotId, ...details })
    });
}

export async function destroyDrugLot(lotId, details) {
    return api("/drug-inventory/destroy", {
        method: "POST",
        body: JSON.stringify({ lot_id: lotId, ...details })
    });
}

export async function fetchRecalls(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/recalls${q ? `?${q}` : ""}`);
}

export async function fetchRecallDetail(id) {
    return api(`/drug-inventory/recalls/detail?id=${encodeURIComponent(id)}`);
}

export async function createRecall(data) {
    return api("/drug-inventory/recalls", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateRecallStatus(id, status, notes = null) {
    return api("/drug-inventory/recalls/status", {
        method: "POST",
        body: JSON.stringify({ id, status, notes })
    });
}

export async function fetchQuarantineData(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/quarantine${q ? `?${q}` : ""}`);
}

export async function runQuarantineScan(thresholdDays = 60) {
    return api("/drug-inventory/quarantine/scan", {
        method: "POST",
        body: JSON.stringify({ threshold_days: thresholdDays })
    });
}

export async function releaseQuarantine(lotId, reason) {
    return api("/drug-inventory/quarantine/release", {
        method: "POST",
        body: JSON.stringify({ lot_id: lotId, reason })
    });
}

export async function fetchQuarantineLogs() {
    return api("/drug-inventory/quarantine/logs");
}
