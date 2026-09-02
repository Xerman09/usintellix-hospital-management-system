import { showToast } from "../../core/toast.js";
import { API_URL } from "../../core/api.js?v=5";
import { fetchDocumentTemplates, uploadDocumentTemplate, deleteDocumentTemplate } from "./document-templates.service.js";

let templates = [];

export async function initDocumentTemplates()
{
    document.getElementById("dtmUploadBtn").addEventListener("click", handleUpload);
    document.getElementById("dtmDownloadBtn").addEventListener("click", handleDownload);
    document.getElementById("dtmDeleteBtn").addEventListener("click", handleDelete);

    await loadTemplates();
}

async function loadTemplates()
{
    const select = document.getElementById("dtmSelect");
    select.innerHTML = `<option value="">Loading...</option>`;

    const result = await fetchDocumentTemplates();

    if (!result.success) {
        select.innerHTML = `<option value="">Failed to load templates</option>`;
        showToast(result.message || "Failed to load document templates.", "error");
        return;
    }

    templates = result.data || [];
    renderSelect();
}

function renderSelect()
{
    const select = document.getElementById("dtmSelect");

    if (!templates.length) {
        select.innerHTML = `<option value="">-- No templates uploaded yet --</option>`;
        return;
    }

    select.innerHTML = templates.map((tpl) => `<option value="${escapeHtml(tpl.filename)}">${escapeHtml(tpl.filename)}</option>`).join("");
}

async function handleUpload()
{
    const fileInput = document.getElementById("dtmFile");
    const destinationInput = document.getElementById("dtmDestination");
    const alertEl = document.getElementById("dtmUploadAlert");

    alertEl.innerHTML = "";

    if (!fileInput.files.length) {
        alertEl.innerHTML = `<div class="form-alert error">Please choose a file to upload.</div>`;
        return;
    }

    const destinationFilename = destinationInput.value.trim() || fileInput.files[0].name;

    const uploadBtn = document.getElementById("dtmUploadBtn");
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    const result = await uploadDocumentTemplate(fileInput.files[0], destinationFilename);

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";

    if (!result.success) {
        alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to upload template.")}</div>`;
        return;
    }

    showToast(result.message, "success");
    fileInput.value = "";
    destinationInput.value = "";
    await loadTemplates();
}

function handleDownload()
{
    const select = document.getElementById("dtmSelect");
    const filename = select.value;

    if (!filename) {
        document.getElementById("dtmManageAlert").innerHTML = `<div class="form-alert error">Please select a template.</div>`;
        return;
    }

    const template = templates.find((tpl) => tpl.filename === filename);

    if (!template) {
        return;
    }

    document.getElementById("dtmManageAlert").innerHTML = "";
    window.open(`${API_URL}${template.file_path}`, "_blank", "noopener");
}

async function handleDelete()
{
    const select = document.getElementById("dtmSelect");
    const filename = select.value;
    const alertEl = document.getElementById("dtmManageAlert");

    alertEl.innerHTML = "";

    if (!filename) {
        alertEl.innerHTML = `<div class="form-alert error">Please select a template.</div>`;
        return;
    }

    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) {
        return;
    }

    const deleteBtn = document.getElementById("dtmDeleteBtn");
    deleteBtn.disabled = true;

    const result = await deleteDocumentTemplate(filename);

    deleteBtn.disabled = false;

    if (!result.success) {
        alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to delete template.")}</div>`;
        return;
    }

    showToast(result.message, "success");
    await loadTemplates();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
