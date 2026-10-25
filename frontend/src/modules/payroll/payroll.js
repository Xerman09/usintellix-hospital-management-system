/**
 * Master Payroll Computation & Confidential Employee Payslips Module
 * Schema: hr_payroll_runs, hr_payslips, hr_payslip_items
 * Formula:
 *   "Gross Pay" = "Base Salary" + "Overtime" + "Night Diff" + "Allowances" + "Doctor Commissions"
 *   "Net Pay" = "Gross Pay" - ("Tax Withholdings" + "Social Security/Health Ins" + "Deductions")
 */

import { api } from "../../core/api.js?v=10";

let state = {
    activeTab: "runs", // 'runs' | 'run_detail' | 'my_payslips'
    statusFilter: "",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedRunId: null,
    selectedRun: null,
    selectedPayslip: null,
    myEmployeeId: 101, // Default to first doctor / employee
    myPayslipsList: []
};

let cache = {
    runsData: null,
    departments: []
};

export function PayrollView() {
    return `<div class="pr-root" id="payrollRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Payroll Runs &amp; Employee Payslips...</div>
        </div>
    </div>`;
}

export async function initPayroll() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("payrollRoot");
    if (!root) return;

    try {
        const [runsRes, metaRes] = await Promise.all([
            api(`/payroll/runs?status=${state.statusFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/payroll/metadata`).catch(() => null)
        ]);

        cache.runsData = runsRes?.data || { total: 0, runs: [], metrics: {} };
        cache.departments = metaRes?.data?.departments || [];

        // Pre-fetch default run detail if exists
        if (cache.runsData.runs.length > 0 && !state.selectedRunId) {
            state.selectedRunId = cache.runsData.runs[0].id;
            await loadRunDetail(state.selectedRunId);
        }

        renderModule();
    } catch (err) {
        console.error("Failed to load payroll data:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load Payroll: ${err.message || err}</div>`;
    }
}

async function loadRunDetail(runId) {
    try {
        const res = await api(`/payroll/runs/detail?id=${runId}`);
        state.selectedRun = res?.data || null;
    } catch (err) {
        console.error("Failed to load run detail:", err);
    }
}

async function loadPayslipDetail(payslipId) {
    try {
        const res = await api(`/payroll/payslips/detail?id=${payslipId}`);
        state.selectedPayslip = res?.data || null;
        openPayslipModal();
    } catch (err) {
        alert("Failed to load confidential payslip: " + (err.message || err));
    }
}

async function loadMyPayslips() {
    try {
        const res = await api(`/payroll/payslips/my-history?employee_id=${state.myEmployeeId}`);
        state.myPayslipsList = res?.data || [];
    } catch (err) {
        console.error("Failed to load employee payslips:", err);
    }
}

