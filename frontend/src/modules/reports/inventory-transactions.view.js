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
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
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

.it-filter-panel input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .it-filter-panel input[type="date"] {
    color-scheme: dark;
}

.it-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 16px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    margin-left: auto;
}

.it-refresh-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

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
    white-space: nowrap;
}

.it-table tbody tr:last-child td { border-bottom: none; }

.it-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}
</style>

<div class="it-page">
    <h2 class="it-title">Report - Inventory Transactions</h2>

    <div class="it-filter-panel">
        <div class="it-filter-group">
            <label>From:</label>
            <input type="date" id="itDateFrom" value="${from}">
        </div>
        <div class="it-filter-group">
            <label>To:</label>
            <input type="date" id="itDateTo" value="${to}">
        </div>
        <button type="button" class="it-refresh-btn" id="itRefreshBtn">Refresh</button>
    </div>

    <div class="it-table-wrap">
        <table class="it-table">
            <thead>
                <tr>
                    <th>Date</th><th>Drug</th><th>NDC</th><th style="text-align: right;">Qty</th>
                    <th>From</th><th>To</th><th>Notes</th><th>Recorded By</th>
                </tr>
            </thead>
            <tbody id="itTableBody"><tr><td colspan="8" class="it-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>
</div>
    `;
}
