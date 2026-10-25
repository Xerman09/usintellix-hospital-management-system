/**
 * Leave Management & Coverage Workflow Module
 * Schema: hr_leave_requests, hr_leave_quota_balances
 */

import { api } from "../../core/api.js?v=10";

// Module State
let state = {
    activeTab: "requests", // 'requests' | 'balances' | 'my_coverage'
    departmentId: 0,
    employeeId: 0,
    leaveTypeFilter: "",
    statusFilter: "",
    coveragePendingFilter: false,
    searchQuery: "",
    page: 1,
    perPage: 25,
    selectedQuotaEmployeeId: 101, // Default selected for quota inspection
    showRequestModal: false,
    showDTRModal: false
};

let cache = {
    requestsData: null,
    metadata: { departments: [], staff: [] },
    quotaBalances: []
};

export function LeaveManagementView() {
    return `<div class="lm-root" id="leaveManagementRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Leave Management &amp; Coverage Workflow...</div>
        </div>
    </div>`;
}

export async function initLeaveManagement() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("leaveManagementRoot");
    if (!root) return;

    try {
        const [metaRes, listRes, quotaRes] = await Promise.all([
            api(`/leave/metadata`).catch(() => null),
            api(`/leave/requests?department_id=${state.departmentId}&employee_id=${state.employeeId}&leave_type=${state.leaveTypeFilter}&status=${state.statusFilter}&coverage_pending=${state.coveragePendingFilter ? '1' : ''}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/leave/balances?employee_id=${state.selectedQuotaEmployeeId}`).catch(() => null)
        ]);

        cache.metadata = metaRes?.data || { departments: [], staff: [] };
        cache.requestsData = listRes?.data || { total: 0, records: [], metrics: {} };
        cache.quotaBalances = quotaRes?.data || [];

        renderModule();
    } catch (err) {
        console.error("Failed to load leave management:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load Leave Management: ${err.message || err}</div>`;
    }
}

