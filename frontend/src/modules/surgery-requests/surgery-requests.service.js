import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

/** filters: view (open | ready | scheduled | cancelled | all), specialization_id?, q? */
export async function fetchSurgeryRequests(filters = {}) {
    return api(`/surgery-requests${query(filters)}`);
}

export async function fetchSurgeryRequest(id) {
    return api(`/surgery-requests/show${query({ id })}`);
}

/** The patient chart's Surgeries widget: requests, OR cases, past surgeries. */
export async function fetchPatientSurgeries(patientId) {
    return api(`/surgery-requests/patient${query({ patient_id: patientId })}`);
}

export async function fetchSurgeryRequestOptions(patientId) {
    return api(`/surgery-requests/form-options${query({ patient_id: patientId })}`);
}

export async function saveSurgeryRequest(data) {
    return api("/surgery-requests", { method: data.id ? "PUT" : "POST", body: JSON.stringify(data) });
}

/** data: request_id, item_key, status (done | not_needed | pending), details?, notes? */
export async function saveSurgeryRequestCheck(data) {
    return api("/surgery-requests/check", { method: "POST", body: JSON.stringify(data) });
}

export async function readySurgeryRequestNow(id, reason) {
    return api("/surgery-requests/ready-override", { method: "POST", body: JSON.stringify({ id, reason }) });
}

export async function cancelSurgeryRequest(id, reason) {
    return api("/surgery-requests/cancel", { method: "POST", body: JSON.stringify({ id, reason }) });
}

export async function searchIcd10(search) {
    return api(`/icd10-diagnoses${query({ search, per_page: 15 })}`);
}
