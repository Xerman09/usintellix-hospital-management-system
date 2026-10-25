import { api } from "../../core/api.js?v=10";

// State
let state = {
    activeTab: "ledger", // "ledger" | "schedules" | "statements" | "simulator"
    ledgerPage: 1,
    ledgerPerPage: 15,
    doctorFilter: "",
    statusFilter: "",
    categoryFilter: "",
    searchQuery: "",
    simulator: {
        grossPf: 1000,
        doctorId: "",
        category: "consultation",
        itemCode: "",
        result: null
    }
};

let cache = {
    metrics: null,
    ledgerData: null,
    statements: null,
    schedules: null,
    doctorsList: []
};

export function DoctorCommissionsView() {
    return `<div class="dc-root" id="doctorCommissionsRoot"><div class="dc-loading"><i class="fas fa-spinner fa-spin"></i> Loading Doctor Professional Fee &amp; Commission Ledger...</div></div>`;
}

export async function initDoctorCommissions() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("doctorCommissionsRoot");
    if (!root) return;

    try {
        const [metRes, ledRes, stmRes, schRes] = await Promise.all([
            api("/doctor-commissions/metrics").catch(() => null),
            api(`/doctor-commissions/ledger?page=${state.ledgerPage}&per_page=${state.ledgerPerPage}&doctor_id=${state.doctorFilter}&status=${state.statusFilter}&category=${state.categoryFilter}&q=${encodeURIComponent(state.searchQuery)}`).catch(() => null),
            api("/doctor-commissions/statements").catch(() => null),
            api("/doctor-commissions/schedules").catch(() => null)
        ]);

        cache.metrics = metRes?.data || {};
        cache.ledgerData = ledRes?.data || { total: 0, records: [] };
        cache.statements = stmRes?.data || [];
        cache.schedules = schRes?.data || [];

        // Build doctors dropdown from statements or schedules
        const docMap = new Map();
        (cache.statements || []).forEach(d => {
            if (d.doctor_id) docMap.set(d.doctor_id, { id: d.doctor_id, name: d.doctor_name, specialty: d.doctor_specialty });
        });
        (cache.schedules || []).forEach(s => {
            if (s.doctor_id && !docMap.has(s.doctor_id)) {
                docMap.set(s.doctor_id, { id: s.doctor_id, name: s.doctor_name, specialty: s.department_name || 'Specialist' });
            }
        });
        cache.doctorsList = Array.from(docMap.values());

        // Default doctors if empty
        if (cache.doctorsList.length === 0) {
            cache.doctorsList = [
                { id: 102, name: "Dr. Elena Rostova", specialty: "Chief of Surgery / Laparoscopy" },
                { id: 103, name: "Dr. Jonathan Hayes", specialty: "Interventional Cardiology" },
                { id: 104, name: "Dr. Arthur Sterling", specialty: "Senior Anesthesiologist" },
                { id: 105, name: "Dr. Sarah Lin", specialty: "Diagnostic Radiology" },
                { id: 109, name: "Dr. Sofia Morales", specialty: "Emergency Medicine" }
            ];
        }

        renderRoot();
    } catch (err) {
        console.error("Error loading doctor commissions:", err);
        root.innerHTML = `
            <div class="dc-error-card">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Doctor Commissions Data</h3>
                <p>${err.message || 'Network or server error'}</p>
                <button class="btn btn-primary" id="btnDcRetry"><i class="fas fa-redo"></i> Retry</button>
            </div>
        `;
        document.getElementById("btnDcRetry")?.addEventListener("click", () => initDoctorCommissions());
    }
}

function renderRoot() {
    const root = document.getElementById("doctorCommissionsRoot");
    if (!root) return;

    const m = cache.metrics || {};
    const totalGross = parseFloat(m.total_gross_pf || 0);
    const hospShare = parseFloat(m.total_hospital_share || 0);
    const docGross = parseFloat(m.total_doctor_share_gross || 0);
    const taxWithheld = parseFloat(m.total_withholding_tax || 0);
    const pendingPayout = parseFloat(m.total_pending_payout || 0);
    const disbursed = parseFloat(m.total_disbursed || 0);

    root.innerHTML = `
        <div class="dc-container">
            <!-- Header -->
            <header class="dc-header">
                <div>
                    <div class="dc-title-row">
                        <span class="dc-badge-tag"><i class="fas fa-user-md"></i> Medical Staff Revenue Share</span>
                        <h1>Doctor Professional Fee (PF) &amp; Commission Management</h1>
                    </div>
                    <p class="dc-sub">Automated revenue sharing rules, fee schedules, EWT withholding tax deductions, and physician payout vouchers.</p>
                </div>
                <div class="dc-actions">
                    <button class="btn btn-outline" id="btnDcSeedDemo"><i class="fas fa-magic"></i> Seed Realistic Cases</button>
                    <button class="btn btn-outline" id="btnDcSimulate"><i class="fas fa-calculator"></i> Split Simulator</button>
                    <button class="btn btn-primary" id="btnDcNewSchedule"><i class="fas fa-plus"></i> New Fee Schedule</button>
                    <button class="btn btn-outline" id="btnDcRecordManual"><i class="fas fa-file-medical"></i> Record Ad-Hoc PF</button>
                </div>
            </header>

            <!-- Metrics Strip -->
            <div class="dc-kpi-grid">
                <div class="dc-kpi-card">
                    <span class="dc-kpi-label"><i class="fas fa-file-invoice-dollar"></i> Total PF Billed</span>
                    <span class="dc-kpi-val">$${totalGross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">${m.total_transactions_count || 0} Settled Clinical Cases</span>
                </div>
                <div class="dc-kpi-card">
                    <span class="dc-kpi-label"><i class="fas fa-hospital"></i> Hospital Retained Share (30%)</span>
                    <span class="dc-kpi-val text-indigo">$${hospShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">Facility Overhead &amp; Nursing Pool</span>
                </div>
                <div class="dc-kpi-card">
                    <span class="dc-kpi-label"><i class="fas fa-stethoscope"></i> Doctor Gross Pool (70%)</span>
                    <span class="dc-kpi-val text-blue">$${docGross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">Across ${m.active_doctors_count || 0} Attending / Surgeons</span>
                </div>
                <div class="dc-kpi-card">
                    <span class="dc-kpi-label"><i class="fas fa-receipt"></i> Withheld Tax (10% EWT)</span>
                    <span class="dc-kpi-val text-amber">$${taxWithheld.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">Bureau of Internal Revenue Reserve</span>
                </div>
                <div class="dc-kpi-card highlight">
                    <span class="dc-kpi-label"><i class="fas fa-clock"></i> Pending Doctor Payout</span>
                    <span class="dc-kpi-val text-emerald">$${pendingPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">Ready for Disbursement</span>
                </div>
                <div class="dc-kpi-card">
                    <span class="dc-kpi-label"><i class="fas fa-check-circle"></i> Disbursed to Date</span>
                    <span class="dc-kpi-val text-purple">$${disbursed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <span class="dc-kpi-sub">${m.disbursed_batches_count || 0} Payout Batches Settled</span>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="dc-nav-tabs">
                <button class="dc-tab-btn ${state.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger">
                    <i class="fas fa-stream"></i> Commission Ledger Stream
                </button>
                <button class="dc-tab-btn ${state.activeTab === 'schedules' ? 'active' : ''}" data-tab="schedules">
                    <i class="fas fa-sliders-h"></i> Fee Schedules &amp; Revenue Splits (${cache.schedules?.length || 0})
                </button>
                <button class="dc-tab-btn ${state.activeTab === 'statements' ? 'active' : ''}" data-tab="statements">
                    <i class="fas fa-users-cog"></i> Physician Statements &amp; Payouts (${cache.statements?.length || 0})
                </button>
                <button class="dc-tab-btn ${state.activeTab === 'simulator' ? 'active' : ''}" data-tab="simulator">
                    <i class="fas fa-calculator"></i> Split Simulator &amp; Estimator
                </button>
            </div>

            <!-- Tab Content -->
            <div class="dc-tab-content" id="dcTabContent">
                ${renderCurrentTab()}
            </div>
        </div>
    `;

    bindRootEvents();
}

