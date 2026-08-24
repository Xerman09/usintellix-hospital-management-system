import { api } from "../../core/api.js?v=5";

export async function fetchPreferenceTypes()
{
    return await api("/preference-types");
}

export async function createPreferenceType(data)
{
    return await api(
        "/preference-types",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePreferenceType(id, data)
{
    return await api(
        "/preference-types",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deletePreferenceType(id)
{
    return await api(
        "/preference-types",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
