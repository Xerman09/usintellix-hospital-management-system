export function InventoryListReportView() {
    return `
<style>
.il-page {
    width: 100%;
    font-size: 13.5px;
}

.il-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    margin-bottom: 16px;
}

.il-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    margin-right: 6px;
}

.il-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    flex: 1;
}

.il-filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.il-filter-group label {
    color: var(--text-muted);
    font-size: 12.5px;
    white-space: nowrap;
}

.il-filters select,
.il-filters input[type="number"] {
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
}

.il-filters input[type="number"] {
    width: 70px;
}

.il-checkbox-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
}

.il-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.il-btn {
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
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
}

.il-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

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
    <div class="il-toolbar">
        <h2 class="il-title">Inventory List</h2>
        <div class="il-filters">
            <div class="il-filter-group">
                <select id="ilFacilityFilter"><option value="">-- All Facilities --</option></select>
            </div>
            <div class="il-filter-group">
                <select id="ilWarehouseFilter"><option value="">All Warehouses</option></select>
            </div>
            <div class="il-filter-group">
                <label>For the past</label>
                <input type="number" min="1" id="ilDaysFilter" value="365">
                <label>days</label>
            </div>
            <div class="il-filter-group">
                <select id="ilProductTypeFilter"><option value="">All Product Types</option></select>
            </div>
            <label class="il-checkbox-label"><input type="checkbox" id="ilShowInactive"> Include Inactive</label>
            <div class="il-filter-group">
                <select id="ilViewMode">
                    <option value="summary">Summary</option>
                    <option value="detail">Detail</option>
                </select>
            </div>
        </div>
        <div class="il-actions">
            <button type="button" class="il-btn" id="ilRefreshBtn">Refresh</button>
            <button type="button" class="il-btn" id="ilExportCsvBtn">Export to CSV</button>
            <button type="button" class="il-btn" id="ilPrintBtn">Print</button>
        </div>
    </div>

    <div class="il-table-wrap">
        <table class="il-table" id="ilTable">
            <thead id="ilTableHead"></thead>
            <tbody id="ilTableBody"><tr><td colspan="10" class="il-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>

    <div class="il-footer-info" id="ilFooterInfo"></div>
</div>
    `;
}
