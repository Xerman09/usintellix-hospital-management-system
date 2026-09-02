import { api } from "../../core/api.js?v=5";

export async function fetchDocumentTemplates()
{
    return await api("/document-templates");
}

export async function uploadDocumentTemplate(file, destinationFilename)
{
    const formData = new FormData();
    formData.append("file", file);
    formData.append("destination_filename", destinationFilename);

    return await api(
        "/document-templates",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function deleteDocumentTemplate(filename)
{
    return await api(
        "/document-templates",
        {
            method: "DELETE",
            body: JSON.stringify({ filename })
        }
    );
}
