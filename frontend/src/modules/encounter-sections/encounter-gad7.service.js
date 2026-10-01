import { api } from "../../core/api.js?v=5";

/**
 * Fetch GAD-7 record for an encounter.
 */
export async function fetchEncounterGad7(encounterId) {
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();
    return await api(`/encounter-gad7?${query}`);
}

/**
 * Save GAD-7 record for an encounter.
 */
export async function saveEncounterGad7(encounterId, data) {
    return await api("/encounter-gad7", {
        method: "POST",
        body: JSON.stringify({ encounter_id: encounterId, ...data })
    });
}
