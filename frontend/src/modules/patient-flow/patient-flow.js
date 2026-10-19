import { fetchAppointments } from "../appointments/appointments.service.js?v=4";
import { fetchVisitCategories } from "../visit-categories/visit-categories.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js?v=5";
import { fetchRooms } from "../rooms/rooms.service.js";
import {
    fetchFlow, checkInPatient, updateFlowStatusRoom, updateFlowDrugScreen, removeFlowEntry,
    getNppConsentStatus, captureNppConsent,
    fetchQueueTokens, callQueueToken, serveQueueToken, completeQueueToken,
    fetchQueueDisplayBoard, getQueueTokenSlipUrl
} from "./patient-flow.service.js";
import { setPendingPatientView } from "../../core/pending-patient-view.js";
import { getUser } from "../../core/session.js?v=5";
import { PatientsListView } from "../patients/patients-list.view.js?v=87";
import { initPatientsList } from "../patients/patients-list.js?v=115";
import { todayISO } from "../../core/timezone.js";

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
let appointmentCache = [];
let currentCheckinPatientId = null;
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
    setupTokenSuccessModal();
    setupQueueDisplayModal();
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
    return todayISO();
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

    appointmentCache = available;

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

    let tokenHtml = '<span style="color:#94a3b8;">—</span>';
    if (entry.token_number) {
        const priorityBadge = entry.token_priority && entry.token_priority !== 'routine' 
            ? `<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:1px 5px;border-radius:4px;background:#fee2e2;color:#b91c1c;margin-left:4px;">${escapeHtml(entry.token_priority)}</span>` 
            : '';
        const isWaitingOrRoomed = (entry.stage === 'waiting' || entry.stage === 'roomed');
        const callBtn = isWaitingOrRoomed && entry.queue_token_id 
            ? `<button type="button" class="btn-call-token" data-token-id="${entry.queue_token_id}" data-patient-name="${patientName}" data-token-num="${escapeHtml(entry.token_number)}" data-room="${roomName}" style="padding:2px 7px;font-size:11px;font-weight:700;background:#10b981;color:#fff;border:none;border-radius:4px;cursor:pointer;" title="Call patient on audio/display">🔊 Call ${entry.call_counter > 0 ? `(#${entry.call_counter})` : ''}</button>` 
            : '';
        const slipBtn = entry.queue_token_id 
            ? `<button type="button" class="btn-token-slip" data-token-id="${entry.queue_token_id}" style="padding:2px 6px;font-size:11px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;margin-left:4px;" title="Print Token Slip">🎫</button>` 
            : '';

        tokenHtml = `
            <div>
                <span style="font-family:monospace;font-size:13px;font-weight:800;background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:6px;border:1px solid #bae6fd;display:inline-block;">${escapeHtml(entry.token_number)}</span>
                ${priorityBadge}
            </div>
            <div style="margin-top:4px;display:flex;align-items:center;">
                ${callBtn}
                ${slipBtn}
            </div>
        `;
    }

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
        <td>${tokenHtml}</td>
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
    const apptSelect = document.getElementById("checkin_appointment_id");
    const nppSection = document.getElementById("checkinNppSection");
    const nppStatus = document.getElementById("checkinNppStatus");
    const nppCaptureBox = document.getElementById("checkinNppCaptureBox");
    const btnRecordNpp = document.getElementById("btnRecordCheckinNpp");

    const resetForm = () => {
        form.reset();
        document.getElementById("checkInFormAlert").innerHTML = "";
        document.getElementById("err-appointment_id").textContent = "";
        currentCheckinPatientId = null;
        if (nppSection) nppSection.style.display = "none";
        if (nppStatus) nppStatus.innerHTML = "";
        if (nppCaptureBox) nppCaptureBox.style.display = "none";
        const errSig = document.getElementById("err-checkin_npp_sig");
        if (errSig) errSig.textContent = "";
    };

    const openModal = () => {
        resetForm();
        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
    };

    const updateNppStatusUI = async (patientId, patientName) => {
        if (!nppSection || !nppStatus) return;

        nppSection.style.display = "";
        nppStatus.innerHTML = `<span style="font-size: 12px; color: #64748b;">Checking HIPAA NPP consent status...</span>`;
        if (nppCaptureBox) nppCaptureBox.style.display = "none";

        try {
            const res = await getNppConsentStatus(patientId);
            if (res.success && res.data) {
                const d = res.data;
                if (d.npp_acknowledged) {
                    nppStatus.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; color: #065f46; font-size: 12.5px;">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                            </svg>
                            <div>
                                <strong>HIPAA Notice of Privacy Practices Acknowledged ✓</strong>
                                <div style="color: #64748b; font-size: 11.5px; margin-top: 1px;">
                                    Signed: ${escapeHtml(d.acknowledged_at || "On File")} &bull; Method: ${escapeHtml(d.signature_type || "electronic")} (v${escapeHtml(d.npp_version || "2026-09")})
                                </div>
                            </div>
                        </div>
                    `;
                    if (nppCaptureBox) nppCaptureBox.style.display = "none";
                } else {
                    nppStatus.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #92400e; font-size: 12.5px;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                <span><strong>NPP Consent Missing:</strong> Patient has not yet signed Notice of Privacy Practices (HIPAA § 164.520).</span>
                            </div>
                        </div>
                    `;
                    if (nppCaptureBox) {
                        nppCaptureBox.style.display = "";
                        const sigInput = document.getElementById("checkin_npp_signature_data");
                        if (sigInput && !sigInput.value) {
                            sigInput.value = patientName || "";
                        }
                    }
                }
            } else {
                nppStatus.innerHTML = `<span style="font-size: 11.5px; color: #94a3b8;">Unable to verify NPP status.</span>`;
            }
        } catch (err) {
            nppStatus.innerHTML = `<span style="font-size: 11.5px; color: #94a3b8;">NPP check skipped (offline or network error).</span>`;
        }
    };

    if (apptSelect) {
        apptSelect.addEventListener("change", () => {
            const apptId = Number(apptSelect.value);
            if (!apptId) {
                if (nppSection) nppSection.style.display = "none";
                currentCheckinPatientId = null;
                return;
            }

            const appt = appointmentCache.find((a) => Number(a.id) === apptId);
            if (appt && appt.patient_id) {
                currentCheckinPatientId = Number(appt.patient_id);
                const patientName = [appt.patient_first_name, appt.patient_last_name].filter(Boolean).join(" ");
                updateNppStatusUI(currentCheckinPatientId, patientName);
            }
        });
    }

    if (btnRecordNpp) {
        btnRecordNpp.addEventListener("click", async () => {
            if (!currentCheckinPatientId) return;

            const sigType = document.getElementById("checkin_npp_signature_type")?.value || "in_clinic";
            const sigDataInput = document.getElementById("checkin_npp_signature_data");
            const errSig = document.getElementById("err-checkin_npp_sig");
            const sigData = (sigDataInput?.value || "").trim();

            if (errSig) errSig.textContent = "";

            if (!sigData) {
                if (errSig) errSig.textContent = "Please enter patient name or staff verification note.";
                return;
            }

            btnRecordNpp.disabled = true;
            btnRecordNpp.textContent = "Saving...";

            try {
                const res = await captureNppConsent({
                    patient_id: currentCheckinPatientId,
                    signature_type: sigType,
                    signature_data: sigData,
                    npp_version: "2026-09"
                });

                if (res.success) {
                    await updateNppStatusUI(currentCheckinPatientId, sigData);
                } else {
                    if (errSig) errSig.textContent = res.message || "Failed to record consent.";
                }
            } catch (err) {
                if (errSig) errSig.textContent = "Network error recording consent.";
            } finally {
                btnRecordNpp.disabled = false;
                btnRecordNpp.textContent = "Record Consent (HIPAA § 164.520)";
            }
        });
    }

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

        const deptCode = document.getElementById("checkin_department_code")?.value || "";
        const priority = document.getElementById("checkin_priority")?.value || "routine";

        const btnSubmit = document.getElementById("btnSubmitCheckIn");
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Checking in & issuing token...";
        }

        try {
            const result = await checkInPatient(Number(appointmentId), {
                department_code: deptCode,
                priority: priority
            });

            if (!result.success) {
                showAlert("checkInFormAlert", result.message || "Failed to check in patient.", "error");
                return;
            }

            closeModal();
            await loadFlow();
            await loadAppointmentOptions();

            if (result.data?.queue_token) {
                openTokenSuccessModal(result.data.queue_token);
            } else {
                showListAlert(result.message || "Patient checked in successfully.", "success");
            }
        } catch (err) {
            showAlert("checkInFormAlert", "Network or server error during check-in.", "error");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Check In & Issue Token";
            }
        }
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
        const callTokenBtn = event.target.closest(".btn-call-token");
        const tokenSlipBtn = event.target.closest(".btn-token-slip");

        if (callTokenBtn) {
            const tokenId = Number(callTokenBtn.getAttribute("data-token-id"));
            const patientName = callTokenBtn.getAttribute("data-patient-name") || "Patient";
            const tokenNum = callTokenBtn.getAttribute("data-token-num") || "Token";
            const roomName = callTokenBtn.getAttribute("data-room") || "Consultation Room";

            callTokenBtn.disabled = true;
            callTokenBtn.textContent = "Calling...";

            try {
                const res = await callQueueToken(tokenId);
                if (res.success) {
                    showListAlert(res.announcement_text || res.message, "success");
                    // Audio voice synthesis announcement
                    if ('speechSynthesis' in window) {
                        try {
                            const utter = new SpeechSynthesisUtterance(`Now calling token ${tokenNum}, ${patientName}, to ${roomName}`);
                            utter.rate = 0.9;
                            window.speechSynthesis.speak(utter);
                        } catch (e) {
                            console.debug("Speech synthesis error:", e);
                        }
                    }
                    await loadFlow();
                } else {
                    showListAlert(res.message || "Failed to call token.", "error");
                }
            } catch (err) {
                showListAlert("Network error calling queue token.", "error");
            } finally {
                callTokenBtn.disabled = false;
            }
            return;
        }

        if (tokenSlipBtn) {
            const tokenId = Number(tokenSlipBtn.getAttribute("data-token-id"));
            if (tokenId) {
                window.open(getQueueTokenSlipUrl(tokenId), "_blank");
            }
            return;
        }

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

