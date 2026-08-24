import { api } from "../../core/api.js?v=5";

export async function fetchAdministrationRoutes()
{
    return await api("/administration-routes");
}

export async function createAdministrationRoute(data)
{
    return await api(
        "/administration-routes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateAdministrationRoute(id, data)
{
    return await api(
        "/administration-routes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteAdministrationRoute(id)
{
    return await api(
        "/administration-routes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
