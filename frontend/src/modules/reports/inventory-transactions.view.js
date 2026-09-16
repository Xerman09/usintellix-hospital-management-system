export function InventoryTransactionsReportView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return `
<style>
.it-page {
    width: 100%;
    font-size: 13.5px;
}

.it-title {
    margin: 0 0 18px;
    font-size: 26px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
}

.it-filter-panel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
}

.it-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.it-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.it-filter-panel select,
.it-filter-panel input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    min-width: 150px;
    color-scheme: light;
}

:root[data-theme="dark"] .it-filter-panel select,
:root[data-theme="dark"] .it-filter-panel input[type="date"] {
    color-scheme: dark;
}

.it-divider {
    width: 1px;
    align-self: stretch;
    background: var(--border-color);
}

.it-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 18px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    margin-left: auto;
}

.it-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.it-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.it-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.it-table th {
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

.it-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.it-table tbody tr:last-child td { border-bottom: none; }

.it-type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}

.it-type-badge.transfer {
    background: var(--accent-light);
    color: var(--accent-text);
}

.it-type-badge.destroyed {
    background: #fee2e2;
    color: #b91c1c;
}

:root[data-theme="dark"] .it-type-badge.destroyed {
    background: rgba(220, 38, 38, .2);
    color: #fca5a5;
}

.it-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}
</style>

<div class="it-page">
    <h2 class="it-title">Inventory Transactions</h2>

    <div class="it-filter-panel">
        <div class="it-filter-group">
            <label>Type:</label>
            <select id="itType">
                <option value="">All</option>
                <option value="transfer">Transfer</option>
                <option value="destroyed">Destroyed</option>
            </select>
        </div>
        <div class="it-filter-group">
            <label>From:</label>
            <input type="date" id="itDateFrom" value="${from}">
        </div>
        <div class="it-filter-group">
            <label>To:</label>
            <input type="date" id="itDateTo" value="${to}">
        </div>
        <div class="it-divider"></div>
        <button type="button" class="it-submit-btn" id="itSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <div class="it-table-wrap">
        <table class="it-table">
            <thead>
                <tr>
                    <th>Date</th><th>Type</th><th>Drug</th><th>NDC</th>
                    <th style="text-align: right;">Qty</th><th>Detail</th><th>Recorded By</th>
                </tr>
            </thead>
            <tbody id="itTableBody"><tr><td colspan="7" class="it-empty-state">Click Submit to view inventory transactions.</td></tr></tbody>
        </table>
    </div>
</div>
    `;
}
