import { api } from "../../core/api.js?v=5";

export async function fetchImmunizations()
{
    return await api("/immunizations");
}

export async function createImmunization(data)
{
    return await api(
        "/immunizations",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateImmunization(id, data)
{
    return await api(
        "/immunizations",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteImmunization(id)
{
    return await api(
        "/immunizations",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
