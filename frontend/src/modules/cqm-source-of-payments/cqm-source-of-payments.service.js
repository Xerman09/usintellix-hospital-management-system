import { api } from "../../core/api.js?v=5";

export async function fetchCqmSourceOfPayments()
{
    return await api("/cqm-source-of-payments");
}

export async function createCqmSourceOfPayment(data)
{
    return await api(
        "/cqm-source-of-payments",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCqmSourceOfPayment(id, data)
{
    return await api(
        "/cqm-source-of-payments",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCqmSourceOfPayment(id)
{
    return await api(
        "/cqm-source-of-payments",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
