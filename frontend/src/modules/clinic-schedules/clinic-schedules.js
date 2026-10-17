import {
    fetchDepartmentsOverview,
    fetchDepartmentSchedule,
    saveWeeklySchedule,
    copyDaySchedule
} from "./clinic-schedules.service.js";
import { showToast } from "../../core/toast.js";

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
];

let state = {
    user: null,
    departments: [],
    currentDepartmentId: null,
    currentFacilityId: null,
    weeklySchedules: [],
    copySourceDay: null
};

/**
 * Initialize Clinic Operating Schedules module
 */
export async function initClinicSchedules(user = {}) {
    state.user = user;

    setupGlobalEventListeners();
    await loadDepartments();
}

/**
 * Setup main event listeners
 */
function setupGlobalEventListeners() {
    // Department selector change
    const deptSelect = document.getElementById("cs-select-dept");
    if (deptSelect) {
        deptSelect.onchange = (e) => {
            const val = parseInt(e.target.value, 10);
            if (val) {
                state.currentDepartmentId = val;
                loadDepartmentSchedule(val);
            }
        };
    }

    // Save All button
    const btnSaveAll = document.getElementById("cs-btn-save-all");
    if (btnSaveAll) {
        btnSaveAll.onclick = handleSaveAllSchedules;
    }

    // Copy Mon -> Weekdays shortcut
    const btnCopyWeekdays = document.getElementById("cs-btn-copy-weekdays");
    if (btnCopyWeekdays) {
        btnCopyWeekdays.onclick = handleCopyMonToWeekdays;
    }

    // Modal close buttons
    document.querySelectorAll(".cs-modal-close").forEach(btn => {
        btn.onclick = () => closeModal("cs-modal-copy");
    });

    const modalBackdrop = document.getElementById("cs-modal-copy");
    if (modalBackdrop) {
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) closeModal("cs-modal-copy");
        };
    }

    // Modal Copy Select buttons
    const btnSelectWeekdays = document.getElementById("cs-copy-select-weekdays");
    if (btnSelectWeekdays) {
        btnSelectWeekdays.onclick = () => {
            const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            document.querySelectorAll("#cs-copy-days-list input[type='checkbox']").forEach(cb => {
                cb.checked = weekdays.includes(cb.value);
            });
        };
    }

    const btnSelectAll = document.getElementById("cs-copy-select-all");
    if (btnSelectAll) {
        btnSelectAll.onclick = () => {
            document.querySelectorAll("#cs-copy-days-list input[type='checkbox']").forEach(cb => {
                cb.checked = true;
            });
        };
    }

    // Modal Confirm Copy
    const btnConfirmCopy = document.getElementById("cs-btn-confirm-copy");
    if (btnConfirmCopy) {
        btnConfirmCopy.onclick = handleConfirmCopyDay;
    }
}

/**
 * Load list of departments
 */
async function loadDepartments() {
    try {
        const res = await fetchDepartmentsOverview();
        state.departments = (res && res.data) ? res.data : [];

        const select = document.getElementById("cs-select-dept");
        if (!select) return;

        if (state.departments.length === 0) {
            select.innerHTML = `<option value="">No clinical departments found</option>`;
            return;
        }

        select.innerHTML = state.departments.map(d => {
            const activeTag = d.active_days_count > 0 ? ` (${d.active_days_count}d active)` : ' (No schedule)';
            return `<option value="${d.id}">${escapeHtml(d.name)}${activeTag}</option>`;
        }).join("");

        // Select first department (preferably Cardiology or Clinical)
        let defaultDept = state.departments.find(d => d.name === "Cardiology") || state.departments[0];
        state.currentDepartmentId = defaultDept.id;
        select.value = defaultDept.id;

        await loadDepartmentSchedule(defaultDept.id);
    } catch (err) {
        console.error("Failed to load departments:", err);
        showToast("Error loading clinical departments: " + err.message, "error");
    }
}

/**
 * Load weekly schedule for selected department
 */
