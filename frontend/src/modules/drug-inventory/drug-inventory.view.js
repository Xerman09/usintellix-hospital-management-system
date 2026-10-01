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

.di-modal-wide { max-width: 980px; }

.di-view-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-surface-alt);
    margin-bottom: 14px;
}

.di-view-tab {
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.di-view-tab.active {
    background: var(--bg-surface);
    color: var(--accent-text, var(--accent));
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

.di-panel { display: none; }
.di-panel.active { display: block; }

.di-toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }

.di-filters input[type="text"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
    min-width: 220px;
}

.di-sub { display: block; font-size: 11.5px; color: var(--text-muted); font-weight: 400; margin-top: 2px; white-space: normal; }

.di-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

.di-badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .2px;
    border: 1px solid transparent;
    white-space: nowrap;
}

.di-badge.rx { background: #e0e7ff; color: #3730a3; }
.di-badge.otc { background: #dcfce7; color: #166534; }
.di-badge.dd { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
.di-badge.alert { background: #fee2e2; color: #b91c1c; }
.di-badge.lasa { background: #fae8ff; color: #86198f; }
.di-badge.cold { background: #e0f2fe; color: #075985; }
.di-badge.low { background: #fee2e2; color: #b91c1c; }
.di-badge.out,
.di-badge.inactive { background: var(--bg-surface-alt); color: var(--text-muted); border-color: var(--border-color); }

:root[data-theme="dark"] .di-badge.rx { background: rgba(99,102,241,.2); color: #c7d2fe; }
:root[data-theme="dark"] .di-badge.otc { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .di-badge.dd { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .di-badge.alert,
:root[data-theme="dark"] .di-badge.low { background: rgba(239,68,68,.2); color: #fecaca; }
:root[data-theme="dark"] .di-badge.lasa { background: rgba(217,70,239,.18); color: #f5d0fe; }
:root[data-theme="dark"] .di-badge.cold { background: rgba(14,165,233,.18); color: #bae6fd; }

:root[data-theme="dark"] .di-drug-name,
:root[data-theme="dark"] .di-advanced summary { color: var(--accent-text, var(--accent)); }

.di-expiring { color: #b45309; font-weight: 600; }
:root[data-theme="dark"] .di-expiring { color: #fcd34d; }

.di-row-actions { display: flex; gap: 6px; }

.di-section {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px 16px 4px;
    margin-bottom: 14px;
}

.di-section > .di-modal-section-title { margin-top: 0; }

.di-form-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }

.di-field .di-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.di-field label .di-req { color: #dc2626; margin-left: 2px; }

.di-name-preview {
    background: var(--bg-surface-alt);
    border: 1px dashed var(--border-color);
    border-radius: 6px;
    padding: 9px 12px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 12px;
}

.di-name-preview strong { color: var(--text-primary); }

.di-dup-warning {
    display: none;
    margin-bottom: 12px;
    padding: 9px 12px;
    border-radius: 6px;
    border: 1px solid #f59e0b;
    background: #fffbeb;
    color: #92400e;
    font-size: 12.5px;
}

.di-dup-warning.show { display: block; }
:root[data-theme="dark"] .di-dup-warning { background: rgba(245,158,11,.12); color: #fde68a; border-color: rgba(245,158,11,.5); }

.di-advanced summary {
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 10px;
}

.di-qty-row { display: flex; gap: 8px; }
.di-qty-row input { flex: 1 1 auto; }
.di-qty-row select { flex: 0 0 48%; }

.di-modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 6px;
}

.di-modal-footer .form-actions { margin: 0; }

.di-delete-btn {
    height: 38px;
    padding: 0 16px;
    border-radius: 6px;
    border: 1px solid #fca5a5;
    background: transparent;
    color: #b91c1c;
    font-weight: 600;
    cursor: pointer;
}

.di-delete-btn:hover { background: #fee2e2; }
:root[data-theme="dark"] .di-delete-btn { color: #fca5a5; border-color: rgba(252,165,165,.5); }
:root[data-theme="dark"] .di-delete-btn:hover { background: rgba(239,68,68,.15); }

.di-import-results { margin-top: 12px; max-height: 260px; overflow-y: auto; font-size: 12.5px; padding-left: 18px; }
.di-import-results li { margin-bottom: 4px; color: var(--text-primary); }
.di-import-results .di-sub { display: inline; }

.di-field input[type="file"] { height: auto; padding: 6px 10px; }

@media (max-width: 720px) {
    .di-form-grid, .di-form-grid.cols-3 { grid-template-columns: 1fr; }
    .di-filters input[type="text"] { min-width: 0; width: 100%; }
}
</style>

<div class="di-page">
    <div class="di-toolbar">
        <h1>Drug Inventory</h1>
        <div class="di-toolbar-actions">
            <button type="button" class="di-btn" id="diImportBtn">Import CSV</button>
            <button type="button" class="di-btn" id="diReceiveBtn">Receive Stock</button>
            <button type="button" class="di-btn primary" id="diAddDrugBtn">+ Register Drug</button>
        </div>
    </div>

    <div class="di-view-tabs" role="tablist">
        <button type="button" class="di-view-tab active" data-di-view="catalog" role="tab">Drug Catalog</button>
        <button type="button" class="di-view-tab" data-di-view="stock" role="tab">Stock on Hand</button>
    </div>

    <div class="di-panel active" id="diCatalogPanel">
        <div class="di-list-bar">
            <div class="di-filters">
                <input type="text" id="diCatalogSearch" placeholder="Search name, brand, reg. no., barcode...">
                <select id="diCategoryFilter"><option value="">All Categories</option></select>
                <select id="diCatalogTypeFilter"><option value="">All Product Types</option></select>
                <label class="di-checkbox-label"><input type="checkbox" id="diLowStockOnly"> Low / out of stock only</label>
                <label class="di-checkbox-label"><input type="checkbox" id="diCatalogShowInactive"> Show inactive</label>
            </div>
            <div class="di-footer-info" id="diCatalogCount"></div>
        </div>

        <div class="di-table-wrap">
            <table class="di-table">
                <thead>
                    <tr>
                        <th>Drug</th><th>Category</th><th>Route</th><th>Stock</th><th>Next Expiry</th><th>Price</th><th></th>
                    </tr>
                </thead>
                <tbody id="diCatalogBody"><tr><td colspan="7" class="di-empty-state">Loading...</td></tr></tbody>
            </table>
        </div>
    </div>

    <div class="di-panel" id="diStockPanel">
        <div class="di-toolbar" style="margin-bottom:10px;">
            <div class="di-filters">
                <select id="diFacilityFilter"><option value="">-- All Facilities --</option></select>
                <select id="diWarehouseFilter"><option value="">All Warehouses</option></select>
                <select id="diProductTypeFilter"><option value="">All Product Types</option></select>
                <label class="di-checkbox-label"><input type="checkbox" id="diShowEmptyLots"> Show empty lots</label>
                <label class="di-checkbox-label"><input type="checkbox" id="diShowInactive"> Show inactive</label>
                <button type="button" class="di-btn" id="diRefreshBtn">Refresh</button>
            </div>
        </div>

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
                        <th>Name</th><th>Form</th><th>Lot</th><th>Facility</th><th>Warehouse</th><th>QOH</th><th>Expires</th><th>Tran</th><th>Destroy</th>
                    </tr>
                </thead>
                <tbody id="diTableBody"><tr><td colspan="9" class="di-empty-state">Loading...</td></tr></tbody>
            </table>
        </div>

        <div class="di-footer-bar">
            <div class="di-footer-info" id="diFooterInfo"></div>
            <div class="di-pagination" id="diPagination"></div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="diAddDrugModalOverlay">
    <div class="modal-box di-modal-wide">
        <div class="modal-header">
            <h2 id="diDrugModalTitle">Register Drug</h2>
            <button type="button" class="modal-close" id="diCloseAddDrugModal">&times;</button>
        </div>

        <div id="diAddDrugAlert"></div>

        <form id="diAddDrugForm" novalidate>
            <input type="hidden" id="di_drug_id">

            <div class="di-section">
                <div class="di-modal-section-title">Identification</div>
                <div class="di-form-grid cols-3">
                    <div class="di-field">
                        <label>Product Type<span class="di-req">*</span></label>
                        <select id="di_product_type"></select>
                        <span class="form-error" id="err-di_product_type"></span>
                    </div>
                    <div class="di-field">
                        <label><span id="di_generic_label">Generic Name</span><span class="di-req">*</span></label>
                        <input type="text" id="di_generic_name" maxlength="255" placeholder="e.g. Paracetamol">
                        <span class="form-error" id="err-di_generic_name"></span>
                    </div>
                    <div class="di-field">
                        <label>Brand Name</label>
                        <input type="text" id="di_brand_name" maxlength="255" placeholder="e.g. Biogesic">
                        <span class="form-error" id="err-di_brand_name"></span>
                    </div>
                    <div class="di-field">
                        <label>Strength<span class="di-req" id="di_strength_req">*</span></label>
                        <input type="text" id="di_strength" maxlength="100" placeholder="e.g. 500 mg or 250 mg/5 mL">
                        <span class="form-error" id="err-di_strength"></span>
                    </div>
                    <div class="di-field">
                        <label>Dosage Form<span class="di-req" id="di_form_req">*</span></label>
                        <select id="di_dosage_form_id"></select>
                        <span class="form-error" id="err-di_dosage_form_id"></span>
                    </div>
                    <div class="di-field">
                        <label>Route</label>
                        <select id="di_route_id"></select>
                        <span class="form-error" id="err-di_route_id"></span>
                    </div>
                    <div class="di-field">
                        <label>Therapeutic Category</label>
                        <select id="di_category_id"></select>
                        <span class="form-error" id="err-di_category_id"></span>
                    </div>
                    <div class="di-field">
                        <label>Manufacturer</label>
                        <input type="text" id="di_manufacturer" maxlength="255">
                    </div>
                </div>

                <div class="di-name-preview">Will be listed as: <strong id="diNamePreview">&mdash;</strong></div>
                <div class="di-dup-warning" id="diDupWarning"></div>
            </div>

            <div class="di-section">
                <div class="di-modal-section-title">Regulatory &amp; Safety</div>
                <div class="di-form-grid cols-3">
                    <div class="di-field">
                        <label>FDA PH Registration No.</label>
                        <input type="text" id="di_registration_number" maxlength="50" placeholder="e.g. DR-XY12345">
                        <span class="form-error" id="err-di_registration_number"></span>
                    </div>
                    <div class="di-field">
                        <label>Barcode</label>
                        <input type="text" id="di_barcode" maxlength="100">
                        <span class="form-error" id="err-di_barcode"></span>
                    </div>
                    <div class="di-field">
                        <label>Controlled-Drug Class</label>
                        <select id="di_controlled_class"></select>
                        <span class="form-error" id="err-di_controlled_class"></span>
                    </div>
                    <div class="di-field">
                        <label>Storage</label>
                        <select id="di_storage_condition"></select>
                        <span class="form-error" id="err-di_storage_condition"></span>
                    </div>
                </div>

                <div class="di-inline-checkboxes">
                    <label class="di-checkbox-label"><input type="checkbox" id="di_requires_prescription" checked> Prescription required (Rx)</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_is_high_alert"> High-alert medication</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_is_lasa"> Look-alike / sound-alike (LASA)</label>
                </div>

                <details class="di-advanced">
                    <summary>International codes (optional)</summary>
                    <div class="di-form-grid">
                        <div class="di-field">
                            <label>NDC Number</label>
                            <input type="text" id="di_ndc" maxlength="50">
                            <span class="form-error" id="err-di_ndc"></span>
                        </div>
                        <div class="di-field"><label>RXCUI Code</label><input type="text" id="di_rxcui" maxlength="50"></div>
                    </div>
                </details>
            </div>

            <div class="di-section">
                <div class="di-modal-section-title">Units, Stock Levels &amp; Pricing</div>
                <div class="di-form-grid cols-3">
                    <div class="di-field">
                        <label>Dispensing Unit<span class="di-req" id="di_unit_req">*</span></label>
                        <select id="di_dispensing_unit_id"></select>
                        <span class="di-hint">The unit you count and dispense, e.g. tablet</span>
                        <span class="form-error" id="err-di_dispensing_unit_id"></span>
                    </div>
                    <div class="di-field">
                        <label>Package Unit</label>
                        <select id="di_package_unit_id"></select>
                        <span class="di-hint">How it is bought, e.g. box</span>
                        <span class="form-error" id="err-di_package_unit_id"></span>
                    </div>
                    <div class="di-field">
                        <label>Units per Package</label>
                        <input type="number" min="0" step="0.001" id="di_package_quantity">
                        <span class="di-hint" id="diPackageHint">&nbsp;</span>
                        <span class="form-error" id="err-di_package_quantity"></span>
                    </div>
                    <div class="di-field">
                        <label>Reorder Level</label>
                        <input type="number" min="0" step="0.001" id="di_min_level_global" value="0">
                        <span class="di-hint">Flag as low stock at or below this</span>
                        <span class="form-error" id="err-di_min_level_global"></span>
                    </div>
                    <div class="di-field">
                        <label>Maximum Stock</label>
                        <input type="number" min="0" step="0.001" id="di_max_level_global" value="0">
                        <span class="di-hint">0 = no limit</span>
                        <span class="form-error" id="err-di_max_level_global"></span>
                    </div>
                    <div class="di-field">
                        <label>On Order</label>
                        <input type="number" min="0" step="0.001" id="di_on_order" value="0">
                        <span class="form-error" id="err-di_on_order"></span>
                    </div>
                    <div class="di-field">
                        <label>Unit Cost (&#8369;)</label>
                        <input type="number" min="0" step="0.01" id="di_unit_cost">
                        <span class="form-error" id="err-di_unit_cost"></span>
                    </div>
                    <div class="di-field">
                        <label>Selling Price (&#8369;)</label>
                        <input type="number" min="0" step="0.01" id="di_selling_price">
                        <span class="form-error" id="err-di_selling_price"></span>
                    </div>
                </div>

                <div class="di-inline-checkboxes">
                    <label class="di-checkbox-label"><input type="checkbox" id="di_is_active" checked> Active</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_allow_inventory" checked> Track inventory</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_allow_multiple_lots" checked> Allow multiple lots</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_allow_combining_lots"> Allow combining lots</label>
                    <label class="di-checkbox-label"><input type="checkbox" id="di_is_consumable"> Consumable</label>
                </div>
                <span class="form-error" id="err-di_allow_multiple_lots" style="display:block;margin:-6px 0 10px;"></span>
            </div>

            <div class="di-modal-section-title">Prescription Templates</div>
            <div class="di-table-wrap">
                <table class="di-templates-table">
                    <thead><tr><th>Name</th><th>Schedule</th><th>Interval</th><th>Basic Units</th><th>Refills</th><th>Standard</th><th></th></tr></thead>
                    <tbody id="diTemplatesBody"></tbody>
                </table>
            </div>
            <button type="button" class="di-btn secondary" id="diAddTemplateRowBtn" style="margin: 8px 0 14px;">+ Add Row</button>

            <div class="di-modal-footer">
                <div><button type="button" class="di-delete-btn" id="diDeleteDrugBtn" style="display:none;">Delete Drug</button></div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="diCancelAddDrug">Cancel</button>
                    <button class="login-btn" type="submit" id="diSaveDrugBtn">Register Drug</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="diReceiveModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Receive Stock</h2>
            <button type="button" class="modal-close" id="diCloseReceiveModal">&times;</button>
        </div>

        <div id="diReceiveAlert"></div>

        <form id="diReceiveForm" novalidate>
            <div class="di-field" style="margin-bottom:12px;">
                <label>Drug<span class="di-req">*</span></label>
                <select id="di_rcv_drug_id"></select>
                <span class="form-error" id="err-di_rcv_drug_id"></span>
            </div>

            <div class="di-form-grid">
                <div class="di-field">
                    <label>Lot / Batch No.<span class="di-req" id="di_rcv_lot_req">*</span></label>
                    <input type="text" id="di_rcv_lot_number" maxlength="100">
                    <span class="form-error" id="err-di_rcv_lot_number"></span>
                </div>
                <div class="di-field">
                    <label>Expiry Date<span class="di-req" id="di_rcv_exp_req">*</span></label>
                    <input type="date" id="di_rcv_expires_date">
                    <span class="form-error" id="err-di_rcv_expires_date"></span>
                </div>
                <div class="di-field">
                    <label>Warehouse<span class="di-req">*</span></label>
                    <select id="di_rcv_warehouse_id"></select>
                    <span class="form-error" id="err-di_rcv_warehouse_id"></span>
                </div>
                <div class="di-field">
                    <label>Facility</label>
                    <select id="di_rcv_facility_id"><option value="">N/A</option></select>
                </div>
                <div class="di-field">
                    <label>Quantity<span class="di-req">*</span></label>
                    <div class="di-qty-row">
                        <input type="number" min="0" step="0.001" id="di_rcv_quantity">
                        <select id="di_rcv_quantity_in"></select>
                    </div>
                    <span class="di-hint" id="diReceiveTotal">&nbsp;</span>
                    <span class="form-error" id="err-di_rcv_quantity"></span>
                </div>
                <div class="di-field">
                    <label>Date Received</label>
                    <input type="date" id="di_rcv_received_date">
                    <span class="form-error" id="err-di_rcv_received_date"></span>
                </div>
                <div class="di-field">
                    <label>Supplier</label>
                    <input type="text" id="di_rcv_supplier" maxlength="255">
                </div>
                <div class="di-field">
                    <label>Invoice / PO No.</label>
                    <input type="text" id="di_rcv_invoice_number" maxlength="100">
                </div>
                <div class="di-field">
                    <label>Unit Cost (&#8369; per dispensing unit)</label>
                    <input type="number" min="0" step="0.01" id="di_rcv_unit_cost">
                    <span class="form-error" id="err-di_rcv_unit_cost"></span>
                </div>
                <div class="di-field">
                    <label>Notes</label>
                    <input type="text" id="di_rcv_notes" maxlength="255">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="diCancelReceive">Cancel</button>
                <button class="login-btn" type="submit">Receive</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="diImportModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Import Drugs from CSV</h2>
            <button type="button" class="modal-close" id="diCloseImportModal">&times;</button>
        </div>

        <div id="diImportAlert"></div>

        <p class="form-subtitle" style="margin-top:0;">
            One drug per row. Dosage form, route, units and category must match names already in their lists
            (e.g. <em>Tablet</em>, <em>Oral</em>, <em>tablet</em>, <em>box</em>). Yes/No columns accept yes/no or 1/0.
            Duplicates and invalid rows are skipped and listed below.
        </p>
        <p><a href="#" id="diDownloadTemplate">Download CSV template</a></p>

        <div class="di-field" style="margin-bottom:12px;">
            <label>CSV File</label>
            <input type="file" id="di_import_file" accept=".csv,text/csv">
            <span class="di-hint" id="diImportSummary">&nbsp;</span>
        </div>

        <ul class="di-import-results" id="diImportResults"></ul>

        <div class="form-actions">
            <button type="button" class="btn-secondary" id="diCancelImport">Close</button>
            <button type="button" class="login-btn" id="diRunImport" disabled>Import</button>
        </div>
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
