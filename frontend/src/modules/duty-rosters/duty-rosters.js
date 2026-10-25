/**
 * Doctor On-Call & Duty Rostering Management Module
 * Schema: hr_duty_rosters, hr_duty_roster_templates, hr_duty_roster_swaps
 */

import { api } from "../../core/api.js?v=10";

// Module State
let state = {
    currentYearMonth: getCurrentYearMonth(), // 'YYYY-MM'
    activeTab: "calendar", // 'calendar' | 'table' | 'switchboard' | 'swaps'
    departmentId: 0,
    roleFilter: "",
    statusFilter: "",
    searchQuery: "",
    selectedShift: null,
    showScheduleModal: false,
    showSwapModal: false,
    showPrintModal: false
};

let cache = {
    calendarData: null,
    switchboardData: null,
    swapsData: [],
    departments: [],
    doctors: []
};

function getCurrentYearMonth() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

export function DutyRostersView() {
    return `<div class="dr-root" id="dutyRostersRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Doctor On-Call &amp; Duty Rosters...</div>
        </div>
    </div>`;
}

export async function initDutyRosters() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("dutyRostersRoot");
    if (!root) return;

    try {
        const [metaRes, calRes, swRes, swapRes] = await Promise.all([
            api(`/duty-rosters/metadata`).catch(() => null),
            api(`/duty-rosters/calendar?month=${state.currentYearMonth}&department_id=${state.departmentId}&role=${state.roleFilter}&status=${state.statusFilter}`).catch(() => null),
            api(`/duty-rosters/directory/today`).catch(() => null),
            api(`/duty-rosters/swaps`).catch(() => null)
        ]);

        if (metaRes?.data) {
            cache.departments = metaRes.data.departments || [];
            cache.doctors = metaRes.data.doctors || [];
        }

        cache.calendarData = calRes?.data || { total_shifts: 0, stats: {}, calendar_grid: {}, shifts: [] };
        cache.switchboardData = swRes?.data || { total_active_today: 0, directory: [] };
        cache.swapsData = swapRes?.data || [];

        renderModule();
    } catch (err) {
        console.error("Failed to load duty rosters data:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load Duty Rostering data: ${err.message || err}</div>`;
    }
}

