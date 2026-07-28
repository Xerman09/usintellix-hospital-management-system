import { formatApptTime, escapeHtml } from "./appointment-format.js?v=2";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;

/**
 * Full month calendar for the "Month" filter — no time column, just
 * dates with each day's appointments shown as small chips (like the
 * old single-calendar layout this page used to be, before it grew a
 * mini calendar + timeline for the Day/Week filters).
 */
export function renderMonthView(containerId, { year, month, todayStr, selectedDate, appointmentsByDate, onSelectDate })
{
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = DOW_LABELS.map((label) => `<div class="appt-month-dow">${label}</div>`).join("");

    for (let i = 0; i < firstDayOfWeek; i++) {
        html += `<div class="appt-month-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toDateStr(year, month, day);
        const dayAppointments = (appointmentsByDate[dateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const classes = ["appt-month-day"];

        if (dateStr === todayStr) classes.push("today");
        if (dateStr === selectedDate) classes.push("selected");

        const visibleChips = dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appointment) => {
            const label = Number(appointment.is_provider_block) === 1
                ? (appointment.title || "Provider Block")
                : [appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).join(" ");

            return `
            <div class="appt-month-chip ${appointment.status}">
                ${formatApptTime(appointment.appointment_time)} ${escapeHtml(label)}
            </div>
        `;
        }).join("");

        const overflow = dayAppointments.length > MAX_CHIPS_PER_DAY
            ? `<div class="appt-month-more">+${dayAppointments.length - MAX_CHIPS_PER_DAY} more</div>`
            : "";

        html += `
            <div class="${classes.join(" ")}" data-date="${dateStr}">
                <span class="appt-month-daynum">${day}</span>
                <div class="appt-month-chips">${visibleChips}${overflow}</div>
            </div>
        `;
    }

    container.innerHTML = html;

    container.querySelectorAll(".appt-month-day[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => onSelectDate && onSelectDate(cell.getAttribute("data-date")));
    });
}

function toDateStr(year, month, day)
{
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
