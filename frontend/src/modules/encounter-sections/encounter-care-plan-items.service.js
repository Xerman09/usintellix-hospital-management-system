import { api } from "../../core/api.js";

export async function fetchCarePlanItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-care-plan-items?${query}`);
}

export async function addCarePlanItem(encounterId, data)
{
    return await api(
        "/encounter-care-plan-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateCarePlanItem(id, data)
{
    return await api(
        "/encounter-care-plan-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeCarePlanItem(id)
{
    return await api(
        "/encounter-care-plan-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
