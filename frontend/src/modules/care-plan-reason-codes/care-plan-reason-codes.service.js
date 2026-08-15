import { api } from "../../core/api.js";

export async function fetchCarePlanReasonCodes()
{
    return await api("/care-plan-reason-codes");
}

export async function createCarePlanReasonCode(data)
{
    return await api(
        "/care-plan-reason-codes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCarePlanReasonCode(id, data)
{
    return await api(
        "/care-plan-reason-codes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCarePlanReasonCode(id)
{
    return await api(
        "/care-plan-reason-codes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
