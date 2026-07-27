import { api } from "../../core/api.js";

export async function fetchPatientMedications(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-medications?${query}`);
}

export async function addPatientMedication(patientId, medicationId, details = {})
{
    return await api(
        "/patient-medications",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, medication_id: medicationId || null, ...details })
        }
    );
}

export async function updatePatientMedication(id, details)
{
    return await api(
        "/patient-medications",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientMedication(id)
{
    return await api(
        "/patient-medications",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
