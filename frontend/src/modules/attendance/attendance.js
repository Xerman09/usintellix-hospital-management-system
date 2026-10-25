/**
 * Staff Attendance Time Clock & Hours Calculation Module
 * Schema: hr_attendance_logs, hr_overtime_requests
 */

import { api } from "../../core/api.js?v=10";

// Module State
let state = {
    activeTab: "timesheet", // 'timesheet' | 'console' | 'overtime'
    startDate: getFirstDayOfMonth(),
    endDate: getTodayDate(),
    departmentId: 0,
    employeeId: 0,
    statusFilter: "",
    overtimeOnly: false,
    searchQuery: "",
    page: 1,
    perPage: 25,
    selectedConsoleEmployeeId: 101, // Default selected for punch console
    clockTimerInterval: null
};

let cache = {
    logsData: null,
    staffList: [],
    consoleStatus: null
};

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function getFirstDayOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function AttendanceView() {
    return `<div class="att-root" id="attendanceRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Staff Attendance &amp; Time Clock...</div>
        </div>
    </div>`;
}

export async function initAttendance() {
    ensureCss();
    await loadInitialData();
    startLiveClock();
}

async function loadInitialData() {
    const root = document.getElementById("attendanceRoot");
    if (!root) return;

    try {
        const [staffRes, logsRes, statusRes] = await Promise.all([
            api(`/attendance/staff`).catch(() => null),
            api(`/attendance/logs?start_date=${state.startDate}&end_date=${state.endDate}&department_id=${state.departmentId}&employee_id=${state.employeeId}&status=${state.statusFilter}&overtime_only=${state.overtimeOnly ? '1' : ''}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/attendance/status?employee_id=${state.selectedConsoleEmployeeId}`).catch(() => null)
        ]);

        cache.staffList = staffRes?.data || [];
        cache.logsData = logsRes?.data || { total: 0, records: [], metrics: {} };
        cache.consoleStatus = statusRes?.data || { is_clocked_in: false, current_punch: null, elapsed_seconds: 0, today_stats: {} };

        renderModule();
    } catch (err) {
        console.error("Failed to load attendance data:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load Attendance data: ${err.message || err}</div>`;
    }
}

function renderModule() {
    const root = document.getElementById("attendanceRoot");
    if (!root) return;

    const m = cache.logsData?.metrics || {};
    const sumTotalHrs = parseFloat(m.sum_total_hours || 0).toFixed(1);
    const sumRegHrs = parseFloat(m.sum_regular_hours || 0).toFixed(1);
    const sumOtHrs = parseFloat(m.sum_overtime_hours || 0).toFixed(1);
    const sumTardyMin = parseInt(m.sum_tardiness_minutes || 0, 10);
    const sumUnderMin = parseInt(m.sum_undertime_minutes || 0, 10);
    const sumNdHrs = parseFloat(m.sum_night_diff_hours || 0).toFixed(1);
    const activeStaff = parseInt(m.currently_clocked_in || 0, 10);

    root.innerHTML = `
        <div class="att-container">
            <!-- Header -->
            <div class="att-header">
                <div>
                    <div class="att-title-row">
                        <span class="att-title-icon">
                            <i class="fas fa-business-time"></i>
                        </span>
                        <div>
                            <h1 class="att-title">Staff Attendance &amp; Time Clock</h1>
                            <p class="att-subtitle">Web Punch Console, Actual Hours Worked, Tardiness, Undertime, Overtime, and Night-Shift Differential</p>
                        </div>
                    </div>
                </div>
                <div class="att-header-actions">
                    <button class="att-btn att-btn-outline" id="attBtnPrintDTR">
                        <i class="fas fa-print"></i> Print DTR Timesheet
                    </button>
                    <button class="att-btn att-btn-primary" id="attBtnOpenPunch">
                        <i class="fas fa-clock"></i> Web Punch Console
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Banner -->
            <div class="att-kpi-grid">
                <div class="att-kpi-card att-kpi-blue">
                    <div class="att-kpi-content">
                        <div class="att-kpi-label">Total Hours Logged</div>
                        <div class="att-kpi-val">${sumTotalHrs} <span class="att-kpi-sub">Hrs</span></div>
                        <div class="att-kpi-desc">Reg: ${sumRegHrs}h &bull; OT: ${sumOtHrs}h</div>
                    </div>
                    <div class="att-kpi-icon"><i class="fas fa-hourglass-half"></i></div>
                </div>

                <div class="att-kpi-card att-kpi-amber">
                    <div class="att-kpi-content">
                        <div class="att-kpi-label">Overtime Hours</div>
                        <div class="att-kpi-val">${sumOtHrs} <span class="att-kpi-sub">Hrs</span></div>
                        <div class="att-kpi-desc">${m.count_overtime || 0} overtime shift entries</div>
                    </div>
                    <div class="att-kpi-icon"><i class="fas fa-user-clock"></i></div>
                </div>

                <div class="att-kpi-card att-kpi-purple">
                    <div class="att-kpi-content">
                        <div class="att-kpi-label">Night Differential (ND)</div>
                        <div class="att-kpi-val">${sumNdHrs} <span class="att-kpi-sub">Hrs</span></div>
                        <div class="att-kpi-desc">10:00 PM – 06:00 AM window</div>
                    </div>
                    <div class="att-kpi-icon"><i class="fas fa-moon"></i></div>
                </div>

                <div class="att-kpi-card att-kpi-red">
                    <div class="att-kpi-content">
                        <div class="att-kpi-label">Tardiness / Undertime</div>
                        <div class="att-kpi-val">${sumTardyMin}m <span class="att-kpi-sub">/ ${sumUnderMin}m</span></div>
                        <div class="att-kpi-desc">${m.count_late || 0} late punch arrivals</div>
                    </div>
                    <div class="att-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
                </div>

                <div class="att-kpi-card att-kpi-emerald">
                    <div class="att-kpi-content">
                        <div class="att-kpi-label">Currently Clocked In</div>
                        <div class="att-kpi-val">${activeStaff} <span class="att-kpi-sub">Staff</span></div>
                        <div class="att-kpi-desc"><span class="att-live-dot"></span> Live active on floor</div>
                    </div>
                    <div class="att-kpi-icon"><i class="fas fa-user-check"></i></div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="att-tabs">
                <button class="att-tab-btn ${state.activeTab === 'timesheet' ? 'active' : ''}" data-tab="timesheet">
                    <i class="fas fa-table"></i> Attendance Timesheet Ledger
                </button>
                <button class="att-tab-btn ${state.activeTab === 'console' ? 'active' : ''}" data-tab="console">
                    <i class="fas fa-stopwatch"></i> Web Time-Clock Punch Console
                </button>
                <button class="att-tab-btn ${state.activeTab === 'overtime' ? 'active' : ''}" data-tab="overtime">
                    <i class="fas fa-check-double"></i> Overtime Approvals ${m.count_overtime ? `<span class="att-badge-count">${m.count_overtime}</span>` : ''}
                </button>
            </div>

            <!-- Tab 1: Timesheet Ledger -->
            <div id="attTabTimesheet" class="att-panel ${state.activeTab === 'timesheet' ? 'active' : ''}">
                ${renderTimesheetPanel()}
            </div>

            <!-- Tab 2: Punch Console -->
            <div id="attTabConsole" class="att-panel ${state.activeTab === 'console' ? 'active' : ''}">
                ${renderConsolePanel()}
            </div>

            <!-- Tab 3: Overtime Approvals -->
            <div id="attTabOvertime" class="att-panel ${state.activeTab === 'overtime' ? 'active' : ''}">
                ${renderOvertimePanel()}
            </div>
        </div>

        <!-- Printable DTR Modal -->
        <div id="attModalDTR" class="att-modal-backdrop" style="display: none;">
            <div class="att-modal-box att-modal-lg">
                <div class="att-modal-header">
                    <h3><i class="fas fa-print"></i> Official Daily Time Record (DTR) Timesheet</h3>
                    <div>
                        <button class="att-btn att-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print DTR</button>
                        <button class="att-modal-close" id="attBtnCloseDTRModal">&times;</button>
                    </div>
                </div>
                <div class="att-printable-content" id="attPrintableDTRContent">
                    <!-- Populated dynamically -->
                </div>
            </div>
        </div>
    `;

    attachEventHandlers();
}

/**
 * Timesheet Ledger Panel with Filters & Summary Table
 */
function renderTimesheetPanel() {
    const records = cache.logsData?.records || [];

    return `
        <!-- Filter Controls -->
        <div class="att-filter-bar">
            <div class="att-filter-group">
                <label>From Date:</label>
                <input type="date" id="attFilterStart" class="att-input" value="${state.startDate}">
            </div>

            <div class="att-filter-group">
                <label>To Date:</label>
                <input type="date" id="attFilterEnd" class="att-input" value="${state.endDate}">
            </div>

            <div class="att-filter-group">
                <label>Staff Member:</label>
                <select id="attFilterStaff" class="att-select">
                    <option value="0">All Staff Members</option>
                    ${cache.staffList.map(s => `<option value="${s.id}" ${state.employeeId == s.id ? 'selected' : ''}>${escapeHtml(s.full_name)} (${escapeHtml(s.department_name || 'Staff')})</option>`).join("")}
                </select>
            </div>

            <div class="att-filter-group">
                <label>Status:</label>
                <select id="attFilterStatus" class="att-select">
                    <option value="">All Statuses</option>
                    <option value="present" ${state.statusFilter === 'present' ? 'selected' : ''}>Present</option>
                    <option value="late" ${state.statusFilter === 'late' ? 'selected' : ''}>Late Arrival</option>
                    <option value="overtime" ${state.statusFilter === 'overtime' ? 'selected' : ''}>Overtime Shift</option>
                    <option value="undertime" ${state.statusFilter === 'undertime' ? 'selected' : ''}>Undertime / Early Out</option>
                    <option value="half_day" ${state.statusFilter === 'half_day' ? 'selected' : ''}>Half Day</option>
                </select>
            </div>

            <div class="att-filter-group" style="display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="attFilterOtOnly" ${state.overtimeOnly ? 'checked' : ''}>
                <label for="attFilterOtOnly" style="cursor: pointer; font-size: 0.8125rem;">OT Only</label>
            </div>

            <div class="att-filter-group" style="margin-left: auto;">
                <input type="text" id="attSearchInput" class="att-input" placeholder="Search punch code, name..." value="${escapeHtml(state.searchQuery)}">
            </div>
        </div>

        <!-- Timesheet Table -->
        <div class="att-table-container">
            <table class="att-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Date</th>
                        <th>Staff Member &amp; Unit</th>
                        <th>Scheduled</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Total Hrs</th>
                        <th>Regular</th>
                        <th>Overtime</th>
                        <th>Tardy</th>
                        <th>Undertime</th>
                        <th>Night Diff</th>
                        <th>Status</th>
                        <th>OT Approval</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length === 0 ? `
                        <tr>
                            <td colspan="14" style="text-align: center; padding: 40px; color: #64748b;">
                                <i class="fas fa-folder-open" style="font-size: 28px; margin-bottom: 8px;"></i>
                                <div>No attendance punches found matching selected criteria.</div>
                            </td>
                        </tr>
                    ` : records.map(r => `
                        <tr>
                            <td><span class="att-code-badge">${escapeHtml(r.attendance_code)}</span></td>
                            <td><strong>${r.clock_date}</strong></td>
                            <td>
                                <div class="att-staff-cell">
                                    <div class="att-staff-name">${escapeHtml(r.staff_name)}</div>
                                    <div class="att-staff-dept">${escapeHtml(r.department_name || 'Hospital Staff')}</div>
                                </div>
                            </td>
                            <td><span class="att-time-sub">${r.scheduled_start || '08:00'} - ${r.scheduled_end || '17:00'}</span></td>
                            <td>
                                <span class="att-punch-in"><i class="fas fa-sign-in-alt"></i> ${formatTimeOnly(r.clock_in)}</span>
                            </td>
                            <td>
                                ${r.clock_out ? `
                                    <span class="att-punch-out"><i class="fas fa-sign-out-alt"></i> ${formatTimeOnly(r.clock_out)}</span>
                                ` : `
                                    <span class="att-badge-live"><span class="att-live-dot"></span> CLOCKED IN</span>
                                `}
                            </td>
                            <td><strong>${parseFloat(r.total_hours_worked || 0).toFixed(2)}h</strong></td>
                            <td>${parseFloat(r.regular_hours || 0).toFixed(2)}h</td>
                            <td>
                                ${parseFloat(r.overtime_hours || 0) > 0 ? `
                                    <span class="att-ot-pill">+${parseFloat(r.overtime_hours).toFixed(2)}h</span>
                                ` : `
                                    <span style="color: #94a3b8;">0.00h</span>
                                `}
                            </td>
                            <td>
                                ${r.tardiness_minutes > 0 ? `
                                    <span class="att-late-text"><i class="fas fa-exclamation-circle"></i> ${r.tardiness_minutes}m</span>
                                ` : `
                                    <span style="color: #94a3b8;">-</span>
                                `}
                            </td>
                            <td>
                                ${r.undertime_minutes > 0 ? `
                                    <span class="att-under-text">${r.undertime_minutes}m</span>
                                ` : `
                                    <span style="color: #94a3b8;">-</span>
                                `}
                            </td>
                            <td>
                                ${parseFloat(r.night_diff_hours || 0) > 0 ? `
                                    <span class="att-nd-badge"><i class="fas fa-moon"></i> ${parseFloat(r.night_diff_hours).toFixed(2)}h</span>
                                ` : `
                                    <span style="color: #94a3b8;">-</span>
                                `}
                            </td>
                            <td>${formatStatusBadge(r.status)}</td>
                            <td>${formatOtApprovalBadge(r.id, r.overtime_hours, r.overtime_status)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Web Time-Clock Punch Console Panel
 */
function renderConsolePanel() {
    const cs = cache.consoleStatus || {};
    const emp = cs.employee || {};
    const isClockedIn = cs.is_clocked_in;
    const currentPunch = cs.current_punch || {};
    const stats = cs.today_stats || {};

    return `
        <div class="att-console-wrap">
            <div class="att-console-box">
                <!-- Live Digital Clock -->
                <div class="att-digital-clock">
                    <div class="att-clock-time" id="attLiveClockTime">--:--:--</div>
                    <div class="att-clock-date" id="attLiveClockDate">Loading current time...</div>
                </div>

                <!-- Staff Selector -->
                <div class="att-console-select-row">
                    <label>Select Staff Member:</label>
                    <select id="attConsoleStaffSelect" class="att-select att-select-lg">
                        ${cache.staffList.map(s => `
                            <option value="${s.id}" ${state.selectedConsoleEmployeeId == s.id ? 'selected' : ''}>
                                ${escapeHtml(s.full_name)} (${escapeHtml(s.department_name || 'General')})
                            </option>
                        `).join("")}
                    </select>
                </div>

                <!-- Punch Status Banner -->
                <div class="att-punch-state-box ${isClockedIn ? 'att-state-active' : 'att-state-idle'}">
                    ${isClockedIn ? `
                        <div class="att-punch-status-title">
                            <span class="att-live-dot att-dot-lg"></span>
                            <span>CURRENTLY CLOCKED IN</span>
                        </div>
                        <div class="att-punch-status-desc">
                            Clocked in at <strong>${currentPunch.clock_in}</strong> (#${currentPunch.attendance_code})
                        </div>
                        <div class="att-punch-timer">
                            <div class="att-timer-label">ELAPSED TIME THIS SHIFT</div>
                            <div class="att-timer-val" id="attElapsedTimer">00h 00m 00s</div>
                        </div>
                    ` : `
                        <div class="att-punch-status-title" style="color: #64748b;">
                            <i class="fas fa-user-clock"></i> NOT CLOCKED IN
                        </div>
                        <div class="att-punch-status-desc">
                            Select staff member and click PUNCH IN to record shift start.
                        </div>
                    `}
                </div>

                <!-- Punch Controls Form -->
                <div class="att-punch-actions-wrap">
                    ${!isClockedIn ? `
                        <div class="att-form-group">
                            <label>Shift Note / Punch Remarks (Optional):</label>
                            <input type="text" id="attClockInRemarks" class="att-input" placeholder="e.g. Inpatient Ward B coverage, ER Resuscitation shift">
                        </div>
                        <button class="att-punch-btn att-punch-btn-in" id="attBtnClockIn">
                            <i class="fas fa-sign-in-alt"></i> PUNCH IN (START SHIFT)
                        </button>
                    ` : `
                        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.8125rem; font-weight: 600;">Deduct Meal Break:</label>
                                <select id="attClockOutBreak" class="att-select" style="width: 100%;">
                                    <option value="60" selected>1 Hour Lunch Break (60 mins)</option>
                                    <option value="30">30 Minutes Meal Break</option>
                                    <option value="0">No Break (Direct continuous shift)</option>
                                </select>
                            </div>
                            <div style="flex: 2;">
                                <label style="font-size: 0.8125rem; font-weight: 600;">End of Shift Remarks:</label>
                                <input type="text" id="attClockOutRemarks" class="att-input" placeholder="e.g. Handover completed, late surgery assist" style="width: 100%;">
                            </div>
                        </div>
                        <button class="att-punch-btn att-punch-btn-out" id="attBtnClockOut">
                            <i class="fas fa-sign-out-alt"></i> PUNCH OUT (END SHIFT &amp; CALCULATE HOURS)
                        </button>
                    `}
                </div>

                <!-- Daily Summary Footprint -->
                <div class="att-console-stats">
                    <div class="att-cs-stat">
                        <span class="att-cs-label">Punches Today:</span>
                        <span class="att-cs-val">${stats.punches_today || 0}</span>
                    </div>
                    <div class="att-cs-stat">
                        <span class="att-cs-label">Total Worked:</span>
                        <span class="att-cs-val">${parseFloat(stats.total_hours_today || 0).toFixed(2)}h</span>
                    </div>
                    <div class="att-cs-stat">
                        <span class="att-cs-label">Regular Hours:</span>
                        <span class="att-cs-val">${parseFloat(stats.regular_hours_today || 0).toFixed(2)}h</span>
                    </div>
                    <div class="att-cs-stat">
                        <span class="att-cs-label">Overtime Hours:</span>
                        <span class="att-cs-val" style="color: #d97706;">+${parseFloat(stats.overtime_hours_today || 0).toFixed(2)}h</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Overtime Approvals Tab
 */
function renderOvertimePanel() {
    const records = (cache.logsData?.records || []).filter(r => parseFloat(r.overtime_hours || 0) > 0);

    return `
        <div class="att-table-container">
            <div style="padding: 16px 20px; background: #fffbeb; border-bottom: 1px solid #fef3c7; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 700; color: #92400e; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clock"></i> Hospital Overtime Pre-Authorization &amp; Settlement Ledger
                </div>
                <div style="font-size: 0.8125rem; color: #b45309;">
                    Threshold: Hours exceeding 8.00h regular hospital shift mandate supervisor sign-off
                </div>
            </div>

            <table class="att-table">
                <thead>
                    <tr>
                        <th>Punch Ref</th>
                        <th>Date</th>
                        <th>Staff Member</th>
                        <th>Total Worked</th>
                        <th>Regular</th>
                        <th>Overtime Hours</th>
                        <th>Approval Status</th>
                        <th>Remarks &amp; Justification</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length === 0 ? `
                        <tr><td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">No overtime records in this period.</td></tr>
                    ` : records.map(r => `
                        <tr>
                            <td><span class="att-code-badge">${escapeHtml(r.attendance_code)}</span></td>
                            <td><strong>${r.clock_date}</strong></td>
                            <td>${escapeHtml(r.staff_name)}</td>
                            <td>${parseFloat(r.total_hours_worked).toFixed(2)}h</td>
                            <td>${parseFloat(r.regular_hours).toFixed(2)}h</td>
                            <td><span class="att-ot-pill">+${parseFloat(r.overtime_hours).toFixed(2)}h OT</span></td>
                            <td>${formatOtApprovalBadge(r.id, r.overtime_hours, r.overtime_status)}</td>
                            <td style="max-width: 250px;">${escapeHtml(r.remarks || 'Standard overtime')}</td>
                            <td>
                                ${r.overtime_status === 'pending_approval' ? `
                                    <div style="display: flex; gap: 6px;">
                                        <button class="att-btn att-btn-xs att-btn-success att-btn-approve-ot" data-id="${r.id}">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="att-btn att-btn-xs att-btn-danger att-btn-reject-ot" data-id="${r.id}">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    </div>
                                ` : `
                                    <span style="font-size: 0.75rem; color: #64748b;">Completed</span>
                                `}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function formatStatusBadge(status) {
    switch (status) {
        case "present":
            return `<span class="att-status-badge att-sb-present">PRESENT</span>`;
        case "late":
            return `<span class="att-status-badge att-sb-late">LATE ARRIVAL</span>`;
        case "overtime":
            return `<span class="att-status-badge att-sb-ot">OVERTIME</span>`;
        case "undertime":
            return `<span class="att-status-badge att-sb-under">UNDERTIME</span>`;
        case "half_day":
            return `<span class="att-status-badge att-sb-half">HALF DAY</span>`;
        default:
            return `<span class="att-status-badge">${status.toUpperCase()}</span>`;
    }
}

function formatOtApprovalBadge(id, otHours, otStatus) {
    if (parseFloat(otHours || 0) <= 0) return `<span style="color: #94a3b8;">N/A</span>`;

    switch (otStatus) {
        case "approved":
            return `<span class="att-ot-state att-ots-approved"><i class="fas fa-check-circle"></i> Approved</span>`;
        case "pending_approval":
            return `<span class="att-ot-state att-ots-pending"><i class="fas fa-clock"></i> Pending Review</span>`;
        case "rejected":
            return `<span class="att-ot-state att-ots-rejected"><i class="fas fa-times-circle"></i> Rejected</span>`;
        default:
            return `<span class="att-ot-state">${otStatus}</span>`;
    }
}

function formatTimeOnly(dtStr) {
    if (!dtStr) return "-";
    const parts = dtStr.split(" ");
    return parts[1] ? parts[1].substring(0, 5) : dtStr;
}

/**
 * Event Handlers
 */
function attachEventHandlers() {
    // Tabs
    document.querySelectorAll(".att-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.dataset.tab;
            renderModule();
        });
    });

    // Filters
    document.getElementById("attFilterStart")?.addEventListener("change", (e) => {
        state.startDate = e.target.value;
        refreshTimesheet();
    });

    document.getElementById("attFilterEnd")?.addEventListener("change", (e) => {
        state.endDate = e.target.value;
        refreshTimesheet();
    });

    document.getElementById("attFilterStaff")?.addEventListener("change", (e) => {
        state.employeeId = parseInt(e.target.value, 10) || 0;
        refreshTimesheet();
    });

    document.getElementById("attFilterStatus")?.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        refreshTimesheet();
    });

    document.getElementById("attFilterOtOnly")?.addEventListener("change", (e) => {
        state.overtimeOnly = e.target.checked;
        refreshTimesheet();
    });

    document.getElementById("attSearchInput")?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        refreshTimesheet();
    });

    // Console staff select
    document.getElementById("attConsoleStaffSelect")?.addEventListener("change", async (e) => {
        state.selectedConsoleEmployeeId = parseInt(e.target.value, 10);
        await reloadConsoleStatus();
    });

    // Clock In
    document.getElementById("attBtnClockIn")?.addEventListener("click", async () => {
        const empId = state.selectedConsoleEmployeeId;
        const remarks = document.getElementById("attClockInRemarks")?.value || "";

        try {
            const res = await api(`/attendance/clock-in`, {
                method: "POST",
                body: { employee_id: empId, remarks }
            });
            alert(res.data?.message || "Clock-in successful!");
            await loadInitialData();
        } catch (err) {
            alert("Clock-in failed: " + (err.message || err));
        }
    });

    // Clock Out
    document.getElementById("attBtnClockOut")?.addEventListener("click", async () => {
        const empId = state.selectedConsoleEmployeeId;
        const breakMin = document.getElementById("attClockOutBreak")?.value || "60";
        const remarks = document.getElementById("attClockOutRemarks")?.value || "";

        try {
            const res = await api(`/attendance/clock-out`, {
                method: "POST",
                body: { employee_id: empId, break_minutes: breakMin, remarks }
            });
            alert(res.data?.message || "Clock-out recorded successfully!");
            await loadInitialData();
        } catch (err) {
            alert("Clock-out failed: " + (err.message || err));
        }
    });

    // Top action
    document.getElementById("attBtnOpenPunch")?.addEventListener("click", () => {
        state.activeTab = "console";
        renderModule();
    });

    document.getElementById("attBtnPrintDTR")?.addEventListener("click", openDTRModal);

    // Overtime action buttons
    document.querySelectorAll(".att-btn-approve-ot").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            try {
                await api(`/attendance/overtime/approve`, { method: "POST", body: { id } });
                alert("Overtime approved.");
                await loadInitialData();
            } catch (err) {
                alert("Failed to approve overtime: " + (err.message || err));
            }
        });
    });

    document.querySelectorAll(".att-btn-reject-ot").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const reason = prompt("Enter reason for rejecting overtime hours:");
            if (reason) {
                try {
                    await api(`/attendance/overtime/reject`, { method: "POST", body: { id, reason } });
                    alert("Overtime rejected.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to reject overtime: " + (err.message || err));
                }
            }
        });
    });

    // Modal close
    document.getElementById("attBtnCloseDTRModal")?.addEventListener("click", () => {
        const m = document.getElementById("attModalDTR");
        if (m) m.style.display = "none";
    });
}

async function refreshTimesheet() {
    try {
        const logsRes = await api(`/attendance/logs?start_date=${state.startDate}&end_date=${state.endDate}&department_id=${state.departmentId}&employee_id=${state.employeeId}&status=${state.statusFilter}&overtime_only=${state.overtimeOnly ? '1' : ''}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`);
        cache.logsData = logsRes?.data || { total: 0, records: [], metrics: {} };
        const container = document.getElementById("attTabTimesheet");
        if (container) container.innerHTML = renderTimesheetPanel();
        attachEventHandlers();
    } catch (err) {
        console.error("Refresh timesheet error:", err);
    }
}

async function reloadConsoleStatus() {
    try {
        const statusRes = await api(`/attendance/status?employee_id=${state.selectedConsoleEmployeeId}`);
        cache.consoleStatus = statusRes?.data || { is_clocked_in: false, current_punch: null, elapsed_seconds: 0, today_stats: {} };
        const container = document.getElementById("attTabConsole");
        if (container) container.innerHTML = renderConsolePanel();
        attachEventHandlers();
    } catch (err) {
        console.error("Reload console error:", err);
    }
}

function startLiveClock() {
    if (state.clockTimerInterval) clearInterval(state.clockTimerInterval);

    state.clockTimerInterval = setInterval(() => {
        const clockTimeEl = document.getElementById("attLiveClockTime");
        const clockDateEl = document.getElementById("attLiveClockDate");
        const elapsedEl = document.getElementById("attElapsedTimer");

        const now = new Date();
        if (clockTimeEl) {
            clockTimeEl.textContent = now.toLocaleTimeString("en-US", { hour12: true });
        }
        if (clockDateEl) {
            clockDateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        }

        if (elapsedEl && cache.consoleStatus?.is_clocked_in && cache.consoleStatus?.current_punch?.clock_in) {
            const inTs = new Date(cache.consoleStatus.current_punch.clock_in).getTime();
            const diff = Math.max(0, Math.floor((now.getTime() - inTs) / 1000));
            const hrs = String(Math.floor(diff / 3600)).padStart(2, "0");
            const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
            const secs = String(diff % 60).padStart(2, "0");
            elapsedEl.textContent = `${hrs}h ${mins}m ${secs}s`;
        }
    }, 1000);
}

function openDTRModal() {
    const modal = document.getElementById("attModalDTR");
    const container = document.getElementById("attPrintableDTRContent");
    if (!modal || !container) return;

    const records = cache.logsData?.records || [];
    const m = cache.logsData?.metrics || {};

    container.innerHTML = `
        <div class="att-dtr-sheet">
            <div class="att-dtr-header">
                <h2>USINTELLIX HEALTHCARE SYSTEM</h2>
                <div class="att-dtr-sub">OFFICIAL DAILY TIME RECORD (DTR) &bull; LABOR ATTENDANCE LOG</div>
                <div style="font-size: 0.8125rem; color: #64748b;">Period: ${state.startDate} to ${state.endDate} &bull; Generated: ${new Date().toLocaleString()}</div>
            </div>

            <div class="att-dtr-summary-boxes">
                <div class="att-dtr-sbox">
                    <div class="att-dtr-slabel">Total Worked</div>
                    <div class="att-dtr-sval">${parseFloat(m.sum_total_hours || 0).toFixed(2)}h</div>
                </div>
                <div class="att-dtr-sbox">
                    <div class="att-dtr-slabel">Regular Hours</div>
                    <div class="att-dtr-sval">${parseFloat(m.sum_regular_hours || 0).toFixed(2)}h</div>
                </div>
                <div class="att-dtr-sbox">
                    <div class="att-dtr-slabel">Overtime Hours</div>
                    <div class="att-dtr-sval" style="color: #d97706;">+${parseFloat(m.sum_overtime_hours || 0).toFixed(2)}h</div>
                </div>
                <div class="att-dtr-sbox">
                    <div class="att-dtr-slabel">Night Diff (ND)</div>
                    <div class="att-dtr-sval" style="color: #7c3aed;">${parseFloat(m.sum_night_diff_hours || 0).toFixed(2)}h</div>
                </div>
                <div class="att-dtr-sbox">
                    <div class="att-dtr-slabel">Total Tardiness</div>
                    <div class="att-dtr-sval" style="color: #dc2626;">${m.sum_tardiness_minutes || 0}m</div>
                </div>
            </div>

            <table class="att-dtr-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Staff Member</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Break</th>
                        <th>Total Hrs</th>
                        <th>Reg Hrs</th>
                        <th>OT Hrs</th>
                        <th>Tardy</th>
                        <th>Night Diff</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td><strong>${r.clock_date}</strong></td>
                            <td>${escapeHtml(r.staff_name)} (${escapeHtml(r.department_code || 'DEPT')})</td>
                            <td>${formatTimeOnly(r.clock_in)}</td>
                            <td>${formatTimeOnly(r.clock_out)}</td>
                            <td>${r.break_minutes}m</td>
                            <td><strong>${parseFloat(r.total_hours_worked).toFixed(2)}h</strong></td>
                            <td>${parseFloat(r.regular_hours).toFixed(2)}h</td>
                            <td>+${parseFloat(r.overtime_hours).toFixed(2)}h</td>
                            <td>${r.tardiness_minutes > 0 ? r.tardiness_minutes + 'm' : '-'}</td>
                            <td>${parseFloat(r.night_diff_hours) > 0 ? parseFloat(r.night_diff_hours).toFixed(2) + 'h' : '-'}</td>
                            <td>${r.status.toUpperCase()}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="att-dtr-signatures">
                <div class="att-sig-line">
                    <div class="att-line"></div>
                    <div>Employee / Staff Signature</div>
                </div>
                <div class="att-sig-line">
                    <div class="att-line"></div>
                    <div>Department Head / Supervisor Sign-off</div>
                </div>
                <div class="att-sig-line">
                    <div class="att-line"></div>
                    <div>HR &amp; Payroll Officer Certification</div>
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
    if (document.getElementById("attStyles")) return;

    const style = document.createElement("style");
    style.id = "attStyles";
    style.textContent = `
        .att-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .att-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .att-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .att-title-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: rgba(14, 165, 233, 0.12);
            color: #0284c7;
            font-size: 22px;
        }

        .att-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
        }

        .att-subtitle {
            margin: 4px 0 0 0;
            font-size: 0.875rem;
            color: #64748b;
        }

        .att-header-actions {
            display: flex;
            gap: 12px;
        }

        /* Buttons */
        .att-btn {
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

        .att-btn-primary { background: #0284c7; color: #ffffff; }
        .att-btn-primary:hover { background: #0369a1; }
        .att-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
        .att-btn-outline:hover { background: #f8fafc; }
        .att-btn-xs { padding: 4px 8px; font-size: 0.75rem; }
        .att-btn-success { background: #059669; color: #ffffff; }
        .att-btn-danger { background: #dc2626; color: #ffffff; }

        /* KPI Grid */
        .att-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .att-kpi-card {
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

        .att-kpi-blue { border-left-color: #0284c7; }
        .att-kpi-amber { border-left-color: #d97706; }
        .att-kpi-purple { border-left-color: #7c3aed; }
        .att-kpi-red { border-left-color: #ef4444; }
        .att-kpi-emerald { border-left-color: #059669; }

        .att-kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .att-kpi-val { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 4px 0; }
        .att-kpi-sub { font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .att-kpi-desc { font-size: 0.75rem; color: #94a3b8; }
        .att-kpi-icon { font-size: 24px; opacity: 0.3; }

        /* Live dot */
        .att-live-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #16a34a;
            animation: attPulse 1.5s infinite;
        }

        .att-dot-lg { width: 12px; height: 12px; }

        @keyframes attPulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        /* Tabs */
        .att-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }

        .att-tab-btn {
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

        .att-tab-btn:hover { color: #0f172a; background: #f1f5f9; }
        .att-tab-btn.active { color: #0284c7; background: rgba(2, 132, 199, 0.1); }
        .att-badge-count { background: #d97706; color: #ffffff; font-size: 0.6875rem; padding: 2px 6px; border-radius: 999px; }

        .att-panel { display: none; }
        .att-panel.active { display: block; }

        /* Filter bar */
        .att-filter-bar {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
            background: #ffffff;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }

        .att-filter-group { display: flex; align-items: center; gap: 8px; }
        .att-filter-group label { font-size: 0.8125rem; font-weight: 600; color: #475569; }

        .att-select, .att-input {
            padding: 6px 10px;
            font-size: 0.8125rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #0f172a;
        }

        .att-select-lg { padding: 10px 14px; font-size: 0.9375rem; font-weight: 600; }

        /* Tables */
        .att-table-container {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .att-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
        }

        .att-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 12px 12px;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
        }

        .att-table td {
            padding: 12px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .att-table tr:hover td { background: #fafafa; }

        .att-code-badge { font-family: monospace; font-weight: 700; color: #0284c7; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px; }
        .att-staff-cell { display: flex; flex-direction: column; }
        .att-staff-name { font-weight: 700; color: #0f172a; }
        .att-staff-dept { font-size: 0.75rem; color: #64748b; }
        .att-time-sub { font-size: 0.75rem; color: #64748b; }

        .att-punch-in { color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .att-punch-out { color: #d97706; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .att-badge-live { background: #ecfdf5; color: #059669; font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }

        .att-ot-pill { background: #fffbeb; color: #b45309; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a; }
        .att-late-text { color: #dc2626; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .att-under-text { color: #ea580c; font-weight: 600; }
        .att-nd-badge { background: #f5f3ff; color: #6d28d9; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }

        .att-status-badge { font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
        .att-sb-present { background: #ecfdf5; color: #059669; }
        .att-sb-late { background: #fef2f2; color: #dc2626; }
        .att-sb-ot { background: #fffbeb; color: #b45309; }
        .att-sb-under { background: #fff7ed; color: #c2410c; }
        .att-sb-half { background: #f1f5f9; color: #475569; }

        .att-ot-state { font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .att-ots-approved { color: #059669; }
        .att-ots-pending { color: #d97706; }
        .att-ots-rejected { color: #dc2626; }

        /* Console Panel */
        .att-console-wrap {
            max-width: 680px;
            margin: 0 auto;
        }

        .att-console-box {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .att-digital-clock {
            text-align: center;
            background: #0f172a;
            color: #38bdf8;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 24px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }

        .att-clock-time {
            font-family: monospace;
            font-size: 2.75rem;
            font-weight: 700;
            letter-spacing: 0.05em;
        }

        .att-clock-date {
            font-size: 0.875rem;
            color: #94a3b8;
            margin-top: 4px;
        }

        .att-console-select-row {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .att-console-select-row label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #334155;
        }

        .att-punch-state-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
        }

        .att-state-active {
            background: #f0fdf4;
            border-color: #86efac;
        }

        .att-state-idle {
            background: #f8fafc;
            border-color: #cbd5e1;
        }

        .att-punch-status-title {
            font-size: 1.125rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #15803d;
        }

        .att-punch-status-desc {
            font-size: 0.875rem;
            color: #64748b;
            margin-top: 6px;
        }

        .att-punch-timer {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px dashed #bbf7d0;
        }

        .att-timer-label { font-size: 0.75rem; font-weight: 700; color: #166534; letter-spacing: 0.05em; }
        .att-timer-val { font-family: monospace; font-size: 2rem; font-weight: 700; color: #15803d; margin-top: 4px; }

        .att-punch-actions-wrap {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 24px;
        }

        .att-punch-btn {
            width: 100%;
            padding: 16px;
            font-size: 1.125rem;
            font-weight: 700;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            transition: all 0.15s ease;
        }

        .att-punch-btn-in {
            background: #16a34a;
            color: #ffffff;
        }
        .att-punch-btn-in:hover { background: #15803d; transform: translateY(-1px); }

        .att-punch-btn-out {
            background: #dc2626;
            color: #ffffff;
        }
        .att-punch-btn-out:hover { background: #b91c1c; transform: translateY(-1px); }

        .att-console-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }

        .att-cs-stat { display: flex; flex-direction: column; }
        .att-cs-label { font-size: 0.6875rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .att-cs-val { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin-top: 2px; }

        /* Printable DTR Modal */
        .att-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(2px);
        }

        .att-modal-box {
            background: #ffffff;
            border-radius: 12px;
            width: 100%; max-width: 950px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            overflow: hidden; max-height: 90vh;
            display: flex; flex-direction: column;
        }

        .att-modal-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }

        .att-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .att-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

        .att-printable-content { padding: 24px; overflow-y: auto; }
        .att-dtr-sheet { background: #ffffff; color: #000000; }
        .att-dtr-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 12px; }
        .att-dtr-header h2 { margin: 0; font-size: 1.25rem; }
        .att-dtr-sub { font-size: 1rem; font-weight: 700; margin-top: 4px; }

        .att-dtr-summary-boxes { display: flex; gap: 12px; margin-bottom: 20px; }
        .att-dtr-sbox { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; }
        .att-dtr-slabel { font-size: 0.6875rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .att-dtr-sval { font-size: 1.25rem; font-weight: 700; margin-top: 2px; }

        .att-dtr-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .att-dtr-table th, .att-dtr-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        .att-dtr-table th { background: #f1f5f9; font-weight: 700; }

        .att-dtr-signatures { display: flex; justify-content: space-around; margin-top: 48px; }
        .att-sig-line { text-align: center; font-size: 0.75rem; font-weight: 600; width: 220px; }
        .att-line { border-bottom: 1px solid #000000; margin-bottom: 6px; }

        @media print {
            body * { visibility: hidden; }
            #attModalDTR, #attModalDTR * { visibility: visible; }
            #attModalDTR { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
            .att-modal-header { display: none; }
        }
    `;

    document.head.appendChild(style);
}
