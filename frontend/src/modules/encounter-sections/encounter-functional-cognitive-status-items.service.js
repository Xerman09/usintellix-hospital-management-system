import { api } from "../../core/api.js?v=5";

export async function fetchFunctionalCognitiveStatusItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-functional-cognitive-status-items?${query}`);
}

export async function addFunctionalCognitiveStatusItem(encounterId, data)
{
    return await api(
        "/encounter-functional-cognitive-status-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateFunctionalCognitiveStatusItem(id, data)
{
    return await api(
        "/encounter-functional-cognitive-status-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeFunctionalCognitiveStatusItem(id)
{
    return await api(
        "/encounter-functional-cognitive-status-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
