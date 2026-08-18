import { api } from "../../core/api.js";

export async function fetchSoapNotes(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-soap-notes?${query}`);
}

export async function addSoapNote(encounterId, data)
{
    return await api(
        "/encounter-soap-notes",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateSoapNote(id, data)
{
    return await api(
        "/encounter-soap-notes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeSoapNote(id)
{
    return await api(
        "/encounter-soap-notes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

export async function signSoapNote(id, password, amendment)
{
    return await api(
        "/encounter-soap-notes/sign",
        {
            method: "POST",
            body: JSON.stringify({ id, password, amendment })
        }
    );
}
