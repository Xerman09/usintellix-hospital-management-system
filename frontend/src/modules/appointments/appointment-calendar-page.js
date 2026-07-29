import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment, fetchAvailableSlots } from "./appointments.service.js?v=1";
import { consumePendingAppointmentPatient } from "../../core/pending-appointment.js";
import { fetchPatients } from "../patients/patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchVisitCategories } from "../visit-categories/visit-categories.service.js";
import { fetchProviderCategories } from "../provider-categories/provider-categories.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchRooms } from "../rooms/rooms.service.js";
import {
    addDays, startOfWeek, formatDayHeading, formatWeekRangeLabel, formatMonthLabel, formatApptTime
} from "./appointment-format.js?v=2";
import { renderMiniCalendar } from "./appointment-mini-calendar.js";
import { renderTimeline } from "./appointment-timeline.js?v=3";
import { renderWeekView } from "./appointment-week-view.js?v=2";
import { renderMonthView } from "./appointment-month-view.js?v=2";

let monthCache = {};
let currentYear;
let currentMonth;
let selectedDate;
let todayStr;
let showProvider = false;
let viewMode = "day";
let calendarManuallyCollapsed = false;
let searchTerm = "";
let currentEditId = null;

/**
 * Shared controller for both the doctor's and the admin/receptionist's
 * Appointments tab. A mini month calendar drives a main view area that
 * switches between Day (15-min timeline), Week (7-day timeline) and
 * Month (full calendar grid) via the toolbar's filter buttons.
 * `showProvider` toggles the Provider select in the modal and the
 * Provider line on cards; everything else is identical.
 */
export async function initAppointmentCalendarPage({ showProvider: withProvider = false } = {})
{
    // Dashboard tab restoration can call this twice in a row for the same
    // rendered DOM (once for re-opening the tab, once for re-activating
    // it). Without this guard that means two sets of click listeners on
    // every toolbar/nav button, so every click fires twice.
    const pageRoot = document.querySelector(".appt-page");

    if (!pageRoot || pageRoot.dataset.wired === "true") {
        return;
    }

    pageRoot.dataset.wired = "true";

    showProvider = withProvider;

    const now = new Date();

    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    todayStr = toDateStr(currentYear, currentMonth, now.getDate());
    selectedDate = todayStr;
    monthCache = {};
    viewMode = "day";
    calendarManuallyCollapsed = false;
    searchTerm = "";
    currentEditId = null;

    renderAll();

    try {
        await loadMonth(currentYear, currentMonth);
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderAll();

    wireToolbar();

    await loadPatientOptions();
    await loadVisitCategoryOptions();
    await loadProviderCategoryOptions();
    await loadFacilityOptions();
    await loadRoomOptions();

    if (showProvider) {
        await loadProviderOptions();
    }

    setupAppointmentModal();
    setupFindAvailableModal();

    const pending = consumePendingAppointmentPatient();

    if (pending) {
        document.getElementById("openAddAppointmentModal").click();
        document.getElementById("p_patient_id").value = pending.patientId;

        if (showProvider && pending.providerId) {
            document.getElementById("p_provider_id").value = pending.providerId;
        }
    }
}

function wireToolbar()
{
    document.getElementById("calPrevMonth").addEventListener("click", () => changeMiniCalendarMonth(-1));
    document.getElementById("calNextMonth").addEventListener("click", () => changeMiniCalendarMonth(1));

    document.getElementById("apptToggleCalendar").addEventListener("click", () => {
        calendarManuallyCollapsed = !calendarManuallyCollapsed;
        applyCollapseState();
    });

    document.getElementById("apptNavPrev").addEventListener("click", () => navStep(-1));
    document.getElementById("apptNavNext").addEventListener("click", () => navStep(1));

    document.getElementById("apptRefreshBtn").addEventListener("click", () => refreshCurrentView());
    document.getElementById("apptPrintBtn").addEventListener("click", () => window.print());

    document.querySelectorAll(".appt-view-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchView(btn.getAttribute("data-view")));
    });

    const searchToggle = document.getElementById("apptSearchToggle");
    const searchWrap = document.getElementById("apptSearchWrap");
    const searchInput = document.getElementById("apptSearchInput");

    searchToggle.addEventListener("click", () => {
        const isHidden = searchWrap.hidden;

        searchWrap.hidden = !isHidden;

        if (isHidden) {
            searchInput.focus();
        } else {
            searchInput.value = "";
            searchTerm = "";
            renderMainView();
        }
    });

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderMainView();
    });
}

