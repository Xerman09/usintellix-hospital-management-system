import { api } from "../../core/api.js";

export async function fetchVoidReasons()
{
    return await api("/void-reasons");
}

export async function createVoidReason(data)
{
    return await api(
        "/void-reasons",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateVoidReason(id, data)
{
    return await api(
        "/void-reasons",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteVoidReason(id)
{
    return await api(
        "/void-reasons",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
