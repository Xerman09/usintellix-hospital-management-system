import { api } from "../../core/api.js";

export async function fetchSurgeries()
{
    return await api("/surgeries");
}

export async function createSurgery(data)
{
    return await api(
        "/surgeries",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateSurgery(id, data)
{
    return await api(
        "/surgeries",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteSurgery(id)
{
    return await api(
        "/surgeries",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
