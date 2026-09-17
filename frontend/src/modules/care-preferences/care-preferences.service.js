import { api } from "../../core/api.js";

export async function fetchCarePreferences(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-care-preferences?${query}`);
}

export async function addCarePreference(patientId, data)
{
    return await api(
        "/patient-care-preferences",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...data })
        }
    );
}

export async function updateCarePreference(id, data)
{
    return await api(
        "/patient-care-preferences",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCarePreference(id)
{
    return await api(
        "/patient-care-preferences",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
