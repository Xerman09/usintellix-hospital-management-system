import { api } from "../../core/api.js";

export async function fetchCqmValuesets(page = 1, perPage = 50, search = "")
{
    const query = new URLSearchParams({ page, per_page: perPage, search }).toString();

    return await api(`/cqm-valuesets?${query}`);
}

export async function createCqmValueset(data)
{
    return await api(
        "/cqm-valuesets",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCqmValueset(id, data)
{
    return await api(
        "/cqm-valuesets",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCqmValueset(id)
{
    return await api(
        "/cqm-valuesets",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

export async function searchCqmValuesetCodes(search = "", mode = "name", page = 1, perPage = 50)
{
    const query = new URLSearchParams({ search, mode, page, per_page: perPage }).toString();

    return await api(`/cqm-valuesets/codes/search?${query}`);
}

export async function fetchCqmValuesetCodes(valuesetId)
{
    const query = new URLSearchParams({ valueset_id: valuesetId }).toString();

    return await api(`/cqm-valuesets/codes?${query}`);
}

export async function createCqmValuesetCode(valuesetId, data)
{
    return await api(
        "/cqm-valuesets/codes",
        {
            method: "POST",
            body: JSON.stringify({ valueset_id: valuesetId, ...data })
        }
    );
}

export async function updateCqmValuesetCode(id, data)
{
    return await api(
        "/cqm-valuesets/codes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCqmValuesetCode(id)
{
    return await api(
        "/cqm-valuesets/codes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
