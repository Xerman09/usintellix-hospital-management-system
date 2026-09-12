import { fetchMyReminders } from "../patient-reminders/patient-reminders.service.js";
import { escapeHtml } from "../appointments/appointment-format.js";

export async function initHealthReminders()
{
    const dueList = document.getElementById("healthRemindersDue");
    const sentList = document.getElementById("healthRemindersSent");

    if (!dueList || !sentList) {
        return;
    }

    try {
        const result = await fetchMyReminders();

        if (!result.success) {
            throw new Error(result.message);
        }

        const reminders = result.data || [];

        const due = reminders.filter((reminder) => !reminder.date_sent);
        const sent = reminders.filter((reminder) => reminder.date_sent);

        renderList(dueList, due, "Nothing due right now — you're all caught up.");
        renderList(sentList, sent, "No reminders have been sent yet.");
    } catch (error) {
        console.error("Failed to load health reminders", error);
        dueList.innerHTML = `<div class="appt-empty">Unable to load reminders right now.</div>`;
        sentList.innerHTML = "";
    }
}

function renderList(container, rows, emptyMessage)
{
    container.innerHTML = rows.length
        ? rows.map(reminderCard).join("")
        : `<div class="appt-empty">${emptyMessage}</div>`;
}

function reminderCard(reminder)
{
    const statusLabel = reminder.due_status === "past_due" ? "Past Due" : "Due";
    const subtitle = reminder.date_sent
        ? `Sent ${formatDate(reminder.date_sent)}`
        : `Identified ${formatDate(reminder.date_created)}`;

    return `
        <div class="rec-mini-item">
            <div class="rec-mini-info">
                <strong>${escapeHtml(reminder.item_label || "Health reminder")}</strong>
                <span>${subtitle}</span>
            </div>
            <div class="rec-mini-date">
                <span class="status-badge ${reminder.due_status}">${statusLabel}</span>
            </div>
        </div>
    `;
}

function formatDate(value)
{
    if (!value) return "-";

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
