import { fetchAppointments, createAppointment, fetchAvailableSlots } from "./appointments.service.js";
import { formatApptTime, statusLabel, escapeHtml, toDateStr, formatMonthLabel } from "./appointment-format.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { showToast } from "../../core/toast.js";

const WEEKDAY_FORMAT = { weekday: "short" };
const MONTH_FORMAT = { month: "short" };
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;

let allAppointments = [];
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedDate = null;

let pickersLoaded = false;
let selectedSlotTime = null;

export async function initPatientAppointments()
{
    const upcomingList = document.getElementById("apptUpcomingList");
    const pastList = document.getElementById("apptPastList");

    if (!upcomingList || !pastList) {
        return;
    }

    setupViewSwitch();
    setupCalendarNav();
    setupRequestModal();

    await loadAppointments();
}

async function loadAppointments()
{
    const upcomingList = document.getElementById("apptUpcomingList");
    const pastList = document.getElementById("apptPastList");

    try {
        const result = await fetchAppointments();

        if (!result.success) {
            throw new Error(result.message);
        }

        allAppointments = result.data || [];
        renderAppointments(allAppointments);

        if (!document.getElementById("apptCalendarView").hidden) {
            renderCalendar();
        }
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

function setupRequestModal()
{
    const openBtn = document.getElementById("apptRequestBtn");
    const overlay = document.getElementById("apptRequestModalOverlay");
    const closeBtn = document.getElementById("apptRequestCloseBtn");
    const cancelBtn = document.getElementById("apptRequestCancelBtn");
    const form = document.getElementById("apptRequestForm");
    const providerSelect = document.getElementById("apptReqProvider");
    const dateInput = document.getElementById("apptReqDate");

    const openModal = async () => {
        clearRequestErrors();
        document.getElementById("apptRequestAlert").innerHTML = "";

        if (!pickersLoaded) {
            pickersLoaded = true;
            await loadPickers();
        }

        const today = toDateStr(new Date());

        dateInput.min = today;

        if (!dateInput.value) {
            dateInput.value = today;
        }

        resetSlotPicker();
        loadSlotsForSelection();

        overlay.classList.add("open");
    };

    const closeModal = () => {
        overlay.classList.remove("open");
    };

    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    providerSelect.addEventListener("change", loadSlotsForSelection);
    dateInput.addEventListener("change", loadSlotsForSelection);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearRequestErrors();
        document.getElementById("apptRequestAlert").innerHTML = "";

        const providerId = providerSelect.value;
        const date = dateInput.value;

        let hasError = false;

        if (!providerId) {
            showFieldError("provider_id", "Please select a provider.");
            hasError = true;
        }

        if (!date) {
            showFieldError("appointment_date", "Please select a date.");
            hasError = true;
        }

        if (!selectedSlotTime) {
            showFieldError("appointment_time", "Please select an available time.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const submitBtn = document.getElementById("apptRequestSubmitBtn");
        const originalLabel = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = "Requesting...";

        try {
            const facilityId = document.getElementById("apptReqFacility").value;
            const reason = document.getElementById("apptReqReason").value.trim();
            const notes = document.getElementById("apptReqNotes").value.trim();

            const result = await createAppointment({
                provider_id: providerId,
                facility_id: facilityId || null,
                appointment_date: date,
                appointment_time: selectedSlotTime,
                reason: reason || null,
                notes: notes || null
            });

            if (!result.success) {
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, message]) => {
                        showFieldError(field, message);
                    });
                } else {
                    document.getElementById("apptRequestAlert").innerHTML =
                        `<div class="form-alert error">${escapeHtml(result.message || "Failed to request appointment.")}</div>`;
                }

                return;
            }

            closeModal();
            form.reset();
            selectedSlotTime = null;
            resetSlotPicker();
            showToast("Appointment requested successfully.", "success");
            await loadAppointments();
        } catch (error) {
            console.error("Failed to request appointment", error);
            document.getElementById("apptRequestAlert").innerHTML =
                `<div class="form-alert error">Unable to reach the server. Please try again.</div>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
        }
    });
}

async function loadPickers()
{
    const providerSelect = document.getElementById("apptReqProvider");
    const facilitySelect = document.getElementById("apptReqFacility");

    try {
        const result = await fetchProviders();

        if (result.success) {
            (result.data || []).forEach((provider) => {
                const name = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
                const option = document.createElement("option");

                option.value = provider.id;
                option.textContent = provider.specialty ? `Dr. ${name} — ${provider.specialty}` : `Dr. ${name}`;
                providerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to load providers", error);
    }

    try {
        const result = await fetchFacilities();

        if (result.success) {
            (result.data || []).forEach((facility) => {
                const option = document.createElement("option");

                option.value = facility.id;
                option.textContent = facility.name;
                facilitySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to load facilities", error);
    }
}

function resetSlotPicker()
{
    selectedSlotTime = null;
    document.getElementById("apptSlotPicker").innerHTML =
        `<div class="appt-slot-empty">Choose a provider and date to see open times.</div>`;
}

async function loadSlotsForSelection()
{
    const providerId = document.getElementById("apptReqProvider").value;
    const date = document.getElementById("apptReqDate").value;
    const picker = document.getElementById("apptSlotPicker");

    selectedSlotTime = null;

    if (!providerId || !date) {
        picker.innerHTML = `<div class="appt-slot-empty">Choose a provider and date to see open times.</div>`;
        return;
    }

    picker.innerHTML = `<div class="appt-slot-empty">Loading available times...</div>`;

    try {
        const result = await fetchAvailableSlots({ provider_id: providerId, start_date: date, days: 1 });

        if (!result.success || !result.data?.length) {
            picker.innerHTML = `<div class="appt-slot-empty">Unable to load available times.</div>`;
            return;
        }

        const slots = result.data[0]?.slots || [];

        if (!slots.length) {
            picker.innerHTML = `<div class="appt-slot-empty">No times found for this date.</div>`;
            return;
        }

        if (!slots.some((slot) => slot.available)) {
            picker.innerHTML = `<div class="appt-slot-empty">This provider is fully booked on this date. Try another date.</div>`;
            return;
        }

        picker.innerHTML = `<div class="appt-slot-grid">${slots.map((slot) => `
            <button type="button" class="appt-slot-btn ${slot.available ? "" : "unavailable"}" data-time="${slot.time}" ${slot.available ? "" : "disabled"}>${formatApptTime(slot.time)}</button>
        `).join("")}</div>`;

        picker.querySelectorAll(".appt-slot-btn:not(.unavailable)").forEach((btn) => {
            btn.addEventListener("click", () => {
                picker.querySelectorAll(".appt-slot-btn").forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedSlotTime = btn.getAttribute("data-time");
            });
        });
    } catch (error) {
        console.error("Failed to load available slots", error);
        picker.innerHTML = `<div class="appt-slot-empty">Unable to load available times.</div>`;
    }
}

function showFieldError(field, message)
{
    const el = document.getElementById(`err-${field}`);

    if (el) {
        el.textContent = message;
    }
}

function clearRequestErrors()
{
    ["provider_id", "appointment_date", "appointment_time"].forEach((field) => showFieldError(field, ""));
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
