import { formatApptTime, statusLabel, escapeHtml } from "./appointment-format.js?v=2";

const SLOT_MINUTES = 15;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;

/**
 * Day timeline — a timestamp column (15-minute rows, hour labels only)
 * beside a borderless events column. Appointments have no stored
 * duration, so each one is bucketed into the 15-minute row its
 * appointment_time falls in.
 */
export function renderTimeline(containerId, appointments, { showProvider = false, emptyMessage = "No appointments for this day.", onEdit, onCancel } = {})
{
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (!appointments.length) {
        container.innerHTML = `<div class="appt-timeline-empty">${escapeHtml(emptyMessage)}</div>`;
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

    let html = "";

    for (let minutes = rangeStart; minutes < rangeEnd; minutes += SLOT_MINUTES) {
        const isHour = minutes % 60 === 0;
        const events = byBucket.get(minutes) || [];

        html += `
            <div class="appt-timeline-time ${isHour ? "on-hour" : ""}">${isHour ? formatHourLabel(minutes) : ""}</div>
            <div class="appt-timeline-events">${events.map((appointment) => apptCard(appointment, showProvider)).join("")}</div>
        `;
    }

    container.innerHTML = html;

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

function formatHourLabel(minutes)
{
    const hours = Math.floor(minutes / 60);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${hour12}:00 ${period}`;
}
