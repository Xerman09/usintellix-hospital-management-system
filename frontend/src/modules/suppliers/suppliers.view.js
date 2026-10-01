export function SuppliersView() {
    return `
<style>
.sp-page { width: 100%; font-size: 13.5px; }

.sp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.sp-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.sp-header p { margin: 0; color: var(--text-muted); font-size: 13px; }
.sp-header-actions { display: flex; flex-wrap: wrap; gap: 8px; }

.sp-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer;
}
.sp-btn:hover { background: var(--bg-surface-alt); }
.sp-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.sp-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.sp-btn:disabled { opacity: .5; cursor: not-allowed; }
.sp-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }

.sp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.sp-stat {
    display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; text-align: left;
    border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface);
    cursor: pointer; font: inherit; color: inherit;
}
.sp-stat:hover { border-color: var(--accent); }
.sp-stat.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-light); }
.sp-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.sp-stat span { font-size: 12px; color: var(--text-muted); }
.sp-stat.warn strong { color: #b45309; }
.sp-stat.bad strong { color: #b91c1c; }
:root[data-theme="dark"] .sp-stat.warn strong { color: #fcd34d; }
:root[data-theme="dark"] .sp-stat.bad strong { color: #fca5a5; }

.sp-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; }
.sp-filters input[type="text"], .sp-filters select {
    height: 32px; padding: 0 10px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px;
}
.sp-filters input[type="text"] { min-width: 260px; }
.sp-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-primary); white-space: nowrap; }
.sp-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.sp-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.sp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sp-table th {
    text-align: left; padding: 9px 12px; white-space: nowrap;
    background: var(--bg-surface-alt); color: var(--text-muted);
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px;
    border-bottom: 1px solid var(--border-color);
}
.sp-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.sp-table tbody tr:last-child td { border-bottom: none; }
.sp-table tbody tr:hover td { background: var(--bg-surface-alt); }
.sp-name { color: var(--accent); font-weight: 600; cursor: pointer; background: none; border: none; padding: 0; font: inherit; text-align: left; }
:root[data-theme="dark"] .sp-name { color: var(--accent-text); }
.sp-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.sp-sub a { color: inherit; }
.sp-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-style: italic; }

.sp-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.sp-chip {
    display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
    background: var(--bg-surface-alt); color: var(--text-primary); border: 1px solid var(--border-color); white-space: nowrap;
}
.sp-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sp-badge.valid { background: #dcfce7; color: #166534; }
.sp-badge.expiring { background: #fef3c7; color: #92400e; }
.sp-badge.expired { background: #fee2e2; color: #b91c1c; }
.sp-badge.none, .sp-badge.inactive { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.sp-badge.preferred { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
:root[data-theme="dark"] .sp-badge.valid { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .sp-badge.expiring { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .sp-badge.expired { background: rgba(239,68,68,.2); color: #fecaca; }

.sp-modal { max-width: 900px; }
.sp-section { border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px 6px; margin-bottom: 14px; }
.sp-section-title { margin: 0 0 10px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; }
.sp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; margin-bottom: 10px; }
.sp-grid .span-2 { grid-column: span 2; }
.sp-grid .span-3 { grid-column: 1 / -1; }
.sp-field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.sp-field label .req { color: #dc2626; margin-left: 2px; }
.sp-field input, .sp-field select, .sp-field textarea {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.sp-field textarea { height: auto; min-height: 70px; padding: 8px 10px; resize: vertical; }
.sp-field .form-error { display: block; }
.sp-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.sp-toggle-group { display: flex; flex-wrap: wrap; gap: 6px; }
.sp-toggle { position: relative; }
.sp-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.sp-toggle span {
    display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 999px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-size: 12.5px; font-weight: 600; cursor: pointer; user-select: none;
}
.sp-toggle input:checked + span { background: var(--accent-light); border-color: var(--accent); color: var(--accent-text, var(--accent)); }
.sp-toggle input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

.sp-items-wrap { max-height: 240px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; }
.sp-items-wrap .sp-table th { position: sticky; top: 0; }

.sp-modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-color); }
.sp-footer-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.sp-delete-btn { height: 36px; padding: 0 14px; border-radius: 6px; border: 1px solid #fca5a5; background: transparent; color: #b91c1c; font-weight: 600; cursor: pointer; }
.sp-delete-btn:hover { background: #fee2e2; }
:root[data-theme="dark"] .sp-delete-btn { color: #fca5a5; border-color: rgba(252,165,165,.5); }
:root[data-theme="dark"] .sp-delete-btn:hover { background: rgba(239,68,68,.15); }

@media (max-width: 760px) {
    .sp-grid { grid-template-columns: 1fr; }
    .sp-grid .span-2 { grid-column: auto; }
    .sp-filters input[type="text"] { min-width: 0; width: 100%; }
    .sp-count { margin-left: 0; }
}
</style>

<div class="sp-page">
    <div class="sp-header">
        <div>
            <h1>Suppliers</h1>
            <p>Companies you buy medicines, supplies, vaccines and equipment from.</p>
        </div>
        <div class="sp-header-actions">
            <button type="button" class="sp-btn" id="spTemplateBtn" title="Blank CSV with the import columns and one example row">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Template
            </button>
            <button type="button" class="sp-btn" id="spImportBtn">Import CSV</button>
            <button type="button" class="sp-btn primary" id="spAddBtn">+ Add Supplier</button>
        </div>
    </div>

    <div class="sp-stats">
        <button type="button" class="sp-stat" data-sp-stat="all"><strong id="spStatActive">0</strong><span>Active suppliers</span></button>
        <button type="button" class="sp-stat warn" data-sp-stat="expiring"><strong id="spStatExpiring">0</strong><span>FDA license expiring soon</span></button>
        <button type="button" class="sp-stat bad" data-sp-stat="expired"><strong id="spStatExpired">0</strong><span>FDA license expired</span></button>
        <button type="button" class="sp-stat" data-sp-stat="none"><strong id="spStatNone">0</strong><span>No license on file</span></button>
    </div>

    <div class="sp-filters">
        <input type="text" id="spSearch" placeholder="Search name, code, contact, email, TIN, city...">
        <select id="spTypeFilter"><option value="">All types</option></select>
        <select id="spSuppliesFilter"><option value="">Supplies anything</option></select>
        <select id="spLicenseFilter">
            <option value="">Any license status</option>
            <option value="valid">License valid</option>
            <option value="expiring">Expiring soon</option>
            <option value="expired">Expired</option>
            <option value="none">No license on file</option>
        </select>
        <label class="sp-check"><input type="checkbox" id="spShowInactive"> Show inactive</label>
        <span class="sp-count" id="spCount"></span>
    </div>

    <div class="sp-table-wrap">
        <table class="sp-table">
            <thead>
                <tr><th>Supplier</th><th>Supplies</th><th>Contact</th><th>Location</th><th>FDA License (LTO)</th><th>Terms</th><th>Deliveries</th><th></th></tr>
            </thead>
            <tbody id="spBody"><tr><td colspan="8" class="sp-empty">Loading...</td></tr></tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="spModalOverlay">
    <div class="modal-box sp-modal">
        <div class="modal-header">
            <h2 id="spModalTitle">Add Supplier</h2>
            <button type="button" class="modal-close" id="spCloseModal" aria-label="Close">&times;</button>
        </div>

        <div id="spAlert"></div>

        <form id="spForm" novalidate>
            <div class="sp-section">
                <div class="sp-section-title">Company</div>
                <div class="sp-grid">
                    <div class="sp-field span-2">
                        <label for="sp_name">Supplier Name<span class="req">*</span></label>
                        <input type="text" id="sp_name" maxlength="255" placeholder="e.g. Zuellig Pharma Corporation">
                        <span class="form-error" id="err-sp_name"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_supplier_type">Type<span class="req">*</span></label>
                        <select id="sp_supplier_type"></select>
                        <span class="form-error" id="err-sp_supplier_type"></span>
                    </div>
                    <div class="sp-field span-3">
                        <label>Supplies</label>
                        <div class="sp-toggle-group" id="spProductTypes"></div>
                        <span class="form-error" id="err-sp_product_types"></span>
                    </div>
                </div>
            </div>

            <div class="sp-section">
                <div class="sp-section-title">Contact</div>
                <div class="sp-grid">
                    <div class="sp-field">
                        <label for="sp_contact_person">Contact Person</label>
                        <input type="text" id="sp_contact_person" maxlength="150">
                    </div>
                    <div class="sp-field">
                        <label for="sp_phone">Phone</label>
                        <input type="tel" id="sp_phone" maxlength="50" placeholder="(02) 8123 4567">
                        <span class="form-error" id="err-sp_phone"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_mobile">Mobile</label>
                        <input type="tel" id="sp_mobile" maxlength="50" placeholder="0917 123 4567">
                        <span class="form-error" id="err-sp_mobile"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_email">Email</label>
                        <input type="email" id="sp_email" maxlength="150">
                        <span class="form-error" id="err-sp_email"></span>
                    </div>
                    <div class="sp-field span-2">
                        <label for="sp_website">Website</label>
                        <input type="text" id="sp_website" maxlength="255" placeholder="www.example.com">
                        <span class="form-error" id="err-sp_website"></span>
                    </div>
                </div>
            </div>

            <div class="sp-section">
                <div class="sp-section-title">Address</div>
                <div class="sp-grid">
                    <div class="sp-field span-3">
                        <label for="sp_address_line">Street / Building</label>
                        <input type="text" id="sp_address_line" maxlength="255">
                    </div>
                    <div class="sp-field">
                        <label for="sp_city">City / Municipality</label>
                        <input type="text" id="sp_city" maxlength="100">
                    </div>
                    <div class="sp-field">
                        <label for="sp_province">Province</label>
                        <input type="text" id="sp_province" maxlength="100">
                    </div>
                    <div class="sp-field">
                        <label for="sp_postal_code">ZIP Code</label>
                        <input type="text" id="sp_postal_code" maxlength="20">
                    </div>
                    <div class="sp-field">
                        <label for="sp_country">Country</label>
                        <input type="text" id="sp_country" maxlength="100" value="Philippines">
                    </div>
                </div>
            </div>

            <div class="sp-section">
                <div class="sp-section-title">Regulatory &amp; Terms</div>
                <div class="sp-grid">
                    <div class="sp-field">
                        <label for="sp_tin">TIN</label>
                        <input type="text" id="sp_tin" maxlength="20" placeholder="123-456-789-000">
                        <span class="form-error" id="err-sp_tin"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_fda_license_number">FDA License to Operate No.</label>
                        <input type="text" id="sp_fda_license_number" maxlength="100">
                        <span class="form-error" id="err-sp_fda_license_number"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_license_expiry">LTO Expiry</label>
                        <input type="date" id="sp_license_expiry">
                        <span class="sp-hint" id="spLicenseHint"></span>
                        <span class="form-error" id="err-sp_license_expiry"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_payment_terms">Payment Terms</label>
                        <select id="sp_payment_terms"></select>
                        <span class="form-error" id="err-sp_payment_terms"></span>
                    </div>
                    <div class="sp-field">
                        <label for="sp_lead_time_days">Lead Time (days)</label>
                        <input type="number" id="sp_lead_time_days" min="0" max="365" step="1">
                        <span class="sp-hint">Usual days from order to delivery</span>
                        <span class="form-error" id="err-sp_lead_time_days"></span>
                    </div>
                    <div class="sp-field">
                        <label>Status</label>
                        <label class="sp-check" style="height:34px;"><input type="checkbox" id="sp_is_active" checked> Active supplier</label>
                    </div>
                    <div class="sp-field span-3">
                        <label for="sp_notes">Notes</label>
                        <textarea id="sp_notes" placeholder="Account number, ordering instructions, delivery days..."></textarea>
                    </div>
                </div>
            </div>

            <div class="sp-section" id="spItemsSection" hidden>
                <div class="sp-section-title">Items Supplied</div>
                <div class="sp-items-wrap">
                    <table class="sp-table">
                        <thead><tr><th>Item</th><th>Deliveries</th><th>Total Received</th><th>Last Received</th><th>Last Cost</th></tr></thead>
                        <tbody id="spItemsBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="sp-modal-footer">
                <button type="button" class="sp-delete-btn" id="spDeleteBtn" hidden>Delete Supplier</button>
                <div class="sp-footer-right">
                    <button type="button" class="sp-btn" id="spCancel">Cancel</button>
                    <button type="submit" class="sp-btn primary" id="spSaveBtn">Add Supplier</button>
                </div>
            </div>
        </form>
    </div>
</div>
    `;
}
