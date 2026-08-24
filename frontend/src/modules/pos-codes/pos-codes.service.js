import { api } from "../../core/api.js?v=5";

export async function fetchPosCodes()
{
    return await api("/pos-codes");
}

export async function createPosCode(data)
{
    return await api(
        "/pos-codes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePosCode(id, data)
{
    return await api(
        "/pos-codes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePosCode(id)
{
    return await api(
        "/pos-codes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
