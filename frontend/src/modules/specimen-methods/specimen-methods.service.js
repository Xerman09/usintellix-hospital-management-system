import { api } from "../../core/api.js";

export async function fetchSpecimenMethods()
{
    return await api("/specimen-methods");
}

export async function createSpecimenMethod(data)
{
    return await api(
        "/specimen-methods",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateSpecimenMethod(id, data)
{
    return await api(
        "/specimen-methods",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteSpecimenMethod(id)
{
    return await api(
        "/specimen-methods",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
