import { fetchAppointments } from "../appointments/appointments.service.js";
import { fetchVisitCategories } from "../visit-categories/visit-categories.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchRooms } from "../rooms/rooms.service.js";
import {
    fetchFlow, checkInPatient, updateFlowStatusRoom, updateFlowDrugScreen, removeFlowEntry
} from "./patient-flow.service.js";
import { setPendingPatientView } from "../../core/pending-patient-view.js";
import { getUser } from "../../core/session.js";
import { PatientsListView } from "../patients/patients-list.view.js?v=45";
import { initPatientsList } from "../patients/patients-list.js?v=45";

const STAGES = ["waiting", "roomed", "with_provider", "checked_out"];

const STAGE_LABELS = {
    waiting: "Waiting",
    roomed: "In Room",
    with_provider: "With Provider",
    checked_out: "Checked Out"
};

const STAGE_TIMESTAMP_FIELD = {
    waiting: "checked_in_at",
    roomed: "roomed_at",
    with_provider: "provider_at",
    checked_out: "checked_out_at"
};

// A card blinks once it's sat in a non-final stage longer than this.
const BLINK_THRESHOLD_MS = 15 * 60 * 1000;

const SETTINGS_KEY = "flowBoardSettings";

let flowCache = [];
let autoRefreshTimerId = null;
let tickTimerId = null;
let boardRoot = null;

// browserNow - serverNow at the last successful fetch. The PHP server's
// configured timezone won't generally match the browser's, so elapsed-time
// math can't just diff a server timestamp against `new Date()` directly --
// this offset translates the browser's current instant into the server's
// clock frame first, whatever that server happens to be set to.
let clockOffsetMs = 0;

export async function initPatientFlow()
{
    // Dashboard tab restoration can call this twice in a row for the same
    // rendered DOM -- guard against double-wiring the same listeners.
    const root = document.querySelector(".pf-page");

    if (!root || root.dataset.initialized) {
        return;
    }

    root.dataset.initialized = "1";
    boardRoot = root;

    // A prior visit to this tab may have left timers running against DOM
    // that's about to be discarded -- always start from a clean slate.
    if (autoRefreshTimerId) clearInterval(autoRefreshTimerId);
    if (tickTimerId) clearInterval(tickTimerId);

    const settings = loadSettings();

    document.getElementById("setting_open_new_window").checked = settings.openInNewWindow;
    document.getElementById("setting_auto_refresh").checked = settings.autoRefresh;

    setupSettingsPanel();
    setupDateRangeToggle();
    setupFilters();
    setupCheckInModal();
    setupStatusRoomModal();
    setupTableActions();
    setupToolbarButtons();

    await Promise.all([
        loadVisitCategoryOptions(),
        loadFacilityOptions(),
        loadProviderOptions(),
        loadRoomOptionsInto("status_room_room_id")
    ]);

    await loadFlow();
    await loadAppointmentOptions();

    tickTimerId = setInterval(updateTimeCells, 15000);

    if (settings.autoRefresh) {
        startAutoRefresh();
    }
}

function loadSettings()
{
    try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));

        return {
            openInNewWindow: Boolean(stored?.openInNewWindow),
            autoRefresh: stored?.autoRefresh !== false
        };
    } catch (e) {
        return { openInNewWindow: false, autoRefresh: true };
    }
}

