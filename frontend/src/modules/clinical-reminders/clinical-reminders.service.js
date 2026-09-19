import { api } from "../../core/api.js";

export async function fetchRemindersForPatient(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-reminders/for-patient?${query}`);
}
