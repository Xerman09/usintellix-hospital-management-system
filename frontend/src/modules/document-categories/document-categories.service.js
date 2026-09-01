import { api } from "../../core/api.js?v=5";

export async function fetchDocumentCategories()
{
    return await api("/document-categories");
}

export async function createDocumentCategory(data)
{
    return await api(
        "/document-categories",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateDocumentCategory(id, data)
{
    return await api(
        "/document-categories",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteDocumentCategory(id)
{
    return await api(
        "/document-categories",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
