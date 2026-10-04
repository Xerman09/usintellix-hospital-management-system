import { api } from "../../core/api.js?v=5";

export async function fetchPatientPrescriptions(patientId)
{
    const query = patientId ? `?${new URLSearchParams({ patient_id: patientId }).toString()}` : "";

    return await api(`/patient-prescriptions${query}`);
}

export async function requestPrescriptionRefill(prescriptionId)
{
    return await api(
        "/patient-prescriptions/refill-request",
        {
            method: "POST",
            body: JSON.stringify({ prescription_id: prescriptionId })
        }
    );
}

/** Drug Catalog items to prescribe from, with usable stock. */
export async function fetchPrescribableDrugs(q = "")
{
    const query = q ? `?${new URLSearchParams({ q }).toString()}` : "";

    return await api(`/patient-prescriptions/drug-options${query}`);
}

export async function addPatientPrescription(patientId, medicationId, details = {})
{
    return await api(
        "/patient-prescriptions",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, medication_id: medicationId || null, ...details })
        }
    );
}

export async function updatePatientPrescription(id, details)
{
    return await api(
        "/patient-prescriptions",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientPrescription(id)
{
    return await api(
        "/patient-prescriptions",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

/* Prescription slips: one prescription, many medicines. */

export async function fetchPrescriptionSlips(patientId)
{
    const query = patientId ? `?${new URLSearchParams({ patient_id: patientId }).toString()}` : "";

    return await api(`/prescriptions${query}`);
}

export async function fetchPrescriptionFormOptions(patientId)
{
    return await api(`/prescriptions/form-options?${new URLSearchParams({ patient_id: patientId }).toString()}`);
}

export async function createPrescriptionSlip(details)
{
    return await api("/prescriptions", { method: "POST", body: JSON.stringify(details) });
}

export async function updatePrescriptionSlip(details)
{
    return await api("/prescriptions", { method: "PUT", body: JSON.stringify(details) });
}

export async function cancelPrescriptionSlip(id, reason, version)
{
    return await api("/prescriptions/cancel", { method: "POST", body: JSON.stringify({ id, reason, version }) });
}
