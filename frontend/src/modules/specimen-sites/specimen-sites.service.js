import { api } from "../../core/api.js?v=5";

export async function fetchSpecimenSites()
{
    return await api("/specimen-sites");
}

export async function createSpecimenSite(data)
{
    return await api(
        "/specimen-sites",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateSpecimenSite(id, data)
{
    return await api(
        "/specimen-sites",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteSpecimenSite(id)
{
    return await api(
        "/specimen-sites",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
