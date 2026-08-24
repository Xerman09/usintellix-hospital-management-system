import { api } from "../../core/api.js?v=5";

export async function fetchEncounterMiscBillingOptions(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-misc-billing-options?${query}`);
}

export async function saveEncounterMiscBillingOptions(encounterId, data)
{
    return await api(
        "/encounter-misc-billing-options",
        {
            method: "PUT",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}
