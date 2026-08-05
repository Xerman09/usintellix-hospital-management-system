import { api } from "../../core/api.js";

export async function fetchOtherHistory(patientId)
{
    return await api(`/patient-other-history?patient_id=${patientId}`);
}

export async function saveOtherHistory(patientId, data)
{
    return await api(
        "/patient-other-history",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                ...data
            })
        }
    );
}
