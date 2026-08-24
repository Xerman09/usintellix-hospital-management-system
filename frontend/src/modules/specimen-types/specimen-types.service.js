import { api } from "../../core/api.js?v=5";

export async function fetchSpecimenTypes()
{
    return await api("/specimen-types");
}

export async function createSpecimenType(data)
{
    return await api(
        "/specimen-types",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateSpecimenType(id, data)
{
    return await api(
        "/specimen-types",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteSpecimenType(id)
{
    return await api(
        "/specimen-types",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
