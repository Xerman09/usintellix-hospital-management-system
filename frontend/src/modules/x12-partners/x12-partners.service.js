import { api } from "../../core/api.js";

export async function fetchX12Partners()
{
    return await api("/x12-partners");
}

export async function createX12Partner(data)
{
    return await api(
        "/x12-partners",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateX12Partner(id, data)
{
    return await api(
        "/x12-partners",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteX12Partner(id)
{
    return await api(
        "/x12-partners",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
