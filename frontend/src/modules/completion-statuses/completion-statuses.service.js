import { api } from "../../core/api.js?v=5";

export async function fetchCompletionStatuses()
{
    return await api("/completion-statuses");
}

export async function createCompletionStatus(data)
{
    return await api(
        "/completion-statuses",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCompletionStatus(id, data)
{
    return await api(
        "/completion-statuses",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCompletionStatus(id)
{
    return await api(
        "/completion-statuses",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
