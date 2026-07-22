import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from "./appointments.service.js";
import { fetchPatients } from "../patients/patients.service.js";
import { formatApptDate, formatApptTime } from "./appointment-format.js";
import { renderAppointmentRows } from "./appointment-table.js";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 2;
const FIELDS = ["patient_id", "appointment_date", "appointment_time", "reason"];

let monthCache = {};
let currentYear;
let currentMonth;
let selectedDate;
let todayStr;

export async function initDoctorCalendar()
{
    const now = new Date();

    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    todayStr = toDateStr(currentYear, currentMonth, now.getDate());
    selectedDate = todayStr;
    monthCache = {};

    renderCalendarGrid();
    renderAppointmentList(selectedDate);

    try {
        await loadMonth(currentYear, currentMonth);
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderCalendarGrid();
    renderAppointmentList(selectedDate);

    document.getElementById("calPrevMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("calNextMonth").addEventListener("click", () => changeMonth(1));

    await loadPatientOptions();
    setupAppointmentModal();
}

async function changeMonth(delta)
{
    currentMonth += delta;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendarGrid();

    try {
        await loadMonth(currentYear, currentMonth);
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderCalendarGrid();
}

async function loadMonth(year, month)
{
    const key = monthKey(year, month);

    if (monthCache[key]) {
        return monthCache[key];
    }

    const from = `${key}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = toDateStr(year, month, lastDay);

    const result = await fetchAppointments({ from, to });

    monthCache[key] = result.success ? result.data : [];

    return monthCache[key];
}

function renderCalendarGrid()
{
    const grid = document.getElementById("calendarGrid");
    const monthLabel = document.getElementById("calMonthLabel");

    monthLabel.textContent = new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const appointments = monthCache[monthKey(currentYear, currentMonth)] || [];
    const byDate = {};

    appointments.forEach((appointment) => {
        (byDate[appointment.appointment_date] ||= []).push(appointment);
    });

    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dowCells = DOW_LABELS.map((label) => `<div class="calendar-dow">${label}</div>`).join("");

    let dayCells = "";

    for (let i = 0; i < firstDayOfWeek; i++) {
        dayCells += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toDateStr(currentYear, currentMonth, day);
        const dayAppointments = (byDate[dateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const classes = ["calendar-day"];

        if (dateStr === todayStr) classes.push("today");
        if (dateStr === selectedDate) classes.push("selected");
        if (dayAppointments.length) classes.push("has-appointments");

        const visibleChips = dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appointment) => `
            <div class="calendar-appt-chip ${appointment.status}">
                ${formatApptTime(appointment.appointment_time)} ${appointment.patient_last_name ?? ""}
            </div>
        `).join("");

        const overflow = dayAppointments.length > MAX_CHIPS_PER_DAY
            ? `<div class="calendar-appt-more">+${dayAppointments.length - MAX_CHIPS_PER_DAY} more</div>`
            : "";

        dayCells += `
            <div class="${classes.join(" ")}" data-date="${dateStr}">
                <span class="calendar-day-num">${day}</span>
                <div class="calendar-day-appts">${visibleChips}${overflow}</div>
            </div>
        `;
    }

    grid.innerHTML = dowCells + dayCells;

    grid.querySelectorAll(".calendar-day[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => {
            selectedDate = cell.getAttribute("data-date");
            renderCalendarGrid();
            renderAppointmentList(selectedDate);
        });
    });
}

/**
 * Single side panel — shows the selected calendar day's appointments
 * (defaults to today on load). Replaces what used to be a separate
 * "Today's"/"Selected Day" table under the calendar grid.
 */
function renderAppointmentList(dateStr)
{
    const label = document.getElementById("appointmentListLabel");

    label.textContent = dateStr === todayStr ? "Today's Appointments" : `Appointments — ${formatApptDate(dateStr)}`;

    const dayAppointments = Object.values(monthCache)
        .flat()
        .filter((appointment) => appointment.appointment_date === dateStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    renderAppointmentRows("doctorAppointmentsListBody", dayAppointments, {
        showDate: false,
        showProvider: false,
        emptyMessage: "No appointments for this day.",
        onEdit: openEditModal,
        onCancel: async (id, dateStr) => {
            await deleteAppointment(id);
            await refreshAfterMutation(dateStr);
        }
    });
}

async function refreshAfterMutation(affectedDateStr)
{
    invalidateMonth(affectedDateStr);
    await loadMonth(currentYear, currentMonth);
    renderCalendarGrid();
    renderAppointmentList(selectedDate);
}

function setupAppointmentModal()
{
    const modalOverlay = document.getElementById("addAppointmentModalOverlay");
    const form = document.getElementById("addAppointmentForm");

    const openAddModal = () => {
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        document.getElementById("appointment_id").value = "";
        document.getElementById("appointment_date").min = todayStr;
        document.getElementById("appointment_date").value = selectedDate < todayStr ? todayStr : selectedDate;
        document.getElementById("appointmentModalTitle").textContent = "New Appointment";
        document.getElementById("statusFieldGroup").style.display = "none";
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddAppointmentModal").addEventListener("click", openAddModal);
    document.getElementById("closeAddAppointmentModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddAppointment").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const id = document.getElementById("appointment_id").value;
        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        if (id) {
            data.status = document.getElementById("status").value;
        }

        const result = id
            ? await updateAppointment(id, data)
            : await createAppointment(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save appointment.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert(id ? "Appointment updated successfully." : "Appointment scheduled successfully.", "success");

        await refreshAfterMutation(data.appointment_date);
    });
}

function openEditModal(appointment)
{
    const modalOverlay = document.getElementById("addAppointmentModalOverlay");

    document.getElementById("appointment_id").value = appointment.id;
    document.getElementById("patient_id").value = appointment.patient_id;
    document.getElementById("appointment_date").removeAttribute("min");
    document.getElementById("appointment_date").value = appointment.appointment_date;
    document.getElementById("appointment_time").value = appointment.appointment_time.slice(0, 5);
    document.getElementById("reason").value = appointment.reason ?? "";
    document.getElementById("status").value = appointment.status;

    document.getElementById("appointmentModalTitle").textContent = "Edit Appointment";
    document.getElementById("statusFieldGroup").style.display = "block";

    clearErrors();
    document.getElementById("formAlert").innerHTML = "";

    modalOverlay.classList.add("open");
}

async function loadPatientOptions()
{
    const result = await fetchPatients();
    const select = document.getElementById("patient_id");

    if (result.success) {
        result.data.forEach((patient) => {
            const option = document.createElement("option");

            option.value = patient.id;
            option.textContent = `${[patient.first_name, patient.last_name].filter(Boolean).join(" ")} (${patient.patient_no})`;

            select.appendChild(option);
        });
    }
}

function invalidateMonth(dateStr)
{
    if (!dateStr) return;

    const [year, month] = dateStr.split("-").map(Number);

    delete monthCache[`${year}-${String(month).padStart(2, "0")}`];
}

function clearErrors()
{
    FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function toDateStr(year, month, day)
{
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthKey(year, month)
{
    return `${year}-${String(month + 1).padStart(2, "0")}`;
}
