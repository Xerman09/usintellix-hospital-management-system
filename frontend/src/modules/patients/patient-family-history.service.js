import { api } from "../../core/api.js";

export async function fetchFamilyHistory(patientId)
{
    return await api(`/patient-family-history?patient_id=${patientId}`);
}

export async function saveFamilyHistory(patientId, entries)
{
    return await api(
        "/patient-family-history",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                entries
            })
        }
    );
}