function renderCurrentTab() {
    switch (state.activeTab) {
        case "ledger":
            return renderLedgerTab();
        case "schedules":
            return renderSchedulesTab();
        case "statements":
            return renderStatementsTab();
        case "simulator":
            return renderSimulatorTab();
        default:
            return renderLedgerTab();
    }
}

// -------------------------------------------------------------
// TAB 1: COMMISSION LEDGER
// -------------------------------------------------------------
function renderLedgerTab() {
    const data = cache.ledgerData || { total: 0, records: [] };
    const records = data.records || [];

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${state.doctorFilter == d.id ? 'selected' : ''}>${d.name}</option>
    `).join('');

    return `
        <div class="dc-panel">
            <div class="dc-toolbar">
                <div class="dc-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="dcSearchInput" placeholder="Search voucher, doctor, patient, service, or folio..." value="${escapeHtml(state.searchQuery)}">
                </div>
                <div class="dc-filter-group">
                    <select id="dcDoctorSelect" class="form-select">
                        <option value="">All Physicians</option>
                        ${docOptions}
                    </select>
                    <select id="dcCategorySelect" class="form-select">
                        <option value="" ${state.categoryFilter === '' ? 'selected' : ''}>All Categories</option>
                        <option value="consultation" ${state.categoryFilter === 'consultation' ? 'selected' : ''}>Consultation</option>
                        <option value="daily_ward_round" ${state.categoryFilter === 'daily_ward_round' ? 'selected' : ''}>Ward Rounds</option>
                        <option value="surgical_lead" ${state.categoryFilter === 'surgical_lead' ? 'selected' : ''}>Lead Surgeon</option>
                        <option value="anesthesiology" ${state.categoryFilter === 'anesthesiology' ? 'selected' : ''}>Anesthesiology</option>
                        <option value="diagnostic_reading" ${state.categoryFilter === 'diagnostic_reading' ? 'selected' : ''}>Diagnostic Reading</option>
                        <option value="emergency_call" ${state.categoryFilter === 'emergency_call' ? 'selected' : ''}>Emergency Call</option>
                    </select>
                    <select id="dcStatusSelect" class="form-select">
                        <option value="" ${state.statusFilter === '' ? 'selected' : ''}>All Statuses</option>
                        <option value="earned" ${state.statusFilter === 'earned' ? 'selected' : ''}>Earned / Pending</option>
                        <option value="disbursed" ${state.statusFilter === 'disbursed' ? 'selected' : ''}>Disbursed / Paid</option>
                    </select>
                    <button class="btn btn-outline" id="btnDcResetFilters" title="Reset Filters"><i class="fas fa-undo"></i></button>
                </div>
            </div>

            <div class="dc-table-wrapper">
                <table class="dc-table">
                    <thead>
                        <tr>
                            <th>Voucher #</th>
                            <th>Settlement Date</th>
                            <th>Physician &amp; Specialty</th>
                            <th>Patient &amp; Reference</th>
                            <th>Service Description</th>
                            <th class="text-right">Gross PF</th>
                            <th class="text-center">Split Ratio</th>
                            <th class="text-right">Hosp Share (30%)</th>
                            <th class="text-right">Doctor Gross (70%)</th>
                            <th class="text-right">WHT (10%)</th>
                            <th class="text-right">Net Credited</th>
                            <th class="text-center">Status</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="13" class="dc-empty-row">
                                    <i class="fas fa-inbox"></i> No commission ledger records found matching the criteria.
                                    <div style="margin-top:8px;">
                                        <button class="btn btn-sm btn-outline" id="btnDcEmptySeed"><i class="fas fa-magic"></i> Seed Realistic Cases</button>
                                    </div>
                                </td>
                            </tr>
                        ` : records.map(r => renderLedgerRow(r)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="dc-pagination">
                <span class="dc-page-info">Showing ${records.length} of ${data.total || 0} commissions</span>
                <div class="dc-page-btns">
                    <button class="btn btn-sm btn-outline" id="btnDcPrevPage" ${data.page <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span class="dc-page-curr">Page ${data.page || 1} of ${data.total_pages || 1}</span>
                    <button class="btn btn-sm btn-outline" id="btnDcNextPage" ${data.page >= data.total_pages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderLedgerRow(r) {
    const gross = parseFloat(r.gross_pf_amount || 0);
    const hosp = parseFloat(r.hospital_share_amount || 0);
    const docGross = parseFloat(r.doctor_share_gross || 0);
    const tax = parseFloat(r.withholding_tax_amount || 0);
    const net = parseFloat(r.net_commission_payable || 0);

    const isDisbursed = r.settlement_status === 'disbursed';
    const statusPill = isDisbursed 
        ? `<span class="dc-pill dc-pill-purple"><i class="fas fa-check-double"></i> Disbursed</span>`
        : `<span class="dc-pill dc-pill-emerald"><i class="fas fa-coins"></i> Earned</span>`;

    const sourceBadge = r.source_type === 'inpatient_folio'
        ? `<span class="dc-source-tag dc-source-folio"><i class="fas fa-bed"></i> Folio</span>`
        : r.source_type === 'ambulatory_encounter'
        ? `<span class="dc-source-tag dc-source-enc"><i class="fas fa-clinic-medical"></i> OPD</span>`
        : `<span class="dc-source-tag dc-source-cashier"><i class="fas fa-cash-register"></i> Cashier</span>`;

    return `
        <tr>
            <td class="font-mono dc-voucher-no">
                <i class="fas fa-receipt text-muted"></i> <strong>${escapeHtml(r.voucher_number)}</strong>
            </td>
            <td>
                <div>${formatDateTime(r.settlement_date)}</div>
                <small class="text-muted">${formatTimeAgo(r.settlement_date)}</small>
            </td>
            <td>
                <div class="dc-doc-name"><i class="fas fa-user-md text-blue"></i> <strong>${escapeHtml(r.doctor_name)}</strong></div>
                <small class="text-muted">${escapeHtml(r.doctor_specialty || 'General Practitioner')}</small>
            </td>
            <td>
                <div><i class="fas fa-user text-muted"></i> ${escapeHtml(r.patient_name)}</div>
                <div class="dc-source-box">${sourceBadge} <span class="font-mono text-muted">${escapeHtml(r.source_reference || 'N/A')}</span></div>
            </td>
            <td>
                <div class="dc-service-title">${escapeHtml(r.service_description)}</div>
                <div class="dc-cat-badge">${formatCategoryBadge(r.service_category)}</div>
            </td>
            <td class="text-right font-mono font-weight-bold">
                $${gross.toFixed(2)}
            </td>
            <td class="text-center font-mono text-muted">
                <span class="dc-split-badge">${parseFloat(r.split_doctor_percent || 70).toFixed(0)} / ${parseFloat(r.split_hospital_percent || 30).toFixed(0)}</span>
            </td>
            <td class="text-right font-mono text-indigo">
                $${hosp.toFixed(2)}
            </td>
            <td class="text-right font-mono text-blue">
                $${docGross.toFixed(2)}
            </td>
            <td class="text-right font-mono text-amber">
                -$${tax.toFixed(2)}
            </td>
            <td class="text-right font-mono font-weight-bold text-emerald dc-net-cell">
                $${net.toFixed(2)}
            </td>
            <td class="text-center">
                ${statusPill}
            </td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline btn-view-slip" data-id="${r.id}" title="Print Commission Voucher Slip">
                    <i class="fas fa-print"></i> Slip
                </button>
            </td>
        </tr>
    `;
}

// -------------------------------------------------------------
// TAB 2: FEE SCHEDULES
// -------------------------------------------------------------
function renderSchedulesTab() {
    const schedules = cache.schedules || [];

    return `
        <div class="dc-panel">
            <div class="dc-panel-header">
                <div>
                    <h3><i class="fas fa-sliders-h"></i> Physician Revenue-Sharing Fee Schedules</h3>
                    <p class="text-muted">Hierarchical commission rules applied automatically during cashier bill settlement.</p>
                </div>
                <div>
                    <button class="btn btn-primary" id="btnDcAddSchedTop"><i class="fas fa-plus"></i> Create Fee Schedule</button>
                </div>
            </div>

            <div class="dc-table-wrapper">
                <table class="dc-table">
                    <thead>
                        <tr>
                            <th>Schedule Code</th>
                            <th>Schedule Name</th>
                            <th>Applicable Physician / Dept</th>
                            <th>Service Category</th>
                            <th class="text-center">Doctor %</th>
                            <th class="text-center">Hospital %</th>
                            <th class="text-center">WHT %</th>
                            <th class="text-center">Priority</th>
                            <th class="text-right">Volume Credited</th>
                            <th class="text-center">Status</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.length === 0 ? `
                            <tr><td colspan="11" class="dc-empty-row">No fee schedules defined.</td></tr>
                        ` : schedules.map(s => renderScheduleRow(s)).join('')}
                    </tbody>
                </table>
            </div>

            <div class="dc-alert-box info" style="margin-top:16px;">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Resolution Hierarchy:</strong> When a bill is settled, the engine prioritizes:
                    <code>Doctor-Specific + Item Code (Priority 90+)</code> &gt;
                    <code>Doctor-Specific Agreement (Priority 70-80)</code> &gt;
                    <code>Departmental Rule (Priority 40-50)</code> &gt;
                    <code>Global Category Default (Priority 15-25)</code> &gt;
                    <code>Standard 70/30 Baseline Fallback</code>.
                </div>
            </div>
        </div>
    `;
}

function renderScheduleRow(s) {
    const vol = parseFloat(s.total_volume_generated || 0);
    const hits = parseInt(s.total_commission_hits || 0, 10);
    const isActive = parseInt(s.is_active, 10) === 1;

    return `
        <tr>
            <td class="font-mono"><strong>${escapeHtml(s.schedule_code)}</strong></td>
            <td>
                <div class="font-weight-bold">${escapeHtml(s.schedule_name)}</div>
                <small class="text-muted">${escapeHtml(s.notes || '')}</small>
            </td>
            <td>
                ${s.doctor_name ? `<div><i class="fas fa-user-md text-blue"></i> <strong>${escapeHtml(s.doctor_name)}</strong></div>` : ''}
                ${s.department_name ? `<span class="dc-dept-tag"><i class="fas fa-building"></i> ${escapeHtml(s.department_name)}</span>` : ''}
                ${!s.doctor_name && !s.department_name ? `<span class="dc-universal-tag"><i class="fas fa-globe"></i> Universal / All Doctors</span>` : ''}
            </td>
            <td>${formatCategoryBadge(s.service_category)}</td>
            <td class="text-center font-mono font-weight-bold text-blue">${parseFloat(s.doctor_percentage).toFixed(1)}%</td>
            <td class="text-center font-mono font-weight-bold text-indigo">${parseFloat(s.hospital_percentage).toFixed(1)}%</td>
            <td class="text-center font-mono text-amber">${parseFloat(s.withholding_tax_percent).toFixed(1)}%</td>
            <td class="text-center font-mono"><span class="dc-priority-badge">${s.priority}</span></td>
            <td class="text-right font-mono">
                <div>$${vol.toFixed(2)}</div>
                <small class="text-muted">${hits} cases</small>
            </td>
            <td class="text-center">
                ${isActive ? `<span class="dc-pill dc-pill-emerald">Active</span>` : `<span class="dc-pill dc-pill-gray">Archived</span>`}
            </td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline btn-edit-sched" data-id="${s.id}" title="Edit Schedule">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

