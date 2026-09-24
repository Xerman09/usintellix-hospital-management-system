import { api } from "../../core/api.js?v=5";

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

export async function fetchEncounterFormOptions(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/encounters/form-options?${query}`);
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

export async function linkIssueToEncounter(encounterId, issueType, issueId)
{
    return await api(
        "/encounters/issues/link",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, issue_type: issueType, issue_id: issueId })
        }
    );
}

export async function unlinkIssueFromEncounter(encounterId, issueType, issueId)
{
    return await api(
        "/encounters/issues/unlink",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, issue_type: issueType, issue_id: issueId })
        }
    );
}

export async function fetchEncounterTransferSummary(params = {})
{
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, value);
        }
    }

    return await api(`/encounters/transfer-summary?${query.toString()}`);
}

export async function fetchHitechRestriction(encounterId)
{
    return await api(`/encounters/hitech-restriction?encounter_id=${encodeURIComponent(encounterId)}`);
}

export async function setHitechRestriction(encounterId, data = {})
{
    return await api("/encounters/hitech-restriction", {
        method: "PUT",
        body: JSON.stringify({ encounter_id: encounterId, ...data })
    });
}

export async function fetchHitechRegistry(params = {})
{
    const query = new URLSearchParams(params).toString();
    return await api(`/encounters/hitech-registry?${query}`);
}