async function navStep(delta)
{
    if (viewMode === "day") {
        selectedDate = addDays(selectedDate, delta);
        syncCalendarMonthToSelected();
    } else if (viewMode === "week") {
        selectedDate = addDays(selectedDate, delta * 7);
        syncCalendarMonthToSelected();
    } else {
        await changeMonth(delta);
        return;
    }

    try {
        await ensureDataLoaded();
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderAll();
}

async function switchView(mode)
{
    if (mode === viewMode) {
        return;
    }

    viewMode = mode;

    try {
        await ensureDataLoaded();
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderAll();
}

function syncCalendarMonthToSelected()
{
    const [year, month] = selectedDate.split("-").map(Number);

    currentYear = year;
    currentMonth = month - 1;
}

async function ensureDataLoaded()
{
    if (viewMode === "week") {
        const start = startOfWeek(selectedDate);
        const end = addDays(start, 6);

        await ensureRangeLoaded(start, end);
    } else {
        await loadMonth(currentYear, currentMonth);
    }
}

async function ensureRangeLoaded(startStr, endStr)
{
    const keys = new Set([monthKeyOf(startStr), monthKeyOf(endStr)]);

    for (const key of keys) {
        const [year, month] = key.split("-").map(Number);

        await loadMonth(year, month - 1);
    }
}

function monthKeyOf(dateStr)
{
    return dateStr.slice(0, 7);
}

async function changeMiniCalendarMonth(delta)
{
    currentMonth += delta;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderMiniCalendarOnly();

    try {
        await loadMonth(currentYear, currentMonth);
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderMiniCalendarOnly();

    if (viewMode === "month") {
        renderMainView();
    }
}

function clampDateToMonth(dateStr, year, month)
{
    const day = Number(dateStr.slice(8, 10));
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return toDateStr(year, month, Math.min(day, daysInMonth));
}

async function changeMonth(delta)
{
    await changeMiniCalendarMonth(delta);
    selectedDate = clampDateToMonth(selectedDate, currentYear, currentMonth);
    updateNavLabel();
    renderMainView();
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

function renderAll()
{
    renderMiniCalendarOnly();
    updateNavLabel();
    updateViewSwitchButtons();
    applyCollapseState();
    renderMainView();
}

function updateViewSwitchButtons()
{
    document.querySelectorAll(".appt-view-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-view") === viewMode);
    });
}

function applyCollapseState()
{
    const layout = document.querySelector(".calendar-layout");
    const panel = document.querySelector(".calendar-panel");
    const toggleBtn = document.getElementById("apptToggleCalendar");

    if (!layout || !panel) {
        return;
    }

    const collapsed = calendarManuallyCollapsed || viewMode === "month";

    // Inline styles instead of a CSS class: this can't be broken by a
    // stale/cached main.css, since inline styles always win and never
    // depend on the external stylesheet having loaded fresh.
    layout.style.gridTemplateColumns = collapsed ? "1fr" : "300px 1fr";
    panel.style.display = collapsed ? "none" : "";

    if (toggleBtn) {
        toggleBtn.disabled = viewMode === "month";
    }
}

function updateNavLabel()
{
    const label = document.getElementById("apptNavLabel");

    if (!label) {
        return;
    }

    if (viewMode === "day") {
        label.textContent = formatDayHeading(selectedDate);
    } else if (viewMode === "week") {
        const start = startOfWeek(selectedDate);

        label.textContent = formatWeekRangeLabel(start, addDays(start, 6));
    } else {
        label.textContent = formatMonthLabel(currentYear, currentMonth);
    }
}

function renderMiniCalendarOnly()
{
    const appointments = monthCache[monthKey(currentYear, currentMonth)] || [];
    const appointmentsByDate = groupByDate(appointments);

    renderMiniCalendar({
        gridId: "calendarGrid",
        labelId: "calMonthLabel",
        year: currentYear,
        month: currentMonth,
        todayStr,
        selectedDate,
        appointmentsByDate,
        onSelectDate: async (dateStr) => {
            selectedDate = dateStr;
            syncCalendarMonthToSelected();

            try {
                await ensureDataLoaded();
            } catch (e) {
                showListAlert("Could not load appointments. Please try again.", "error");
            }

            renderAll();
        }
    });
}

function renderMainView()
{
    const body = document.getElementById("apptViewBody");

    if (!body) {
        return;
    }

    if (viewMode === "day") {
        body.className = "appt-timeline";

        const dayAppointments = (monthCache[monthKey(currentYear, currentMonth)] || [])
            .filter((appointment) => appointment.appointment_date === selectedDate && matchesSearch(appointment));

        renderTimeline("apptViewBody", dayAppointments, {
            showProvider,
            emptyMessage: "No appointments for this day.",
            onEdit: openEditModal,
            onCancel: cancelAppointment
        });
    } else if (viewMode === "week") {
        body.className = "appt-week-grid";

        const start = startOfWeek(selectedDate);
        const days = Array.from({ length: 7 }, (_, i) => {
            const dateStr = addDays(start, i);

            return { dateStr, isToday: dateStr === todayStr, isSelected: dateStr === selectedDate };
        });

        const weekAppointments = Object.values(monthCache)
            .flat()
            .filter((appointment) => days.some((day) => day.dateStr === appointment.appointment_date) && matchesSearch(appointment));

        renderWeekView("apptViewBody", days, weekAppointments, {
            onEdit: openEditModal,
            onCancel: cancelAppointment,
            onSelectDay: async (dateStr) => {
                selectedDate = dateStr;
                syncCalendarMonthToSelected();
                renderAll();
            }
        });
    } else {
        body.className = "appt-month-grid";

        const appointments = (monthCache[monthKey(currentYear, currentMonth)] || []).filter(matchesSearch);

        renderMonthView("apptViewBody", {
            year: currentYear,
            month: currentMonth,
            todayStr,
            selectedDate,
            appointmentsByDate: groupByDate(appointments),
            onSelectDate: async (dateStr) => {
                selectedDate = dateStr;
                syncCalendarMonthToSelected();
                viewMode = "day";

                try {
                    await ensureDataLoaded();
                } catch (e) {
                    showListAlert("Could not load appointments. Please try again.", "error");
                }

                renderAll();
            }
        });
    }
}

function matchesSearch(appointment)
{
    if (!searchTerm) {
        return true;
    }

    const haystack = [
        appointment.patient_first_name,
        appointment.patient_last_name,
        appointment.provider_first_name,
        appointment.provider_last_name,
        appointment.title,
        appointment.reason
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(searchTerm);
}

function groupByDate(appointments)
{
    const map = {};

    appointments.forEach((appointment) => {
        (map[appointment.appointment_date] ||= []).push(appointment);
    });

    return map;
}

async function cancelAppointment(id, dateStr)
{
    await deleteAppointment(id);
    await refreshAfterMutation(dateStr);
}

async function refreshCurrentView()
{
    if (viewMode === "week") {
        const start = startOfWeek(selectedDate);
        const end = addDays(start, 6);

        [monthKeyOf(start), monthKeyOf(end)].forEach((key) => delete monthCache[key]);
    } else {
        delete monthCache[monthKey(currentYear, currentMonth)];
    }

    try {
        await ensureDataLoaded();
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
        return;
    }

    renderAll();
}

async function refreshAfterMutation(affectedDateStr)
{
    invalidateMonth(affectedDateStr);

    try {
        await ensureDataLoaded();
    } catch (e) {
        showListAlert("Could not load appointments. Please try again.", "error");
    }

    renderAll();
}

// ---------------------------------------------------------------------
// Add/Edit Appointment modal — two tabs (Patient Appointment / Provider
// Block) sharing one modal-tabs pattern (copied locally, same convention
// as the Patients module's Edit modal).
// ---------------------------------------------------------------------

function wireModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            modalBox.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });
}

function resetModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
    panels.forEach((p, i) => p.classList.toggle("active", i === 0));
}

function activateTab(modalBox, tabName)
{
    const tab = modalBox.querySelector(`.modal-tab[data-tab="${tabName}"]`);

    if (tab) {
        tab.click();
    }
}

function wireDateTimeSection(prefix)
{
    const timeRadio = document.getElementById(`${prefix}daytype_time`);
    const allDayRadio = document.getElementById(`${prefix}daytype_allday`);
    const timeGroup = document.getElementById(`${prefix}timeGroup`);
    const timeInput = document.getElementById(`${prefix}appointment_time`);

    const applyDayType = () => {
        timeGroup.hidden = allDayRadio.checked;

        if (allDayRadio.checked) {
            timeInput.value = "";
        }
    };

    timeRadio.addEventListener("change", applyDayType);
    allDayRadio.addEventListener("change", applyDayType);

    const repeatCheck = document.getElementById(`${prefix}recur_repeat`);
    const dowCheck = document.getElementById(`${prefix}recur_dow`);
    const repeatGroup = document.getElementById(`${prefix}repeatGroup`);
    const dowGroup = document.getElementById(`${prefix}dowGroup`);
    const untilGroup = document.getElementById(`${prefix}untilGroup`);
    const positionSelect = document.getElementById(`${prefix}recurrence_position`);
    const dayTypeSelect = document.getElementById(`${prefix}recurrence_day_type`);
    const untilInput = document.getElementById(`${prefix}recurrence_until_date`);

    const applyRecurrence = () => {
        repeatGroup.hidden = !repeatCheck.checked;
        dowGroup.hidden = !dowCheck.checked;
        untilGroup.hidden = !repeatCheck.checked && !dowCheck.checked;

        if (!repeatCheck.checked) {
            positionSelect.value = "every";
            dayTypeSelect.value = "day";
        }

        if (!dowCheck.checked) {
            document.querySelectorAll(`.${prefix}dow-check`).forEach((cb) => { cb.checked = false; });
        }

        if (!repeatCheck.checked && !dowCheck.checked) {
            untilInput.value = "";
        }
    };

    repeatCheck.addEventListener("change", () => {
        if (repeatCheck.checked) {
            dowCheck.checked = false;
        }

        applyRecurrence();
    });

    dowCheck.addEventListener("change", () => {
        if (dowCheck.checked) {
            repeatCheck.checked = false;
        }

        applyRecurrence();
    });
}

