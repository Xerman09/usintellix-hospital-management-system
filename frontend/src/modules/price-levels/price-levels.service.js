import { api } from "../../core/api.js";

export async function fetchPriceLevels()
{
    return await api("/price-levels");
}

export async function createPriceLevel(data)
{
    return await api(
        "/price-levels",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePriceLevel(id, data)
{
    return await api(
        "/price-levels",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePriceLevel(id)
{
    return await api(
        "/price-levels",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
