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

/** CSV of results for an order (columns: code, name, value, units, reference_range, result_date, end_date, abnormal). */
export async function importPatientProcedureResults(orderId, file)
{
    const formData = new FormData();
    formData.append("order_id", orderId);
    formData.append("file", file);

    return await api(
        "/patient-procedure-results/import",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function fetchPatientProcedureResultsForPatient(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-procedure-results?${query}`);
}
