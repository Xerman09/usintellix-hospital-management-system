import { api } from "../../core/api.js";

export async function fetchFlow(filters = {})
{
    const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== "")
    );

    const query = new URLSearchParams(params).toString();

    return await api(`/patient-flow${query ? "?" + query : ""}`);
}

export async function checkInPatient(appointmentId)
{
    return await api(
        "/patient-flow",
        {
            method: "POST",
            body: JSON.stringify({ appointment_id: appointmentId })
        }
    );
}

export async function updateFlowStatusRoom(id, stage, roomId)
{
    return await api(
        "/patient-flow",
        {
            method: "PUT",
            body: JSON.stringify({ id, stage, room_id: roomId })
        }
    );
}

export async function updateFlowDrugScreen(id, completed)
{
    return await api(
        "/patient-flow/drug-screen",
        {
            method: "PUT",
            body: JSON.stringify({ id, completed })
        }
    );
}

export async function removeFlowEntry(id)
{
    return await api(
        "/patient-flow",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
