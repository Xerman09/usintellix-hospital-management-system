import { api } from "../../core/api.js?v=5";

export async function fetchEncounterVitals(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-vitals?${query}`);
}

export async function saveEncounterVitals(encounterId, data)
{
    return await api(
        "/encounter-vitals",
        {
            method: "PUT",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function fetchVitalsHistory(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/encounter-vitals/history?${query}`);
}
