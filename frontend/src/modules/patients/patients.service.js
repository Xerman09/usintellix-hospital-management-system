import { api } from "../../core/api.js?v=5";

export async function createPatient(data)
{
    return await api(
        "/patients",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}

export async function fetchPatients()
{
    return await api("/patients");
}

export async function deletePatient(id)
{
    return await api(
        "/patients",
        {
            method:"DELETE",
            body:JSON.stringify({ id })
        }
    );
}

export async function updatePatient(id, data)
{
    return await api(
        "/patients",
        {
            method:"PUT",
            body:JSON.stringify({ id, ...data })
        }
    );
}

export async function setPatientIndigentStatus(id, isIndigent)
{
    return await api(
        "/patients/indigent",
        {
            method:"PUT",
            body:JSON.stringify({ id, is_indigent: isIndigent ? 1 : 0 })
        }
    );
}

export async function fetchPatientDashboardSummary(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patients/dashboard-summary?${query}`);
}

export async function uploadPatientPhoto(patientId, file)
{
    const formData = new FormData();

    formData.append("id", patientId);
    formData.append("photo", file);

    return await api(
        "/patients/photo",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function removePatientPhoto(patientId)
{
    return await api(
        "/patients/photo",
        {
            method: "DELETE",
            body: JSON.stringify({ id: patientId })
        }
    );
}

export async function fetchAiHealthAssessment(patientId, summaryData)
{
    return await api(
        "/ai/health-assessment",
        {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                data: summaryData
            })
        }
    );
}

export async function fetchConfidentialPreferences(patientId)
{
    return await api(`/patients/confidential-preferences?patient_id=${encodeURIComponent(patientId)}`);
}

export async function updateConfidentialPreferences(patientId, data)
{
    return await api(
        "/patients/confidential-preferences",
        {
            method: "PUT",
            body: JSON.stringify({ patient_id: patientId, ...data })
        }
    );
}

export function getConfidentialRegistryExportUrl()
{
    return "/api/patients/confidential-registry/export";
}
