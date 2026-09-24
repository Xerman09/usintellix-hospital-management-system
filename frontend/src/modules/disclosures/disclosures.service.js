import { api } from "../../core/api.js?v=5";

export async function fetchDisclosures(filters = {})
{
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();

    return await api(`/disclosures${query ? "?" + query : ""}`);
}

export async function fetchPatientDisclosures(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/disclosures?${query}`);
}

export async function fetchDisclosureStats(filters = {})
{
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();

    return await api(`/disclosures/stats${query ? "?" + query : ""}`);
}

export async function fetchDisclosureReport(patientId, from = null, to = null)
{
    const params = { patient_id: patientId };
    if (from) params.from = from;
    if (to) params.to = to;
    const query = new URLSearchParams(params).toString();

    return await api(`/disclosures/report?${query}`);
}

export function getDisclosureExportCsvUrl(filters = {})
{
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();

    return `/api/disclosures/export-csv${query ? "?" + query : ""}`;
}

export async function addDisclosure(patientId, details = {})
{
    return await api(
        "/disclosures",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updateDisclosure(id, details)
{
    return await api(
        "/disclosures",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removeDisclosure(id)
{
    return await api(
        "/disclosures",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
