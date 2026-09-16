export function PrepaymentBalancesView() {
    return `
<style>
.ppb-page {
    width: 100%;
    font-size: 13.5px;
}

.ppb-title {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.ppb-filter-panel {
    display: flex;
    align-items: center;
    gap: 24px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
}

.ppb-filter-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
}

.ppb-filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 16px 24px;
}

.ppb-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ppb-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.ppb-filter-panel select,
.ppb-filter-panel input[type="text"],
.ppb-filter-panel input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    min-width: 190px;
    color-scheme: light;
}

:root[data-theme="dark"] .ppb-filter-panel select,
:root[data-theme="dark"] .ppb-filter-panel input[type="text"],
:root[data-theme="dark"] .ppb-filter-panel input[type="date"] {
    color-scheme: dark;
}

.ppb-patient-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ppb-patient-field input {
    background: var(--bg-surface-alt);
    cursor: pointer;
}

.ppb-clear-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    text-decoration: underline;
}

.ppb-checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
}

.ppb-divider {
    width: 1px;
    align-self: stretch;
    background: var(--border-color);
}

.ppb-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 18px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.ppb-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.ppb-instruction {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0 0 14px;
}

.ppb-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.ppb-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.ppb-table th {
    text-align: left;
    padding: 9px 12px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.ppb-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.ppb-table tbody tr:last-child td { border-bottom: none; }

.ppb-balance { font-weight: 700; }

.ppb-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}
</style>

<div class="ppb-page">
    <h2 class="ppb-title">Prepayment Balances</h2>

    <div class="ppb-filter-panel">
        <form id="ppbForm" class="ppb-filter-fields">
            <div class="ppb-filter-row">
                <div class="ppb-filter-group">
                    <label>Check Date From:</label>
                    <input type="date" id="ppbDateFrom">
                </div>
                <div class="ppb-filter-group">
                    <label>To:</label>
                    <input type="date" id="ppbDateTo">
                </div>
            </div>
            <div class="ppb-filter-row">
                <div class="ppb-filter-group">
                    <label>Patient:</label>
                    <div class="ppb-patient-field">
                        <input type="text" id="ppbPatientBtn" readonly placeholder="" title="Click to select a patient">
                        <input type="hidden" id="ppbPatientId" value="">
                        <button type="button" class="ppb-clear-link" id="ppbPatientClear">Clear</button>
                    </div>
                </div>
                <label class="ppb-checkbox-label">
                    <input type="checkbox" id="ppbGlobalOnly">
                    Parked in Global only
                </label>
            </div>
        </form>

        <div class="ppb-divider"></div>

        <button type="button" class="ppb-submit-btn" id="ppbSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <p class="ppb-instruction">Click Submit to list all open prepayments with an unapplied balance. Date and patient filters are optional.</p>

    <div class="ppb-table-wrap" id="ppbResultsArea" style="display: none;">
        <table class="ppb-table">
            <thead>
                <tr>
                    <th>Check Date</th><th>Method</th><th>Reference #</th><th>Patient</th>
                    <th style="text-align: right;">Amount</th><th style="text-align: right;">Applied</th>
                    <th style="text-align: right;">Balance</th>
                </tr>
            </thead>
            <tbody id="ppbTableBody"></tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="patientPickerModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <h2>Select Patient</h2>
            <button type="button" class="modal-close" id="closePatientPickerModal">&times;</button>
        </div>
        <input type="text" id="patientPickerSearch" class="form-input" placeholder="Search by name or patient no..." style="margin-bottom: 14px;">
        <div id="patientPickerList" style="max-height: 320px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;"></div>
    </div>
</div>
    `;
}
