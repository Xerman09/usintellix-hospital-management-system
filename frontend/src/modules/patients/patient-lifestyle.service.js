import { api } from "../../core/api.js";

export async function fetchLifestyle(patientId)
{
    return await api(`/patient-lifestyle?patient_id=${patientId}`);
}

export async function saveLifestyle(patientId, entries)
{
    return await api(
        "/patient-lifestyle",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                entries
            })
        }
    );
}
