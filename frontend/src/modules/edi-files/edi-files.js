import {
    fetchEdiFiles, uploadEdiFiles, fetchEdiFilePreview, fetchEdiFileNotes, addEdiFileNote, setEdiFileArchived,
    fetchCsvTable
} from "./edi-files.service.js";
import { showToast } from "../../core/toast.js";

let allFiles = [];
let selectedPreviewFileId = null;
let selectedNotesFileId = null;
let currentCsvResult = null;

export async function initEdiFiles() {
    document.querySelectorAll("[data-edi-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.getAttribute("data-edi-tab")));
    });

    document.getElementById("ediUploadBtn").addEventListener("click", uploadFiles);
    document.getElementById("ediResetBtn").addEventListener("click", () => {
        document.getElementById("ediFileInput").value = "";
        document.getElementById("ediUploadAlert").innerHTML = "";
    });

    document.getElementById("ediFileSubmitBtn").addEventListener("click", () => {
        document.getElementById("ediFileAlert").innerHTML = "";

        const value = document.getElementById("ediFileSelect").value;

        if (!value) {
            showAlert("ediFileAlert", "Choose a file first.", "error");
            return;
        }

        selectedPreviewFileId = value;
        loadPreview();
    });

    document.getElementById("ediFileResetBtn").addEventListener("click", () => {
        selectedPreviewFileId = null;
        document.getElementById("ediFileSelect").value = "";
        document.getElementById("ediFileReport").checked = false;
        document.getElementById("ediFileAlert").innerHTML = "";
        document.getElementById("ediFileMeta").innerHTML = "";
        document.getElementById("ediPreviewBox").style.display = "none";
    });

    document.getElementById("ediNotesSubmitBtn").addEventListener("click", () => {
        document.getElementById("ediNotesAlert").innerHTML = "";

        const value = document.getElementById("ediNotesFileSelect").value;

        if (!value) {
            showAlert("ediNotesAlert", "Choose a file first.", "error");
            return;
        }

        selectedNotesFileId = value;
        loadNotes();
    });

    document.getElementById("ediNotesArchiveBtn").addEventListener("click", async () => {
        if (!selectedNotesFileId) {
            showAlert("ediNotesAlert", "Submit a file first.", "error");
            return;
        }

        await toggleArchive(Number(selectedNotesFileId), true);
    });

    document.getElementById("ediNotesCloseBtn").addEventListener("click", closeNotesLog);

    document.getElementById("ediNoteOpenBtn").addEventListener("click", () => {
        if (!selectedNotesFileId) {
            showAlert("ediNotesAlert", "Submit a file on the left first.", "error");
            return;
        }

        const input = document.getElementById("ediNoteInput");
        input.disabled = false;
        document.getElementById("ediAddNoteBtn").disabled = false;
        input.focus();
    });

    document.getElementById("ediAddNoteBtn").addEventListener("click", addNote);
    document.getElementById("ediNoteCloseBtn").addEventListener("click", () => {
        const input = document.getElementById("ediNoteInput");
        input.value = "";
        input.disabled = true;
        document.getElementById("ediAddNoteBtn").disabled = true;
    });
    document.getElementById("ediNoteInput").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addNote();
        }
    });

    setupCsvTablesTab();

    await Promise.all([loadNewFiles(), loadArchivedFiles(), loadFilePickerOptions()]);
}

function setupCsvTablesTab() {
    const periodSelect = document.getElementById("ediCsvPeriod");

    applyPeriod(periodSelect.value);

    periodSelect.addEventListener("change", () => applyPeriod(periodSelect.value));

    document.getElementById("ediCsvSubmitBtn").addEventListener("click", () => runCsvTable());
    document.getElementById("ediCsvEncounterSubmitBtn").addEventListener("click", () => {
        const encounter = document.getElementById("ediCsvEncounter").value;

        if (!encounter) {
            showAlert("ediCsvAlert", "Enter an encounter number.", "error");
            return;
        }

        runCsvTable(Number(encounter));
    });

    document.getElementById("ediCsvDownloadBtn").addEventListener("click", downloadCsv);
}

function applyPeriod(days) {
    if (!days) return;

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(days));

    document.getElementById("ediCsvEndDate").value = to.toISOString().slice(0, 10);
    document.getElementById("ediCsvStartDate").value = from.toISOString().slice(0, 10);
}

