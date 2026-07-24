import { api } from "../../core/api.js";

export async function fetchPatientAllergies(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-allergies?${query}`);
}

export async function addPatientAllergy(patientId, allergyId)
{
    return await api(
        "/patient-allergies",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, allergy_id: allergyId })
        }
    );
}

export async function removePatientAllergy(id)
{
    return await api(
        "/patient-allergies",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
