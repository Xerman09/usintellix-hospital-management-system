import { api } from "../../core/api.js?v=5";

export async function fetchPatientLedger({ from, to } = {})
{
    const params = {};

    if (from) params.from = from;
    if (to) params.to = to;

    const query = new URLSearchParams(params).toString();

    return await api(`/patient-ledger${query ? `?${query}` : ""}`);
}
