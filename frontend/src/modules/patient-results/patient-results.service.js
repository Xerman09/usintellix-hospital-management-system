import { api } from "../../core/api.js";

export async function fetchPatientProcedureOrders(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-procedure-orders?${query}`);
}

export async function createPatientProcedureOrder(data)
{
    return await api(
        "/patient-procedure-orders",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updatePatientProcedureOrder(id, data)
{
    return await api(
        "/patient-procedure-orders",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function fetchPatientProcedureResults(orderId)
{
    const query = new URLSearchParams({ order_id: orderId }).toString();

    return await api(`/patient-procedure-results?${query}`);
}

export async function savePatientProcedureResults(orderId, results)
{
    return await api(
        "/patient-procedure-results/bulk",
        {
            method: "PUT",
            body: JSON.stringify({ order_id: orderId, results })
        }
    );
}

export async function fetchPatientProcedureResultsForPatient(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-procedure-results?${query}`);
}