function renderModule() {
    const root = document.getElementById("dutyRostersRoot");
    if (!root) return;

    const stats = cache.calendarData?.stats || {};
    const totalShifts = cache.calendarData?.total_shifts || 0;
    const activeToday = stats.active_today || 0;
    const coveredDepts = stats.covered_departments || 0;
    const pendingSwaps = stats.pending_swaps || 0;

    const [curYear, curMonthNum] = state.currentYearMonth.split("-").map(Number);
    const monthDate = new Date(curYear, curMonthNum - 1, 1);
    const monthName = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    root.innerHTML = `
        <div class="dr-container">
            <!-- Header -->
            <div class="dr-header">
                <div>
                    <div class="dr-title-row">
                        <span class="dr-title-icon">
                            <i class="fas fa-user-md"></i>
                        </span>
                        <div>
                            <h1 class="dr-title">Doctor On-Call &amp; Duty Rostering</h1>
                            <p class="dr-subtitle">Clinical Department On-Call Coverage, Emergency Switchboard Directory, and Physician Shift Swaps</p>
                        </div>
                    </div>
                </div>
                <div class="dr-header-actions">
                    <button class="dr-btn dr-btn-outline" id="drBtnPrintRoster">
                        <i class="fas fa-print"></i> Print Roster Sheet
                    </button>
                    <button class="dr-btn dr-btn-primary" id="drBtnNewShift">
                        <i class="fas fa-plus-circle"></i> Schedule On-Call Duty
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="dr-kpi-grid">
                <div class="dr-kpi-card dr-kpi-blue">
                    <div class="dr-kpi-content">
                        <div class="dr-kpi-label">Active On-Call Today</div>
                        <div class="dr-kpi-val">${activeToday} <span class="dr-kpi-sub">Physicians</span></div>
                        <div class="dr-kpi-desc">Across all clinical departments</div>
                    </div>
                    <div class="dr-kpi-icon"><i class="fas fa-phone-alt"></i></div>
                </div>

                <div class="dr-kpi-card dr-kpi-emerald">
                    <div class="dr-kpi-content">
                        <div class="dr-kpi-label">Covered Departments</div>
                        <div class="dr-kpi-val">${coveredDepts} <span class="dr-kpi-sub">Units</span></div>
                        <div class="dr-kpi-desc">Cardiology, Surgery, Peds, ER, ICU</div>
                    </div>
                    <div class="dr-kpi-icon"><i class="fas fa-hospital-user"></i></div>
                </div>

                <div class="dr-kpi-card dr-kpi-purple">
                    <div class="dr-kpi-content">
                        <div class="dr-kpi-label">Month Total Shifts</div>
                        <div class="dr-kpi-val">${totalShifts} <span class="dr-kpi-sub">Shifts</span></div>
                        <div class="dr-kpi-desc">${monthName} Coverage</div>
                    </div>
                    <div class="dr-kpi-icon"><i class="fas fa-calendar-check"></i></div>
                </div>

                <div class="dr-kpi-card ${pendingSwaps > 0 ? 'dr-kpi-amber' : 'dr-kpi-gray'}">
                    <div class="dr-kpi-content">
                        <div class="dr-kpi-label">Pending Shift Swaps</div>
                        <div class="dr-kpi-val">${pendingSwaps} <span class="dr-kpi-sub">Requests</span></div>
                        <div class="dr-kpi-desc">Awaiting HOD approval</div>
                    </div>
                    <div class="dr-kpi-icon"><i class="fas fa-exchange-alt"></i></div>
                </div>
            </div>

            <!-- Navigation Tabs & Month Controls -->
            <div class="dr-controls-row">
                <div class="dr-tabs">
                    <button class="dr-tab-btn ${state.activeTab === 'calendar' ? 'active' : ''}" data-tab="calendar">
                        <i class="fas fa-calendar-alt"></i> Monthly Calendar Grid
                    </button>
                    <button class="dr-tab-btn ${state.activeTab === 'switchboard' ? 'active' : ''}" data-tab="switchboard">
                        <i class="fas fa-broadcast-tower"></i> Today's Paging Directory
                    </button>
                    <button class="dr-tab-btn ${state.activeTab === 'table' ? 'active' : ''}" data-tab="table">
                        <i class="fas fa-list"></i> Detailed Shift Table
                    </button>
                    <button class="dr-tab-btn ${state.activeTab === 'swaps' ? 'active' : ''}" data-tab="swaps">
                        <i class="fas fa-exchange-alt"></i> Shift Swaps ${pendingSwaps > 0 ? `<span class="dr-badge-count">${pendingSwaps}</span>` : ''}
                    </button>
                </div>

                <!-- Month Selector -->
                <div class="dr-month-stepper">
                    <button class="dr-step-btn" id="drBtnPrevMonth" title="Previous Month">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="dr-current-month-label" id="drCurrentMonthLabel">${monthName}</span>
                    <button class="dr-step-btn" id="drBtnNextMonth" title="Next Month">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button class="dr-step-btn dr-today-btn" id="drBtnToday">Today</button>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="dr-filter-bar">
                <div class="dr-filter-group">
                    <label><i class="fas fa-clinic-medical"></i> Department:</label>
                    <select id="drFilterDept" class="dr-select">
                        <option value="0">All Clinical Departments</option>
                        ${cache.departments.map(d => `<option value="${d.id}" ${state.departmentId == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join("")}
                    </select>
                </div>

                <div class="dr-filter-group">
                    <label><i class="fas fa-stethoscope"></i> Call Role:</label>
                    <select id="drFilterRole" class="dr-select">
                        <option value="">All Call Roles</option>
                        <option value="primary_on_call" ${state.roleFilter === 'primary_on_call' ? 'selected' : ''}>Primary On-Call</option>
                        <option value="secondary_on_call" ${state.roleFilter === 'secondary_on_call' ? 'selected' : ''}>Secondary On-Call</option>
                        <option value="er_backup" ${state.roleFilter === 'er_backup' ? 'selected' : ''}>ER Emergency Backup</option>
                        <option value="icu_consultant" ${state.roleFilter === 'icu_consultant' ? 'selected' : ''}>ICU Consultant</option>
                        <option value="rounding_physician" ${state.roleFilter === 'rounding_physician' ? 'selected' : ''}>Rounding Attending</option>
                    </select>
                </div>

                <div class="dr-filter-group">
                    <label><i class="fas fa-search"></i> Search Doctor:</label>
                    <input type="text" id="drSearchDoctor" class="dr-input" placeholder="Type name or specialty..." value="${escapeHtml(state.searchQuery)}">
                </div>

                <div class="dr-legend">
                    <span class="dr-legend-item"><span class="dr-dot dr-dot-primary"></span> Primary On-Call</span>
                    <span class="dr-legend-item"><span class="dr-dot dr-dot-sec"></span> Secondary Backup</span>
                    <span class="dr-legend-item"><span class="dr-dot dr-dot-er"></span> ER Backup</span>
                    <span class="dr-legend-item"><span class="dr-dot dr-dot-icu"></span> ICU Consultant</span>
                </div>
            </div>

            <!-- Tab Content Containers -->
            <div id="drTabCalendarContainer" class="dr-tab-panel ${state.activeTab === 'calendar' ? 'active' : ''}">
                ${renderCalendarGrid()}
            </div>

            <div id="drTabSwitchboardContainer" class="dr-tab-panel ${state.activeTab === 'switchboard' ? 'active' : ''}">
                ${renderSwitchboardDirectory()}
            </div>

            <div id="drTabTableContainer" class="dr-tab-panel ${state.activeTab === 'table' ? 'active' : ''}">
                ${renderDetailedTable()}
            </div>

            <div id="drTabSwapsContainer" class="dr-tab-panel ${state.activeTab === 'swaps' ? 'active' : ''}">
                ${renderSwapsList()}
            </div>
        </div>

        <!-- Schedule / Edit Shift Modal -->
        <div id="drModalSchedule" class="dr-modal-backdrop" style="display: none;">
            <div class="dr-modal-box">
                <div class="dr-modal-header">
                    <h3 id="drModalTitle"><i class="fas fa-calendar-plus"></i> Schedule Doctor On-Call Duty</h3>
                    <button class="dr-modal-close" id="drBtnCloseScheduleModal">&times;</button>
                </div>
                <form id="drFormSchedule" class="dr-form">
                    <input type="hidden" id="drShiftId" value="">
                    
                    <div class="dr-form-row">
                        <div class="dr-form-group">
                            <label>Clinical Department <span class="dr-req">*</span></label>
                            <select id="drFormDept" class="dr-select" required>
                                <option value="">Select Department...</option>
                                ${cache.departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("")}
                            </select>
                        </div>
                        <div class="dr-form-group">
                            <label>Physician / Doctor <span class="dr-req">*</span></label>
                            <select id="drFormDoctor" class="dr-select" required>
                                <option value="">Select Physician...</option>
                                ${cache.doctors.map(doc => `<option value="${doc.employee_id}">${escapeHtml(doc.full_name)} (${escapeHtml(doc.department_name || doc.specialty || 'Staff')})</option>`).join("")}
                            </select>
                        </div>
                    </div>

                    <div class="dr-form-row">
                        <div class="dr-form-group">
                            <label>Shift Date <span class="dr-req">*</span></label>
                            <input type="date" id="drFormDate" class="dr-input" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="dr-form-group">
                            <label>Call Role <span class="dr-req">*</span></label>
                            <select id="drFormRole" class="dr-select" required>
                                <option value="primary_on_call">Primary On-Call (1st Line)</option>
                                <option value="secondary_on_call">Secondary On-Call (Attending Backup)</option>
                                <option value="er_backup">ER Trauma / Emergency Backup</option>
                                <option value="icu_consultant">ICU Critical Care Consultant</option>
                                <option value="rounding_physician">Inpatient Rounding Physician</option>
                            </select>
                        </div>
                    </div>

                    <div class="dr-form-row">
                        <div class="dr-form-group">
                            <label>Shift Pattern</label>
                            <select id="drFormShiftType" class="dr-select">
                                <option value="full_day_24h">24-Hour Duty (08:00 - 08:00)</option>
                                <option value="morning">Morning Shift (07:00 - 15:00)</option>
                                <option value="evening">Evening Shift (15:00 - 23:00)</option>
                                <option value="night">Night Duty (17:00 / 23:00 - 08:00)</option>
                                <option value="custom">Custom Hours</option>
                            </select>
                        </div>
                        <div class="dr-form-group">
                            <div style="display: flex; gap: 8px;">
                                <div style="flex: 1;">
                                    <label>Start Time</label>
                                    <input type="time" id="drFormStartTime" class="dr-input" value="08:00">
                                </div>
                                <div style="flex: 1;">
                                    <label>End Time</label>
                                    <input type="time" id="drFormEndTime" class="dr-input" value="08:00">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dr-form-row">
                        <div class="dr-form-group">
                            <label>Contact Phone (Override)</label>
                            <input type="text" id="drFormPhone" class="dr-input" placeholder="e.g. +1-555-0199 or local ext">
                        </div>
                        <div class="dr-form-group">
                            <label>Pager Channel / Number</label>
                            <input type="text" id="drFormPager" class="dr-input" placeholder="e.g. PAGER-441">
                        </div>
                    </div>

                    <div class="dr-form-group">
                        <label>Paging Instructions &amp; Coverage Notes</label>
                        <textarea id="drFormNotes" class="dr-textarea" rows="2" placeholder="e.g. Page hospital switchboard first, then direct cell. Direct admission escalation."></textarea>
                    </div>

                    <div class="dr-modal-actions">
                        <button type="button" class="dr-btn dr-btn-outline" id="drBtnCancelSchedule">Cancel</button>
                        <button type="submit" class="dr-btn dr-btn-primary" id="drBtnSubmitSchedule">
                            <i class="fas fa-save"></i> Save Roster Assignment
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Shift Swap Request Modal -->
        <div id="drModalSwap" class="dr-modal-backdrop" style="display: none;">
            <div class="dr-modal-box">
                <div class="dr-modal-header">
                    <h3><i class="fas fa-exchange-alt"></i> Request Shift Swap / Coverage</h3>
                    <button class="dr-modal-close" id="drBtnCloseSwapModal">&times;</button>
                </div>
                <form id="drFormSwap" class="dr-form">
                    <input type="hidden" id="drSwapOriginalRosterId" value="">
                    
                    <div id="drSwapShiftSummary" class="dr-swap-summary"></div>

                    <div class="dr-form-group">
                        <label>Select Covering Physician <span class="dr-req">*</span></label>
                        <select id="drSwapTargetDoctor" class="dr-select" required>
                            <option value="">Select Covering Doctor...</option>
                            ${cache.doctors.map(doc => `<option value="${doc.employee_id}">${escapeHtml(doc.full_name)} (${escapeHtml(doc.department_name || doc.specialty || 'Physician')})</option>`).join("")}
                        </select>
                    </div>

                    <div class="dr-form-group">
                        <label>Clinical &amp; Operational Reason for Swap <span class="dr-req">*</span></label>
                        <textarea id="drSwapReason" class="dr-textarea" rows="3" required placeholder="e.g. Emergency surgical case overlap, mandatory CME seminar, illness, or mutual shift trade."></textarea>
                    </div>

                    <div class="dr-modal-actions">
                        <button type="button" class="dr-btn dr-btn-outline" id="drBtnCancelSwap">Cancel</button>
                        <button type="submit" class="dr-btn dr-btn-primary" id="drBtnSubmitSwap">
                            <i class="fas fa-paper-plane"></i> Submit Swap for Approval
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Printable Schedule Modal -->
        <div id="drModalPrint" class="dr-modal-backdrop" style="display: none;">
            <div class="dr-modal-box dr-modal-lg">
                <div class="dr-modal-header">
                    <h3><i class="fas fa-print"></i> Printable Department On-Call Roster</h3>
                    <div>
                        <button class="dr-btn dr-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Now</button>
                        <button class="dr-modal-close" id="drBtnClosePrintModal">&times;</button>
                    </div>
                </div>
                <div class="dr-printable-content" id="drPrintableContent">
                    <!-- Populated dynamically -->
                </div>
            </div>
        </div>
    `;

    attachEventHandlers();
}

/**
 * Render Interactive Monthly Calendar Grid
 */
function renderCalendarGrid() {
    const [year, month] = state.currentYearMonth.split("-").map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const grid = cache.calendarData?.calendar_grid || {};
    const todayStr = new Date().toISOString().split("T")[0];

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let html = `
        <div class="dr-calendar-wrap">
            <div class="dr-cal-weekdays">
                ${weekDays.map(w => `<div class="dr-cal-weekday">${w}</div>`).join("")}
            </div>
            <div class="dr-cal-days">
    `;

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        html += `
            <div class="dr-cal-day dr-cal-other-month">
                <span class="dr-day-num">${d}</span>
            </div>
        `;
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isToday = (dateStr === todayStr);
        let dayShifts = grid[d] || [];

        // Apply search query filter if typed
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            dayShifts = dayShifts.filter(s => 
                s.doctor_name.toLowerCase().includes(q) || 
                (s.department_name && s.department_name.toLowerCase().includes(q)) ||
                (s.specialty && s.specialty.toLowerCase().includes(q))
            );
        }

        html += `
            <div class="dr-cal-day ${isToday ? 'dr-cal-today' : ''}" data-date="${dateStr}">
                <div class="dr-day-header">
                    <span class="dr-day-num ${isToday ? 'dr-day-today-badge' : ''}">${d}</span>
                    <button class="dr-day-add-btn" data-date="${dateStr}" title="Add shift on ${dateStr}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="dr-day-shifts">
                    ${dayShifts.map(s => renderShiftPill(s)).join("")}
                </div>
            </div>
        `;
    }

    // Trailing days for next month
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `
            <div class="dr-cal-day dr-cal-other-month">
                <span class="dr-day-num">${i}</span>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render single shift pill inside calendar cell
 */
function renderShiftPill(shift) {
    const roleClassMap = {
        primary_on_call: "dr-pill-primary",
        secondary_on_call: "dr-pill-sec",
        er_backup: "dr-pill-er",
        icu_consultant: "dr-pill-icu",
        rounding_physician: "dr-pill-round"
    };

    const roleLabelMap = {
        primary_on_call: "Primary",
        secondary_on_call: "2nd Backup",
        er_backup: "ER Backup",
        icu_consultant: "ICU On-Call",
        rounding_physician: "Rounding"
    };

    const pillClass = roleClassMap[shift.call_role] || "dr-pill-primary";
    const roleLabel = roleLabelMap[shift.call_role] || shift.call_role;

    return `
        <div class="dr-shift-pill ${pillClass}" data-id="${shift.id}" title="${escapeHtml(shift.department_name)}: ${escapeHtml(shift.doctor_name)} (${roleLabel})\nHours: ${shift.start_time} - ${shift.end_time}\nPhone: ${escapeHtml(shift.contact_phone || 'None')}\nPager: ${escapeHtml(shift.pager_number || 'None')}">
            <div class="dr-pill-top">
                <span class="dr-pill-dept">${escapeHtml(shift.department_code || shift.department_name.substring(0, 4))}</span>
                <span class="dr-pill-role">${roleLabel}</span>
            </div>
            <div class="dr-pill-doctor">${escapeHtml(shift.doctor_name)}</div>
            <div class="dr-pill-time"><i class="far fa-clock"></i> ${shift.start_time}-${shift.end_time}</div>
        </div>
    `;
}

/**
 * Render Hospital Emergency Switchboard Paging Directory (Today)
 */
function renderSwitchboardDirectory() {
    const dir = cache.switchboardData?.directory || [];
    const dateStr = cache.switchboardData?.date || new Date().toISOString().split("T")[0];

    if (dir.length === 0) {
        return `
            <div class="dr-empty-state">
                <i class="fas fa-phone-slash" style="font-size: 36px; color: #94a3b8; margin-bottom: 12px;"></i>
                <h3>No On-Call Physicians Scheduled for Today (${dateStr})</h3>
                <p>Use the "Schedule On-Call Duty" button to assign primary and ER backup doctors.</p>
            </div>
        `;
    }

    return `
        <div class="dr-switchboard-container">
            <div class="dr-switchboard-banner">
                <div class="dr-sb-title">
                    <i class="fas fa-broadcast-tower" style="color: #dc2626;"></i>
                    <span>Hospital Emergency Switchboard &amp; Code Paging Directory</span>
                </div>
                <div class="dr-sb-meta">
                    <span><strong>Effective Date:</strong> ${dateStr}</span>
                    <span><strong>Real-time Status:</strong> <span class="dr-status-live"><span class="dr-live-pulse"></span> ACTIVE DUTY</span></span>
                </div>
            </div>

            <div class="dr-sb-grid">
                ${dir.map(dept => `
                    <div class="dr-sb-card">
                        <div class="dr-sb-card-header">
                            <div>
                                <span class="dr-sb-badge">${escapeHtml(dept.department_code || 'DEPT')}</span>
                                <h3 class="dr-sb-dept-name">${escapeHtml(dept.department_name)}</h3>
                            </div>
                            <span class="dr-sb-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(dept.location || 'Hospital Main')}</span>
                        </div>

                        <div class="dr-sb-rosters-list">
                            ${dept.rosters.map(r => `
                                <div class="dr-sb-doctor-item dr-sb-role-${r.call_role}">
                                    <div class="dr-sb-role-tag">
                                        ${formatCallRoleBadge(r.call_role)}
                                        <span class="dr-sb-hours"><i class="far fa-clock"></i> ${r.start_time} - ${r.end_time}</span>
                                    </div>
                                    <div class="dr-sb-doc-name">${escapeHtml(r.doctor_name)}</div>
                                    <div class="dr-sb-doc-spec">${escapeHtml(r.specialty || 'Attending Staff')}</div>
                                    
                                    <div class="dr-sb-contact-row">
                                        <div class="dr-sb-contact">
                                            <i class="fas fa-phone"></i>
                                            <a href="tel:${escapeHtml(r.contact_phone)}">${escapeHtml(r.contact_phone)}</a>
                                        </div>
                                        <div class="dr-sb-contact dr-sb-pager">
                                            <i class="fas fa-pager"></i>
                                            <span>${escapeHtml(r.pager_number)}</span>
                                        </div>
                                    </div>

                                    ${r.notes ? `<div class="dr-sb-notes"><i class="fas fa-info-circle"></i> ${escapeHtml(r.notes)}</div>` : ''}

                                    <div class="dr-sb-actions">
                                        <button class="dr-btn dr-btn-xs dr-btn-outline dr-btn-swap" data-id="${r.id}" data-doc="${escapeHtml(r.doctor_name)}" data-dept="${escapeHtml(r.department_name)}" data-role="${r.call_role}" data-date="${r.shift_date}">
                                            <i class="fas fa-exchange-alt"></i> Request Swap
                                        </button>
                                        <button class="dr-btn dr-btn-xs dr-btn-primary" onclick="alert('Calling ${escapeHtml(r.doctor_name)} at ${escapeHtml(r.contact_phone)} / Paging ${escapeHtml(r.pager_number)}...')">
                                            <i class="fas fa-bell"></i> Page Doctor
                                        </button>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

/**
 * Render Detailed Table View
 */
function renderDetailedTable() {
    let shifts = cache.calendarData?.shifts || [];

    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        shifts = shifts.filter(s => 
            s.doctor_name.toLowerCase().includes(q) || 
            s.department_name.toLowerCase().includes(q) ||
            (s.specialty && s.specialty.toLowerCase().includes(q)) ||
            s.roster_code.toLowerCase().includes(q)
        );
    }

    if (shifts.length === 0) {
        return `<div class="dr-empty-state"><i class="fas fa-folder-open"></i><h3>No duty shifts match current criteria.</h3></div>`;
    }

    return `
        <div class="dr-table-container">
            <table class="dr-table">
                <thead>
                    <tr>
                        <th>Roster Code</th>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Doctor</th>
                        <th>Call Role</th>
                        <th>Shift Hours</th>
                        <th>Contact / Pager</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${shifts.map(s => `
                        <tr>
                            <td><span class="dr-code-badge">${escapeHtml(s.roster_code)}</span></td>
                            <td><strong>${s.shift_date}</strong></td>
                            <td><span class="dr-badge dr-badge-dept">${escapeHtml(s.department_name)}</span></td>
                            <td>
                                <div class="dr-doc-cell">
                                    <div class="dr-doc-name">${escapeHtml(s.doctor_name)}</div>
                                    <div class="dr-doc-spec">${escapeHtml(s.specialty || 'General')}</div>
                                </div>
                            </td>
                            <td>${formatCallRoleBadge(s.call_role)}</td>
                            <td><i class="far fa-clock"></i> ${s.start_time} - ${s.end_time}</td>
                            <td>
                                <div class="dr-contact-cell">
                                    <div><i class="fas fa-phone-alt"></i> ${escapeHtml(s.contact_phone || 'None')}</div>
                                    <div class="dr-pager-text"><i class="fas fa-pager"></i> ${escapeHtml(s.pager_number || 'None')}</div>
                                </div>
                            </td>
                            <td><span class="dr-status-badge dr-status-${s.status}">${s.status.toUpperCase()}</span></td>
                            <td>
                                <div class="dr-table-actions">
                                    <button class="dr-btn-icon dr-btn-swap" data-id="${s.id}" data-doc="${escapeHtml(s.doctor_name)}" data-dept="${escapeHtml(s.department_name)}" data-role="${s.call_role}" data-date="${s.shift_date}" title="Request Shift Swap">
                                        <i class="fas fa-exchange-alt"></i>
                                    </button>
                                    <button class="dr-btn-icon dr-btn-edit" data-id="${s.id}" title="Edit Assignment">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="dr-btn-icon dr-btn-del" data-id="${s.id}" title="Cancel Duty Shift">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render Shift Swaps Tab
 */
function renderSwapsList() {
    const swaps = cache.swapsData || [];

    if (swaps.length === 0) {
        return `
            <div class="dr-empty-state">
                <i class="fas fa-exchange-alt" style="font-size: 36px; color: #94a3b8; margin-bottom: 12px;"></i>
                <h3>No Shift Swap Requests</h3>
                <p>Physicians can request shift coverage trades from any calendar shift pill or switchboard card.</p>
            </div>
        `;
    }

    return `
        <div class="dr-swaps-container">
            <table class="dr-table">
                <thead>
                    <tr>
                        <th>Swap Code</th>
                        <th>Roster Ref</th>
                        <th>Shift Date</th>
                        <th>Department</th>
                        <th>Requesting Doctor</th>
                        <th>Covering Physician</th>
                        <th>Clinical Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${swaps.map(sw => `
                        <tr>
                            <td><span class="dr-code-badge">${escapeHtml(sw.swap_code)}</span></td>
                            <td>${escapeHtml(sw.roster_code)}</td>
                            <td><strong>${sw.shift_date}</strong> (${formatCallRoleBadge(sw.call_role)})</td>
                            <td>${escapeHtml(sw.department_name)}</td>
                            <td><span style="font-weight: 600; color: #dc2626;">${escapeHtml(sw.requesting_doctor)}</span></td>
                            <td><span style="font-weight: 600; color: #059669;">${escapeHtml(sw.target_doctor)}</span></td>
                            <td style="max-width: 250px;">${escapeHtml(sw.reason)}</td>
                            <td><span class="dr-status-badge dr-status-${sw.status}">${sw.status.toUpperCase()}</span></td>
                            <td>
                                ${sw.status === 'pending_approval' ? `
                                    <div style="display: flex; gap: 6px;">
                                        <button class="dr-btn dr-btn-xs dr-btn-success dr-btn-approve-swap" data-id="${sw.id}">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="dr-btn dr-btn-xs dr-btn-danger dr-btn-reject-swap" data-id="${sw.id}">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    </div>
                                ` : `
                                    <span style="font-size: 0.75rem; color: #64748b;">Actioned ${sw.actioned_at || ''}</span>
                                `}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function formatCallRoleBadge(role) {
    switch (role) {
        case "primary_on_call":
            return `<span class="dr-role-badge dr-rb-primary"><i class="fas fa-shield-alt"></i> Primary On-Call</span>`;
        case "secondary_on_call":
            return `<span class="dr-role-badge dr-rb-sec"><i class="fas fa-user-friends"></i> Secondary Backup</span>`;
        case "er_backup":
            return `<span class="dr-role-badge dr-rb-er"><i class="fas fa-ambulance"></i> ER Emergency Backup</span>`;
        case "icu_consultant":
            return `<span class="dr-role-badge dr-rb-icu"><i class="fas fa-heartbeat"></i> ICU Consultant</span>`;
        case "rounding_physician":
            return `<span class="dr-role-badge dr-rb-round"><i class="fas fa-walking"></i> Rounding Attending</span>`;
        default:
            return `<span class="dr-role-badge">${role}</span>`;
    }
}

/**
 * Event Handlers Wiring
 */
function attachEventHandlers() {
    // Tab switching
    document.querySelectorAll(".dr-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.dataset.tab;
            renderModule();
        });
    });

    // Month Navigation
    const [y, m] = state.currentYearMonth.split("-").map(Number);
    document.getElementById("drBtnPrevMonth")?.addEventListener("click", () => {
        const d = new Date(y, m - 2, 1);
        state.currentYearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        refreshCalendar();
    });

    document.getElementById("drBtnNextMonth")?.addEventListener("click", () => {
        const d = new Date(y, m, 1);
        state.currentYearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        refreshCalendar();
    });

    document.getElementById("drBtnToday")?.addEventListener("click", () => {
        state.currentYearMonth = getCurrentYearMonth();
        refreshCalendar();
    });

    // Filters
    document.getElementById("drFilterDept")?.addEventListener("change", (e) => {
        state.departmentId = parseInt(e.target.value, 10) || 0;
        refreshCalendar();
    });

    document.getElementById("drFilterRole")?.addEventListener("change", (e) => {
        state.roleFilter = e.target.value;
        refreshCalendar();
    });

    document.getElementById("drSearchDoctor")?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        if (state.activeTab === "calendar") {
            const container = document.getElementById("drTabCalendarContainer");
            if (container) container.innerHTML = renderCalendarGrid();
            attachPillHandlers();
        } else if (state.activeTab === "table") {
            const container = document.getElementById("drTabTableContainer");
            if (container) container.innerHTML = renderDetailedTable();
            attachTableHandlers();
        }
    });

    // Top action buttons
    document.getElementById("drBtnNewShift")?.addEventListener("click", () => {
        openScheduleModal();
    });

    document.getElementById("drBtnPrintRoster")?.addEventListener("click", () => {
        openPrintModal();
    });

    // Day "+" click
    document.querySelectorAll(".dr-day-add-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const date = btn.dataset.date;
            openScheduleModal(null, date);
        });
    });

    // Schedule Modal Close
    document.getElementById("drBtnCloseScheduleModal")?.addEventListener("click", closeScheduleModal);
    document.getElementById("drBtnCancelSchedule")?.addEventListener("click", closeScheduleModal);

    // Schedule Form Submit
    document.getElementById("drFormSchedule")?.addEventListener("submit", handleScheduleSubmit);

    // Shift pattern changes
    document.getElementById("drFormShiftType")?.addEventListener("change", (e) => {
        const val = e.target.value;
        const startInput = document.getElementById("drFormStartTime");
        const endInput = document.getElementById("drFormEndTime");
        if (!startInput || !endInput) return;

        if (val === "full_day_24h") {
            startInput.value = "08:00";
            endInput.value = "08:00";
        } else if (val === "morning") {
            startInput.value = "07:00";
            endInput.value = "15:00";
        } else if (val === "evening") {
            startInput.value = "15:00";
            endInput.value = "23:00";
        } else if (val === "night") {
            startInput.value = "23:00";
            endInput.value = "07:00";
        }
    });

    // Swap Modal Close
    document.getElementById("drBtnCloseSwapModal")?.addEventListener("click", closeSwapModal);
    document.getElementById("drBtnCancelSwap")?.addEventListener("click", closeSwapModal);
    document.getElementById("drFormSwap")?.addEventListener("submit", handleSwapSubmit);

    // Print Modal Close
    document.getElementById("drBtnClosePrintModal")?.addEventListener("click", () => {
        const m = document.getElementById("drModalPrint");
        if (m) m.style.display = "none";
    });

    attachPillHandlers();
    attachTableHandlers();
    attachSwapHandlers();
}

function attachPillHandlers() {
    document.querySelectorAll(".dr-shift-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const id = parseInt(pill.dataset.id, 10);
            const shift = (cache.calendarData?.shifts || []).find(s => s.id === id);
            if (shift) {
                openScheduleModal(shift);
            }
        });
    });
}

function attachTableHandlers() {
    document.querySelectorAll(".dr-btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            const shift = (cache.calendarData?.shifts || []).find(s => s.id === id);
            if (shift) openScheduleModal(shift);
        });
    });

    document.querySelectorAll(".dr-btn-del").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            if (confirm("Are you sure you want to cancel and remove this duty assignment?")) {
                try {
                    await api(`/duty-rosters/delete`, { method: "POST", body: { id } });
                    alert("Duty assignment removed.");
                    await refreshCalendar();
                } catch (err) {
                    alert("Failed to delete assignment: " + (err.message || err));
                }
            }
        });
    });

    document.querySelectorAll(".dr-btn-swap").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            const doc = btn.dataset.doc;
            const dept = btn.dataset.dept;
            const role = btn.dataset.role;
            const date = btn.dataset.date;
            openSwapModal({ id, doctor_name: doc, department_name: dept, call_role: role, shift_date: date });
        });
    });
}

function attachSwapHandlers() {
    document.querySelectorAll(".dr-btn-approve-swap").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Approve this shift swap? The roster calendar will be updated automatically.")) {
                try {
                    await api(`/duty-rosters/swaps/${id}/approve`, { method: "POST" });
                    alert("Shift swap approved and roster updated successfully.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to approve swap: " + (err.message || err));
                }
            }
        });
    });

    document.querySelectorAll(".dr-btn-reject-swap").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const reason = prompt("Enter reason for rejecting shift swap request:");
            if (reason) {
                try {
                    await api(`/duty-rosters/swaps/${id}/reject`, { method: "POST", body: { rejection_reason: reason } });
                    alert("Shift swap rejected.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to reject swap: " + (err.message || err));
                }
            }
        });
    });
}

async function refreshCalendar() {
    try {
        const calRes = await api(`/duty-rosters/calendar?month=${state.currentYearMonth}&department_id=${state.departmentId}&role=${state.roleFilter}&status=${state.statusFilter}`);
        cache.calendarData = calRes?.data || { total_shifts: 0, stats: {}, calendar_grid: {}, shifts: [] };
        renderModule();
    } catch (err) {
        console.error("Refresh calendar failed:", err);
    }
}

function openScheduleModal(shift = null, defaultDate = null) {
    const modal = document.getElementById("drModalSchedule");
    if (!modal) return;

    document.getElementById("drShiftId").value = shift ? shift.id : "";
    document.getElementById("drModalTitle").innerHTML = shift ?
        `<i class="fas fa-edit"></i> Edit On-Call Assignment #${shift.roster_code}` :
        `<i class="fas fa-calendar-plus"></i> Schedule Doctor On-Call Duty`;

    if (shift) {
        document.getElementById("drFormDept").value = shift.department_id;
        document.getElementById("drFormDoctor").value = shift.employee_id;
        document.getElementById("drFormDate").value = shift.shift_date;
        document.getElementById("drFormRole").value = shift.call_role;
        document.getElementById("drFormShiftType").value = shift.shift_type;
        document.getElementById("drFormStartTime").value = shift.start_time;
        document.getElementById("drFormEndTime").value = shift.end_time;
        document.getElementById("drFormPhone").value = shift.contact_phone || "";
        document.getElementById("drFormPager").value = shift.pager_number || "";
        document.getElementById("drFormNotes").value = shift.notes || "";
    } else {
        document.getElementById("drFormSchedule").reset();
        if (defaultDate) {
            document.getElementById("drFormDate").value = defaultDate;
        }
        if (state.departmentId > 0) {
            document.getElementById("drFormDept").value = state.departmentId;
        }
    }

    modal.style.display = "flex";
}

function closeScheduleModal() {
    const modal = document.getElementById("drModalSchedule");
    if (modal) modal.style.display = "none";
}

async function handleScheduleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("drShiftId").value;
    const payload = {
        department_id: document.getElementById("drFormDept").value,
        employee_id: document.getElementById("drFormDoctor").value,
        shift_date: document.getElementById("drFormDate").value,
        call_role: document.getElementById("drFormRole").value,
        shift_type: document.getElementById("drFormShiftType").value,
        start_time: document.getElementById("drFormStartTime").value,
        end_time: document.getElementById("drFormEndTime").value,
        contact_override_phone: document.getElementById("drFormPhone").value,
        pager_number: document.getElementById("drFormPager").value,
        notes: document.getElementById("drFormNotes").value
    };

    try {
        if (id) {
            payload.id = id;
            await api(`/duty-rosters/update`, { method: "POST", body: payload });
            alert("Duty roster assignment updated.");
        } else {
            await api(`/duty-rosters`, { method: "POST", body: payload });
            alert("New duty roster assignment scheduled.");
        }
        closeScheduleModal();
        await loadInitialData();
    } catch (err) {
        alert("Failed to save duty roster: " + (err.message || err));
    }
}

function openSwapModal(shift) {
    const modal = document.getElementById("drModalSwap");
    if (!modal) return;

    document.getElementById("drSwapOriginalRosterId").value = shift.id;
    document.getElementById("drSwapShiftSummary").innerHTML = `
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Duty Shift to Trade:</div>
        <div><strong>Date:</strong> ${shift.shift_date}</div>
        <div><strong>Department:</strong> ${escapeHtml(shift.department_name)}</div>
        <div><strong>Scheduled Physician:</strong> ${escapeHtml(shift.doctor_name)}</div>
        <div><strong>Call Role:</strong> ${shift.call_role}</div>
    `;

    document.getElementById("drFormSwap").reset();
    modal.style.display = "flex";
}

function closeSwapModal() {
    const modal = document.getElementById("drModalSwap");
    if (modal) modal.style.display = "none";
}

async function handleSwapSubmit(e) {
    e.preventDefault();

    const originalRosterId = document.getElementById("drSwapOriginalRosterId").value;
    const targetEmployeeId = document.getElementById("drSwapTargetDoctor").value;
    const reason = document.getElementById("drSwapReason").value;

    try {
        await api(`/duty-rosters/swaps`, {
            method: "POST",
            body: {
                original_roster_id: originalRosterId,
                target_employee_id: targetEmployeeId,
                reason: reason
            }
        });

        alert("Shift swap request submitted for department head approval.");
        closeSwapModal();
        await loadInitialData();
    } catch (err) {
        alert("Failed to submit shift swap: " + (err.message || err));
    }
}

function openPrintModal() {
    const modal = document.getElementById("drModalPrint");
    const container = document.getElementById("drPrintableContent");
    if (!modal || !container) return;

    const [year, month] = state.currentYearMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const shifts = cache.calendarData?.shifts || [];

    container.innerHTML = `
        <div class="dr-print-sheet">
            <div class="dr-print-header">
                <h2>USINTELLIX HOSPITAL SYSTEM &bull; CLINICAL ON-CALL ROSTER</h2>
                <div class="dr-print-sub">Official Department Duty Schedule &bull; ${monthName}</div>
                <div style="font-size: 0.8125rem; color: #64748b;">Printed on: ${new Date().toLocaleString()} &bull; Hospital Switchboard Paging Protocol</div>
            </div>

            <table class="dr-print-table">
                <thead>
                    <tr>
                        <th style="width: 100px;">Date</th>
                        <th style="width: 150px;">Department</th>
                        <th style="width: 160px;">Call Role</th>
                        <th>On-Call Physician</th>
                        <th style="width: 110px;">Shift Hours</th>
                        <th style="width: 130px;">Contact Phone</th>
                        <th style="width: 110px;">Pager</th>
                    </tr>
                </thead>
                <tbody>
                    ${shifts.map(s => `
                        <tr>
                            <td><strong>${s.shift_date}</strong></td>
                            <td>${escapeHtml(s.department_name)}</td>
                            <td>${s.call_role.replace(/_/g, ' ').toUpperCase()}</td>
                            <td><strong>${escapeHtml(s.doctor_name)}</strong> (${escapeHtml(s.specialty || 'Attending')})</td>
                            <td>${s.start_time} - ${s.end_time}</td>
                            <td>${escapeHtml(s.contact_phone || 'Hospital Switchboard')}</td>
                            <td>${escapeHtml(s.pager_number || 'N/A')}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="dr-print-signatures">
                <div class="dr-sig-line">
                    <div class="dr-line"></div>
                    <div>Prepared by Department Secretary</div>
                </div>
                <div class="dr-sig-line">
                    <div class="dr-line"></div>
                    <div>Chief Medical Officer / HOD Approval</div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function ensureCss() {
    if (document.getElementById("drRostersStyles")) return;

    const style = document.createElement("style");
    style.id = "drRostersStyles";
    style.textContent = `
        .dr-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .dr-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .dr-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .dr-title-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: rgba(2, 132, 199, 0.12);
            color: #0284c7;
            font-size: 22px;
        }

        .dr-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
        }

        .dr-subtitle {
            margin: 4px 0 0 0;
            font-size: 0.875rem;
            color: #64748b;
        }

        .dr-header-actions {
            display: flex;
            gap: 12px;
        }

        /* Buttons */
        .dr-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .dr-btn-primary {
            background: #0284c7;
            color: #ffffff;
        }
        .dr-btn-primary:hover {
            background: #0369a1;
        }

        .dr-btn-outline {
            background: #ffffff;
            color: #334155;
            border: 1px solid #cbd5e1;
        }
        .dr-btn-outline:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }

        .dr-btn-xs {
            padding: 4px 8px;
            font-size: 0.75rem;
        }

        .dr-btn-success {
            background: #059669;
            color: #ffffff;
        }
        .dr-btn-danger {
            background: #dc2626;
            color: #ffffff;
        }

        .dr-btn-icon {
            background: transparent;
            border: none;
            cursor: pointer;
            color: #64748b;
            padding: 6px;
            border-radius: 4px;
        }
        .dr-btn-icon:hover {
            background: #f1f5f9;
            color: #0284c7;
        }

        /* KPI Grid */
        .dr-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .dr-kpi-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            border-left: 4px solid #cbd5e1;
        }

        .dr-kpi-blue { border-left-color: #0284c7; }
        .dr-kpi-emerald { border-left-color: #059669; }
        .dr-kpi-purple { border-left-color: #7c3aed; }
        .dr-kpi-amber { border-left-color: #d97706; }

        .dr-kpi-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 600;
        }

        .dr-kpi-val {
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            margin: 4px 0;
        }

        .dr-kpi-sub {
            font-size: 0.875rem;
            font-weight: 500;
            color: #64748b;
        }

        .dr-kpi-desc {
            font-size: 0.75rem;
            color: #94a3b8;
        }

        .dr-kpi-icon {
            font-size: 24px;
            opacity: 0.3;
        }

        /* Controls row & tabs */
        .dr-controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 16px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }

        .dr-tabs {
            display: flex;
            gap: 8px;
        }

        .dr-tab-btn {
            background: transparent;
            border: none;
            padding: 10px 16px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.15s ease;
        }

        .dr-tab-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
        }

        .dr-tab-btn.active {
            color: #0284c7;
            background: rgba(2, 132, 199, 0.1);
        }

        .dr-badge-count {
            background: #d97706;
            color: #ffffff;
            font-size: 0.6875rem;
            padding: 2px 6px;
            border-radius: 999px;
            font-weight: 700;
        }

        /* Month Stepper */
        .dr-month-stepper {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 4px 8px;
        }

        .dr-step-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
            color: #475569;
            border-radius: 4px;
        }
        .dr-step-btn:hover {
            background: #f1f5f9;
            color: #0284c7;
        }

        .dr-current-month-label {
            font-weight: 700;
            font-size: 0.875rem;
            min-width: 130px;
            text-align: center;
        }

        .dr-today-btn {
            font-size: 0.75rem;
            font-weight: 600;
            background: #f1f5f9;
        }

        /* Filter bar */
        .dr-filter-bar {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            background: #ffffff;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }

        .dr-filter-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .dr-filter-group label {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #475569;
            white-space: nowrap;
        }

        .dr-select, .dr-input {
            padding: 6px 10px;
            font-size: 0.8125rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #0f172a;
        }

        .dr-legend {
            margin-left: auto;
            display: flex;
            gap: 12px;
            font-size: 0.75rem;
            color: #64748b;
        }

        .dr-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .dr-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .dr-dot-primary { background: #059669; }
        .dr-dot-sec { background: #0284c7; }
        .dr-dot-er { background: #d97706; }
        .dr-dot-icu { background: #7c3aed; }

        /* Panels */
        .dr-tab-panel {
            display: none;
        }
        .dr-tab-panel.active {
            display: block;
        }

        /* Calendar Grid */
        .dr-calendar-wrap {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .dr-cal-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        .dr-cal-weekday {
            padding: 10px;
            text-align: center;
            font-size: 0.8125rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .dr-cal-days {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
            background: #e2e8f0;
        }

        .dr-cal-day {
            background: #ffffff;
            min-height: 120px;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: background 0.15s ease;
        }

        .dr-cal-day:hover {
            background: #fafafa;
        }

        .dr-cal-other-month {
            background: #f8fafc;
            opacity: 0.45;
        }

        .dr-cal-today {
            background: #f0fdf4 !important;
            border: 2px solid #22c55e !important;
        }

        .dr-day-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .dr-day-num {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #334155;
        }

        .dr-day-today-badge {
            background: #16a34a;
            color: #ffffff;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .dr-day-add-btn {
            opacity: 0;
            background: transparent;
            border: none;
            color: #0284c7;
            cursor: pointer;
            font-size: 0.75rem;
            padding: 2px 4px;
            border-radius: 4px;
            transition: opacity 0.15s ease;
        }

        .dr-cal-day:hover .dr-day-add-btn {
            opacity: 1;
        }

        .dr-day-shifts {
            display: flex;
            flex-direction: column;
            gap: 4px;
            overflow-y: auto;
            max-height: 140px;
        }

        /* Shift Pills */
        .dr-shift-pill {
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 0.6875rem;
            cursor: pointer;
            border-left: 3px solid transparent;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .dr-shift-pill:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .dr-pill-primary {
            background: #ecfdf5;
            color: #065f46;
            border-left-color: #059669;
        }

        .dr-pill-sec {
            background: #f0f9ff;
            color: #0369a1;
            border-left-color: #0284c7;
        }

        .dr-pill-er {
            background: #fffbeb;
            color: #92400e;
            border-left-color: #d97706;
        }

        .dr-pill-icu {
            background: #f5f3ff;
            color: #5b21b6;
            border-left-color: #7c3aed;
        }

        .dr-pill-round {
            background: #f8fafc;
            color: #334155;
            border-left-color: #64748b;
        }

        .dr-pill-top {
            display: flex;
            justify-content: space-between;
            font-weight: 700;
            font-size: 0.625rem;
            text-transform: uppercase;
        }

        .dr-pill-doctor {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 1px 0;
        }

        .dr-pill-time {
            font-size: 0.5625rem;
            opacity: 0.85;
        }

        /* Switchboard Directory */
        .dr-switchboard-banner {
            background: #ffffff;
            border: 1px solid #fee2e2;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            padding: 14px 20px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }

        .dr-sb-title {
            font-size: 1.125rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #0f172a;
        }

        .dr-status-live {
            background: #fef2f2;
            color: #dc2626;
            padding: 4px 8px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.75rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .dr-live-pulse {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #dc2626;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }

        .dr-sb-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 20px;
        }

        .dr-sb-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .dr-sb-card-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .dr-sb-badge {
            background: rgba(2, 132, 199, 0.12);
            color: #0284c7;
            font-size: 0.6875rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .dr-sb-dept-name {
            margin: 4px 0 0 0;
            font-size: 1rem;
            font-weight: 700;
            color: #0f172a;
        }

        .dr-sb-loc {
            font-size: 0.75rem;
            color: #64748b;
        }

        .dr-sb-rosters-list {
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .dr-sb-doctor-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            background: #fafafa;
        }

        .dr-sb-role-primary_on_call { border-left: 4px solid #059669; }
        .dr-sb-role-secondary_on_call { border-left: 4px solid #0284c7; }
        .dr-sb-role-er_backup { border-left: 4px solid #d97706; }
        .dr-sb-role-icu_consultant { border-left: 4px solid #7c3aed; }

        .dr-sb-role-tag {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .dr-sb-hours {
            font-size: 0.6875rem;
            color: #64748b;
        }

        .dr-sb-doc-name {
            font-weight: 700;
            font-size: 0.9375rem;
            color: #0f172a;
        }

        .dr-sb-doc-spec {
            font-size: 0.8125rem;
            color: #64748b;
            margin-bottom: 8px;
        }

        .dr-sb-contact-row {
            display: flex;
            gap: 16px;
            margin-bottom: 8px;
            font-size: 0.8125rem;
        }

        .dr-sb-contact {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #0284c7;
            font-weight: 600;
        }

        .dr-sb-contact a {
            color: #0284c7;
            text-decoration: none;
        }
        .dr-sb-contact a:hover {
            text-decoration: underline;
        }

        .dr-sb-pager {
            color: #475569;
        }

        .dr-sb-notes {
            font-size: 0.75rem;
            color: #64748b;
            background: #f1f5f9;
            padding: 6px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .dr-sb-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        /* Tables */
        .dr-table-container {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .dr-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
        }

        .dr-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
        }

        .dr-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .dr-table tr:hover td {
            background: #fafafa;
        }

        .dr-code-badge {
            font-family: monospace;
            font-weight: 700;
            color: #0284c7;
            background: rgba(2, 132, 199, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
        }

        .dr-role-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 999px;
        }

        .dr-rb-primary { background: #ecfdf5; color: #065f46; }
        .dr-rb-sec { background: #f0f9ff; color: #0369a1; }
        .dr-rb-er { background: #fffbeb; color: #92400e; }
        .dr-rb-icu { background: #f5f3ff; color: #5b21b6; }
        .dr-rb-round { background: #f1f5f9; color: #334155; }

        .dr-status-badge {
            font-size: 0.6875rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .dr-status-confirmed, .dr-status-scheduled { background: #ecfdf5; color: #059669; }
        .dr-status-active { background: #eff6ff; color: #1d4ed8; }
        .dr-status-pending_approval { background: #fffbeb; color: #d97706; }
        .dr-status-approved { background: #ecfdf5; color: #059669; }
        .dr-status-rejected, .dr-status-cancelled { background: #fef2f2; color: #dc2626; }

        /* Modals */
        .dr-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(2px);
        }

        .dr-modal-box {
            background: #ffffff;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
        }

        .dr-modal-lg {
            max-width: 900px;
        }

        .dr-modal-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .dr-modal-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .dr-modal-close {
            background: transparent;
            border: none;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            color: #64748b;
        }

        .dr-form {
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dr-form-row {
            display: flex;
            gap: 16px;
        }

        .dr-form-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .dr-form-group label {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #334155;
        }

        .dr-req { color: #dc2626; }

        .dr-textarea {
            padding: 8px 10px;
            font-size: 0.8125rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #0f172a;
            font-family: inherit;
        }

        .dr-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 10px;
        }

        .dr-swap-summary {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 12px;
            font-size: 0.8125rem;
            line-height: 1.5;
        }

        /* Printable Sheet */
        .dr-printable-content {
            padding: 24px;
            overflow-y: auto;
        }

        .dr-print-sheet {
            background: #ffffff;
            color: #000000;
        }

        .dr-print-header {
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #000000;
            padding-bottom: 12px;
        }

        .dr-print-header h2 { margin: 0; font-size: 1.25rem; letter-spacing: 0.05em; }
        .dr-print-sub { font-size: 1rem; font-weight: 700; margin-top: 4px; }

        .dr-print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
        }

        .dr-print-table th, .dr-print-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
        }

        .dr-print-table th { background: #f1f5f9; font-weight: 700; }

        .dr-print-signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 48px;
        }

        .dr-sig-line {
            text-align: center;
            font-size: 0.75rem;
            font-weight: 600;
            width: 200px;
        }

        .dr-line {
            border-bottom: 1px solid #000000;
            margin-bottom: 6px;
        }

        .dr-empty-state {
            padding: 48px 20px;
            text-align: center;
            color: #64748b;
            background: #ffffff;
            border-radius: 10px;
            border: 1px dashed #cbd5e1;
        }

        @media print {
            body * {
                visibility: hidden;
            }
            #drModalPrint, #drModalPrint * {
                visibility: visible;
            }
            #drModalPrint {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: #ffffff;
            }
            .dr-modal-header {
                display: none;
            }
        }
    `;

    document.head.appendChild(style);
}
