import { api } from "../../core/api.js";

export async function savePatientLetter(patientId, data)
{
    return await api(
        "/patient-letters",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...data })
        }
    );
}

export async function updatePatientLetter(id, data)
{
    return await api(
        "/patient-letters",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}
