import { api } from "../../core/api.js";

export async function fetchOfficeNotes(patientId, { filter = "active", page = 1, perPage = 25 } = {})
{
    const query = new URLSearchParams({ patient_id: patientId, filter, page, per_page: perPage }).toString();

    return await api(`/office-notes?${query}`);
}

export async function addOfficeNote(patientId, note)
{
    return await api(
        "/office-notes",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, note })
        }
    );
}

export async function updateOfficeNote(id, data)
{
    return await api(
        "/office-notes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteOfficeNote(id)
{
    return await api(
        "/office-notes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
