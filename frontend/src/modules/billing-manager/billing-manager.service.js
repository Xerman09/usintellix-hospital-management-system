import { api } from "../../core/api.js";

export async function searchBillingWorklist(criteria) {
    return api("/billing-manager/search", {
        method: "POST",
        body: JSON.stringify({ criteria })
    });
}

export async function fetchBillingCriteriaOptions() {
    return api("/billing-manager/criteria-options");
}

export async function markEncountersCleared(encounterIds) {
    return api("/billing-manager/mark-cleared", {
        method: "POST",
        body: JSON.stringify({ encounter_ids: encounterIds })
    });
}

export async function reopenEncounters(encounterIds) {
    return api("/billing-manager/reopen", {
        method: "POST",
        body: JSON.stringify({ encounter_ids: encounterIds })
    });
}

export async function updateEncounterX12Status(encounterId, x12Status) {
    return api("/billing-manager/x12-status", {
        method: "PUT",
        body: JSON.stringify({ encounter_id: encounterId, x12_status: x12Status })
    });
}
