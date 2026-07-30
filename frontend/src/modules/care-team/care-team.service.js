import { api } from "../../core/api.js";

export async function fetchCareTeam(patientId)
{
    return await api(`/care-team?${new URLSearchParams({ patient_id: patientId }).toString()}`);
}

export async function fetchCareTeamOptions(patientId)
{
    return await api(`/care-team/options?${new URLSearchParams({ patient_id: patientId }).toString()}`);
}

export async function saveCareTeam(patientId, details, members)
{
    return await api(
        "/care-team",
        { method: "POST", body: JSON.stringify({ patient_id: patientId, ...details, members }) }
    );
}
