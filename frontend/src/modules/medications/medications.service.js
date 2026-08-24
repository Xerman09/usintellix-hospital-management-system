import { api } from "../../core/api.js?v=5";

export async function fetchMedications()
{
    return await api("/medications");
}

export async function createMedication(data)
{
    return await api(
        "/medications",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateMedication(id, data)
{
    return await api(
        "/medications",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteMedication(id)
{
    return await api(
        "/medications",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
