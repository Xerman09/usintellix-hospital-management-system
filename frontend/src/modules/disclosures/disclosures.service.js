import { api } from "../../core/api.js";

export async function fetchPatientDisclosures(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/disclosures?${query}`);
}

export async function addDisclosure(patientId, details = {})
{
    return await api(
        "/disclosures",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updateDisclosure(id, details)
{
    return await api(
        "/disclosures",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removeDisclosure(id)
{
    return await api(
        "/disclosures",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
