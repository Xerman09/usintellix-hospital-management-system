import { api } from "../../core/api.js?v=5";

export async function fetchMyRecalls()
{
    return await api("/recalls/mine");
}

export async function createRecall(data)
{
    return await api(
        "/recalls",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateRecall(id, data)
{
    return await api(
        "/recalls",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteRecall(id)
{
    return await api(
        "/recalls",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
