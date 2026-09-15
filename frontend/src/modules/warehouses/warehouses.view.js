export function WarehousesView() {
    return `
<style>
.wh-page {
    width: 100%;
    font-size: 13.5px;
}

.wh-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
}

.wh-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wh-icon-badge {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
}

.wh-icon-badge svg {
    width: 20px;
    height: 20px;
    color: white;
}

.wh-header h1 {
    margin: 0 0 3px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.wh-header p {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-muted);
}

.wh-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 18px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.wh-add-btn:hover { background: var(--accent-hover); }

.wh-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.wh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.wh-table th {
    text-align: left;
    padding: 9px 14px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.wh-table td {
    padding: 9px 14px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.wh-table tbody tr:last-child td { border-bottom: none; }

.wh-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

.wh-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.wh-icon-btn.edit { color: #3b475a; }
.wh-icon-btn.edit:hover { background: var(--bg-surface-alt); }

.wh-icon-btn.delete { color: #b91c1c; }
.wh-icon-btn.delete:hover { background: #fef2f2; }
:root[data-theme="dark"] .wh-icon-btn.edit { color: var(--text-primary); }
:root[data-theme="dark"] .wh-icon-btn.delete:hover { background: rgba(220,38,38,.15); }

.wh-empty-state {
    padding: 30px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.wh-field label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
}

.wh-field input,
.wh-field select {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
    margin-bottom: 14px;
}

.wh-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 14px;
    font-size: 13px;
    color: var(--text-primary);
}
</style>

<div class="wh-page">
    <div class="wh-header">
        <div class="wh-header-title">
            <div class="wh-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path></svg>
            </div>
            <div>
                <h1>Manage Warehouses</h1>
                <p>Storage locations used by Inventory &gt; Management for stocking and transferring drugs.</p>
            </div>
        </div>
        <button type="button" class="wh-add-btn" id="whAddBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
            Add Warehouse
        </button>
    </div>

    <div id="whAlert"></div>

    <div class="wh-table-wrap">
        <table class="wh-table">
            <thead>
                <tr><th>Name</th><th>Facility</th><th>Status</th><th>Lots</th><th></th></tr>
            </thead>
            <tbody id="whTableBody"><tr><td colspan="5" class="wh-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="whModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="whModalTitle">Add Warehouse</h2>
            <button type="button" class="modal-close" id="whCloseModal">&times;</button>
        </div>

        <div id="whFormAlert"></div>

        <form id="whForm">
            <input type="hidden" id="wh_id">

            <div class="wh-field">
                <label>Name</label>
                <input type="text" id="wh_name">
                <span class="form-error" id="err-wh_name"></span>
            </div>

            <div class="wh-field">
                <label>Facility (optional)</label>
                <select id="wh_facility_id"><option value="">N/A</option></select>
            </div>

            <div class="wh-checkbox-row" id="whActiveRow" style="display:none;">
                <input type="checkbox" id="wh_is_active">
                <label for="wh_is_active">Active</label>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="whCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>
    `;
}
