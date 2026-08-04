import { api } from "../../core/api.js";

export async function fetchInformationSources()
{
    return await api("/information-sources");
}

export async function createInformationSource(data)
{
    return await api(
        "/information-sources",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateInformationSource(id, data)
{
    return await api(
        "/information-sources",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteInformationSource(id)
{
    return await api(
        "/information-sources",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
