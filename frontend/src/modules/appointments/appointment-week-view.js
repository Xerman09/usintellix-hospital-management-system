import { formatApptTime, escapeHtml } from "./appointment-format.js?v=2";

const SLOT_MINUTES = 15;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Week view — same 15-minute time column as the day timeline, but with
 * one events column per day of the week instead of one. Each day
 * column header shows the weekday + date and is itself clickable to
 * jump to that day.
 */
export function renderWeekView(containerId, days, appointments, { onEdit, onCancel, onSelectDay } = {})
{
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    const byDate = {};

    days.forEach((day) => { byDate[day.dateStr] = new Map(); });

    appointments.forEach((appointment) => {
        const map = byDate[appointment.appointment_date];

        if (!map) {
            return;
        }

        const bucket = bucketStart(timeToMinutes(appointment.appointment_time));
        const list = map.get(bucket) || [];

        list.push(appointment);
        map.set(bucket, list);
    });

    const minutesList = appointments.map((appointment) => timeToMinutes(appointment.appointment_time));
    const earliestMinutes = Math.min(DEFAULT_START_HOUR * 60, ...minutesList);
    const latestMinutes = Math.max(DEFAULT_END_HOUR * 60 - SLOT_MINUTES, ...minutesList);

    const rangeStart = Math.floor(earliestMinutes / 60) * 60;
    const rangeEnd = Math.ceil((latestMinutes + SLOT_MINUTES) / 60) * 60;

    let html = `<div class="appt-week-corner"></div>`;

    days.forEach((day) => {
        const classes = ["appt-week-daycol-header"];

        if (day.isToday) classes.push("today");
        if (day.isSelected) classes.push("selected");

        html += `
            <div class="${classes.join(" ")}" data-date="${day.dateStr}">
                <span class="appt-week-dow">${DOW_SHORT[new Date(`${day.dateStr}T00:00:00`).getDay()]}</span>
                <span class="appt-week-daynum">${Number(day.dateStr.slice(8, 10))}</span>
            </div>
        `;
    });

    for (let minutes = rangeStart; minutes < rangeEnd; minutes += SLOT_MINUTES) {
        const isHour = minutes % 60 === 0;

        html += `<div class="appt-timeline-time ${isHour ? "on-hour" : ""}">${isHour ? formatHourLabel(minutes) : ""}</div>`;

        days.forEach((day) => {
            const events = byDate[day.dateStr].get(minutes) || [];

            html += `<div class="appt-week-cell">${events.map((appointment) => weekCard(appointment)).join("")}</div>`;
        });
    }

    container.innerHTML = html;

    container.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const appointment = appointments.find((a) => String(a.id) === btn.getAttribute("data-edit-id"));

            if (appointment && onEdit) {
                onEdit(appointment);
            }
        });
    });

    container.querySelectorAll("[data-cancel-id]").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            event.stopPropagation();

            if (!confirm("Delete this appointment?")) {
                return;
            }

            if (onCancel) {
                await onCancel(btn.getAttribute("data-cancel-id"), btn.getAttribute("data-date"));
            }
        });
    });

    container.querySelectorAll(".appt-week-daycol-header[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => onSelectDay && onSelectDay(cell.getAttribute("data-date")));
    });
}

function weekCard(appointment)
{
    const isBlock = Number(appointment.is_provider_block) === 1;
    const patientName = isBlock
        ? (appointment.title || "Provider Block")
        : [appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).join(" ");
    const title = `${formatApptTime(appointment.appointment_time)} ${patientName}${appointment.reason ? " — " + appointment.reason : ""}`;

    return `
        <div class="appt-week-card ${appointment.status}">
            <button type="button" class="appt-week-card-main" data-edit-id="${appointment.id}" title="${escapeHtml(title)}">
                <span class="appt-week-card-time">${formatApptTime(appointment.appointment_time)}</span>
                <span class="appt-week-card-patient">${escapeHtml(patientName)}</span>
            </button>
            <button type="button" class="appt-week-card-cancel" data-cancel-id="${appointment.id}" data-date="${appointment.appointment_date}" aria-label="Cancel">&times;</button>
        </div>
    `;
}

function timeToMinutes(timeStr)
{
    const [hours, minutes] = timeStr.split(":").map(Number);

    return hours * 60 + minutes;
}

function bucketStart(minutes)
{
    return Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function formatHourLabel(minutes)
{
    const hours = Math.floor(minutes / 60);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${hour12}:00 ${period}`;
}
