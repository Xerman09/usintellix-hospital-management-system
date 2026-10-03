export function StockTransfersView() {
    return `
<style>
.st-page { width: 100%; font-size: 13.5px; }
.st-page [hidden] { display: none !important; }
.st-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.st-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.st-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.st-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.st-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.st-btn:hover { background: var(--bg-surface-alt); }
.st-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.st-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.st-btn.success { border-color: #16a34a; background: #16a34a; color: #fff; }
.st-btn.success:hover { background: #15803d; border-color: #15803d; }
.st-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.st-btn.danger:hover { background: #fee2e2; }
.st-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.st-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.st-btn.link { border: none; background: none; color: #b91c1c; padding: 0 6px; height: 28px; }
.st-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .st-btn.danger, :root[data-theme="dark"] .st-btn.link { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .st-btn.danger.solid { color: #fff; }

.st-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.st-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.st-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); overflow-wrap: anywhere; }
.st-stat span { font-size: 12px; color: var(--text-muted); }
.st-stat.warn strong { color: #b45309; }
.st-stat.loss strong { color: #b91c1c; }
:root[data-theme="dark"] .st-stat.warn strong { color: #fcd34d; }
:root[data-theme="dark"] .st-stat.loss strong { color: #fca5a5; }

.st-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; max-width: 100%; }
.st-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.st-tabs button:last-child { border-right: none; }
.st-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.st-tabs .count { margin-left: 4px; color: var(--text-muted); }

.st-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.st-filters input[type="text"], .st-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; }
.st-filters input[type="text"] { min-width: 260px; }
.st-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.st-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.st-card .st-table-wrap { border: none; border-radius: 0; }
.st-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.st-table th { text-align: left; padding: 9px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.st-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.st-table tbody tr:last-child td { border-bottom: none; }
.st-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-weight: 700; }
.st-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.st-table tr.st-row { cursor: pointer; }
.st-table tr.st-row:hover td { background: var(--bg-surface-alt); }
.st-table tr.short td { background: rgba(239,68,68,.05); }
.st-table tr.sub td { padding-top: 4px; padding-bottom: 4px; border-bottom-style: dashed; font-size: 12.5px; }
.st-table input, .st-table select { height: 32px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; box-sizing: border-box; }
.st-table input[type="number"] { width: 100px; text-align: right; }
.st-table input[type="text"] { width: 100%; min-width: 120px; }
.st-table select { width: 100%; min-width: 170px; }
.st-table .form-error { display: block; }
.st-table.lines { min-width: 860px; }
.st-table.lines td:nth-child(3) { min-width: 170px; }
.st-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.st-sub.warn { color: #b45309; }
:root[data-theme="dark"] .st-sub.warn { color: #fcd34d; }
.st-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.st-arrow { color: var(--text-muted); margin: 0 4px; }
.st-minus { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .st-minus { color: #fca5a5; }

.st-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.st-badge.draft { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.st-badge.requested { background: #fef3c7; color: #92400e; }
.st-badge.in_transit { background: #e0f2fe; color: #075985; }
.st-badge.received { background: #dcfce7; color: #166534; }
.st-badge.cancelled, .st-badge.expired, .st-badge.short { background: #fee2e2; color: #991b1b; }
.st-badge.urgent { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
:root[data-theme="dark"] .st-badge.requested { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .st-badge.in_transit { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .st-badge.received { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .st-badge.cancelled, :root[data-theme="dark"] .st-badge.expired, :root[data-theme="dark"] .st-badge.short { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .st-badge.urgent { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }

.st-back { margin-bottom: 10px; }
.st-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.st-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.st-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; margin: 0; }
.st-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.st-info dd { margin: 2px 0 0; color: var(--text-primary); overflow-wrap: anywhere; }
.st-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.st-hint.warn { color: #b45309; }
:root[data-theme="dark"] .st-hint.warn { color: #fcd34d; }

.st-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.st-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.st-banner span { font-size: 12.5px; color: var(--text-muted); }
.st-banner.requested { border-color: #f59e0b; background: #fffbeb; }
.st-banner.in_transit { border-color: #7dd3fc; background: #f0f9ff; }
.st-banner.received { border-color: #86efac; background: #f0fdf4; }
.st-banner.cancelled { border-color: #fca5a5; background: #fef2f2; }
:root[data-theme="dark"] .st-banner.requested { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .st-banner.in_transit { background: rgba(14,165,233,.10); border-color: rgba(14,165,233,.45); }
:root[data-theme="dark"] .st-banner.received { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .st-banner.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }

.st-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px 16px; }
.st-field > label, .st-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 0 0 4px; color: var(--text-primary); }
.st-field select, .st-field input, .st-field textarea, .st-dialog input, .st-dialog textarea { width: 100%; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.st-field select, .st-field input, .st-dialog input { height: 34px; padding: 0 10px; }
.st-field textarea, .st-dialog textarea { min-height: 60px; padding: 8px 10px; resize: vertical; }
.st-field.wide { grid-column: 1 / -1; }
.st-swap { align-self: end; }

.st-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.st-timeline li { padding-left: 14px; border-left: 3px solid var(--border-color); color: var(--text-primary); font-size: 13px; }
.st-timeline li.received { border-left-color: #16a34a; }
.st-timeline li.cancelled { border-left-color: #dc2626; }
.st-timeline li.requested { border-left-color: #f59e0b; }
.st-timeline li.sent { border-left-color: #0ea5e9; }
.st-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.st-timeline .note { display: block; font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

.st-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.st-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.st-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.st-dialog .st-field { margin-bottom: 10px; }

@media (max-width: 600px) {
    .st-filters input[type="text"] { min-width: 0; width: 100%; }
    .st-count { margin-left: 0; }
}
</style>

<div class="st-page">
    <div id="stListPanel">
        <div class="st-header">
            <div>
                <h1>Stock Transfers</h1>
                <p>Move stock from one storage location to another. Sending takes it out of the source location; it is in transit until the receiving location confirms what arrived.</p>
            </div>
            <div class="st-actions">
                <button type="button" class="st-btn primary" id="stNewBtn" hidden>+ New Transfer</button>
            </div>
        </div>
        <div class="st-stats">
            <div class="st-stat warn"><strong id="stStatRequested">0</strong><span>Requested, waiting to be sent</span></div>
            <div class="st-stat"><strong id="stStatTransit">0</strong><span>In transit</span></div>
            <div class="st-stat"><strong id="stStatReceived">0</strong><span>Received this month</span></div>
            <div class="st-stat loss"><strong id="stStatShort">₱0.00</strong><span>Lost in transit this year</span></div>
        </div>
        <div class="st-tabs" role="tablist" id="stTabs"></div>
        <div class="st-filters">
            <input type="text" id="stSearch" placeholder="Search ST no., item, location...">
            <select id="stLocationFilter" aria-label="Location"></select>
            <span class="st-count" id="stCount"></span>
        </div>
        <div id="stList"><div class="st-empty">Loading...</div></div>
    </div>

    <div id="stEditPanel" hidden>
        <button type="button" class="st-btn small st-back" data-st-back>&larr; Back to transfers</button>
        <div class="st-header"><div><h1 id="stEditTitle">New Transfer</h1>
            <p>Quantities are in each item's dispensing unit. Leave the lot on “earliest expiry first” to let the system pick when it's sent; expired lots are only moved when chosen.</p></div></div>
        <div id="stEditAlert"></div>
        <div class="st-card">
            <div class="st-grid">
                <div class="st-field">
                    <label for="st_from">From (sending location)<span style="color:#dc2626;">*</span></label>
                    <select id="st_from"></select>
                    <span class="st-hint" id="stFromHint"></span>
                    <span class="form-error" id="err-st_from_warehouse_id"></span>
                </div>
                <div class="st-field">
                    <label for="st_to">To (receiving location)<span style="color:#dc2626;">*</span></label>
                    <select id="st_to"></select>
                    <span class="st-hint" id="stToHint"></span>
                    <span class="form-error" id="err-st_to_warehouse_id"></span>
                </div>
                <div class="st-field">
                    <label for="st_priority">Priority</label>
                    <select id="st_priority"><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
                </div>
                <div class="st-field">
                    <label for="st_needed_by">Needed By</label>
                    <input type="date" id="st_needed_by">
                    <span class="form-error" id="err-st_needed_by"></span>
                </div>
                <div class="st-field wide">
                    <label for="st_notes">Notes</label>
                    <textarea id="st_notes" maxlength="1000" placeholder="e.g. ER stock for the weekend"></textarea>
                </div>
            </div>
        </div>
        <div class="st-card">
            <div class="st-card-title"><span>Items</span><button type="button" class="st-btn small" id="stAddLine">+ Add Item</button></div>
            <div id="stLines"></div>
            <span class="form-error" id="err-st_items"></span>
        </div>
        <div class="st-footer">
            <button type="button" class="st-btn danger" id="stDeleteDraft" hidden>Delete Draft</button>
            <div class="st-footer-right">
                <button type="button" class="st-btn" data-st-back>Cancel</button>
                <button type="button" class="st-btn" id="stSaveDraft">Save Draft</button>
                <button type="button" class="st-btn" id="stSaveRequest" title="The receiving side asks; the sending location sends it later">Request</button>
                <button type="button" class="st-btn primary" id="stSaveSend">Send Now</button>
            </div>
        </div>
    </div>

    <div id="stDetailPanel" hidden>
        <button type="button" class="st-btn small st-back" data-st-back>&larr; Back to transfers</button>
        <div id="stDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="stDialogOverlay">
    <div class="modal-box st-dialog" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="stDialogTitle">
        <div class="modal-header">
            <h2 id="stDialogTitle"></h2>
            <button type="button" class="modal-close" id="stDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="stDialogBody"></div>
        <div id="stDialogAlert"></div>
        <div class="st-footer"><div class="st-footer-right">
            <button type="button" class="st-btn" id="stDialogCancel">Go Back</button>
            <button type="button" class="st-btn primary" id="stDialogOk">Confirm</button>
        </div></div>
    </div>
</div>
    `;
}
