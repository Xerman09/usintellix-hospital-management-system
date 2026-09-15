export function EobPostingView() {
    return `
<style>
.eob-page {
    width: 100%;
    font-size: 13.5px;
}

.eob-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(90deg, var(--accent), var(--accent-hover));
    color: white;
    padding: 14px 20px;
    border-radius: 8px 8px 0 0;
}

.eob-header-bar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}

.eob-section {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-top: none;
    padding: 16px 20px;
}

.eob-section:last-child { border-radius: 0 0 8px 8px; }

.eob-section-title {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 14px;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
}

.eob-toggle-group {
    display: flex;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--accent);
}

.eob-toggle-btn {
    border: none;
    background: var(--bg-surface);
    color: var(--accent);
    padding: 5px 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
}

.eob-toggle-btn.active {
    background: var(--accent);
    color: white;
}

.eob-form-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px 16px;
    margin-bottom: 14px;
}

.eob-form-grid.eob-search-grid {
    grid-template-columns: repeat(5, 1fr) auto;
    align-items: end;
}

@media (max-width: 1100px) {
    .eob-form-grid, .eob-form-grid.eob-search-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
    .eob-form-grid, .eob-form-grid.eob-search-grid { grid-template-columns: 1fr; }
}

.eob-field label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
}

.eob-field input,
.eob-field select {
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

.eob-checkbox-field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 26px;
}

.eob-checkbox-field label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
}

.eob-search-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 16px;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.eob-search-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.eob-alert-area { margin-bottom: 12px; }

.eob-panel { display: none; }
.eob-panel.active { display: block; }

.eob-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-top: 18px;
}

.eob-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.eob-table th {
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

.eob-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.eob-table tbody tr:last-child td { border-bottom: none; }

.eob-money { text-align: right; font-variant-numeric: tabular-nums; }

.eob-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid #16a34a;
    background: #16a34a;
    color: white;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
}

.eob-post-btn:hover { background: #15803d; border-color: #15803d; }

.eob-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.eob-era-placeholder {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
}

.eob-era-placeholder svg {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
    color: var(--text-muted);
}
</style>

<div class="eob-page">
    <div class="eob-header-bar">
        <h1>EOB Posting - Search</h1>
    </div>

    <div class="eob-section">
        <div class="eob-section-title">Post Item</div>

        <div class="eob-form-grid">
            <div class="eob-field">
                <label>Payer:</label>
                <select id="eobPayer">
                    <option value="patient">-- Patient --</option>
                    <option value="insurance">Insurance</option>
                </select>
            </div>
            <div class="eob-field"><label>Source:</label><input type="text" id="eobSource"></div>
            <div class="eob-field"><label>Pay Date:</label><input type="date" id="eobPayDate"></div>
            <div class="eob-field"><label>Deposit Date:</label><input type="date" id="eobDepositDate"></div>
            <div class="eob-field"><label>Amount:</label><input type="number" step="0.01" min="0" id="eobAmount" value="0.00"></div>
        </div>

        <div class="eob-checkbox-field">
            <input type="checkbox" id="eobPtDebt">
            <label for="eobPtDebt">Pt Debt</label>
        </div>
    </div>

    <div class="eob-section">
        <div class="eob-section-title">
            Invoice Search
            <div class="eob-toggle-group">
                <button type="button" class="eob-toggle-btn active" data-eob-tab="invoice">Invoice Search</button>
                <button type="button" class="eob-toggle-btn" data-eob-tab="era">ERA Upload</button>
            </div>
        </div>

        <div class="eob-panel active" id="eobInvoicePanel" data-eob-panel="invoice">
            <div id="eobAlert" class="eob-alert-area"></div>

            <div class="eob-form-grid eob-search-grid">
                <div class="eob-field"><label>Name:</label><input type="text" id="eobName" placeholder="Last name, First name"></div>
                <div class="eob-field"><label>Chart ID:</label><input type="text" id="eobChartId"></div>
                <div class="eob-field"><label>Encounter:</label><input type="number" id="eobEncounter"></div>
                <div class="eob-field"><label>Service Date From:</label><input type="date" id="eobServiceFrom"></div>
                <div class="eob-field"><label>Service Date To:</label><input type="date" id="eobServiceTo"></div>
                <div class="eob-field">
                    <label>Type:</label>
                    <select id="eobType">
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="all">All</option>
                    </select>
                </div>
            </div>

            <button type="button" class="eob-search-btn" id="eobSearchBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                Search
            </button>

            <div class="eob-table-wrap" id="eobResultsWrap" style="display:none;">
                <table class="eob-table">
                    <thead>
                        <tr><th>Name</th><th>Chart ID</th><th>Encounter</th><th>Service Date</th><th style="text-align:right;">Charges</th><th style="text-align:right;">Balance Due</th><th>Type</th><th></th></tr>
                    </thead>
                    <tbody id="eobResultsBody"></tbody>
                </table>
            </div>
        </div>

        <div class="eob-panel" id="eobEraPanel" data-eob-panel="era">
            <div class="eob-era-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M9 15l2 2 4-4"></path></svg>
                <p><strong>ERA Upload needs a real insurance clearinghouse connection.</strong><br>
                This app doesn't have 835 electronic remittance file parsing, so uploading and auto-posting an ERA file isn't available here. Use Invoice Search above to find and post against specific invoices manually instead.</p>
            </div>
        </div>
    </div>
</div>
    `;
}
