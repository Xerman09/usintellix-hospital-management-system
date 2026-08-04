import { api } from "../../core/api.js";

export async function fetchRefusalReasons()
{
    return await api("/refusal-reasons");
}

export async function createRefusalReason(data)
{
    return await api(
        "/refusal-reasons",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateRefusalReason(id, data)
{
    return await api(
        "/refusal-reasons",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteRefusalReason(id)
{
    return await api(
        "/refusal-reasons",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