async function runCsvTable(encounterId) {
    document.getElementById("ediCsvAlert").innerHTML = "";

    const resultsWrap = document.getElementById("ediCsvResultsWrap");
    const tbody = document.getElementById("ediCsvTableBody");
    const thead = document.getElementById("ediCsvTableHead");

    resultsWrap.style.display = "block";
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="edi-empty-state">Loading...</td></tr>`;

    const result = await fetchCsvTable({
        table: document.getElementById("ediCsvTableSelect").value,
        from: document.getElementById("ediCsvStartDate").value,
        to: document.getElementById("ediCsvEndDate").value,
        encounterId
    });

    if (!result.success) {
        currentCsvResult = null;
        thead.innerHTML = "";
        tbody.innerHTML = `<tr><td class="edi-empty-state">Failed to load the table.</td></tr>`;
        return;
    }

    currentCsvResult = result.data;
    renderCsvTable(currentCsvResult);
}

function renderCsvTable({ columns, rows }) {
    const thead = document.getElementById("ediCsvTableHead");
    const tbody = document.getElementById("ediCsvTableBody");

    thead.innerHTML = `<tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" class="edi-empty-state">No records match.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
    `).join("");
}

function downloadCsv() {
    if (!currentCsvResult || !currentCsvResult.rows.length) {
        showToast("Nothing to download yet -- run a search first.", "error");
        return;
    }

    const escapeCsvCell = (value) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const lines = [
        currentCsvResult.columns.map(escapeCsvCell).join(","),
        ...currentCsvResult.rows.map((row) => row.map(escapeCsvCell).join(","))
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `edi_csv_table_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function switchTab(tab) {
    document.querySelectorAll("[data-edi-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-edi-tab") === tab);
    });

    document.querySelectorAll("[data-edi-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-edi-panel") === tab);
    });
}

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

async function uploadFiles() {
    document.getElementById("ediUploadAlert").innerHTML = "";

    const input = document.getElementById("ediFileInput");

    if (!input.files || !input.files.length) {
        showAlert("ediUploadAlert", "Select at least one file to upload.", "error");
        return;
    }

    const result = await uploadEdiFiles(input.files);

    if (!result.success) {
        showAlert("ediUploadAlert", result.message || "Failed to upload the file(s).", "error");
        return;
    }

    showToast(result.message || "File(s) uploaded successfully.", "success");
    input.value = "";

    await Promise.all([loadNewFiles(), loadFilePickerOptions()]);
}

async function loadNewFiles() {
    const tbody = document.getElementById("ediNewFilesBody");

    const result = await fetchEdiFiles("new");

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="edi-empty-state">Failed to load files.</td></tr>`;
        return;
    }

    renderFilesTable(tbody, result.data || [], "archive");
}

async function loadArchivedFiles() {
    const tbody = document.getElementById("ediArchiveBody");

    const result = await fetchEdiFiles("archived");

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="5" class="edi-empty-state">Failed to load archived files.</td></tr>`;
        return;
    }

    renderArchiveTable(tbody, result.data || []);
}

function renderFilesTable(tbody, rows, actionMode) {
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="edi-empty-state">No new files.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.original_filename)}</td>
            <td>${escapeHtml(row.uploaded_by_name || "-")}</td>
            <td>${escapeHtml(formatDateTime(row.created_at))}</td>
            <td>${formatFileSize(row.file_size)}</td>
            <td>${row.note_count || 0}</td>
            <td><button type="button" class="edi-btn secondary" data-archive-id="${row.id}">Archive</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-archive-id]").forEach((btn) => {
        btn.addEventListener("click", () => toggleArchive(Number(btn.getAttribute("data-archive-id")), true));
    });
}

function renderArchiveTable(tbody, rows) {
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="edi-empty-state">No archived files.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.original_filename)}</td>
            <td>${escapeHtml(row.uploaded_by_name || "-")}</td>
            <td>${escapeHtml(formatDateTime(row.created_at))}</td>
            <td>${escapeHtml(formatDateTime(row.archived_at))}</td>
            <td><button type="button" class="edi-btn secondary" data-restore-id="${row.id}">Restore</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-restore-id]").forEach((btn) => {
        btn.addEventListener("click", () => toggleArchive(Number(btn.getAttribute("data-restore-id")), false));
    });
}