function saveSettings(settings)
{
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function startAutoRefresh()
{
    if (autoRefreshTimerId) {
        clearInterval(autoRefreshTimerId);
    }

    autoRefreshTimerId = setInterval(loadFlow, 30000);
}

function stopAutoRefresh()
{
    if (autoRefreshTimerId) {
        clearInterval(autoRefreshTimerId);
        autoRefreshTimerId = null;
    }
}

// The tab bar swaps out tabContent.innerHTML wholesale on every switch,
// which detaches this board's DOM without ever calling back into this
// module -- there's no unmount hook anywhere in this app. Anything that
// keeps running after an await (a fetch, a timer tick) has to check this
// before touching the DOM, or it'll throw against elements that no longer
// exist. Once detached, also stop the timers so they don't keep polling
// the server in the background for a tab nobody's looking at anymore.
function isBoardGone()
{
    if (boardRoot && boardRoot.isConnected) {
        return false;
    }

    stopAutoRefresh();

    if (tickTimerId) {
        clearInterval(tickTimerId);
        tickTimerId = null;
    }

    return true;
}

function setupSettingsPanel()
{
    const gearBtn = document.getElementById("openFlowSettings");
    const panel = document.getElementById("flowSettingsPanel");

    gearBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        panel.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
        if (panel.classList.contains("open") && !panel.contains(event.target) && event.target !== gearBtn) {
            panel.classList.remove("open");
        }
    });

    document.getElementById("setting_open_new_window").addEventListener("change", (event) => {
        const settings = loadSettings();

        settings.openInNewWindow = event.target.checked;
        saveSettings(settings);
    });

    document.getElementById("setting_auto_refresh").addEventListener("change", (event) => {
        const settings = loadSettings();

        settings.autoRefresh = event.target.checked;
        saveSettings(settings);

        if (settings.autoRefresh) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
}

function setupDateRangeToggle()
{
    const toggle = document.getElementById("toggle_date_range");
    const fields = document.getElementById("dateRangeFields");

    toggle.addEventListener("change", () => {
        fields.classList.toggle("show", toggle.checked);

        if (toggle.checked) {
            const today = todayDate();

            document.getElementById("filter_date_from").value = document.getElementById("filter_date_from").value || today;
            document.getElementById("filter_date_until").value = document.getElementById("filter_date_until").value || today;
        }
    });
}

function todayDate()
{
    return new Date().toISOString().slice(0, 10);
}

async function loadVisitCategoryOptions()
{
    const select = document.getElementById("filter_visit_category_id");
    const result = await fetchVisitCategories();
    const categories = result.success ? result.data : [];

    select.innerHTML = `<option value="">All Categories</option>` +
        categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("");
}

async function loadFacilityOptions()
{
    const select = document.getElementById("filter_facility_id");
    const result = await fetchFacilities();
    const facilities = result.success ? result.data : [];

    select.innerHTML = `<option value="">All Facilities</option>` +
        facilities.map((facility) => `<option value="${facility.id}">${escapeHtml(facility.name)}</option>`).join("");
}

async function loadProviderOptions()
{
    const select = document.getElementById("filter_provider_id");
    const result = await fetchProviders();
    const providers = result.success ? result.data : [];

    select.innerHTML = `<option value="">All Providers</option>` +
        providers.map((provider) => {
            const label = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
            return `<option value="${provider.id}">${escapeHtml(label)}</option>`;
        }).join("");
}

async function loadRoomOptionsInto(selectId)
{
    const select = document.getElementById(selectId);
    const result = await fetchRooms();
    const rooms = result.success ? result.data : [];

    select.innerHTML = `<option value="">No room assigned</option>` +
        rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join("");
}

function getFilters()
{
    const useDateRange = document.getElementById("toggle_date_range").checked;

    return {
        from: useDateRange ? document.getElementById("filter_date_from").value : "",
        to: useDateRange ? document.getElementById("filter_date_until").value : "",
        visit_category_id: document.getElementById("filter_visit_category_id").value,
        facility_id: document.getElementById("filter_facility_id").value,
        provider_id: document.getElementById("filter_provider_id").value,
        stage: document.getElementById("filter_stage").value,
        search: document.getElementById("filter_search").value.trim()
    };
}

function setupFilters()
{
    document.getElementById("applyFlowFilters").addEventListener("click", loadFlow);

    document.getElementById("clearFlowFilters").addEventListener("click", () => {
        document.getElementById("filter_visit_category_id").value = "";
        document.getElementById("filter_stage").value = "";
        document.getElementById("filter_facility_id").value = "";
        document.getElementById("filter_provider_id").value = "";
        document.getElementById("filter_search").value = "";
        document.getElementById("toggle_date_range").checked = false;
        document.getElementById("dateRangeFields").classList.remove("show");
        document.getElementById("filter_date_from").value = "";
        document.getElementById("filter_date_until").value = "";
        loadFlow();
    });
}

function setupToolbarButtons()
{
    document.getElementById("refreshFlowBoard").addEventListener("click", async () => {
        await loadFlow();
        await loadAppointmentOptions();
    });

    document.getElementById("printFlowBoard").addEventListener("click", () => {
        window.print();
    });

    document.getElementById("kioskFlowBoard").addEventListener("click", (event) => {
        const isKiosk = document.querySelector(".pf-page").classList.toggle("kiosk-mode");

        event.currentTarget.classList.toggle("active", isKiosk);
    });
}

async function loadAppointmentOptions()
{
    const select = document.getElementById("checkin_appointment_id");
    const today = todayDate();

    const [appointmentsResult, todaysFlowResult] = await Promise.all([
        fetchAppointments({ from: today, to: today }),
        fetchFlow({ from: today, to: today })
    ]);

    const appointments = appointmentsResult.success ? appointmentsResult.data : [];
    const todaysFlow = todaysFlowResult.success ? todaysFlowResult.data : [];
    const checkedInIds = new Set(todaysFlow.map((entry) => entry.appointment_id));

    const available = appointments.filter((appt) =>
        Number(appt.is_provider_block) !== 1 &&
        appt.status !== "cancelled" &&
        !checkedInIds.has(appt.id)
    );

    if (!available.length) {
        select.innerHTML = `<option value="">No appointments available to check in</option>`;
        return;
    }

    const options = available.map((appt) => {
        const patientName = [appt.patient_first_name, appt.patient_last_name].filter(Boolean).join(" ") || "—";
        const time = (appt.appointment_time || "").slice(0, 5);

        return `<option value="${appt.id}">${escapeHtml(time)} — ${escapeHtml(patientName)} (${escapeHtml(appt.patient_no || "—")})</option>`;
    }).join("");

    select.innerHTML = `<option value="">Select an appointment</option>` + options;
}

async function loadFlow()
{
    const requestedAt = Date.now();
    const result = await fetchFlow(getFilters());

    if (isBoardGone()) {
        return;
    }

    flowCache = result.success ? result.data : [];

    if (flowCache.length && flowCache[0].server_time) {
        const serverNow = parseDbDate(flowCache[0].server_time).getTime();

        clockOffsetMs = requestedAt - serverNow;
    }

    renderSummary();
    renderTable();
}

function renderSummary()
{
    const container = document.getElementById("flowSummary");

    if (!container) {
        return;
    }

    const counts = STAGES.reduce((acc, stage) => {
        acc[stage] = flowCache.filter((entry) => entry.stage === stage).length;
        return acc;
    }, {});

    container.innerHTML = `
        <span class="pf-stat-pill">Total: ${flowCache.length}</span>
        ${STAGES.map((stage) => `<span class="pf-stat-pill ${stage}">${STAGE_LABELS[stage]}: ${counts[stage]}</span>`).join("")}
    `;
}

function renderTable()
{
    const tbody = document.getElementById("flowTableBody");

    if (!tbody) {
        return;
    }

    if (!flowCache.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="pf-empty-state">
                    <strong>No patients on the board</strong>
                    <p>Check in a scheduled patient, or adjust your filters.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = flowCache.map(renderRow).join("");

    updateTimeCells();
}

function renderRow(entry)
{
    const patientName = escapeHtml([entry.patient_first_name, entry.patient_last_name].filter(Boolean).join(" ") || "—");
    const providerName = escapeHtml([entry.provider_first_name, entry.provider_last_name].filter(Boolean).join(" ") || "—");
    const visitCategory = escapeHtml(entry.visit_category_name || "—");
    const facility = escapeHtml(entry.facility_name || "—");
    const roomName = entry.room_name ? escapeHtml(entry.room_name) : "No room";
    const arrive = formatTime(entry.checked_in_at);
    const checkout = entry.checked_out_at ? formatTime(entry.checked_out_at) : "—";
    const stageStart = entry[STAGE_TIMESTAMP_FIELD[entry.stage]] || entry.checked_in_at;

    return `
    <tr data-flow-id="${entry.id}"
        data-stage="${entry.stage}"
        data-stage-start="${stageStart}"
        data-checked-in="${entry.checked_in_at}"
        data-checked-out="${entry.checked_out_at || ""}"
        class="pf-row-${entry.stage}">
        <td>
            <a href="#" class="btn-edit" data-view-patient="${escapeHtml(entry.patient_no || "")}" style="text-decoration:none;">${patientName}</a>
            <div style="font-size:11px;color:#6b7787;">${escapeHtml(entry.patient_no || "—")}</div>
        </td>
        <td>${visitCategory}</td>
        <td>${providerName}</td>
        <td>${facility}</td>
        <td>
            <button type="button" class="pf-status-room-btn" data-open-status-room="${entry.id}">
                <strong>${STAGE_LABELS[entry.stage] || entry.stage}</strong>
                <span>${roomName}</span>
            </button>
        </td>
        <td>${arrive}</td>
        <td class="pf-time-cell" data-role="stage-timer">–</td>
        <td data-role="total-timer">–</td>
        <td>${checkout}</td>
        <td class="pf-col-drug">
            <input type="checkbox" class="pf-drug-screen-check" data-drug-screen="${entry.id}" ${entry.drug_screen_completed == 1 ? "checked" : ""}>
        </td>
        <td class="pf-col-actions">
            <button type="button" class="pf-remove-btn" data-remove-flow="${entry.id}">Remove</button>
        </td>
    </tr>
    `;
}

function updateTimeCells()
{
    if (isBoardGone()) {
        return;
    }

    const now = new Date(Date.now() - clockOffsetMs);

    document.querySelectorAll("#flowTableBody tr[data-flow-id]").forEach((row) => {
        const stage = row.getAttribute("data-stage");
        const stageStart = parseDbDate(row.getAttribute("data-stage-start"));
        const checkedIn = parseDbDate(row.getAttribute("data-checked-in"));
        const checkedOutRaw = row.getAttribute("data-checked-out");
        const checkedOut = checkedOutRaw ? parseDbDate(checkedOutRaw) : null;

        const stageCell = row.querySelector('[data-role="stage-timer"]');
        const totalCell = row.querySelector('[data-role="total-timer"]');

        if (stageStart) {
            const elapsed = now - stageStart;

            stageCell.textContent = formatDuration(elapsed);
            stageCell.classList.toggle("pf-blink", stage !== "checked_out" && elapsed > BLINK_THRESHOLD_MS);
        }

        if (checkedIn) {
            const totalEnd = checkedOut || now;

            totalCell.textContent = formatDuration(totalEnd - checkedIn);
        }
    });
}

function parseDbDate(value)
{
    if (!value) {
        return null;
    }

    return new Date(value.replace(" ", "T"));
}

function formatDuration(ms)
{
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

function formatTime(value)
{
    const serverDate = parseDbDate(value);

    if (!serverDate) {
        return "—";
    }

    // Same clock-frame translation as updateTimeCells() -- the raw value
    // is a server-timezone wall-clock string, so it's shifted by the
    // browser/server offset before reading out local hours/minutes.
    const localDate = new Date(serverDate.getTime() + clockOffsetMs);
    const hours = String(localDate.getHours()).padStart(2, "0");
    const minutes = String(localDate.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function setupCheckInModal()
{
    const modalOverlay = document.getElementById("checkInModalOverlay");
    const form = document.getElementById("checkInForm");

    const resetForm = () => {
        form.reset();
        document.getElementById("checkInFormAlert").innerHTML = "";
        document.getElementById("err-appointment_id").textContent = "";
    };

    const openModal = () => {
        resetForm();
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("openCheckInModal").addEventListener("click", openModal);
    document.getElementById("closeCheckInModal").addEventListener("click", closeModal);
    document.getElementById("cancelCheckInForm").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-appointment_id").textContent = "";

        const appointmentId = document.getElementById("checkin_appointment_id").value;

        if (!appointmentId) {
            document.getElementById("err-appointment_id").textContent = "Choose an appointment.";
            return;
        }

        const result = await checkInPatient(Number(appointmentId));

        if (!result.success) {
            showAlert("checkInFormAlert", result.message || "Failed to check in patient.", "error");
            return;
        }

        closeModal();
        showListAlert("Patient checked in successfully.", "success");
        await loadFlow();
        await loadAppointmentOptions();
    });
}

function setupStatusRoomModal()
{
    const modalOverlay = document.getElementById("statusRoomModalOverlay");
    const form = document.getElementById("statusRoomForm");

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    document.getElementById("closeStatusRoomModal").addEventListener("click", closeModal);
    document.getElementById("cancelStatusRoomForm").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = Number(document.getElementById("status_room_flow_id").value);
        const stage = document.getElementById("status_room_stage").value;
        const roomId = document.getElementById("status_room_room_id").value;

        const result = await updateFlowStatusRoom(id, stage, roomId ? Number(roomId) : null);

        if (!result.success) {
            showAlert("statusRoomFormAlert", result.message || "Failed to update patient flow.", "error");
            return;
        }

        closeModal();
        showListAlert("Patient flow updated successfully.", "success");
        await loadFlow();
    });
}

function openStatusRoomModal(flowId)
{
    const entry = flowCache.find((row) => row.id === flowId);

    if (!entry) {
        return;
    }

    document.getElementById("statusRoomFormAlert").innerHTML = "";
    document.getElementById("status_room_flow_id").value = entry.id;
    document.getElementById("status_room_stage").value = entry.stage;
    document.getElementById("status_room_room_id").value = entry.room_id || "";
    document.getElementById("statusRoomModalOverlay").classList.add("open");
}

function setupTableActions()
{
    document.getElementById("flowTableBody").addEventListener("click", async (event) => {
        const statusBtn = event.target.closest("[data-open-status-room]");
        const removeBtn = event.target.closest("[data-remove-flow]");
        const patientLink = event.target.closest("[data-view-patient]");

        if (statusBtn) {
            openStatusRoomModal(Number(statusBtn.getAttribute("data-open-status-room")));
            return;
        }

        if (patientLink) {
            event.preventDefault();
            goToPatientChart(patientLink.getAttribute("data-view-patient"));
            return;
        }

        if (removeBtn) {
            const id = Number(removeBtn.getAttribute("data-remove-flow"));

            if (!confirm("Remove this patient from the board?")) {
                return;
            }

            const result = await removeFlowEntry(id);

            if (!result.success) {
                showListAlert(result.message || "Failed to remove patient.", "error");
                return;
            }

            showListAlert("Patient removed from the board.", "success");
            await loadFlow();
            await loadAppointmentOptions();
        }
    });

    document.getElementById("flowTableBody").addEventListener("change", async (event) => {
        const checkbox = event.target.closest("[data-drug-screen]");

        if (!checkbox) {
            return;
        }

        const id = Number(checkbox.getAttribute("data-drug-screen"));
        const completed = checkbox.checked;

        const result = await updateFlowDrugScreen(id, completed);

        if (!result.success) {
            checkbox.checked = !completed;
            showListAlert(result.message || "Failed to update drug screen status.", "error");
            return;
        }

        const entry = flowCache.find((row) => row.id === id);

        if (entry) {
            entry.drug_screen_completed = completed ? 1 : 0;
        }
    });
}

function goToPatientChart(patientNo)
{
    if (!patientNo) {
        return;
    }

    const settings = loadSettings();

    setPendingPatientView(patientNo);

    if (settings.openInNewWindow) {
        window.open(window.location.origin + window.location.pathname + "#/dashboard", "_blank");
        return;
    }

    window.tabManager.openTab("patients", "Patients", () => {
        setTimeout(initPatientsList, 0);
        return PatientsListView(getUser());
    }, true);
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
