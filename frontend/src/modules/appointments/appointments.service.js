import { api } from "../../core/api.js?v=5";

export async function fetchAppointments(params = {})
{
    const query = new URLSearchParams(params).toString();

    return await api(`/appointments${query ? "?" + query : ""}`);
}

export async function createAppointment(data)
{
    return await api(
        "/appointments",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}

export async function updateAppointment(id, data)
{
    return await api(
        "/appointments",
        {
            method:"PUT",
            body:JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteAppointment(id)
{
    return await api(
        "/appointments",
        {
            method:"DELETE",
            body:JSON.stringify({ id })
        }
    );
}

export async function fetchAvailableSlots({ provider_id, start_date, days })
{
    const query = new URLSearchParams({ provider_id, start_date, days }).toString();

    return await api(`/appointments/available-slots?${query}`);
}
