export function InventoryActivityReportView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return `
<style>
.ia-page {
    width: 100%;
    font-size: 13.5px;
}

.ia-title {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.ia-filter-panel {
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

.ia-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ia-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.ia-filter-panel input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .ia-filter-panel input[type="date"] {
    color-scheme: dark;
}

.ia-refresh-btn {
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

.ia-refresh-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.ia-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.ia-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.ia-table th {
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

.ia-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.ia-table tbody tr:last-child td { border-bottom: none; }

.ia-type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}

.ia-type-badge.transfer {
    background: var(--accent-light);
    color: var(--accent-text);
}

.ia-type-badge.destroyed {
    background: #fee2e2;
    color: #b91c1c;
}

:root[data-theme="dark"] .ia-type-badge.destroyed {
    background: rgba(220, 38, 38, .2);
    color: #fca5a5;
}

.ia-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}
</style>

<div class="ia-page">
    <h2 class="ia-title">Report - Inventory Activity</h2>

    <div class="ia-filter-panel">
        <div class="ia-filter-group">
            <label>From:</label>
            <input type="date" id="iaDateFrom" value="${from}">
        </div>
        <div class="ia-filter-group">
            <label>To:</label>
            <input type="date" id="iaDateTo" value="${to}">
        </div>
        <button type="button" class="ia-refresh-btn" id="iaRefreshBtn">Refresh</button>
    </div>

    <div class="ia-table-wrap">
        <table class="ia-table">
            <thead>
                <tr>
                    <th>Date</th><th>Type</th><th>Drug</th><th>NDC</th>
                    <th style="text-align: right;">Qty</th><th>Detail</th><th>Recorded By</th>
                </tr>
            </thead>
            <tbody id="iaTableBody"><tr><td colspan="7" class="ia-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>
</div>
    `;
}