function resetDateTimeSection(prefix, dateValue)
{
    document.getElementById(`${prefix}daytype_time`).checked = true;
    document.getElementById(`${prefix}daytype_allday`).checked = false;
    document.getElementById(`${prefix}timeGroup`).hidden = false;
    document.getElementById(`${prefix}appointment_date`).value = dateValue;
    document.getElementById(`${prefix}appointment_time`).value = "";

    document.getElementById(`${prefix}recur_repeat`).checked = false;
    document.getElementById(`${prefix}recur_dow`).checked = false;
    document.getElementById(`${prefix}repeatGroup`).hidden = true;
    document.getElementById(`${prefix}dowGroup`).hidden = true;
    document.getElementById(`${prefix}untilGroup`).hidden = true;
    document.getElementById(`${prefix}recurrence_position`).value = "every";
    document.getElementById(`${prefix}recurrence_day_type`).value = "day";
    document.getElementById(`${prefix}recurrence_until_date`).value = "";

    document.querySelectorAll(`.${prefix}dow-check`).forEach((cb) => { cb.checked = false; });
}

function applyDateTimeRecurrenceData(prefix, appointment)
{
    const isAllDay = Number(appointment.is_all_day) === 1;

    document.getElementById(`${prefix}daytype_allday`).checked = isAllDay;
    document.getElementById(`${prefix}daytype_time`).checked = !isAllDay;
    document.getElementById(`${prefix}timeGroup`).hidden = isAllDay;
    document.getElementById(`${prefix}appointment_date`).value = appointment.appointment_date;
    document.getElementById(`${prefix}appointment_time`).value = isAllDay ? "" : appointment.appointment_time.slice(0, 5);

    const mode = appointment.recurrence_mode || "none";

    document.getElementById(`${prefix}recur_repeat`).checked = mode === "interval";
    document.getElementById(`${prefix}recur_dow`).checked = mode === "days_of_week";
    document.getElementById(`${prefix}repeatGroup`).hidden = mode !== "interval";
    document.getElementById(`${prefix}dowGroup`).hidden = mode !== "days_of_week";
    document.getElementById(`${prefix}untilGroup`).hidden = mode === "none";
    document.getElementById(`${prefix}recurrence_position`).value = appointment.recurrence_position || "every";
    document.getElementById(`${prefix}recurrence_day_type`).value = appointment.recurrence_day_type || "day";
    document.getElementById(`${prefix}recurrence_until_date`).value = appointment.recurrence_until_date || "";

    const selectedDays = (appointment.recurrence_days_of_week || "").split(",").map((d) => d.trim());

    document.querySelectorAll(`.${prefix}dow-check`).forEach((cb) => {
        cb.checked = selectedDays.includes(cb.value);
    });
}

