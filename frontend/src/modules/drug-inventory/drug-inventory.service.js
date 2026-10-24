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

export async function searchLotsForRecall(query = "", limit = 20) {
    return api(`/drug-inventory/recall-trace/search-lots?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function traceLotRecall(lotNumber, drugId = null) {
    let url = `/drug-inventory/recall-trace/trace?lot_number=${encodeURIComponent(lotNumber)}`;
    if (drugId) url += `&drug_id=${encodeURIComponent(drugId)}`;
    return api(url);
}

export async function quarantineLotStockImmediate(lotNumber, reason = "") {
    return api("/drug-inventory/recall-trace/quarantine", {
        method: "POST",
        body: JSON.stringify({ lot_number: lotNumber, reason })
    });
}

export async function createLotRecallRecord(data) {
    return api("/drug-inventory/recall-trace/create-recall", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updatePatientOutreachStatus(outreachId, data) {
    return api("/drug-inventory/recall-trace/outreach-status", {
        method: "POST",
        body: JSON.stringify({ outreach_id: outreachId, ...data })
    });
}

export async function fetchLotRecallsList(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/recall-trace/list${q ? `?${q}` : ""}`);
}

/* ---------------------------------------------------------------
 * Extemporaneous Compounding & Specialized Formulations
 * ------------------------------------------------------------- */

export async function fetchCompoundingRecords(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/compounding${q ? `?${q}` : ""}`);
}

export async function fetchCompoundingDetail(id) {
    return api(`/drug-inventory/compounding/detail?id=${encodeURIComponent(id)}`);
}

export async function fetchCompoundingFormulas(type = null) {
    return api(`/drug-inventory/compounding/formulas${type ? `?type=${encodeURIComponent(type)}` : ""}`);
}

export async function createCompoundingRecord(data) {
    return api("/drug-inventory/compounding", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function inspectCompoundingRecord(compoundingId, data) {
    return api("/drug-inventory/compounding/inspect", {
        method: "POST",
        body: JSON.stringify({ compounding_id: compoundingId, ...data })
    });
}

export async function fetchCompoundingLabel(id) {
    return api(`/drug-inventory/compounding/label?id=${encodeURIComponent(id)}`);
}

/* ---------------------------------------------------------------
 * Central Pharmacy Narcotics Safe Perpetual Ledger & Dual-Custody
 * ------------------------------------------------------------- */

export async function fetchNarcoticsVaultStats() {
    return api("/drug-inventory/narcotics-vault/stats");
}

export async function fetchNarcoticsVaultItems(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/narcotics-vault/items${q ? `?${q}` : ""}`);
}

export async function fetchNarcoticsVaultMovements(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/narcotics-vault/movements${q ? `?${q}` : ""}`);
}

export async function recordNarcoticsVaultMovement(data) {
    return api("/drug-inventory/narcotics-vault/movements", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function verifyWitnessCredentials(usernameOrId, pinOrPassword) {
    return api("/drug-inventory/narcotics-vault/verify-witness", {
        method: "POST",
        body: JSON.stringify({ username_or_id: usernameOrId, pin: pinOrPassword })
    });
}

export async function setSecurityPin(pin, currentPassword) {
    return api("/drug-inventory/narcotics-vault/set-pin", {
        method: "POST",
        body: JSON.stringify({ pin, current_password: currentPassword })
    });
}

export async function fetchShiftAudits(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    });
    const q = params.toString();
    return api(`/drug-inventory/narcotics-vault/shift-audits${q ? `?${q}` : ""}`);
}

export async function recordShiftAudit(data) {
    return api("/drug-inventory/narcotics-vault/shift-audits", {
        method: "POST",
        body: JSON.stringify(data)
    });
}
