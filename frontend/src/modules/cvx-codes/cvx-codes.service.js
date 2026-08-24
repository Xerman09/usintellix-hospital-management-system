import { api } from "../../core/api.js?v=5";

export async function fetchCvxCodes(page = 1, perPage = 50, search = "")
{
    const query = new URLSearchParams({ page, per_page: perPage, search }).toString();

    return await api(`/cvx-codes?${query}`);
}

export async function createCvxCode(data)
{
    return await api(
        "/cvx-codes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCvxCode(id, data)
{
    return await api(
        "/cvx-codes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCvxCode(id)
{
    return await api(
        "/cvx-codes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
