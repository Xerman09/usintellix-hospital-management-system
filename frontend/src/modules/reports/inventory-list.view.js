export function InventoryListReportView() {
    return `
<style>
.il-page {
    width: 100%;
    font-size: 13.5px;
}

.il-title {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.il-filter-panel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
}

.il-filter-panel select {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
}

.il-checkbox-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
}

.il-refresh-btn {
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

.il-refresh-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.il-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.il-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.il-table th {
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

.il-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
    white-space: nowrap;
}

.il-table tbody tr:last-child td { border-bottom: none; }

.il-drug-name { color: var(--accent); font-weight: 600; }

.il-expired { color: #b91c1c; font-weight: 600; }
:root[data-theme="dark"] .il-expired { color: #fca5a5; }

.il-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.il-footer-info {
    margin-top: 10px;
    font-size: 12.5px;
    color: var(--text-muted);
}
</style>

<div class="il-page">
    <h2 class="il-title">Report - Inventory List</h2>

    <div class="il-filter-panel">
        <select id="ilFacilityFilter"><option value="">-- All Facilities --</option></select>
        <select id="ilWarehouseFilter"><option value="">All Warehouses</option></select>
        <select id="ilProductTypeFilter"><option value="">All Product Types</option></select>
        <label class="il-checkbox-label"><input type="checkbox" id="ilShowEmptyLots"> Show empty lots</label>
        <label class="il-checkbox-label"><input type="checkbox" id="ilShowInactive"> Show inactive</label>
        <button type="button" class="il-refresh-btn" id="ilRefreshBtn">Refresh</button>
    </div>

    <div class="il-table-wrap">
        <table class="il-table">
            <thead>
                <tr>
                    <th>Name</th><th>NDC</th><th>Form</th><th>Size</th><th>Unit</th>
                    <th>Lot</th><th>Facility</th><th>Warehouse</th><th>QOH</th><th>Expires</th>
                </tr>
            </thead>
            <tbody id="ilTableBody"><tr><td colspan="10" class="il-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>

    <div class="il-footer-info" id="ilFooterInfo"></div>
</div>
    `;
}
