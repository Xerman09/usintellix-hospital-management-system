export function PatientFlowView()
{
    return `
<style>
.pf-page {
    width: 100%;
    font-size: 13.5px;
    position: relative;
}

.pf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.pf-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pf-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid #dbe1ea;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pf-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.pf-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.pf-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.pf-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    position: relative;
}

.pf-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.pf-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.pf-add-btn svg {
    width: 14px;
    height: 14px;
}

.pf-icon-only-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    background: white;
    color: #42536b;
    cursor: pointer;
}

.pf-icon-only-btn:hover {
    background: #f1f5f9;
    border-color: #c8d2e0;
}

.pf-icon-only-btn svg {
    width: 16px;
    height: 16px;
}

.pf-icon-only-btn.active {
    background: #eef2ff;
    border-color: var(--accent);
    color: var(--accent);
}

.pf-settings-panel {
    display: none;
    position: absolute;
    top: 40px;
    right: 0;
    z-index: 20;
    width: 260px;
    background: white;
    border: 1px solid #dbe1ea;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(20, 24, 31, .12);
    padding: 12px 14px;
}

.pf-settings-panel.open {
    display: block;
}

.pf-settings-panel h4 {
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .3px;
    color: #6b7787;
}

.pf-settings-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    font-size: 12.5px;
    color: #29323f;
    cursor: pointer;
}

.pf-settings-row input {
    accent-color: var(--accent);
    cursor: pointer;
}

.pf-filters {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin: 18px 0;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.pf-filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 150px;
}

.pf-filter-group label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
    color: #6b7787;
}

.pf-filter-group .form-input {
    height: 34px;
    padding: 0 10px;
    font-size: 12.5px;
}

.pf-filter-check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: #42536b;
    cursor: pointer;
    height: 34px;
}

.pf-filter-check input {
    accent-color: var(--accent);
    cursor: pointer;
}

.pf-date-range-fields {
    display: none;
    gap: 12px;
}

.pf-date-range-fields.show {
    display: flex;
}

.pf-filter-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pf-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pf-filter-btn:hover {
    background: #1742b0;
}

.pf-clear-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    background: white;
    color: #3b475a;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pf-clear-btn:hover {
    background: #f1f5f9;
    border-color: #c8d2e0;
}

.pf-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.pf-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #42536b;
    font-size: 12px;
    font-weight: 600;
}

.pf-stat-pill.waiting { background: #fef3c7; color: #92400e; }
.pf-stat-pill.roomed { background: #dbeafe; color: #1e40af; }
.pf-stat-pill.with_provider { background: #ede9fe; color: #5b21b6; }
.pf-stat-pill.checked_out { background: #dcfce7; color: #166534; }

.pf-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.pf-table {
    width: 100%;
    border-collapse: collapse;
}

.pf-table th,
.pf-table td {
    font-size: 12.5px;
    padding: 9px 14px;
    white-space: nowrap;
}

.pf-table th {
    text-align: left;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    border-bottom: 1px solid #eef1f5;
}

.pf-table td {
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.pf-table tbody tr:last-child td {
    border-bottom: none;
}

.pf-row-waiting { background: #fffbeb; }
.pf-row-roomed { background: #eff6ff; }
.pf-row-with_provider { background: #f5f3ff; }
.pf-row-checked_out { background: #f0fdf4; }

.pf-status-room-btn {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    border: 1px dashed #c8d2e0;
    border-radius: 6px;
    padding: 4px 8px;
    background: rgba(255,255,255,.6);
    cursor: pointer;
    font-size: 12px;
    color: #29323f;
    line-height: 1.3;
}

.pf-status-room-btn:hover {
    background: white;
    border-color: var(--accent);
}

.pf-status-room-btn strong {
    font-size: 12px;
}

.pf-status-room-btn span {
    font-size: 11px;
    color: #6b7787;
}

.pf-time-cell.pf-blink {
    animation: pf-blink-anim 1s step-start infinite;
    color: #b91c1c;
    font-weight: 700;
}

@keyframes pf-blink-anim {
    50% { opacity: 0.25; }
}

.pf-drug-screen-check {
    accent-color: var(--accent);
    cursor: pointer;
    width: 16px;
    height: 16px;
}

.pf-remove-btn {
    border: none;
    background: none;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
}

.pf-empty-state {
    text-align: center;
    padding: 40px 10px;
    color: #8b98ac;
}

.pf-empty-state strong {
    display: block;
    margin-bottom: 4px;
    color: #42536b;
}

.pf-empty-state p {
    margin: 0;
    font-size: 12px;
}

/* Kiosk mode: a large, read-only, waiting-room-facing display. */
.pf-page.kiosk-mode .pf-filters,
.pf-page.kiosk-mode .pf-add-btn,
.pf-page.kiosk-mode #openFlowSettings,
.pf-page.kiosk-mode .pf-col-drug,
.pf-page.kiosk-mode .pf-col-actions,
.pf-page.kiosk-mode #listAlert {
    display: none !important;
}

.pf-page.kiosk-mode .pf-table th,
.pf-page.kiosk-mode .pf-table td {
    font-size: 16px;
    padding: 14px 18px;
}

.pf-page.kiosk-mode .pf-status-room-btn {
    pointer-events: none;
    border-style: solid;
}

@media print {
    .pf-filters, .pf-header-actions, .pf-summary, #listAlert, .pf-col-actions {
        display: none !important;
    }
}

@media (max-width: 900px) {
    .pf-header { flex-direction: column; align-items: stretch; }
    .pf-filter-group { min-width: 100%; }
}

:root[data-theme="dark"] .pf-filters { background: var(--bg-surface-alt); border-color: var(--border-color); }
:root[data-theme="dark"] .pf-filter-group label { color: var(--text-muted); }
:root[data-theme="dark"] .pf-filter-check { color: var(--text-primary); }
:root[data-theme="dark"] .pf-clear-btn { background: var(--bg-surface); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .pf-clear-btn:hover { background: var(--bg-surface-alt); }
</style>

<div class="pf-page">
    <div class="pf-header">
        <div class="pf-header-title">
            <div class="pf-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            </div>
            <div>
                <h1>Patient Flow</h1>
                <p class="form-subtitle">Track checked-in patients from waiting to checkout.</p>
            </div>
        </div>
        <div class="pf-header-actions">
            <button type="button" class="pf-add-btn" id="openQueueDisplayBtn" style="background: #4f46e5; border-color: #4338ca;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
                Waiting Room TV
            </button>
            <button type="button" class="pf-add-btn" id="openCheckInModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Check In Patient
            </button>
            <button type="button" class="pf-icon-only-btn" id="refreshFlowBoard" title="Refresh">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <button type="button" class="pf-icon-only-btn" id="printFlowBoard" title="Print">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
            </button>
            <button type="button" class="pf-icon-only-btn" id="kioskFlowBoard" title="Toggle kiosk view">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
            </button>
            <button type="button" class="pf-icon-only-btn" id="openFlowSettings" title="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>

            <div class="pf-settings-panel" id="flowSettingsPanel">
                <h4>Board Settings</h4>
                <label class="pf-settings-row">
                    <input type="checkbox" id="setting_open_new_window">
                    Open patient chart in a new window
                </label>
                <label class="pf-settings-row">
                    <input type="checkbox" id="setting_auto_refresh">
                    Auto-refresh board (every 30s)
                </label>
            </div>
        </div>
    </div>

    <div id="listAlert"></div>

    <div class="pf-filters">
        <div class="pf-filter-group">
            <label>Visit Category</label>
            <select id="filter_visit_category_id" class="form-input">
                <option value="">All Categories</option>
            </select>
        </div>

        <div class="pf-filter-group">
            <label>Status</label>
            <select id="filter_stage" class="form-input">
                <option value="">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="roomed">In Room</option>
                <option value="with_provider">With Provider</option>
                <option value="checked_out">Checked Out</option>
            </select>
        </div>

        <div class="pf-filter-group">
            <label>Facility</label>
            <select id="filter_facility_id" class="form-input">
                <option value="">All Facilities</option>
            </select>
        </div>

        <div class="pf-filter-group">
            <label>Provider</label>
            <select id="filter_provider_id" class="form-input">
                <option value="">All Providers</option>
            </select>
        </div>

        <div class="pf-filter-group">
            <label>Patient Name / ID</label>
            <input type="text" id="filter_search" class="form-input" placeholder="Search name or patient no...">
        </div>

        <label class="pf-filter-check">
            <input type="checkbox" id="toggle_date_range">
            Date range
        </label>

        <div class="pf-date-range-fields" id="dateRangeFields">
            <div class="pf-filter-group">
                <label>From</label>
                <input type="date" id="filter_date_from" class="form-input">
            </div>
            <div class="pf-filter-group">
                <label>To</label>
                <input type="date" id="filter_date_until" class="form-input">
            </div>
        </div>

        <div class="pf-filter-actions">
            <button type="button" class="pf-filter-btn" id="applyFlowFilters">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                Filter
            </button>
            <button type="button" class="pf-clear-btn" id="clearFlowFilters">Clear</button>
        </div>
    </div>

    <div class="pf-summary" id="flowSummary"></div>

    <div class="pf-table-wrap">
        <table class="pf-table">
            <thead>
                <tr>
                    <th>Patient</th>
                    <th>Queue Token</th>
                    <th>Visit Category</th>
                    <th>Provider</th>
                    <th>Facility</th>
                    <th>Status / Room</th>
                    <th>Arrive</th>
                    <th>Time in Status</th>
                    <th>Total Time</th>
                    <th>Checkout</th>
                    <th class="pf-col-drug">Drug Screen</th>
                    <th class="pf-col-actions"></th>
                </tr>
            </thead>
            <tbody id="flowTableBody">
                <tr><td colspan="12" class="table-empty">Loading patient flow...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="checkInModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Check In Patient</h2>
            <button type="button" class="modal-close" id="closeCheckInModal">&times;</button>
        </div>

        <div id="checkInFormAlert"></div>

        <form id="checkInForm">
            <div class="form-group full">
                <label>Today's Appointment</label>
                <select id="checkin_appointment_id" class="form-input">
                    <option value="">Select an appointment</option>
                </select>
                <span class="form-error" id="err-appointment_id"></span>
            </div>

            <!-- HIPAA § 164.520 NPP Consent Verification & Capture Banner -->
            <div id="checkinNppSection" style="display:none; margin: 12px 0 16px 0; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc;">
                <div id="checkinNppStatus"></div>
                <div id="checkinNppCaptureBox" style="display:none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                    <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 6px;">
                        Capture In-Clinic Acknowledgment:
                    </div>
                    <div class="form-group full" style="margin-bottom: 8px;">
                        <label style="font-size: 11px;">Acknowledgment Method</label>
                        <select id="checkin_npp_signature_type" class="form-input" style="height: 32px; font-size: 12px; padding: 0 8px;">
                            <option value="in_clinic">Electronic / Verbal Acknowledgment in Clinic</option>
                            <option value="paper">Paper Copy Provided &amp; Physical Signature on File</option>
                        </select>
                    </div>
                    <div class="form-group full" style="margin-bottom: 8px;">
                        <label style="font-size: 11px;">Patient Full Name / Staff Witness Note</label>
                        <input id="checkin_npp_signature_data" class="form-input" style="height: 32px; font-size: 12px; padding: 0 8px;" placeholder="Patient name or 'Paper NPP signed and archived'">
                        <span class="form-error" id="err-checkin_npp_sig" style="font-size: 11px;"></span>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button type="button" id="btnRecordCheckinNpp" style="height: 30px; padding: 0 12px; font-size: 12px; font-weight: 600; background: #059669; border: none; border-radius: 4px; color: white; cursor: pointer;">
                            Record Consent (HIPAA § 164.520)
                        </button>
                    </div>
                </div>
            </div>

            <!-- Outpatient Clinic Queue Token Generation Options -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 12.5px; font-weight: 700; color: #1e40af; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <span>🎫</span> Outpatient Clinic Sequential Queue Token
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: #3b82f6; display: block; margin-bottom: 4px;">Department Prefix</label>
                        <select id="checkin_department_code" class="form-input" style="height: 34px; font-size: 12px;">
                            <option value="">Auto-Detect (Provider Dept)</option>
                            <option value="CARD">CARD — Cardiology Clinic</option>
                            <option value="PEDI">PEDI — Pediatrics Clinic</option>
                            <option value="INTMED">INTMED — Internal Medicine</option>
                            <option value="SURG">SURG — General Surgery</option>
                            <option value="OBGYN">OBGYN — Obstetrics &amp; Gynecology</option>
                            <option value="ORTHO">ORTHO — Orthopedics &amp; Sports Med</option>
                            <option value="EMERG">EMERG — Acute Urgent Care</option>
                            <option value="OPD">OPD — General Outpatient</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; color: #3b82f6; display: block; margin-bottom: 4px;">Queue Priority</label>
                        <select id="checkin_priority" class="form-input" style="height: 34px; font-size: 12px;">
                            <option value="routine">Routine</option>
                            <option value="senior_pwd">Senior Citizen / PWD</option>
                            <option value="priority">Priority Consultation</option>
                            <option value="urgent">Urgent / STAT</option>
                            <option value="vip">VIP</option>
                        </select>
                    </div>
                </div>
                <div style="font-size: 11px; color: #60a5fa; margin-top: 6px;">
                    Daily sequential token (e.g. CARD-001) will be issued immediately upon check-in.
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCheckInForm">Cancel</button>
                <button class="login-btn" type="submit" id="btnSubmitCheckIn">Check In &amp; Issue Token</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="statusRoomModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Update Status &amp; Room</h2>
            <button type="button" class="modal-close" id="closeStatusRoomModal">&times;</button>
        </div>

        <div id="statusRoomFormAlert"></div>

        <form id="statusRoomForm">
            <input type="hidden" id="status_room_flow_id">

            <div class="form-group full">
                <label>Status</label>
                <select id="status_room_stage" class="form-input">
                    <option value="waiting">Waiting</option>
                    <option value="roomed">In Room</option>
                    <option value="with_provider">With Provider</option>
                    <option value="checked_out">Checked Out</option>
                </select>
            </div>

            <div class="form-group full">
                <label>Room</label>
                <select id="status_room_room_id" class="form-input">
                    <option value="">No room assigned</option>
                </select>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelStatusRoomForm">Cancel</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>

<!-- =============================================================== -->
<!-- MODAL: QUEUE TOKEN ISSUED SUCCESS POPUP                         -->
<!-- =============================================================== -->
<div class="modal-overlay" id="tokenSuccessModalOverlay">
    <div class="modal-box" style="max-width: 440px; text-align: center; padding: 24px;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 26px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">✓</div>
        <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #0f172a;">Queue Token Generated</h2>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">Patient is checked in and queued for clinical consultation.</p>
        
        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; margin-bottom: 18px;">
            <div style="font-size: 12px; font-weight: 700; color: #0284c7; text-transform: uppercase;" id="successTokenDept">Cardiology Clinic</div>
            <div style="font-size: 46px; font-weight: 900; color: #0f172a; letter-spacing: 1px; margin: 6px 0; font-family: monospace;" id="successTokenNumber">CARD-001</div>
            <div style="display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 12px; background: #e0e7ff; color: #4338ca; text-transform: uppercase;" id="successTokenPriority">Routine</div>
            
            <div style="margin-top: 14px; font-size: 12px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-around;">
                <div>Est. Wait: <strong id="successTokenWait" style="color: #0f172a;">~15 mins</strong></div>
                <div>Patient: <strong id="successTokenPatient" style="color: #0f172a;">--</strong></div>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button type="button" class="btn-secondary" id="closeTokenSuccessModal">Done</button>
            <button type="button" class="login-btn" id="btnPrintTokenSlip" style="background: #0284c7; border: none; padding: 8px 16px; border-radius: 6px; color: #fff; cursor: pointer;">🖨️ Print Token Slip</button>
        </div>
    </div>
</div>

<!-- =============================================================== -->
<!-- MODAL: WAITING ROOM LIVE QUEUE TV DISPLAY                       -->
<!-- =============================================================== -->
<div class="modal-overlay" id="queueDisplayModalOverlay" style="align-items: stretch; justify-content: stretch; padding: 10px;">
    <div class="modal-box" style="max-width: 1200px; width: 98vw; height: 95vh; display: flex; flex-direction: column; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; padding: 0;">
        <!-- Display Header -->
        <div style="background: #1e293b; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 36px; height: 36px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏥</div>
                <div>
                    <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">USINTELLIX OUTPATIENT CLINICS</div>
                    <div style="font-size: 11px; color: #94a3b8;">Patient Queue Announcement &amp; Calling Board</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: rgba(255,255,255,0.08); padding: 6px 14px; border-radius: 6px; font-family: monospace; font-size: 16px; color: #38bdf8; font-weight: 700;" id="queueTvClock">--:--:--</div>
                <a href="queue-display.html" target="_blank" style="text-decoration: none; background: #38bdf8; color: #0f172a; font-weight: 700; padding: 6px 12px; border-radius: 6px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">⛶ Open Dedicated TV Page</a>
                <button type="button" id="closeQueueDisplayModal" style="background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 6px; width: 32px; height: 32px; font-size: 18px; cursor: pointer;">&times;</button>
            </div>
        </div>

        <!-- Display Body Split -->
        <div style="flex: 1; display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; padding: 20px; overflow: hidden;">
            <!-- Left: NOW CALLING -->
            <div style="display: flex; flex-direction: column; background: #1e293b; border-radius: 10px; border: 1px solid #334155; padding: 18px; overflow: hidden;">
                <div style="font-size: 16px; font-weight: 800; color: #10b981; letter-spacing: 1px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></span>
                    NOW CALLING / PROCEED TO ROOM
                </div>
                <div id="queueTvCallingList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
                    <div style="color: #64748b; text-align: center; padding: 40px;">No patients currently being called.</div>
                </div>
            </div>

            <!-- Right: UP NEXT / WAITING -->
            <div style="display: flex; flex-direction: column; background: #1e293b; border-radius: 10px; border: 1px solid #334155; padding: 18px; overflow: hidden;">
                <div style="font-size: 16px; font-weight: 800; color: #38bdf8; letter-spacing: 1px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                    <span>UP NEXT IN QUEUE</span>
                    <span style="font-size: 12px; color: #94a3b8;" id="queueTvWaitingCount">0 Waiting</span>
                </div>
                <div id="queueTvUpNextList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: #64748b; text-align: center; padding: 40px;">Queue is currently empty.</div>
                </div>
            </div>
        </div>

        <!-- Display Footer KPIs -->
        <div style="background: #1e293b; padding: 10px 24px; border-top: 1px solid #334155; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8;">
            <div>Please proceed promptly to your consultation room when your token is called.</div>
            <div id="queueTvSummaryStats">Total Served Today: --</div>
        </div>
    </div>
</div>
`;
}
