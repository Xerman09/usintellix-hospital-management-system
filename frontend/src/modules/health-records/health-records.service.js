import { api } from "../../core/api.js";

export async function fetchHealthSummary(patientId)
{
    const query = patientId ? `?${new URLSearchParams({ patient_id: patientId }).toString()}` : "";

    return await api(`/health-summary${query}`);
}
