import { api } from "../../core/api.js?v=5";

export async function fetchCodes({ type = "", search = "", page = 1, perPage = 200 } = {})
{
    const params = new URLSearchParams();

    if (type) params.set("type", type);
    if (search) params.set("search", search);
    params.set("page", page);
    params.set("per_page", perPage);

    return await api(`/codes?${params.toString()}`);
}

export async function createCode(data)
{
    return await api(
        "/codes",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateCode(id, data)
{
    return await api(
        "/codes",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteCode(id)
{
    return await api(
        "/codes",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

export async function importCodes(codeType, file)
{
    const formData = new FormData();
    formData.append("code_type", codeType);
    formData.append("file", file);

    return await api(
        "/codes/import",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function installCodeSet(codeType, file, replaceEntireSet)
{
    const formData = new FormData();
    formData.append("code_type", codeType);
    formData.append("replace_entire_set", replaceEntireSet ? "1" : "0");
    formData.append("file", file);

    return await api(
        "/codes/install-code-set",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}
