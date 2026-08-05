import { api } from "../../core/api.js";

export async function fetchPharmacies()
{
    return await api("/pharmacies");
}

export async function createPharmacy(data)
{
    return await api(
        "/pharmacies",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePharmacy(id, data)
{
    return await api(
        "/pharmacies",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePharmacy(id)
{
    return await api(
        "/pharmacies",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
