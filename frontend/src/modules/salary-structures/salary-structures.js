/**
 * Staff Salary Structures & Compensation Engine Module
 * Schema: hr_salary_structures, hr_salary_components
 */

import { api } from "../../core/api.js?v=10";

// Module State
let state = {
    activeTab: "registry", // 'registry' | 'simulator'
    departmentId: 0,
    employeeId: 0,
    employmentTypeFilter: "",
    payFrequencyFilter: "",
    searchQuery: "",
    page: 1,
    perPage: 25,
    selectedStructure: null,
    simulator: {
        employeeId: 101,
        regularHours: 80,
        otHours: 12,
        ndHours: 16,
        onCallShifts: 4,
        caseCommissions: 1850.00,
        result: null
    }
};

let cache = {
    structuresData: null,
    metadata: { departments: [], staff: [] }
};

export function SalaryStructuresView() {
    return `<div class="ss-root" id="salaryStructuresRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Staff Salary Structures &amp; Compensation Engine...</div>
        </div>
    </div>`;
}

export async function initSalaryStructures() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("salaryStructuresRoot");
    if (!root) return;

    try {
        const [metaRes, listRes] = await Promise.all([
            api(`/payroll/metadata`).catch(() => null),
            api(`/payroll/salary-structures?department_id=${state.departmentId}&employee_id=${state.employeeId}&employment_type=${state.employmentTypeFilter}&pay_frequency=${state.payFrequencyFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null)
        ]);

        cache.metadata = metaRes?.data || { departments: [], staff: [] };
        cache.structuresData = listRes?.data || { total: 0, records: [], metrics: {} };

        // Run default simulation
        await runSimulation();
        renderModule();
    } catch (err) {
        console.error("Failed to load salary structures:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load Salary Structures: ${err.message || err}</div>`;
    }
}

async function runSimulation() {
    try {
        const simRes = await api(`/payroll/simulate-gross`, {
            method: "POST",
            body: {
                employee_id: state.simulator.employeeId,
                regular_hours: state.simulator.regularHours,
                overtime_hours: state.simulator.otHours,
                night_diff_hours: state.simulator.ndHours,
                on_call_shifts: state.simulator.onCallShifts,
                case_commissions: state.simulator.caseCommissions
            }
        });
        state.simulator.result = simRes?.data || null;
    } catch (err) {
        console.error("Simulation error:", err);
    }
}

function renderModule() {
    const root = document.getElementById("salaryStructuresRoot");
    if (!root) return;

    const m = cache.structuresData?.metrics || {};
    const totalActive = parseInt(m.active_structures || 0, 10);
    const monthlyBase = parseFloat(m.total_monthly_base_payroll || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const monthlyAllow = parseFloat(m.total_monthly_allowances || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const avgHourly = parseFloat(m.avg_hourly_rate || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const physCount = parseInt(m.count_physicians || 0, 10);
    const staffCount = parseInt(m.count_fulltime_staff || 0, 10);

    root.innerHTML = `
        <div class="ss-container">
            <!-- Header -->
            <div class="ss-header">
                <div>
                    <div class="ss-title-row">
                        <span class="ss-title-icon">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </span>
                        <div>
                            <h1 class="ss-title">Staff Salary Structures &amp; Compensation</h1>
                            <p class="ss-subtitle">Base Salaries, Hourly Pay, Fixed Allowances, On-Call Stipends, and Multipliers (1.25x OT, 1.30x Night Diff, 1.50x Rest Day)</p>
                        </div>
                    </div>
                </div>
                <div class="ss-header-actions">
                    <button class="ss-btn ss-btn-outline" id="ssBtnPrintCompSheet">
                        <i class="fas fa-print"></i> Print Compensation Sheet
                    </button>
                    <button class="ss-btn ss-btn-primary" id="ssBtnNewStructure">
                        <i class="fas fa-plus-circle"></i> New Salary Structure
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Banner -->
            <div class="ss-kpi-grid">
                <div class="ss-kpi-card ss-kpi-blue">
                    <div class="ss-kpi-content">
                        <div class="ss-kpi-label">Active Salary Contracts</div>
                        <div class="ss-kpi-val">${totalActive} <span class="ss-kpi-sub">Employees</span></div>
                        <div class="ss-kpi-desc">${physCount} Doctors &bull; ${staffCount} Regular Staff</div>
                    </div>
                    <div class="ss-kpi-icon"><i class="fas fa-users-cog"></i></div>
                </div>

                <div class="ss-kpi-card ss-kpi-emerald">
                    <div class="ss-kpi-content">
                        <div class="ss-kpi-label">Monthly Base Payroll</div>
                        <div class="ss-kpi-val">${monthlyBase}</div>
                        <div class="ss-kpi-desc">Fixed hospital base obligation</div>
                    </div>
                    <div class="ss-kpi-icon"><i class="fas fa-money-check-alt"></i></div>
                </div>

                <div class="ss-kpi-card ss-kpi-purple">
                    <div class="ss-kpi-content">
                        <div class="ss-kpi-label">Fixed Allowances / Mo</div>
                        <div class="ss-kpi-val">${monthlyAllow}</div>
                        <div class="ss-kpi-desc">Housing, transport, medical, meal</div>
                    </div>
                    <div class="ss-kpi-icon"><i class="fas fa-hand-holding-usd"></i></div>
                </div>

                <div class="ss-kpi-card ss-kpi-amber">
                    <div class="ss-kpi-content">
                        <div class="ss-kpi-label">Average Hourly Rate</div>
                        <div class="ss-kpi-val">${avgHourly} <span class="ss-kpi-sub">/ hr</span></div>
                        <div class="ss-kpi-desc">Basis for OT &amp; night differential</div>
                    </div>
                    <div class="ss-kpi-icon"><i class="fas fa-calculator"></i></div>
                </div>
            </div>

            <!-- Workspace Tabs -->
            <div class="ss-tabs">
                <button class="ss-tab-btn ${state.activeTab === 'registry' ? 'active' : ''}" data-tab="registry">
                    <i class="fas fa-layer-group"></i> Salary Structures Registry
                </button>
                <button class="ss-tab-btn ${state.activeTab === 'simulator' ? 'active' : ''}" data-tab="simulator">
                    <i class="fas fa-sliders-h"></i> Gross Compensation Simulator (OT + Night Diff + Stipends + Commissions)
                </button>
            </div>

            <!-- Tab 1: Registry -->
            <div id="ssTabRegistry" class="ss-panel ${state.activeTab === 'registry' ? 'active' : ''}">
                ${renderRegistryPanel()}
            </div>

            <!-- Tab 2: Simulator -->
            <div id="ssTabSimulator" class="ss-panel ${state.activeTab === 'simulator' ? 'active' : ''}">
                ${renderSimulatorPanel()}
            </div>
        </div>

        <!-- Add / Edit Modal -->
        <div id="ssModalForm" class="ss-modal-backdrop" style="display: none;">
            <div class="ss-modal-box ss-modal-lg">
                <div class="ss-modal-header">
                    <h3 id="ssModalTitle"><i class="fas fa-edit"></i> Staff Salary Structure Setup</h3>
                    <button class="ss-modal-close" id="ssBtnCloseFormModal">&times;</button>
                </div>
                <form id="ssFormStructure" class="ss-form">
                    <input type="hidden" id="ssFormId" value="">

                    <div class="ss-form-row">
                        <div class="ss-form-group">
                            <label>Staff Member <span class="ss-req">*</span></label>
                            <select id="ssFormStaff" class="ss-select" required>
                                <option value="">Select Employee...</option>
                                ${cache.metadata.staff.map(s => `
                                    <option value="${s.id}">
                                        ${escapeHtml(s.full_name)} (${escapeHtml(s.specialty || s.department_name || 'Staff')})
                                    </option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="ss-form-group">
                            <label>Employment Classification <span class="ss-req">*</span></label>
                            <select id="ssFormType" class="ss-select" required>
                                <option value="consultant_physician">Consultant Physician (Attending / Specialist)</option>
                                <option value="resident_physician">Resident / Fellow Physician</option>
                                <option value="regular_fulltime">Regular Full-time Staff (Nurse, Tech, Admin)</option>
                                <option value="part_time">Part-time Clinical Staff</option>
                                <option value="contractual">Contractual / Locum Tenens</option>
                            </select>
                        </div>
                        <div class="ss-form-group" style="max-width: 180px;">
                            <label>Pay Frequency</label>
                            <select id="ssFormFreq" class="ss-select">
                                <option value="semi_monthly">Semi-Monthly (15th / 30th)</option>
                                <option value="monthly">Monthly</option>
                                <option value="bi_weekly">Bi-Weekly</option>
                            </select>
                        </div>
                    </div>

                    <!-- Base Salaries & Derived Rates -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                        <div style="font-weight: 700; font-size: 0.8125rem; color: #0284c7; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-coins"></i> Base Compensation &amp; Derived Standard Rates (Divisor: 22 Days / 176 Hours)
                        </div>
                        <div class="ss-form-row">
                            <div class="ss-form-group">
                                <label>Monthly Base Salary ($) <span class="ss-req">*</span></label>
                                <input type="number" id="ssFormBase" class="ss-input" step="0.01" min="0" placeholder="e.g. 12500.00" required>
                            </div>
                            <div class="ss-form-group">
                                <label>Hourly Rate ($/hr)</label>
                                <input type="number" id="ssFormHourly" class="ss-input" step="0.01" min="0" placeholder="Auto: Base / 176">
                            </div>
                            <div class="ss-form-group">
                                <label>Daily Rate ($/day)</label>
                                <input type="number" id="ssFormDaily" class="ss-input" step="0.01" min="0" placeholder="Auto: Base / 22">
                            </div>
                            <div class="ss-form-group">
                                <label>On-Call Shift Stipend ($)</label>
                                <input type="number" id="ssFormOnCall" class="ss-input" step="0.01" min="0" placeholder="e.g. 350.00 / shift">
                            </div>
                        </div>
                    </div>

                    <!-- Fixed Allowances -->
                    <div>
                        <div style="font-weight: 700; font-size: 0.8125rem; color: #475569; margin-bottom: 8px;">
                            Fixed Monthly Allowances (Non-Taxable / De Minimis)
                        </div>
                        <div class="ss-form-row">
                            <div class="ss-form-group">
                                <label>Housing ($)</label>
                                <input type="number" id="ssFormHousing" class="ss-input" step="0.01" min="0" value="0.00">
                            </div>
                            <div class="ss-form-group">
                                <label>Transportation ($)</label>
                                <input type="number" id="ssFormTranspo" class="ss-input" step="0.01" min="0" value="0.00">
                            </div>
                            <div class="ss-form-group">
                                <label>Medical ($)</label>
                                <input type="number" id="ssFormMedical" class="ss-input" step="0.01" min="0" value="0.00">
                            </div>
                            <div class="ss-form-group">
                                <label>Meal ($)</label>
                                <input type="number" id="ssFormMeal" class="ss-input" step="0.01" min="0" value="0.00">
                            </div>
                            <div class="ss-form-group">
                                <label>Uniform ($)</label>
                                <input type="number" id="ssFormUniform" class="ss-input" step="0.01" min="0" value="0.00">
                            </div>
                        </div>
                    </div>

                    <!-- Overtime Multipliers -->
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px;">
                        <div style="font-weight: 700; font-size: 0.8125rem; color: #b45309; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-percentage"></i> Overtime &amp; Shift Differential Multipliers (Labor Law Compliant)
                        </div>
                        <div class="ss-form-row">
                            <div class="ss-form-group">
                                <label>Regular OT (1.25x)</label>
                                <input type="number" id="ssFormOtMul" class="ss-input" step="0.05" min="1.0" value="1.25" required>
                            </div>
                            <div class="ss-form-group">
                                <label>Night Diff (1.30x)</label>
                                <input type="number" id="ssFormNdMul" class="ss-input" step="0.05" min="1.0" value="1.30" required>
                            </div>
                            <div class="ss-form-group">
                                <label>Rest Day (1.50x)</label>
                                <input type="number" id="ssFormRestMul" class="ss-input" step="0.05" min="1.0" value="1.50" required>
                            </div>
                            <div class="ss-form-group">
                                <label>Holiday (2.00x)</label>
                                <input type="number" id="ssFormHolMul" class="ss-input" step="0.05" min="1.0" value="2.00" required>
                            </div>
                        </div>
                    </div>

                    <!-- Banking & Effective Date -->
                    <div class="ss-form-row">
                        <div class="ss-form-group">
                            <label>Disbursement Bank</label>
                            <input type="text" id="ssFormBank" class="ss-input" placeholder="e.g. JPMorgan Chase Healthcare Banking">
                        </div>
                        <div class="ss-form-group">
                            <label>Bank Account Number</label>
                            <input type="text" id="ssFormAccount" class="ss-input" placeholder="e.g. 4881-2291-8841">
                        </div>
                        <div class="ss-form-group" style="max-width: 160px;">
                            <label>Effective Date</label>
                            <input type="date" id="ssFormEffective" class="ss-input" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <div class="ss-modal-actions">
                        <button type="button" class="ss-btn ss-btn-outline" id="ssBtnCancelForm">Cancel</button>
                        <button type="submit" class="ss-btn ss-btn-primary" id="ssBtnSaveStructure">
                            <i class="fas fa-save"></i> Save Salary Structure
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Printable Compensation Modal -->
        <div id="ssModalPrint" class="ss-modal-backdrop" style="display: none;">
            <div class="ss-modal-box ss-modal-lg">
                <div class="ss-modal-header">
                    <h3><i class="fas fa-print"></i> Formal Staff Compensation &amp; Salary Grade Agreement</h3>
                    <div>
                        <button class="ss-btn ss-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Agreement</button>
                        <button class="ss-modal-close" id="ssBtnClosePrintModal">&times;</button>
                    </div>
                </div>
                <div class="ss-printable-content" id="ssPrintableContent"></div>
            </div>
        </div>
    `;

    attachEventHandlers();
}

/**
 * Render Registry Panel
 */
function renderRegistryPanel() {
    const records = cache.structuresData?.records || [];

    return `
        <!-- Filter Bar -->
        <div class="ss-filter-bar">
            <div class="ss-filter-group">
                <label>Department:</label>
                <select id="ssFilterDept" class="ss-select">
                    <option value="0">All Departments</option>
                    ${cache.metadata.departments.map(d => `<option value="${d.id}" ${state.departmentId == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join("")}
                </select>
            </div>

            <div class="ss-filter-group">
                <label>Classification:</label>
                <select id="ssFilterType" class="ss-select">
                    <option value="">All Classifications</option>
                    <option value="consultant_physician" ${state.employmentTypeFilter === 'consultant_physician' ? 'selected' : ''}>Consultant Physician</option>
                    <option value="regular_fulltime" ${state.employmentTypeFilter === 'regular_fulltime' ? 'selected' : ''}>Regular Full-time</option>
                    <option value="part_time" ${state.employmentTypeFilter === 'part_time' ? 'selected' : ''}>Part-time</option>
                </select>
            </div>

            <div class="ss-filter-group" style="margin-left: auto;">
                <input type="text" id="ssSearchInput" class="ss-input" placeholder="Search staff name, code, bank..." value="${escapeHtml(state.searchQuery)}">
            </div>
        </div>

        <!-- Table -->
        <div class="ss-table-container">
            <table class="ss-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Staff Member &amp; Specialty</th>
                        <th>Classification</th>
                        <th>Monthly Base</th>
                        <th>Hourly Rate</th>
                        <th>Fixed Allowances</th>
                        <th>On-Call Stipend</th>
                        <th>Overtime Multipliers</th>
                        <th>Disbursement Account</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length === 0 ? `
                        <tr><td colspan="10" style="text-align: center; padding: 40px; color: #64748b;">No salary structures match current filters.</td></tr>
                    ` : records.map(r => `
                        <tr>
                            <td><span class="ss-code-badge">${escapeHtml(r.structure_code)}</span></td>
                            <td>
                                <div class="ss-staff-cell">
                                    <div class="ss-staff-name">${escapeHtml(r.staff_name)}</div>
                                    <div class="ss-staff-dept">${escapeHtml(r.specialty || r.department_name || 'Staff')}</div>
                                </div>
                            </td>
                            <td>${formatEmpTypeBadge(r.employment_type)}</td>
                            <td><strong style="color: #0f172a; font-size: 0.9375rem;">$${parseFloat(r.base_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td>
                            <td><span class="ss-hourly-pill">$${parseFloat(r.hourly_rate).toFixed(2)}/hr</span></td>
                            <td>+$${parseFloat(r.total_fixed_allowances).toFixed(2)}</td>
                            <td>
                                ${parseFloat(r.on_call_stipend_rate) > 0 ? `
                                    <span class="ss-stipend-pill">$${parseFloat(r.on_call_stipend_rate).toFixed(0)}/shift</span>
                                ` : `
                                    <span style="color: #94a3b8;">-</span>
                                `}
                            </td>
                            <td>
                                <div class="ss-mul-group">
                                    <span class="ss-mul-badge" title="Regular OT: 1.25x">OT: ${r.overtime_multiplier}x</span>
                                    <span class="ss-mul-badge" title="Night Differential: 1.30x">ND: ${r.night_diff_multiplier}x</span>
                                    <span class="ss-mul-badge" title="Rest Day: 1.50x">Rest: ${r.rest_day_multiplier}x</span>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 0.75rem;">
                                    <div style="font-weight: 600; color: #334155;">${escapeHtml(r.bank_name || 'Direct Deposit')}</div>
                                    <div style="color: #64748b;">${escapeHtml(r.bank_account_no || 'On File')}</div>
                                </div>
                            </td>
                            <td>
                                <div class="ss-actions">
                                    <button class="ss-btn ss-btn-xs ss-btn-outline ss-btn-sim-staff" data-id="${r.employee_id}" title="Simulate Gross Pay">
                                        <i class="fas fa-calculator"></i> Simulate
                                    </button>
                                    <button class="ss-btn ss-btn-xs ss-btn-primary ss-btn-edit-struct" data-id="${r.id}" title="Edit Salary Structure">
                                        <i class="fas fa-edit"></i> Edit
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
 * Render Gross Compensation Simulator
 */
function renderSimulatorPanel() {
    const res = state.simulator.result;
    const sim = state.simulator;

    return `
        <div class="ss-sim-container">
            <!-- Left: Inputs -->
            <div class="ss-sim-inputs">
                <div style="font-weight: 700; font-size: 1rem; color: #0f172a; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-sliders-h" style="color: #0284c7;"></i> Modeling Inputs (Semi-Monthly Pay Period)
                </div>

                <div class="ss-form-group" style="margin-bottom: 14px;">
                    <label>Select Staff Member / Physician:</label>
                    <select id="ssSimStaffSelect" class="ss-select ss-select-lg">
                        ${cache.metadata.staff.map(s => `
                            <option value="${s.id}" ${sim.employeeId == s.id ? 'selected' : ''}>
                                ${escapeHtml(s.full_name)} (${escapeHtml(s.specialty || s.department_name || 'Staff')})
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="ss-sim-input-grid">
                    <div class="ss-form-group">
                        <label>Regular Shift Hours (Std: 80h):</label>
                        <input type="number" id="ssSimRegHours" class="ss-input" min="0" value="${sim.regularHours}">
                    </div>

                    <div class="ss-form-group">
                        <label>Overtime Hours Worked (1.25x):</label>
                        <input type="number" id="ssSimOtHours" class="ss-input" min="0" value="${sim.otHours}">
                    </div>

                    <div class="ss-form-group">
                        <label>Night Diff Hours (1.30x):</label>
                        <input type="number" id="ssSimNdHours" class="ss-input" min="0" value="${sim.ndHours}">
                    </div>

                    <div class="ss-form-group">
                        <label>Doctor On-Call Shifts:</label>
                        <input type="number" id="ssSimOnCallShifts" class="ss-input" min="0" value="${sim.onCallShifts}">
                    </div>
                </div>

                <div class="ss-form-group" style="margin-top: 14px;">
                    <label>Doctor Procedure Commission Shares ($ credited from billing):</label>
                    <input type="number" id="ssSimCommissions" class="ss-input" step="0.01" min="0" value="${sim.caseCommissions}">
                </div>

                <button class="ss-btn ss-btn-primary" id="ssBtnRecalculateSim" style="width: 100%; margin-top: 20px; padding: 12px; justify-content: center;">
                    <i class="fas fa-sync-alt"></i> Calculate Gross Compensation
                </button>
            </div>

            <!-- Right: Results Breakdown -->
            <div class="ss-sim-results">
                ${!res ? `
                    <div style="padding: 40px; text-align: center; color: #64748b;">
                        Click Calculate to simulate compensation.
                    </div>
                ` : `
                    <div class="ss-res-header">
                        <div>
                            <div class="ss-res-title">${escapeHtml(res.staff_name)}</div>
                            <div class="ss-res-sub">${res.employment_type.replace(/_/g, ' ').toUpperCase()} &bull; Base Hourly: <strong>$${parseFloat(res.hourly_rate).toFixed(2)}/hr</strong></div>
                        </div>
                        <div class="ss-res-gross-badge">
                            <div style="font-size: 0.6875rem; text-transform: uppercase;">Total Period Gross</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">$${parseFloat(res.gross_total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>

                    <div class="ss-res-line-items">
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-money-bill-wave"></i> Semi-Monthly Base Salary:</span>
                            <span class="ss-rli-val">$${parseFloat(res.base_salary_period).toFixed(2)}</span>
                        </div>
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-gift"></i> Fixed Allowances Portion:</span>
                            <span class="ss-rli-val">+$${parseFloat(res.fixed_allowances_period).toFixed(2)}</span>
                        </div>
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-business-time"></i> Overtime Pay (${res.overtime.hours}h @ 1.25x):</span>
                            <span class="ss-rli-val" style="color: #d97706;">+$${parseFloat(res.overtime.amount).toFixed(2)}</span>
                        </div>
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-moon"></i> Night Differential Premium (${res.night_diff.hours}h @ 1.30x):</span>
                            <span class="ss-rli-val" style="color: #7c3aed;">+$${parseFloat(res.night_diff.amount).toFixed(2)}</span>
                        </div>
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-phone-alt"></i> On-Call Duty Stipends (${res.on_call_stipends.shifts} shifts @ $${res.on_call_stipends.rate_per_shift}):</span>
                            <span class="ss-rli-val" style="color: #059669;">+$${parseFloat(res.on_call_stipends.amount).toFixed(2)}</span>
                        </div>
                        <div class="ss-rli-row">
                            <span class="ss-rli-label"><i class="fas fa-percentage"></i> Doctor Case Commissions / Fee Splits:</span>
                            <span class="ss-rli-val" style="color: #0284c7;">+$${parseFloat(res.doctor_procedure_commissions).toFixed(2)}</span>
                        </div>

                        <div class="ss-rli-row ss-rli-total">
                            <span>TOTAL GROSS COMPENSATION:</span>
                            <span style="color: #0f172a;">$${parseFloat(res.gross_total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div class="ss-rli-row" style="color: #dc2626;">
                            <span>Less: Estimated Withholding Tax (10%):</span>
                            <span>-$${parseFloat(res.estimated_withholding_tax).toFixed(2)}</span>
                        </div>

                        <div class="ss-rli-row ss-rli-net">
                            <span>ESTIMATED NET DISBURSEMENT:</span>
                            <span style="color: #16a34a;">$${parseFloat(res.net_pay_estimate).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
}

function formatEmpTypeBadge(type) {
    switch (type) {
        case "consultant_physician":
            return `<span class="ss-badge ss-b-doc"><i class="fas fa-user-md"></i> Consultant Doctor</span>`;
        case "resident_physician":
            return `<span class="ss-badge ss-b-res"><i class="fas fa-stethoscope"></i> Resident Doctor</span>`;
        case "regular_fulltime":
            return `<span class="ss-badge ss-b-full"><i class="fas fa-user-check"></i> Regular Fulltime</span>`;
        case "part_time":
            return `<span class="ss-badge ss-b-part">Part-time</span>`;
        default:
            return `<span class="ss-badge">${type}</span>`;
    }
}

/**
 * Event Handlers
 */
function attachEventHandlers() {
    // Tabs
    document.querySelectorAll(".ss-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.dataset.tab;
            renderModule();
        });
    });

    // Filters
    document.getElementById("ssFilterDept")?.addEventListener("change", (e) => {
        state.departmentId = parseInt(e.target.value, 10) || 0;
        refreshRegistry();
    });

    document.getElementById("ssFilterType")?.addEventListener("change", (e) => {
        state.employmentTypeFilter = e.target.value;
        refreshRegistry();
    });

    document.getElementById("ssSearchInput")?.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        refreshRegistry();
    });

    // Auto-calculate hourly and daily rates from base salary in modal
    const baseInput = document.getElementById("ssFormBase");
    const hourlyInput = document.getElementById("ssFormHourly");
    const dailyInput = document.getElementById("ssFormDaily");

    baseInput?.addEventListener("input", () => {
        const base = parseFloat(baseInput.value) || 0;
        if (base > 0) {
            hourlyInput.value = (base / (22 * 8)).toFixed(2);
            dailyInput.value = (base / 22).toFixed(2);
        }
    });

    // Modal open / close
    document.getElementById("ssBtnNewStructure")?.addEventListener("click", () => openStructureModal());
    document.getElementById("ssBtnCloseFormModal")?.addEventListener("click", closeStructureModal);
    document.getElementById("ssBtnCancelForm")?.addEventListener("click", closeStructureModal);

    // Form submit
    document.getElementById("ssFormStructure")?.addEventListener("submit", handleStructureSubmit);

    // Edit button click
    document.querySelectorAll(".ss-btn-edit-struct").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            const struct = (cache.structuresData?.records || []).find(s => s.id === id);
            if (struct) openStructureModal(struct);
        });
    });

    // Simulate button click from table row
    document.querySelectorAll(".ss-btn-sim-staff").forEach(btn => {
        btn.addEventListener("click", async () => {
            const empId = parseInt(btn.dataset.id, 10);
            state.simulator.employeeId = empId;
            state.activeTab = "simulator";
            await runSimulation();
            renderModule();
        });
    });

    // Simulator inputs & button
    document.getElementById("ssSimStaffSelect")?.addEventListener("change", async (e) => {
        state.simulator.employeeId = parseInt(e.target.value, 10);
        await runSimulation();
        renderModule();
    });

    document.getElementById("ssBtnRecalculateSim")?.addEventListener("click", async () => {
        state.simulator.regularHours = parseFloat(document.getElementById("ssSimRegHours").value) || 0;
        state.simulator.otHours = parseFloat(document.getElementById("ssSimOtHours").value) || 0;
        state.simulator.ndHours = parseFloat(document.getElementById("ssSimNdHours").value) || 0;
        state.simulator.onCallShifts = parseInt(document.getElementById("ssSimOnCallShifts").value, 10) || 0;
        state.simulator.caseCommissions = parseFloat(document.getElementById("ssSimCommissions").value) || 0;

        await runSimulation();
        renderModule();
    });

    // Print Agreement Modal
    document.getElementById("ssBtnPrintCompSheet")?.addEventListener("click", openPrintModal);
    document.getElementById("ssBtnClosePrintModal")?.addEventListener("click", () => {
        const m = document.getElementById("ssModalPrint");
        if (m) m.style.display = "none";
    });
}

function openStructureModal(struct = null) {
    const modal = document.getElementById("ssModalForm");
    if (!modal) return;

    document.getElementById("ssFormId").value = struct ? struct.id : "";
    document.getElementById("ssModalTitle").innerHTML = struct ?
        `<i class="fas fa-edit"></i> Edit Salary Structure #${struct.structure_code}` :
        `<i class="fas fa-plus-circle"></i> Create Staff Salary Structure`;

    if (struct) {
        document.getElementById("ssFormStaff").value = struct.employee_id;
        document.getElementById("ssFormType").value = struct.employment_type;
        document.getElementById("ssFormFreq").value = struct.pay_frequency;
        document.getElementById("ssFormBase").value = struct.base_salary;
        document.getElementById("ssFormHourly").value = struct.hourly_rate;
        document.getElementById("ssFormDaily").value = struct.daily_rate;
        document.getElementById("ssFormOnCall").value = struct.on_call_stipend_rate;
        document.getElementById("ssFormHousing").value = struct.housing_allowance;
        document.getElementById("ssFormTranspo").value = struct.transportation_allowance;
        document.getElementById("ssFormMedical").value = struct.medical_allowance;
        document.getElementById("ssFormMeal").value = struct.meal_allowance;
        document.getElementById("ssFormUniform").value = struct.uniform_allowance;
        document.getElementById("ssFormOtMul").value = struct.overtime_multiplier;
        document.getElementById("ssFormNdMul").value = struct.night_diff_multiplier;
        document.getElementById("ssFormRestMul").value = struct.rest_day_multiplier;
        document.getElementById("ssFormHolMul").value = struct.holiday_multiplier;
        document.getElementById("ssFormBank").value = struct.bank_name || "";
        document.getElementById("ssFormAccount").value = struct.bank_account_no || "";
        document.getElementById("ssFormEffective").value = struct.effective_date;
    } else {
        document.getElementById("ssFormStructure").reset();
    }

    modal.style.display = "flex";
}

function closeStructureModal() {
    const m = document.getElementById("ssModalForm");
    if (m) m.style.display = "none";
}

async function handleStructureSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("ssFormId").value;
    const payload = {
        id: id || undefined,
        employee_id: document.getElementById("ssFormStaff").value,
        employment_type: document.getElementById("ssFormType").value,
        pay_frequency: document.getElementById("ssFormFreq").value,
        base_salary: document.getElementById("ssFormBase").value,
        hourly_rate: document.getElementById("ssFormHourly").value,
        daily_rate: document.getElementById("ssFormDaily").value,
        on_call_stipend_rate: document.getElementById("ssFormOnCall").value,
        housing_allowance: document.getElementById("ssFormHousing").value,
        transportation_allowance: document.getElementById("ssFormTranspo").value,
        medical_allowance: document.getElementById("ssFormMedical").value,
        meal_allowance: document.getElementById("ssFormMeal").value,
        uniform_allowance: document.getElementById("ssFormUniform").value,
        overtime_multiplier: document.getElementById("ssFormOtMul").value,
        night_diff_multiplier: document.getElementById("ssFormNdMul").value,
        rest_day_multiplier: document.getElementById("ssFormRestMul").value,
        holiday_multiplier: document.getElementById("ssFormHolMul").value,
        bank_name: document.getElementById("ssFormBank").value,
        bank_account_no: document.getElementById("ssFormAccount").value,
        effective_date: document.getElementById("ssFormEffective").value
    };

    try {
        if (id) {
            await api(`/payroll/salary-structures/update`, { method: "POST", body: payload });
            alert("Salary structure updated.");
        } else {
            await api(`/payroll/salary-structures`, { method: "POST", body: payload });
            alert("New salary structure created successfully.");
        }
        closeStructureModal();
        await loadInitialData();
    } catch (err) {
        alert("Failed to save salary structure: " + (err.message || err));
    }
}

async function refreshRegistry() {
    try {
        const listRes = await api(`/payroll/salary-structures?department_id=${state.departmentId}&employee_id=${state.employeeId}&employment_type=${state.employmentTypeFilter}&pay_frequency=${state.payFrequencyFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`);
        cache.structuresData = listRes?.data || { total: 0, records: [], metrics: {} };
        const container = document.getElementById("ssTabRegistry");
        if (container) container.innerHTML = renderRegistryPanel();
        attachEventHandlers();
    } catch (err) {
        console.error("Refresh registry error:", err);
    }
}

function openPrintModal() {
    const modal = document.getElementById("ssModalPrint");
    const container = document.getElementById("ssPrintableContent");
    if (!modal || !container) return;

    const records = cache.structuresData?.records || [];

    container.innerHTML = `
        <div class="ss-print-sheet">
            <div class="ss-print-header">
                <h2>USINTELLIX HOSPITAL SYSTEM &bull; HUMAN RESOURCES</h2>
                <div class="ss-print-sub">MASTER STAFF SALARY GRADE &amp; COMPENSATION APPOINTMENT SCHEDULE</div>
                <div style="font-size: 0.8125rem; color: #64748b;">Fiscal Year 2026 Governance &bull; Printed: ${new Date().toLocaleString()}</div>
            </div>

            <table class="ss-print-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Staff Member &amp; Department</th>
                        <th>Classification</th>
                        <th>Monthly Base</th>
                        <th>Hourly Rate</th>
                        <th>Fixed Allowances</th>
                        <th>On-Call Stipend</th>
                        <th>Overtime Multipliers</th>
                        <th>Disbursement Bank</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td><strong>${escapeHtml(r.structure_code)}</strong></td>
                            <td>${escapeHtml(r.staff_name)} (${escapeHtml(r.department_code || 'DEPT')})</td>
                            <td>${r.employment_type.replace(/_/g, ' ').toUpperCase()}</td>
                            <td><strong>$${parseFloat(r.base_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td>
                            <td>$${parseFloat(r.hourly_rate).toFixed(2)}/hr</td>
                            <td>+$${parseFloat(r.total_fixed_allowances).toFixed(2)}</td>
                            <td>$${parseFloat(r.on_call_stipend_rate).toFixed(0)}/shift</td>
                            <td>OT: ${r.overtime_multiplier}x | ND: ${r.night_diff_multiplier}x | Rest: ${r.rest_day_multiplier}x</td>
                            <td>${escapeHtml(r.bank_name || 'Direct Deposit')}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="ss-print-signatures">
                <div class="ss-sig-line">
                    <div class="ss-line"></div>
                    <div>Prepared by Compensation &amp; Benefits Officer</div>
                </div>
                <div class="ss-sig-line">
                    <div class="ss-line"></div>
                    <div>Chief Financial Officer (CFO) Sign-off</div>
                </div>
                <div class="ss-sig-line">
                    <div class="ss-line"></div>
                    <div>Hospital Chief Executive Officer (CEO)</div>
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
    if (document.getElementById("ssStyles")) return;

    const style = document.createElement("style");
    style.id = "ssStyles";
    style.textContent = `
        .ss-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .ss-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .ss-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ss-title-icon {
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

        .ss-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
        .ss-subtitle { margin: 4px 0 0 0; font-size: 0.875rem; color: #64748b; }
        .ss-header-actions { display: flex; gap: 12px; }

        /* Buttons */
        .ss-btn {
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

        .ss-btn-primary { background: #0284c7; color: #ffffff; }
        .ss-btn-primary:hover { background: #0369a1; }
        .ss-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
        .ss-btn-outline:hover { background: #f8fafc; }
        .ss-btn-xs { padding: 4px 8px; font-size: 0.75rem; }

        /* KPI Grid */
        .ss-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .ss-kpi-card {
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

        .ss-kpi-blue { border-left-color: #0284c7; }
        .ss-kpi-emerald { border-left-color: #059669; }
        .ss-kpi-purple { border-left-color: #7c3aed; }
        .ss-kpi-amber { border-left-color: #d97706; }

        .ss-kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .ss-kpi-val { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 4px 0; }
        .ss-kpi-sub { font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .ss-kpi-desc { font-size: 0.75rem; color: #94a3b8; }
        .ss-kpi-icon { font-size: 24px; opacity: 0.3; }

        /* Tabs */
        .ss-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }

        .ss-tab-btn {
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

        .ss-tab-btn:hover { color: #0f172a; background: #f1f5f9; }
        .ss-tab-btn.active { color: #0284c7; background: rgba(2, 132, 199, 0.1); }

        .ss-panel { display: none; }
        .ss-panel.active { display: block; }

        /* Filter bar */
        .ss-filter-bar {
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

        .ss-filter-group { display: flex; align-items: center; gap: 8px; }
        .ss-filter-group label { font-size: 0.8125rem; font-weight: 600; color: #475569; }

        .ss-select, .ss-input {
            padding: 6px 10px;
            font-size: 0.8125rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            color: #0f172a;
        }

        .ss-select-lg { padding: 10px 12px; font-size: 0.9375rem; font-weight: 600; width: 100%; }

        /* Tables */
        .ss-table-container {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ss-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .ss-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .ss-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .ss-table tr:hover td { background: #fafafa; }

        .ss-code-badge { font-family: monospace; font-weight: 700; color: #0284c7; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px; }
        .ss-staff-cell { display: flex; flex-direction: column; }
        .ss-staff-name { font-weight: 700; color: #0f172a; }
        .ss-staff-dept { font-size: 0.75rem; color: #64748b; }

        .ss-hourly-pill { background: #f1f5f9; color: #334155; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
        .ss-stipend-pill { background: #ecfdf5; color: #065f46; font-weight: 700; padding: 2px 6px; border-radius: 4px; }

        .ss-mul-group { display: flex; gap: 4px; }
        .ss-mul-badge { background: #fffbeb; color: #b45309; font-size: 0.6875rem; font-weight: 700; padding: 2px 4px; border-radius: 4px; border: 1px solid #fde68a; }

        .ss-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
        .ss-b-doc { background: #e0f2fe; color: #0369a1; }
        .ss-b-res { background: #f5f3ff; color: #6d28d9; }
        .ss-b-full { background: #ecfdf5; color: #065f46; }
        .ss-b-part { background: #f1f5f9; color: #475569; }

        .ss-actions { display: flex; gap: 6px; }

        /* Simulator */
        .ss-sim-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        @media (max-width: 900px) {
            .ss-sim-container { grid-template-columns: 1fr; }
        }

        .ss-sim-inputs {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ss-sim-input-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }

        .ss-sim-results {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ss-res-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 16px;
        }

        .ss-res-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .ss-res-sub { font-size: 0.8125rem; color: #64748b; margin-top: 2px; }
        .ss-res-gross-badge { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 8px 16px; border-radius: 8px; text-align: right; }

        .ss-res-line-items {
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 0.875rem;
        }

        .ss-rli-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px dashed #f1f5f9;
        }

        .ss-rli-label { color: #475569; display: flex; align-items: center; gap: 8px; }
        .ss-rli-val { font-weight: 700; color: #0f172a; }

        .ss-rli-total {
            font-size: 1rem;
            font-weight: 700;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 10px 0;
            margin-top: 6px;
        }

        .ss-rli-net {
            font-size: 1.125rem;
            font-weight: 800;
            background: #f0fdf4;
            padding: 10px 12px;
            border-radius: 6px;
            margin-top: 6px;
        }

        /* Modal */
        .ss-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(2px);
        }

        .ss-modal-box {
            background: #ffffff;
            border-radius: 12px;
            width: 100%; max-width: 650px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            overflow: hidden; max-height: 90vh;
            display: flex; flex-direction: column;
        }

        .ss-modal-lg { max-width: 900px; }

        .ss-modal-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }

        .ss-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .ss-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

        .ss-form { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .ss-form-row { display: flex; gap: 14px; }
        .ss-form-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .ss-form-group label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .ss-req { color: #dc2626; }

        .ss-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

        /* Printable */
        .ss-printable-content { padding: 24px; overflow-y: auto; }
        .ss-print-sheet { background: #ffffff; color: #000000; }
        .ss-print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000000; padding-bottom: 12px; }
        .ss-print-header h2 { margin: 0; font-size: 1.25rem; }
        .ss-print-sub { font-size: 1rem; font-weight: 700; margin-top: 4px; }

        .ss-print-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .ss-print-table th, .ss-print-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        .ss-print-table th { background: #f1f5f9; font-weight: 700; }

        .ss-print-signatures { display: flex; justify-content: space-around; margin-top: 48px; }
        .ss-sig-line { text-align: center; font-size: 0.75rem; font-weight: 600; width: 220px; }
        .ss-line { border-bottom: 1px solid #000000; margin-bottom: 6px; }

        @media print {
            body * { visibility: hidden; }
            #ssModalPrint, #ssModalPrint * { visibility: visible; }
            #ssModalPrint { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
            .ss-modal-header { display: none; }
        }
    `;

    document.head.appendChild(style);
}