// -------------------------------------------------------------
// TAB 3: PHYSICIAN STATEMENTS & PAYOUTS
// -------------------------------------------------------------
function renderStatementsTab() {
    const statements = cache.statements || [];

    return `
        <div class="dc-panel">
            <div class="dc-panel-header">
                <div>
                    <h3><i class="fas fa-users-cog"></i> Physician Earnings Statements &amp; Payout Batches</h3>
                    <p class="text-muted">Consolidated balances per physician with one-click formal payout disbursement voucher generation.</p>
                </div>
            </div>

            <div class="dc-table-wrapper">
                <table class="dc-table">
                    <thead>
                        <tr>
                            <th>Physician Name</th>
                            <th>Specialty / Department</th>
                            <th class="text-center">Cases</th>
                            <th class="text-right">Gross PF Billed</th>
                            <th class="text-right">Hospital Share</th>
                            <th class="text-right">Doctor Gross</th>
                            <th class="text-right">Tax Withheld (10%)</th>
                            <th class="text-right">Total Net Earned</th>
                            <th class="text-right">Disbursed</th>
                            <th class="text-right">Pending Payable</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statements.length === 0 ? `
                            <tr><td colspan="11" class="dc-empty-row">No physician statements found.</td></tr>
                        ` : statements.map(st => renderStatementRow(st)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderStatementRow(st) {
    const cases = parseInt(st.total_encounters || 0, 10);
    const gross = parseFloat(st.total_gross_pf || 0);
    const hosp = parseFloat(st.total_hospital_share || 0);
    const docGross = parseFloat(st.total_doctor_gross || 0);
    const tax = parseFloat(st.total_tax_withheld || 0);
    const net = parseFloat(st.total_net_earned || 0);
    const disbursed = parseFloat(st.total_disbursed || 0);
    const pending = parseFloat(st.pending_payable || 0);

    return `
        <tr>
            <td>
                <div class="dc-doc-name"><i class="fas fa-user-md text-blue"></i> <strong>${escapeHtml(st.doctor_name)}</strong></div>
                <small class="text-muted">ID: DOC-${st.doctor_id}</small>
            </td>
            <td>
                <span class="dc-dept-tag">${escapeHtml(st.doctor_specialty || 'Medical Specialist')}</span>
            </td>
            <td class="text-center font-mono"><strong>${cases}</strong></td>
            <td class="text-right font-mono">$${gross.toFixed(2)}</td>
            <td class="text-right font-mono text-indigo">$${hosp.toFixed(2)}</td>
            <td class="text-right font-mono text-blue">$${docGross.toFixed(2)}</td>
            <td class="text-right font-mono text-amber">-$${tax.toFixed(2)}</td>
            <td class="text-right font-mono font-weight-bold">$${net.toFixed(2)}</td>
            <td class="text-right font-mono text-purple">$${disbursed.toFixed(2)}</td>
            <td class="text-right font-mono font-weight-bold text-emerald dc-net-cell">
                $${pending.toFixed(2)}
            </td>
            <td class="text-center">
                ${pending > 0 ? `
                    <button class="btn btn-sm btn-primary btn-disburse-payout" data-doc-id="${st.doctor_id}" data-doc-name="${escapeHtml(st.doctor_name)}" data-pending="${pending.toFixed(2)}">
                        <i class="fas fa-hand-holding-usd"></i> Disburse Payout
                    </button>
                ` : `
                    <span class="text-muted font-sm"><i class="fas fa-check"></i> Fully Settled</span>
                `}
            </td>
        </tr>
    `;
}

// -------------------------------------------------------------
// TAB 4: REVENUE SPLIT SIMULATOR
// -------------------------------------------------------------
function renderSimulatorTab() {
    const sim = state.simulator;
    const res = sim.result;

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${sim.doctorId == d.id ? 'selected' : ''}>${d.name} (${d.specialty})</option>
    `).join('');

    return `
        <div class="dc-panel">
            <div class="dc-panel-header">
                <div>
                    <h3><i class="fas fa-calculator"></i> Real-Time Physician PF Revenue Split Simulator</h3>
                    <p class="text-muted">Simulate and verify the revenue split, hospital share, withholding tax deduction, and net credited amount for any procedure fee.</p>
                </div>
            </div>

            <div class="dc-simulator-grid">
                <!-- Input Form -->
                <div class="dc-card">
                    <h4>1. Fee &amp; Case Parameters</h4>
                    <div class="form-group">
                        <label>Gross Professional Fee (PF) Amount ($):</label>
                        <input type="number" id="simGrossInput" class="form-control font-mono" step="10" min="0" value="${sim.grossPf}">
                    </div>
                    <div class="form-group">
                        <label>Select Physician:</label>
                        <select id="simDoctorSelect" class="form-select">
                            <option value="">-- Generic / Non-Contracted Physician --</option>
                            ${docOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Service Category:</label>
                        <select id="simCategorySelect" class="form-select">
                            <option value="consultation" ${sim.category === 'consultation' ? 'selected' : ''}>Outpatient Specialist Consultation (Standard 70/30)</option>
                            <option value="daily_ward_round" ${sim.category === 'daily_ward_round' ? 'selected' : ''}>Inpatient Daily Attending Rounds (70/30)</option>
                            <option value="surgical_lead" ${sim.category === 'surgical_lead' ? 'selected' : ''}>Major Surgery Lead Operating Surgeon (75/25 or 80/20)</option>
                            <option value="anesthesiology" ${sim.category === 'anesthesiology' ? 'selected' : ''}>Anesthesiology Services (80/20)</option>
                            <option value="diagnostic_reading" ${sim.category === 'diagnostic_reading' ? 'selected' : ''}>Diagnostic Radiology / Pathology Reading (60/40)</option>
                            <option value="emergency_call" ${sim.category === 'emergency_call' ? 'selected' : ''}>Emergency Department STAT On-Call Specialist (80/20)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Optional Tariff / CPT Code:</label>
                        <input type="text" id="simItemCodeInput" class="form-control font-mono" placeholder="e.g. SRV-SURG-LAP-01" value="${escapeHtml(sim.itemCode || '')}">
                    </div>
                    <button class="btn btn-primary btn-block" id="btnRunSimulator">
                        <i class="fas fa-bolt"></i> Run Split Calculation
                    </button>
                </div>

                <!-- Simulation Result Card -->
                <div class="dc-card ${res ? 'dc-result-active' : ''}">
                    <h4>2. Calculated Split Breakdown</h4>
                    ${!res ? `
                        <div class="dc-sim-placeholder">
                            <i class="fas fa-coins fa-3x text-muted"></i>
                            <p>Adjust inputs and click <strong>Run Split Calculation</strong> to view the real-time breakdown.</p>
                        </div>
                    ` : `
                        <div class="dc-sim-result-box">
                            <div class="dc-matched-rule">
                                <span class="dc-badge-tag"><i class="fas fa-check-circle"></i> Matched Rule</span>
                                <h5>${escapeHtml(res.schedule.schedule_name)}</h5>
                                <div class="font-mono text-muted text-sm">Code: ${escapeHtml(res.schedule.schedule_code)} | Priority: ${res.schedule.priority || 10}</div>
                            </div>

                            <div class="dc-split-visual-bar">
                                <div class="dc-bar-doc" style="width: ${res.split.doctor_percent}%;">Doctor ${res.split.doctor_percent}%</div>
                                <div class="dc-bar-hosp" style="width: ${res.split.hospital_percent}%;">Hosp ${res.split.hospital_percent}%</div>
                            </div>

                            <div class="dc-sim-metric-rows">
                                <div class="dc-sim-row">
                                    <span>Gross Professional Fee:</span>
                                    <strong class="font-mono">$${parseFloat(res.split.gross_pf).toFixed(2)}</strong>
                                </div>
                                <div class="dc-sim-row text-indigo">
                                    <span>Hospital Share (${res.split.hospital_percent}%):</span>
                                    <strong class="font-mono">$${parseFloat(res.split.hospital_share).toFixed(2)}</strong>
                                </div>
                                <div class="dc-sim-row text-blue">
                                    <span>Doctor Gross (${res.split.doctor_percent}%):</span>
                                    <strong class="font-mono">$${parseFloat(res.split.doctor_share_gross).toFixed(2)}</strong>
                                </div>
                                <div class="dc-sim-row text-amber">
                                    <span>Creditable Withholding Tax (${res.split.withholding_tax_rate}% EWT):</span>
                                    <strong class="font-mono">-$${parseFloat(res.split.withholding_tax_amount).toFixed(2)}</strong>
                                </div>
                                <div class="dc-sim-row highlight text-emerald">
                                    <span>Net Credited to Physician Account:</span>
                                    <strong class="font-mono" style="font-size: 1.25rem;">$${parseFloat(res.split.net_payable).toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindRootEvents() {
    // Tabs
    document.querySelectorAll(".dc-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.getAttribute("data-tab");
            renderRoot();
        });
    });

    // Top actions
    document.getElementById("btnDcSeedDemo")?.addEventListener("click", handleSeedDemo);
    document.getElementById("btnDcEmptySeed")?.addEventListener("click", handleSeedDemo);
    document.getElementById("btnDcSimulate")?.addEventListener("click", () => {
        state.activeTab = "simulator";
        renderRoot();
    });
    document.getElementById("btnDcNewSchedule")?.addEventListener("click", () => openScheduleModal());
    document.getElementById("btnDcAddSchedTop")?.addEventListener("click", () => openScheduleModal());
    document.getElementById("btnDcRecordManual")?.addEventListener("click", () => openManualRecordModal());

    // Filter controls
    document.getElementById("dcSearchInput")?.addEventListener("input", debounce((e) => {
        state.searchQuery = e.target.value.trim();
        state.ledgerPage = 1;
        refreshLedger();
    }, 400));

    document.getElementById("dcDoctorSelect")?.addEventListener("change", (e) => {
        state.doctorFilter = e.target.value;
        state.ledgerPage = 1;
        refreshLedger();
    });

    document.getElementById("dcCategorySelect")?.addEventListener("change", (e) => {
        state.categoryFilter = e.target.value;
        state.ledgerPage = 1;
        refreshLedger();
    });

    document.getElementById("dcStatusSelect")?.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        state.ledgerPage = 1;
        refreshLedger();
    });

    document.getElementById("btnDcResetFilters")?.addEventListener("click", () => {
        state.searchQuery = "";
        state.doctorFilter = "";
        state.categoryFilter = "";
        state.statusFilter = "";
        state.ledgerPage = 1;
        refreshLedger();
    });

    // Pagination
    document.getElementById("btnDcPrevPage")?.addEventListener("click", () => {
        if (state.ledgerPage > 1) {
            state.ledgerPage--;
            refreshLedger();
        }
    });

    document.getElementById("btnDcNextPage")?.addEventListener("click", () => {
        state.ledgerPage++;
        refreshLedger();
    });

    // Row Actions: View Slip
    document.querySelectorAll(".btn-view-slip").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openCommissionSlipModal(id);
        });
    });

    // Row Actions: Edit Schedule
    document.querySelectorAll(".btn-edit-sched").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const sched = (cache.schedules || []).find(s => s.id == id);
            if (sched) openScheduleModal(sched);
        });
    });

    // Row Actions: Disburse Payout
    document.querySelectorAll(".btn-disburse-payout").forEach(btn => {
        btn.addEventListener("click", () => {
            const docId = parseInt(btn.getAttribute("data-doc-id"), 10);
            const docName = btn.getAttribute("data-doc-name");
            const pending = btn.getAttribute("data-pending");
            openDisbursePayoutModal(docId, docName, pending);
        });
    });

    // Simulator form
    document.getElementById("btnRunSimulator")?.addEventListener("click", handleRunSimulator);
}

