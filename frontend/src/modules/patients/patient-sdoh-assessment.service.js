import { api } from "../../core/api.js";

export async function fetchSdohAssessment(patientId)
{
    return await api(`/patient-sdoh-assessment?patient_id=${patientId}`);
}

export async function saveSdohAssessment(patientId, entries)
{
    return await api(
        "/patient-sdoh-assessment",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                entries
            })
        }
    );
}
