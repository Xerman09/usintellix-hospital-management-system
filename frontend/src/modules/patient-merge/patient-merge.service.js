import { api } from "../../core/api.js?v=5";

export async function validatePatientMerge(targetPatientId, sourcePatientId)
{
    const query = new URLSearchParams({
        target_patient_id: targetPatientId,
        source_patient_id: sourcePatientId
    }).toString();

    return await api(`/patient-merge/validate?${query}`);
}

export async function mergePatients(targetPatientId, sourcePatientId, dedupeEncounters)
{
    return await api(
        "/patient-merge",
        {
            method: "POST",
            body: JSON.stringify({
                target_patient_id: targetPatientId,
                source_patient_id: sourcePatientId,
                dedupe_encounters: dedupeEncounters
            })
        }
    );
}
