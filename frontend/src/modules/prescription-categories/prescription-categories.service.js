import { api } from "../../core/api.js?v=5";

export async function fetchPrescriptionCategories()
{
    return await api("/prescription-categories");
}

export async function createPrescriptionCategory(data)
{
    return await api(
        "/prescription-categories",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePrescriptionCategory(id, data)
{
    return await api(
        "/prescription-categories",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePrescriptionCategory(id)
{
    return await api(
        "/prescription-categories",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
