export function DrugInventoryView() {
    return `
<style>
.di-page {
    width: 100%;
    font-size: 13.5px;
}

.di-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
}

.di-toolbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.di-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}

.di-filters select {
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
}

.di-checkbox-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
}

.di-btn {
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

.di-btn:hover { background: var(--bg-surface-alt); }

.di-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
}

.di-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.di-list-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 12.5px;
    color: var(--text-primary);
}

.di-list-bar select {
    height: 30px;
    padding: 0 6px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
}

.di-list-bar input[type="text"] {
    height: 30px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    min-width: 200px;
}

.di-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.di-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.di-table th {
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

.di-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
    white-space: nowrap;
}

.di-table tbody tr:last-child td { border-bottom: none; }

.di-drug-name {
    color: var(--accent);
    font-weight: 600;
}

.di-tran-btn {
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface-alt);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.di-tran-btn:hover { background: var(--accent-light); border-color: var(--accent); }

.di-destroy-btn {
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface-alt);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.di-destroy-btn:hover { background: #fee2e2; border-color: #b91c1c; color: #b91c1c; }
:root[data-theme="dark"] .di-destroy-btn:hover { background: #450a0a; border-color: #fca5a5; color: #fca5a5; }

.di-expired { color: #b91c1c; font-weight: 600; }
:root[data-theme="dark"] .di-expired { color: #fca5a5; }

.di-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.di-footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

.di-footer-info {
    font-size: 12.5px;
    color: var(--text-muted);
}

.di-pagination {
    display: flex;
    align-items: center;
    gap: 4px;
}

.di-page-btn {
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

.di-page-btn:hover:not(:disabled) { background: var(--bg-surface-alt); }
.di-page-btn:disabled { opacity: .45; cursor: not-allowed; }
.di-page-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

.di-add-drug-row {
    text-align: center;
    margin-top: 22px;
}

.di-add-drug-row .di-btn {
    height: 40px;
    padding: 0 24px;
    font-size: 13.5px;
}

.di-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 16px;
    margin-bottom: 14px;
}

.di-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.di-field input,
.di-field select {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
}

.di-field .form-error { display: block; }

.di-modal-section-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .3px;
    margin: 14px 0 10px;
}

.di-modal-readonly {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 12.5px;
    color: var(--text-muted);
    margin-bottom: 14px;
}

.di-modal-readonly strong { color: var(--text-primary); }

.di-inline-checkboxes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin: 0 0 14px;
}

.di-inline-checkboxes-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
}

.di-limits-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 4px;
}

.di-limits-table th {
    text-align: left;
    padding: 6px 10px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
}

.di-limits-table td {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
}

.di-limits-table td:first-child {
    font-weight: 600;
    color: var(--text-primary);
    width: 60px;
}

.di-limits-table input {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    box-sizing: border-box;
}

.di-templates-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
}

.di-templates-table th {
    text-align: left;
    padding: 7px 8px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 10.5px;
    text-transform: uppercase;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    white-space: nowrap;
}

.di-templates-table td {
    padding: 5px 6px;
    border: 1px solid var(--border-color);
}

.di-templates-table input[type="text"],
.di-templates-table input[type="number"],
.di-templates-table select {
    width: 100%;
    height: 30px;
    padding: 0 6px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12px;
    box-sizing: border-box;
}

.di-templates-table input[type="checkbox"] {
    display: block;
    margin: 0 auto;
}

.di-remove-template-row {
    border: none;
    background: none;
    color: #b91c1c;
    cursor: pointer;
    font-size: 14px;
    padding: 0 4px;
}
</style>

<div class="di-page">
    <div class="di-toolbar">
        <h1>Inventory Management</h1>
        <div class="di-filters">
            <select id="diFacilityFilter"><option value="">-- All Facilities --</option></select>
            <select id="diWarehouseFilter"><option value="">All Warehouses</option></select>
            <select id="diProductTypeFilter"><option value="">All Product Types</option></select>
            <label class="di-checkbox-label"><input type="checkbox" id="diShowEmptyLots"> Show empty lots</label>
            <label class="di-checkbox-label"><input type="checkbox" id="diShowInactive"> Show inactive</label>
            <button type="button" class="di-btn" id="diRefreshBtn">Refresh</button>
        </div>
    </div>

    <div id="diAlert"></div>

    <div class="di-list-bar">
        <div>
            Show
            <select id="diPageSize">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
            entries
        </div>
        <div>
            Search: <input type="text" id="diSearchInput" placeholder="">
        </div>
    </div>

    <div class="di-table-wrap">
        <table class="di-table">
            <thead>
                <tr>
                    <th>Name</th><th>Act</th><th>Cons</th><th>NDC</th><th>Form</th><th>Size</th><th>Unit</th>
                    <th>Tran</th><th>Destroy</th><th>Lot</th><th>Facility</th><th>Warehouse</th><th>QOH</th><th>Expires</th>
                </tr>
            </thead>
            <tbody id="diTableBody"><tr><td colspan="14" class="di-empty-state">Loading...</td></tr></tbody>
        </table>
    </div>

    <div class="di-footer-bar">
        <div class="di-footer-info" id="diFooterInfo"></div>
        <div class="di-pagination" id="diPagination"></div>
    </div>

    <div class="di-add-drug-row">
        <button type="button" class="di-btn primary" id="diAddDrugBtn">Add Drug</button>
    </div>
</div>

<div class="modal-overlay" id="diAddDrugModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Add Drug</h2>
            <button type="button" class="modal-close" id="diCloseAddDrugModal">&times;</button>
        </div>

        <div id="diAddDrugAlert"></div>

        <form id="diAddDrugForm">
            <div class="di-field">
                <label>Name</label>
                <input type="text" id="di_name">
                <span class="form-error" id="err-di_name"></span>
            </div>

            <div class="di-inline-checkboxes">
                <span class="di-inline-checkboxes-label">Attributes:</span>
                <label class="di-checkbox-label"><input type="checkbox" id="di_is_active" checked> Active</label>
                <label class="di-checkbox-label"><input type="checkbox" id="di_is_consumable"> Consumable</label>
            </div>

            <div class="di-inline-checkboxes">
                <span class="di-inline-checkboxes-label">Allow:</span>
                <label class="di-checkbox-label"><input type="checkbox" id="di_allow_inventory" checked> Inventory</label>
                <label class="di-checkbox-label"><input type="checkbox" id="di_allow_multiple_lots" checked> Multiple Lots</label>
                <label class="di-checkbox-label"><input type="checkbox" id="di_allow_combining_lots"> Combining Lots</label>
            </div>

            <div class="di-field"><label>NDC Number</label><input type="text" id="di_ndc"></div>
            <div class="di-field"><label>RXCUI Code</label><input type="text" id="di_rxcui"></div>
            <div class="di-field"><label>On Order</label><input type="number" step="0.001" id="di_on_order" value="0"></div>

            <div class="di-modal-section-title">Limits</div>
            <table class="di-limits-table">
                <thead><tr><th>Units</th><th>Global</th><th>On Site</th></tr></thead>
                <tbody>
                    <tr><td>Min</td><td><input type="number" step="0.001" id="di_min_level_global" value="0"></td><td><input type="number" step="0.001" id="di_min_level_onsite" value="0"></td></tr>
                    <tr><td>Max</td><td><input type="number" step="0.001" id="di_max_level_global" value="0"></td><td><input type="number" step="0.001" id="di_max_level_onsite" value="0"></td></tr>
                </tbody>
            </table>

            <div class="di-form-grid" style="margin-top:16px;">
                <div class="di-field">
                    <label>Form</label>
                    <select id="di_form"></select>
                </div>
                <div class="di-field"><label>Size</label><input type="number" step="0.001" id="di_size"></div>
                <div class="di-field">
                    <label>Units</label>
                    <select id="di_unit"></select>
                </div>
                <div class="di-field">
                    <label>Route</label>
                    <select id="di_route"></select>
                </div>
                <div class="di-field">
                    <label>Product Type</label>
                    <select id="di_product_type"></select>
                </div>
                <div class="di-field">
                    <label>Relate To</label>
                    <input type="text" id="di_relate_to" disabled title="Drug relationship linking isn't available in this build">
                </div>
            </div>

            <div class="di-modal-section-title">Templates</div>
            <div class="di-table-wrap">
                <table class="di-templates-table">
                    <thead><tr><th>Name</th><th>Schedule</th><th>Interval</th><th>Basic Units</th><th>Refills</th><th>Standard</th><th></th></tr></thead>
                    <tbody id="diTemplatesBody"></tbody>
                </table>
            </div>
            <button type="button" class="di-btn secondary" id="diAddTemplateRowBtn" style="margin: 8px 0 4px;">+ Add Row</button>

            <div class="di-modal-section-title">Initial Lot</div>
            <div class="di-form-grid">
                <div class="di-field"><label>Lot Number</label><input type="text" id="di_lot_number" value="1"></div>
                <div class="di-field">
                    <label>Facility</label>
                    <select id="di_facility_id"><option value="">N/A</option></select>
                </div>
                <div class="di-field">
                    <label>Warehouse</label>
                    <select id="di_warehouse_id"></select>
                    <span class="form-error" id="err-di_warehouse_id"></span>
                </div>
                <div class="di-field"><label>Quantity On Hand</label><input type="number" step="0.001" id="di_quantity_on_hand" value="0"></div>
                <div class="di-field"><label>Expires</label><input type="date" id="di_expires_date"></div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="diCancelAddDrug">Cancel</button>
                <button class="login-btn" type="submit">Add Drug</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="diTransferModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Transfer Stock</h2>
            <button type="button" class="modal-close" id="diCloseTransferModal">&times;</button>
        </div>

        <div class="di-modal-readonly" id="diTransferSource"></div>

        <div id="diTransferAlert"></div>

        <form id="diTransferForm">
            <div class="di-form-grid">
                <div class="di-field">
                    <label>Destination Warehouse</label>
                    <select id="di_tran_warehouse_id"></select>
                    <span class="form-error" id="err-di_tran_warehouse_id"></span>
                </div>
                <div class="di-field">
                    <label>Destination Facility</label>
                    <select id="di_tran_facility_id"><option value="">N/A</option></select>
                </div>
                <div class="di-field"><label>Destination Lot Number</label><input type="text" id="di_tran_lot_number"></div>
                <div class="di-field">
                    <label>Quantity</label>
                    <input type="number" step="0.001" id="di_tran_quantity">
                    <span class="form-error" id="err-di_tran_quantity"></span>
                </div>
                <div class="di-field" style="grid-column:1 / -1;"><label>Notes</label><input type="text" id="di_tran_notes"></div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="diCancelTransfer">Cancel</button>
                <button class="login-btn" type="submit">Transfer</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="diDestroyModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Destroy Stock</h2>
            <button type="button" class="modal-close" id="diCloseDestroyModal">&times;</button>
        </div>

        <div class="di-modal-readonly" id="diDestroySource"></div>

        <div id="diDestroyAlert"></div>

        <form id="diDestroyForm">
            <div class="di-form-grid">
                <div class="di-field">
                    <label>Quantity</label>
                    <input type="number" step="0.001" id="di_destroy_quantity">
                    <span class="form-error" id="err-di_destroy_quantity"></span>
                </div>
                <div class="di-field"><label>Date Destroyed</label><input type="date" id="di_destroy_date"></div>
                <div class="di-field">
                    <label>Method</label>
                    <select id="di_destroy_method"></select>
                </div>
                <div class="di-field"><label>Witness</label><input type="text" id="di_destroy_witness"></div>
                <div class="di-field" style="grid-column:1 / -1;"><label>Notes</label><input type="text" id="di_destroy_notes"></div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="diCancelDestroy">Cancel</button>
                <button class="login-btn" type="submit">Destroy</button>
            </div>
        </form>
    </div>
</div>
    `;
}
