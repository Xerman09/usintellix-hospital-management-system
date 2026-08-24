import { api } from "../../core/api.js?v=5";

export async function fetchPatientInsurances(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-insurances?${query}`);
}

export async function addPatientInsurance(patientId, insuranceId, details = {})
{
    return await api(
        "/patient-insurances",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, insurance_id: insuranceId, ...details })
        }
    );
}

export async function updatePatientInsurance(id, details)
{
    return await api(
        "/patient-insurances",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientInsurance(id)
{
    return await api(
        "/patient-insurances",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
