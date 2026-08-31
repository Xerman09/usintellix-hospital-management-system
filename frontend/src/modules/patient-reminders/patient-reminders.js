import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPatientReminders,
    processReminders,
    processAndSendReminders
} from "./patient-reminders.service.js";

const PER_PAGE = 25;

let state = {
    sort: "item",
    dir: "asc",
    page: 1,
    total: 0,
    rows: []
};

export async function initPatientReminders()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    state = { sort: "item", dir: "asc", page: 1, total: 0, rows: [] };

    document.getElementById("prmProcessBtn").addEventListener("click", () => runAction(processReminders, "Reminders processed successfully."));
    document.getElementById("prmProcessSendBtn").addEventListener("click", () => runAction(processAndSendReminders, "Reminders processed and sent successfully."));

    document.getElementById("prmPrevBtn").addEventListener("click", () => changePage(state.page - 1));
    document.getElementById("prmNextBtn").addEventListener("click", () => changePage(state.page + 1));

    document.querySelectorAll(".prm-table th[data-sort]").forEach((th) => {
        th.addEventListener("click", () => {
            const column = th.dataset.sort;

            if (state.sort === column) {
                state.dir = state.dir === "asc" ? "desc" : "asc";
            } else {
                state.sort = column;
                state.dir = "asc";
            }

            state.page = 1;
            loadReminders();
        });
    });

    await loadReminders();
}

async function runAction(actionFn, successMessage)
{
    const processBtn = document.getElementById("prmProcessBtn");
    const sendBtn = document.getElementById("prmProcessSendBtn");

    processBtn.disabled = true;
    sendBtn.disabled = true;

    const result = await actionFn();

    processBtn.disabled = false;
    sendBtn.disabled = false;

    if (!result.success) {
        showToast(result.message || "Failed to process reminders.", "error");
        return;
    }

    showToast(result.message || successMessage, "success");
    state.page = 1;
    await loadReminders();
}

function changePage(page)
{
    const maxPage = Math.max(1, Math.ceil(state.total / PER_PAGE));

    if (page < 1 || page > maxPage) return;

    state.page = page;
    loadReminders();
}

async function loadReminders()
{
    const tbody = document.getElementById("prmTableBody");
    tbody.innerHTML = `<tr class="prm-loading-row"><td colspan="11">Loading...</td></tr>`;

    const result = await fetchPatientReminders({ sort: state.sort, dir: state.dir, page: state.page, perPage: PER_PAGE });

    if (!result.success) {
        tbody.innerHTML = `<tr class="prm-loading-row"><td colspan="11">${escapeHtml(result.message || "Failed to load reminders.")}</td></tr>`;
        return;
    }

    state.rows = result.data.rows || [];
    state.total = result.data.total || 0;

    renderPagination();
    updateSortIndicators();
    renderRows();
}

function renderPagination()
{
    const rangeEnd = Math.min(state.page * PER_PAGE, state.total);

    document.getElementById("prmPageText").textContent = `${rangeEnd} of ${state.total}`;
    document.getElementById("prmPrevBtn").disabled = state.page <= 1;
    document.getElementById("prmNextBtn").disabled = state.page * PER_PAGE >= state.total;
}

function updateSortIndicators()
{
    document.querySelectorAll(".prm-table th[data-sort]").forEach((th) => {
        th.querySelector(".prm-sort-arrow")?.remove();

        if (th.dataset.sort === state.sort) {
            const arrow = document.createElement("span");
            arrow.className = "prm-sort-arrow";
            arrow.textContent = state.dir === "asc" ? "▲" : "▼";
            th.appendChild(arrow);
        }
    });
}

function renderRows()
{
    const tbody = document.getElementById("prmTableBody");

    if (!state.rows.length) {
        tbody.innerHTML = renderEmptyState();
        return;
    }

    tbody.innerHTML = state.rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.item_label)}</td>
            <td>${escapeHtml(`${row.last_name}, ${row.first_name}`)}</td>
            <td><span class="prm-due-badge ${row.due_status}">${row.due_status === "past_due" ? "Past Due" : "Due"}</span></td>
            <td>${escapeHtml(row.date_created)}</td>
            <td>${yesNo(row.allow_email === "yes")}</td>
            <td>${yesNo(row.allow_sms === "yes")}</td>
            <td>${row.date_sent ? escapeHtml(row.date_sent) : `<span class="prm-not-sent">Not Sent Yet</span>`}</td>
            <td>${yesNo(Number(row.voice_sent))}</td>
            <td>${yesNo(Number(row.email_sent))}</td>
            <td>${yesNo(Number(row.sms_sent))}</td>
            <td>${yesNo(Number(row.mail_sent))}</td>
        </tr>
    `).join("");
}

function renderEmptyState()
{
    return `
        <tr>
            <td colspan="11" class="prm-empty-state">
                <div class="prm-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
                <strong>No reminders due</strong>
                <p>Click "Process Reminders" to check active Patient Reminder rules against your patients.</p>
            </td>
        </tr>
    `;
}

function yesNo(value)
{
    return value ? `<span class="prm-yes">YES</span>` : `<span class="prm-no">NO</span>`;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
