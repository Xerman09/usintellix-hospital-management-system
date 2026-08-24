import { api } from "../../core/api.js?v=5";

export async function fetchAllergies()
{
    return await api("/allergies");
}

export async function createAllergy(data)
{
    return await api(
        "/allergies",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateAllergy(id, data)
{
    return await api(
        "/allergies",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteAllergy(id)
{
    return await api(
        "/allergies",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
