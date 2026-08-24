import { api } from "../../core/api.js?v=5";

export async function fetchSdohAssessments(patientId)
{
    return await api(`/patient-sdoh-assessments?patient_id=${patientId}`);
}

export async function addSdohAssessment(patientId, details)
{
    return await api(
        "/patient-sdoh-assessments",
        {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                ...details
            })
        }
    );
}

export async function updateSdohAssessment(id, details)
{
    return await api(
        "/patient-sdoh-assessments",
        {
            method: "PUT",
            body: JSON.stringify({
                id,
                ...details
            })
        }
    );
}
