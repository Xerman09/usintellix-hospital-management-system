import { fetchPatientDocuments, uploadPatientDocument } from "../patient-documents/patient-documents.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";
import { API_URL } from "../../core/api.js";
import { getUser } from "../../core/session.js";

export async function initDocuments()
{
    const body = document.getElementById("docsTableBody");

    if (!body) {
        return;
    }

    renderWelcomeName();
    setupToolbar();
    setupUploadModal();
    await loadDocuments();
}

function renderWelcomeName()
{
    const el = document.getElementById("docsWelcomeName");

    if (!el) {
        return;
    }

    const user = getUser();
    const name = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "";

    el.textContent = name ? `, ${name}` : "";
}

async function loadDocuments()
{
    const body = document.getElementById("docsTableBody");

    if (!body) {
        return;
    }

    body.innerHTML = `<tr><td colspan="6" class="table-empty">Loading...</td></tr>`;

    try {
        const result = await fetchPatientDocuments();

        renderDocuments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load documents", error);
        body.innerHTML = `<tr><td colspan="6" class="table-empty">Unable to load documents right now.</td></tr>`;
    }
}

function setupToolbar()
{
    document.getElementById("docsReloadBtn").addEventListener("click", loadDocuments);

    document.getElementById("docsExitBtn").addEventListener("click", () => {
        window.tabManager.closeTab("documents");
    });
}

function setupUploadModal()
{
    const overlay = document.getElementById("docsUploadModalOverlay");
    const form = document.getElementById("docsUploadForm");

    const openModal = () => {
        document.getElementById("docsUploadFormAlert").innerHTML = "";
        form.reset();
        overlay.classList.add("open");
    };

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("docsUploadBtn").addEventListener("click", openModal);
    document.getElementById("docsUploadModalClose").addEventListener("click", closeModal);
    document.getElementById("docsUploadCancelBtn").addEventListener("click", closeModal);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fileInput = document.getElementById("docsUpload_file");
        const file = fileInput.files[0];

        if (!file) {
            showAlert("docsUploadFormAlert", "Please choose a file to upload.", "error");
            return;
        }

        const details = {
            category: document.getElementById("docsUpload_category").value,
            description: document.getElementById("docsUpload_description").value.trim()
        };

        // Patients upload only to their own record; the backend resolves
        // the actual patient_id from the session and ignores this value.
        const result = await uploadPatientDocument("", file, details);

        if (!result.success) {
            showAlert("docsUploadFormAlert", result.message || "Failed to upload document.", "error");
            return;
        }

        closeModal();
        await loadDocuments();
    });
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
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
                <td>${escapeHtml(doc.uploaded_by_name || "-")}</td>
                <td>${escapeHtml((doc.created_at || "").slice(0, 10) || "-")}</td>
                <td>${formatFileSize(doc.file_size)}</td>
                <td><a href="${API_URL}${doc.file_path}" target="_blank" rel="noopener">Download</a></td>
            </tr>
        `).join("")
        : `<tr><td colspan="6" class="table-empty">No documents have been shared with you yet.</td></tr>`;
}
