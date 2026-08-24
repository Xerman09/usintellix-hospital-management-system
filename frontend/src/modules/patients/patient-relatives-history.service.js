import { api } from "../../core/api.js?v=5";

export async function fetchRelativesHistory(patientId)
{
    return await api(`/patient-relatives-history?patient_id=${patientId}`);
}

export async function saveRelativesHistory(patientId, entries)
{
    return await api(
        "/patient-relatives-history",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                entries
            })
        }
    );
}