let currentSuccessTokenId = null;

function setupTokenSuccessModal()
{
    const modal = document.getElementById("tokenSuccessModalOverlay");
    if (!modal) return;

    const closeModal = () => modal.classList.remove("open");

    document.getElementById("closeTokenSuccessModal")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById("btnPrintTokenSlip")?.addEventListener("click", () => {
        if (currentSuccessTokenId) {
            window.open(getQueueTokenSlipUrl(currentSuccessTokenId), "_blank");
        }
    });
}

function openTokenSuccessModal(token)
{
    const modal = document.getElementById("tokenSuccessModalOverlay");
    if (!modal || !token) return;

    currentSuccessTokenId = token.id;

    const deptEl = document.getElementById("successTokenDept");
    const numEl = document.getElementById("successTokenNumber");
    const priEl = document.getElementById("successTokenPriority");
    const waitEl = document.getElementById("successTokenWait");
    const patEl = document.getElementById("successTokenPatient");

    if (deptEl) deptEl.textContent = token.department_name || token.department_code || "Clinic";
    if (numEl) numEl.textContent = token.token_number || "--";
    if (priEl) priEl.textContent = (token.priority || "routine").toUpperCase();
    if (waitEl) waitEl.textContent = `~${token.estimated_wait_minutes || 15} mins`;
    if (patEl) patEl.textContent = token.patient_name || "--";

    modal.classList.add("open");
}

