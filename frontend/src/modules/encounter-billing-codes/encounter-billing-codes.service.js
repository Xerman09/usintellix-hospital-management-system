import { api } from "../../core/api.js?v=5";

export async function fetchEncounterBillingCodes(encounterId)
{
    return await api(`/encounter-billing-codes?${new URLSearchParams({ encounter_id: encounterId }).toString()}`);
}

export async function addEncounterBillingCode(encounterId, data)
{
    return await api(
        "/encounter-billing-codes",
        { method: "POST", body: JSON.stringify({ encounter_id: encounterId, ...data }) }
    );
}

export async function updateEncounterBillingCode(id, data)
{
    return await api(
        "/encounter-billing-codes",
        { method: "PUT", body: JSON.stringify({ id, ...data }) }
    );
}

export async function removeEncounterBillingCode(id)
{
    return await api(
        "/encounter-billing-codes",
        { method: "DELETE", body: JSON.stringify({ id }) }
    );
}
