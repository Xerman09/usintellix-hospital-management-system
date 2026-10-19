import { api } from "../../core/api.js?v=10";

export async function fetchFlow(filters = {})
{
    const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== "")
    );

    const query = new URLSearchParams(params).toString();

    return await api(`/patient-flow${query ? "?" + query : ""}`);
}

export async function checkInPatient(appointmentId, extraData = {})
{
    return await api(
        "/patient-flow",
        {
            method: "POST",
            body: JSON.stringify({ appointment_id: appointmentId, ...extraData })
        }
    );
}

export async function fetchQueueTokens(filters = {})
{
    const params = new URLSearchParams(filters).toString();
    return await api(`/queue-tokens${params ? "?" + params : ""}`);
}

export async function callQueueToken(tokenId, roomId = null)
{
    return await api(
        "/queue-tokens/call",
        {
            method: "POST",
            body: JSON.stringify({ token_id: tokenId, room_id: roomId })
        }
    );
}

export async function serveQueueToken(tokenId, roomId = null)
{
    return await api(
        "/queue-tokens/serve",
        {
            method: "POST",
            body: JSON.stringify({ token_id: tokenId, room_id: roomId })
        }
    );
}

export async function completeQueueToken(tokenId)
{
    return await api(
        "/queue-tokens/complete",
        {
            method: "POST",
            body: JSON.stringify({ token_id: tokenId })
        }
    );
}

export async function fetchQueueDisplayBoard(facilityId = null, departmentCode = null)
{
    const params = new URLSearchParams();
    if (facilityId) params.append("facility_id", facilityId);
    if (departmentCode) params.append("department_code", departmentCode);
    const qs = params.toString();
    return await api(`/queue-tokens/display-board${qs ? "?" + qs : ""}`);
}

export function getQueueTokenSlipUrl(tokenId, autoprint = true)
{
    return `/api/queue-tokens/slip?token_id=${tokenId}${autoprint ? "&autoprint=1" : ""}`;
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

export async function getNppConsentStatus(patientId)
{
    return await api(`/npp-consent/status?patient_id=${encodeURIComponent(patientId)}`);
}

export async function captureNppConsent(data)
{
    return await api(
        "/npp-consent/capture",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}
