import { api } from "../../core/api.js";

export async function fetchAdministrationSites()
{
    return await api("/administration-sites");
}

export async function createAdministrationSite(data)
{
    return await api(
        "/administration-sites",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateAdministrationSite(id, data)
{
    return await api(
        "/administration-sites",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteAdministrationSite(id)
{
    return await api(
        "/administration-sites",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
