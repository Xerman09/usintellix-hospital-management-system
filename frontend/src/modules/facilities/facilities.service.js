import { api } from "../../core/api.js";

export async function fetchFacilities()
{
    return await api("/facilities");
}

export async function createFacility(data)
{
    return await api(
        "/facilities",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateFacility(id, data)
{
    return await api(
        "/facilities",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteFacility(id)
{
    return await api(
        "/facilities",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
