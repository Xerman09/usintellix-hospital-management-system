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
                <tr><td colspan="11" class="table-empty">Loading patient flow...</td></tr>
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

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCheckInForm">Cancel</button>
                <button class="login-btn" type="submit">Check In</button>
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
`;
}
