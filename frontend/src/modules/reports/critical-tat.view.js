export function CriticalTATView() {
    return `
<style>
.ctat-wrapper {
    padding: 24px;
    max-width: 100%;
    font-family: var(--font-primary, "Inter", sans-serif);
    color: var(--text-primary, #1e293b);
}
.ctat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}
.ctat-header-left h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    margin: 0 0 4px 0;
}
.ctat-header-left p {
    font-size: 13px;
    color: #64748b;
    margin: 0;
}
.ctat-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.ctat-btn-primary {
    background: #0f766e;
    color: #fff;
    border: none;
    padding: 9px 18px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}
.ctat-btn-secondary {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
    padding: 9px 18px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

/* KPI Grid */
.ctat-kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 22px;
}
@media (max-width: 1200px) { .ctat-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .ctat-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
.ctat-kpi-card {
    background: #fff;
    border-radius: 10px;
    padding: 16px 18px;
    border-left: 4px solid #94a3b8;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}
.ctat-kpi-card.green  { border-left-color: #22c55e; }
.ctat-kpi-card.red    { border-left-color: #ef4444; }
.ctat-kpi-card.blue   { border-left-color: #3b82f6; }
.ctat-kpi-card.amber  { border-left-color: #f59e0b; }
.ctat-kpi-card.purple { border-left-color: #a855f7; }
.ctat-kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.ctat-kpi-value {
    font-size: 26px;
    font-weight: 800;
    color: #1e293b;
    line-height: 1;
}
.ctat-kpi-sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

/* Filters */
.ctat-filter-row {
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
.ctat-filter-row input,
.ctat-filter-row select {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    background: #fff;
    color: #1e293b;
    min-width: 120px;
}
.ctat-filter-row .ctat-search-input {
    flex: 1;
    min-width: 200px;
}
.ctat-btn-apply {
    background: #3b82f6;
    color: #fff;
    border: none;
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}
.ctat-btn-reset {
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
.ctat-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #fff;
}
.ctat-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.ctat-table thead tr {
    background: #f1f5f9;
}
.ctat-table thead th {
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
.ctat-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
}
.ctat-table tbody tr:hover { background: #f8fafc; }
.ctat-table tbody td {
    padding: 10px 12px;
    vertical-align: middle;
    color: #334155;
}
.ctat-table tbody td.tat-breach {
    background: #fff7ed;
    color: #92400e;
    font-weight: 700;
}

/* Modal */
.ctat-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9000;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.ctat-modal-box {
    background: #fff;
    border-radius: 12px;
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.ctat-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
}
.ctat-modal-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}
.ctat-modal-close-x {
    background: none;
    border: none;
    font-size: 20px;
    color: #64748b;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
}
.ctat-modal-body { padding: 22px; }
.ctat-modal-footer {
    padding: 16px 22px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    position: sticky;
    bottom: 0;
    background: #fff;
}
.ctat-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.ctat-form-grid .full-width { grid-column: 1 / -1; }
.ctat-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 5px;
}
.ctat-form-group input,
.ctat-form-group select,
.ctat-form-group textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #1e293b;
    background: #fff;
    box-sizing: border-box;
}
.ctat-form-group textarea { resize: vertical; min-height: 70px; }
.ctat-form-section-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f766e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0 4px 0;
    border-bottom: 1px solid #e2f5f3;
    margin-bottom: 12px;
    grid-column: 1 / -1;
}
.ctat-detail-row {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    align-items: flex-start;
}
.ctat-detail-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    min-width: 140px;
}
.ctat-detail-value {
    font-size: 13px;
    color: #1e293b;
    flex: 1;
}

/* Dark mode */
body.dark-mode .ctat-wrapper { color: #e2e8f0; }
body.dark-mode .ctat-kpi-card { background: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
body.dark-mode .ctat-kpi-value { color: #f1f5f9; }
body.dark-mode .ctat-kpi-label { color: #94a3b8; }
body.dark-mode .ctat-filter-row { background: #1e293b; border-color: #334155; }
body.dark-mode .ctat-filter-row input,
body.dark-mode .ctat-filter-row select { background: #0f172a; color: #e2e8f0; border-color: #334155; }
body.dark-mode .ctat-table-wrapper { background: #1e293b; border-color: #334155; }
body.dark-mode .ctat-table thead tr { background: #0f172a; }
body.dark-mode .ctat-table thead th { color: #94a3b8; border-color: #334155; }
body.dark-mode .ctat-table tbody tr { border-color: #334155; }
body.dark-mode .ctat-table tbody tr:hover { background: #0f172a; }
body.dark-mode .ctat-table tbody td { color: #cbd5e1; }
body.dark-mode .ctat-modal-box { background: #1e293b; }
body.dark-mode .ctat-modal-header { background: #1e293b; border-color: #334155; }
body.dark-mode .ctat-modal-header h3 { color: #f1f5f9; }
body.dark-mode .ctat-modal-footer { background: #1e293b; border-color: #334155; }
body.dark-mode .ctat-form-group label { color: #94a3b8; }
body.dark-mode .ctat-form-group input,
body.dark-mode .ctat-form-group select,
body.dark-mode .ctat-form-group textarea { background: #0f172a; color: #e2e8f0; border-color: #334155; }
body.dark-mode .ctat-detail-label { color: #64748b; }
body.dark-mode .ctat-detail-value { color: #e2e8f0; }
body.dark-mode .ctat-btn-secondary { background: #334155; color: #e2e8f0; border-color: #475569; }

/* Print */
@media print {
    .ctat-header-actions, .ctat-filter-row, .ctat-modal-overlay { display: none !important; }
    .ctat-kpi-card { box-shadow: none; border: 1px solid #e2e8f0; }
    .ctat-table { font-size: 10px; }
}
</style>

<div class="ctat-wrapper" id="ctatWrapper">

    <!-- Header -->
    <div class="ctat-header">
        <div class="ctat-header-left">
            <h2>&#128203; Critical Diagnostic Test Results &mdash; Turnaround Time Report</h2>
            <p>JCAHO Standard: Panic/Critical Value Notification, Read-Back Compliance &amp; TAT Tracking</p>
        </div>
        <div class="ctat-header-actions">
            <button class="ctat-btn-primary" id="ctatAddBtn">+ Log Critical Result</button>
            <button class="ctat-btn-secondary" id="ctatPrintBtn">&#128438; Print Report</button>
        </div>
    </div>

    <!-- KPI Cards -->
    <div class="ctat-kpi-grid">
        <div class="ctat-kpi-card">
            <div class="ctat-kpi-label">Total Records</div>
            <div class="ctat-kpi-value" id="ctatKpiTotal">—</div>
            <div class="ctat-kpi-sub">critical results logged</div>
        </div>
        <div class="ctat-kpi-card green">
            <div class="ctat-kpi-label">JCAHO Compliant</div>
            <div class="ctat-kpi-value" id="ctatKpiCompliant">—</div>
            <div class="ctat-kpi-sub" id="ctatKpiCompliantRate">within policy TAT</div>
        </div>
        <div class="ctat-kpi-card red">
            <div class="ctat-kpi-label">TAT Breaches</div>
            <div class="ctat-kpi-value" id="ctatKpiBreach">—</div>
            <div class="ctat-kpi-sub">exceeded policy limit</div>
        </div>
        <div class="ctat-kpi-card blue">
            <div class="ctat-kpi-label">Avg TAT (min)</div>
            <div class="ctat-kpi-value" id="ctatKpiAvgTat">—</div>
            <div class="ctat-kpi-sub">result to acknowledgment</div>
        </div>
        <div class="ctat-kpi-card amber">
            <div class="ctat-kpi-label">Pending Ack</div>
            <div class="ctat-kpi-value" id="ctatKpiPending">—</div>
            <div class="ctat-kpi-sub">awaiting physician response</div>
        </div>
        <div class="ctat-kpi-card purple">
            <div class="ctat-kpi-label">Read-Back Done</div>
            <div class="ctat-kpi-value" id="ctatKpiReadBack">—</div>
            <div class="ctat-kpi-sub">read-back protocol confirmed</div>
        </div>
    </div>

    <!-- Filters -->
    <div class="ctat-filter-row">
        <input type="date" id="ctatDateFrom" title="Date From" />
        <input type="date" id="ctatDateTo" title="Date To" />
        <select id="ctatTypeFilter">
            <option value="">All Types</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Radiology">Radiology</option>
            <option value="Pathology">Pathology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Microbiology">Microbiology</option>
            <option value="Blood Bank">Blood Bank</option>
        </select>
        <select id="ctatDeptFilter">
            <option value="">All Departments</option>
        </select>
        <select id="ctatStatusFilter">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Notified">Notified</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Documented">Documented</option>
            <option value="Breached">Breached</option>
            <option value="Escalated">Escalated</option>
        </select>
        <select id="ctatCompliantFilter">
            <option value="">Compliant?</option>
            <option value="1">Compliant</option>
            <option value="0">Breach</option>
        </select>
        <input type="text" class="ctat-search-input" id="ctatSearchInput" placeholder="Search test, patient, MRN, tracking #..." />
        <button class="ctat-btn-apply" id="ctatApplyBtn">Apply Filters</button>
        <button class="ctat-btn-reset" id="ctatResetBtn">Reset</button>
    </div>

    <!-- Table -->
    <div class="ctat-table-wrapper">
        <table class="ctat-table">
            <thead>
                <tr>
                    <th>Tracking #</th>
                    <th>Result Date/Time</th>
                    <th>Test Type</th>
                    <th>Test Name</th>
                    <th>Critical Value</th>
                    <th>Department / Location</th>
                    <th>TAT to Call</th>
                    <th>Total TAT</th>
                    <th>JCAHO Compliant</th>
                    <th>Read-Back</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="ctatTableBody">
                <tr><td colspan="12" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading records...</td></tr>
            </tbody>
        </table>
    </div>

</div>

<!-- =========================================================
     LOG CRITICAL RESULT MODAL
     ========================================================= -->
<div class="ctat-modal-overlay" id="ctatAddModal">
    <div class="ctat-modal-box">
        <div class="ctat-modal-header">
            <h3>&#128203; Log Critical Result Notification</h3>
            <button class="ctat-modal-close-x" id="ctatCancelAddBtn">&times;</button>
        </div>
        <div class="ctat-modal-body">
            <form id="ctatAddForm" autocomplete="off">
                <div class="ctat-form-grid">

                    <div class="ctat-form-section-title">Test Information</div>

                    <div class="ctat-form-group">
                        <label>Test Type *</label>
                        <select id="ctatFTestType" required>
                            <option value="Laboratory">Laboratory</option>
                            <option value="Radiology">Radiology</option>
                            <option value="Pathology">Pathology</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Microbiology">Microbiology</option>
                            <option value="Blood Bank">Blood Bank</option>
                        </select>
                    </div>
                    <div class="ctat-form-group">
                        <label>Test / Result Name *</label>
                        <input type="text" id="ctatFTestName" placeholder="e.g. Serum Potassium, CT Brain" required />
                    </div>
                    <div class="ctat-form-group">
                        <label>Critical / Panic Value *</label>
                        <input type="text" id="ctatFCriticalValue" placeholder="e.g. 6.8 mEq/L (CRITICAL HIGH)" required />
                    </div>
                    <div class="ctat-form-group">
                        <label>Normal Range</label>
                        <input type="text" id="ctatFNormalRange" placeholder="e.g. 3.5 – 5.0 mEq/L" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Result Available At *</label>
                        <input type="datetime-local" id="ctatFResultAvailableAt" required />
                    </div>
                    <div class="ctat-form-group">
                        <label>Ordering Department *</label>
                        <select id="ctatFDepartment" required>
                            <option value="">-- Select Department --</option>
                            <option>Emergency Department</option>
                            <option>Intensive Care Unit (ICU)</option>
                            <option>Inpatient / Med-Surg</option>
                            <option>Surgery / Operating Room</option>
                            <option>Pharmacy</option>
                            <option>Outpatient Clinic</option>
                            <option>Laboratory</option>
                            <option>Radiology / Imaging</option>
                            <option>Blood Bank</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div class="ctat-form-group">
                        <label>Patient Location</label>
                        <input type="text" id="ctatFPatientLocation" placeholder="e.g. ICU Bed 4, Room 202-A" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Patient Name (optional)</label>
                        <input type="text" id="ctatFPatientName" placeholder="Patient name if applicable" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Patient MRN (optional)</label>
                        <input type="text" id="ctatFPatientMrn" placeholder="MRN-XXXXX" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Reported By (Lab/Radiology) *</label>
                        <input type="text" id="ctatFReportedBy" placeholder="Name of tech/radiologist who called result" required />
                    </div>
                    <div class="ctat-form-group">
                        <label>Reporter Role</label>
                        <input type="text" id="ctatFReporterRole" placeholder="e.g. Clinical Laboratory Technologist" />
                    </div>

                    <div class="ctat-form-section-title">Notification Chain</div>

                    <div class="ctat-form-group">
                        <label>First Call At</label>
                        <input type="datetime-local" id="ctatFFirstCallAt" />
                    </div>
                    <div class="ctat-form-group">
                        <label>First Call To (Physician/Nurse)</label>
                        <input type="text" id="ctatFFirstCallTo" placeholder="Name of person first contacted" />
                    </div>
                    <div class="ctat-form-group">
                        <label>First Call Method</label>
                        <select id="ctatFFirstCallMethod">
                            <option value="Phone">Phone</option>
                            <option value="Pager">Pager</option>
                            <option value="SMS">SMS</option>
                            <option value="In-Person">In-Person</option>
                            <option value="EHR Alert">EHR Alert</option>
                        </select>
                    </div>
                    <div class="ctat-form-group">
                        <label>Acknowledged At</label>
                        <input type="datetime-local" id="ctatFAcknowledgedAt" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Acknowledged By (Physician)</label>
                        <input type="text" id="ctatFAcknowledgedBy" placeholder="Receiving physician name" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Acknowledged By Role</label>
                        <input type="text" id="ctatFAcknowledgedByRole" placeholder="e.g. ICU Attending Physician" />
                    </div>
                    <div class="ctat-form-group full-width" style="display:flex;align-items:center;gap:10px;padding:10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                        <input type="checkbox" id="ctatFReadBack" style="width:16px;height:16px;cursor:pointer;" />
                        <label for="ctatFReadBack" style="margin:0;cursor:pointer;color:#166534;font-weight:600;">&#10003; JCAHO Read-Back Protocol Confirmed (physician repeated value back to reporter)</label>
                    </div>

                    <div class="ctat-form-section-title">Documentation</div>

                    <div class="ctat-form-group">
                        <label>Documented In Chart At</label>
                        <input type="datetime-local" id="ctatFDocumentedAt" />
                    </div>
                    <div class="ctat-form-group">
                        <label>&nbsp;</label>
                        <div style="font-size:11px;color:#94a3b8;padding-top:8px;">Leave blank if not yet documented in chart.</div>
                    </div>
                    <div class="ctat-form-group full-width">
                        <label>Action Taken After Notification</label>
                        <textarea id="ctatFActionTaken" placeholder="Describe the clinical action ordered or taken by the physician after receiving the critical result..."></textarea>
                    </div>
                    <div class="ctat-form-group full-width">
                        <label>Notes</label>
                        <textarea id="ctatFNotes" placeholder="Additional context, follow-up, or remarks..."></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="ctat-modal-footer">
            <button type="button" class="ctat-btn-secondary" id="ctatCancelAddBtn2">Cancel</button>
            <button type="submit" form="ctatAddForm" class="ctat-btn-primary" id="ctatSubmitAddBtn">Submit Log</button>
        </div>
    </div>
</div>

<!-- =========================================================
     DETAIL / UPDATE MODAL
     ========================================================= -->
<div class="ctat-modal-overlay" id="ctatDetailModal">
    <div class="ctat-modal-box" style="max-width:820px;">
        <div class="ctat-modal-header">
            <div>
                <h3>&#128269; Critical Result Detail &mdash; <span id="ctatDetailTrackingNum" style="color:#3b82f6;font-family:monospace;">—</span></h3>
            </div>
            <button class="ctat-modal-close-x" id="ctatCloseDetailModal">&times;</button>
        </div>
        <div class="ctat-modal-body">
            <!-- Read-only detail section -->
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Critical Result Details</div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Test</span>
                    <span class="ctat-detail-value" id="ctatDetailTestInfo">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Critical Value</span>
                    <span class="ctat-detail-value" style="color:#b91c1c;font-weight:700;" id="ctatDetailCriticalValue">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Normal Range</span>
                    <span class="ctat-detail-value" id="ctatDetailNormalRange">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Result Date</span>
                    <span class="ctat-detail-value" id="ctatDetailResultDate">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Department / Location</span>
                    <span class="ctat-detail-value" id="ctatDetailDept">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Patient</span>
                    <span class="ctat-detail-value" id="ctatDetailPatient">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Reported By</span>
                    <span class="ctat-detail-value" id="ctatDetailReporter">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">First Call</span>
                    <span class="ctat-detail-value" id="ctatDetailFirstCall">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Acknowledged</span>
                    <span class="ctat-detail-value" id="ctatDetailAcknowledged">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">TAT Breakdown</span>
                    <span class="ctat-detail-value" style="font-weight:700;" id="ctatDetailTatBreakdown">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">JCAHO Status</span>
                    <span class="ctat-detail-value" id="ctatDetailCompliance">—</span>
                </div>
                <div class="ctat-detail-row">
                    <span class="ctat-detail-label">Action Taken</span>
                    <span class="ctat-detail-value" id="ctatDetailActionTaken">—</span>
                </div>
            </div>

            <!-- Update section -->
            <div style="font-size:12px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #dbeafe;">Update Acknowledgment &amp; Documentation</div>
            <form id="ctatDetailForm" autocomplete="off">
                <input type="hidden" id="ctatDetailRecordId" />
                <div class="ctat-form-grid">
                    <div class="ctat-form-group">
                        <label>Acknowledged At</label>
                        <input type="datetime-local" id="ctatUAcknowledgedAt" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Acknowledged By</label>
                        <input type="text" id="ctatUAcknowledgedBy" placeholder="Receiving physician name" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Acknowledged By Role</label>
                        <input type="text" id="ctatUAcknowledgedByRole" placeholder="e.g. ICU Attending" />
                    </div>
                    <div class="ctat-form-group">
                        <label>Status</label>
                        <select id="ctatUStatus">
                            <option value="Pending">Pending</option>
                            <option value="Notified">Notified</option>
                            <option value="Acknowledged">Acknowledged</option>
                            <option value="Documented">Documented</option>
                            <option value="Breached">Breached</option>
                            <option value="Escalated">Escalated</option>
                        </select>
                    </div>
                    <div class="ctat-form-group full-width" style="display:flex;align-items:center;gap:10px;padding:10px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                        <input type="checkbox" id="ctatUReadBack" style="width:16px;height:16px;cursor:pointer;" />
                        <label for="ctatUReadBack" style="margin:0;cursor:pointer;color:#166534;font-weight:600;">&#10003; JCAHO Read-Back Protocol Confirmed</label>
                    </div>
                    <div class="ctat-form-group">
                        <label>Documented In Chart At</label>
                        <input type="datetime-local" id="ctatUDocumentedAt" />
                    </div>
                    <div class="ctat-form-group">
                        <label>&nbsp;</label>
                        <div style="font-size:11px;color:#94a3b8;padding-top:8px;">Leave blank if not yet charted.</div>
                    </div>
                    <div class="ctat-form-group full-width">
                        <label>Action Taken</label>
                        <textarea id="ctatUActionTaken" placeholder="Clinical action ordered or taken by physician..."></textarea>
                    </div>
                    <div class="ctat-form-group full-width">
                        <label>Breach Reason (if applicable)</label>
                        <textarea id="ctatUBreachReason" placeholder="Document why the TAT policy was exceeded (e.g. pager failure, staff unavailability)..."></textarea>
                    </div>
                    <div class="ctat-form-group full-width">
                        <label>Notes</label>
                        <textarea id="ctatUNotes" placeholder="Additional remarks or follow-up notes..."></textarea>
                    </div>
                </div>
            </form>
        </div>
        <div class="ctat-modal-footer">
            <button type="button" class="ctat-btn-secondary" id="ctatCloseDetailBtn">Close</button>
            <button type="submit" form="ctatDetailForm" class="ctat-btn-primary" id="ctatSaveDetailBtn">Save &amp; Update</button>
        </div>
    </div>
</div>
`;
}
