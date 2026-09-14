import { api } from "../../core/api.js?v=5";

export async function fetchEncounterDiagnoses(encounterId)
{
    return await api(`/encounter-diagnoses?${new URLSearchParams({ encounter_id: encounterId }).toString()}`);
}

export async function addEncounterDiagnosis(encounterId, data)
{
    return await api(
        "/encounter-diagnoses",
        { method: "POST", body: JSON.stringify({ encounter_id: encounterId, ...data }) }
    );
}

export async function removeEncounterDiagnosis(id)
{
    return await api(
        "/encounter-diagnoses",
        { method: "DELETE", body: JSON.stringify({ id }) }
    );
}