async function loadDepartmentSchedule(deptId) {
    const grid = document.getElementById("cs-grid");
    if (grid) {
        grid.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: cs-spin 0.8s linear infinite;"></div>
                <div style="margin-top: 8px;">Loading timetable for department...</div>
            </div>
        `;
    }

    try {
        const res = await fetchDepartmentSchedule(deptId, state.currentFacilityId);
        if (res && res.data) {
            const data = res.data;
            state.weeklySchedules = data.weekly_schedules || [];
            state.currentFacilityId = data.facility_id;

            updateBanner(data.department, data.active_days_count, data.total_weekly_capacity);
            renderWeeklyGrid();
        } else {
            showToast("Failed to load schedule for department.", "error");
        }
    } catch (err) {
        console.error("Failed to load schedule:", err);
        showToast("Network error loading clinic timetable: " + err.message, "error");
    }
}

/**
 * Update top department summary banner
 */
function updateBanner(dept, activeDays, weeklyCapacity) {
    const titleEl = document.getElementById("cs-dept-title");
    const badgeEl = document.getElementById("cs-dept-badge");
    const typeEl = document.getElementById("cs-dept-type");
    const activeDaysEl = document.getElementById("cs-kpi-active-days");
    const weeklyCapEl = document.getElementById("cs-kpi-weekly-capacity");
    const dailyAvgEl = document.getElementById("cs-kpi-daily-avg");

    if (titleEl && dept) titleEl.textContent = `${dept.name} Operating Timetable`;
    if (badgeEl && dept) badgeEl.textContent = dept.code || 'CLINIC';
    if (typeEl && dept) typeEl.textContent = `${dept.type} Department • Status: ${dept.status ? dept.status.toUpperCase() : 'ACTIVE'}`;

    if (activeDaysEl) activeDaysEl.textContent = `${activeDays || 0} Days / Wk`;
    if (weeklyCapEl) weeklyCapEl.textContent = `${weeklyCapacity || 0} Patients`;

    if (dailyAvgEl) {
        const avg = activeDays > 0 ? (weeklyCapacity / activeDays).toFixed(1) : 0;
        dailyAvgEl.textContent = `${avg} Patients`;
    }
}

/**
 * Render 7 day cards
 */
function renderWeeklyGrid() {
    const grid = document.getElementById("cs-grid");
    if (!grid) return;

    if (!state.weeklySchedules || state.weeklySchedules.length === 0) {
        grid.innerHTML = `<div style="padding: 24px; text-align: center; color: #dc2626;">No schedule data available.</div>`;
        return;
    }

    grid.innerHTML = state.weeklySchedules.map((row, index) => {
        const day = row.day_of_week;
        const isActive = Boolean(row.is_active);
        const startTime = (row.start_time || '08:00:00').substring(0, 5);
        const endTime = (row.end_time || '17:00:00').substring(0, 5);
        const breakStart = row.break_start_time ? row.break_start_time.substring(0, 5) : '12:00';
        const breakEnd = row.break_end_time ? row.break_end_time.substring(0, 5) : '13:00';
        const slotDuration = parseInt(row.slot_duration_minutes, 10) || 30;
        const maxCapacity = parseInt(row.max_daily_capacity, 10) || 0;
        const allowWalkIns = Boolean(row.allow_walk_ins);
        const maxWalkIns = parseInt(row.max_walk_ins, 10) || 0;
        const notes = row.notes || '';
        const calculatedSlots = row.calculated_slots || calculateClientSlots(startTime, endTime, breakStart, breakEnd, slotDuration);

        return `
            <div class="cs-day-card ${isActive ? '' : 'cs-closed'}" id="cs-card-${day}" data-day="${day}">
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color, #f1f5f9);">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <label class="cs-switch" title="Toggle clinic open / closed for ${day}">
                            <input type="checkbox" class="cs-input-active" data-day="${day}" ${isActive ? 'checked' : ''}>
                            <span class="cs-slider"></span>
                        </label>
                        <div>
                            <span style="font-size: 1.0625rem; font-weight: 700; color: ${isActive ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #94a3b8)'};">
                                ${day}
                            </span>
                            <span class="cs-status-label" style="margin-left: 8px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${isActive ? 'background: rgba(16, 185, 129, 0.12); color: #10b981;' : 'background: rgba(100, 116, 139, 0.12); color: #64748b;'}">
                                ${isActive ? 'OPEN / ACTIVE' : 'CLOSED'}
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="cs-slots-badge" style="font-size: 0.8125rem; background: rgba(2, 132, 199, 0.08); color: #0284c7; padding: 3px 8px; border-radius: 6px; font-weight: 600;">
                            Est. Slots: <b class="cs-slots-val">${calculatedSlots}</b>
                        </span>
                        <button type="button" class="btn btn-sm cs-btn-copy-day" data-day="${day}" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;" title="Copy this day's settings to other days">
                            Copy to...
                        </button>
                    </div>
                </div>

                <!-- Card Body Form Controls -->
                <div class="cs-controls-wrapper" style="${isActive ? '' : 'pointer-events: none; opacity: 0.5; filter: grayscale(50%);'}; display: grid; grid-template-columns: 1.2fr 1fr 1.2fr 1fr 1fr 1.5fr; gap: 14px; align-items: flex-end;">
                    <!-- Operating Hours -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Operating Hours
                        </label>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="time" class="form-control cs-input-start" data-day="${day}" value="${startTime}" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <span style="color: #94a3b8;">&ndash;</span>
                            <input type="time" class="form-control cs-input-end" data-day="${day}" value="${endTime}" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Slot Duration -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Slot Interval
                        </label>
                        <select class="form-control cs-input-slot" data-day="${day}" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <option value="10" ${slotDuration === 10 ? 'selected' : ''}>10 minutes</option>
                            <option value="15" ${slotDuration === 15 ? 'selected' : ''}>15 minutes</option>
                            <option value="20" ${slotDuration === 20 ? 'selected' : ''}>20 minutes</option>
                            <option value="30" ${slotDuration === 30 ? 'selected' : ''}>30 minutes</option>
                            <option value="45" ${slotDuration === 45 ? 'selected' : ''}>45 minutes</option>
                            <option value="60" ${slotDuration === 60 ? 'selected' : ''}>60 minutes</option>
                        </select>
                    </div>

                    <!-- Lunch / Break -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Lunch / Recess Break
                        </label>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="time" class="form-control cs-input-break-start" data-day="${day}" value="${breakStart}" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <span style="color: #94a3b8;">&ndash;</span>
                            <input type="time" class="form-control cs-input-break-end" data-day="${day}" value="${breakEnd}" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Max Daily Capacity -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Max Capacity
                        </label>
                        <input type="number" min="0" max="250" class="form-control cs-input-capacity" data-day="${day}" value="${maxCapacity}" placeholder="e.g. 40" style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600;">
                    </div>

                    <!-- Walk-ins -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Walk-in Quota
                        </label>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox" class="cs-input-allow-walk" data-day="${day}" ${allowWalkIns ? 'checked' : ''} title="Allow walk-in patients on ${day}">
                            <input type="number" min="0" max="100" class="form-control cs-input-walkins" data-day="${day}" value="${maxWalkIns}" ${allowWalkIns ? '' : 'disabled'} style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Notes / Topic -->
                    <div>
                        <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">
                            Session Notes / Clinic Scope
                        </label>
                        <input type="text" class="form-control cs-input-notes" data-day="${day}" value="${escapeHtml(notes)}" placeholder="e.g. Echocardiogram reviews, Arrhythmia OPD..." style="width: 100%; padding: 6px 8px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                    </div>
                </div>
            </div>
        `;
    }).join("");

    attachDayCardListeners();
}

/**
 * Attach live change listeners for active toggle, time recalculations, and copy buttons
 */
function attachDayCardListeners() {
    // Active toggles
    document.querySelectorAll(".cs-input-active").forEach(cb => {
        cb.onchange = (e) => {
            const day = e.target.getAttribute("data-day");
            const card = document.getElementById(`cs-card-${day}`);
            const wrapper = card.querySelector(".cs-controls-wrapper");
            const label = card.querySelector(".cs-status-label");
            const isChecked = e.target.checked;

            if (isChecked) {
                card.classList.remove("cs-closed");
                wrapper.style.pointerEvents = "";
                wrapper.style.opacity = "";
                wrapper.style.filter = "";
                label.textContent = "OPEN / ACTIVE";
                label.style.background = "rgba(16, 185, 129, 0.12)";
                label.style.color = "#10b981";
            } else {
                card.classList.add("cs-closed");
                wrapper.style.pointerEvents = "none";
                wrapper.style.opacity = "0.5";
                wrapper.style.filter = "grayscale(50%)";
                label.textContent = "CLOSED";
                label.style.background = "rgba(100, 116, 139, 0.12)";
                label.style.color = "#64748b";
            }

            recalculateBannerTotals();
        };
    });

    // Time inputs & slot changes
    const recalculateRowSlots = (day) => {
        const card = document.getElementById(`cs-card-${day}`);
        if (!card) return;

        const start = card.querySelector(".cs-input-start").value;
        const end = card.querySelector(".cs-input-end").value;
        const bStart = card.querySelector(".cs-input-break-start").value;
        const bEnd = card.querySelector(".cs-input-break-end").value;
        const slot = parseInt(card.querySelector(".cs-input-slot").value, 10);

        const slots = calculateClientSlots(start, end, bStart, bEnd, slot);
        const slotsVal = card.querySelector(".cs-slots-val");
        if (slotsVal) slotsVal.textContent = slots;

        recalculateBannerTotals();
    };

    document.querySelectorAll(".cs-input-start, .cs-input-end, .cs-input-break-start, .cs-input-break-end, .cs-input-slot").forEach(input => {
        input.onchange = (e) => recalculateRowSlots(e.target.getAttribute("data-day"));
    });

    // Walk-in checkbox toggle
    document.querySelectorAll(".cs-input-allow-walk").forEach(cb => {
        cb.onchange = (e) => {
            const day = e.target.getAttribute("data-day");
            const card = document.getElementById(`cs-card-${day}`);
            const walkInput = card.querySelector(".cs-input-walkins");
            if (walkInput) {
                walkInput.disabled = !e.target.checked;
            }
        };
    });

    // Capacity change
    document.querySelectorAll(".cs-input-capacity").forEach(input => {
        input.oninput = recalculateBannerTotals;
    });

    // Copy to button
    document.querySelectorAll(".cs-btn-copy-day").forEach(btn => {
        btn.onclick = () => {
            const day = btn.getAttribute("data-day");
            openCopyModal(day);
        };
    });
}

/**
 * Client-side theoretical slot calculator
 */
function calculateClientSlots(startTime, endTime, breakStart, breakEnd, slotMinutes) {
    if (!slotMinutes || slotMinutes <= 0) return 0;

    const toMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(":").map(Number);
        return (h * 60) + (m || 0);
    };

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin) return 0;

    let total = endMin - startMin;

    if (breakStart && breakEnd) {
        const bStartMin = toMinutes(breakStart);
        const bEndMin = toMinutes(breakEnd);
        if (bEndMin > bStartMin && bStartMin >= startMin && bEndMin <= endMin) {
            total = Math.max(0, total - (bEndMin - bStartMin));
        }
    }

    return Math.floor(total / slotMinutes);
}

/**
 * Recalculate banner metrics dynamically based on current DOM inputs
 */
function recalculateBannerTotals() {
    let activeDays = 0;
    let totalCap = 0;

    DAYS_OF_WEEK.forEach(day => {
        const card = document.getElementById(`cs-card-${day}`);
        if (!card) return;

        const activeCb = card.querySelector(".cs-input-active");
        const capInput = card.querySelector(".cs-input-capacity");

        if (activeCb && activeCb.checked) {
            activeDays++;
            totalCap += parseInt(capInput.value, 10) || 0;
        }
    });

    const activeDaysEl = document.getElementById("cs-kpi-active-days");
    const weeklyCapEl = document.getElementById("cs-kpi-weekly-capacity");
    const dailyAvgEl = document.getElementById("cs-kpi-daily-avg");

    if (activeDaysEl) activeDaysEl.textContent = `${activeDays} Days / Wk`;
    if (weeklyCapEl) weeklyCapEl.textContent = `${totalCap} Patients`;
    if (dailyAvgEl) {
        const avg = activeDays > 0 ? (totalCap / activeDays).toFixed(1) : 0;
        dailyAvgEl.textContent = `${avg} Patients`;
    }
}

/**
 * Handle Save All Weekly Schedules
 */
async function handleSaveAllSchedules() {
    const deptId = state.currentDepartmentId;
    if (!deptId) return;

    const schedules = [];

    DAYS_OF_WEEK.forEach(day => {
        const card = document.getElementById(`cs-card-${day}`);
        if (!card) return;

        const isActive = card.querySelector(".cs-input-active").checked ? 1 : 0;
        const startTime = card.querySelector(".cs-input-start").value + ":00";
        const endTime = card.querySelector(".cs-input-end").value + ":00";
        const breakStart = card.querySelector(".cs-input-break-start").value ? card.querySelector(".cs-input-break-start").value + ":00" : null;
        const breakEnd = card.querySelector(".cs-input-break-end").value ? card.querySelector(".cs-input-break-end").value + ":00" : null;
        const slotDuration = parseInt(card.querySelector(".cs-input-slot").value, 10) || 30;
        const maxCapacity = parseInt(card.querySelector(".cs-input-capacity").value, 10) || 0;
        const allowWalkIns = card.querySelector(".cs-input-allow-walk").checked ? 1 : 0;
        const maxWalkIns = parseInt(card.querySelector(".cs-input-walkins").value, 10) || 0;
        const notes = card.querySelector(".cs-input-notes").value.trim();

        schedules.push({
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            slot_duration_minutes: slotDuration,
            break_start_time: breakStart,
            break_end_time: breakEnd,
            max_daily_capacity: maxCapacity,
            allow_walk_ins: allowWalkIns,
            max_walk_ins: maxWalkIns,
            is_active: isActive,
            notes: notes
        });
    });

    const saveBtn = document.getElementById("cs-btn-save-all");
    if (saveBtn) saveBtn.disabled = true;

    try {
        const res = await saveWeeklySchedule(deptId, schedules, state.currentFacilityId);
        if (res && res.success) {
            showToast(res.message || "Clinic weekly schedule saved successfully.", "success");
            await loadDepartments();
            await loadDepartmentSchedule(deptId);
        } else {
            showToast(res.message || "Failed to save schedule.", "error");
        }
    } catch (err) {
        showToast("Error saving schedule: " + err.message, "error");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

/**
 * Handle Copy Mon -> Weekdays shortcut
 */
async function handleCopyMonToWeekdays() {
    const deptId = state.currentDepartmentId;
    if (!deptId) return;

    if (!confirm("Are you sure you want to replicate Monday's operating hours and capacity to Tuesday, Wednesday, Thursday, and Friday?")) {
        return;
    }

    try {
        const res = await copyDaySchedule(deptId, 'Monday', ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], state.currentFacilityId);
        if (res && res.success) {
            showToast("Monday schedule successfully applied to all weekdays (Tue-Fri).", "success");
            await loadDepartmentSchedule(deptId);
        } else {
            showToast(res.message || "Failed to copy schedule.", "error");
        }
    } catch (err) {
        showToast("Error copying schedule: " + err.message, "error");
    }
}

/**
 * Open Copy to other days modal
 */
function openCopyModal(sourceDay) {
    state.copySourceDay = sourceDay;

    const sourceLabel = document.getElementById("cs-copy-source-day");
    if (sourceLabel) sourceLabel.textContent = sourceDay;

    const listEl = document.getElementById("cs-copy-days-list");
    if (listEl) {
        listEl.innerHTML = DAYS_OF_WEEK
            .filter(d => d !== sourceDay)
            .map(d => `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; cursor: pointer; padding: 4px 0;">
                    <input type="checkbox" value="${d}" style="width: 16px; height: 16px;">
                    <span>${d}</span>
                </label>
            `).join("");
    }

    openModal("cs-modal-copy");
}

/**
 * Confirm copy modal
 */
async function handleConfirmCopyDay() {
    const sourceDay = state.copySourceDay;
    const deptId = state.currentDepartmentId;
    if (!sourceDay || !deptId) return;

    const targetDays = [];
    document.querySelectorAll("#cs-copy-days-list input[type='checkbox']:checked").forEach(cb => {
        targetDays.push(cb.value);
    });

    if (targetDays.length === 0) {
        showToast("Please select at least one target day to copy settings to.", "warning");
        return;
    }

    try {
        const res = await copyDaySchedule(deptId, sourceDay, targetDays, state.currentFacilityId);
        if (res && res.success) {
            showToast(`Settings from ${sourceDay} copied to ${targetDays.join(", ")}.`, "success");
            closeModal("cs-modal-copy");
            await loadDepartmentSchedule(deptId);
        } else {
            showToast(res.message || "Failed to copy schedule.", "error");
        }
    } catch (err) {
        showToast("Error copying day: " + err.message, "error");
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "none";
        document.body.style.overflow = "";
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
