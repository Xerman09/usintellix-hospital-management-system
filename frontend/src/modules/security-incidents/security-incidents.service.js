import { api } from "../../core/api.js?v=5";

export async function fetchIncidents(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/security-incidents${query ? "?" + query : ""}`);
}

export async function fetchIncidentStats() {
    return await api("/security-incidents/stats");
}

export async function fetchIncident(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/security-incidents/show?${query}`);
}

export async function createIncident(data) {
    return await api("/security-incidents", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateIncident(id, data) {
    return await api("/security-incidents", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

export async function submitRiskAssessment(id, assessmentData) {
    return await api("/security-incidents/assess", {
        method: "POST",
        body: JSON.stringify({ id, ...assessmentData })
    });
}

export async function linkIncidentPatient(incidentId, patientId, details = {}) {
    return await api("/security-incidents/link-patient", {
        method: "POST",
        body: JSON.stringify({ incident_id: incidentId, patient_id: patientId, ...details })
    });
}

export async function removeIncidentPatient(incidentId, patientId) {
    return await api("/security-incidents/remove-patient", {
        method: "POST",
        body: JSON.stringify({ incident_id: incidentId, patient_id: patientId })
    });
}

export async function updatePatientNotification(incidentId, patientId, data) {
    return await api("/security-incidents/update-patient", {
        method: "POST",
        body: JSON.stringify({ incident_id: incidentId, patient_id: patientId, ...data })
    });
}

export async function fetchBreachLetter(incidentId, patientId) {
    const query = new URLSearchParams({ incident_id: incidentId, patient_id: patientId }).toString();
    return await api(`/security-incidents/letter?${query}`);
}

export async function fetchOcrExport(incidentId) {
    const query = new URLSearchParams({ incident_id: incidentId }).toString();
    return await api(`/security-incidents/ocr-export?${query}`);
}

export function getIncidentExportCsvUrl(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return `/api/security-incidents/export-csv${query ? "?" + query : ""}`;
}

export async function deleteIncident(id) {
    return await api("/security-incidents", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
