import { api } from "../../core/api.js?v=5";

export async function fetchHealthSummary(patientId)
{
    const query = patientId ? `?${new URLSearchParams({ patient_id: patientId }).toString()}` : "";

    return await api(`/health-summary${query}`);
}
