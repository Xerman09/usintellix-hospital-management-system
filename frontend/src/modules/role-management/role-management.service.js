import { api } from "../../core/api.js";

export async function fetchRoles()
{
    return await api("/roles");
}

export async function createRole(data)
{
    return await api(
        "/roles",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateRole(id, data)
{
    return await api(
        "/roles",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteRole(id)
{
    return await api(
        "/roles",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
