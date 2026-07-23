import { api } from "../../core/api.js";

export async function fetchClasses()
{
    return await api("/classes");
}

export async function createClass(data)
{
    return await api(
        "/classes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateClass(id, data)
{
    return await api(
        "/classes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteClass(id)
{
    return await api(
        "/classes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
