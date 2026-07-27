import { api } from "../../core/api.js";

export async function fetchPatientMedicalProblems(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-medical-problems?${query}`);
}

export async function addPatientMedicalProblem(patientId, problemId, details = {})
{
    return await api(
        "/patient-medical-problems",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, problem_id: problemId || null, ...details })
        }
    );
}

export async function updatePatientMedicalProblem(id, details)
{
    return await api(
        "/patient-medical-problems",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...details })
        }
    );
}

export async function removePatientMedicalProblem(id)
{
    return await api(
        "/patient-medical-problems",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
