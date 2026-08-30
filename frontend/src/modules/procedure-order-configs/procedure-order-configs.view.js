export function ProcedureOrderConfigsView()
{
    return `
<style>
.poc-page {
    width: 100%;
}

.poc-card {
    width: 100%;
}

.poc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.poc-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.poc-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
}

.poc-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.poc-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.poc-header .form-subtitle {
    margin: 0;
    max-width: 520px;
}

.poc-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.poc-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.poc-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.poc-add-btn svg {
    width: 16px;
    height: 16px;
}

.poc-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 18px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    color: #34435c;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: .15s;
    white-space: nowrap;
}

.poc-refresh-btn:hover {
    border-color: var(--accent-border);
    background: var(--accent-light);
    color: var(--accent-text);
}

.poc-refresh-btn svg {
    width: 15px;
    height: 15px;
}

.poc-stat-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 24px 0 16px;
}

.poc-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.poc-stat-pill svg {
    width: 14px;
    height: 14px;
}

.poc-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.poc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.poc-table th {
    text-align: left;
    padding: 14px 18px;
    color: #71809b;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.poc-table td {
    padding: 12px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.poc-table tbody tr:last-child td {
    border-bottom: none;
}

.poc-table tbody tr:hover {
    background: #fafbff;
}

.poc-name-cell {
    display: flex;
    align-items: center;
    gap: 6px;
}

.poc-toggle {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: #a2aec4;
    cursor: pointer;
    padding: 0;
}

.poc-toggle svg {
    width: 12px;
    height: 12px;
    transition: transform .15s;
}

.poc-toggle.expanded svg {
    transform: rotate(90deg);
}

.poc-toggle-spacer {
    flex-shrink: 0;
    width: 18px;
}

.poc-name {
    font-weight: 600;
    color: #1a2338;
}

.poc-name--selectable {
    cursor: pointer;
}

.poc-name--selectable:hover {
    color: var(--accent);
    text-decoration: underline;
}

.poc-muted {
    color: #71809b;
}

.poc-muted.empty {
    font-style: italic;
    color: #a2aec4;
}

.poc-row-actions {
    display: flex;
    gap: 8px;
}

.poc-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    padding: 6px 11px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
    white-space: nowrap;
}

.poc-icon-btn svg {
    width: 13px;
    height: 13px;
}

.poc-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.poc-icon-btn.edit:hover {
    background: var(--accent-border);
}

.poc-icon-btn.add-child {
    background: #f1f4fa;
    color: #34435c;
}

.poc-icon-btn.add-child:hover {
    background: #e2e8f0;
}

.poc-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.poc-empty-state .poc-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.poc-empty-state .poc-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.poc-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.poc-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.poc-skeleton-row td {
    padding: 16px 18px;
}

.poc-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: poc-shimmer 1.4s ease infinite;
}

@keyframes poc-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.poc-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.poc-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.poc-modal-parent-note {
    margin: -4px 0 18px;
    font-size: 13px;
    color: #71809b;
}

.poc-modal-parent-note strong {
    color: #34435c;
}

.poc-delete-btn {
    margin-right: auto;
    border: none;
    background: none;
    color: #b91c1c;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    padding: 0 4px;
}

.poc-delete-btn:hover {
    text-decoration: underline;
}

@media (max-width: 640px) {
    .poc-header { flex-direction: column; }
    .poc-header-actions { width: 100%; }
    .poc-add-btn, .poc-refresh-btn { flex: 1; justify-content: center; }
}
</style>

<div class="poc-page">
    <div class="poc-card">
        <div class="poc-header">
            <div class="poc-header-title">
                <div class="poc-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path><path d="M9 13h6M9 17h4"></path></svg>
                </div>
                <div>
                    <h1>Configure Orders and Results</h1>
                    <p class="form-subtitle">Build the tree of orderable lab/procedure categories used when placing and reviewing orders.</p>
                </div>
            </div>
            <div class="poc-header-actions">
                <button type="button" class="poc-add-btn" id="pocAddTopLevelBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                    Add Top Level
                </button>
                <button type="button" class="poc-refresh-btn" id="pocRefreshBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"></path><path d="M3 21v-5h5"></path></svg>
                    Refresh
                </button>
            </div>
        </div>

        <div class="poc-stat-row">
            <span class="poc-stat-pill" id="pocCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
                <span id="pocCountText">0 items</span>
            </span>
        </div>

        <div class="poc-table-wrap">
            <table class="poc-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Procedure Tier</th>
                        <th>Sequence</th>
                        <th>Details</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="pocTableBody">
                    <tr class="poc-skeleton-row"><td colspan="5"><div class="poc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="poc-skeleton-row"><td colspan="5"><div class="poc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="poc-skeleton-row"><td colspan="5"><div class="poc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="pocModalOverlay">
    <div class="modal-box">
        <div class="poc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path><path d="M9 13h6M9 17h4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="pocModalTitle">Add Top Level Item</h2>
            <button type="button" class="modal-close" id="pocModalClose">&times;</button>
        </div>
        <p class="poc-modal-parent-note" id="pocModalParentNote" style="display: none;">Adding under <strong id="pocModalParentName"></strong></p>

        <div id="formAlert"></div>

        <form id="pocForm">
            <input type="hidden" id="poc_id">
            <input type="hidden" id="poc_parent_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Procedure Tier</label>
                    <select id="poc_procedure_tier" class="form-input"></select>
                    <span class="form-error" id="err-procedure_tier"></span>
                </div>

                <div class="form-group full" data-field-group="order_test_type">
                    <label>Order Test Type (Required)</label>
                    <select id="poc_order_test_type" class="form-input"></select>
                    <input id="poc_order_test_type_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-order_test_type"></span>
                </div>

                <div class="form-group full" data-field-group="name">
                    <label>Name</label>
                    <input id="poc_name" class="form-input" placeholder="e.g Laboratory">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full" data-field-group="description">
                    <label>Description</label>
                    <input id="poc_description" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-description"></span>
                </div>

                <div class="form-group" data-field-group="sequence">
                    <label>Sequence</label>
                    <input id="poc_sequence" type="number" class="form-input" value="0">
                    <span class="form-error" id="err-sequence"></span>
                </div>

                <div class="form-group" data-field-group="order_from">
                    <label>Order From</label>
                    <select id="poc_order_from" class="form-input"></select>
                    <input id="poc_order_from_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-order_from"></span>
                </div>

                <div class="form-group" data-field-group="identifying_code">
                    <label>Identifying Code</label>
                    <input id="poc_identifying_code" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-identifying_code"></span>
                </div>

                <div class="form-group" data-field-group="standard_code">
                    <label>Standard Code (LOINC)</label>
                    <input id="poc_standard_code" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-standard_code"></span>
                </div>

                <div class="form-group" data-field-group="body_site">
                    <label>Body Site</label>
                    <select id="poc_body_site" class="form-input"></select>
                    <input id="poc_body_site_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-body_site"></span>
                </div>

                <div class="form-group" data-field-group="specimen_type">
                    <label>Specimen Type</label>
                    <select id="poc_specimen_type" class="form-input"></select>
                    <input id="poc_specimen_type_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-specimen_type"></span>
                </div>

                <div class="form-group" data-field-group="administer_via">
                    <label>Administer Via</label>
                    <select id="poc_administer_via" class="form-input"></select>
                    <input id="poc_administer_via_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-administer_via"></span>
                </div>

                <div class="form-group" data-field-group="laterality">
                    <label>Laterality</label>
                    <select id="poc_laterality" class="form-input"></select>
                    <input id="poc_laterality_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-laterality"></span>
                </div>

                <div class="form-group" data-field-group="default_units">
                    <label>Default Units</label>
                    <select id="poc_default_units" class="form-input"></select>
                    <input id="poc_default_units_other" class="form-input" placeholder="Enter custom value" style="margin-top: 8px; display: none;">
                    <span class="form-error" id="err-default_units"></span>
                </div>

                <div class="form-group" data-field-group="default_range">
                    <label>Default Range</label>
                    <input id="poc_default_range" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-default_range"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="poc-delete-btn" id="pocDeleteBtn" style="display: none;">Delete this item</button>
                <button type="button" class="btn-secondary" id="pocCancelBtn">Cancel</button>
                <button class="login-btn" type="submit" id="pocSaveBtn">Add Item</button>
            </div>
        </form>
    </div>
</div>
`;
}
