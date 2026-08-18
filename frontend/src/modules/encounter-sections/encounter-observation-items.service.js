import { api } from "../../core/api.js";

export async function fetchObservationItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-observation-items?${query}`);
}

export async function addObservationItem(encounterId, data)
{
    return await api(
        "/encounter-observation-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateObservationItem(id, data)
{
    return await api(
        "/encounter-observation-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeObservationItem(id)
{
    return await api(
        "/encounter-observation-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
