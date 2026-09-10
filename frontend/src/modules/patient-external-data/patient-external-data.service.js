import { api } from "../../core/api.js?v=5";

export async function fetchPatientExternalData(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-external-data?${query}`);
}

export async function uploadPatientExternalData(patientId, file, details = {})
{
    const formData = new FormData();

    formData.append("patient_id", patientId);
    formData.append("file", file);
    formData.append("title", details.title || "");
    formData.append("source_name", details.source_name || "");
    formData.append("document_type", details.document_type || "");
    formData.append("received_at", details.received_at || "");
    formData.append("description", details.description || "");

    return await api(
        "/patient-external-data",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function deletePatientExternalData(id, patientId)
{
    return await api(
        "/patient-external-data",
        {
            method: "DELETE",
            body: JSON.stringify({ id, patient_id: patientId })
        }
    );
}
