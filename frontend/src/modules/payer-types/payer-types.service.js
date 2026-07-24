import { api } from "../../core/api.js";

export async function fetchPayerTypes()
{
    return await api("/payer-types");
}

export async function createPayerType(data)
{
    return await api(
        "/payer-types",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePayerType(id, data)
{
    return await api(
        "/payer-types",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePayerType(id)
{
    return await api(
        "/payer-types",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
