export function WarehousesView() {
    return `
<style>
.wh-page { width: 100%; font-size: 13.5px; }
.wh-page [hidden] { display: none !important; }

.wh-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.wh-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.wh-header p { margin: 0; font-size: 13px; color: var(--text-muted); max-width: 720px; }
.wh-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.wh-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.wh-btn:hover { background: var(--bg-surface-alt); }
.wh-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.wh-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.wh-btn.danger { border-color: #fca5a5; color: #b91c1c; background: transparent; }
.wh-btn.danger:hover { background: #fee2e2; }
:root[data-theme="dark"] .wh-btn.danger { color: #fca5a5; border-color: rgba(252,165,165,.5); }
:root[data-theme="dark"] .wh-btn.danger:hover { background: rgba(239,68,68,.15); }
.wh-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.wh-btn:disabled { opacity: .5; cursor: not-allowed; }

.wh-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.wh-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.wh-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.wh-stat span { font-size: 12px; color: var(--text-muted); }
.wh-stat.warn strong { color: #b45309; }
.wh-stat.bad strong { color: #b91c1c; }
:root[data-theme="dark"] .wh-stat.warn strong { color: #fcd34d; }
:root[data-theme="dark"] .wh-stat.bad strong { color: #fca5a5; }

.wh-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.wh-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.wh-table th {
    text-align: left; padding: 9px 12px; color: var(--text-muted); font-weight: 600; font-size: 10.5px; text-transform: uppercase;
    letter-spacing: .3px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap;
}
.wh-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.wh-table tbody tr:last-child td { border-bottom: none; }
.wh-table .num { text-align: right; white-space: nowrap; }
.wh-table tr.is-inactive td { opacity: .6; }
.wh-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.wh-name { font-weight: 700; }
.wh-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.wh-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); }

.wh-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.wh-badge.active { background: #dcfce7; color: #166534; }
.wh-badge.inactive { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.wh-badge.out { background: #fee2e2; color: #991b1b; }
.wh-badge.low { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
.wh-badge.ok { background: #dcfce7; color: #166534; }
.wh-badge.over { background: #e0f2fe; color: #075985; }
.wh-badge.no_level { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.wh-badge.missing { background: #fef3c7; color: #92400e; }
:root[data-theme="dark"] .wh-badge.active, :root[data-theme="dark"] .wh-badge.ok { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .wh-badge.out { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .wh-badge.low, :root[data-theme="dark"] .wh-badge.missing { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .wh-badge.over { background: rgba(14,165,233,.18); color: #bae6fd; }

/* Stock check */
.wh-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.wh-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px 20px; }
.wh-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.wh-info dd { margin: 2px 0 0; color: var(--text-primary); }
.wh-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.wh-toolbar select, .wh-toolbar input[type="text"] {
    height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color);
    background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit;
}
.wh-toolbar input[type="text"] { min-width: 220px; }
.wh-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-primary); }
.wh-level-input { width: 90px; height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); text-align: right; font-family: inherit; }
.wh-level-cell { white-space: nowrap; }
.wh-level-cell .form-error { display: block; white-space: normal; max-width: 220px; }
.wh-help { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
.wh-help strong { color: var(--text-primary); }

/* Form */
.wh-modal { max-width: 720px; }
.wh-section { border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px 6px; margin-bottom: 14px; }
.wh-section-title { margin: 0 0 10px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; }
.wh-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; margin-bottom: 10px; }
.wh-grid .span-2 { grid-column: 1 / -1; }
.wh-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.wh-field label .req { color: #dc2626; margin-left: 2px; }
.wh-field input, .wh-field select, .wh-field textarea {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.wh-field textarea { height: auto; min-height: 60px; padding: 8px 10px; resize: vertical; }
.wh-field .form-error { display: block; }
.wh-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.wh-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-color); }
.wh-footer-right { display: flex; gap: 8px; margin-left: auto; }
.wh-checkbox { display: inline-flex; align-items: center; gap: 6px; height: 34px; font-size: 13px; color: var(--text-primary); }

@media (max-width: 640px) {
    .wh-grid { grid-template-columns: 1fr; }
    .wh-toolbar input[type="text"] { min-width: 0; width: 100%; }
}
</style>

<div class="wh-page">

    <!-- List -->
    <div id="whListPanel">
        <div class="wh-header">
            <div>
                <h1>Storage Locations</h1>
                <p>Where stock is kept, which department owns it, who its custodian is (accountable for receiving and disposing of its stock), and the minimum stock each location should keep.</p>
            </div>
            <div class="wh-header-actions">
                <button type="button" class="wh-btn primary" id="whAddBtn">+ Add Storage Location</button>
            </div>
        </div>

        <div class="wh-stats">
            <div class="wh-stat"><strong id="whStatActive">0</strong><span>Active locations</span></div>
            <div class="wh-stat warn"><strong id="whStatNoCustodian">0</strong><span>Without a custodian</span></div>
            <div class="wh-stat bad"><strong id="whStatBelowMin">0</strong><span>Items below minimum (all locations)</span></div>
            <div class="wh-stat"><strong id="whStatNoLevels">0</strong><span>Locations with no minimum stock set</span></div>
        </div>

        <div id="whAlert"></div>
        <div id="whList"><div class="wh-empty">Loading...</div></div>
    </div>

    <!-- Stock check -->
    <div id="whStockPanel" hidden>
        <button type="button" class="wh-btn small" id="whBackBtn" style="margin-bottom:10px;">&larr; Back to storage locations</button>
        <div class="wh-header">
            <div>
                <h1 id="whStockTitle">Stock Check</h1>
                <p id="whStockSub"></p>
            </div>
            <div class="wh-header-actions">
                <button type="button" class="wh-btn" id="whStockEditBtn">Edit Location</button>
            </div>
        </div>

        <div class="wh-card"><dl class="wh-info" id="whStockInfo"></dl></div>

        <div class="wh-stats" id="whStockStats"></div>

        <div class="wh-help" id="whStockHelp">
            <strong>Minimum</strong> is the reorder point for this location: when what's on hand falls below it, the item shows as
            <span class="wh-badge low">Low</span> (or <span class="wh-badge out">Out</span> at zero).
            <strong>Maximum</strong> is optional; the suggested quantity tops the item back up to it. Quantities are in each item's dispensing unit (tablet, vial, piece...).
        </div>

        <div class="wh-toolbar">
            <input type="text" id="whStockSearch" placeholder="Search item...">
            <select id="whStockFilter">
                <option value="">All items</option>
                <option value="attention">Needs attention (out / low)</option>
                <option value="no_level">In stock, no minimum set</option>
                <option value="over">Over maximum</option>
            </select>
            <span style="flex:1;"></span>
            <select id="whAddLevel" aria-label="Set a minimum for another item"></select>
        </div>

        <div id="whStockList"></div>
    </div>
</div>

<div class="modal-overlay" id="whModalOverlay">
    <div class="modal-box wh-modal" role="dialog" aria-modal="true" aria-labelledby="whModalTitle">
        <div class="modal-header">
            <h2 id="whModalTitle">Add Storage Location</h2>
            <button type="button" class="modal-close" id="whCloseModal" aria-label="Close">&times;</button>
        </div>

        <div id="whFormAlert"></div>

        <form id="whForm" novalidate>
            <input type="hidden" id="wh_id">

            <div class="wh-section">
                <div class="wh-section-title">Location</div>
                <div class="wh-grid">
                    <div class="wh-field">
                        <label for="wh_name">Name<span class="req">*</span></label>
                        <input type="text" id="wh_name" maxlength="150" placeholder="e.g. Main Pharmacy">
                        <span class="form-error" id="err-wh_name"></span>
                    </div>
                    <div class="wh-field">
                        <label for="wh_code">Code</label>
                        <input type="text" id="wh_code" maxlength="30" placeholder="e.g. PHAR-MAIN">
                        <span class="form-error" id="err-wh_code"></span>
                    </div>
                    <div class="wh-field">
                        <label for="wh_location_type">Type</label>
                        <select id="wh_location_type"></select>
                        <span class="form-error" id="err-wh_location_type"></span>
                    </div>
                    <div class="wh-field">
                        <label for="wh_facility_id">Facility</label>
                        <select id="wh_facility_id"><option value="">N/A</option></select>
                    </div>
                    <div class="wh-field span-2">
                        <label for="wh_physical_location">Where it is</label>
                        <input type="text" id="wh_physical_location" maxlength="255" placeholder="e.g. Ground floor, Room 104, beside the ER">
                    </div>
                </div>
            </div>

            <div class="wh-section">
                <div class="wh-section-title">Ownership &amp; Custodian</div>
                <div class="wh-grid">
                    <div class="wh-field span-2">
                        <label for="wh_department_id">Department</label>
                        <select id="wh_department_id"></select>
                        <span class="wh-hint">The department this stock belongs to.</span>
                        <span class="form-error" id="err-wh_department_id"></span>
                    </div>
                    <div class="wh-field">
                        <label for="wh_custodian_user_id">Custodian</label>
                        <select id="wh_custodian_user_id"></select>
                        <span class="wh-hint">Accountable for receiving stock into this location and for disposing of expired or damaged stock.</span>
                        <span class="form-error" id="err-wh_custodian_user_id"></span>
                    </div>
                    <div class="wh-field">
                        <label for="wh_alternate_custodian_user_id">Alternate Custodian</label>
                        <select id="wh_alternate_custodian_user_id"></select>
                        <span class="wh-hint">Covers when the custodian is off duty or on leave.</span>
                        <span class="form-error" id="err-wh_alternate_custodian_user_id"></span>
                    </div>
                </div>
            </div>

            <div class="wh-grid">
                <div class="wh-field span-2">
                    <label for="wh_notes">Notes</label>
                    <textarea id="wh_notes" maxlength="2000" rows="2" placeholder="e.g. Refrigerated 2-8 &deg;C; key kept at the nurse station"></textarea>
                </div>
            </div>

            <div class="wh-footer">
                <label class="wh-checkbox" id="whActiveRow" hidden><input type="checkbox" id="wh_is_active"> Active</label>
                <div class="wh-footer-right">
                    <button type="button" class="wh-btn" id="whCancelBtn">Cancel</button>
                    <button type="submit" class="wh-btn primary" id="whSaveBtn">Save</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="whConfirmOverlay">
    <div class="modal-box" style="max-width: 460px;" role="dialog" aria-modal="true" aria-labelledby="whConfirmTitle">
        <div class="modal-header">
            <h2 id="whConfirmTitle">Are you sure?</h2>
            <button type="button" class="modal-close" id="whConfirmClose" aria-label="Close">&times;</button>
        </div>
        <div id="whConfirmBody" style="font-size:13.5px;color:var(--text-primary);"></div>
        <div class="wh-footer" style="margin-top:12px;">
            <div class="wh-footer-right">
                <button type="button" class="wh-btn" id="whConfirmCancel">Go Back</button>
                <button type="button" class="wh-btn danger" id="whConfirmOk">Delete</button>
            </div>
        </div>
    </div>
</div>
    `;
}