async function refreshLedger() {
    try {
        const res = await api(`/doctor-commissions/ledger?page=${state.ledgerPage}&per_page=${state.ledgerPerPage}&doctor_id=${state.doctorFilter}&status=${state.statusFilter}&category=${state.categoryFilter}&q=${encodeURIComponent(state.searchQuery)}`);
        cache.ledgerData = res?.data || { total: 0, records: [] };
        const content = document.getElementById("dcTabContent");
        if (content && state.activeTab === "ledger") {
            content.innerHTML = renderLedgerTab();
            bindRootEvents();
        }
    } catch (err) {
        console.error("Failed to refresh ledger:", err);
    }
}

async function handleSeedDemo() {
    if (!confirm("Populate realistic doctor commission cases across Chief Surgeon, Cardiology, Anesthesiology, and Radiology?")) return;
    try {
        await api("/doctor-commissions/seed-demo", { method: "POST" });
        alert("Demo cases seeded successfully!");
        await initDoctorCommissions();
    } catch (err) {
        alert("Seed failed: " + err.message);
    }
}

async function handleRunSimulator() {
    const gross = parseFloat(document.getElementById("simGrossInput")?.value || 0);
    const docId = document.getElementById("simDoctorSelect")?.value;
    const cat = document.getElementById("simCategorySelect")?.value;
    const item = document.getElementById("simItemCodeInput")?.value.trim();

    state.simulator.grossPf = gross;
    state.simulator.doctorId = docId;
    state.simulator.category = cat;
    state.simulator.itemCode = item;

    try {
        const res = await api("/doctor-commissions/calculate-simulation", {
            method: "POST",
            body: {
                gross_pf: gross,
                doctor_id: docId || null,
                service_category: cat,
                item_code: item || null
            }
        });
        state.simulator.result = res?.data || null;
        renderRoot();
    } catch (err) {
        alert("Simulation failed: " + err.message);
    }
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------
function openScheduleModal(sched = null) {
    const isEdit = !!sched;
    const modalId = "dcSchedModal";
    removeModal(modalId);

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${sched?.doctor_id == d.id ? 'selected' : ''}>${d.name}</option>
    `).join('');

    const modalHtml = `
        <div class="dc-modal-overlay" id="${modalId}">
            <div class="dc-modal-card">
                <div class="dc-modal-header">
                    <h4><i class="fas fa-sliders-h"></i> ${isEdit ? 'Edit Fee Schedule' : 'Create Doctor Fee Schedule'}</h4>
                    <button class="dc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="dc-modal-body">
                    <input type="hidden" id="schedId" value="${sched?.id || ''}">
                    <div class="form-group">
                        <label>Schedule Name:</label>
                        <input type="text" id="schedName" class="form-control" placeholder="e.g. Senior Specialist Consultation Split" value="${escapeHtml(sched?.schedule_name || '')}">
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Schedule Code:</label>
                            <input type="text" id="schedCode" class="form-control font-mono" placeholder="Auto-generated if empty" value="${escapeHtml(sched?.schedule_code || '')}" ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="form-group col-6">
                            <label>Physician (Leave empty for universal rule):</label>
                            <select id="schedDoctorId" class="form-select">
                                <option value="">-- Universal / All Physicians --</option>
                                ${docOptions}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Service Category:</label>
                            <select id="schedCategory" class="form-select">
                                <option value="all_services" ${sched?.service_category === 'all_services' ? 'selected' : ''}>All Services</option>
                                <option value="consultation" ${sched?.service_category === 'consultation' ? 'selected' : ''}>Consultation</option>
                                <option value="daily_ward_round" ${sched?.service_category === 'daily_ward_round' ? 'selected' : ''}>Inpatient Daily Ward Round</option>
                                <option value="surgical_lead" ${sched?.service_category === 'surgical_lead' ? 'selected' : ''}>Lead Surgeon</option>
                                <option value="surgical_assistant" ${sched?.service_category === 'surgical_assistant' ? 'selected' : ''}>Assistant Surgeon</option>
                                <option value="anesthesiology" ${sched?.service_category === 'anesthesiology' ? 'selected' : ''}>Anesthesiology</option>
                                <option value="diagnostic_reading" ${sched?.service_category === 'diagnostic_reading' ? 'selected' : ''}>Diagnostic Reading</option>
                                <option value="emergency_call" ${sched?.service_category === 'emergency_call' ? 'selected' : ''}>Emergency Call</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <label>Specific Procedure / Tariff Code (Optional):</label>
                            <input type="text" id="schedItemCode" class="form-control font-mono" placeholder="e.g. SRV-SURG-001" value="${escapeHtml(sched?.item_code || '')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-4">
                            <label>Doctor Split %:</label>
                            <input type="number" id="schedDocPct" class="form-control font-mono" min="0" max="100" step="1" value="${sched ? sched.doctor_percentage : 70}">
                        </div>
                        <div class="form-group col-4">
                            <label>Withholding Tax (EWT %):</label>
                            <input type="number" id="schedTaxPct" class="form-control font-mono" min="0" max="100" step="1" value="${sched ? sched.withholding_tax_percent : 10}">
                        </div>
                        <div class="form-group col-4">
                            <label>Evaluation Priority:</label>
                            <input type="number" id="schedPriority" class="form-control font-mono" min="1" max="100" value="${sched ? sched.priority : 20}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes &amp; Agreement Terms:</label>
                        <textarea id="schedNotes" class="form-control" rows="2" placeholder="Contract details or terms">${escapeHtml(sched?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="dc-modal-footer">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                    <button class="btn btn-primary" id="btnSaveScheduleSubmit"><i class="fas fa-save"></i> Save Schedule</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("btnSaveScheduleSubmit")?.addEventListener("click", async () => {
        const id = document.getElementById("schedId")?.value;
        const name = document.getElementById("schedName")?.value.trim();
        if (!name) return alert("Please enter schedule name");

        const payload = {
            id: id || undefined,
            schedule_name: name,
            schedule_code: document.getElementById("schedCode")?.value.trim() || undefined,
            doctor_id: document.getElementById("schedDoctorId")?.value || null,
            service_category: document.getElementById("schedCategory")?.value,
            item_code: document.getElementById("schedItemCode")?.value.trim() || null,
            doctor_percentage: parseFloat(document.getElementById("schedDocPct")?.value || 70),
            withholding_tax_percent: parseFloat(document.getElementById("schedTaxPct")?.value || 10),
            priority: parseInt(document.getElementById("schedPriority")?.value || 20, 10),
            notes: document.getElementById("schedNotes")?.value.trim() || null
        };

        try {
            await api("/doctor-commissions/schedules", { method: "POST", body: payload });
            alert("Fee schedule saved successfully!");
            document.getElementById(modalId)?.remove();
            await initDoctorCommissions();
        } catch (err) {
            alert("Error: " + err.message);
        }
    });
}

function openDisbursePayoutModal(doctorId, doctorName, pendingAmount) {
    const modalId = "dcPayoutModal";
    removeModal(modalId);

    const modalHtml = `
        <div class="dc-modal-overlay" id="${modalId}">
            <div class="dc-modal-card">
                <div class="dc-modal-header">
                    <h4><i class="fas fa-hand-holding-usd"></i> Issue Physician Payout Voucher</h4>
                    <button class="dc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="dc-modal-body">
                    <div class="dc-alert-box info">
                        <i class="fas fa-user-md"></i>
                        <div>
                            <strong>${escapeHtml(doctorName)}</strong>
                            <div>Total Pending Earned Balance: <span class="font-mono font-weight-bold text-emerald">$${pendingAmount}</span></div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:14px;">
                        <label>Disbursement Payment Method:</label>
                        <select id="payoutMethod" class="form-select">
                            <option value="bank_transfer">Direct Bank Remittance / Wire Transfer</option>
                            <option value="check">Hospital Check Voucher</option>
                            <option value="direct_deposit">ACH Direct Payroll Deposit</option>
                            <option value="cash_voucher">Cashier Petty Cash Voucher</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payment Reference / Check Number:</label>
                        <input type="text" id="payoutRef" class="form-control font-mono" placeholder="e.g. CHK-2026-9921 or WIRE-REF-8841" value="BNK-TRF-${Date.now().toString().slice(-6)}">
                    </div>
                    <div class="form-group">
                        <label>Voucher Notes:</label>
                        <textarea id="payoutNotes" class="form-control" rows="2">Monthly Professional Fee Commission settlement disbursement.</textarea>
                    </div>
                </div>
                <div class="dc-modal-footer">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                    <button class="btn btn-primary" id="btnConfirmPayoutSubmit"><i class="fas fa-check-circle"></i> Confirm &amp; Issue Voucher</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("btnConfirmPayoutSubmit")?.addEventListener("click", async () => {
        try {
            const res = await api("/doctor-commissions/disburse", {
                method: "POST",
                body: {
                    doctor_id: doctorId,
                    payout_data: {
                        payout_method: document.getElementById("payoutMethod")?.value,
                        payment_reference: document.getElementById("payoutRef")?.value.trim(),
                        notes: document.getElementById("payoutNotes")?.value.trim()
                    }
                }
            });

            document.getElementById(modalId)?.remove();
            alert(`Payout Voucher ${res?.data?.payout_number} issued successfully! Amount: $${res?.data?.total_net_payout?.toFixed(2)}`);
            await initDoctorCommissions();
        } catch (err) {
            alert("Disbursement failed: " + err.message);
        }
    });
}

function openManualRecordModal() {
    const modalId = "dcManualModal";
    removeModal(modalId);

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}">${d.name} (${d.specialty})</option>
    `).join('');

    const modalHtml = `
        <div class="dc-modal-overlay" id="${modalId}">
            <div class="dc-modal-card">
                <div class="dc-modal-header">
                    <h4><i class="fas fa-file-medical"></i> Record Ad-Hoc Professional Fee</h4>
                    <button class="dc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="dc-modal-body">
                    <div class="form-group">
                        <label>Select Physician:</label>
                        <select id="manDocId" class="form-select">
                            ${docOptions}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Patient ID:</label>
                            <input type="number" id="manPatientId" class="form-control" value="1">
                        </div>
                        <div class="form-group col-6">
                            <label>Gross Professional Fee ($):</label>
                            <input type="number" id="manGross" class="form-control font-mono" step="10" value="500">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Service Category:</label>
                            <select id="manCategory" class="form-select">
                                <option value="consultation">Outpatient Consultation</option>
                                <option value="daily_ward_round">Inpatient Ward Round</option>
                                <option value="surgical_lead">Operating Surgeon</option>
                                <option value="anesthesiology">Anesthesiology</option>
                                <option value="diagnostic_reading">Diagnostic Reading</option>
                                <option value="emergency_call">Emergency STAT Call</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <label>Tariff / Procedure Code:</label>
                            <input type="text" id="manItemCode" class="form-control font-mono" value="MAN-PF-001">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Service Description:</label>
                        <input type="text" id="manDesc" class="form-control" value="Specialist Bedside Consultation & Assessment">
                    </div>
                    <div class="form-group">
                        <label>Notes / Justification:</label>
                        <textarea id="manNotes" class="form-control" rows="2">Direct physician assessment fee credited by Finance.</textarea>
                    </div>
                </div>
                <div class="dc-modal-footer">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                    <button class="btn btn-primary" id="btnSaveManualSubmit"><i class="fas fa-save"></i> Credit Doctor PF</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("btnSaveManualSubmit")?.addEventListener("click", async () => {
        const payload = {
            doctor_id: parseInt(document.getElementById("manDocId")?.value, 10),
            patient_id: parseInt(document.getElementById("manPatientId")?.value || 1, 10),
            gross_pf_amount: parseFloat(document.getElementById("manGross")?.value || 0),
            service_category: document.getElementById("manCategory")?.value,
            item_code: document.getElementById("manItemCode")?.value.trim(),
            service_description: document.getElementById("manDesc")?.value.trim(),
            notes: document.getElementById("manNotes")?.value.trim()
        };

        try {
            const res = await api("/doctor-commissions/manual-record", { method: "POST", body: payload });
            document.getElementById(modalId)?.remove();
            alert(`Commission voucher ${res?.data?.voucher_number} created and credited! Net: $${res?.data?.net_payable?.toFixed(2)}`);
            await initDoctorCommissions();
        } catch (err) {
            alert("Failed to record fee: " + err.message);
        }
    });
}

function openCommissionSlipModal(id) {
    const record = (cache.ledgerData?.records || []).find(r => r.id == id);
    if (!record) return;

    const modalId = "dcSlipModal";
    removeModal(modalId);

    const gross = parseFloat(record.gross_pf_amount || 0);
    const hosp = parseFloat(record.hospital_share_amount || 0);
    const docGross = parseFloat(record.doctor_share_gross || 0);
    const tax = parseFloat(record.withholding_tax_amount || 0);
    const net = parseFloat(record.net_commission_payable || 0);

    const modalHtml = `
        <div class="dc-modal-overlay" id="${modalId}">
            <div class="dc-modal-card dc-print-modal">
                <div class="dc-modal-header no-print">
                    <h4><i class="fas fa-receipt"></i> Official Physician Commission Settlement Slip</h4>
                    <button class="dc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="dc-modal-body" id="printableSlipContent">
                    <div class="dc-slip-box">
                        <div class="dc-slip-header">
                            <div class="dc-slip-logo">
                                <i class="fas fa-hospital-user"></i> INTELLIX HOSPITAL MEDICAL REVENUE CENTER
                            </div>
                            <div class="dc-slip-subtitle">Physician Professional Fee (PF) Commission Voucher</div>
                            <div class="dc-slip-meta font-mono">
                                <div><strong>VOUCHER #:</strong> ${escapeHtml(record.voucher_number)}</div>
                                <div><strong>DATE:</strong> ${formatDateTime(record.settlement_date)}</div>
                                <div><strong>STATUS:</strong> ${record.settlement_status.toUpperCase()}</div>
                            </div>
                        </div>

                        <hr class="dc-slip-divider">

                        <div class="dc-slip-grid">
                            <div>
                                <span class="dc-slip-label">ATTENDING / OPERATING PHYSICIAN:</span>
                                <div class="dc-slip-val"><strong>${escapeHtml(record.doctor_name)}</strong></div>
                                <div class="text-sm text-muted">${escapeHtml(record.doctor_specialty || 'Medical Specialist')}</div>
                            </div>
                            <div>
                                <span class="dc-slip-label">PATIENT &amp; CASE REFERENCE:</span>
                                <div class="dc-slip-val"><strong>${escapeHtml(record.patient_name)}</strong></div>
                                <div class="text-sm font-mono text-muted">Ref: ${escapeHtml(record.source_reference || 'N/A')}</div>
                            </div>
                        </div>

                        <hr class="dc-slip-divider">

                        <div class="dc-slip-item-row">
                            <div>
                                <div class="dc-slip-val">${escapeHtml(record.service_description)}</div>
                                <div class="text-sm text-muted">Code: ${escapeHtml(record.item_code || 'N/A')} | Category: ${formatCategoryBadge(record.service_category)}</div>
                            </div>
                            <div class="dc-slip-val font-mono text-right">$${gross.toFixed(2)}</div>
                        </div>

                        <div class="dc-slip-totals">
                            <div class="dc-slip-calc-row">
                                <span>Gross Professional Fee Billed:</span>
                                <span class="font-mono">$${gross.toFixed(2)}</span>
                            </div>
                            <div class="dc-slip-calc-row text-indigo">
                                <span>Less: Hospital Facility Share (${parseFloat(record.split_hospital_percent).toFixed(0)}%):</span>
                                <span class="font-mono">-$${hosp.toFixed(2)}</span>
                            </div>
                            <div class="dc-slip-calc-row text-blue">
                                <span>Doctor Gross Share (${parseFloat(record.split_doctor_percent).toFixed(0)}%):</span>
                                <span class="font-mono">$${docGross.toFixed(2)}</span>
                            </div>
                            <div class="dc-slip-calc-row text-amber">
                                <span>Less: Creditable Withholding Tax (${parseFloat(record.withholding_tax_percent).toFixed(0)}% EWT):</span>
                                <span class="font-mono">-$${tax.toFixed(2)}</span>
                            </div>
                            <div class="dc-slip-calc-row dc-slip-grand-total text-emerald">
                                <span>NET COMMISSION CREDITED:</span>
                                <span class="font-mono">$${net.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="dc-slip-signatures">
                            <div class="dc-sig-line">
                                <div class="dc-line"></div>
                                <small>Billing &amp; Cashier Officer</small>
                            </div>
                            <div class="dc-sig-line">
                                <div class="dc-line"></div>
                                <small>Hospital Comptroller</small>
                            </div>
                            <div class="dc-sig-line">
                                <div class="dc-line"></div>
                                <small>Physician Conforme</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dc-modal-footer no-print">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Close</button>
                    <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Settlement Slip</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function removeModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(dt) {
    if (!dt) return "N/A";
    const d = new Date(dt.replace(" ", "T"));
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(dt) {
    if (!dt) return "";
    const diff = Math.floor((new Date() - new Date(dt.replace(" ", "T"))) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatCategoryBadge(cat) {
    switch (cat) {
        case "consultation": return `<span class="dc-cat-pill dc-cat-blue"><i class="fas fa-user-md"></i> Consultation</span>`;
        case "daily_ward_round": return `<span class="dc-cat-pill dc-cat-teal"><i class="fas fa-bed"></i> Ward Round</span>`;
        case "surgical_lead": return `<span class="dc-cat-pill dc-cat-indigo"><i class="fas fa-syringe"></i> Lead Surgeon</span>`;
        case "surgical_assistant": return `<span class="dc-cat-pill dc-cat-indigo"><i class="fas fa-user-friends"></i> Asst Surgeon</span>`;
        case "anesthesiology": return `<span class="dc-cat-pill dc-cat-purple"><i class="fas fa-procedures"></i> Anesthesia</span>`;
        case "diagnostic_reading": return `<span class="dc-cat-pill dc-cat-amber"><i class="fas fa-x-ray"></i> Diagnostic Reading</span>`;
        case "emergency_call": return `<span class="dc-cat-pill dc-cat-rose"><i class="fas fa-ambulance"></i> Emergency Call</span>`;
        default: return `<span class="dc-cat-pill dc-cat-gray">${cat || 'All Services'}</span>`;
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function ensureCss() {
    if (document.getElementById("dcStyles")) return;
    const style = document.createElement("style");
    style.id = "dcStyles";
    style.textContent = `
        .dc-root { font-family: Inter, system-ui, -apple-system, sans-serif; color: #1e293b; background: #f8fafc; min-height: 100vh; padding: 24px; }
        .dc-container { max-width: 1400px; margin: 0 auto; }
        .dc-loading { text-align: center; padding: 60px; font-size: 16px; color: #64748b; }
        .dc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .dc-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .dc-header h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .dc-sub { color: #64748b; font-size: 14px; margin: 0; }
        .dc-badge-tag { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .dc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        
        /* KPI Grid */
        .dc-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .dc-kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .dc-kpi-card.highlight { border-color: #10b981; background: #f0fdf4; }
        .dc-kpi-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
        .dc-kpi-val { font-size: 22px; font-weight: 700; font-family: monospace; color: #0f172a; }
        .dc-kpi-sub { font-size: 12px; color: #94a3b8; }
        
        /* Tab Nav */
        .dc-nav-tabs { display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
        .dc-tab-btn { background: none; border: none; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .dc-tab-btn:hover { color: #2563eb; }
        .dc-tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; }
        
        /* Panels */
        .dc-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .dc-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .dc-panel-header h3 { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; }
        
        /* Toolbar */
        .dc-toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .dc-search-box { position: relative; flex: 1; min-width: 280px; }
        .dc-search-box i { position: absolute; left: 12px; top: 11px; color: #94a3b8; }
        .dc-search-box input { width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        .dc-filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .dc-filter-group select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background: #fff; }
        
        /* Table */
        .dc-table-wrapper { overflow-x: auto; }
        .dc-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .dc-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .dc-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .dc-table tbody tr:hover { background: #f8fafc; }
        .dc-empty-row { text-align: center; padding: 40px !important; color: #94a3b8; font-size: 14px; }
        
        /* Pills & Badges */
        .dc-pill { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .dc-pill-emerald { background: #dcfce7; color: #15803d; }
        .dc-pill-purple { background: #f3e8ff; color: #7e22ce; }
        .dc-pill-gray { background: #f1f5f9; color: #64748b; }
        .dc-split-badge { background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
        .dc-priority-badge { background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
        .dc-source-tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .dc-source-folio { background: #fef3c7; color: #b45309; }
        .dc-source-enc { background: #dbeafe; color: #1e40af; }
        .dc-source-cashier { background: #e0e7ff; color: #4338ca; }
        .dc-cat-pill { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .dc-cat-blue { background: #eff6ff; color: #1e40af; }
        .dc-cat-teal { background: #ccfbf1; color: #0f766e; }
        .dc-cat-indigo { background: #e0e7ff; color: #4338ca; }
        .dc-cat-purple { background: #f3e8ff; color: #7e22ce; }
        .dc-cat-amber { background: #fef3c7; color: #b45309; }
        .dc-cat-rose { background: #ffe4e6; color: #be123c; }
        .dc-cat-gray { background: #f1f5f9; color: #475569; }
        .dc-dept-tag { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .dc-universal-tag { background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        
        .dc-net-cell { font-size: 14px; }
        
        /* Pagination */
        .dc-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 13px; color: #64748b; }
        .dc-page-btns { display: flex; align-items: center; gap: 8px; }
        .dc-page-curr { font-weight: 600; }
        
        /* Simulator */
        .dc-simulator-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media(max-width: 900px) { .dc-simulator-grid { grid-template-columns: 1fr; } }
        .dc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .dc-card h4 { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .dc-sim-placeholder { text-align: center; padding: 50px 20px; color: #94a3b8; }
        .dc-sim-placeholder p { margin-top: 12px; font-size: 14px; }
        .dc-matched-rule { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
        .dc-matched-rule h5 { margin: 6px 0 2px 0; font-size: 15px; color: #1e293b; }
        .dc-split-visual-bar { display: flex; height: 26px; border-radius: 6px; overflow: hidden; margin-bottom: 16px; font-size: 11px; font-weight: 700; line-height: 26px; text-align: center; color: #fff; }
        .dc-bar-doc { background: #2563eb; }
        .dc-bar-hosp { background: #4f46e5; }
        .dc-sim-metric-rows { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
        .dc-sim-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .dc-sim-row.highlight { border-top: 2px solid #10b981; border-bottom: none; padding-top: 10px; font-weight: 700; }
        
        /* Modal */
        .dc-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .dc-modal-card { background: #ffffff; width: 100%; max-width: 620px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
        .dc-modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .dc-modal-header h4 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
        .dc-modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; }
        .dc-modal-body { padding: 20px; overflow-y: auto; }
        .dc-modal-footer { padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
        
        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }
        .form-control, .form-select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .form-row { display: flex; gap: 12px; }
        .col-6 { flex: 1; }
        .col-4 { flex: 1; }
        
        /* Alert Box */
        .dc-alert-box { display: flex; gap: 12px; padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
        .dc-alert-box.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
        
        /* Print Slip Styles */
        .dc-slip-box { font-family: 'Courier New', Courier, monospace; color: #000; border: 1px dashed #64748b; padding: 20px; background: #fff; }
        .dc-slip-header { text-align: center; margin-bottom: 12px; }
        .dc-slip-logo { font-size: 15px; font-weight: 800; }
        .dc-slip-subtitle { font-size: 12px; text-transform: uppercase; margin-top: 2px; }
        .dc-slip-meta { font-size: 11px; margin-top: 8px; display: flex; justify-content: space-around; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 4px 0; }
        .dc-slip-divider { border: none; border-top: 1px dashed #999; margin: 12px 0; }
        .dc-slip-grid { display: flex; justify-content: space-between; font-size: 12px; line-height: 1.4; }
        .dc-slip-label { font-size: 10px; color: #555; text-transform: uppercase; }
        .dc-slip-item-row { display: flex; justify-content: space-between; font-size: 13px; margin: 8px 0; }
        .dc-slip-totals { margin-top: 14px; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; }
        .dc-slip-calc-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .dc-slip-grand-total { font-size: 14px; font-weight: 800; border-top: 1px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin-top: 4px; }
        .dc-slip-signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center; }
        .dc-sig-line { width: 30%; }
        .dc-sig-line .dc-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 4px; }
        
        @media print {
            body * { visibility: hidden; }
            #printableSlipContent, #printableSlipContent * { visibility: visible; }
            #printableSlipContent { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
        }
        
        /* Utility */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-weight-bold { font-weight: 700; }
        .text-muted { color: #64748b; }
        .text-sm { font-size: 12px; }
        .text-indigo { color: #4338ca; }
        .text-blue { color: #2563eb; }
        .text-amber { color: #d97706; }
        .text-emerald { color: #059669; }
        .text-purple { color: #7e22ce; }
        .btn-block { width: 100%; }
        .btn-xs { padding: 2px 6px; font-size: 11px; }
    `;
    document.head.appendChild(style);
}
