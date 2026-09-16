export function DestroyedDrugsView() {
    return `
<style>
.dd-page {
    width: 100%;
    font-size: 13.5px;
}

.dd-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
}

.dd-toolbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.dd-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.dd-filters label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
}

.dd-filters input[type="date"] {
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
}

.dd-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.dd-btn:hover { background: var(--bg-surface-alt); }

.dd-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
}

.dd-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.dd-list-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 12.5px;
    color: var(--text-primary);
}

.dd-list-bar select {
    height: 30px;
    padding: 0 6px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
}

.dd-list-bar input[type="text"] {
    height: 30px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    min-width: 200px;
}

.dd-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.dd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.dd-table th {
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

.dd-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.dd-table tbody tr:last-child td { border-bottom: none; }

.dd-drug-name {
    color: var(--accent);
    font-weight: 600;
}

.dd-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.dd-footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

.dd-footer-info {
    font-size: 12.5px;
    color: var(--text-muted);
}

.dd-pagination {
    display: flex;
    align-items: center;
    gap: 4px;
}

.dd-page-btn {
    height: 30px;
    min-width: 30px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    cursor: pointer;
}

.dd-page-btn:hover:not(:disabled) { background: var(--bg-surface-alt); }
.dd-page-btn:disabled { opacity: .45; cursor: not-allowed; }
.dd-page-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
</style>

<div class="dd-page">
    <div class="dd-toolbar">
        <h1>Destroyed Drugs</h1>
        <div class="dd-filters">
            <label for="ddFrom">From:</label>
            <input type="date" id="ddFrom">
            <label for="ddTo">To:</label>
            <input type="date" id="ddTo">
            <button type="button" class="dd-btn primary" id="ddRefreshBtn">Refresh</button>
            <button type="button" class="dd-btn" id="ddPrintBtn">Print</button>
        </div>
    </div>

    <div class="dd-list-bar">
        <div>
            Show
            <select id="ddPageSize">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
            entries
        </div>
        <div>
            Search: <input type="text" id="ddSearchInput" placeholder="">
        </div>
    </div>

    <div class="dd-table-wrap">
        <table class="dd-table">
            <thead>
                <tr>
                    <th>Drug Name</th><th>NDC</th><th>Lot</th><th>Qty</th>
                    <th>Date Destroyed</th><th>Method</th><th>Witness</th><th>Notes</th>
                </tr>
            </thead>
            <tbody id="ddTableBody"><tr><td colspan="8" class="dd-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>

    <div class="dd-footer-bar">
        <div class="dd-footer-info" id="ddFooterInfo"></div>
        <div class="dd-pagination" id="ddPagination"></div>
    </div>
</div>
    `;
}