function renderModule() {
    const root = document.getElementById("leaveManagementRoot");
    if (!root) return;

    const m = cache.requestsData?.metrics || {};
    const pendingAppr = parseInt(m.pending_approvals || 0, 10);
    const pendingCov = parseInt(m.pending_coverage_acks || 0, 10);
    const onLeaveToday = parseInt(m.currently_on_leave || 0, 10);
    const totalDaysYear = parseFloat(m.total_approved_days_year || 0).toFixed(1);

    root.innerHTML = `
        <div class="lm-container">
            <!-- Header -->
            <div class="lm-header">
                <div>
                    <div class="lm-title-row">
                        <span class="lm-title-icon">
                            <i class="fas fa-plane-departure"></i>
                        </span>
                        <div>
                            <h1 class="lm-title">Leave Management &amp; Coverage Workflow</h1>
                            <p class="lm-subtitle">Vacation, Sick, Study/CME Leaves, Covering Colleague Sign-off, and Annual Quota Balances</p>
                        </div>
                    </div>
                </div>
                <div class="lm-header-actions">
                    <button class="lm-btn lm-btn-outline" id="lmBtnPrintSheet">
                        <i class="fas fa-print"></i> Print Leave Application
                    </button>
                    <button class="lm-btn lm-btn-primary" id="lmBtnNewRequest">
                        <i class="fas fa-calendar-plus"></i> Request Leave
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Banner -->
            <div class="lm-kpi-grid">
                <div class="lm-kpi-card ${pendingAppr > 0 ? 'lm-kpi-amber' : 'lm-kpi-blue'}">
                    <div class="lm-kpi-content">
                        <div class="lm-kpi-label">Pending Supervisor Approvals</div>
                        <div class="lm-kpi-val">${pendingAppr} <span class="lm-kpi-sub">Requests</span></div>
                        <div class="lm-kpi-desc">Awaiting clinical director / HOD</div>
                    </div>
                    <div class="lm-kpi-icon"><i class="fas fa-user-clock"></i></div>
                </div>

                <div class="lm-kpi-card ${pendingCov > 0 ? 'lm-kpi-purple' : 'lm-kpi-blue'}">
                    <div class="lm-kpi-content">
                        <div class="lm-kpi-label">Pending Colleague Acks</div>
                        <div class="lm-kpi-val">${pendingCov} <span class="lm-kpi-sub">Handovers</span></div>
                        <div class="lm-kpi-desc">Colleague cross-coverage sign-off</div>
                    </div>
                    <div class="lm-kpi-icon"><i class="fas fa-people-arrows"></i></div>
                </div>

                <div class="lm-kpi-card lm-kpi-emerald">
                    <div class="lm-kpi-content">
                        <div class="lm-kpi-label">Currently On Leave Today</div>
                        <div class="lm-kpi-val">${onLeaveToday} <span class="lm-kpi-sub">Physicians &amp; Staff</span></div>
                        <div class="lm-kpi-desc">Hospital-wide active leaves</div>
                    </div>
                    <div class="lm-kpi-icon"><i class="fas fa-umbrella-beach"></i></div>
                </div>

                <div class="lm-kpi-card lm-kpi-blue">
                    <div class="lm-kpi-content">
                        <div class="lm-kpi-label">Approved Days (YTD)</div>
                        <div class="lm-kpi-val">${totalDaysYear} <span class="lm-kpi-sub">Days</span></div>
                        <div class="lm-kpi-desc">Across all leave categories</div>
                    </div>
                    <div class="lm-kpi-icon"><i class="fas fa-calendar-check"></i></div>
                </div>
            </div>

            <!-- Workspace Tabs -->
            <div class="lm-tabs">
                <button class="lm-tab-btn ${state.activeTab === 'requests' ? 'active' : ''}" data-tab="requests">
                    <i class="fas fa-list-alt"></i> Leave Requests &amp; Coverage Ledger
                </button>
                <button class="lm-tab-btn ${state.activeTab === 'balances' ? 'active' : ''}" data-tab="balances">
                    <i class="fas fa-chart-pie"></i> Annual Quota Balances
                </button>
            </div>

            <!-- Tab 1: Requests Ledger -->
            <div id="lmTabRequests" class="lm-panel ${state.activeTab === 'requests' ? 'active' : ''}">
                ${renderRequestsPanel()}
            </div>

            <!-- Tab 2: Quota Balances -->
            <div id="lmTabBalances" class="lm-panel ${state.activeTab === 'balances' ? 'active' : ''}">
                ${renderBalancesPanel()}
            </div>
        </div>

        <!-- Request Leave Modal -->
        <div id="lmModalRequest" class="lm-modal-backdrop" style="display: none;">
            <div class="lm-modal-box">
                <div class="lm-modal-header">
                    <h3><i class="fas fa-calendar-plus"></i> Submit Formal Leave Application</h3>
                    <button class="lm-modal-close" id="lmBtnCloseReqModal">&times;</button>
                </div>
                <form id="lmFormRequest" class="lm-form">
                    <div class="lm-form-row">
                        <div class="lm-form-group">
                            <label>Staff Member <span class="lm-req">*</span></label>
                            <select id="lmFormStaff" class="lm-select" required>
                                <option value="">Select Employee...</option>
                                ${cache.metadata.staff.map(s => `
                                    <option value="${s.id}" ${state.selectedQuotaEmployeeId == s.id ? 'selected' : ''}>
                                        ${escapeHtml(s.full_name)} (${escapeHtml(s.department_name || 'General')})
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="lm-form-group">
                            <label>Leave Category <span class="lm-req">*</span></label>
                            <select id="lmFormType" class="lm-select" required>
                                <option value="vacation">Vacation Leave (Annual Quota)</option>
                                <option value="sick">Sick Leave (Medical Justification)</option>
                                <option value="study_cme">Study / CME Training Leave</option>
                                <option value="emergency">Emergency Urgent Leave</option>
                                <option value="maternity_paternity">Maternity / Paternity Leave</option>
                                <option value="bereavement">Bereavement Leave</option>
                                <option value="unpaid">Unpaid Leave</option>
                            </select>
                        </div>
                    </div>

                    <!-- Quota hint banner -->
                    <div id="lmQuotaHintBanner" class="lm-quota-hint">
                        Loading quota balance...
                    </div>

                    <div class="lm-form-row">
                        <div class="lm-form-group">
                            <label>Start Date <span class="lm-req">*</span></label>
                            <input type="date" id="lmFormStartDate" class="lm-input" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="lm-form-group">
                            <label>End Date <span class="lm-req">*</span></label>
                            <input type="date" id="lmFormEndDate" class="lm-input" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="lm-form-group" style="max-width: 120px;">
                            <label>Total Days</label>
                            <input type="number" id="lmFormTotalDays" class="lm-input" min="0.5" step="0.5" value="1.0" required>
                        </div>
                    </div>

                    <div class="lm-form-row">
                        <div class="lm-form-group">
                            <label>Covering Colleague (Physician / Nurse Handover) <span class="lm-req">*</span></label>
                            <select id="lmFormCoveringStaff" class="lm-select" required>
                                <option value="">Select Covering Colleague...</option>
                                ${cache.metadata.staff.map(s => `
                                    <option value="${s.id}">
                                        ${escapeHtml(s.full_name)} (${escapeHtml(s.department_name || 'Staff')})
                                    </option>
                                `).join("")}
                            </select>
                        </div>
                    </div>

                    <div class="lm-form-group">
                        <label>Coverage Instructions &amp; Clinical Handover Scope</label>
                        <input type="text" id="lmFormCoverageNotes" class="lm-input" placeholder="e.g. Taking over Ward 3 inpatient rounds, ER cath lab backup, and outpatient follow-ups.">
                    </div>

                    <div class="lm-form-group">
                        <label>Reason / Justification <span class="lm-req">*</span></label>
                        <textarea id="lmFormReason" class="lm-textarea" rows="2" required placeholder="e.g. Attending 3-day regional cardiology seminar or pre-scheduled annual leave."></textarea>
                    </div>

                    <div class="lm-modal-actions">
                        <button type="button" class="lm-btn lm-btn-outline" id="lmBtnCancelReq">Cancel</button>
                        <button type="submit" class="lm-btn lm-btn-primary" id="lmBtnSubmitReq">
                            <i class="fas fa-paper-plane"></i> Submit Leave Request
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Printable Leave Sheet Modal -->
        <div id="lmModalPrint" class="lm-modal-backdrop" style="display: none;">
            <div class="lm-modal-box lm-modal-lg">
                <div class="lm-modal-header">
                    <h3><i class="fas fa-print"></i> Printable Hospital Leave Clearance Slip</h3>
                    <div>
                        <button class="lm-btn lm-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Slip</button>
                        <button class="lm-modal-close" id="lmBtnClosePrintModal">&times;</button>
                    </div>
                </div>
                <div class="lm-printable-content" id="lmPrintableContent"></div>
            </div>
        </div>
    `;

    attachEventHandlers();
    updateQuotaHint();
}

/**
 * Render Requests & Coverage Ledger Table
 */
function renderRequestsPanel() {
    const records = cache.requestsData?.records || [];

    return `
        <!-- Filter Bar -->
        <div class="lm-filter-bar">
            <div class="lm-filter-group">
                <label>Department:</label>
                <select id="lmFilterDept" class="lm-select">
                    <option value="0">All Departments</option>
                    ${cache.metadata.departments.map(d => `<option value="${d.id}" ${state.departmentId == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join("")}
                </select>
            </div>

            <div class="lm-filter-group">
                <label>Leave Type:</label>
                <select id="lmFilterType" class="lm-select">
                    <option value="">All Categories</option>
                    <option value="vacation" ${state.leaveTypeFilter === 'vacation' ? 'selected' : ''}>Vacation Leave</option>
                    <option value="sick" ${state.leaveTypeFilter === 'sick' ? 'selected' : ''}>Sick Leave</option>
                    <option value="study_cme" ${state.leaveTypeFilter === 'study_cme' ? 'selected' : ''}>Study / CME Leave</option>
                    <option value="emergency" ${state.leaveTypeFilter === 'emergency' ? 'selected' : ''}>Emergency Leave</option>
                    <option value="maternity_paternity" ${state.leaveTypeFilter === 'maternity_paternity' ? 'selected' : ''}>Maternity / Paternity</option>
                    <option value="unpaid" ${state.leaveTypeFilter === 'unpaid' ? 'selected' : ''}>Unpaid Leave</option>
                </select>
            </div>

            <div class="lm-filter-group">
                <label>Status:</label>
                <select id="lmFilterStatus" class="lm-select">
                    <option value="">All Statuses</option>
                    <option value="pending_approval" ${state.statusFilter === 'pending_approval' ? 'selected' : ''}>Pending Approval</option>
                    <option value="approved" ${state.statusFilter === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="rejected" ${state.statusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="cancelled" ${state.statusFilter === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>

            <div class="lm-filter-group" style="display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="lmFilterCovPending" ${state.coveragePendingFilter ? 'checked' : ''}>
                <label for="lmFilterCovPending" style="cursor: pointer; font-size: 0.8125rem;">Coverage Pending Ack</label>
            </div>

            <div class="lm-filter-group" style="margin-left: auto;">
                <input type="text" id="lmSearchInput" class="lm-input" placeholder="Search leave code, name, reason..." value="${escapeHtml(state.searchQuery)}">
            </div>
        </div>

        <!-- Requests Table -->
        <div class="lm-table-container">
            <table class="lm-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Staff Member &amp; Unit</th>
                        <th>Leave Category</th>
                        <th>Dates &amp; Duration</th>
                        <th>Covering Colleague</th>
                        <th>Coverage Ack</th>
                        <th>Clinical Justification</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length === 0 ? `
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                                <i class="fas fa-folder-open" style="font-size: 28px; margin-bottom: 8px;"></i>
                                <div>No leave applications match current filters.</div>
                            </td>
                        </tr>
                    ` : records.map(r => `
                        <tr>
                            <td><span class="lm-code-badge">${escapeHtml(r.leave_code)}</span></td>
                            <td>
                                <div class="lm-staff-cell">
                                    <div class="lm-staff-name">${escapeHtml(r.staff_name)}</div>
                                    <div class="lm-staff-dept">${escapeHtml(r.department_name || 'Staff')}</div>
                                </div>
                            </td>
                            <td>${formatLeaveTypeBadge(r.leave_type)}</td>
                            <td>
                                <div class="lm-date-cell">
                                    <strong>${r.start_date}</strong> to <strong>${r.end_date}</strong>
                                    <span class="lm-days-badge">${parseFloat(r.total_days).toFixed(1)} Days</span>
                                </div>
                            </td>
                            <td>
                                ${r.covering_staff_name ? `
                                    <div style="font-weight: 600; color: #0284c7;">
                                        <i class="fas fa-user-check"></i> ${escapeHtml(r.covering_staff_name)}
                                    </div>
                                    <div class="lm-cov-notes">${escapeHtml(r.coverage_notes || 'Full handover')}</div>
                                ` : `
                                    <span style="color: #94a3b8;">None required</span>
                                `}
                            </td>
                            <td>${formatCoverageStatusBadge(r.coverage_status)}</td>
                            <td style="max-width: 220px;">${escapeHtml(r.reason)}</td>
                            <td>${formatStatusBadge(r.status)}</td>
                            <td>
                                <div class="lm-action-buttons">
                                    ${r.coverage_status === 'pending_colleague_ack' ? `
                                        <button class="lm-btn lm-btn-xs lm-btn-info lm-btn-cov-ack" data-id="${r.id}" title="Acknowledge you will cover this shift">
                                            <i class="fas fa-handshake"></i> Ack Coverage
                                        </button>
                                    ` : ''}

                                    ${r.status === 'pending_approval' ? `
                                        <button class="lm-btn lm-btn-xs lm-btn-success lm-btn-approve-leave" data-id="${r.id}" title="Approve Request">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="lm-btn lm-btn-xs lm-btn-danger lm-btn-reject-leave" data-id="${r.id}" title="Reject Request">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : `
                                        <span style="font-size: 0.75rem; color: #64748b;">${r.status === 'approved' ? `Approved ${r.approved_at || ''}` : 'Resolved'}</span>
                                    `}
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
 * Render Annual Leave Quota Balances Panel
 */
function renderBalancesPanel() {
    const balances = cache.quotaBalances || [];

    return `
        <div class="lm-balances-wrap">
            <div class="lm-balances-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <label style="font-weight: 700; color: #0f172a;">Inspect Staff Member Quotas:</label>
                    <select id="lmSelectQuotaStaff" class="lm-select" style="min-width: 260px;">
                        ${cache.metadata.staff.map(s => `
                            <option value="${s.id}" ${state.selectedQuotaEmployeeId == s.id ? 'selected' : ''}>
                                ${escapeHtml(s.full_name)} (${escapeHtml(s.department_name || 'Staff')})
                            </option>
                        `).join("")}
                    </select>
                </div>
                <div style="font-size: 0.8125rem; color: #64748b;">
                    Fiscal Year <strong>2026</strong> Annual Leave Allowance &bull; Hospital Governance Compliant
                </div>
            </div>

            <div class="lm-quota-grid">
                ${balances.map(b => {
                    const totalAvail = parseFloat(b.total_entitled) + parseFloat(b.carried_over);
                    const rem = parseFloat(b.remaining_balance);
                    const used = parseFloat(b.used_days);
                    const pending = parseFloat(b.pending_days);
                    const pct = totalAvail > 0 ? Math.min(100, Math.round((rem / totalAvail) * 100)) : 0;

                    return `
                        <div class="lm-quota-card">
                            <div class="lm-qc-header">
                                <span class="lm-qc-title">${formatLeaveTypeBadge(b.leave_type)}</span>
                                <span class="lm-qc-pct">${pct}% Available</span>
                            </div>

                            <div class="lm-qc-balance">
                                <div class="lm-qc-rem">${rem.toFixed(1)} <span class="lm-qc-sub">Days Left</span></div>
                                <div class="lm-qc-bar-bg">
                                    <div class="lm-qc-bar-fill" style="width: ${pct}%;"></div>
                                </div>
                            </div>

                            <div class="lm-qc-details">
                                <div class="lm-qcd-row">
                                    <span>Annual Entitled:</span>
                                    <strong>${parseFloat(b.total_entitled).toFixed(1)} d</strong>
                                </div>
                                <div class="lm-qcd-row">
                                    <span>Carried Over:</span>
                                    <strong>+${parseFloat(b.carried_over).toFixed(1)} d</strong>
                                </div>
                                <div class="lm-qcd-row">
                                    <span>Used / Deducted:</span>
                                    <strong style="color: #dc2626;">-${used.toFixed(1)} d</strong>
                                </div>
                                <div class="lm-qcd-row">
                                    <span>Pending Approval:</span>
                                    <strong style="color: #d97706;">${pending.toFixed(1)} d</strong>
                                </div>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function formatLeaveTypeBadge(type) {
    switch (type) {
        case "vacation":
            return `<span class="lm-badge lm-b-vac"><i class="fas fa-umbrella-beach"></i> Vacation</span>`;
        case "sick":
            return `<span class="lm-badge lm-b-sick"><i class="fas fa-heartbeat"></i> Sick Leave</span>`;
        case "study_cme":
            return `<span class="lm-badge lm-b-cme"><i class="fas fa-graduation-cap"></i> Study / CME</span>`;
        case "emergency":
            return `<span class="lm-badge lm-b-emg"><i class="fas fa-exclamation-triangle"></i> Emergency</span>`;
        case "maternity_paternity":
            return `<span class="lm-badge lm-b-mat"><i class="fas fa-baby"></i> Maternity / Pat</span>`;
        case "bereavement":
            return `<span class="lm-badge lm-b-ber"><i class="fas fa-cross"></i> Bereavement</span>`;
        case "unpaid":
            return `<span class="lm-badge lm-b-unpaid"><i class="fas fa-clock"></i> Unpaid</span>`;
        default:
            return `<span class="lm-badge">${type}</span>`;
    }
}

function formatCoverageStatusBadge(status) {
    switch (status) {
        case "acknowledged":
            return `<span class="lm-cov-badge lm-cb-ack"><i class="fas fa-check-circle"></i> Acknowledged</span>`;
        case "pending_colleague_ack":
            return `<span class="lm-cov-badge lm-cb-pend"><i class="fas fa-hourglass-half"></i> Pending Ack</span>`;
        case "declined":
            return `<span class="lm-cov-badge lm-cb-dec"><i class="fas fa-times-circle"></i> Declined</span>`;
        case "not_required":
            return `<span style="font-size: 0.75rem; color: #94a3b8;">N/A</span>`;
        default:
            return `<span class="lm-cov-badge">${status}</span>`;
    }
}

function formatStatusBadge(status) {
    switch (status) {
        case "approved":
            return `<span class="lm-status-badge lm-sb-approved">APPROVED</span>`;
        case "pending_approval":
            return `<span class="lm-status-badge lm-sb-pending">PENDING</span>`;
        case "rejected":
            return `<span class="lm-status-badge lm-sb-rejected">REJECTED</span>`;
        case "cancelled":
            return `<span class="lm-status-badge lm-sb-cancelled">CANCELLED</span>`;
        default:
            return `<span class="lm-status-badge">${status.toUpperCase()}</span>`;
    }
}

/**
 * Event Handlers Wiring
 */
function attachEventHandlers() {
    // Tabs
    document.querySelectorAll(".lm-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.dataset.tab;
            renderModule();
        });
    });

    // Filters
    document.getElementById("lmFilterDept")?.addEventListener("change", (e) => {
        state.departmentId = parseInt(e.target.value, 10) || 0;
        refreshRequests();
    });

    document.getElementById("lmFilterType")?.addEventListener("change", (e) => {
        state.leaveTypeFilter = e.target.value;
        refreshRequests();
    });

    document.getElementById("lmFilterStatus")?.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        refreshRequests();
    });

    document.getElementById("lmFilterCovPending")?.addEventListener("change", (e) => {
        state.coveragePendingFilter = e.target.checked;
        refreshRequests();
    });

    document.getElementById("lmSearchInput")?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        refreshRequests();
    });

    // Quota staff selector
    document.getElementById("lmSelectQuotaStaff")?.addEventListener("change", async (e) => {
        state.selectedQuotaEmployeeId = parseInt(e.target.value, 10);
        await reloadQuotaBalances();
    });

    // Form inputs and date calculations
    const startInput = document.getElementById("lmFormStartDate");
    const endInput = document.getElementById("lmFormEndDate");
    const daysInput = document.getElementById("lmFormTotalDays");
    const typeSelect = document.getElementById("lmFormType");
    const staffSelect = document.getElementById("lmFormStaff");

    const updateDays = () => {
        if (startInput && endInput && daysInput && startInput.value && endInput.value) {
            const s = new Date(startInput.value);
            const e = new Date(endInput.value);
            if (e >= s) {
                const diff = (e - s) / (1000 * 3600 * 24) + 1;
                daysInput.value = diff;
            }
        }
    };

    startInput?.addEventListener("change", updateDays);
    endInput?.addEventListener("change", updateDays);
    typeSelect?.addEventListener("change", updateQuotaHint);
    staffSelect?.addEventListener("change", (e) => {
        state.selectedQuotaEmployeeId = parseInt(e.target.value, 10) || 101;
        updateQuotaHint();
    });

    // Open/Close Request Modal
    document.getElementById("lmBtnNewRequest")?.addEventListener("click", () => {
        const m = document.getElementById("lmModalRequest");
        if (m) m.style.display = "flex";
        updateQuotaHint();
    });

    document.getElementById("lmBtnCloseReqModal")?.addEventListener("click", closeRequestModal);
    document.getElementById("lmBtnCancelReq")?.addEventListener("click", closeRequestModal);

    // Form Submit
    document.getElementById("lmFormRequest")?.addEventListener("submit", handleRequestSubmit);

    // Coverage Acknowledge Action
    document.querySelectorAll(".lm-btn-cov-ack").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Confirm: You acknowledge and agree to cover this colleague's clinical duties during their leave?")) {
                try {
                    await api(`/leave/requests/coverage-ack`, { method: "POST", body: { id, accepted: true } });
                    alert("Coverage acknowledged successfully.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to acknowledge coverage: " + (err.message || err));
                }
            }
        });
    });

    // Supervisor Approve
    document.querySelectorAll(".lm-btn-approve-leave").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Approve this leave request and deduct the days from the staff member's quota balance?")) {
                try {
                    await api(`/leave/requests/approve`, { method: "POST", body: { id } });
                    alert("Leave request approved.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to approve leave: " + (err.message || err));
                }
            }
        });
    });

    // Supervisor Reject
    document.querySelectorAll(".lm-btn-reject-leave").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const reason = prompt("Enter justification for rejecting this leave request:");
            if (reason) {
                try {
                    await api(`/leave/requests/reject`, { method: "POST", body: { id, reason } });
                    alert("Leave request rejected.");
                    await loadInitialData();
                } catch (err) {
                    alert("Failed to reject leave: " + (err.message || err));
                }
            }
        });
    });

    // Print Modal
    document.getElementById("lmBtnPrintSheet")?.addEventListener("click", openPrintModal);
    document.getElementById("lmBtnClosePrintModal")?.addEventListener("click", () => {
        const m = document.getElementById("lmModalPrint");
        if (m) m.style.display = "none";
    });
}

async function updateQuotaHint() {
    const hintEl = document.getElementById("lmQuotaHintBanner");
    const staffSelect = document.getElementById("lmFormStaff");
    const typeSelect = document.getElementById("lmFormType");
    if (!hintEl || !staffSelect || !typeSelect) return;

    const empId = staffSelect.value || state.selectedQuotaEmployeeId;
    const type = typeSelect.value;

    try {
        const res = await api(`/leave/balances?employee_id=${empId}`);
        const list = res?.data || [];
        const match = list.find(b => b.leave_type === type);
        if (match) {
            hintEl.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <strong>${match.leave_type.toUpperCase()} QUOTA:</strong> 
                Entitled: <strong>${parseFloat(match.total_entitled).toFixed(1)}d</strong> | 
                Used: <strong>${parseFloat(match.used_days).toFixed(1)}d</strong> | 
                Available Balance: <strong style="color: #059669; font-size: 0.9375rem;">${parseFloat(match.remaining_balance).toFixed(1)} Days Remaining</strong>
            `;
        } else {
            hintEl.innerHTML = `<i class="fas fa-info-circle"></i> Available Quota: <strong>Standard Allowance</strong>`;
        }
    } catch {
        hintEl.innerHTML = `<i class="fas fa-info-circle"></i> Checking quota balances...`;
    }
}

function closeRequestModal() {
    const m = document.getElementById("lmModalRequest");
    if (m) m.style.display = "none";
}

async function handleRequestSubmit(e) {
    e.preventDefault();

    const payload = {
        employee_id: document.getElementById("lmFormStaff").value,
        leave_type: document.getElementById("lmFormType").value,
        start_date: document.getElementById("lmFormStartDate").value,
        end_date: document.getElementById("lmFormEndDate").value,
        total_days: document.getElementById("lmFormTotalDays").value,
        covering_employee_id: document.getElementById("lmFormCoveringStaff").value,
        coverage_notes: document.getElementById("lmFormCoverageNotes").value,
        reason: document.getElementById("lmFormReason").value
    };

    try {
        const res = await api(`/leave/requests`, {
            method: "POST",
            body: payload
        });
        alert(res.data?.message || "Leave request submitted successfully!");
        closeRequestModal();
        await loadInitialData();
    } catch (err) {
        alert("Failed to submit leave request: " + (err.message || err));
    }
}

async function refreshRequests() {
    try {
        const listRes = await api(`/leave/requests?department_id=${state.departmentId}&employee_id=${state.employeeId}&leave_type=${state.leaveTypeFilter}&status=${state.statusFilter}&coverage_pending=${state.coveragePendingFilter ? '1' : ''}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`);
        cache.requestsData = listRes?.data || { total: 0, records: [], metrics: {} };
        const container = document.getElementById("lmTabRequests");
        if (container) container.innerHTML = renderRequestsPanel();
        attachEventHandlers();
    } catch (err) {
        console.error("Refresh leave requests error:", err);
    }
}

async function reloadQuotaBalances() {
    try {
        const res = await api(`/leave/balances?employee_id=${state.selectedQuotaEmployeeId}`);
        cache.quotaBalances = res?.data || [];
        const container = document.getElementById("lmTabBalances");
        if (container) container.innerHTML = renderBalancesPanel();
        attachEventHandlers();
    } catch (err) {
        console.error("Reload quota balances error:", err);
    }
}

function openPrintModal() {
    const modal = document.getElementById("lmModalPrint");
    const container = document.getElementById("lmPrintableContent");
    if (!modal || !container) return;

    const records = cache.requestsData?.records || [];

    container.innerHTML = `
        <div class="lm-print-sheet">
            <div class="lm-print-header">
                <h2>USINTELLIX HEALTHCARE SYSTEM</h2>
                <div class="lm-print-sub">CLINICAL STAFF LEAVE APPLICATION &amp; COVERAGE CLEARANCE</div>
                <div style="font-size: 0.8125rem; color: #64748b;">Hospital Workforce Governance &bull; Printed: ${new Date().toLocaleString()}</div>
            </div>

            <table class="lm-print-table">
                <thead>
                    <tr>
                        <th>Leave Code</th>
                        <th>Staff Member</th>
                        <th>Category</th>
                        <th>Inclusive Dates</th>
                        <th>Days</th>
                        <th>Covering Colleague</th>
                        <th>Coverage Ack</th>
                        <th>Reason</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td><strong>${escapeHtml(r.leave_code)}</strong></td>
                            <td>${escapeHtml(r.staff_name)} (${escapeHtml(r.department_code || 'DEPT')})</td>
                            <td>${r.leave_type.toUpperCase()}</td>
                            <td>${r.start_date} to ${r.end_date}</td>
                            <td><strong>${r.total_days}d</strong></td>
                            <td>${escapeHtml(r.covering_staff_name || 'None')}</td>
                            <td>${r.coverage_status.toUpperCase()}</td>
                            <td>${escapeHtml(r.reason)}</td>
                            <td><strong>${r.status.toUpperCase()}</strong></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="lm-print-signatures">
                <div class="lm-sig-line">
                    <div class="lm-line"></div>
                    <div>Applicant Signature</div>
                </div>
                <div class="lm-sig-line">
                    <div class="lm-line"></div>
                    <div>Covering Colleague Endorsement</div>
                </div>
                <div class="lm-sig-line">
                    <div class="lm-line"></div>
                    <div>Chief Medical Officer / HOD Sign-off</div>
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
    if (document.getElementById("lmStyles")) return;

    const style = document.createElement("style");
    style.id = "lmStyles";
    style.textContent = `
        .lm-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .lm-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .lm-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .lm-title-icon {
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

        .lm-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
        }

        .lm-subtitle {
            margin: 4px 0 0 0;
            font-size: 0.875rem;
            color: #64748b;
        }

        .lm-header-actions {
            display: flex;
            gap: 12px;
        }

        /* Buttons */
        .lm-btn {
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

        .lm-btn-primary { background: #0284c7; color: #ffffff; }
        .lm-btn-primary:hover { background: #0369a1; }
        .lm-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
        .lm-btn-outline:hover { background: #f8fafc; }
        .lm-btn-xs { padding: 4px 8px; font-size: 0.75rem; }
        .lm-btn-success { background: #059669; color: #ffffff; }
        .lm-btn-danger { background: #dc2626; color: #ffffff; }
        .lm-btn-info { background: #0284c7; color: #ffffff; }

        /* KPI Grid */
        .lm-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .lm-kpi-card {
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

        .lm-kpi-blue { border-left-color: #0284c7; }
        .lm-kpi-amber { border-left-color: #d97706; }
        .lm-kpi-purple { border-left-color: #7c3aed; }
        .lm-kpi-emerald { border-left-color: #059669; }

        .lm-kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .lm-kpi-val { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 4px 0; }
        .lm-kpi-sub { font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .lm-kpi-desc { font-size: 0.75rem; color: #94a3b8; }
        .lm-kpi-icon { font-size: 24px; opacity: 0.3; }

        /* Tabs */
        .lm-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }

        .lm-tab-btn {
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

        .lm-tab-btn:hover { color: #0f172a; background: #f1f5f9; }
        .lm-tab-btn.active { color: #0284c7; background: rgba(2, 132, 199, 0.1); }

        .lm-panel { display: none; }
        .lm-panel.active { display: block; }

        /* Filter bar */
        .lm-filter-bar {
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

        .lm-filter-group { display: flex; align-items: center; gap: 8px; }
        .lm-filter-group label { font-size: 0.8125rem; font-weight: 600; color: #475569; }

        .lm-select, .lm-input {
            padding: 6px 10px;
            font-size: 0.8125rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #0f172a;
        }

        /* Tables */
        .lm-table-container {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .lm-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
        }

        .lm-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
        }

        .lm-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .lm-table tr:hover td { background: #fafafa; }

        .lm-code-badge { font-family: monospace; font-weight: 700; color: #0284c7; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px; }
        .lm-staff-cell { display: flex; flex-direction: column; }
        .lm-staff-name { font-weight: 700; color: #0f172a; }
        .lm-staff-dept { font-size: 0.75rem; color: #64748b; }
        .lm-date-cell { display: flex; flex-direction: column; gap: 2px; }
        .lm-days-badge { display: inline-block; background: #f1f5f9; color: #334155; font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; width: fit-content; }
        .lm-cov-notes { font-size: 0.6875rem; color: #64748b; }

        /* Badges */
        .lm-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
        .lm-b-vac { background: #e0f2fe; color: #0369a1; }
        .lm-b-sick { background: #fef2f2; color: #b91c1c; }
        .lm-b-cme { background: #f5f3ff; color: #6d28d9; }
        .lm-b-emg { background: #fffbeb; color: #b45309; }
        .lm-b-mat { background: #fdf2f8; color: #be185d; }
        .lm-b-ber { background: #f1f5f9; color: #334155; }
        .lm-b-unpaid { background: #f8fafc; color: #64748b; }

        .lm-cov-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
        .lm-cb-ack { background: #ecfdf5; color: #059669; }
        .lm-cb-pend { background: #fffbeb; color: #d97706; }
        .lm-cb-dec { background: #fef2f2; color: #dc2626; }

        .lm-status-badge { font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
        .lm-sb-approved { background: #ecfdf5; color: #059669; }
        .lm-sb-pending { background: #fffbeb; color: #d97706; }
        .lm-sb-rejected, .lm-sb-cancelled { background: #fef2f2; color: #dc2626; }

        .lm-action-buttons { display: flex; gap: 6px; align-items: center; }

        /* Balances Grid */
        .lm-balances-wrap {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 24px;
        }

        .lm-balances-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
        }

        .lm-quota-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .lm-quota-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 18px;
            background: #fafafa;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .lm-qc-header { display: flex; justify-content: space-between; align-items: center; }
        .lm-qc-pct { font-size: 0.75rem; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; }
        .lm-qc-rem { font-size: 1.75rem; font-weight: 700; color: #0f172a; }
        .lm-qc-sub { font-size: 0.875rem; color: #64748b; font-weight: 500; }

        .lm-qc-bar-bg { width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 6px; }
        .lm-qc-bar-fill { height: 100%; background: #0284c7; border-radius: 999px; transition: width 0.3s ease; }

        .lm-qc-details {
            border-top: 1px dashed #cbd5e1;
            padding-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.75rem;
            color: #475569;
        }

        .lm-qcd-row { display: flex; justify-content: space-between; }

        /* Modal */
        .lm-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(2px);
        }

        .lm-modal-box {
            background: #ffffff;
            border-radius: 12px;
            width: 100%; max-width: 650px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            overflow: hidden; max-height: 90vh;
            display: flex; flex-direction: column;
        }

        .lm-modal-lg { max-width: 900px; }

        .lm-modal-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }

        .lm-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .lm-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

        .lm-form { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .lm-form-row { display: flex; gap: 16px; }
        .lm-form-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .lm-form-group label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .lm-req { color: #dc2626; }

        .lm-textarea { padding: 8px 10px; font-size: 0.8125rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; font-family: inherit; }

        .lm-quota-hint {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 0.8125rem;
            color: #166534;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .lm-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

        /* Printable */
        .lm-printable-content { padding: 24px; overflow-y: auto; }
        .lm-print-sheet { background: #ffffff; color: #000000; }
        .lm-print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000000; padding-bottom: 12px; }
        .lm-print-header h2 { margin: 0; font-size: 1.25rem; }
        .lm-print-sub { font-size: 1rem; font-weight: 700; margin-top: 4px; }

        .lm-print-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .lm-print-table th, .lm-print-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        .lm-print-table th { background: #f1f5f9; font-weight: 700; }

        .lm-print-signatures { display: flex; justify-content: space-around; margin-top: 48px; }
        .lm-sig-line { text-align: center; font-size: 0.75rem; font-weight: 600; width: 200px; }
        .lm-line { border-bottom: 1px solid #000000; margin-bottom: 6px; }

        @media print {
            body * { visibility: hidden; }
            #lmModalPrint, #lmModalPrint * { visibility: visible; }
            #lmModalPrint { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
            .lm-modal-header { display: none; }
        }
    `;

    document.head.appendChild(style);
}
