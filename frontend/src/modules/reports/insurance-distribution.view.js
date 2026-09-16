export function InsuranceDistributionView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);

    return `
<style>
.pid-page {
    width: 100%;
    font-size: 13.5px;
}

.pid-title {
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.pid-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    margin-bottom: 16px;
}

.pid-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pid-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.pid-filter-bar input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .pid-filter-bar input[type="date"] {
    color-scheme: dark;
}

.pid-divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

.pid-submit-btn {
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

.pid-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.pid-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.pid-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pid-table th {
    text-align: left;
    padding: 10px 14px;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 13px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.pid-table td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.pid-table tbody tr:last-child td { border-bottom: none; }

.pid-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.pid-table tfoot td {
    border-top: 2px solid var(--border-color);
    font-weight: 700;
    color: var(--text-primary);
}
</style>

<div class="pid-page">
    <h2 class="pid-title">Report - Patient Insurance Distribution</h2>

    <div class="pid-filter-bar">
        <div class="pid-filter-group">
            <label>From:</label>
            <input type="date" id="pidDateFrom">
        </div>
        <div class="pid-filter-group">
            <label>To:</label>
            <input type="date" id="pidDateTo" value="${to}">
        </div>
        <div class="pid-divider"></div>
        <button type="button" class="pid-submit-btn" id="pidSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <div class="pid-table-wrap">
        <table class="pid-table">
            <thead>
                <tr>
                    <th>Primary Insurance</th><th style="text-align: right;">Charges</th>
                    <th style="text-align: right;">Visits</th><th style="text-align: right;">Patients</th>
                    <th style="text-align: right;">Pt %</th>
                </tr>
            </thead>
            <tbody id="pidTableBody"><tr><td colspan="5" class="pid-empty-state">Click Submit to view the report.</td></tr></tbody>
            <tfoot id="pidTableFoot"></tfoot>
        </table>
    </div>
</div>
    `;
}
