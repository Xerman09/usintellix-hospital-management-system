export function BillingManagerView() {
    return `
<style>
.bm-page {
    width: 100%;
    font-size: 13.5px;
}

.bm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
}

.bm-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.bm-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface-alt);
    display: flex;
    align-items: center;
    justify-content: center;
}

.bm-icon-badge svg {
    width: 18px;
    height: 18px;
    color: var(--text-muted);
}

.bm-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -.2px;
}

.bm-mask-toggle {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    display: flex;
}

.bm-mask-toggle:hover { color: var(--text-primary); }

.bm-criteria-grid {
    display: grid;
    grid-template-columns: 1.1fr 1.1fr .9fr;
    gap: 14px;
    margin-bottom: 16px;
}

@media (max-width: 900px) {
    .bm-criteria-grid { grid-template-columns: 1fr; }
}

.bm-panel {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-surface);
    overflow: hidden;
}

.bm-panel-header {
    padding: 10px 14px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    font-weight: 700;
    font-size: 13px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.bm-panel-body {
    padding: 12px 14px;
}

.bm-criteria-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
}

.bm-criteria-list li button {
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
}

.bm-criteria-list li:last-child button { border-bottom: none; }

.bm-criteria-list li button:hover,
.bm-criteria-list li button.active {
    background: var(--accent-light);
    color: var(--accent-text, var(--accent));
}

.bm-criteria-value-form {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-color);
    display: none;
}

.bm-criteria-value-form.open { display: block; }

.bm-criteria-value-form label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 4px;
}

.bm-criteria-value-form input,
.bm-criteria-value-form select {
    width: 100%;
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    margin-bottom: 8px;
}

.bm-criteria-value-row {
    display: flex;
    gap: 8px;
}

.bm-criteria-value-row > div { flex: 1; }

.bm-add-criteria-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.bm-add-criteria-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.bm-current-criteria-list {
    list-style: none;
    margin: 0;
    padding: 0;
    min-height: 40px;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
}

.bm-current-criteria-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--border-color);
    font-size: 12.5px;
    color: var(--text-primary);
}

.bm-current-criteria-item:last-child { border-bottom: none; }

.bm-current-criteria-remove {
    flex-shrink: 0;
    border: none;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 2px 4px;
}

.bm-current-criteria-remove:hover { color: #b91c1c; }

.bm-current-criteria-empty {
    padding: 10px;
    color: var(--text-muted);
    font-style: italic;
    font-size: 12.5px;
}

.bm-panel-icon-btn {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 3px;
    display: flex;
}

.bm-panel-icon-btn:hover { color: #b91c1c; }

.bm-action-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.bm-action-list li { border-bottom: 1px solid var(--border-color); }
.bm-action-list li:last-child { border-bottom: none; }

.bm-action-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    padding: 9px 2px;
    border: none;
    background: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.bm-action-link:hover { text-decoration: underline; }

.bm-action-link[disabled] {
    color: var(--text-muted);
    cursor: not-allowed;
    text-decoration: none;
}

.bm-action-link[disabled]:hover { text-decoration: none; }

.bm-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-surface-alt);
    margin-bottom: 16px;
}

.bm-toolbar select,
.bm-toolbar input {
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
}

.bm-toolbar select:disabled,
.bm-toolbar input:disabled { opacity: .55; cursor: not-allowed; }

.bm-toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.bm-toolbar-btn:hover { background: var(--bg-surface-alt); }
.bm-toolbar-btn:disabled { opacity: .55; cursor: not-allowed; }

.bm-toolbar-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
}

.bm-toolbar-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.bm-toolbar-margin-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--text-muted);
}

.bm-toolbar-margin-group input { width: 60px; }

.bm-summary-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
    margin-bottom: 12px;
    font-size: 12.5px;
    color: var(--text-muted);
}

.bm-summary-bar strong { color: var(--text-primary); }

.bm-results {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
}

.bm-patient-group {
    border-bottom: 1px solid var(--border-color);
    padding: 12px 14px;
}

.bm-patient-group:last-child { border-bottom: none; }

.bm-patient-group:nth-child(even) { background: var(--bg-surface-alt); }

.bm-patient-name-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 8px;
}

.bm-patient-name {
    font-weight: 700;
    color: #dc2626;
    font-size: 14px;
}

:root[data-theme="dark"] .bm-patient-name { color: #f87171; }

.bm-patient-meta {
    font-size: 12px;
    color: var(--text-muted);
}

.bm-encounter-block {
    margin-bottom: 6px;
}

.bm-encounter-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.bm-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid transparent;
    cursor: pointer;
}

.bm-chip.bm-chip-encounter {
    background: var(--accent);
    color: white;
}

.bm-chip.bm-chip-encounter:hover { background: var(--accent-hover); }

.bm-chip.bm-chip-insurance {
    background: var(--accent-light);
    color: var(--accent-text, var(--accent));
    cursor: default;
}

.bm-chip.bm-chip-insurance.none {
    background: var(--bg-surface-alt);
    color: var(--text-muted);
    border-color: var(--border-color);
}

.bm-chip.bm-chip-mbo {
    background: var(--bg-surface-alt);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
    cursor: not-allowed;
}

.bm-expand-toggle {
    border: none;
    background: none;
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
}

.bm-expand-toggle:hover { text-decoration: underline; }

.bm-encounter-detail {
    display: none;
    margin: 8px 0 4px 4px;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-surface);
}

.bm-encounter-detail.open { display: block; }

.bm-charge-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    margin-bottom: 10px;
}

.bm-charge-table th {
    text-align: left;
    padding: 6px 8px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    border-bottom: 1px solid var(--border-color);
}

.bm-charge-table td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
}

.bm-charge-table tbody tr:last-child td { border-bottom: none; }

.bm-charge-provider {
    background: #fef9c3;
    color: #713f12;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
}

:root[data-theme="dark"] .bm-charge-provider { background: rgba(250, 204, 21, .18); color: #fde68a; }

.bm-claim-status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: center;
}

.bm-claim-status-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
}

.bm-claim-status-group select {
    height: 30px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    font-weight: 500;
}

.bm-empty-state {
    padding: 32px 20px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.bm-page.bm-masked .bm-money-mask { visibility: hidden; position: relative; }
.bm-page.bm-masked .bm-money-mask::after {
    content: "\\2022\\2022\\2022\\2022";
    visibility: visible;
    position: absolute;
    left: 0;
}
</style>

<div class="bm-page" id="bmPage">
    <div class="bm-header">
        <div class="bm-header-title">
            <div class="bm-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
            </div>
            <h1>Billing Manager</h1>
        </div>
        <button type="button" class="bm-mask-toggle" id="bmMaskToggle" title="Hide dollar amounts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
    </div>

    <div class="bm-criteria-grid">
        <div class="bm-panel">
            <div class="bm-panel-header">Choose Criteria</div>
            <div class="bm-panel-body">
                <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Select a criteria type, fill in its value, then Add:</label>
                <ul class="bm-criteria-list" id="bmCriteriaTypeList">
                    <li><button type="button" data-criteria-type="date_of_service">Date of Service</button></li>
                    <li><button type="button" data-criteria-type="date_of_entry">Date of Entry</button></li>
                    <li><button type="button" data-criteria-type="billing_status">Billing Status</button></li>
                    <li><button type="button" data-criteria-type="claim_type">Claim Type</button></li>
                    <li><button type="button" data-criteria-type="patient_name">Patient Name</button></li>
                    <li><button type="button" data-criteria-type="patient_id">Patient Id</button></li>
                    <li><button type="button" data-criteria-type="insurance">Insurance Company</button></li>
                    <li><button type="button" data-criteria-type="encounter">Encounter</button></li>
                    <li><button type="button" data-criteria-type="provider">Provider</button></li>
                    <li><button type="button" data-criteria-type="facility">Facility</button></li>
                </ul>

                <div class="bm-criteria-value-form" id="bmCriteriaValueForm">
                    <div id="bmCriteriaValueFields"></div>
                    <button type="button" class="bm-add-criteria-btn" id="bmAddCriteriaBtn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                        Add Criteria
                    </button>
                </div>
            </div>
        </div>

        <div class="bm-panel">
            <div class="bm-panel-header">
                Current Criteria
                <button type="button" class="bm-panel-icon-btn" id="bmClearCriteriaBtn" title="Clear all criteria">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"></path></svg>
                </button>
            </div>
            <div class="bm-panel-body">
                <ul class="bm-current-criteria-list" id="bmCurrentCriteriaList">
                    <li class="bm-current-criteria-empty">No criteria yet -- results default to the most recent 200 visits.</li>
                </ul>
            </div>
        </div>

        <div class="bm-panel">
            <div class="bm-panel-header">Select Action</div>
            <div class="bm-panel-body">
                <ul class="bm-action-list">
                    <li><button type="button" class="bm-action-link" id="bmUpdateListBtn">Update List</button></li>
                    <li><button type="button" class="bm-action-link" id="bmSelectAllBtn">Select All</button></li>
                    <li><button type="button" class="bm-action-link" disabled title="Needs a real insurance/EDI clearinghouse integration -- not available in this build">View Printable Report</button></li>
                    <li><button type="button" class="bm-action-link" disabled title="Needs a real insurance/EDI clearinghouse integration -- not available in this build">End Of Day Report - Totals</button></li>
                    <li><button type="button" class="bm-action-link" disabled title="No audit log for this screen yet">View Log</button></li>
                    <li><button type="button" class="bm-action-link" disabled title="No audit log for this screen yet">Tab Log</button></li>
                    <li><button type="button" class="bm-action-link" disabled title="No audit log for this screen yet">Clear Log</button></li>
                </ul>
            </div>
        </div>
    </div>

    <div class="bm-toolbar">
        <select disabled title="Needs a real X12 837 clearinghouse connection -- not available in this build">
            <option>X12 OPTIONS</option>
        </select>
        <select disabled title="Needs real CMS-1500 form generation -- not available in this build">
            <option>HCFA FORM</option>
        </select>
        <button type="button" class="bm-toolbar-btn primary" id="bmMarkClearedBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Mark as Cleared
        </button>
        <button type="button" class="bm-toolbar-btn" id="bmReopenBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>
            Re-Open
        </button>
        <div class="bm-toolbar-margin-group">
            <span>CMS Margins Left:</span>
            <input type="number" value="24" disabled>
            <span>Top:</span>
            <input type="number" value="20" disabled>
        </div>
    </div>

    <div class="bm-summary-bar" id="bmSummaryBar"></div>

    <div class="bm-results" id="bmResults">
        <div class="bm-empty-state">Loading...</div>
    </div>
</div>
    `;
}
