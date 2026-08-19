import { api } from "../../core/api.js";

export async function fetchSpecimenConditions()
{
    return await api("/specimen-conditions");
}

export async function createSpecimenCondition(data)
{
    return await api(
        "/specimen-conditions",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateSpecimenCondition(id, data)
{
    return await api(
        "/specimen-conditions",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteSpecimenCondition(id)
{
    return await api(
        "/specimen-conditions",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
