import { api } from "../../core/api.js?v=5";

export async function fetchPatientDentalIssues(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-dental-issues?${query}`);
}

export async function addPatientDentalIssue(patientId, details = {})
{
    return await api(
        "/patient-dental-issues",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updatePatientDentalIssue(id, details)
{
    return await api(
        "/patient-dental-issues",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientDentalIssue(id)
{
    return await api(
        "/patient-dental-issues",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
