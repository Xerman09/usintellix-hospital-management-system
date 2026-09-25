import { api, API_URL } from "../../core/api.js?v=5";

// ==========================================
// Administrative Statutory Pipeline (§ 164.526)
// ==========================================

export async function fetchAmendmentPipeline(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/amendments/pipeline${query ? "?" + query : ""}`);
}

export async function fetchAmendmentStats() {
    return await api("/amendments/stats");
}

export async function fetchAmendment(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/amendments/show?${query}`);
}

export async function storeStatutoryAmendment(data) {
    return await api("/amendments/statutory", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function grantAmendmentExtension(id, data) {
    return await api("/amendments/extension", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function fetchAmendmentExtensionNotice(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/amendments/extension-notice?${query}`);
}

export async function acceptStatutoryAmendment(id, data = {}) {
    return await api("/amendments/accept", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function denyStatutoryAmendment(id, data) {
    return await api("/amendments/deny", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function fetchAmendmentDenialNotice(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/amendments/denial-notice?${query}`);
}

export async function fileStatementOfDisagreement(id, data) {
    return await api("/amendments/disagreement", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function fileStatementOfRebuttal(id, data) {
    return await api("/amendments/rebuttal", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export function getAmendmentRegistryExportCsvUrl() {
    return `${API_URL}/amendments/registry/export`;
}

// ==========================================
// Patient Chart Backwards-Compatible Methods
// ==========================================

export async function fetchPatientAmendments(patientId) {
    const query = new URLSearchParams({ patient_id: patientId }).toString();
    return await api(`/amendments?${query}`);
}

export async function addAmendment(patientId, details = {}) {
    return await api("/amendments", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, ...details })
    });
}

export async function updateAmendment(id, details) {
    return await api("/amendments", {
        method: "PUT",
        body: JSON.stringify({ id, ...details })
    });
}

export async function removeAmendment(id) {
    return await api("/amendments", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
