import { api } from "../../core/api.js?v=5";

export async function fetchDrsRequests(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/drs-requests${query ? "?" + query : ""}`);
}

export async function fetchDrsStats() {
    return await api("/drs-requests/stats");
}

export async function fetchDrsRequest(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/drs-requests/show?${query}`);
}

export async function createDrsRequest(data) {
    return await api("/drs-requests", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function grantDrsExtension(id, data) {
    return await api("/drs-requests/extension", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function fetchDrsExtensionNotice(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/drs-requests/extension-notice?${query}`);
}

export async function fulfillDrsRequest(id, data = {}) {
    return await api("/drs-requests/fulfill", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function denyDrsRequest(id, data) {
    return await api("/drs-requests/deny", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function fetchDrsBundle(patientId, scopeOptions = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries({ patient_id: patientId, ...scopeOptions }).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/drs-requests/bundle?${query}`);
}

export function getDrsRegistryExportCsvUrl() {
    return "/api/drs-requests/export-csv";
}
