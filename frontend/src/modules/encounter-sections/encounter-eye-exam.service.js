import { api } from "../../core/api.js?v=5";

/**
 * Fetch Eye Exam record for an encounter.
 */
export async function fetchEncounterEyeExam(encounterId) {
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();
    return await api(`/encounter-eye-exam?${query}`);
}

/**
 * Save Eye Exam record for an encounter.
 */
export async function saveEncounterEyeExam(encounterId, data) {
    return await api("/encounter-eye-exam", {
        method: "POST",
        body: JSON.stringify({ encounter_id: encounterId, ...data })
    });
}
