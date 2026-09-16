export function FinancialSummaryServiceCodeView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    return `
<style>
.fsc-page {
    width: 100%;
    font-size: 13.5px;
}

.fsc-title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
}

.fsc-filter-panel {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
}

.fsc-filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
}

.fsc-filter-row + .fsc-filter-row {
    margin-top: 14px;
}

.fsc-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.fsc-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.fsc-filter-panel select,
.fsc-filter-panel input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .fsc-filter-panel select,
:root[data-theme="dark"] .fsc-filter-panel input[type="date"] {
    color-scheme: dark;
}

.fsc-divider {
    width: 1px;
    align-self: stretch;
    background: var(--border-color);
}

.fsc-spacer {
    flex: 1;
}

.fsc-submit-btn {
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
}

.fsc-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.fsc-checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
}

.fsc-checkbox-label input:disabled {
    cursor: not-allowed;
}

.fsc-instruction {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0 0 14px;
}

.fsc-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.fsc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.fsc-table th {
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

.fsc-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.fsc-table tbody tr:last-child td { border-bottom: none; }

.fsc-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.fsc-table tfoot td {
    border-top: 2px solid var(--border-color);
    font-weight: 700;
    color: var(--text-primary);
}
</style>

<div class="fsc-page">
    <h2 class="fsc-title">Report - Financial Summary by Service Code</h2>

    <form id="fscForm" class="fsc-filter-panel">
        <div class="fsc-filter-row">
            <div class="fsc-filter-group">
                <label>Facility:</label>
                <select id="fscFacility"><option value="">-- All Facilities --</option></select>
            </div>
            <div class="fsc-filter-group">
                <label>Provider:</label>
                <select id="fscProvider"><option value="">-- All --</option></select>
            </div>
            <div class="fsc-divider"></div>
            <div class="fsc-spacer"></div>
            <button type="button" class="fsc-submit-btn" id="fscSubmitBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Submit
            </button>
        </div>
        <div class="fsc-filter-row">
            <div class="fsc-filter-group">
                <label>From:</label>
                <input type="date" id="fscDateFrom" value="${from}">
            </div>
            <div class="fsc-filter-group">
                <label>To:</label>
                <input type="date" id="fscDateTo" value="${to}">
            </div>
            <label class="fsc-checkbox-label">
                <input type="checkbox" id="fscImportantCodes" disabled title="This build has no concept of a curated &quot;important codes&quot; list -- every billed code is shown">
                Important Codes
            </label>
        </div>
    </form>

    <p class="fsc-instruction" id="fscInstructionText">Please input search criteria above, and click Submit to view results.</p>

    <div class="fsc-table-wrap" id="fscResultsArea" style="display: none;">
        <table class="fsc-table">
            <thead>
                <tr>
                    <th>Code Type</th><th>Code</th><th>Description</th>
                    <th style="text-align: right;">Qty</th><th style="text-align: right;">Charges</th>
                </tr>
            </thead>
            <tbody id="fscTableBody"></tbody>
            <tfoot>
                <tr>
                    <td colspan="3">Grand Total</td>
                    <td style="text-align: right;" id="fscGrandQty">0</td>
                    <td style="text-align: right;" id="fscGrandCharges">0.00</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>
    `;
}
