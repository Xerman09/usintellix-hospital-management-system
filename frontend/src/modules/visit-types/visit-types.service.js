import { api } from "../../core/api.js";

export async function fetchVisitTypes()
{
    return await api("/visit-types");
}

export async function createVisitType(data)
{
    return await api(
        "/visit-types",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateVisitType(id, data)
{
    return await api(
        "/visit-types",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteVisitType(id)
{
    return await api(
        "/visit-types",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
