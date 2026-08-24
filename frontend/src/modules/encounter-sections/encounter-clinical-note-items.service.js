import { api } from "../../core/api.js?v=5";

export async function fetchClinicalNoteItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-clinical-note-items?${query}`);
}

export async function addClinicalNoteItem(encounterId, data)
{
    return await api(
        "/encounter-clinical-note-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateClinicalNoteItem(id, data)
{
    return await api(
        "/encounter-clinical-note-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeClinicalNoteItem(id)
{
    return await api(
        "/encounter-clinical-note-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
