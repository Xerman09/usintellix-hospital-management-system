import { api } from "../../core/api.js?v=5";

export async function fetchPatientDocuments(patientId)
{
    const query = patientId ? `?${new URLSearchParams({ patient_id: patientId }).toString()}` : "";

    return await api(`/patient-documents${query}`);
}

export async function uploadPatientDocument(patientId, file, details = {})
{
    const formData = new FormData();

    formData.append("patient_id", patientId);
    formData.append("file", file);
    formData.append("category", details.category || "");
    formData.append("description", details.description || "");

    return await api(
        "/patient-documents",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function fetchLabDocuments(from, to)
{
    const params = {};

    if (from) params.from = from;
    if (to) params.to = to;

    const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : "";

    return await api(`/patient-documents/lab-documents${query}`);
}

export async function deletePatientDocument(id, patientId)
{
    return await api(
        "/patient-documents",
        {
            method: "DELETE",
            body: JSON.stringify({ id, patient_id: patientId })
        }
    );
}