let queueTvIntervalId = null;
let queueTvClockIntervalId = null;

function setupQueueDisplayModal()
{
    const modal = document.getElementById("queueDisplayModalOverlay");
    const openBtn = document.getElementById("openQueueDisplayBtn");
    const closeBtn = document.getElementById("closeQueueDisplayModal");

    if (!modal || !openBtn) return;

    const updateClock = () => {
        const clockEl = document.getElementById("queueTvClock");
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toTimeString().split(" ")[0];
        }
    };

    const renderDisplayBoard = async () => {
        try {
            const res = await fetchQueueDisplayBoard();
            if (!res.success || !res.data) return;

            const d = res.data;
            const callingList = document.getElementById("queueTvCallingList");
            const upNextList = document.getElementById("queueTvUpNextList");
            const waitingCount = document.getElementById("queueTvWaitingCount");
            const summaryStats = document.getElementById("queueTvSummaryStats");

            if (waitingCount) {
                waitingCount.textContent = `${d.summary?.waiting_count || 0} Waiting`;
            }
            if (summaryStats) {
                summaryStats.textContent = `Total Issued: ${d.summary?.total_issued_today || 0} • In Consultation: ${d.summary?.consultation_count || 0} • Completed: ${d.summary?.completed_count || 0} • Avg Wait: ${d.summary?.avg_wait_minutes || 0}m`;
            }

            if (callingList) {
                if (!d.now_calling || d.now_calling.length === 0) {
                    callingList.innerHTML = `<div style="color: #64748b; text-align: center; padding: 40px; font-size: 14px;">No patients currently being called.</div>`;
                } else {
                    callingList.innerHTML = d.now_calling.map(t => `
                        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.3) 100%); border: 2px solid #10b981; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);">
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #6ee7b7; text-transform: uppercase;">${escapeHtml(t.department_name || t.department_code)}</div>
                                <div style="font-size: 38px; font-weight: 900; color: #fff; letter-spacing: 1.5px; font-family: monospace;">${escapeHtml(t.token_number)}</div>
                                <div style="font-size: 13px; color: #cbd5e1;">${escapeHtml(t.patient_name)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">PROCEED TO</div>
                                <div style="font-size: 22px; font-weight: 800; color: #38bdf8;">${escapeHtml(t.room_name)}</div>
                                <div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; background: #064e3b; color: #6ee7b7; font-size: 11px; font-weight: 700;">CALL #${t.call_counter}</div>
                            </div>
                        </div>
                    `).join("");
                }
            }

            if (upNextList) {
                if (!d.up_next || d.up_next.length === 0) {
                    upNextList.innerHTML = `<div style="color: #64748b; text-align: center; padding: 40px; font-size: 14px;">Queue is currently empty.</div>`;
                } else {
                    upNextList.innerHTML = d.up_next.map((t, i) => `
                        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 13px; font-weight: 800; color: #64748b; width: 20px;">#${i + 1}</span>
                                <div>
                                    <span style="font-size: 18px; font-weight: 800; color: #38bdf8; font-family: monospace;">${escapeHtml(t.token_number)}</span>
                                    <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">${escapeHtml(t.department_code)}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; ${t.priority !== 'routine' ? 'background: #7f1d1d; color: #fca5a5;' : 'background: #1e293b; color: #94a3b8;'}">${escapeHtml(t.priority)}</span>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Est. ~${t.estimated_wait_minutes || 15}m</div>
                            </div>
                        </div>
                    `).join("");
                }
            }
        } catch (err) {
            console.error("Queue display board polling error:", err);
        }
    };

    const openModal = () => {
        modal.classList.add("open");
        updateClock();
        renderDisplayBoard();
        if (queueTvClockIntervalId) clearInterval(queueTvClockIntervalId);
        if (queueTvIntervalId) clearInterval(queueTvIntervalId);
        queueTvClockIntervalId = setInterval(updateClock, 1000);
        queueTvIntervalId = setInterval(renderDisplayBoard, 5000);
    };

    const closeModal = () => {
        modal.classList.remove("open");
        if (queueTvClockIntervalId) clearInterval(queueTvClockIntervalId);
        if (queueTvIntervalId) clearInterval(queueTvIntervalId);
    };

    openBtn.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
}
