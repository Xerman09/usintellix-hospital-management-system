import { api } from "../../core/api.js";

export async function fetchOrganizationTypes()
{
    return await api("/organization-types");
}

export async function createOrganizationType(data)
{
    return await api(
        "/organization-types",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateOrganizationType(id, data)
{
    return await api(
        "/organization-types",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteOrganizationType(id)
{
    return await api(
        "/organization-types",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
