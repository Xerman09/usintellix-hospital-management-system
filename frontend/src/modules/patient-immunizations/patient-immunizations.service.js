import { api } from "../../core/api.js?v=5";

export async function fetchPatientImmunizations(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-immunizations?${query}`);
}

export async function addPatientImmunization(patientId, cvxCodeId, details = {})
{
    return await api(
        "/patient-immunizations",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, cvx_code_id: cvxCodeId || null, ...details })
        }
    );
}

export async function updatePatientImmunization(id, details)
{
    return await api(
        "/patient-immunizations",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientImmunization(id)
{
    return await api(
        "/patient-immunizations",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
