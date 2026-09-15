export function BatchPaymentsView() {
    return `
<style>
.bp-page {
    width: 100%;
    font-size: 13.5px;
}

.bp-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.bp-icon-badge {
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

.bp-icon-badge svg {
    width: 18px;
    height: 18px;
    color: var(--text-muted);
}

.bp-header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
}

.bp-tabs {
    display: flex;
    gap: 22px;
    margin: 4px 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
}

.bp-tab {
    border: none;
    background: none;
    padding: 2px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
}

.bp-tab.active {
    color: var(--accent);
}

.bp-tab-panel { display: none; }
.bp-tab-panel.active { display: block; }

.bp-card {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 18px 20px;
    margin-bottom: 18px;
}

.bp-card h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
}

.bp-form-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px 18px;
    margin-bottom: 16px;
}

@media (max-width: 900px) {
    .bp-form-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
    .bp-form-grid { grid-template-columns: 1fr; }
}

.bp-field label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
}

.bp-field input,
.bp-field select,
.bp-field textarea {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
}

.bp-field textarea { height: 34px; padding-top: 7px; resize: vertical; }

.bp-undistributed-box {
    display: flex;
    align-items: center;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    background: #dc2626;
    color: white;
    font-weight: 700;
    font-size: 13px;
}

.bp-global-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.bp-global-row input { flex: 1; }

.bp-icon-btn {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bp-icon-btn:hover { color: #b91c1c; }

.bp-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.bp-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 16px;
    border-radius: 7px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.bp-btn:hover { background: var(--bg-surface-alt); }
.bp-btn:disabled { opacity: .5; cursor: not-allowed; }

.bp-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
}

.bp-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.bp-btn.success {
    background: #16a34a;
    border-color: #16a34a;
    color: white;
}

.bp-btn.success:hover { background: #15803d; border-color: #15803d; }

.bp-alert-area { margin-bottom: 12px; }

.bp-allocate-card { display: none; }
.bp-allocate-card.open { display: block; }

.bp-allocate-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 22px;
    margin-bottom: 16px;
    font-size: 12.5px;
    color: var(--text-muted);
}

.bp-allocate-summary strong { color: var(--text-primary); }

.bp-patient-search-wrap { position: relative; }

.bp-patient-search-results {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 220px;
    overflow-y: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0,0,0,.12);
    margin-top: 4px;
}

.bp-patient-search-results.open { display: block; }

.bp-patient-search-row {
    padding: 8px 10px;
    cursor: pointer;
    font-size: 12.5px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
}

.bp-patient-search-row:last-child { border-bottom: none; }
.bp-patient-search-row:hover { background: var(--bg-surface-alt); }

.bp-selected-patient-chip {
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    background: var(--accent-light);
    color: var(--accent-text, var(--accent));
    font-weight: 600;
    font-size: 13px;
}

.bp-selected-patient-chip.open { display: flex; }

.bp-selected-patient-chip button {
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
}

.bp-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.bp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.bp-table th {
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

.bp-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.bp-table tbody tr:last-child td { border-bottom: none; }
.bp-table tbody tr.bp-clickable { cursor: pointer; }
.bp-table tbody tr.bp-clickable:hover { background: var(--bg-surface-alt); }

.bp-money { text-align: right; font-variant-numeric: tabular-nums; }

.bp-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.bp-era-placeholder {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
}

.bp-era-placeholder svg {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
    color: var(--text-muted);
}

.bp-search-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
    margin-bottom: 16px;
}

.bp-search-filters .bp-field { width: 170px; }
.bp-search-filters .bp-field input,
.bp-search-filters .bp-field select { height: 32px; }
</style>

<div class="bp-page" id="bpPage">
    <div class="bp-header">
        <div class="bp-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
        </div>
        <h1>Payments</h1>
    </div>

    <div class="bp-tabs">
        <button type="button" class="bp-tab active" data-bp-tab="new">New Payment</button>
        <button type="button" class="bp-tab" data-bp-tab="search">Search Payment</button>
        <button type="button" class="bp-tab" data-bp-tab="era">ERA Posting</button>
    </div>

    <div class="bp-tab-panel active" id="bpNewPaymentPanel" data-bp-panel="new">
        <div id="bpFormAlert" class="bp-alert-area"></div>

        <div class="bp-card">
            <h2>Batch Payment Entry</h2>

            <div class="bp-form-grid">
                <div class="bp-field"><label>Date:</label><input type="date" id="bp_payment_date"></div>
                <div class="bp-field"><label>Post To Date:</label><input type="date" id="bp_post_to_date"></div>
                <div class="bp-field">
                    <label>Payment Method:</label>
                    <select id="bp_payment_method">
                        <option value="check">Check Payment</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="eft">EFT / Direct Deposit</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="bp-field"><label>Check Number:</label><input type="text" id="bp_check_number"></div>

                <div class="bp-field"><label>Payment Amount:</label><input type="number" step="0.01" min="0" id="bp_payment_amount" value="0.00"></div>
                <div class="bp-field">
                    <label>Paying Entity:</label>
                    <select id="bp_paying_entity">
                        <option value="insurance">Insurance</option>
                        <option value="patient">Patient</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="bp-field">
                    <label>Payment Category:</label>
                    <select id="bp_payment_category">
                        <option value="Insurance Payment">Insurance Payment</option>
                        <option value="Patient Payment">Patient Payment</option>
                        <option value="Refund">Refund</option>
                        <option value="Write-off">Write-off</option>
                    </select>
                </div>
                <div></div>

                <div class="bp-field"><label>Payment From:</label><input type="text" id="bp_payment_from" placeholder="e.g. Acme Health Insurance"></div>
                <div class="bp-field"><label>Payor ID:</label><input type="text" id="bp_payor_id"></div>
                <div class="bp-field"><label>Deposit Date:</label><input type="date" id="bp_deposit_date"></div>
                <div class="bp-field"><label>Description:</label><input type="text" id="bp_description"></div>

                <div class="bp-field">
                    <label>Distributed to Global:</label>
                    <div class="bp-global-row">
                        <button type="button" class="bp-icon-btn" id="bpResetGlobalBtn" title="Reset to 0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"></path></svg>
                        </button>
                        <input type="number" step="0.01" min="0" id="bp_distributed_to_global" value="0.00" disabled>
                    </div>
                </div>
                <div class="bp-field">
                    <label>Undistributed:</label>
                    <div class="bp-undistributed-box" id="bpUndistributedBox">0.00</div>
                </div>
            </div>

            <div class="bp-actions">
                <button type="button" class="bp-btn primary" id="bpSaveBtn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Save Changes
                </button>
                <button type="button" class="bp-btn success" id="bpAllocateToggleBtn" disabled title="Save the payment first">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Allocate
                </button>
                <button type="button" class="bp-btn" id="bpCancelBtn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
                    Cancel Changes
                </button>
                <button type="button" class="bp-btn" id="bpDeleteBtn" style="display:none; color:#b91c1c;">
                    Delete Payment
                </button>
            </div>
        </div>

        <div class="bp-card bp-allocate-card" id="bpAllocateCard">
            <h2>Allocate Payment</h2>

            <div class="bp-allocate-summary" id="bpAllocateSummary"></div>

            <div id="bpAllocateAlert" class="bp-alert-area"></div>

            <div class="bp-form-grid">
                <div class="bp-field bp-patient-search-wrap">
                    <label>Patient:</label>
                    <input type="text" id="bpPatientSearchInput" placeholder="Search by name or patient no...">
                    <div class="bp-selected-patient-chip" id="bpSelectedPatientChip">
                        <span id="bpSelectedPatientLabel"></span>
                        <button type="button" id="bpClearSelectedPatient" title="Change patient">&times;</button>
                    </div>
                    <div class="bp-patient-search-results" id="bpPatientSearchResults"></div>
                </div>
                <div class="bp-field">
                    <label>Encounter (optional):</label>
                    <select id="bpAllocateEncounter">
                        <option value="">-- Unapplied / patient balance --</option>
                    </select>
                </div>
                <div class="bp-field"><label>Payment Amount:</label><input type="number" step="0.01" min="0" id="bpAllocatePaymentAmount" value="0.00"></div>
                <div class="bp-field"><label>Adjustment Amount:</label><input type="number" step="0.01" min="0" id="bpAllocateAdjustmentAmount" value="0.00"></div>
            </div>

            <div class="bp-form-grid" style="grid-template-columns: 1fr; margin-bottom: 14px;">
                <div class="bp-field"><label>Notes:</label><input type="text" id="bpAllocateNotes"></div>
            </div>

            <div class="bp-actions" style="margin-bottom: 18px;">
                <button type="button" class="bp-btn primary" id="bpAddAllocationBtn">+ Add Allocation</button>
            </div>

            <div class="bp-table-wrap">
                <table class="bp-table">
                    <thead>
                        <tr><th>Patient</th><th>Encounter</th><th style="text-align:right;">Payment</th><th style="text-align:right;">Adjustment</th><th>Notes</th><th></th></tr>
                    </thead>
                    <tbody id="bpAllocationsBody">
                        <tr><td colspan="6" class="bp-empty-state">No allocations yet.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="bp-tab-panel" id="bpSearchPaymentPanel" data-bp-panel="search">
        <div class="bp-search-filters">
            <div class="bp-field"><label>From:</label><input type="date" id="bpSearchFrom"></div>
            <div class="bp-field"><label>To:</label><input type="date" id="bpSearchTo"></div>
            <div class="bp-field">
                <label>Payment Method:</label>
                <select id="bpSearchMethod">
                    <option value="">All</option>
                    <option value="check">Check Payment</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="eft">EFT / Direct Deposit</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="bp-field"><label>Check Number:</label><input type="text" id="bpSearchCheckNumber"></div>
            <div class="bp-field"><label>Payment From:</label><input type="text" id="bpSearchPaymentFrom"></div>
            <button type="button" class="bp-btn primary" id="bpSearchBtn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                Search
            </button>
        </div>

        <div class="bp-table-wrap">
            <table class="bp-table">
                <thead>
                    <tr><th>Date</th><th>Method</th><th>Check #</th><th>Payment From</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Distributed</th><th style="text-align:right;">Undistributed</th></tr>
                </thead>
                <tbody id="bpSearchResultsBody">
                    <tr><td colspan="7" class="bp-empty-state">Enter search criteria and click Search.</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="bp-tab-panel" id="bpEraPostingPanel" data-bp-panel="era">
        <div class="bp-card">
            <div class="bp-era-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M9 15l2 2 4-4"></path></svg>
                <p><strong>ERA Posting needs a real insurance clearinghouse connection.</strong><br>
                This app doesn't have 835 electronic remittance file parsing or a payer/clearinghouse integration, so automatic ERA-based batch posting isn't available here. Use "New Payment" above to enter and allocate payments manually instead.</p>
            </div>
        </div>
    </div>
</div>
    `;
}