function renderModule() {
    const root = document.getElementById("payrollRoot");
    if (!root) return;

    const m = cache.runsData?.metrics || {};
    const totalRuns = parseInt(m.total_runs || 0, 10);
    const lifeGross = parseFloat(m.lifetime_gross_pay || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const lifeNet = parseFloat(m.lifetime_net_pay || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const lifeComms = parseFloat(m.lifetime_doctor_commissions || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const disbursedRuns = parseInt(m.disbursed_runs || 0, 10);
    const pendingRuns = parseInt(m.pending_runs || 0, 10);

    root.innerHTML = `
        <div class="pr-container">
            <!-- Header -->
            <div class="pr-header">
                <div>
                    <div class="pr-title-row">
                        <span class="pr-title-icon">
                            <i class="fas fa-money-check-alt"></i>
                        </span>
                        <div>
                            <h1 class="pr-title">Hospital Payroll Computation &amp; Confidential Payslips</h1>
                            <p class="pr-subtitle">Automated computation of base pay, overtime (1.25x), night differentials (1.30x), doctor commissions, statutory taxes &amp; PDF payslip disbursement.</p>
                        </div>
                    </div>
                </div>
                <div class="pr-header-actions">
                    <button class="pr-btn pr-btn-primary" id="prBtnNewRun">
                        <i class="fas fa-calculator"></i> Calculate New Payroll Run
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="pr-kpi-grid">
                <div class="pr-kpi-card pr-kpi-blue">
                    <div class="pr-kpi-content">
                        <div class="pr-kpi-label">Master Payroll Runs</div>
                        <div class="pr-kpi-val">${totalRuns} <span class="pr-kpi-sub">Cycles</span></div>
                        <div class="pr-kpi-desc">${disbursedRuns} Disbursed &bull; ${pendingRuns} Pending Review</div>
                    </div>
                    <div class="pr-kpi-icon"><i class="fas fa-history"></i></div>
                </div>

                <div class="pr-kpi-card pr-kpi-emerald">
                    <div class="pr-kpi-content">
                        <div class="pr-kpi-label">Total Net Disbursed</div>
                        <div class="pr-kpi-val">${lifeNet}</div>
                        <div class="pr-kpi-desc">Net salary &amp; physician payout</div>
                    </div>
                    <div class="pr-kpi-icon"><i class="fas fa-wallet"></i></div>
                </div>

                <div class="pr-kpi-card pr-kpi-purple">
                    <div class="pr-kpi-content">
                        <div class="pr-kpi-label">Total Gross Computed</div>
                        <div class="pr-kpi-val">${lifeGross}</div>
                        <div class="pr-kpi-desc">Base, overtime, night diff &amp; stipends</div>
                    </div>
                    <div class="pr-kpi-icon"><i class="fas fa-chart-line"></i></div>
                </div>

                <div class="pr-kpi-card pr-kpi-amber">
                    <div class="pr-kpi-content">
                        <div class="pr-kpi-label">Doctor Case Commissions</div>
                        <div class="pr-kpi-val">${lifeComms}</div>
                        <div class="pr-kpi-desc">Settled clinical shares from Subsystem 6</div>
                    </div>
                    <div class="pr-kpi-icon"><i class="fas fa-stethoscope"></i></div>
                </div>
            </div>

            <!-- Workspace Tabs -->
            <div class="pr-tabs">
                <button class="pr-tab-btn ${state.activeTab === 'runs' ? 'active' : ''}" data-tab="runs">
                    <i class="fas fa-layer-group"></i> Master Payroll Runs Ledger
                </button>
                <button class="pr-tab-btn ${state.activeTab === 'run_detail' ? 'active' : ''}" data-tab="run_detail">
                    <i class="fas fa-receipt"></i> Run Payslips Breakdown ${state.selectedRun ? `(#${state.selectedRun.run_number})` : ''}
                </button>
                <button class="pr-tab-btn ${state.activeTab === 'my_payslips' ? 'active' : ''}" data-tab="my_payslips">
                    <i class="fas fa-user-lock"></i> Employee Confidential Self-Service
                </button>
            </div>

            <!-- Tab 1: Runs Ledger -->
            <div id="prTabRuns" class="pr-panel ${state.activeTab === 'runs' ? 'active' : ''}">
                ${renderRunsPanel()}
            </div>

            <!-- Tab 2: Run Payslips Detail -->
            <div id="prTabRunDetail" class="pr-panel ${state.activeTab === 'run_detail' ? 'active' : ''}">
                ${renderRunDetailPanel()}
            </div>

            <!-- Tab 3: My Payslips -->
            <div id="prTabMyPayslips" class="pr-panel ${state.activeTab === 'my_payslips' ? 'active' : ''}">
                ${renderMyPayslipsPanel()}
            </div>
        </div>

        <!-- Calculate New Payroll Run Modal -->
        <div id="prModalNewRun" class="pr-modal-backdrop" style="display: none;">
            <div class="pr-modal-box">
                <div class="pr-modal-header">
                    <h3><i class="fas fa-calculator"></i> Calculate New Payroll Run</h3>
                    <button class="pr-modal-close" id="prBtnCloseNewRunModal">&times;</button>
                </div>
                <form id="prFormNewRun" class="pr-form">
                    <div class="pr-form-group">
                        <label>Payroll Run Title <span class="pr-req">*</span></label>
                        <input type="text" id="prFormTitle" class="pr-input" required placeholder="e.g. November 2026 Semi-Monthly Payroll (1st Half)">
                    </div>

                    <div class="pr-form-row">
                        <div class="pr-form-group">
                            <label>Period Start <span class="pr-req">*</span></label>
                            <input type="date" id="prFormStart" class="pr-input" required value="2026-11-01">
                        </div>
                        <div class="pr-form-group">
                            <label>Period End <span class="pr-req">*</span></label>
                            <input type="date" id="prFormEnd" class="pr-input" required value="2026-11-15">
                        </div>
                    </div>

                    <div class="pr-form-row">
                        <div class="pr-form-group">
                            <label>Disbursement Payout Date <span class="pr-req">*</span></label>
                            <input type="date" id="prFormPayout" class="pr-input" required value="2026-11-20">
                        </div>
                        <div class="pr-form-group">
                            <label>Pay Frequency <span class="pr-req">*</span></label>
                            <select id="prFormFreq" class="pr-select" required>
                                <option value="semi_monthly">Semi-Monthly (15-day cycle)</option>
                                <option value="monthly">Monthly (Full-month cycle)</option>
                                <option value="bi_weekly">Bi-Weekly (14 days)</option>
                                <option value="weekly">Weekly (7 days)</option>
                            </select>
                        </div>
                    </div>

                    <div class="pr-form-group">
                        <label>Scope / Department:</label>
                        <select id="prFormDept" class="pr-select">
                            <option value="">-- All Departments (Hospital-Wide Run) --</option>
                            ${cache.departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("")}
                        </select>
                    </div>

                    <div class="pr-form-group">
                        <label>Notes / Executive Memo:</label>
                        <textarea id="prFormNotes" class="pr-input" rows="2" placeholder="Audit remarks, special bonuses, or regulatory notes..."></textarea>
                    </div>

                    <div class="pr-modal-actions">
                        <button type="button" class="pr-btn pr-btn-outline" id="prBtnCancelNewRun">Cancel</button>
                        <button type="submit" class="pr-btn pr-btn-primary" id="prBtnSubmitCalculate">
                            <i class="fas fa-play"></i> Compute &amp; Generate Payslips
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Confidential Payslip Modal / Printable PDF View -->
        <div id="prModalPayslip" class="pr-modal-backdrop" style="display: none;">
            <div class="pr-modal-box pr-modal-lg">
                <div class="pr-modal-header">
                    <h3><i class="fas fa-file-invoice-dollar"></i> Employee Confidential Payslip</h3>
                    <div>
                        <button class="pr-btn pr-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Download / Print PDF</button>
                        <button class="pr-modal-close" id="prBtnClosePayslipModal">&times;</button>
                    </div>
                </div>
                <div class="pr-printable-content" id="prPrintablePayslipContent"></div>
            </div>
        </div>
    `;

    attachEventHandlers();
}

/**
 * Render Master Payroll Runs Ledger Panel
 */
function renderRunsPanel() {
    const runs = cache.runsData?.runs || [];

    return `
        <!-- Filter Bar -->
        <div class="pr-filter-bar">
            <div class="pr-filter-group">
                <label>Status:</label>
                <select id="prFilterStatus" class="pr-select">
                    <option value="" ${state.statusFilter === '' ? 'selected' : ''}>All Runs</option>
                    <option value="calculated" ${state.statusFilter === 'calculated' ? 'selected' : ''}>Calculated (Pending Review)</option>
                    <option value="approved" ${state.statusFilter === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="disbursed" ${state.statusFilter === 'disbursed' ? 'selected' : ''}>Disbursed / Paid</option>
                </select>
            </div>

            <div class="pr-search-box">
                <i class="fas fa-search pr-search-icon"></i>
                <input type="text" id="prSearchInput" class="pr-input pr-search-input" placeholder="Search Run Number or Title..." value="${escapeHtml(state.searchQuery)}">
            </div>
        </div>

        <!-- Table of Runs -->
        <div class="pr-table-container">
            <table class="pr-table">
                <thead>
                    <tr>
                        <th>Run #</th>
                        <th>Cycle Title &amp; Scope</th>
                        <th>Pay Period</th>
                        <th>Payout Date</th>
                        <th style="text-align: center;">Staff Count</th>
                        <th style="text-align: right;">Total Gross Pay</th>
                        <th style="text-align: right;">Total Deductions</th>
                        <th style="text-align: right;">Total Net Pay</th>
                        <th style="text-align: center;">Status</th>
                        <th style="text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${runs.length === 0 ? `
                        <tr>
                            <td colspan="10" style="text-align: center; color: #64748b; padding: 40px;">
                                No payroll runs found matching the filter criteria.
                            </td>
                        </tr>
                    ` : runs.map(r => `
                        <tr>
                            <td><span class="pr-code-badge">${escapeHtml(r.run_number)}</span></td>
                            <td>
                                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(r.title)}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">
                                    ${r.department_name ? `<i class="fas fa-building"></i> ${escapeHtml(r.department_name)}` : '<i class="fas fa-hospital"></i> Hospital-Wide'} &bull;
                                    <span style="text-transform: uppercase;">${r.pay_frequency.replace(/_/g, ' ')}</span>
                                </div>
                            </td>
                            <td style="white-space: nowrap; font-size: 0.8125rem;">
                                ${r.period_start} &bull; ${r.period_end}
                            </td>
                            <td style="white-space: nowrap; font-size: 0.8125rem; font-weight: 600;">
                                ${r.payout_date}
                            </td>
                            <td style="text-align: center; font-weight: 700;">
                                <span class="pr-badge pr-b-staff">${r.total_employees} staff</span>
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #0f172a;">
                                $${parseFloat(r.total_gross_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td style="text-align: right; color: #dc2626; font-weight: 600;">
                                -$${parseFloat(r.total_deductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td style="text-align: right; font-weight: 800; color: #166534; font-size: 0.9375rem;">
                                $${parseFloat(r.total_net_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td style="text-align: center;">
                                ${formatRunStatusBadge(r.status)}
                            </td>
                            <td style="text-align: center;">
                                <div class="pr-actions" style="justify-content: center;">
                                    <button class="pr-btn pr-btn-xs pr-btn-outline pr-btn-view-run" data-id="${r.id}" title="View Payslips in this Run">
                                        <i class="fas fa-list"></i> Payslips
                                    </button>
                                    ${r.status === 'calculated' ? `
                                        <button class="pr-btn pr-btn-xs pr-btn-primary pr-btn-approve-run" data-id="${r.id}" title="Approve Run">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                    ` : ''}
                                    ${r.status === 'approved' ? `
                                        <button class="pr-btn pr-btn-xs pr-btn-emerald pr-btn-disburse-run" data-id="${r.id}" title="Disburse Net Pay &amp; Mark Paid">
                                            <i class="fas fa-dollar-sign"></i> Disburse
                                        </button>
                                    ` : ''}
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
 * Render Run Detail with Individual Payslips Table
 */
function renderRunDetailPanel() {
    const run = state.selectedRun;
    if (!run) {
        return `<div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-receipt" style="font-size: 32px; opacity: 0.4;"></i>
            <div style="margin-top: 10px;">Select a payroll run from the Master Ledger to view individual employee payslips.</div>
        </div>`;
    }

    const payslips = run.payslips || [];

    return `
        <!-- Run Banner Info -->
        <div class="pr-run-banner">
            <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="pr-code-badge" style="font-size: 0.875rem;">#${escapeHtml(run.run_number)}</span>
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800;">${escapeHtml(run.title)}</h2>
                    ${formatRunStatusBadge(run.status)}
                </div>
                <div style="font-size: 0.8125rem; color: #64748b; margin-top: 4px;">
                    <strong>Period:</strong> ${run.period_start} to ${run.period_end} &bull;
                    <strong>Disbursement Date:</strong> ${run.payout_date} &bull;
                    <strong>Total Staff:</strong> ${run.total_employees} &bull;
                    ${run.department_name ? `Department: ${escapeHtml(run.department_name)}` : 'Hospital-Wide'}
                </div>
            </div>

            <div style="display: flex; gap: 16px; align-items: center;">
                <div style="text-align: right;">
                    <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Total Net Outflow</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #166534;">
                        $${parseFloat(run.total_net_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                </div>

                ${run.status === 'calculated' ? `
                    <button class="pr-btn pr-btn-primary pr-btn-approve-run" data-id="${run.id}">
                        <i class="fas fa-check-double"></i> Approve Run
                    </button>
                ` : ''}

                ${run.status === 'approved' ? `
                    <button class="pr-btn pr-btn-emerald pr-btn-disburse-run" data-id="${run.id}">
                        <i class="fas fa-money-bill-wave"></i> Disburse &amp; Mark Paid
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Payslips Table -->
        <div class="pr-table-container" style="margin-top: 16px;">
            <table class="pr-table">
                <thead>
                    <tr>
                        <th>Payslip #</th>
                        <th>Staff Member &amp; Title</th>
                        <th>Classification</th>
                        <th style="text-align: right;">Base Pay</th>
                        <th style="text-align: right;">Overtime &amp; ND</th>
                        <th style="text-align: right;">Allowances</th>
                        <th style="text-align: right;">Doctor Comm.</th>
                        <th style="text-align: right;">Gross Pay</th>
                        <th style="text-align: right;">Deductions</th>
                        <th style="text-align: right;">Net Pay</th>
                        <th style="text-align: center;">Status</th>
                        <th style="text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${payslips.map(p => `
                        <tr>
                            <td><span class="pr-code-badge">${escapeHtml(p.payslip_number)}</span></td>
                            <td>
                                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(p.staff_name)}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(p.job_title || p.department_name || 'Hospital Staff')}</div>
                            </td>
                            <td>${formatStaffTypeBadge(p.employment_type)}</td>
                            <td style="text-align: right; font-weight: 600;">$${parseFloat(p.base_salary_amount).toFixed(2)}</td>
                            <td style="text-align: right; color: #d97706; font-size: 0.8125rem;">
                                +$${(parseFloat(p.overtime_amount) + parseFloat(p.night_diff_amount)).toFixed(2)}
                            </td>
                            <td style="text-align: right; color: #4338ca; font-size: 0.8125rem;">
                                +$${parseFloat(p.fixed_allowances_amount).toFixed(2)}
                            </td>
                            <td style="text-align: right; color: #0284c7; font-weight: 600;">
                                ${parseFloat(p.doctor_commissions_amount) > 0 ? `+$${parseFloat(p.doctor_commissions_amount).toFixed(2)}` : '-'}
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #0f172a;">
                                $${parseFloat(p.gross_pay).toFixed(2)}
                            </td>
                            <td style="text-align: right; color: #dc2626; font-size: 0.8125rem;">
                                -$${parseFloat(p.total_deductions).toFixed(2)}
                            </td>
                            <td style="text-align: right; font-weight: 800; color: #166534; font-size: 0.9375rem;">
                                $${parseFloat(p.net_pay).toFixed(2)}
                            </td>
                            <td style="text-align: center;">${formatPayslipStatusBadge(p.status)}</td>
                            <td style="text-align: center;">
                                <button class="pr-btn pr-btn-xs pr-btn-primary pr-btn-view-ps" data-id="${p.id}" title="View Confidential Payslip">
                                    <i class="fas fa-file-invoice"></i> Payslip
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render Employee Confidential Self-Service Panel
 */
function renderMyPayslipsPanel() {
    return `
        <div class="pr-self-container">
            <div class="pr-self-header">
                <div>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;"><i class="fas fa-lock"></i> Confidential Employee Payslips Vault</h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: #64748b;">View and download verified semi-monthly payslips with full itemized breakdown.</p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="font-size: 0.8125rem; font-weight: 600;">Switch Employee View:</label>
                    <select id="prSelfEmployeeSelect" class="pr-select">
                        <option value="101" ${state.myEmployeeId == 101 ? 'selected' : ''}>Dr. Marcus Vance (Internal Medicine)</option>
                        <option value="102" ${state.myEmployeeId == 102 ? 'selected' : ''}>Dr. Elena Rostova (Surgery)</option>
                        <option value="103" ${state.myEmployeeId == 103 ? 'selected' : ''}>Dr. Jonathan Hayes (Cardiology)</option>
                        <option value="104" ${state.myEmployeeId == 104 ? 'selected' : ''}>Dr. Arthur Sterling (Anesthesiology)</option>
                        <option value="108" ${state.myEmployeeId == 108 ? 'selected' : ''}>Dr. Christopher Nolan (Orthopedics)</option>
                        <option value="110" ${state.myEmployeeId == 110 ? 'selected' : ''}>Maria Santos (Head Nurse)</option>
                        <option value="111" ${state.myEmployeeId == 111 ? 'selected' : ''}>Dr. Jennifer Reyes (OB-GYN)</option>
                    </select>
                </div>
            </div>

            <div class="pr-table-container" style="margin-top: 16px;">
                <table class="pr-table">
                    <thead>
                        <tr>
                            <th>Payslip #</th>
                            <th>Cycle Title</th>
                            <th>Pay Period</th>
                            <th>Payout Date</th>
                            <th style="text-align: right;">Gross Earnings</th>
                            <th style="text-align: right;">Total Deductions</th>
                            <th style="text-align: right;">Net Disbursement</th>
                            <th style="text-align: center;">Status</th>
                            <th style="text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.myPayslipsList.length === 0 ? `
                            <tr>
                                <td colspan="9" style="text-align: center; color: #64748b; padding: 40px;">
                                    No historical payslips found for this employee profile.
                                </td>
                            </tr>
                        ` : state.myPayslipsList.map(p => `
                            <tr>
                                <td><span class="pr-code-badge">${escapeHtml(p.payslip_number)}</span></td>
                                <td><strong>${escapeHtml(p.run_title)}</strong></td>
                                <td style="white-space: nowrap; font-size: 0.8125rem;">${p.period_start} &bull; ${p.period_end}</td>
                                <td style="white-space: nowrap; font-size: 0.8125rem; font-weight: 600;">${p.payout_date}</td>
                                <td style="text-align: right; font-weight: 700; color: #0f172a;">$${parseFloat(p.gross_pay).toFixed(2)}</td>
                                <td style="text-align: right; color: #dc2626;">-$${parseFloat(p.total_deductions).toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 800; color: #166534; font-size: 0.9375rem;">$${parseFloat(p.net_pay).toFixed(2)}</td>
                                <td style="text-align: center;">${formatPayslipStatusBadge(p.status)}</td>
                                <td style="text-align: center;">
                                    <button class="pr-btn pr-btn-xs pr-btn-primary pr-btn-view-ps" data-id="${p.id}">
                                        <i class="fas fa-file-pdf"></i> Download PDF
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Open Confidential Employee Payslip Modal with Official Printable Layout
 */
function openPayslipModal() {
    const modal = document.getElementById("prModalPayslip");
    const container = document.getElementById("prPrintablePayslipContent");
    if (!modal || !container || !state.selectedPayslip) return;

    const p = state.selectedPayslip;
    const earnings = p.earnings_breakdown || [];
    const deductions = p.deductions_breakdown || [];

    container.innerHTML = `
        <div class="pr-sheet">
            <!-- Confidential Watermark -->
            <div class="pr-watermark">CONFIDENTIAL &bull; PRIVATE</div>

            <!-- Header -->
            <div class="pr-sheet-header">
                <div class="pr-sh-brand">
                    <div class="pr-sh-logo"><i class="fas fa-hospital"></i></div>
                    <div>
                        <div class="pr-sh-title">USINTELLIX HEALTHCARE SYSTEM</div>
                        <div class="pr-sh-sub">OFFICIAL EMPLOYEE PAYSLIP &bull; FISCAL YEAR 2026</div>
                    </div>
                </div>
                <div class="pr-sh-meta">
                    <div><strong>Payslip No:</strong> ${escapeHtml(p.payslip_number)}</div>
                    <div><strong>Payroll Run:</strong> ${escapeHtml(p.run_number)}</div>
                    <div><strong>Disbursement Date:</strong> ${escapeHtml(p.payout_date)}</div>
                </div>
            </div>

            <!-- Employee Info Block -->
            <div class="pr-emp-grid">
                <div>
                    <div><span class="pr-lbl">Employee Name:</span> <strong>${escapeHtml(p.staff_name)}</strong></div>
                    <div><span class="pr-lbl">Employee ID:</span> <code>EMP-${p.employee_id}</code></div>
                    <div><span class="pr-lbl">Designation / Role:</span> ${escapeHtml(p.job_title || 'Hospital Staff')}</div>
                    <div><span class="pr-lbl">Department:</span> ${escapeHtml(p.department_name || p.department_full_name || 'Medical Services')}</div>
                </div>
                <div>
                    <div><span class="pr-lbl">Pay Period:</span> <strong>${p.period_start}</strong> to <strong>${p.period_end}</strong></div>
                    <div><span class="pr-lbl">Frequency:</span> ${p.pay_frequency.replace(/_/g, ' ').toUpperCase()}</div>
                    <div><span class="pr-lbl">Hourly Base Rate:</span> $${parseFloat(p.hourly_rate).toFixed(2)}/hr</div>
                    <div><span class="pr-lbl">TIN / Tax Status:</span> ${escapeHtml(p.tin_number || p.structure_tin || 'TIN-EXEMPT')}</div>
                </div>
                <div>
                    <div><span class="pr-lbl">Payment Method:</span> ${escapeHtml(p.payment_method.replace(/_/g, ' ').toUpperCase())}</div>
                    <div><span class="pr-lbl">Bank Name:</span> ${escapeHtml(p.bank_name || p.structure_bank || 'Hospital Clearing Bank')}</div>
                    <div><span class="pr-lbl">Account Number:</span> ${p.bank_account_no ? '****' + p.bank_account_no.slice(-4) : 'Direct Account'}</div>
                    <div><span class="pr-lbl">Status:</span> <strong>${p.status.toUpperCase()}</strong></div>
                </div>
            </div>

            <!-- Two-Column Breakdown: Earnings vs Deductions -->
            <div class="pr-breakdown-grid">
                <!-- Left: Earnings -->
                <div class="pr-box">
                    <div class="pr-box-title pr-bt-green">
                        <i class="fas fa-plus-circle"></i> EARNINGS &amp; REVENUE SHARES
                    </div>
                    <table class="pr-mini-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${earnings.map(e => `
                                <tr>
                                    <td>
                                        <div style="font-weight: 600;">${escapeHtml(e.item_name)}</div>
                                        ${e.quantity ? `<div style="font-size: 0.6875rem; color: #64748b;">${e.quantity} hrs/shifts @ $${parseFloat(e.rate || 0).toFixed(2)}</div>` : ''}
                                    </td>
                                    <td style="text-align: right; font-weight: 700; color: #0f172a;">
                                        $${parseFloat(e.amount).toFixed(2)}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                        <tfoot>
                            <tr class="pr-total-row pr-tr-green">
                                <td>TOTAL GROSS PAY:</td>
                                <td style="text-align: right;">$${parseFloat(p.gross_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Right: Deductions -->
                <div class="pr-box">
                    <div class="pr-box-title pr-bt-red">
                        <i class="fas fa-minus-circle"></i> DEDUCTIONS &amp; WITHHOLDINGS
                    </div>
                    <table class="pr-mini-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${deductions.map(d => `
                                <tr>
                                    <td>
                                        <div style="font-weight: 600;">${escapeHtml(d.item_name)}</div>
                                        ${d.notes ? `<div style="font-size: 0.6875rem; color: #64748b;">${escapeHtml(d.notes)}</div>` : ''}
                                    </td>
                                    <td style="text-align: right; font-weight: 700; color: #dc2626;">
                                        -$${parseFloat(d.amount).toFixed(2)}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                        <tfoot>
                            <tr class="pr-total-row pr-tr-red">
                                <td>TOTAL DEDUCTIONS:</td>
                                <td style="text-align: right;">-$${parseFloat(p.total_deductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Net Pay Highlight Callout -->
            <div class="pr-net-callout">
                <div>
                    <div style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Net Take-Home Pay (Disbursement Amount)</div>
                    <div style="font-size: 0.75rem; opacity: 0.85;">Deposited electronically to ${escapeHtml(p.bank_name || 'Designated Bank')} on ${p.payout_date}</div>
                </div>
                <div class="pr-net-amount">
                    $${parseFloat(p.net_pay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
            </div>

            <!-- Security & Verification Box -->
            <div class="pr-security-box">
                <div>
                    <div style="font-size: 0.6875rem; color: #64748b; font-family: monospace;">VERIFICATION HASH (SHA-256):</div>
                    <div style="font-size: 0.6875rem; font-family: monospace; color: #334155; word-break: break-all;">
                        ${p.verification_hash || 'SHA256-AUTHENTICATED-PAYSLIP-RECORD'}
                    </div>
                </div>
                <div style="font-size: 0.6875rem; color: #64748b; text-align: right;">
                    Generated on ${p.created_at || new Date().toISOString()} &bull; Strictly Confidential
                </div>
            </div>

            <!-- Official Signatures -->
            <div class="pr-signatures">
                <div class="pr-sig">
                    <div class="pr-sig-line"></div>
                    <div>Prepared by Payroll Specialist</div>
                </div>
                <div class="pr-sig">
                    <div class="pr-sig-line"></div>
                    <div>Hospital Comptroller / Internal Auditor</div>
                </div>
                <div class="pr-sig">
                    <div class="pr-sig-line"></div>
                    <div>Chief Financial Officer (CFO)</div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function formatRunStatusBadge(status) {
    switch (status) {
        case "draft":
            return `<span class="pr-badge"><i class="fas fa-file"></i> Draft</span>`;
        case "calculated":
            return `<span class="pr-badge pr-b-calc"><i class="fas fa-calculator"></i> Calculated</span>`;
        case "approved":
            return `<span class="pr-badge pr-b-app"><i class="fas fa-check-double"></i> Approved</span>`;
        case "disbursed":
            return `<span class="pr-badge pr-b-paid"><i class="fas fa-check-circle"></i> Disbursed</span>`;
        case "cancelled":
            return `<span class="pr-badge pr-b-cancel">Cancelled</span>`;
        default:
            return `<span class="pr-badge">${status}</span>`;
    }
}

function formatPayslipStatusBadge(status) {
    switch (status) {
        case "generated":
            return `<span class="pr-badge pr-b-calc"><i class="fas fa-file-invoice"></i> Generated</span>`;
        case "approved":
            return `<span class="pr-badge pr-b-app"><i class="fas fa-check"></i> Approved</span>`;
        case "paid":
            return `<span class="pr-badge pr-b-paid"><i class="fas fa-check-circle"></i> Paid</span>`;
        default:
            return `<span class="pr-badge">${status}</span>`;
    }
}

function formatStaffTypeBadge(type) {
    switch (type) {
        case "consultant_physician":
            return `<span class="pr-badge pr-b-doc"><i class="fas fa-user-md"></i> Consultant Doctor</span>`;
        case "resident_physician":
            return `<span class="pr-badge pr-b-res"><i class="fas fa-stethoscope"></i> Resident Doctor</span>`;
        case "regular_fulltime":
            return `<span class="pr-badge pr-b-staff"><i class="fas fa-user-check"></i> Regular Staff</span>`;
        case "part_time":
            return `<span class="pr-badge">Part-time</span>`;
        default:
            return `<span class="pr-badge">${type}</span>`;
    }
}

function attachEventHandlers() {
    // Tab switching
    document.querySelectorAll(".pr-tab-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            state.activeTab = btn.dataset.tab;
            if (state.activeTab === "my_payslips" && state.myPayslipsList.length === 0) {
                await loadMyPayslips();
            }
            renderModule();
        });
    });

    // Filter status
    document.getElementById("prFilterStatus")?.addEventListener("change", async (e) => {
        state.statusFilter = e.target.value;
        await loadInitialData();
    });

    // Search input
    document.getElementById("prSearchInput")?.addEventListener("input", async (e) => {
        state.searchQuery = e.target.value;
        await loadInitialData();
    });

    // View Run button
    document.querySelectorAll(".pr-btn-view-run").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            state.selectedRunId = id;
            await loadRunDetail(id);
            state.activeTab = "run_detail";
            renderModule();
        });
    });

    // Approve Run
    document.querySelectorAll(".pr-btn-approve-run").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            if (!confirm(`Are you sure you want to approve Payroll Run #${id}? This will finalize all payslips for payout.`)) return;

            try {
                const res = await api(`/payroll/runs/approve`, { method: "POST", body: { id } });
                alert(res.message || "Payroll run approved successfully.");
                await loadInitialData();
                if (state.selectedRunId === id) await loadRunDetail(id);
                renderModule();
            } catch (err) {
                alert("Approval failed: " + (err.message || err));
            }
        });
    });

    // Disburse Run
    document.querySelectorAll(".pr-btn-disburse-run").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            if (!confirm(`Confirm disbursement for Payroll Run #${id}? This will dispatch payslips and mark doctor commission vouchers as disbursed.`)) return;

            try {
                const res = await api(`/payroll/runs/disburse`, { method: "POST", body: { id } });
                alert(res.message || "Payroll run disbursed successfully.");
                await loadInitialData();
                if (state.selectedRunId === id) await loadRunDetail(id);
                renderModule();
            } catch (err) {
                alert("Disbursement failed: " + (err.message || err));
            }
        });
    });

    // View Payslip Modal
    document.querySelectorAll(".pr-btn-view-ps").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            await loadPayslipDetail(id);
        });
    });

    // Close Payslip Modal
    document.getElementById("prBtnClosePayslipModal")?.addEventListener("click", () => {
        const m = document.getElementById("prModalPayslip");
        if (m) m.style.display = "none";
    });

    // New Run Modal
    document.getElementById("prBtnNewRun")?.addEventListener("click", () => {
        const m = document.getElementById("prModalNewRun");
        if (m) m.style.display = "flex";
    });
    document.getElementById("prBtnCloseNewRunModal")?.addEventListener("click", () => {
        const m = document.getElementById("prModalNewRun");
        if (m) m.style.display = "none";
    });
    document.getElementById("prBtnCancelNewRun")?.addEventListener("click", () => {
        const m = document.getElementById("prModalNewRun");
        if (m) m.style.display = "none";
    });

    // New Run Form Submit
    document.getElementById("prFormNewRun")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("prBtnSubmitCalculate");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const payload = {
                title: document.getElementById("prFormTitle").value,
                period_start: document.getElementById("prFormStart").value,
                period_end: document.getElementById("prFormEnd").value,
                payout_date: document.getElementById("prFormPayout").value,
                pay_frequency: document.getElementById("prFormFreq").value,
                department_id: document.getElementById("prFormDept").value || undefined,
                notes: document.getElementById("prFormNotes").value || undefined
            };

            const res = await api(`/payroll/runs/calculate`, {
                method: "POST",
                body: payload
            });

            alert(`Success: Payroll run #${res.data?.run_number} computed with ${res.data?.payslips_count} payslips generated! Total Net: $${parseFloat(res.data?.totals?.total_net_pay || 0).toFixed(2)}`);

            const m = document.getElementById("prModalNewRun");
            if (m) m.style.display = "none";

            state.selectedRunId = res.data?.run_id;
            await loadInitialData();
            if (state.selectedRunId) await loadRunDetail(state.selectedRunId);
            state.activeTab = "run_detail";
            renderModule();
        } catch (err) {
            alert("Calculation failed: " + (err.message || err));
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // Self Service Employee Select
    document.getElementById("prSelfEmployeeSelect")?.addEventListener("change", async (e) => {
        state.myEmployeeId = parseInt(e.target.value, 10);
        await loadMyPayslips();
        renderModule();
    });
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
    if (document.getElementById("prStyles")) return;

    const style = document.createElement("style");
    style.id = "prStyles";
    style.textContent = `
        .pr-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .pr-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .pr-title-row { display: flex; align-items: center; gap: 14px; }
        .pr-title-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 46px; height: 46px; border-radius: 12px;
            background: rgba(2, 132, 199, 0.12); color: #0284c7; font-size: 24px;
        }
        .pr-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .pr-subtitle { margin: 4px 0 0 0; font-size: 0.875rem; color: #64748b; }
        .pr-header-actions { display: flex; gap: 10px; }

        /* Buttons */
        .pr-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 16px; font-size: 0.875rem; font-weight: 600;
            border-radius: 6px; border: none; cursor: pointer; transition: all 0.15s ease;
        }
        .pr-btn-primary { background: #0284c7; color: #ffffff; }
        .pr-btn-primary:hover { background: #0369a1; }
        .pr-btn-emerald { background: #059669; color: #ffffff; }
        .pr-btn-emerald:hover { background: #047857; }
        .pr-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
        .pr-btn-outline:hover { background: #f8fafc; }
        .pr-btn-xs { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; }

        /* KPI Grid */
        .pr-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }
        .pr-kpi-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); border-left: 4px solid #cbd5e1;
        }
        .pr-kpi-blue { border-left-color: #0284c7; }
        .pr-kpi-emerald { border-left-color: #059669; }
        .pr-kpi-purple { border-left-color: #7c3aed; }
        .pr-kpi-amber { border-left-color: #d97706; }
        .pr-kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .pr-kpi-val { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 4px 0; }
        .pr-kpi-sub { font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .pr-kpi-desc { font-size: 0.75rem; color: #94a3b8; }
        .pr-kpi-icon { font-size: 24px; opacity: 0.3; }

        /* Tabs */
        .pr-tabs {
            display: flex; gap: 8px; margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;
        }
        .pr-tab-btn {
            background: transparent; border: none; padding: 10px 16px;
            font-size: 0.9375rem; font-weight: 600; color: #64748b;
            border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
            transition: all 0.15s ease;
        }
        .pr-tab-btn:hover { background: #f1f5f9; color: #0f172a; }
        .pr-tab-btn.active { background: #0284c7; color: #ffffff; }

        .pr-panel { display: none; }
        .pr-panel.active { display: block; }

        /* Filter Bar */
        .pr-filter-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 12px 18px; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .pr-filter-group { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .pr-select, .pr-input {
            padding: 6px 10px; font-size: 0.8125rem; border: 1px solid #cbd5e1;
            border-radius: 6px; background: #ffffff; color: #0f172a;
        }
        .pr-search-box { position: relative; min-width: 260px; }
        .pr-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; }
        .pr-search-input { width: 100%; padding-left: 30px; box-sizing: border-box; }

        /* Tables */
        .pr-table-container {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .pr-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .pr-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .pr-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .pr-table tr:hover td { background: #fafafa; }

        .pr-code-badge { font-family: monospace; font-weight: 700; color: #0284c7; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px; }
        .pr-actions { display: flex; gap: 6px; }

        /* Badges */
        .pr-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
        .pr-b-calc { background: #fef3c7; color: #92400e; }
        .pr-b-app { background: #e0f2fe; color: #0369a1; }
        .pr-b-paid { background: #dcfce7; color: #166534; }
        .pr-b-cancel { background: #fee2e2; color: #991b1b; }
        .pr-b-doc { background: #e0f2fe; color: #0369a1; }
        .pr-b-res { background: #f5f3ff; color: #6d28d9; }
        .pr-b-staff { background: #ecfdf5; color: #065f46; }

        /* Run Banner */
        .pr-run-banner {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-wrap: wrap; gap: 16px;
        }

        /* Self Service */
        .pr-self-container { display: flex; flex-direction: column; gap: 14px; }
        .pr-self-header {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
            flex-wrap: wrap; gap: 12px;
        }

        /* Modal */
        .pr-modal-backdrop {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.65); display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(2px);
        }
        .pr-modal-box {
            background: #ffffff; border-radius: 12px; width: 100%; max-width: 600px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; max-height: 90vh;
            display: flex; flex-direction: column;
        }
        .pr-modal-lg { max-width: 900px; }
        .pr-modal-header {
            padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }
        .pr-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .pr-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

        .pr-form { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .pr-form-row { display: flex; gap: 14px; }
        .pr-form-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .pr-form-group label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .pr-req { color: #dc2626; }
        .pr-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

        /* Printable Payslip Sheet */
        .pr-printable-content { padding: 24px; overflow-y: auto; background: #f8fafc; }
        .pr-sheet {
            background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
            padding: 28px; color: #000000; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .pr-watermark {
            position: absolute; top: 40%; left: 15%; transform: rotate(-25deg);
            font-size: 3.5rem; font-weight: 900; color: rgba(148, 163, 184, 0.12);
            pointer-events: none; z-index: 1; letter-spacing: 4px;
        }

        .pr-sheet-header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px;
        }
        .pr-sh-brand { display: flex; align-items: center; gap: 12px; }
        .pr-sh-logo { font-size: 32px; color: #0284c7; }
        .pr-sh-title { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.01em; }
        .pr-sh-sub { font-size: 0.75rem; font-weight: 700; color: #475569; letter-spacing: 0.5px; }
        .pr-sh-meta { font-size: 0.8125rem; text-align: right; }

        .pr-emp-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
            padding: 12px 16px; margin-bottom: 18px; font-size: 0.8125rem;
        }
        .pr-lbl { color: #64748b; font-size: 0.75rem; }

        .pr-breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
        .pr-box { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #ffffff; }
        .pr-box-title { padding: 8px 12px; font-size: 0.8125rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .pr-bt-green { background: #f0fdf4; color: #166534; border-bottom: 1px solid #bbf7d0; }
        .pr-bt-red { background: #fef2f2; color: #991b1b; border-bottom: 1px solid #fecaca; }

        .pr-mini-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .pr-mini-table th { background: #f8fafc; color: #64748b; text-align: left; padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
        .pr-mini-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
        .pr-total-row td { font-weight: 800; font-size: 0.875rem; padding: 8px 10px; border-top: 2px solid #cbd5e1; }
        .pr-tr-green { background: #f0fdf4; color: #166534; }
        .pr-tr-red { background: #fef2f2; color: #991b1b; }

        .pr-net-callout {
            background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px;
            padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;
            color: #065f46; margin-bottom: 18px;
        }
        .pr-net-amount { font-size: 1.875rem; font-weight: 900; color: #047857; }

        .pr-security-box {
            display: flex; justify-content: space-between; align-items: center;
            border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-bottom: 30px;
        }

        .pr-signatures { display: flex; justify-content: space-around; margin-top: 36px; }
        .pr-sig { text-align: center; font-size: 0.75rem; font-weight: 600; width: 220px; }
        .pr-sig-line { border-bottom: 1px solid #000000; margin-bottom: 6px; }

        @media print {
            body * { visibility: hidden; }
            #prModalPayslip, #prModalPayslip * { visibility: visible; }
            #prModalPayslip { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
            .pr-modal-header { display: none; }
            .pr-sheet { border: none; box-shadow: none; padding: 0; }
        }
    `;

    document.head.appendChild(style);
}
