import { api } from "../../core/api.js?v=5";

export async function fetchAccessiblePatients()
{
    return await api("/proxy-access/mine");
}

export async function switchPatient(patientId)
{
    return await api("/proxy-access/switch", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId })
    });
}
