import { formatApptTime, statusLabel, escapeHtml } from "./appointment-format.js?v=2";

const SLOT_MINUTES = 15;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const ROW_HEIGHT_PX = 30; // matches .appt-timeline-time / .appt-timeline-events min-height

/**
 * Day timeline — a timestamp column (15-minute rows, hour labels only)
 * beside a borderless events column. Appointments have no stored
 * duration, so each one is bucketed into the 15-minute row its
 * appointment_time falls in.
 *
 * The hour grid always renders, even with zero appointments -- like
 * Google Calendar's day view, seeing the empty structure of the day is
 * the point, not just a "nothing here" message.
 */
export function renderTimeline(containerId, appointments, { showProvider = false, emptyMessage = "No appointments for this day.", isToday = false, onEdit, onCancel, onSlotClick } = {})
{
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    const sorted = appointments.slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    const minutesList = sorted.map((appointment) => timeToMinutes(appointment.appointment_time));

    const earliestMinutes = Math.min(DEFAULT_START_HOUR * 60, ...minutesList);
    const latestMinutes = Math.max(DEFAULT_END_HOUR * 60 - SLOT_MINUTES, ...minutesList);

    const rangeStart = Math.floor(earliestMinutes / 60) * 60;
    const rangeEnd = Math.ceil((latestMinutes + SLOT_MINUTES) / 60) * 60;

    const byBucket = new Map();

    sorted.forEach((appointment) => {
        const bucket = bucketStart(timeToMinutes(appointment.appointment_time));
        const list = byBucket.get(bucket) || [];

        list.push(appointment);
        byBucket.set(bucket, list);
    });

    const nowMinutes = isToday ? currentMinutes() : null;
    const showNowLine = nowMinutes !== null && nowMinutes >= rangeStart && nowMinutes < rangeEnd;

    let html = "";

    for (let minutes = rangeStart; minutes < rangeEnd; minutes += SLOT_MINUTES) {
        const isHour = minutes % 60 === 0;
        const events = byBucket.get(minutes) || [];
        const hourClass = isHour ? "on-hour" : "";
        const isEmpty = events.length === 0;

        html += `
            <div class="appt-timeline-time ${hourClass}">${isHour ? formatHourLabel(minutes) : ""}</div>
            <div class="appt-timeline-events ${hourClass} ${isEmpty ? "slot-empty" : ""}" ${isEmpty ? `data-slot-time="${minutesToTimeStr(minutes)}"` : ""}>${events.map((appointment) => apptCard(appointment, showProvider)).join("")}</div>
        `;
    }

    if (showNowLine) {
        const top = ((nowMinutes - rangeStart) / SLOT_MINUTES) * ROW_HEIGHT_PX;

        html += `<div class="appt-timeline-now-line" style="top: ${top}px;"></div>`;
    }

    container.innerHTML = !sorted.length
        ? `<div class="appt-timeline-empty-note">${escapeHtml(emptyMessage)}</div>${html}`
        : html;

    container.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const appointment = sorted.find((a) => String(a.id) === btn.getAttribute("data-edit-id"));

            if (appointment && onEdit) {
                onEdit(appointment);
            }
        });
    });

    container.querySelectorAll("[data-cancel-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this appointment?")) {
                return;
            }

            if (onCancel) {
                await onCancel(btn.getAttribute("data-cancel-id"), btn.getAttribute("data-date"));
            }
        });
    });

    if (onSlotClick) {
        container.querySelectorAll(".appt-timeline-events.slot-empty").forEach((cell) => {
            cell.addEventListener("click", () => onSlotClick(cell.getAttribute("data-slot-time")));
        });
    }

    // Scroll to whatever's most relevant: the current-time line if it's
    // in view (today), otherwise the day's first appointment, otherwise
    // straight to the top of the default range -- never leave the user
    // guessing which way to scroll to find "now" or the day's schedule.
    requestAnimationFrame(() => {
        const scrollMinutes = showNowLine
            ? nowMinutes
            : (minutesList.length ? Math.min(...minutesList) : rangeStart);

        const targetTop = ((scrollMinutes - rangeStart) / SLOT_MINUTES) * ROW_HEIGHT_PX;

        container.scrollTop = Math.max(0, targetTop - container.clientHeight / 3);
    });
}

function apptCard(appointment, showProvider)
{
    const isBlock = Number(appointment.is_provider_block) === 1;
    const patientName = isBlock
        ? (appointment.title || "Provider Block")
        : [appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).join(" ");
    const providerName = [appointment.provider_first_name, appointment.provider_last_name].filter(Boolean).join(" ");

    return `
        <div class="appt-timeline-card ${appointment.status}">
            <div class="appt-timeline-card-info">
                <span class="appt-timeline-card-time">${formatApptTime(appointment.appointment_time)}</span>
                <strong class="appt-timeline-card-patient">${escapeHtml(patientName)}</strong>
                ${showProvider && providerName ? `<span class="appt-timeline-card-provider">${escapeHtml(providerName)}</span>` : ""}
                ${appointment.reason ? `<span class="appt-timeline-card-reason">${escapeHtml(appointment.reason)}</span>` : ""}
            </div>
            <div class="appt-timeline-card-meta">
                <span class="status-badge ${appointment.status}">${statusLabel(appointment.status)}</span>
                <button type="button" class="btn-edit" data-edit-id="${appointment.id}">Edit</button>
                <button type="button" class="btn-danger" data-cancel-id="${appointment.id}" data-date="${appointment.appointment_date}">Cancel</button>
            </div>
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

function minutesToTimeStr(minutes)
{
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function currentMinutes()
{
    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();
}

function formatHourLabel(minutes)
{
    const hours = Math.floor(minutes / 60);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${hour12}:00 ${period}`;
}
