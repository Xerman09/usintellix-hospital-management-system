import { api } from "../../core/api.js?v=10";

export async function fetchCpoeCatalog()
{
    return await api("/cpoe-diagnostics/catalog");
}

export async function placeCpoeOrders(data)
{
    return await api(
        "/cpoe-diagnostics/order",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function fetchEncounterCpoeOrders(patientId, encounterId = null)
{
    const params = new URLSearchParams();
    if (patientId) params.append("patient_id", patientId);
    if (encounterId) params.append("encounter_id", encounterId);

    return await api(`/cpoe-diagnostics/encounter-orders?${params.toString()}`);
}
