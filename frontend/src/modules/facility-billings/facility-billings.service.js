import { api } from "../../core/api.js";

export async function fetchFacilityBillings()
{
    return await api("/facility-billings");
}

export async function createFacilityBilling(data)
{
    return await api(
        "/facility-billings",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateFacilityBilling(id, data)
{
    return await api(
        "/facility-billings",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteFacilityBilling(id)
{
    return await api(
        "/facility-billings",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
