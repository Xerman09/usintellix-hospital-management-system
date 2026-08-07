import { api } from "../../core/api.js";

export async function fetchScreeningTools()
{
    return await api("/screening-tools");
}

export async function createScreeningTool(data)
{
    return await api(
        "/screening-tools",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateScreeningTool(id, data)
{
    return await api(
        "/screening-tools",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteScreeningTool(id)
{
    return await api(
        "/screening-tools",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
