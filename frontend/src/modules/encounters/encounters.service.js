import { api } from "../../core/api.js";

export async function fetchPatientEncounters(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/encounters?${query}`);
}

export async function fetchLinkableIssues(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/encounters/issues?${query}`);
}

export async function addEncounter(patientId, details = {}, issues = [], billingCodes = [])
{
    return await api(
        "/encounters",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, issues, billing_codes: billingCodes, ...details })
        }
    );
}

export async function updateEncounter(id, details, issues = [], billingCodes = [])
{
    return await api(
        "/encounters",
        {
            method: "PUT",
            body: JSON.stringify({ id, issues, billing_codes: billingCodes, ...details })
        }
    );
}

export async function updateEncounterBillingNote(id, billingNote)
{
    return await api(
        "/encounters/billing-note",
        {
            method: "PUT",
            body: JSON.stringify({ id, billing_note: billingNote })
        }
    );
}

export async function removeEncounter(id)
{
    return await api(
        "/encounters",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

export async function fetchDischargeDispositions()
{
    return await api("/discharge-dispositions");
}
