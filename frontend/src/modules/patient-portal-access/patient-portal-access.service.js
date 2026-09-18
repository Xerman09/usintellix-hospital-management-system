import { api } from "../../core/api.js";

export async function resetPatientPortalPassword(patientId)
{
    return await api(
        "/patient-portal-access/reset-password",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId })
        }
    );
}
