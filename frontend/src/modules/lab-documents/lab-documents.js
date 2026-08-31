import { getUser } from "../../core/session.js";
import { fetchLabDocuments } from "../patient-documents/patient-documents.service.js";
import { API_URL } from "../../core/api.js";

// Real data: every "Lab Result" category document uploaded for any
// patient, across the whole practice. Note: this app has no
// encounter_id column on patient_documents, so that column always
// shows "-" -- it's not fabricated, the linkage genuinely doesn't exist.
export async function initLabDocuments()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    const today = new Date();
    const weekAgo = new Date(today);

    weekAgo.setDate(today.getDate() - 7);

    document.getElementById("ldFromDate").value = toDateInputValue(weekAgo);
    document.getElementById("ldToDate").value = toDateInputValue(today);

    document.getElementById("ldRefreshBtn").addEventListener("click", loadDocuments);

    await loadDocuments();
}

function toDateInputValue(date)
{
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function loadDocuments()
{
    const tbody = document.getElementById("ldTableBody");
    const from = document.getElementById("ldFromDate").value;
    const to = document.getElementById("ldToDate").value;

    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Loading...</td></tr>`;

    try {
        const result = await fetchLabDocuments(from, to);

        renderRows(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load lab documents", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load lab documents right now.</td></tr>`;
    }
}

function renderRows(documents)
{
    const tbody = document.getElementById("ldTableBody");

    if (!documents.length) {
        tbody.innerHTML = renderEmptyState();
        return;
    }

    tbody.innerHTML = documents.map((doc) => `
        <tr>
            <td>${escapeHtml(formatDateTime(doc.created_at))}</td>
            <td><a class="ld-name-link" href="${API_URL}${doc.file_path}" target="_blank" rel="noopener">${escapeHtml(doc.original_filename)}</a></td>
            <td>${escapeHtml(doc.patient_name)} <span class="ld-muted">(${escapeHtml(doc.patient_no)})</span></td>
            <td class="${doc.description ? "" : "ld-muted"}">${escapeHtml(doc.description || "No note")}</td>
            <td class="ld-muted">-</td>
        </tr>
    `).join("");
}

function renderEmptyState()
{
    return `
        <tr>
            <td colspan="5" class="ld-empty-state">
                <div class="ld-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>
                </div>
                <strong>No lab documents found</strong>
                <p>No "Lab Result" documents were uploaded in the selected date range.</p>
            </td>
        </tr>
    `;
}

function formatDateTime(value)
{
    if (!value) return "-";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
