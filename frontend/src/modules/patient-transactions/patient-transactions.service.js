import { api } from "../../core/api.js?v=5";

export async function fetchPatientTransactions(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-transactions?${query}`);
}

export async function addPatientTransaction(patientId, details = {})
{
    return await api(
        "/patient-transactions",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, ...details })
        }
    );
}

export async function updatePatientTransaction(id, details)
{
    return await api(
        "/patient-transactions",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientTransaction(id)
{
    return await api(
        "/patient-transactions",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
