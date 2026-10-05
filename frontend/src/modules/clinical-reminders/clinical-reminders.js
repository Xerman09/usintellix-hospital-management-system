import { getUser } from "../../core/session.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchRemindersForPatient } from "./clinical-reminders.service.js";
import { fetchReminderActions, addReminderAction } from "../patient-reminders/patient-reminders.service.js";
import { showToast } from "../../core/toast.js";
import { systemNow, toDateTimeInput } from "../../core/timezone.js";

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
    const list = document.getElementById("crRemindersList");
    if (list) list.innerHTML = `<li class="cr-empty">${escapeHtml(message)}</li>`;
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
    if (list) list.innerHTML = `<li class="cr-empty">Loading…</li>`;

    const result = await fetchRemindersForPatient(currentPatient.id);

    currentReminders = result.success ? (result.data || []) : [];

    renderReminders(result.success ? null : (result.message || "Unable to load reminders."));
}

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Derive category string from item_label (e.g. "Assessment: Colon…" or "Assessment - Colon…")
 */
function reminderCategory(label)
{
    const l = String(label || "").toLowerCase();
    if (l.startsWith("assessment"))  return "assessment";
    if (l.startsWith("measurement")) return "measurement";
    if (l.startsWith("treatment") || l.startsWith("immunization")) return "treatment";
    return "default";
}

function categoryIcon(cat)
{
    const icons = {
        assessment:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`,
        measurement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        treatment:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
        default:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 8 12 12 14 14"/></svg>`
    };
    return icons[cat] || icons.default;
}

/**
 * Returns the display label part after "Category: " or "Category - " if present.
 */
function reminderShortLabel(label)
{
    const m = String(label || "").match(/^[^:\-]+(?::\s*|\s+-\s+)(.+)$/);
    return m ? m[1] : label;
}

function reminderCategoryLabel(label)
{
    const m = String(label || "").match(/^([^:\-]+)(?::|\s+-)/);
    return m ? m[1].trim() : "Assessment";
}

function statusPillClass(dueStatus)
{
    if (dueStatus === "past_due") return "past_due";
    if (dueStatus === "due")      return "due";
    return "not_due";
}

function statusPillText(dueStatus)
{
    if (dueStatus === "past_due") return "Past Due";
    if (dueStatus === "due")      return "Due";
    return "Not Due";
}

/* ── Render list ────────────────────────────────────────────────── */

function renderReminders(errorMessage)
{
    const list = document.getElementById("crRemindersList");
    if (!list) return;

    if (errorMessage) {
        list.innerHTML = `<li class="cr-empty">${escapeHtml(errorMessage)}</li>`;
        return;
    }

    if (!currentReminders.length) {
        list.innerHTML = `<li class="cr-empty">No clinical reminders due for this patient.</li>`;
        return;
    }

    list.innerHTML = currentReminders.map((rem) => {
        const cat        = reminderCategory(rem.item_label);
        const pill       = statusPillClass(rem.due_status);
        const pillText   = statusPillText(rem.due_status);
        const shortLabel = reminderShortLabel(rem.item_label);
        const catLabel   = reminderCategoryLabel(rem.item_label);
        const isClickable = true; // all are openable

        return `
        <li class="cr-list-item">
            <div class="cr-item-type-icon ${cat}">${categoryIcon(cat)}</div>
            <div class="cr-item-info">
                <button type="button"
                    class="cr-item-link${isClickable ? " clickable" : ""}"
                    data-reminder-id="${rem.id}"
                >${escapeHtml(shortLabel)}</button>
                <div class="cr-item-category">${escapeHtml(catLabel)}</div>
            </div>
            <span class="cr-status-pill ${pill}">
                <span class="cr-status-dot"></span>
                ${pillText}
            </span>
            <span class="cr-item-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </span>
        </li>`;
    }).join("");

    list.querySelectorAll(".cr-item-link[data-reminder-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const reminder = currentReminders.find((r) => String(r.id) === btn.getAttribute("data-reminder-id"));
            if (reminder) openAssessmentModal(reminder);
        });
    });
}

/* ── Assessment modal ───────────────────────────────────────────── */

