import { api } from "../../core/api.js?v=5";

export async function fetchIcd10Diagnoses(page = 1, perPage = 50, search = "")
{
    const query = new URLSearchParams({ page, per_page: perPage, search }).toString();

    return await api(`/icd10-diagnoses?${query}`);
}

export async function createIcd10Diagnosis(data)
{
    return await api(
        "/icd10-diagnoses",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateIcd10Diagnosis(id, data)
{
    return await api(
        "/icd10-diagnoses",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteIcd10Diagnosis(id)
{
    return await api(
        "/icd10-diagnoses",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
