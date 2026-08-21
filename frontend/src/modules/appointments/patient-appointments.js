import { fetchAppointments } from "./appointments.service.js";
import { formatApptTime, statusLabel, escapeHtml, toDateStr, formatMonthLabel } from "./appointment-format.js";

const WEEKDAY_FORMAT = { weekday: "short" };
const MONTH_FORMAT = { month: "short" };
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;

let allAppointments = [];
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedDate = null;

export async function initPatientAppointments()
{
    const upcomingList = document.getElementById("apptUpcomingList");
    const pastList = document.getElementById("apptPastList");

    if (!upcomingList || !pastList) {
        return;
    }

    setupViewSwitch();
    setupCalendarNav();

    try {
        const result = await fetchAppointments();

        if (!result.success) {
            throw new Error(result.message);
        }

        allAppointments = result.data || [];
        renderAppointments(allAppointments);
    } catch (error) {
        console.error("Failed to load appointments", error);
        upcomingList.innerHTML = `<div class="appt-empty">Unable to load appointments right now.</div>`;
        pastList.innerHTML = "";
    }
}

function setupViewSwitch()
{
    const buttons = document.querySelectorAll(".pt-appt-view-btn");
    const listView = document.getElementById("apptListView");
    const calendarView = document.getElementById("apptCalendarView");

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            const isCalendar = btn.getAttribute("data-view") === "calendar";

            listView.hidden = isCalendar;
            calendarView.hidden = !isCalendar;

            if (isCalendar) {
                renderCalendar();
            }
        });
    });
}

function setupCalendarNav()
{
    document.getElementById("apptCalPrev").addEventListener("click", () => {
        calendarMonth -= 1;

        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear -= 1;
        }

        renderCalendar();
    });

    document.getElementById("apptCalNext").addEventListener("click", () => {
        calendarMonth += 1;

        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear += 1;
        }

        renderCalendar();
    });
}

function renderAppointments(appointments)
{
    const today = toDateStr(new Date());

    const upcoming = appointments
        .filter((appt) => appt.appointment_date >= today)
        .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time));

    const past = appointments
        .filter((appt) => appt.appointment_date < today)
        .sort((a, b) => (b.appointment_date + b.appointment_time).localeCompare(a.appointment_date + a.appointment_time));

    renderList("apptUpcomingList", upcoming, "No upcoming appointments.", false);
    renderList("apptPastList", past, "No past appointments.", true);
}

function renderList(listId, rows, emptyMessage, isPast)
{
    const list = document.getElementById(listId);

    list.innerHTML = rows.length
        ? rows.map((appt) => apptCard(appt, isPast)).join("")
        : `<div class="appt-empty">${emptyMessage}</div>`;
}

function renderCalendar()
{
    const grid = document.getElementById("apptCalGrid");
    const label = document.getElementById("apptCalLabel");

    if (!grid || !label) {
        return;
    }

    label.textContent = formatMonthLabel(calendarYear, calendarMonth);

    const todayStr = toDateStr(new Date());
    const appointmentsByDate = {};

    allAppointments.forEach((appt) => {
        (appointmentsByDate[appt.appointment_date] ||= []).push(appt);
    });

    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    let html = DOW_LABELS.map((dow) => `<div class="appt-month-dow">${dow}</div>`).join("");

    for (let i = 0; i < firstDayOfWeek; i++) {
        html += `<div class="appt-month-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = monthDateStr(calendarYear, calendarMonth, day);
        const dayAppointments = (appointmentsByDate[dateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const classes = ["appt-month-day"];

        if (dateStr === todayStr) classes.push("today");
        if (dateStr === selectedDate) classes.push("selected");

        const visibleChips = dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appt) => {
            const providerName = [appt.provider_first_name, appt.provider_last_name].filter(Boolean).join(" ");

            return `<div class="appt-month-chip ${appt.status}">${formatApptTime(appt.appointment_time)} ${escapeHtml(providerName || "Provider TBD")}</div>`;
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

    grid.innerHTML = html;

    grid.querySelectorAll(".appt-month-day[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => {
            selectedDate = cell.getAttribute("data-date");
            renderCalendar();
            renderCalendarDayDetail(appointmentsByDate[selectedDate] || []);
        });
    });
}

function renderCalendarDayDetail(dayAppointments)
{
    const title = document.getElementById("apptCalDayTitle");
    const list = document.getElementById("apptCalDayList");

    if (!title || !list) {
        return;
    }

    const todayStr = toDateStr(new Date());
    const isPast = selectedDate < todayStr;

    title.textContent = formatDayHeading(selectedDate);

    const sorted = dayAppointments.slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    list.innerHTML = sorted.length
        ? sorted.map((appt) => apptCard(appt, isPast)).join("")
        : `<div class="appt-empty">No appointments on this date.</div>`;
}

function formatDayHeading(dateStr)
{
    const [year, month, day] = dateStr.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function monthDateStr(year, month, day)
{
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function apptCard(appt, isPast)
{
    const [year, month, day] = appt.appointment_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const providerName = [appt.provider_first_name, appt.provider_last_name].filter(Boolean).join(" ");
    const location = [appt.room_name, appt.facility_name].filter(Boolean).join(", ");

    return `
        <div class="pt-appt-card ${isPast ? "pt-appt-card--past" : ""} ${appt.status}">
            <div class="pt-appt-card-date">
                <span class="pt-appt-card-weekday">${date.toLocaleDateString("en-US", WEEKDAY_FORMAT)}</span>
                <span class="pt-appt-card-day">${date.getDate()}</span>
                <span class="pt-appt-card-month">${date.toLocaleDateString("en-US", MONTH_FORMAT)}</span>
            </div>
            <div class="pt-appt-card-body">
                <div class="pt-appt-card-top">
                    <span class="pt-appt-card-time">${formatApptTime(appt.appointment_time)}</span>
                    <span class="status-badge ${appt.status}">${statusLabel(appt.status)}</span>
                </div>
                <div class="pt-appt-card-with">${providerName ? `Dr. ${escapeHtml(providerName)}` : "Provider TBD"}</div>
                ${appt.reason ? `<div class="pt-appt-card-reason">${escapeHtml(appt.reason)}</div>` : ""}
                ${location ? `<div class="pt-appt-card-location">${escapeHtml(location)}</div>` : ""}
            </div>
        </div>
    `;
}
