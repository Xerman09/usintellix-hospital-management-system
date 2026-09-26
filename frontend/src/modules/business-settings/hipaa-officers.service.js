import { api, API_URL } from "../../core/api.js?v=7";

export async function fetchHipaaOfficers() {
    return await api("/hipaa-officers");
}

export async function fetchHipaaOfficer(type) {
    return await api(`/hipaa-officers/${encodeURIComponent(type)}`);
}

export async function fetchHipaaOfficerStats() {
    return await api("/hipaa-officers/stats");
}

export async function updateHipaaOfficer(type, data) {
    return await api(`/hipaa-officers/${encodeURIComponent(type)}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function fetchAppointmentAttestation(type) {
    return await api(`/hipaa-officers/attestation/${encodeURIComponent(type)}`);
}

export function getHipaaOfficersExportCsvUrl() {
    return `${API_URL}/hipaa-officers/export-csv`;
}
