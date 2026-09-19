import { getUser } from "../../core/session.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchRemindersForPatient } from "./clinical-reminders.service.js";
import { fetchReminderActions, addReminderAction } from "../patient-reminders/patient-reminders.service.js";
import { showToast } from "../../core/toast.js";

let currentPatient = null;
let currentReminders = [];

export async function initClinicalReminders(presetReminderId = null)
{
    const user = getUser();

    if (!user || user.role === "patient") {
        window.location.hash = "#/dashboard";
        return;
    }

    currentPatient = null;
    currentReminders = [];

    document.getElementById("crBackBtn").addEventListener("click", goBackToPatient);
    document.getElementById("crPatientLink").addEventListener("click", goBackToPatient);

    wireTabs();
    wireAssessmentModal();

    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        renderNoPatient("Open a patient's chart first, then come back to Clinical Reminders.");
        return;
    }

    const patientsResult = await fetchPatients();
    currentPatient = patientsResult.success ? patientsResult.data.find((p) => p.patient_no === patientNo) : null;

    if (!currentPatient) {
        renderNoPatient("The active patient chart could not be resolved.");
        return;
    }

    document.getElementById("crPatientLink").textContent = `${currentPatient.last_name}, ${currentPatient.first_name}`;

    await loadReminders();

    if (presetReminderId) {
        const reminder = currentReminders.find((r) => String(r.id) === String(presetReminderId));
        if (reminder) openAssessmentModal(reminder);
    }
}

function goBackToPatient()
{
    if (window.tabManager && window.tabManager.tabs.has("patient_chart")) {
        window.tabManager.switchTab("patient_chart");
        return;
    }

    window.location.hash = "#/dashboard";
}

function renderNoPatient(message)
{
    document.getElementById("crRemindersList").innerHTML = `<li class="cr-empty">${escapeHtml(message)}</li>`;
}

function wireTabs()
{
    document.querySelectorAll(".cr-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".cr-tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".cr-panel").forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            document.querySelector(`.cr-panel[data-cr-panel="${tab.dataset.crTab}"]`).classList.add("active");
        });
    });
}

async function loadReminders()
{
    const list = document.getElementById("crRemindersList");
    list.innerHTML = `<li class="cr-empty">Loading...</li>`;

    const result = await fetchRemindersForPatient(currentPatient.id);

    currentReminders = result.success ? (result.data || []) : [];

    renderReminders(result.success ? null : (result.message || "Unable to load reminders."));
}

function renderReminders(errorMessage)
{
    const list = document.getElementById("crRemindersList");

    if (errorMessage) {
        list.innerHTML = `<li class="cr-empty">${escapeHtml(errorMessage)}</li>`;
        return;
    }

    if (!currentReminders.length) {
        list.innerHTML = `<li class="cr-empty">No clinical reminders due for this patient.</li>`;
        return;
    }

    list.innerHTML = currentReminders.map((rem) => {
        const isPastDue = rem.due_status === "past_due";

        return `
            <li>
                <button type="button" class="cr-item-link clickable" data-reminder-id="${rem.id}">${escapeHtml(rem.item_label)}</button>
                <span class="cr-status ${isPastDue ? "past_due" : "not_due"}">
                    <span class="cr-status-icon">${isPastDue ? "!" : "✓"}</span>
                    ${isPastDue ? "Past Due" : "Not Due"}
                </span>
            </li>
        `;
    }).join("");

    list.querySelectorAll(".cr-item-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const reminder = currentReminders.find((r) => String(r.id) === btn.getAttribute("data-reminder-id"));
            if (reminder) openAssessmentModal(reminder);
        });
    });
}

function wireAssessmentModal()
{
    const overlay = document.getElementById("crReminderFormModalOverlay");
    if (!overlay) return;

    const close = () => overlay.classList.remove("open");

    document.getElementById("closeCrReminderFormModal").addEventListener("click", close);
    document.getElementById("crReminderFormCancelBtn").addEventListener("click", close);
    document.getElementById("closeCrReminderFormModalBottom").addEventListener("click", close);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
    });
}

/**
 * Append-only action log, same as any real clinical documentation -- a
 * correction is a new entry, not a silent edit of a past one. Also
 * deliberately does not flip the list's due-status badge after logging:
 * due_status is a separate computation (see PatientReminderService::
 * process()) that this log never touches, so showing a fake "Not Due"
 * badge would misrepresent whether the item is still objectively due.
 */
function renderHistory(actions)
{
    const tbody = document.getElementById("crReminderHistoryTableBody");
    const countEl = document.getElementById("crReminderHistoryCount");

    countEl.textContent = `${actions.length} record(s)`;

    tbody.innerHTML = actions.length
        ? actions.map((item) => `
            <tr>
                <td>${escapeHtml(String(item.action_date || "").replace("T", " ").slice(0, 16))}</td>
                <td>${item.completed === "yes" ? "YES" : "NO"}</td>
                <td>${escapeHtml(item.details || "-")}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3" class="table-empty">No history recorded yet.</td></tr>`;
}

async function openAssessmentModal(reminder)
{
    const overlay = document.getElementById("crReminderFormModalOverlay");

    document.getElementById("crReminderFormTitle").textContent = reminder.item_label;

    const dateInput = document.getElementById("crReminderDate");
    const completedInput = document.getElementById("crReminderCompleted");
    const detailsInput = document.getElementById("crReminderDetails");
    const saveBtn = document.getElementById("crReminderFormSaveBtn");

    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    dateInput.value = now.toISOString().slice(0, 16);
    completedInput.value = "yes";
    detailsInput.value = "";

    document.getElementById("crReminderHistoryTableBody").innerHTML = `<tr><td colspan="3" class="table-empty">Loading...</td></tr>`;

    overlay.classList.add("open");

    const actionsResult = await fetchReminderActions(reminder.id);
    renderHistory(actionsResult.success ? actionsResult.data : []);

    saveBtn.onclick = async () => {
        const actionDate = dateInput.value ? dateInput.value.replace("T", " ") : "";

        if (!actionDate) {
            showToast("Date/Time is required.", "error");
            return;
        }

        saveBtn.disabled = true;

        const result = await addReminderAction(reminder.id, {
            action_date: actionDate,
            completed: completedInput.value || "yes",
            details: detailsInput.value || ""
        });

        saveBtn.disabled = false;

        if (!result.success) {
            showToast(result.message || "Failed to log this action.", "error");
            return;
        }

        detailsInput.value = "";

        const refreshed = await fetchReminderActions(reminder.id);
        renderHistory(refreshed.success ? refreshed.data : []);

        showToast("Action logged.", "success");
    };
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
