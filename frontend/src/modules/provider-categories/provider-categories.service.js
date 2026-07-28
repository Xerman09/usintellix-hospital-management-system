import { api } from "../../core/api.js";

export async function fetchProviderCategories()
{
    return await api("/provider-categories");
}

export async function createProviderCategory(data)
{
    return await api(
        "/provider-categories",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateProviderCategory(id, data)
{
    return await api(
        "/provider-categories",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteProviderCategory(id)
{
    return await api(
        "/provider-categories",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
