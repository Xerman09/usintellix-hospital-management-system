import { api } from "../../core/api.js?v=5";

export async function fetchAmountUnits()
{
    return await api("/amount-units");
}

export async function createAmountUnit(data)
{
    return await api(
        "/amount-units",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateAmountUnit(id, data)
{
    return await api(
        "/amount-units",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteAmountUnit(id)
{
    return await api(
        "/amount-units",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
