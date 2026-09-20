export function SurgicalSafetyView() {
    return `
<style>
.ssc-wrapper {
    padding: 24px;
    max-width: 100%;
    font-family: var(--font-primary, "Inter", sans-serif);
    color: var(--text-primary, #1e293b);
}
.ssc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}
.ssc-header-left h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    margin: 0 0 4px 0;
}
.ssc-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.ssc-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.ssc-btn-primary {
    background: #059669;
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
.ssc-btn-primary:hover { background: #047857; }
.ssc-btn-secondary {
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
.ssc-btn-secondary:hover { background: #e2e8f0; }

/* KPI Cards */
.ssc-kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 22px;
}
@media (max-width: 1200px) { .ssc-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .ssc-kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.ssc-kpi-card {
    background: #ffffff;
    border-radius: 10px;
    padding: 16px 18px;
    border-left: 4px solid #94a3b8;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.ssc-kpi-card.green  { border-left-color: #10b981; }
.ssc-kpi-card.blue   { border-left-color: #3b82f6; }
.ssc-kpi-card.purple { border-left-color: #8b5cf6; }
.ssc-kpi-card.amber  { border-left-color: #f59e0b; }
.ssc-kpi-card.red    { border-left-color: #ef4444; }

.ssc-kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.ssc-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #1e293b;
    line-height: 1;
}
.ssc-kpi-sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

/* Filter Toolbar */
.ssc-filter-row {
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
.ssc-filter-row input,
.ssc-filter-row select {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    background: #ffffff;
    color: #1e293b;
    min-width: 120px;
}
.ssc-filter-row .ssc-search-input {
    flex: 1;
    min-width: 200px;
}
.ssc-btn-apply {
    background: #059669;
    color: #ffffff;
    border: none;
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.ssc-btn-apply:hover { background: #047857; }
.ssc-btn-reset {
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
.ssc-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
}
.ssc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.ssc-table thead tr {
    background: #f1f5f9;
}
.ssc-table thead th {
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
.ssc-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
}
.ssc-table tbody tr:hover {
    background: #f8fafc;
}
.ssc-table tbody td {
    padding: 10px 12px;
    vertical-align: middle;
    color: #334155;
}

/* Modals */
.ssc-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9000;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.ssc-modal-box {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 860px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.ssc-modal-header {
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
.ssc-modal-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}
.ssc-modal-close-x {
    background: none;
    border: none;
    font-size: 22px;
    color: #64748b;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
}
.ssc-modal-body {
    padding: 22px;
}
.ssc-modal-footer {
    padding: 16px 22px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    position: sticky;
    bottom: 0;
    background: #ffffff;
}
.ssc-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.ssc-form-grid .full-width {
    grid-column: 1 / -1;
}
.ssc-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 5px;
}
.ssc-form-group input,
.ssc-form-group select,
.ssc-form-group textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
}
.ssc-form-group textarea {
    resize: vertical;
    min-height: 65px;
}
.ssc-form-section-title {
    font-size: 12px;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0 4px 0;
    border-bottom: 1px solid #d1fae5;
    margin-bottom: 12px;
    grid-column: 1 / -1;
}
.ssc-detail-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: flex-start;
}
.ssc-detail-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    min-width: 180px;
}
.ssc-detail-value {
    font-size: 13px;
    color: #1e293b;
    flex: 1;
}

/* ===================================================
   DARK MODE — uses :root[data-theme="dark"] with
   !important to beat global main.css overrides
   =================================================== */

:root[data-theme="dark"] .ssc-wrapper {
    color: #e2e8f0 !important;
    background: transparent !important;
}
:root[data-theme="dark"] .ssc-header-left h2 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .ssc-header-left p  { color: #94a3b8 !important; }

/* KPI cards */
:root[data-theme="dark"] .ssc-kpi-card {
    background-color: #1e293b !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4) !important;
}
:root[data-theme="dark"] .ssc-kpi-value { color: #f1f5f9 !important; }
:root[data-theme="dark"] .ssc-kpi-label { color: #94a3b8 !important; }
:root[data-theme="dark"] .ssc-kpi-sub   { color: #475569 !important; }

/* Filter toolbar */
:root[data-theme="dark"] .ssc-filter-row {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-filter-row input,
:root[data-theme="dark"] .ssc-filter-row select {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-btn-reset {
    background-color: #334155 !important;
    color: #e2e8f0 !important;
    border-color: #475569 !important;
}

/* Table */
:root[data-theme="dark"] .ssc-table-wrapper {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-table thead tr {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .ssc-table thead th {
    color: #94a3b8 !important;
    border-color: #334155 !important;
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .ssc-table tbody tr {
    border-color: #334155 !important;
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .ssc-table tbody tr:hover {
    background-color: #0f172a !important;
}
:root[data-theme="dark"] .ssc-table tbody td {
    color: #cbd5e1 !important;
    background-color: transparent !important;
}

/* Modals */
:root[data-theme="dark"] .ssc-modal-box {
    background-color: #1e293b !important;
}
:root[data-theme="dark"] .ssc-modal-header {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-modal-header h3 { color: #f1f5f9 !important; }
:root[data-theme="dark"] .ssc-modal-close-x   { color: #94a3b8 !important; }
:root[data-theme="dark"] .ssc-modal-footer {
    background-color: #1e293b !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-modal-body {
    background-color: #1e293b !important;
    color: #e2e8f0 !important;
}
:root[data-theme="dark"] .ssc-form-section-title {
    color: #34d399 !important;
    border-color: #047857 !important;
}
:root[data-theme="dark"] .ssc-form-group label { color: #94a3b8 !important; }
:root[data-theme="dark"] .ssc-form-group input,
:root[data-theme="dark"] .ssc-form-group select,
:root[data-theme="dark"] .ssc-form-group textarea {
    background-color: #0f172a !important;
    color: #e2e8f0 !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-detail-label { color: #475569 !important; }
:root[data-theme="dark"] .ssc-detail-value { color: #e2e8f0 !important; }
:root[data-theme="dark"] .ssc-modal-body > div[style*="background:#f8fafc"] {
    background-color: #0f172a !important;
    border-color: #334155 !important;
}
:root[data-theme="dark"] .ssc-btn-secondary {
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
    .ssc-header-actions, .ssc-filter-row, .ssc-modal-overlay { display: none !important; }
    .ssc-kpi-card { box-shadow: none; border: 1px solid #e2e8f0; }
    .ssc-table { font-size: 10px; }
}
</style>

<div class="ssc-wrapper" id="sscWrapper">
    <div class="ssc-header">
        <div class="ssc-header-left">
            <h2>&#128711; Surgical Safety &amp; Universal Protocol &quot;Time-Out&quot; Audit Log</h2>
            <p>JCAHO Universal Protocol (UP.01.01.01 - UP.01.03.01) &amp; WHO Surgical Safety Checklist compliance monitoring</p>
        </div>
        <div class="ssc-header-actions">
            <button class="ssc-btn-primary" id="sscAddBtn">+ Log Surgical Safety Checklist</button>
            <button class="ssc-btn-secondary" id="sscPrintBtn">&#128438; Print Report</button>
        </div>
    </div>

    <div class="ssc-kpi-grid">
        <div class="ssc-kpi-card">
            <div class="ssc-kpi-label">Total Surgeries</div>
            <div class="ssc-kpi-value" id="sscKpiTotal">&mdash;</div>
            <div class="ssc-kpi-sub">surgical cases audited</div>
        </div>
        <div class="ssc-kpi-card green">
            <div class="ssc-kpi-label">Protocol Compliance</div>
            <div class="ssc-kpi-value" id="sscKpiCompliance">&mdash;</div>
            <div class="ssc-kpi-sub" id="sscKpiComplianceRate">Universal Protocol rate</div>
        </div>
        <div class="ssc-kpi-card blue">
            <div class="ssc-kpi-label">Site Marking</div>
            <div class="ssc-kpi-value" id="sscKpiMarking">&mdash;</div>
            <div class="ssc-kpi-sub" id="sscKpiMarkingRate">surgeon marking rate</div>
        </div>
        <div class="ssc-kpi-card purple">
            <div class="ssc-kpi-label">Antibiotic Timing</div>
            <div class="ssc-kpi-value" id="sscKpiAntibiotic">&mdash;</div>
            <div class="ssc-kpi-sub" id="sscKpiAntibioticRate">&lt;60m pre-incision</div>
        </div>
        <div class="ssc-kpi-card amber">
            <div class="ssc-kpi-label">Counts Reconciled</div>
            <div class="ssc-kpi-value" id="sscKpiCounts">&mdash;</div>
            <div class="ssc-kpi-sub" id="sscKpiCountsRate">sponge &amp; needle accuracy</div>
        </div>
        <div class="ssc-kpi-card red">
            <div class="ssc-kpi-label">Near-Misses Caught</div>
            <div class="ssc-kpi-value" id="sscKpiNearMisses">&mdash;</div>
            <div class="ssc-kpi-sub">intercepted pre-incision</div>
        </div>
    </div>

    <div class="ssc-filter-row">
        <input type="date" id="sscDateFrom" title="Surgery Date From" />
        <input type="date" id="sscDateTo" title="Surgery Date To" />
        <select id="sscOrFilter"><option value="">All OR Suites</option></select>
        <select id="sscSpecialtyFilter"><option value="">All Specialties</option></select>
        <select id="sscSurgeonFilter"><option value="">All Surgeons</option></select>
        <select id="sscCompliantFilter">
            <option value="">All Compliance</option>
            <option value="1">100% Fully Compliant</option>
            <option value="0">Protocol Variance / Non-Compliant</option>
        </select>
        <select id="sscNearMissFilter">
            <option value="">All Cases</option>
            <option value="1">Near-Misses Intercepted Only</option>
        </select>
        <input type="text" class="ssc-search-input" id="sscSearchInput" placeholder="Search case #, patient, MRN, procedure, surgeon, suite..." />
        <button class="ssc-btn-apply" id="sscApplyBtn">Apply Filters</button>
        <button class="ssc-btn-reset" id="sscResetBtn">Reset</button>
    </div>

    <div class="ssc-table-wrapper">
        <table class="ssc-table">
            <thead>
                <tr>
                    <th>Case #</th>
                    <th>Date</th>
                    <th>OR Suite</th>
                    <th>Specialty</th>
                    <th>Patient</th>
                    <th>Planned Procedure</th>
                    <th>Operating Surgeon</th>
                    <th>Site Mark</th>
                    <th>Time-Out</th>
                    <th>Counts</th>
                    <th>Compliance</th>
                    <th>Near-Miss</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="sscTableBody">
                <tr><td colspan="13" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading surgical safety checklists...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- LOG SURGICAL SAFETY CHECKLIST MODAL -->
<div class="ssc-modal-overlay" id="sscAddModal">
    <div class="ssc-modal-box">
        <div class="ssc-modal-header">
            <h3>&#128711; Log Surgical Safety Checklist &amp; Universal Protocol Time-Out</h3>
            <button class="ssc-modal-close-x" id="sscCancelAddBtn">&times;</button>
        </div>
        <div class="ssc-modal-body">
            <form id="sscAddForm" autocomplete="off">
                <div class="ssc-form-grid">
                    <div class="ssc-form-section-title">1. Operative Case &amp; Surgical Team Info</div>
                    <div class="ssc-form-group">
                        <label>Surgery Date *</label>
                        <input type="date" id="sscFDate" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>OR Suite *</label>
                        <select id="sscFOrSuite" required>
                            <option value="">-- Select OR --</option>
                            <option>OR Suite 1 (General Surgery)</option>
                            <option>OR Suite 1 (OB-GYN)</option>
                            <option>OR Suite 2 (Emergency OR)</option>
                            <option>OR Suite 2 (Vascular OR)</option>
                            <option>OR Suite 3 (Orthopedics)</option>
                            <option>OR Suite 3 (Cardiothoracic)</option>
                            <option>OR Suite 4 (Neurosurgery)</option>
                            <option>OR Suite 4 (ENT / Pediatric)</option>
                            <option>OR Suite 5 (Ophthalmology Suite)</option>
                            <option>Cath Lab 1</option>
                            <option>Endoscopy Suite</option>
                        </select>
                    </div>
                    <div class="ssc-form-group full-width" style="grid-column: 1 / -1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px;">
                        <label style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">
                            <span>&#128100; Select Patient from EHR Patient List</span>
                            <span style="font-size: 11px; font-weight: 400; color: #15803d;">(Auto-populates Name, MRN, Age &amp; Gender)</span>
                        </label>
                        <select id="sscFPatientSelect" style="width: 100%; margin-top: 4px; border-color: #86efac;">
                            <option value="">-- Loading patients... --</option>
                        </select>
                        <input type="hidden" id="sscFPatientId" />
                    </div>
                    <div class="ssc-form-group">
                        <label>Patient Name *</label>
                        <input type="text" id="sscFPatientName" placeholder="Full name" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Patient MRN / Patient No *</label>
                        <input type="text" id="sscFPatientMrn" placeholder="PAT-XXXXXX" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Age *</label>
                        <input type="number" id="sscFAge" min="0" max="120" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Gender *</label>
                        <select id="sscFGender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Planned Surgical Procedure *</label>
                        <input type="text" id="sscFProcedure" placeholder="e.g. Right Total Knee Arthroplasty" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Surgical Specialty *</label>
                        <select id="sscFSpecialty" required>
                            <option value="">-- Select Specialty --</option>
                            <option>General Surgery</option>
                            <option>Orthopedics</option>
                            <option>Neurosurgery</option>
                            <option>Cardiothoracic Surgery</option>
                            <option>Vascular Surgery</option>
                            <option>OB-GYN</option>
                            <option>Otolaryngology (ENT)</option>
                            <option>Ophthalmology</option>
                            <option>Urology</option>
                            <option>Plastic &amp; Reconstructive</option>
                        </select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Operating Surgeon *</label>
                        <input type="text" id="sscFSurgeon" placeholder="Dr. Name" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Anesthesiologist *</label>
                        <input type="text" id="sscFAnesthesiologist" placeholder="Dr. Name" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Circulating Nurse *</label>
                        <input type="text" id="sscFCirculator" placeholder="Nurse Name" required />
                    </div>
                    <div class="ssc-form-group">
                        <label>Scrub Nurse / Scrub Tech</label>
                        <input type="text" id="sscFScrub" placeholder="Tech / Nurse Name" />
                    </div>

                    <div class="ssc-form-section-title">2. Phase 1: SIGN-IN (Before Induction of Anesthesia)</div>
                    <div class="ssc-form-group">
                        <label>Patient Identity Verified (2 Identifiers)?</label>
                        <select id="sscFIdentity"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Surgical Consent Signed &amp; Matched?</label>
                        <select id="sscFConsent"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Operative Site Marking Required (Lateral/Level)?</label>
                        <select id="sscFSiteReq"><option value="1" selected>Yes</option><option value="0">No / N/A (Midline Organ)</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Site Marked by Operating Surgeon?</label>
                        <select id="sscFSiteMarked"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Anesthesia Safety Check Completed?</label>
                        <select id="sscFAnesCheck"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Allergies Reviewed &amp; Wristband Present?</label>
                        <select id="sscFAllergies"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Difficult Airway / Aspiration Risk?</label>
                        <select id="sscFAirway"><option value="0" selected>No</option><option value="1">Yes (Equipment Prepared)</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Risk of &gt;500 mL Blood Loss (7mL/kg child)?</label>
                        <select id="sscEBloodLoss"><option value="0" selected>No</option><option value="1">Yes (2 IVs / Fluids / Blood Ready)</option></select>
                    </div>

                    <div class="ssc-form-section-title">3. Phase 2: TIME-OUT (Immediately Pre-Incision &mdash; Full Team Pause)</div>
                    <div class="ssc-form-group">
                        <label>Multidisciplinary Time-Out Pause Performed?</label>
                        <select id="sscFTimeOut"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Time-Out Timestamp</label>
                        <input type="text" id="sscFTimeOutTime" placeholder="e.g. 09:15 AM" />
                    </div>
                    <div class="ssc-form-group">
                        <label>Team Members Introduced (Name &amp; Role)?</label>
                        <select id="sscFIntroductions"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Patient, Procedure, &amp; Site Verbally Agreed?</label>
                        <select id="sscFVerbalAgreed"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Patient Positioning Confirmed Correct?</label>
                        <select id="sscFPosition"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Antibiotic Prophylaxis Given within 60 Min?</label>
                        <select id="sscFAbxGiven"><option value="1" selected>Yes</option><option value="0">No / N/A</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Essential Diagnostic Imaging Displayed?</label>
                        <select id="sscFImaging"><option value="1" selected>Yes</option><option value="0">No / N/A</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Implants / Hardware Specs Re-Verified?</label>
                        <select id="sscFImplants"><option value="1" selected>Yes</option><option value="0">No / N/A</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Near-Miss / Discrepancy Caught at Time-Out?</label>
                        <select id="sscFNearMiss"><option value="0" selected>No</option><option value="1">Yes &mdash; Near Miss Intercepted</option></select>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Near-Miss Interception Details (if discrepancy caught)</label>
                        <textarea id="sscFNearMissDetails" placeholder="Document what discrepancy was caught and how it was resolved before incision..."></textarea>
                    </div>

                    <div class="ssc-form-section-title">4. Phase 3: SIGN-OUT (Before Patient Leaves OR)</div>
                    <div class="ssc-form-group">
                        <label>Post-Op Sign-Out Debriefing Completed?</label>
                        <select id="sscFSignOut"><option value="1" selected>Yes</option><option value="0">No</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Surgical Sponge, Needle &amp; Instrument Counts</label>
                        <select id="sscFCounts">
                            <option value="Correct &amp; Reconciled" selected>Correct &amp; Reconciled</option>
                            <option value="Discrepancy Resolved on Recount">Discrepancy Resolved on Recount</option>
                            <option value="Unresolved Discrepancy - X-Ray Ordered">Unresolved Discrepancy - X-Ray Ordered</option>
                            <option value="Not Applicable">Not Applicable</option>
                        </select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Surgical Specimen Containers Labeled Aloud?</label>
                        <select id="sscFSpecimen"><option value="1" selected>Yes</option><option value="0">No / N/A</option></select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Equipment Malfunctions Noted?</label>
                        <select id="sscFEquipment"><option value="0" selected>No</option><option value="1">Yes (Biomed notified)</option></select>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Key Recovery Concerns / PACU Handover Plan</label>
                        <textarea id="sscFPostopConcerns" placeholder="DVT protocol, drain output, neuro checks, extubation plan..."></textarea>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>General Notes / Observations</label>
                        <textarea id="sscFNotes" placeholder="Additional audit notes..."></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="ssc-modal-footer">
            <button type="button" class="ssc-btn-secondary" id="sscCancelAddBtn2">Cancel</button>
            <button type="submit" form="sscAddForm" class="ssc-btn-primary" id="sscSubmitAddBtn">Save Checklist Case</button>
        </div>
    </div>
</div>

<!-- DETAIL & AUDIT REVIEW MODAL -->
<div class="ssc-modal-overlay" id="sscDetailModal">
    <div class="ssc-modal-box" style="max-width:860px;">
        <div class="ssc-modal-header">
            <div>
                <h3>&#128269; Surgical Safety Case &mdash; <span id="sscDetailCaseNo" style="color:#059669;font-family:monospace;">&mdash;</span></h3>
            </div>
            <button class="ssc-modal-close-x" id="sscCloseDetailModal">&times;</button>
        </div>
        <div class="ssc-modal-body">
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Universal Protocol Case Audit</div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Patient</span><span class="ssc-detail-value" id="sscDetailPatient">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Procedure Planned</span><span class="ssc-detail-value" id="sscDetailProcedure" style="font-weight:700;color:#0f172a;">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">OR Suite &amp; Date</span><span class="ssc-detail-value" id="sscDetailOrSuite">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Surgical Team</span><span class="ssc-detail-value" id="sscDetailTeam">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Pre-Op Site Mark</span><span class="ssc-detail-value" id="sscDetailSiteMark">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Time-Out Verification</span><span class="ssc-detail-value" id="sscDetailTimeOut">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Antibiotic Prophylaxis</span><span class="ssc-detail-value" id="sscDetailAntibiotic">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Closing Sponge &amp; Needle Count</span><span class="ssc-detail-value" id="sscDetailCounts">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Near-Miss Intercepted</span><span class="ssc-detail-value" id="sscDetailNearMiss" style="font-weight:700;">&mdash;</span></div>
                <div class="ssc-detail-row"><span class="ssc-detail-label">Universal Protocol Result</span><span class="ssc-detail-value" id="sscDetailCompliance" style="font-weight:700;">&mdash;</span></div>
            </div>

            <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #d1fae5;">Update Audit Review &amp; Quality Notes</div>
            <form id="sscDetailForm" autocomplete="off">
                <input type="hidden" id="sscDetailRecordId" />
                <div class="ssc-form-grid">
                    <div class="ssc-form-group">
                        <label>Actual Procedure Performed</label>
                        <input type="text" id="sscUActualProcedure" />
                    </div>
                    <div class="ssc-form-group">
                        <label>Closing Count Status</label>
                        <select id="sscUCounts">
                            <option value="Correct &amp; Reconciled">Correct &amp; Reconciled</option>
                            <option value="Discrepancy Resolved on Recount">Discrepancy Resolved on Recount</option>
                            <option value="Unresolved Discrepancy - X-Ray Ordered">Unresolved Discrepancy - X-Ray Ordered</option>
                            <option value="Not Applicable">Not Applicable</option>
                        </select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Audit Status</label>
                        <select id="sscUStatus">
                            <option value="Completed - Fully Compliant">Completed - Fully Compliant</option>
                            <option value="Completed - Minor Variance">Completed - Minor Variance</option>
                            <option value="Completed - Near-Miss Caught">Completed - Near-Miss Caught</option>
                            <option value="Non-Compliant Protocol Breach">Non-Compliant Protocol Breach</option>
                            <option value="Under Peer Review">Under Peer Review</option>
                        </select>
                    </div>
                    <div class="ssc-form-group">
                        <label>Universal Protocol Compliant?</label>
                        <select id="sscUCompliant">
                            <option value="1">Yes (100% Compliant)</option>
                            <option value="0">No (Protocol Variance)</option>
                        </select>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Near-Miss Interception Details</label>
                        <textarea id="sscUNearMissDetails"></textarea>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Non-Compliance / Protocol Variance Rationale</label>
                        <textarea id="sscUNonComplianceReason"></textarea>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Post-Op PACU Concerns</label>
                        <textarea id="sscUPostopConcerns"></textarea>
                    </div>
                    <div class="ssc-form-group full-width">
                        <label>Notes</label>
                        <textarea id="sscUNotes"></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="ssc-modal-footer">
            <button type="button" class="ssc-btn-secondary" id="sscCloseDetailBtn">Close</button>
            <button type="submit" form="sscDetailForm" class="ssc-btn-primary" id="sscSaveDetailBtn">Save &amp; Update</button>
        </div>
    </div>
</div>
`;
}