function readDateTimeRecurrenceData(prefix)
{
    const isAllDay = document.getElementById(`${prefix}daytype_allday`).checked;
    const isRepeat = document.getElementById(`${prefix}recur_repeat`).checked;
    const isDow = document.getElementById(`${prefix}recur_dow`).checked;

    const data = {
        appointment_date: document.getElementById(`${prefix}appointment_date`).value,
        appointment_time: isAllDay ? "" : document.getElementById(`${prefix}appointment_time`).value,
        is_all_day: isAllDay ? "1" : "0",
        recurrence_mode: "none"
    };

    if (isRepeat) {
        data.recurrence_mode = "interval";
        data.recurrence_position = document.getElementById(`${prefix}recurrence_position`).value;
        data.recurrence_day_type = document.getElementById(`${prefix}recurrence_day_type`).value;
        data.recurrence_until_date = document.getElementById(`${prefix}recurrence_until_date`).value;
    } else if (isDow) {
        data.recurrence_mode = "days_of_week";
        data.recurrence_days_of_week = Array.from(document.querySelectorAll(`.${prefix}dow-check:checked`))
            .map((cb) => cb.value)
            .join(",");
        data.recurrence_until_date = document.getElementById(`${prefix}recurrence_until_date`).value;
    }

    return data;
}

function readPatientTabData()
{
    const data = {
        is_provider_block: "0",
        visit_category_id: document.getElementById("p_visit_category_id").value,
        title: document.getElementById("p_title").value.trim(),
        facility_id: document.getElementById("p_facility_id").value,
        billing_facility_id: document.getElementById("p_billing_facility_id").value,
        patient_id: document.getElementById("p_patient_id").value,
        room_id: document.getElementById("p_room_id").value,
        notes: document.getElementById("p_notes").value.trim(),
        ...readDateTimeRecurrenceData("p_")
    };

    if (showProvider) {
        data.provider_id = document.getElementById("p_provider_id").value;
    }

    return data;
}

function readProviderTabData()
{
    const data = {
        is_provider_block: "1",
        provider_category_id: document.getElementById("b_provider_category_id").value,
        facility_id: document.getElementById("b_facility_id").value,
        billing_facility_id: document.getElementById("b_billing_facility_id").value,
        visit_category_id: document.getElementById("b_visit_category_id").value,
        notes: document.getElementById("b_notes").value.trim(),
        ...readDateTimeRecurrenceData("b_")
    };

    if (showProvider) {
        data.provider_id = document.getElementById("b_provider_id").value;
    }

    return data;
}

function getActiveTabName(modalBox)
{
    return modalBox.querySelector(".modal-tab.active")?.getAttribute("data-tab") || "patient";
}

