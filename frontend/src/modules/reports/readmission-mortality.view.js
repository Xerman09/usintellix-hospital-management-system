export function ReadmissionMortalityView() {
    return `
<style>
.rm-wrapper {
    padding: 24px;
    max-width: 100%;
    font-family: var(--font-primary, "Inter", sans-serif);
    color: var(--text-primary, #1e293b);
}
.rm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}
.rm-header-left h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    margin: 0 0 4px 0;
}
.rm-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.rm-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.rm-btn-primary {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 9px 18px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
}
.rm-btn-primary:hover { background: #0369a1; }
.rm-btn-secondary {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
    padding: 9px 18px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
}
.rm-btn-secondary:hover { background: #e2e8f0; }

/* KPI Cards */
.rm-kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 22px;
}
@media (max-width: 1200px) { .rm-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .rm-kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.rm-kpi-card {
    background: #ffffff;
    border-radius: 10px;
    padding: 16px 18px;
    border-left: 4px solid #94a3b8;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.rm-kpi-card.red    { border-left-color: #ef4444; }
.rm-kpi-card.orange { border-left-color: #f97316; }
.rm-kpi-card.amber  { border-left-color: #f59e0b; }
.rm-kpi-card.purple { border-left-color: #a855f7; }
.rm-kpi-card.green  { border-left-color: #22c55e; }

.rm-kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.rm-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #1e293b;
    line-height: 1;
}
.rm-kpi-sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

/* Filter Toolbar */
.rm-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
}
.rm-filter-row input,
.rm-filter-row select {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    background: #ffffff;
    color: #1e293b;
    min-width: 120px;
}
.rm-filter-row .rm-search-input {
    flex: 1;
    min-width: 200px;
}
.rm-btn-apply {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.rm-btn-apply:hover { background: #0369a1; }
.rm-btn-reset {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

/* Table */
.rm-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
}
.rm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.rm-table thead tr {
    background: #f1f5f9;
}
.rm-table thead th {
    padding: 11px 12px;
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
}
.rm-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
}
.rm-table tbody tr:hover {
    background: #f8fafc;
}
.rm-table tbody td {
    padding: 10px 12px;
    vertical-align: middle;
    color: #334155;
}

/* Modals */
.rm-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9000;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.rm-modal-box {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 820px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.rm-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    background: #ffffff;
    z-index: 1;
}
.rm-modal-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}
.rm-modal-close-x {
    background: none;
    border: none;
    font-size: 22px;
    color: #64748b;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
}
.rm-modal-body {
    padding: 22px;
}
.rm-modal-footer {
    padding: 16px 22px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    position: sticky;
    bottom: 0;
    background: #ffffff;
}
.rm-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.rm-form-grid .full-width {
    grid-column: 1 / -1;
}
.rm-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 5px;
}
.rm-form-group input,
.rm-form-group select,
.rm-form-group textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
}
.rm-form-group textarea {
    resize: vertical;
    min-height: 65px;
}
.rm-form-section-title {
    font-size: 12px;
    font-weight: 700;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0 4px 0;
    border-bottom: 1px solid #e0f2fe;
    margin-bottom: 12px;
    grid-column: 1 / -1;
}
.rm-detail-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: flex-start;
}
.rm-detail-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    min-width: 170px;
}
.rm-detail-value {
    font-size: 13px;
    color: #1e293b;
    flex: 1;
}

/* ===================================================
   DARK MODE — uses :root[data-theme="dark"] with
   !important to beat global main.css overrides
   =================================================== */

:root[data-theme="dark"] .rm-wrapper {
    color: #e2e8f0 !important;
    background: transparent !important;
}
:root[data-theme="dark"] .rm-header-left h2 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .rm-header-left p  { color: #94a3b8 !important; }

/* KPI cards */
:root[data-theme="dark"] .rm-kpi-card {
    background-color: #1e293b !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4) !important;
}
:root[data-theme="dark"] .rm-kpi-value { color: #f1f5f9 !important; }
:root[data-theme="dark"] .rm-kpi-label { color: #94a3b8 !important; }
:root[data-theme="dark"] .rm-kpi-sub   { color: #475569 !important; }

/* Filter toolbar */
:root[data-theme="dark"] .rm-filter-row {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-filter-row input,
:root[data-theme="dark"] .rm-filter-row select {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-btn-reset {
    background-color: #334155 !important;
    color: #e2e8f0 !important;
    border-color: #475569 !important;
}

/* Table */
:root[data-theme="dark"] .rm-table-wrapper {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-table thead tr {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .rm-table thead th {
    color: #94a3b8 !important;
    border-color: #334155 !important;
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .rm-table tbody tr {
    border-color: #334155 !important;
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .rm-table tbody tr:hover {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .rm-table tbody td {
    color: #cbd5e1 !important;
    background-color: transparent !important;
}

/* Modals */
:root[data-theme="dark"] .rm-modal-box {
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .rm-modal-header {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-modal-header h3 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .rm-modal-close-x   { color: #94a3b8 !important; }
:root[data-theme="dark"] .rm-modal-footer {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-modal-body {
    background-color: #1e293b !important;
    color: #e2e8f0 !important;
}
:root[data-theme="dark"] .rm-form-section-title {
    color: #38bdf8 !important;
    border-color: #0369a1 !important;
}
:root[data-theme="dark"] .rm-form-group label { color: #94a3b8 !important; }
:root[data-theme="dark"] .rm-form-group input,
:root[data-theme="dark"] .rm-form-group select,
:root[data-theme="dark"] .rm-form-group textarea {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-detail-label { color: #475569 !important; }
:root[data-theme="dark"] .rm-detail-value { color: #e2e8f0 !important; }
:root[data-theme="dark"] .rm-modal-body > div[style*="background:#f8fafc"] {
    background-color: #0f172a !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .rm-btn-secondary {
    background-color: #334155 !important;
    color: #e2e8f0 !important;
    border-color: #475569 !important;
}
:root[data-theme="dark"] div[style*="background: #f0fdf4"],
:root[data-theme="dark"] div[style*="background:#f0fdf4"] {
    background-color: #064e3b !important;
    border-color: #047857 !important;
}
:root[data-theme="dark"] div[style*="background: #f0fdf4"] label,
:root[data-theme="dark"] div[style*="background:#f0fdf4"] label {
    color: #a7f3d0 !important;
}

@media print {
    .rm-header-actions, .rm-filter-row, .rm-modal-overlay { display: none !important; }
    .rm-kpi-card { box-shadow: none; border: 1px solid #e2e8f0; }
    .rm-table { font-size: 10px; }
}
</style>

<div class="rm-wrapper" id="rmWrapper">
    <div class="rm-header">
        <div class="rm-header-left">
            <h2>&#128200; 30-Day Readmission &amp; Hospital Mortality Report</h2>
            <p>JCAHO &amp; CMS Clinical Quality Standard: Inpatient return tracking within 30 days of discharge &amp; mortality surveillance</p>
        </div>
        <div class="rm-header-actions">
            <button class="rm-btn-primary" id="rmAddBtn">+ Log Surveillance Case</button>
            <button class="rm-btn-secondary" id="rmPrintBtn">&#128438; Print Report</button>
        </div>
    </div>

    <div class="rm-kpi-grid">
        <div class="rm-kpi-card">
            <div class="rm-kpi-label">Total Discharges</div>
            <div class="rm-kpi-value" id="rmKpiTotal">&mdash;</div>
            <div class="rm-kpi-sub">index admissions tracked</div>
        </div>
        <div class="rm-kpi-card red">
            <div class="rm-kpi-label">30-Day Readmissions</div>
            <div class="rm-kpi-value" id="rmKpiReadm">&mdash;</div>
            <div class="rm-kpi-sub" id="rmKpiReadmRate">unplanned return rate</div>
        </div>
        <div class="rm-kpi-card orange">
            <div class="rm-kpi-label">Preventable Readm</div>
            <div class="rm-kpi-value" id="rmKpiPreventable">&mdash;</div>
            <div class="rm-kpi-sub">transition care breakdown</div>
        </div>
        <div class="rm-kpi-card amber">
            <div class="rm-kpi-label">Total Deaths</div>
            <div class="rm-kpi-value" id="rmKpiMort">&mdash;</div>
            <div class="rm-kpi-sub" id="rmKpiMortRate">hospital &amp; 30d post-disch</div>
        </div>
        <div class="rm-kpi-card purple">
            <div class="rm-kpi-label">Med Reconciliation</div>
            <div class="rm-kpi-value" id="rmKpiMedRec">&mdash;</div>
            <div class="rm-kpi-sub" id="rmKpiMedRecRate">NPSG compliant at disch</div>
        </div>
        <div class="rm-kpi-card green">
            <div class="rm-kpi-label">Follow-up Call</div>
            <div class="rm-kpi-value" id="rmKpiFollowup">&mdash;</div>
            <div class="rm-kpi-sub" id="rmKpiFollowupRate">48-72h transition call</div>
        </div>
    </div>

    <div class="rm-filter-row">
        <input type="date" id="rmDateFrom" title="Discharge Date From" />
        <input type="date" id="rmDateTo" title="Discharge Date To" />
        <select id="rmDeptFilter"><option value="">All Departments</option></select>
        <select id="rmReadmStatusFilter">
            <option value="">All Readmission Status</option>
            <option value="No Readmission">No Readmission</option>
            <option value="Planned Readmission">Planned Readmission</option>
            <option value="Unplanned Readmission (Within 30 Days)">Unplanned Readmission (&le;30d)</option>
            <option value="Readmission (>30 Days)">Readmission (&gt;30d)</option>
        </select>
        <select id="rmMortStatusFilter">
            <option value="">All Mortality Status</option>
            <option value="Alive">Alive</option>
            <option value="Inpatient Mortality">Inpatient Mortality</option>
            <option value="30-Day Post-Discharge Mortality">30-Day Post-Discharge Mortality</option>
        </select>
        <select id="rmRiskFilter">
            <option value="">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
            <option value="Very High">Very High Risk</option>
        </select>
        <select id="rmStatusFilter">
            <option value="">All Surveillance Status</option>
            <option value="Under 30-Day Surveillance">Under 30-Day Surveillance</option>
            <option value="Readmitted">Readmitted</option>
            <option value="Closed - 30d Completed">Closed - 30d Completed</option>
            <option value="Mortality Review">Mortality Review</option>
        </select>
        <input type="text" class="rm-search-input" id="rmSearchInput" placeholder="Search patient, MRN, diagnosis, ICD-10, physician..." />
        <button class="rm-btn-apply" id="rmApplyBtn">Apply Filters</button>
        <button class="rm-btn-reset" id="rmResetBtn">Reset</button>
    </div>

    <div class="rm-table-wrapper">
        <table class="rm-table">
            <thead>
                <tr>
                    <th>Record #</th>
                    <th>Discharge</th>
                    <th>Department</th>
                    <th>Patient</th>
                    <th>Primary Diagnosis</th>
                    <th>LOS</th>
                    <th>Readmission Status</th>
                    <th>Mortality</th>
                    <th>Risk</th>
                    <th>Med Rec</th>
                    <th>Call</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="rmTableBody">
                <tr><td colspan="13" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading readmission &amp; mortality records...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- LOG SURVEILLANCE RECORD MODAL -->
<div class="rm-modal-overlay" id="rmAddModal">
    <div class="rm-modal-box">
        <div class="rm-modal-header">
            <h3>&#128200; Log Inpatient Discharge &amp; Readmission Surveillance</h3>
            <button class="rm-modal-close-x" id="rmCancelAddBtn">&times;</button>
        </div>
        <div class="rm-modal-body">
            <form id="rmAddForm" autocomplete="off">
                <div class="rm-form-grid">
                    <div class="rm-form-section-title">Patient &amp; Hospitalization Info</div>
                    <div class="rm-form-group full-width" style="grid-column: 1 / -1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px;">
                        <label style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
                            <span>&#128100; Select Patient from EHR Patient List</span>
                            <span style="font-size: 11px; font-weight: 400; color: #15803d;">(Auto-populates Name, MRN, Age &amp; Gender)</span>
                        </label>
                        <select id="rmFPatientSelect" style="width: 100%; margin-top: 4px; border-color: #86efac;">
                            <option value="">-- Loading patients... --</option>
                        </select>
                        <input type="hidden" id="rmFPatientId" />
                    </div>
                    <div class="rm-form-group">
                        <label>Patient Name *</label>
                        <input type="text" id="rmFPatientName" placeholder="Full name" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Patient MRN / Patient No *</label>
                        <input type="text" id="rmFPatientMrn" placeholder="PAT-XXXXXX" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Age *</label>
                        <input type="number" id="rmFAge" min="0" max="120" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Gender *</label>
                        <select id="rmFGender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Admission Date *</label>
                        <input type="date" id="rmFAdmDate" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Discharge Date *</label>
                        <input type="date" id="rmFDischDate" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Department *</label>
                        <select id="rmFDept" required>
                            <option value="">-- Select --</option>
                            <option>Cardiology</option>
                            <option>Cardiology / Cath Lab</option>
                            <option>Cardiothoracic Surgery</option>
                            <option>Pulmonology / Med-Surg</option>
                            <option>Inpatient / Med-Surg</option>
                            <option>Intensive Care Unit (ICU)</option>
                            <option>Neurology / Stroke Unit</option>
                            <option>Orthopedics</option>
                            <option>Endocrinology / Inpatient</option>
                            <option>Nephrology / Inpatient</option>
                            <option>Gastroenterology</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Ward / Bed</label>
                        <input type="text" id="rmFWardBed" placeholder="e.g. Room 204-B, Bed 12" />
                    </div>
                    <div class="rm-form-group">
                        <label>Primary Diagnosis *</label>
                        <input type="text" id="rmFDiagnosis" placeholder="e.g. Acute Decompensated Heart Failure" required />
                    </div>
                    <div class="rm-form-group">
                        <label>ICD-10 Code</label>
                        <input type="text" id="rmFIcd10" placeholder="e.g. I50.9, J44.1" />
                    </div>
                    <div class="rm-form-group">
                        <label>Attending Physician *</label>
                        <input type="text" id="rmFPhysician" placeholder="Dr. Name" required />
                    </div>
                    <div class="rm-form-group">
                        <label>Discharge Disposition</label>
                        <select id="rmFDisposition">
                            <option value="Home">Home</option>
                            <option value="Home with Home Health">Home with Home Health</option>
                            <option value="Skilled Nursing Facility (SNF)">Skilled Nursing Facility (SNF)</option>
                            <option value="Rehabilitation Facility">Rehabilitation Facility</option>
                            <option value="Long-term Acute Care (LTAC)">Long-term Acute Care (LTAC)</option>
                            <option value="Hospice">Hospice</option>
                            <option value="Expired">Expired</option>
                            <option value="AMA">Against Medical Advice (AMA)</option>
                        </select>
                    </div>

                    <div class="rm-form-section-title">Care Transition &amp; JCAHO NPSG Checklist</div>
                    <div class="rm-form-group">
                        <label>Medication Reconciliation Completed? (NPSG 03.06.01)</label>
                        <select id="rmFMedRec">
                            <option value="1" selected>Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Follow-up Appointment Scheduled?</label>
                        <select id="rmFFollowupAppt">
                            <option value="1" selected>Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>48-72h Post-Discharge Call Completed?</label>
                        <select id="rmFFollowupCall">
                            <option value="0">No / Pending</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Risk Score (LACE / CMS index)</label>
                        <select id="rmFRisk">
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                            <option value="Very High">Very High</option>
                        </select>
                    </div>

                    <div class="rm-form-section-title">Readmission &amp; Mortality Outcome (if known)</div>
                    <div class="rm-form-group">
                        <label>Readmission Status</label>
                        <select id="rmFReadmStatus">
                            <option value="No Readmission">No Readmission</option>
                            <option value="Planned Readmission">Planned Readmission</option>
                            <option value="Unplanned Readmission (Within 30 Days)">Unplanned Readmission (Within 30 Days)</option>
                            <option value="Readmission (>30 Days)">Readmission (>30 Days)</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Date</label>
                        <input type="date" id="rmFReadmDate" />
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Diagnosis</label>
                        <input type="text" id="rmFReadmDiag" placeholder="Diagnosis upon return" />
                    </div>
                    <div class="rm-form-group">
                        <label>Potentially Preventable Readmission?</label>
                        <select id="rmFReadmPreventable">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Mortality Status</label>
                        <select id="rmFMortStatus">
                            <option value="Alive" selected>Alive</option>
                            <option value="Inpatient Mortality">Inpatient Mortality</option>
                            <option value="30-Day Post-Discharge Mortality">30-Day Post-Discharge Mortality</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Cause of Death</label>
                        <input type="text" id="rmFCauseDeath" placeholder="Primary cause of mortality" />
                    </div>
                    <div class="rm-form-group">
                        <label>Surveillance Status</label>
                        <select id="rmFStatus">
                            <option value="Under 30-Day Surveillance">Under 30-Day Surveillance</option>
                            <option value="Readmitted">Readmitted</option>
                            <option value="Closed - 30d Completed">Closed - 30d Completed</option>
                            <option value="Mortality Review">Mortality Review</option>
                        </select>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Root Cause Analysis (for readmissions / unexpected death)</label>
                        <textarea id="rmFRootCause" placeholder="Describe clinical root cause or transitional care breakdown..."></textarea>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Transitional Care / Intervention Plan</label>
                        <textarea id="rmFIntervention" placeholder="Actions taken (home health referral, specialty callback, DME delivery)..."></textarea>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Notes</label>
                        <textarea id="rmFNotes" placeholder="Additional remarks..."></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="rm-modal-footer">
            <button type="button" class="rm-btn-secondary" id="rmCancelAddBtn2">Cancel</button>
            <button type="submit" form="rmAddForm" class="rm-btn-primary" id="rmSubmitAddBtn">Save Record</button>
        </div>
    </div>
</div>

<!-- DETAIL & UPDATE MODAL -->
<div class="rm-modal-overlay" id="rmDetailModal">
    <div class="rm-modal-box" style="max-width:860px;">
        <div class="rm-modal-header">
            <div>
                <h3>&#128269; Surveillance Case &mdash; <span id="rmDetailRecordNo" style="color:#0284c7;font-family:monospace;">&mdash;</span></h3>
            </div>
            <button class="rm-modal-close-x" id="rmCloseDetailModal">&times;</button>
        </div>
        <div class="rm-modal-body">
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Index Hospitalization Details</div>
                <div class="rm-detail-row"><span class="rm-detail-label">Patient</span><span class="rm-detail-value" id="rmDetailPatient">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Primary Diagnosis</span><span class="rm-detail-value" id="rmDetailDiag" style="font-weight:700;color:#0f172a;">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Department / Ward</span><span class="rm-detail-value" id="rmDetailDept">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Admission &rarr; Discharge</span><span class="rm-detail-value" id="rmDetailDates">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Length of Stay (LOS)</span><span class="rm-detail-value" id="rmDetailLos">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Attending Physician</span><span class="rm-detail-value" id="rmDetailPhysician">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Discharge Disposition</span><span class="rm-detail-value" id="rmDetailDisposition">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Readmission Outcome</span><span class="rm-detail-value" id="rmDetailReadmOutcome" style="font-weight:700;">&mdash;</span></div>
                <div class="rm-detail-row"><span class="rm-detail-label">Mortality Outcome</span><span class="rm-detail-value" id="rmDetailMortOutcome">&mdash;</span></div>
            </div>

            <div style="font-size:12px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #e0f2fe;">Update 30-Day Outcomes &amp; Quality Review</div>
            <form id="rmDetailForm" autocomplete="off">
                <input type="hidden" id="rmDetailRecordId" />
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label>Readmission Status</label>
                        <select id="rmUReadmStatus">
                            <option value="No Readmission">No Readmission</option>
                            <option value="Planned Readmission">Planned Readmission</option>
                            <option value="Unplanned Readmission (Within 30 Days)">Unplanned Readmission (Within 30 Days)</option>
                            <option value="Readmission (>30 Days)">Readmission (>30 Days)</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Date</label>
                        <input type="date" id="rmUReadmDate" />
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Diagnosis</label>
                        <input type="text" id="rmUReadmDiag" placeholder="Readmission chief complaint / diagnosis" />
                    </div>
                    <div class="rm-form-group">
                        <label>Readmission Department</label>
                        <input type="text" id="rmUReadmDept" placeholder="Department admitted to" />
                    </div>
                    <div class="rm-form-group">
                        <label>Potentially Preventable Readmission?</label>
                        <select id="rmUReadmPreventable">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Mortality Status</label>
                        <select id="rmUMortStatus">
                            <option value="Alive">Alive</option>
                            <option value="Inpatient Mortality">Inpatient Mortality</option>
                            <option value="30-Day Post-Discharge Mortality">30-Day Post-Discharge Mortality</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Mortality Date</label>
                        <input type="date" id="rmUMortDate" />
                    </div>
                    <div class="rm-form-group">
                        <label>Cause of Death</label>
                        <input type="text" id="rmUCauseDeath" placeholder="Primary cause of death" />
                    </div>
                    <div class="rm-form-group">
                        <label>Medication Reconciliation Done</label>
                        <select id="rmUMedRec">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Follow-up Call Completed</label>
                        <select id="rmUFollowupCall">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Follow-up Appt Scheduled</label>
                        <select id="rmUFollowupAppt">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Risk Score</label>
                        <select id="rmURisk">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Very High">Very High</option>
                        </select>
                    </div>
                    <div class="rm-form-group">
                        <label>Surveillance Status</label>
                        <select id="rmUStatus">
                            <option value="Under 30-Day Surveillance">Under 30-Day Surveillance</option>
                            <option value="Readmitted">Readmitted</option>
                            <option value="Closed - 30d Completed">Closed - 30d Completed</option>
                            <option value="Mortality Review">Mortality Review</option>
                        </select>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Root Cause Analysis</label>
                        <textarea id="rmURootCause" placeholder="Document clinical root cause..."></textarea>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Care Transition / Intervention Plan</label>
                        <textarea id="rmUIntervention" placeholder="Document care transition plan or corrective action..."></textarea>
                    </div>
                    <div class="rm-form-group full-width">
                        <label>Notes</label>
                        <textarea id="rmUNotes"></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="rm-modal-footer">
            <button type="button" class="rm-btn-secondary" id="rmCloseDetailBtn">Close</button>
            <button type="submit" form="rmDetailForm" class="rm-btn-primary" id="rmSaveDetailBtn">Save &amp; Update</button>
        </div>
    </div>
</div>
`;
}
