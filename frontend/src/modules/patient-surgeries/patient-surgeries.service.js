import { api } from "../../core/api.js";

export async function fetchPatientSurgeries(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-surgeries?${query}`);
}

export async function addPatientSurgery(patientId, surgeryId, details = {})
{
    return await api(
        "/patient-surgeries",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, surgery_id: surgeryId || null, ...details })
        }
    );
}

export async function updatePatientSurgery(id, details)
{
    return await api(
        "/patient-surgeries",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientSurgery(id)
{
    return await api(
        "/patient-surgeries",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
