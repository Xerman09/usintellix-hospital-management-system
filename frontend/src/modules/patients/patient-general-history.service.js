import { api } from "../../core/api.js?v=5";

export async function fetchGeneralHistory(patientId)
{
    return await api(`/patient-general-history?patient_id=${patientId}`);
}

export async function saveGeneralHistory(patientId, riskFactors, exams)
{
    return await api(
        "/patient-general-history",
        {
            method: "PUT",
            body: JSON.stringify({
                patient_id: patientId,
                risk_factors: riskFactors,
                exams
            })
        }
    );
}
