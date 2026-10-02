import { api } from "../../core/api.js?v=5";

/**
 * Fetch PHQ-9 record for an encounter.
 */
export async function fetchEncounterPhq9(encounterId) {
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();
    return await api(`/encounter-phq9?${query}`);
}

/**
 * Save PHQ-9 record for an encounter.
 */
export async function saveEncounterPhq9(encounterId, data) {
    return await api("/encounter-phq9", {
        method: "POST",
        body: JSON.stringify({ encounter_id: encounterId, ...data })
    });
}