function setupAppointmentModal()
{
    const modalOverlay = document.getElementById("addAppointmentModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("addAppointmentForm");
    const deleteBtn = document.getElementById("deleteAppointmentBtn");
    const duplicateBtn = document.getElementById("duplicateAppointmentBtn");
    const findAvailableBtn = document.getElementById("findAvailableBtn");

    wireModalTabs(modalBox);
    wireDateTimeSection("p_");
    wireDateTimeSection("b_");

    const openAddModal = () => {
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        document.getElementById("appointment_id").value = "";
        document.getElementById("recurrence_group_id").value = "";
        currentEditId = null;

        resetModalTabs(modalBox);

        const dateValue = selectedDate < todayStr ? todayStr : selectedDate;

        resetDateTimeSection("p_", dateValue);
        resetDateTimeSection("b_", dateValue);

        document.getElementById("p_statusFieldGroup").style.display = "none";

        deleteBtn.style.display = "none";
        duplicateBtn.style.display = "none";
        findAvailableBtn.style.display = "";

        document.getElementById("appointmentModalTitle").textContent = "New Appointment";
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

    deleteBtn.addEventListener("click", async () => {
        if (!currentEditId) {
            return;
        }

        if (!confirm("Delete this appointment?")) {
            return;
        }

        const dateStr = document.getElementById(getActiveTabName(modalBox) === "provider" ? "b_appointment_date" : "p_appointment_date").value;

        await deleteAppointment(currentEditId);
        closeModal();
        showListAlert("Appointment deleted successfully.", "success");
        await refreshAfterMutation(dateStr);
    });

    duplicateBtn.addEventListener("click", () => {
        document.getElementById("appointment_id").value = "";
        document.getElementById("recurrence_group_id").value = "";
        currentEditId = null;

        const prefix = getActiveTabName(modalBox) === "provider" ? "b_" : "p_";

        document.getElementById(`${prefix}appointment_date`).value = "";
        document.getElementById(`${prefix}appointment_time`).value = "";

        deleteBtn.style.display = "none";
        duplicateBtn.style.display = "none";

        if (prefix === "p_") {
            document.getElementById("p_statusFieldGroup").style.display = "none";
        }

        document.getElementById("appointmentModalTitle").textContent = "New Appointment";

        showAlert("Pick a new date/time for the duplicate.", "success");
        document.getElementById(`${prefix}appointment_date`).focus();
    });

    findAvailableBtn.addEventListener("click", () => {
        const prefix = getActiveTabName(modalBox) === "provider" ? "b_" : "p_";
        const providerSelect = document.getElementById(`${prefix}provider_id`);
        const providerId = showProvider ? providerSelect?.value : null;

        openFindAvailableModal(prefix, providerId);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const activeTab = getActiveTabName(modalBox);
        const data = activeTab === "provider" ? readProviderTabData() : readPatientTabData();

        if (currentEditId && activeTab === "patient") {
            data.status = document.getElementById("p_status").value;
        }

        if (currentEditId) {
            const isRecurringSeries = !!document.getElementById("recurrence_group_id").value;
            const scope = isRecurringSeries ? await askEditScope() : "this";

            if (!scope) {
                return; // user cancelled the edit-scope prompt
            }

            data.scope = scope;
        }

        const result = currentEditId
            ? await updateAppointment(currentEditId, data)
            : await createAppointment(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save appointment.", "error");

            if (result.errors) {
                const prefix = activeTab === "provider" ? "b_" : "p_";

                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-${prefix}${field}`) || document.getElementById(`err-${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert(currentEditId ? "Appointment updated successfully." : "Appointment scheduled successfully.", "success");

        await refreshAfterMutation(data.appointment_date);
    });
}

function openEditModal(appointment)
{
    const modalOverlay = document.getElementById("addAppointmentModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");
    const isBlock = Number(appointment.is_provider_block) === 1;
    const prefix = isBlock ? "b_" : "p_";

    currentEditId = appointment.id;

    document.getElementById("appointment_id").value = appointment.id;
    document.getElementById("recurrence_group_id").value = appointment.recurrence_group_id || "";

    activateTab(modalBox, isBlock ? "provider" : "patient");

    if (isBlock) {
        if (showProvider) {
            document.getElementById("b_provider_id").value = appointment.provider_id;
        }

        document.getElementById("b_provider_category_id").value = appointment.provider_category_id ?? "";
        document.getElementById("b_facility_id").value = appointment.facility_id ?? "";
        document.getElementById("b_billing_facility_id").value = appointment.billing_facility_id ?? "";
        document.getElementById("b_visit_category_id").value = appointment.visit_category_id ?? "";
        document.getElementById("b_notes").value = appointment.notes ?? "";
        document.getElementById("p_statusFieldGroup").style.display = "none";
        applyDateTimeRecurrenceData("b_", appointment);
    } else {
        if (showProvider) {
            document.getElementById("p_provider_id").value = appointment.provider_id;
        }

        document.getElementById("p_visit_category_id").value = appointment.visit_category_id ?? "";
        document.getElementById("p_title").value = appointment.title ?? "";
        document.getElementById("p_facility_id").value = appointment.facility_id ?? "";
        document.getElementById("p_billing_facility_id").value = appointment.billing_facility_id ?? "";
        document.getElementById("p_patient_id").value = appointment.patient_id ?? "";
        document.getElementById("p_room_id").value = appointment.room_id ?? "";
        document.getElementById("p_notes").value = appointment.notes ?? "";
        document.getElementById("p_status").value = appointment.status;
        document.getElementById("p_statusFieldGroup").style.display = "block";
        applyDateTimeRecurrenceData("p_", appointment);
    }

    document.getElementById("deleteAppointmentBtn").style.display = "";
    document.getElementById("duplicateAppointmentBtn").style.display = "";
    document.getElementById("findAvailableBtn").style.display = "";

    document.getElementById("appointmentModalTitle").textContent = isBlock ? "Edit Provider Block" : "Edit Appointment";

    clearErrors();
    document.getElementById("formAlert").innerHTML = "";

    modalOverlay.classList.add("open");
}

// ---------------------------------------------------------------------
// Find Available modal — nested on top of the Add/Edit modal (both stay
// open simultaneously; z-index ties are resolved by DOM order, and this
// modal's markup is declared after the Add/Edit modal's in the view).
// ---------------------------------------------------------------------

/**
 * Shows the All/Future/Just-This/Cancel confirmation modal (nested on
 * top of the Add/Edit modal) and resolves with the chosen scope string,
 * or null if the user cancelled.
 */
function askEditScope()
{
    return new Promise((resolve) => {
        const overlay = document.getElementById("editScopeModalOverlay");
        const scopeButtons = overlay.querySelectorAll("[data-scope]");
        const cancelBtn = document.getElementById("cancelEditScope");

        const cleanup = () => {
            scopeButtons.forEach((btn) => btn.removeEventListener("click", onScopeClick));
            cancelBtn.removeEventListener("click", onCancelClick);
            overlay.removeEventListener("click", onOverlayClick);
            overlay.classList.remove("open");
        };

        const onScopeClick = (event) => {
            const scope = event.currentTarget.getAttribute("data-scope");

            cleanup();
            resolve(scope);
        };

        const onCancelClick = () => {
            cleanup();
            resolve(null);
        };

        const onOverlayClick = (event) => {
            if (event.target === overlay) {
                cleanup();
                resolve(null);
            }
        };

        scopeButtons.forEach((btn) => btn.addEventListener("click", onScopeClick));
        cancelBtn.addEventListener("click", onCancelClick);
        overlay.addEventListener("click", onOverlayClick);

        overlay.classList.add("open");
    });
}

function setupFindAvailableModal()
{
    const modalOverlay = document.getElementById("findAvailableModalOverlay");

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("closeFindAvailableModal").addEventListener("click", closeModal);
    document.getElementById("closeFindAvailableBtn").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("faSearchBtn").addEventListener("click", async () => {
        // Non-empty only when staff explicitly picked a provider. For a
        // doctor (no provider select at all) this stays "" — the backend
        // infers their own provider id from the session in that case.
        const prefix = modalOverlay.dataset.prefix || "p_";
        const providerId = document.getElementById(`${prefix}provider_id`)?.value || modalOverlay.dataset.providerId || "";
        const startDate = document.getElementById("fa_start_date").value;
        const days = document.getElementById("fa_days").value;
        const resultsEl = document.getElementById("findAvailableResults");
        const alertEl = document.getElementById("findAvailableAlert");

        alertEl.innerHTML = "";

        if (showProvider && !providerId) {
            alertEl.innerHTML = `<div class="form-alert error">Select a provider on this tab first.</div>`;
            resultsEl.innerHTML = "";
            return;
        }

        resultsEl.innerHTML = `<p class="form-subtitle">Searching...</p>`;

        const result = await fetchAvailableSlots({ provider_id: providerId, start_date: startDate, days });

        if (!result.success) {
            resultsEl.innerHTML = "";
            alertEl.innerHTML = `<div class="form-alert error">${result.message || "Could not search for available slots."}</div>`;
            return;
        }

        renderFindAvailableResults(result.data);
    });
}

function openFindAvailableModal(prefix, providerId)
{
    const modalOverlay = document.getElementById("findAvailableModalOverlay");

    modalOverlay.dataset.prefix = prefix;
    modalOverlay.dataset.providerId = providerId || "";
    document.getElementById("fa_start_date").value = document.getElementById(`${prefix}appointment_date`).value || todayStr;
    document.getElementById("findAvailableResults").innerHTML = "";
    document.getElementById("findAvailableAlert").innerHTML = "";

    modalOverlay.classList.add("open");
}

function renderFindAvailableResults(days)
{
    const resultsEl = document.getElementById("findAvailableResults");
    const prefix = document.getElementById("findAvailableModalOverlay").dataset.prefix || "p_";

    resultsEl.innerHTML = days.map((day) => `
        <div class="fa-day-section">
            <div class="fa-day-heading">${formatDayHeading(day.date)}</div>
            <div class="fa-slot-grid">
                ${day.slots.map((slot) => `
                    <button type="button" class="fa-slot-btn ${slot.available ? "" : "booked"}"
                        data-date="${day.date}" data-time="${slot.time}" ${slot.available ? "" : "disabled"}>
                        ${formatApptTime(slot.time)}
                    </button>
                `).join("")}
            </div>
        </div>
    `).join("");

    resultsEl.querySelectorAll(".fa-slot-btn:not(.booked)").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.getElementById(`${prefix}appointment_date`).value = btn.getAttribute("data-date");
            document.getElementById(`${prefix}appointment_time`).value = btn.getAttribute("data-time");
            document.getElementById(`${prefix}daytype_time`).checked = true;
            document.getElementById(`${prefix}daytype_allday`).checked = false;
            document.getElementById(`${prefix}timeGroup`).hidden = false;

            document.getElementById("findAvailableModalOverlay").classList.remove("open");
        });
    });
}

async function loadPatientOptions()
{
    const result = await fetchPatients();
    const select = document.getElementById("p_patient_id");

    if (result.success) {
        result.data.forEach((patient) => {
            const option = document.createElement("option");

            option.value = patient.id;
            option.textContent = `${[patient.first_name, patient.last_name].filter(Boolean).join(" ")} (${patient.patient_no})`;

            select.appendChild(option);
        });
    }
}

async function loadProviderOptions()
{
    const result = await fetchProviders();

    if (!result.success) {
        return;
    }

    ["p_provider_id", "b_provider_id"].forEach((id) => {
        const select = document.getElementById(id);

        if (!select) {
            return;
        }

        result.data.forEach((provider) => {
            const option = document.createElement("option");

            option.value = provider.id;
            option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

            select.appendChild(option);
        });
    });
}

async function loadVisitCategoryOptions()
{
    const result = await fetchVisitCategories();

    if (!result.success) {
        return;
    }

    ["p_visit_category_id", "b_visit_category_id"].forEach((id) => {
        const select = document.getElementById(id);

        if (!select) {
            return;
        }

        result.data.forEach((category) => {
            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            select.appendChild(option);
        });
    });
}

async function loadProviderCategoryOptions()
{
    const result = await fetchProviderCategories();
    const select = document.getElementById("b_provider_category_id");

    if (result.success) {
        result.data.forEach((category) => {
            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            select.appendChild(option);
        });
    }
}

async function loadFacilityOptions()
{
    const result = await fetchFacilities();

    if (!result.success) {
        return;
    }

    ["p_facility_id", "p_billing_facility_id", "b_facility_id", "b_billing_facility_id"].forEach((id) => {
        const select = document.getElementById(id);

        if (!select) {
            return;
        }

        result.data.forEach((facility) => {
            const option = document.createElement("option");

            option.value = facility.id;
            option.textContent = facility.name;

            select.appendChild(option);
        });
    });
}

async function loadRoomOptions()
{
    const result = await fetchRooms();
    const select = document.getElementById("p_room_id");

    if (result.success) {
        result.data.forEach((room) => {
            const option = document.createElement("option");

            option.value = room.id;
            option.textContent = room.name;

            select.appendChild(option);
        });
    }
}

function invalidateMonth(dateStr)
{
    if (!dateStr) return;

    delete monthCache[monthKeyOf(dateStr)];
}

function clearErrors()
{
    document.querySelectorAll("#addAppointmentForm .form-error").forEach((el) => {
        el.textContent = "";
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
