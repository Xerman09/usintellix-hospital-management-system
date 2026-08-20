import { fetchPatientDocuments } from "../patient-documents/patient-documents.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";
import { API_URL } from "../../core/api.js";

export async function initDocuments()
{
    const body = document.getElementById("docsTableBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientDocuments();

        renderDocuments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load documents", error);
        body.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load documents right now.</td></tr>`;
    }
}

function formatFileSize(bytes)
{
    if (!bytes) {
        return "-";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderDocuments(documents)
{
    const body = document.getElementById("docsTableBody");

    body.innerHTML = documents.length
        ? documents.map((doc) => `
            <tr>
                <td>${escapeHtml(doc.original_filename)}</td>
                <td>${escapeHtml(doc.category || "-")}</td>
                <td>${escapeHtml((doc.created_at || "").slice(0, 10) || "-")}</td>
                <td>${formatFileSize(doc.file_size)}</td>
                <td><a href="${API_URL}${doc.file_path}" target="_blank" rel="noopener">Download</a></td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="table-empty">No documents have been shared with you yet.</td></tr>`;
}
