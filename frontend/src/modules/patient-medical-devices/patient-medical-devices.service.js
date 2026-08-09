import { api } from "../../core/api.js";

export async function fetchPatientMedicalDevices(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-medical-devices?${query}`);
}

export async function addPatientMedicalDevice(patientId, details = {})
{
    return await api(
        "/patient-medical-devices",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updatePatientMedicalDevice(id, details)
{
    return await api(
        "/patient-medical-devices",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientMedicalDevice(id)
{
    return await api(
        "/patient-medical-devices",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