async function toggleArchive(id, archived) {
    const result = await setEdiFileArchived(id, archived);

    if (!result.success) {
        showToast(result.message || "Failed to update the file.", "error");
        return;
    }

    showToast(result.message || "Updated.", "success");
    await Promise.all([loadNewFiles(), loadArchivedFiles(), loadFilePickerOptions()]);
}

async function loadFilePickerOptions() {
    const result = await fetchEdiFiles("all");
    allFiles = result.success ? result.data : [];

    [document.getElementById("ediFileSelect"), document.getElementById("ediNotesFileSelect")].forEach((select) => {
        const currentValue = select.value;

        select.innerHTML = `<option value="">-- Select a file --</option>` + allFiles.map((f) => `
            <option value="${f.id}">${escapeHtml(f.original_filename)}${f.status === "archived" ? " (archived)" : ""}</option>
        `).join("");

        if (currentValue && allFiles.some((f) => String(f.id) === currentValue)) {
            select.value = currentValue;
        }
    });
}

async function loadPreview() {
    const metaEl = document.getElementById("ediFileMeta");
    const box = document.getElementById("ediPreviewBox");

    if (!selectedPreviewFileId) {
        metaEl.innerHTML = "";
        box.style.display = "none";
        return;
    }

    const file = allFiles.find((f) => String(f.id) === String(selectedPreviewFileId));

    metaEl.innerHTML = file ? `
        <p style="color:var(--text-muted); font-size:12.5px; margin:0 0 10px;">
            Uploaded by ${escapeHtml(file.uploaded_by_name || "-")} on ${escapeHtml(formatDateTime(file.created_at))} &middot; ${formatFileSize(file.file_size)}
        </p>
    ` : "";

    box.style.display = "block";
    box.textContent = "Loading...";

    const result = await fetchEdiFilePreview(selectedPreviewFileId);

    if (!result.success) {
        box.textContent = result.message || "Failed to load file preview.";
        return;
    }

    box.textContent = (result.data.content || "(empty file)") + (result.data.truncated ? "\n\n... (truncated)" : "");
}

function closeNotesLog() {
    selectedNotesFileId = null;
    document.getElementById("ediNotesFileSelect").value = "";
    document.getElementById("ediNotesAlert").innerHTML = "";
    document.getElementById("ediNotesList").innerHTML = "";

    const input = document.getElementById("ediNoteInput");
    input.value = "";
    input.disabled = true;
    document.getElementById("ediAddNoteBtn").disabled = true;
}

async function loadNotes() {
    const list = document.getElementById("ediNotesList");

    document.getElementById("ediNotesAlert").innerHTML = "";

    if (!selectedNotesFileId) {
        list.innerHTML = "";
        return;
    }

    list.innerHTML = `<li class="edi-empty-state">Loading...</li>`;

    const result = await fetchEdiFileNotes(selectedNotesFileId);

    if (!result.success) {
        list.innerHTML = `<li class="edi-empty-state">Failed to load notes.</li>`;
        return;
    }

    renderNotes(result.data || []);
}

function renderNotes(notes) {
    const list = document.getElementById("ediNotesList");

    if (!notes.length) {
        list.innerHTML = `<li class="edi-empty-state">No notes yet.</li>`;
        return;
    }

    list.innerHTML = notes.map((n) => `
        <li class="edi-note-item">
            <div class="edi-note-meta">${escapeHtml(n.created_by_name || "-")} &middot; ${escapeHtml(formatDateTime(n.created_at))}</div>
            <div>${escapeHtml(n.note)}</div>
        </li>
    `).join("");
}

async function addNote() {
    const input = document.getElementById("ediNoteInput");
    const text = input.value.trim();

    if (!text) return;

    const result = await addEdiFileNote(selectedNotesFileId, text);

    if (!result.success) {
        showAlert("ediNotesAlert", result.message || "Failed to add the note.", "error");
        return;
    }

    input.value = "";
    await Promise.all([loadNotes(), loadFilePickerOptions()]);
}

function formatFileSize(bytes) {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
    if (!value) return "";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
