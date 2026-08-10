import { api } from "../../core/api.js";

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
