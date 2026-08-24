import { api } from "../../core/api.js?v=5";

export async function fetchPatientAmendments(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/amendments?${query}`);
}

export async function addAmendment(patientId, details = {})
{
    return await api(
        "/amendments",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updateAmendment(id, details)
{
    return await api(
        "/amendments",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removeAmendment(id)
{
    return await api(
        "/amendments",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