function wireAssessmentModal()
{
    const overlay = document.getElementById("crReminderFormModalOverlay");
    if (!overlay) return;

    const close = () => overlay.classList.remove("open");

    document.getElementById("closeCrReminderFormModal")?.addEventListener("click", close);
    document.getElementById("crReminderFormCancelBtn")?.addEventListener("click", close);
    document.getElementById("closeCrReminderFormModalBottom")?.addEventListener("click", close);

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
    const timeline  = document.getElementById("crReminderTimeline");
    const countEl   = document.getElementById("crReminderHistoryCount");

    if (!timeline || !countEl) return;

    const n = actions.length;
    countEl.textContent = n === 1 ? "1 record" : `${n} records`;

    if (!n) {
        timeline.innerHTML = `<p class="cr-timeline-empty">No previous entries.</p>`;
        return;
    }

    timeline.innerHTML = actions.map((item) => {
        const dateStr     = String(item.action_date || "").replace("T", " ").slice(0, 16);
        const completed   = item.completed === "yes" ? "yes" : "no";
        const completedLbl = completed === "yes" ? "YES" : "NO";
        const details     = item.details || "—";

        return `
        <div class="cr-timeline-item">
            <div class="cr-timeline-line">
                <div class="cr-timeline-dot"></div>
                <div class="cr-timeline-connector"></div>
            </div>
            <div class="cr-timeline-body">
                <div class="cr-timeline-date">${escapeHtml(dateStr)}</div>
                <div class="cr-timeline-card">
                    <span class="cr-timeline-completed ${completed}">${completedLbl}</span>
                    <span class="cr-timeline-details">${escapeHtml(details)}</span>
                </div>
            </div>
        </div>`;
    }).join("");
}

async function openAssessmentModal(reminder)
{
    const overlay = document.getElementById("crReminderFormModalOverlay");
    if (!overlay) return;

    // Title
    document.getElementById("crReminderFormTitle").textContent = reminder.item_label;

    // Type pill
    const cat = reminderCategory(reminder.item_label);
    const catLabel = reminderCategoryLabel(reminder.item_label);
    const typePill = document.getElementById("crModalTypePill");
    if (typePill) {
        typePill.className = `cr-modal-type-pill ${cat}`;
        typePill.textContent = catLabel;
    }

    // Status inline
    const statusInline = document.getElementById("crModalStatusInline");
    if (statusInline) {
        const pill = statusPillClass(reminder.due_status);
        statusInline.className = `cr-modal-status-inline ${pill}`;
        statusInline.innerHTML = `
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
            ${statusPillText(reminder.due_status)}
        `;
    }

    // Form fields
    const dateInput      = document.getElementById("crReminderDate");
    const completedInput = document.getElementById("crReminderCompleted");
    const detailsInput   = document.getElementById("crReminderDetails");
    const saveBtn        = document.getElementById("crReminderFormSaveBtn");

    if (dateInput)      dateInput.value      = toDateTimeInput(systemNow());
    if (completedInput) completedInput.value = "yes";
    if (detailsInput)   detailsInput.value   = "";

    // History loading state
    const timeline = document.getElementById("crReminderTimeline");
    if (timeline) timeline.innerHTML = `<p class="cr-timeline-empty">Loading…</p>`;

    overlay.classList.add("open");

    const actionsResult = await fetchReminderActions(reminder.id);
    renderHistory(actionsResult.success ? actionsResult.data : []);

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const actionDate = dateInput?.value ? dateInput.value.replace("T", " ") : "";

            if (!actionDate) {
                showToast("Date/Time is required.", "error");
                return;
            }

            saveBtn.disabled = true;

            const result = await addReminderAction(reminder.id, {
                action_date: actionDate,
                completed:   completedInput?.value || "yes",
                details:     detailsInput?.value   || ""
            });

            saveBtn.disabled = false;

            if (!result.success) {
                showToast(result.message || "Failed to log this action.", "error");
                return;
            }

            if (detailsInput) detailsInput.value = "";

            const refreshed = await fetchReminderActions(reminder.id);
            renderHistory(refreshed.success ? refreshed.data : []);

            showToast("Action logged.", "success");
        };
    }
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
