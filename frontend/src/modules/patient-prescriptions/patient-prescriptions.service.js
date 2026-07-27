import { api } from "../../core/api.js";

export async function fetchPatientPrescriptions(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-prescriptions?${query}`);
}

export async function addPatientPrescription(patientId, medicationId, details = {})
{
    return await api(
        "/patient-prescriptions",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, medication_id: medicationId || null, ...details })
        }
    );
}

export async function updatePatientPrescription(id, details)
{
    return await api(
        "/patient-prescriptions",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientPrescription(id)
{
    return await api(
        "/patient-prescriptions",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
