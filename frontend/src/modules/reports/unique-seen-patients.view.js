export function UniqueSeenPatientsView() {
    const now = new Date();
    const to = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    return `
<style>
.usp-page {
    width: 100%;
    font-size: 13.5px;
}

.usp-title {
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.usp-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    margin-bottom: 16px;
}

.usp-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.usp-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.3;
    white-space: nowrap;
}

.usp-filter-bar input[type="date"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    color-scheme: light;
}

:root[data-theme="dark"] .usp-filter-bar input[type="date"] {
    color-scheme: dark;
}

.usp-divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

.usp-submit-btn {
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

.usp-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.usp-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.usp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.usp-table th {
    text-align: left;
    padding: 10px 14px;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 13px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.usp-table td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
    white-space: nowrap;
}

.usp-table tbody tr:last-child td { border-bottom: none; }

.usp-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.usp-table tfoot td {
    border-top: 2px solid var(--border-color);
    font-weight: 700;
    color: var(--text-primary);
}
</style>

<div class="usp-page">
    <h2 class="usp-title">Report - Unique Seen Patients</h2>

    <div class="usp-filter-bar">
        <div class="usp-filter-group">
            <label>Visits<br>From:</label>
            <input type="date" id="uspDateFrom" value="${from}">
        </div>
        <div class="usp-filter-group">
            <label>To:</label>
            <input type="date" id="uspDateTo" value="${to}">
        </div>
        <div class="usp-divider"></div>
        <button type="button" class="usp-submit-btn" id="uspSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <div class="usp-table-wrap">
        <table class="usp-table">
            <thead>
                <tr>
                    <th>Last Visit</th><th>Patient</th><th style="text-align: right;">Visits</th>
                    <th style="text-align: right;">Age</th><th>Sex</th><th>Race</th>
                    <th>Primary Insurance</th><th>Secondary Insurance</th>
                </tr>
            </thead>
            <tbody id="uspTableBody"><tr><td colspan="8" class="usp-empty-state">Click Submit to view the report.</td></tr></tbody>
            <tfoot id="uspTableFoot"></tfoot>
        </table>
    </div>
</div>
    `;
}
