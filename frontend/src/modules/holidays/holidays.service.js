import { api } from "../../core/api.js?v=5";

export async function fetchHolidays()
{
    return await api("/holidays");
}

export async function createHoliday(data)
{
    return await api(
        "/holidays",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateHoliday(id, data)
{
    return await api(
        "/holidays",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteHoliday(id)
{
    return await api(
        "/holidays",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
