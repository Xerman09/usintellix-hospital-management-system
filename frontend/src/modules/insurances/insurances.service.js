import { api } from "../../core/api.js?v=5";

export async function fetchInsurances()
{
    return await api("/insurances");
}

export async function createInsurance(data)
{
    return await api(
        "/insurances",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateInsurance(id, data)
{
    return await api(
        "/insurances",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteInsurance(id)
{
    return await api(
        "/insurances",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
