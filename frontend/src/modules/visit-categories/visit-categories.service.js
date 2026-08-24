import { api } from "../../core/api.js?v=5";

export async function fetchVisitCategories()
{
    return await api("/visit-categories");
}

export async function createVisitCategory(data)
{
    return await api(
        "/visit-categories",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateVisitCategory(id, data)
{
    return await api(
        "/visit-categories",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteVisitCategory(id)
{
    return await api(
        "/visit-categories",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
