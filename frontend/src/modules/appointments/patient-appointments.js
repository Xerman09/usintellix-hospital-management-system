import { fetchAppointments, createAppointment, fetchAvailableSlots } from "./appointments.service.js?v=4";
import { formatApptTime, statusLabel, escapeHtml, toDateStr, formatMonthLabel } from "./appointment-format.js?v=4";
import { fetchProviders } from "../providers/providers.service.js?v=5";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { showToast } from "../../core/toast.js";
import { systemNow } from "../../core/timezone.js?v=3";

const WEEKDAY_FORMAT = { weekday: "short" };
const MONTH_FORMAT = { month: "short" };
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;

let allAppointments = [];
let calendarYear = systemNow().getFullYear();
let calendarMonth = systemNow().getMonth();
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
    document.getElementById("apptCalPrev")?.addEventListener("click", () => {
        calendarMonth -= 1;

        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear -= 1;
        }

        renderCalendar();
    });

    document.getElementById("apptCalNext")?.addEventListener("click", () => {
        calendarMonth += 1;

        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear += 1;
        }

        renderCalendar();
    });

    document.getElementById("apptCalToday")?.addEventListener("click", () => {
        const now = systemNow();
        calendarYear = now.getFullYear();
        calendarMonth = now.getMonth();
        selectedDate = toDateStr(now);
        renderCalendar();
        const appointmentsByDate = {};
        allAppointments.forEach((appt) => {
            (appointmentsByDate[appt.appointment_date] ||= []).push(appt);
        });
        renderCalendarDayDetail(appointmentsByDate[selectedDate] || []);
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

        const today = toDateStr(systemNow());

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
    const today = toDateStr(systemNow());

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

    const monthCountBadge = document.getElementById("apptCalMonthCount");
    const todayStr = toDateStr(systemNow());
    const appointmentsByDate = {};

    let currentMonthApptCount = 0;
    allAppointments.forEach((appt) => {
        (appointmentsByDate[appt.appointment_date] ||= []).push(appt);
        if (appt.appointment_date) {
            const [y, m] = appt.appointment_date.split("-").map(Number);
            if (y === calendarYear && m === calendarMonth + 1) {
                currentMonthApptCount++;
            }
        }
    });

    if (monthCountBadge) {
        monthCountBadge.textContent = currentMonthApptCount === 1
            ? "1 appointment"
            : `${currentMonthApptCount} appointments`;
    }

    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();

    let html = "";

    // 1. DOW Ribbon Row
    html += `<div class="appt-month-dow-row">`;
    DOW_LABELS.forEach((dow) => {
        html += `<div class="appt-month-dow">${dow}</div>`;
    });
    html += `</div>`;

    // 2. Day cells grid
    html += `<div class="appt-month-cells-grid">`;

    // Previous month padding days
    for (let i = 0; i < firstDayOfWeek; i++) {
        const prevDay = prevMonthDays - firstDayOfWeek + i + 1;
        const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
        const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
        const prevDateStr = monthDateStr(prevYear, prevMonth, prevDay);
        const prevAppts = (appointmentsByDate[prevDateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

        html += `
            <div class="appt-month-day other-month" data-date="${prevDateStr}">
                <div class="appt-month-day-header">
                    <span class="appt-month-daynum">${prevDay}</span>
                    ${prevAppts.length ? `<span class="appt-day-dot"></span>` : ""}
                </div>
                <div class="appt-month-chips">
                    ${prevAppts.slice(0, 2).map((appt) => `
                        <div class="appt-month-chip other-month-chip">
                            <span class="appt-chip-time">${formatApptTime(appt.appointment_time)}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = monthDateStr(calendarYear, calendarMonth, day);
        const dayAppointments = (appointmentsByDate[dateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const classes = ["appt-month-day"];

        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;

        if (isToday) classes.push("today");
        if (isSelected) classes.push("selected");

        const visibleChips = dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appt) => {
            const providerName = [appt.provider_first_name, appt.provider_last_name].filter(Boolean).join(" ");

            return `
                <div class="appt-month-chip ${appt.status}" title="${formatApptTime(appt.appointment_time)} - Dr. ${escapeHtml(providerName || 'Provider')}">
                    <span class="appt-chip-dot"></span>
                    <span class="appt-chip-time">${formatApptTime(appt.appointment_time)}</span>
                    <span class="appt-chip-name">${providerName ? `Dr. ${escapeHtml(providerName)}` : "Provider TBD"}</span>
                </div>
            `;
        }).join("");

        const overflow = dayAppointments.length > MAX_CHIPS_PER_DAY
            ? `<div class="appt-month-more">+${dayAppointments.length - MAX_CHIPS_PER_DAY} more</div>`
            : "";

        html += `
            <div class="${classes.join(" ")}" data-date="${dateStr}">
                <div class="appt-month-day-header">
                    <span class="appt-month-daynum ${isToday ? 'today-pill' : ''}">${day}</span>
                    ${dayAppointments.length > 0 ? `<span class="appt-day-badge">${dayAppointments.length}</span>` : ""}
                </div>
                <div class="appt-month-chips">${visibleChips}${overflow}</div>
            </div>
        `;
    }

    // Next month padding days to complete last row of 7
    const totalRendered = firstDayOfWeek + daysInMonth;
    const remainder = totalRendered % 7;
    const nextDaysNeeded = remainder === 0 ? 0 : 7 - remainder;

    for (let nextDay = 1; nextDay <= nextDaysNeeded; nextDay++) {
        const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
        const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
        const nextDateStr = monthDateStr(nextYear, nextMonth, nextDay);
        const nextAppts = (appointmentsByDate[nextDateStr] || []).slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

        html += `
            <div class="appt-month-day other-month" data-date="${nextDateStr}">
                <div class="appt-month-day-header">
                    <span class="appt-month-daynum">${nextDay}</span>
                    ${nextAppts.length ? `<span class="appt-day-dot"></span>` : ""}
                </div>
                <div class="appt-month-chips">
                    ${nextAppts.slice(0, 2).map((appt) => `
                        <div class="appt-month-chip other-month-chip">
                            <span class="appt-chip-time">${formatApptTime(appt.appointment_time)}</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    html += `</div>`; // close appt-month-cells-grid

    grid.innerHTML = html;

    grid.querySelectorAll(".appt-month-day[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => {
            selectedDate = cell.getAttribute("data-date");
            const [y, m] = selectedDate.split("-").map(Number);
            if (y !== calendarYear || m - 1 !== calendarMonth) {
                calendarYear = y;
                calendarMonth = m - 1;
            }
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

    if (!selectedDate) {
        title.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Select a date
        `;
        list.innerHTML = `<div class="appt-empty">Click any date on the calendar to view its appointments.</div>`;
        return;
    }

    const todayStr = toDateStr(systemNow());
    const isPast = selectedDate < todayStr;

    title.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        ${escapeHtml(formatDayHeading(selectedDate))}
        ${selectedDate === todayStr ? `<span class="pt-cal-month-badge" style="background:#e0f2fe; color:#0284c7; border-color:#bae6fd;">Today</span>` : ''}
    `;

    const sorted = dayAppointments.slice().sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    if (sorted.length > 0) {
        list.innerHTML = sorted.map((appt) => apptCard(appt, isPast)).join("");
    } else {
        list.innerHTML = `
            <div class="appt-empty-agenda">
                <div class="appt-empty-agenda-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>No appointments scheduled for this date.</span>
                </div>
                ${!isPast ? `
                    <button type="button" class="pt-appt-request-btn" style="height:32px; font-size:12.5px; padding:0 14px;" id="btnBookSelectedDate">
                        + Request for this day
                    </button>
                ` : ''}
            </div>
        `;

        document.getElementById("btnBookSelectedDate")?.addEventListener("click", () => {
            const openModalBtn = document.getElementById("apptRequestBtn");
            if (openModalBtn) {
                openModalBtn.click();
                setTimeout(() => {
                    const dateInput = document.getElementById("apptReqDate");
                    if (dateInput) {
                        dateInput.value = selectedDate;
                        dateInput.dispatchEvent(new Event("change"));
                    }
                }, 50);
            }
        });
    }
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
