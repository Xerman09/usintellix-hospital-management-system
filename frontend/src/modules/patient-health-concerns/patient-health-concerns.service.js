import { api } from "../../core/api.js";

export async function fetchPatientHealthConcerns(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-health-concerns?${query}`);
}

export async function addPatientHealthConcern(patientId, details = {})
{
    return await api(
        "/patient-health-concerns",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updatePatientHealthConcern(id, details)
{
    return await api(
        "/patient-health-concerns",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientHealthConcern(id)
{
    return await api(
        "/patient-health-concerns",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
