import { api } from "../../core/api.js";

export async function fetchMedicalProblems()
{
    return await api("/medical-problems");
}

export async function createMedicalProblem(data)
{
    return await api(
        "/medical-problems",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateMedicalProblem(id, data)
{
    return await api(
        "/medical-problems",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteMedicalProblem(id)
{
    return await api(
        "/medical-problems",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
