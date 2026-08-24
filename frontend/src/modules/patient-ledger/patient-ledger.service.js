import { api } from "../../core/api.js?v=5";

export async function fetchPatientLedger(patientId, from, to)
{
    const query = new URLSearchParams({ patient_id: patientId, from, to }).toString();

    return await api(`/patient-ledger?${query}`);
}

export async function addLedgerPayment(patientId, data)
{
    return await api(
        "/patient-ledger",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...data })
        }
    );
}
