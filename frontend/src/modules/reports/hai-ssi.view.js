export function HAISSIView() {
    return `
<style>
.hai-wrapper {
    padding: 24px;
    max-width: 100%;
    font-family: var(--font-primary, "Inter", sans-serif);
    color: var(--text-primary, #1e293b);
}
.hai-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}
.hai-header-left h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    margin: 0 0 4px 0;
}
.hai-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.hai-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.hai-btn-primary {
    background: #dc2626;
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
.hai-btn-primary:hover {
    background: #b91c1c;
}
.hai-btn-secondary {
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
.hai-btn-secondary:hover {
    background: #e2e8f0;
}

/* KPI Cards */
.hai-kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 22px;
}
@media (max-width: 1200px) { .hai-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .hai-kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.hai-kpi-card {
    background: #ffffff;
    border-radius: 10px;
    padding: 16px 18px;
    border-left: 4px solid #94a3b8;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.hai-kpi-card.red    { border-left-color: #ef4444; }
.hai-kpi-card.orange { border-left-color: #f97316; }
.hai-kpi-card.amber  { border-left-color: #f59e0b; }
.hai-kpi-card.purple { border-left-color: #a855f7; }
.hai-kpi-card.green  { border-left-color: #22c55e; }

.hai-kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.hai-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #1e293b;
    line-height: 1;
}
.hai-kpi-sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

/* Filter Toolbar */
.hai-filter-row {
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
.hai-filter-row input,
.hai-filter-row select {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    background: #ffffff;
    color: #1e293b;
    min-width: 120px;
}
.hai-filter-row .hai-search-input {
    flex: 1;
    min-width: 200px;
}
.hai-btn-apply {
    background: #dc2626;
    color: #ffffff;
    border: none;
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.hai-btn-apply:hover { background: #b91c1c; }
.hai-btn-reset {
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
.hai-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
}
.hai-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.hai-table thead tr {
    background: #f1f5f9;
}
.hai-table thead th {
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
.hai-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
}
.hai-table tbody tr:hover {
    background: #f8fafc;
}
.hai-table tbody td {
    padding: 10px 12px;
    vertical-align: middle;
    color: #334155;
}

/* Modals */
.hai-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9000;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.hai-modal-box {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 820px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.hai-modal-header {
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
.hai-modal-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}
.hai-modal-close-x {
    background: none;
    border: none;
    font-size: 22px;
    color: #64748b;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
}
.hai-modal-body {
    padding: 22px;
}
.hai-modal-footer {
    padding: 16px 22px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    position: sticky;
    bottom: 0;
    background: #ffffff;
}
.hai-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.hai-form-grid .full-width {
    grid-column: 1 / -1;
}
.hai-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 5px;
}
.hai-form-group input,
.hai-form-group select,
.hai-form-group textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
}
.hai-form-group textarea {
    resize: vertical;
    min-height: 65px;
}
.hai-form-section-title {
    font-size: 12px;
    font-weight: 700;
    color: #dc2626;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0 4px 0;
    border-bottom: 1px solid #fee2e2;
    margin-bottom: 12px;
    grid-column: 1 / -1;
}
.hai-detail-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: flex-start;
}
.hai-detail-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    min-width: 160px;
}
.hai-detail-value {
    font-size: 13px;
    color: #1e293b;
    flex: 1;
}

/* ===================================================
   DARK MODE — uses :root[data-theme="dark"] with
   !important to beat global main.css overrides
   =================================================== */

:root[data-theme="dark"] .hai-wrapper {
    color: #e2e8f0 !important;
    background: transparent !important;
}
:root[data-theme="dark"] .hai-header-left h2 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .hai-header-left p  { color: #94a3b8 !important; }

/* KPI cards */
:root[data-theme="dark"] .hai-kpi-card {
    background-color: #1e293b !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4) !important;
}
:root[data-theme="dark"] .hai-kpi-value { color: #f1f5f9 !important; }
:root[data-theme="dark"] .hai-kpi-label { color: #94a3b8 !important; }
:root[data-theme="dark"] .hai-kpi-sub   { color: #475569 !important; }

/* Filter toolbar */
:root[data-theme="dark"] .hai-filter-row {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-filter-row input,
:root[data-theme="dark"] .hai-filter-row select {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-btn-reset {
    background-color: #334155 !important;
    color: #e2e8f0 !important;
    border-color: #475569 !important;
}

/* Table */
:root[data-theme="dark"] .hai-table-wrapper {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-table thead tr {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .hai-table thead th {
    color: #94a3b8 !important;
    border-color: #334155 !important;
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .hai-table tbody tr {
    border-color: #334155 !important;
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .hai-table tbody tr:hover {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .hai-table tbody td {
    color: #cbd5e1 !important;
    background-color: transparent !important;
}

/* Modals */
:root[data-theme="dark"] .hai-modal-box {
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .hai-modal-header {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-modal-header h3 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .hai-modal-close-x   { color: #94a3b8 !important; }
:root[data-theme="dark"] .hai-modal-footer {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-modal-body {
    background-color: #1e293b !important;
    color: #e2e8f0 !important;
}
:root[data-theme="dark"] .hai-form-section-title {
    color: #fca5a5 !important;
    border-color: #7f1d1d !important;
}
:root[data-theme="dark"] .hai-form-group label { color: #94a3b8 !important; }
:root[data-theme="dark"] .hai-form-group input,
:root[data-theme="dark"] .hai-form-group select,
:root[data-theme="dark"] .hai-form-group textarea {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-detail-label { color: #475569 !important; }
:root[data-theme="dark"] .hai-detail-value { color: #e2e8f0 !important; }
:root[data-theme="dark"] .hai-modal-body > div[style*="background:#f8fafc"] {
    background-color: #0f172a !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .hai-btn-secondary {
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
    .hai-header-actions, .hai-filter-row, .hai-modal-overlay { display: none !important; }
    .hai-kpi-card { box-shadow: none; border: 1px solid #e2e8f0; }
    .hai-table { font-size: 10px; }
}
</style>

<div class="hai-wrapper" id="haiWrapper">
    <div class="hai-header">
        <div class="hai-header-left">
            <h2>&#127973; Hospital-Acquired Infection (HAI) &amp; Surgical Site Infection (SSI) Report</h2>
            <p>JCAHO Standard: Post-operative wound infections, device-associated infections &amp; antibiotic stewardship tracking</p>
        </div>
        <div class="hai-header-actions">
            <button class="hai-btn-primary" id="haiAddBtn">+ Log Infection Case</button>
            <button class="hai-btn-secondary" id="haiPrintBtn">&#128438; Print Report</button>
        </div>
    </div>

    <div class="hai-kpi-grid">
        <div class="hai-kpi-card">
            <div class="hai-kpi-label">Total Cases</div>
            <div class="hai-kpi-value" id="haiKpiTotal">&mdash;</div>
            <div class="hai-kpi-sub">all HAI/SSI logged</div>
        </div>
        <div class="hai-kpi-card red">
            <div class="hai-kpi-label">SSI Cases</div>
            <div class="hai-kpi-value" id="haiKpiSSI">&mdash;</div>
            <div class="hai-kpi-sub">surgical site infections</div>
        </div>
        <div class="hai-kpi-card orange">
            <div class="hai-kpi-label">Device-Associated</div>
            <div class="hai-kpi-value" id="haiKpiDevice">&mdash;</div>
            <div class="hai-kpi-sub">CLABSI / CAUTI / VAP</div>
        </div>
        <div class="hai-kpi-card amber">
            <div class="hai-kpi-label">Severe / Critical</div>
            <div class="hai-kpi-value" id="haiKpiSevere">&mdash;</div>
            <div class="hai-kpi-sub">high-acuity infections</div>
        </div>
        <div class="hai-kpi-card purple">
            <div class="hai-kpi-label">Active Cases</div>
            <div class="hai-kpi-value" id="haiKpiActive">&mdash;</div>
            <div class="hai-kpi-sub">under treatment</div>
        </div>
        <div class="hai-kpi-card green">
            <div class="hai-kpi-label">Bundle Compliance</div>
            <div class="hai-kpi-value" id="haiKpiBundle">&mdash;</div>
            <div class="hai-kpi-sub" id="haiKpiBundleRate">prevention bundle rate</div>
        </div>
    </div>

    <div class="hai-filter-row">
        <input type="date" id="haiDateFrom" title="Date From" />
        <input type="date" id="haiDateTo" title="Date To" />
        <select id="haiTypeFilter">
            <option value="">All Types</option>
            <option value="SSI">SSI</option>
            <option value="CLABSI">CLABSI</option>
            <option value="CAUTI">CAUTI</option>
            <option value="VAP">VAP</option>
            <option value="MRSA">MRSA</option>
            <option value="CDI">CDI</option>
            <option value="Other HAI">Other HAI</option>
        </select>
        <select id="haiDeptFilter"><option value="">All Departments</option></select>
        <select id="haiSeverityFilter">
            <option value="">All Severity</option>
            <option value="Mild">Mild</option>
            <option value="Moderate">Moderate</option>
            <option value="Severe">Severe</option>
            <option value="Critical">Critical</option>
        </select>
        <select id="haiStatusFilter">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Resolved">Resolved</option>
            <option value="Reported">Reported</option>
            <option value="Closed">Closed</option>
        </select>
        <input type="text" class="hai-search-input" id="haiSearchInput" placeholder="Search patient, pathogen, tracking #, dept, procedure..." />
        <button class="hai-btn-apply" id="haiApplyBtn">Apply Filters</button>
        <button class="hai-btn-reset" id="haiResetBtn">Reset</button>
    </div>

    <div class="hai-table-wrapper">
        <table class="hai-table">
            <thead>
                <tr>
                    <th>Tracking #</th>
                    <th>Report Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Patient</th>
                    <th>Pathogen</th>
                    <th>Severity</th>
                    <th>Bundle</th>
                    <th>CDC</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="haiTableBody">
                <tr><td colspan="12" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading infection records...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- LOG INFECTION MODAL -->
<div class="hai-modal-overlay" id="haiAddModal">
    <div class="hai-modal-box">
        <div class="hai-modal-header">
            <h3>&#127973; Log Hospital-Acquired / Surgical Site Infection</h3>
            <button class="hai-modal-close-x" id="haiCancelAddBtn">&times;</button>
        </div>
        <div class="hai-modal-body">
            <form id="haiAddForm" autocomplete="off">
                <div class="hai-form-grid">
                    <div class="hai-form-section-title">Infection Classification</div>
                    <div class="hai-form-group">
                        <label>Infection Type *</label>
                        <select id="haiFType" required>
                            <option value="SSI">SSI (Surgical Site Infection)</option>
                            <option value="CLABSI">CLABSI (Central Line-Associated BSI)</option>
                            <option value="CAUTI">CAUTI (Catheter-Associated UTI)</option>
                            <option value="VAP">VAP (Ventilator-Associated Pneumonia)</option>
                            <option value="MRSA">MRSA Bacteremia</option>
                            <option value="CDI">CDI (C. difficile Infection)</option>
                            <option value="Other HAI">Other HAI</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Infection Category *</label>
                        <select id="haiFCategory" required>
                            <option value="Superficial Incisional">Superficial Incisional</option>
                            <option value="Deep Incisional">Deep Incisional</option>
                            <option value="Organ/Space">Organ/Space</option>
                            <option value="Primary Bloodstream">Primary Bloodstream</option>
                            <option value="Urinary Tract">Urinary Tract</option>
                            <option value="Pneumonia">Pneumonia</option>
                            <option value="Skin/Soft Tissue">Skin/Soft Tissue</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Report Date *</label>
                        <input type="date" id="haiFReportDate" required />
                    </div>
                    <div class="hai-form-group">
                        <label>Infection Onset Date *</label>
                        <input type="date" id="haiFOnsetDate" required />
                    </div>

                    <div class="hai-form-section-title">Surgical Details (SSI)</div>
                    <div class="hai-form-group">
                        <label>Procedure / Surgery Type</label>
                        <input type="text" id="haiFProcedure" placeholder="e.g. Open Appendectomy, Cesarean Section" />
                    </div>
                    <div class="hai-form-group">
                        <label>Surgery Date</label>
                        <input type="date" id="haiFSurgeryDate" />
                    </div>
                    <div class="hai-form-group">
                        <label>Surgeon / Attending</label>
                        <input type="text" id="haiFSurgeon" placeholder="Dr. Name" />
                    </div>
                    <div class="hai-form-group">
                        <label>Antibiotic Prophylaxis Given?</label>
                        <select id="haiFProphylaxis">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Prophylaxis Timing Correct? (&lt;60 min pre-incision)</label>
                        <select id="haiFProphylaxisTiming">
                            <option value="0">No / N/A</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>&nbsp;</label>
                        <div style="font-size:11px;color:#94a3b8;padding-top:8px;">JCAHO: antibiotic prophylaxis within 60 min of incision.</div>
                    </div>

                    <div class="hai-form-section-title">Location &amp; Patient</div>
                    <div class="hai-form-group">
                        <label>Department *</label>
                        <select id="haiFDept" required>
                            <option value="">-- Select --</option>
                            <option>Surgery / Operating Room</option>
                            <option>Intensive Care Unit (ICU)</option>
                            <option>Inpatient / Med-Surg</option>
                            <option>Orthopedics</option>
                            <option>Obstetrics / Labor &amp; Delivery</option>
                            <option>Gastroenterology</option>
                            <option>Cardiology</option>
                            <option>Emergency Department</option>
                            <option>Outpatient Clinic</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Ward / Bed</label>
                        <input type="text" id="haiFWardBed" placeholder="e.g. Room 302-A, ICU Bed 4" />
                    </div>
                    <div class="hai-form-group full-width" style="grid-column: 1 / -1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px;">
                        <label style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
                            <span>&#128100; Select Patient from EHR Patient List</span>
                            <span style="font-size: 11px; font-weight: 400; color: #15803d;">(Auto-populates Name, MRN &amp; Age)</span>
                        </label>
                        <select id="haiFPatientSelect" style="width: 100%; margin-top: 4px; border-color: #86efac;">
                            <option value="">-- Loading patients... --</option>
                        </select>
                        <input type="hidden" id="haiFPatientId" />
                    </div>
                    <div class="hai-form-group">
                        <label>Patient Name</label>
                        <input type="text" id="haiFPatientName" placeholder="Full name" />
                    </div>
                    <div class="hai-form-group">
                        <label>Patient MRN / Patient No</label>
                        <input type="text" id="haiFPatientMrn" placeholder="PAT-XXXXXX" />
                    </div>
                    <div class="hai-form-group">
                        <label>Patient Age</label>
                        <input type="number" id="haiFAge" min="0" max="120" />
                    </div>
                    <div class="hai-form-group">
                        <label>Identified By *</label>
                        <input type="text" id="haiFIdentifiedBy" placeholder="Reporting clinician name" required />
                    </div>
                    <div class="hai-form-group">
                        <label>Identifier Role</label>
                        <input type="text" id="haiFIdentifiedRole" placeholder="e.g. Infection Control Nurse" />
                    </div>
                    <div class="hai-form-group full-width">
                        <label>Patient Risk Factors</label>
                        <textarea id="haiFRiskFactors" placeholder="Diabetes, immunosuppression, obesity, age > 65, recent antibiotics..."></textarea>
                    </div>

                    <div class="hai-form-section-title">Microbiology &amp; Device</div>
                    <div class="hai-form-group">
                        <label>Pathogen Isolated</label>
                        <input type="text" id="haiFPathogen" placeholder="e.g. S. aureus, Klebsiella pneumoniae" />
                    </div>
                    <div class="hai-form-group">
                        <label>Antibiotic Resistance Profile</label>
                        <input type="text" id="haiFResistance" placeholder="e.g. MRSA, ESBL, MDR, Carbapenem-resistant" />
                    </div>
                    <div class="hai-form-group">
                        <label>Device-Associated?</label>
                        <select id="haiFDeviceAssoc">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Device Type</label>
                        <input type="text" id="haiFDeviceType" placeholder="e.g. CVC, Foley Catheter, ETT" />
                    </div>
                    <div class="hai-form-group">
                        <label>Device Days</label>
                        <input type="number" id="haiFDeviceDays" min="0" placeholder="Days in place" />
                    </div>
                    <div class="hai-form-group">
                        <label>Isolation Precautions</label>
                        <input type="text" id="haiFIsolation" placeholder="e.g. Contact Precautions, Standard" />
                    </div>

                    <div class="hai-form-section-title">Clinical Outcome &amp; Stewardship</div>
                    <div class="hai-form-group">
                        <label>Severity</label>
                        <select id="haiFSeverity">
                            <option value="Mild">Mild</option>
                            <option value="Moderate" selected>Moderate</option>
                            <option value="Severe">Severe</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Outcome</label>
                        <select id="haiFOutcome">
                            <option value="Ongoing">Ongoing</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Transferred">Transferred</option>
                            <option value="Deceased">Deceased</option>
                            <option value="Discharged with Infection">Discharged with Infection</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Status</label>
                        <select id="haiFStatus">
                            <option value="Active">Active</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Reported">Reported</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Bundle Compliance?</label>
                        <select id="haiFBundle">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group">
                        <label>Reported to CDC/DOH?</label>
                        <select id="haiFCDC">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group full-width">
                        <label>Treatment Regimen</label>
                        <textarea id="haiFTreatment" placeholder="Antibiotics, debridement, device removal, etc."></textarea>
                    </div>
                    <div class="hai-form-group full-width">
                        <label>Root Cause</label>
                        <textarea id="haiFRootCause" placeholder="Identified root cause of the infection..."></textarea>
                    </div>
                    <div class="hai-form-group full-width">
                        <label>Corrective Action / CAPA</label>
                        <textarea id="haiFCorrectiveAction" placeholder="Corrective and preventive actions taken or planned..."></textarea>
                    </div>
                    <div class="hai-form-group full-width">
                        <label>Notes</label>
                        <textarea id="haiFNotes" placeholder="Additional remarks..."></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="hai-modal-footer">
            <button type="button" class="hai-btn-secondary" id="haiCancelAddBtn2">Cancel</button>
            <button type="submit" form="haiAddForm" class="hai-btn-primary" id="haiSubmitAddBtn">Submit Report</button>
        </div>
    </div>
</div>

<!-- DETAIL / UPDATE MODAL -->
<div class="hai-modal-overlay" id="haiDetailModal">
    <div class="hai-modal-box" style="max-width:860px;">
        <div class="hai-modal-header">
            <div><h3>&#128269; Infection Case &mdash; <span id="haiDetailTracking" style="color:#dc2626;font-family:monospace;">&mdash;</span></h3></div>
            <button class="hai-modal-close-x" id="haiCloseDetailModal">&times;</button>
        </div>
        <div class="hai-modal-body">
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Case Details</div>
                <div class="hai-detail-row"><span class="hai-detail-label">Type / Category</span><span class="hai-detail-value" id="haiDetailType">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Department / Ward</span><span class="hai-detail-value" id="haiDetailDept">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Patient</span><span class="hai-detail-value" id="haiDetailPatient">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Risk Factors</span><span class="hai-detail-value" id="haiDetailRisk">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Onset Date</span><span class="hai-detail-value" id="haiDetailOnset">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Procedure (SSI)</span><span class="hai-detail-value" id="haiDetailProcedure">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Pathogen</span><span class="hai-detail-value" id="haiDetailPathogen" style="color:#b91c1c;font-weight:700;">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Resistance Profile</span><span class="hai-detail-value" id="haiDetailResistance">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Device Info</span><span class="hai-detail-value" id="haiDetailDevice">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Treatment</span><span class="hai-detail-value" id="haiDetailTreatment">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Isolation</span><span class="hai-detail-value" id="haiDetailIsolation">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Root Cause</span><span class="hai-detail-value" id="haiDetailRootCause">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Corrective Action</span><span class="hai-detail-value" id="haiDetailCorrective">&mdash;</span></div>
                <div class="hai-detail-row"><span class="hai-detail-label">Identified By</span><span class="hai-detail-value" id="haiDetailIdentifier">&mdash;</span></div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #fee2e2;">Update Case</div>
            <form id="haiDetailForm" autocomplete="off">
                <input type="hidden" id="haiDetailRecordId" />
                <div class="hai-form-grid">
                    <div class="hai-form-group"><label>Status</label>
                        <select id="haiUStatus">
                            <option value="Active">Active</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Reported">Reported</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div class="hai-form-group"><label>Severity</label>
                        <select id="haiUSeverity">
                            <option value="Mild">Mild</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div class="hai-form-group"><label>Outcome</label>
                        <select id="haiUOutcome">
                            <option value="Ongoing">Ongoing</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Transferred">Transferred</option>
                            <option value="Deceased">Deceased</option>
                            <option value="Discharged with Infection">Discharged with Infection</option>
                        </select>
                    </div>
                    <div class="hai-form-group"><label>Bundle Compliance</label>
                        <select id="haiUBundle">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group"><label>Reported to CDC/DOH</label>
                        <select id="haiUCDC">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group"><label>Pathogen (if updated)</label><input type="text" id="haiUPathogen" /></div>
                    <div class="hai-form-group"><label>Resistance Profile</label><input type="text" id="haiUResistance" /></div>
                    <div class="hai-form-group"><label>Antibiotic Prophylaxis Given</label>
                        <select id="haiUProphylaxis">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="hai-form-group full-width"><label>Treatment Regimen</label><textarea id="haiUTreatment"></textarea></div>
                    <div class="hai-form-group full-width"><label>Root Cause Analysis</label><textarea id="haiURootCause"></textarea></div>
                    <div class="hai-form-group full-width"><label>Corrective Action / CAPA</label><textarea id="haiUCorrective"></textarea></div>
                    <div class="hai-form-group full-width"><label>Notes</label><textarea id="haiUNotes"></textarea></div>
                </div>
            </form>
        </div>
        <div class="hai-modal-footer">
            <button type="button" class="hai-btn-secondary" id="haiCloseDetailBtn">Close</button>
            <button type="submit" form="haiDetailForm" class="hai-btn-primary" id="haiSaveDetailBtn">Save &amp; Update</button>
        </div>
    </div>
</div>
`;
}
