import { api } from "../../core/api.js?v=5";

export async function fetchPatientAllergies(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-allergies?${query}`);
}

export async function addPatientAllergy(patientId, allergyId, details = {})
{
    return await api(
        "/patient-allergies",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, allergy_id: allergyId, ...details })
        }
    );
}

export async function updatePatientAllergy(id, details)
{
    return await api(
        "/patient-allergies",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
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
