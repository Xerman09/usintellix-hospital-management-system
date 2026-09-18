import { api } from "../../core/api.js";

export async function fetchPatientPortalCredentials(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-portal-access/credentials?${query}`);
}

export async function savePatientPortalCredentials(patientId, username, password)
{
    return await api(
        "/patient-portal-access/credentials",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, username, password })
        }
    );
}
