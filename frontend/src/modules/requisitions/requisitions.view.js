export function RequisitionsView() {
    return `
<style>
.pr-page { width: 100%; font-size: 13.5px; }
.pr-page [hidden] { display: none !important; }
.pr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.pr-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.pr-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 720px; }
.pr-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pr-btn:hover { background: var(--bg-surface-alt); }
.pr-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.pr-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.pr-btn.success { border-color: #16a34a; background: #16a34a; color: #fff; }
.pr-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.pr-btn.danger:hover { background: #fee2e2; }
.pr-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.pr-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.pr-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .pr-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .pr-btn.danger.solid { color: #fff; }

.pr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.pr-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.pr-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.pr-stat span { font-size: 12px; color: var(--text-muted); }
.pr-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .pr-stat.warn strong { color: #fcd34d; }

.pr-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.pr-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pr-tabs button:last-child { border-right: none; }
.pr-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.pr-tabs .count { margin-left: 4px; color: var(--text-muted); }

.pr-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.pr-filters input[type="text"] { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; min-width: 260px; max-width: 100%; }
.pr-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.pr-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.pr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pr-table th { text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.pr-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.pr-table tbody tr:last-child td { border-bottom: none; }
.pr-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pr-table tr.pr-row { cursor: pointer; }
.pr-table tr.pr-row:hover td { background: var(--bg-surface-alt); }
.pr-table input[type="number"], .pr-table select { height: 32px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; }
.pr-table input[type="number"] { width: 100px; text-align: right; }
.pr-table select { max-width: 260px; }
.pr-table input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.pr-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.pr-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.pr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pr-badge.draft, .pr-badge.closed, .pr-badge.not_ordered { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.pr-badge.submitted, .pr-badge.urgent { background: #fef3c7; color: #92400e; }
.pr-badge.approved, .pr-badge.partially_ordered { background: #e0f2fe; color: #075985; }
.pr-badge.ordered, .pr-badge.partially_received { background: #ede9fe; color: #5b21b6; }
.pr-badge.received { background: #dcfce7; color: #166534; }
.pr-badge.rejected { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.pr-badge.cancelled, .pr-badge.overdue { background: #fee2e2; color: #991b1b; }
:root[data-theme="dark"] .pr-badge.submitted, :root[data-theme="dark"] .pr-badge.urgent { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .pr-badge.approved, :root[data-theme="dark"] .pr-badge.partially_ordered { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .pr-badge.ordered, :root[data-theme="dark"] .pr-badge.partially_received { background: rgba(139,92,246,.2); color: #ddd6fe; }
:root[data-theme="dark"] .pr-badge.received { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .pr-badge.rejected { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .pr-badge.cancelled, :root[data-theme="dark"] .pr-badge.overdue { background: rgba(239,68,68,.18); color: #fecaca; }

.pr-bar { height: 6px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; margin-top: 4px; width: 120px; }
.pr-bar span { display: block; height: 100%; background: var(--accent); }

.pr-back { margin-bottom: 10px; }
.pr-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.pr-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.pr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.pr-grid .span-3 { grid-column: 1 / -1; }
.pr-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.pr-field .req { color: #dc2626; margin-left: 2px; }
.pr-field input, .pr-field select, .pr-field textarea, .pr-lines input, .pr-lines select, .pr-add select, .pr-dialog input {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.pr-field textarea { height: auto; min-height: 56px; padding: 8px 10px; resize: vertical; }
.pr-field .form-error, .pr-lines .form-error { display: block; }
.pr-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.pr-lines-wrap { overflow-x: auto; }
.pr-lines { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.pr-lines th { text-align: left; padding: 8px; white-space: nowrap; color: var(--text-muted); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.pr-lines td { padding: 9px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-primary); }
.pr-lines .num { text-align: right; white-space: nowrap; }
.pr-lines input[type="number"] { text-align: right; }
.pr-add { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
.pr-add select { flex: 0 1 420px; min-width: 0; max-width: 100%; border-style: dashed; }
.pr-remove { width: 28px; height: 28px; border-radius: 6px; border: 1px solid transparent; background: none; color: var(--text-muted); font-size: 17px; cursor: pointer; line-height: 1; }
.pr-remove:hover { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; }
.pr-chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); white-space: nowrap; margin: 3px 4px 0 0; }

.pr-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; margin: 0; }
.pr-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.pr-info dd { margin: 2px 0 0; color: var(--text-primary); }

.pr-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.pr-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.pr-banner span { font-size: 12.5px; color: var(--text-muted); }
.pr-banner.submitted { border-color: #f59e0b; background: #fffbeb; }
.pr-banner.approved { border-color: #7dd3fc; background: #f0f9ff; }
.pr-banner.rejected { border-color: #fdba74; background: #fff7ed; }
.pr-banner.cancelled { border-color: #fca5a5; background: #fef2f2; }
.pr-banner.done { border-color: #86efac; background: #f0fdf4; }
:root[data-theme="dark"] .pr-banner.submitted { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .pr-banner.approved { background: rgba(14,165,233,.10); border-color: rgba(14,165,233,.45); }
:root[data-theme="dark"] .pr-banner.rejected { background: rgba(249,115,22,.10); border-color: rgba(249,115,22,.45); }
:root[data-theme="dark"] .pr-banner.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }
:root[data-theme="dark"] .pr-banner.done { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }

.pr-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.pr-timeline li { padding-left: 14px; border-left: 3px solid var(--border-color); color: var(--text-primary); font-size: 13px; }
.pr-timeline li.approved, .pr-timeline li.ordered { border-left-color: #16a34a; }
.pr-timeline li.rejected, .pr-timeline li.cancelled, .pr-timeline li.closed { border-left-color: #dc2626; }
.pr-timeline li.submitted, .pr-timeline li.resubmitted { border-left-color: #f59e0b; }
.pr-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.pr-timeline .note { display: block; font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

.pr-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.pr-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.pr-selbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; margin: 12px 0 0; border-radius: 10px; border: 1px solid var(--accent); background: var(--accent-light); }
.pr-dialog-summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.pr-dialog-summary dt { color: var(--text-muted); }
.pr-dialog-summary dd { margin: 0; min-width: 0; overflow-wrap: break-word; color: var(--text-primary); text-align: right; font-weight: 600; }
.pr-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.pr-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 8px 0 4px; color: var(--text-primary); }
.pr-dialog textarea { width: 100%; min-height: 70px; padding: 8px 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical; }

@media (max-width: 900px) { .pr-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) {
    .pr-grid { grid-template-columns: 1fr; }
    .pr-filters input[type="text"] { min-width: 0; width: 100%; }
    .pr-count { margin-left: 0; }
    .pr-dialog-summary { grid-template-columns: 1fr; gap: 2px; }
    .pr-dialog-summary dd { text-align: left; margin-bottom: 6px; }
}
</style>

<div class="pr-page">
    <div id="prListPanel">
        <div class="pr-header">
            <div>
                <h1>Purchase Requests</h1>
                <p>Departments and wards ask for the items they need. The department head approves, and purchasing orders them from suppliers.</p>
            </div>
            <div class="pr-actions">
                <button type="button" class="pr-btn" id="prOrderBtn" hidden>Order from Requests</button>
                <button type="button" class="pr-btn primary" id="prNewBtn">+ New Request</button>
            </div>
        </div>
        <div class="pr-stats">
            <div class="pr-stat warn"><strong id="prStatMine">0</strong><span>Waiting for my approval</span></div>
            <div class="pr-stat"><strong id="prStatSubmitted">0</strong><span>Waiting for approval</span></div>
            <div class="pr-stat"><strong id="prStatToOrder">0</strong><span>Approved, not fully ordered</span></div>
            <div class="pr-stat warn"><strong id="prStatOverdue">0</strong><span>Past the date needed</span></div>
        </div>
        <div class="pr-tabs" role="tablist" id="prTabs"></div>
        <div class="pr-filters">
            <input type="text" id="prSearch" placeholder="Search PR no., department, reason, requested by...">
            <span class="pr-count" id="prCount"></span>
        </div>
        <div id="prList"><div class="pr-empty">Loading...</div></div>
    </div>

    <div id="prEditPanel" hidden>
        <button type="button" class="pr-btn small pr-back" data-pr-back>&larr; Back to requests</button>
        <div class="pr-header"><div><h1 id="prEditTitle">New Purchase Request</h1><p id="prEditSub">Say what's needed, how much, and by when.</p></div></div>
        <div id="prEditAlert"></div>
        <form id="prForm" novalidate>
            <div class="pr-card">
                <div class="pr-grid">
                    <div class="pr-field">
                        <label for="pr_department_id">Requesting Department<span class="req">*</span></label>
                        <select id="pr_department_id"></select>
                        <span class="pr-hint" id="prHeadHint"></span>
                        <span class="form-error" id="err-pr_department_id"></span>
                    </div>
                    <div class="pr-field">
                        <label for="pr_warehouse_id">Deliver To</label>
                        <select id="pr_warehouse_id"></select>
                        <span class="form-error" id="err-pr_warehouse_id"></span>
                    </div>
                    <div class="pr-field">
                        <label for="pr_needed_by">Needed By</label>
                        <input type="date" id="pr_needed_by">
                        <span class="form-error" id="err-pr_needed_by"></span>
                    </div>
                    <div class="pr-field">
                        <label for="pr_priority">Priority</label>
                        <select id="pr_priority"><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
                    </div>
                    <div class="pr-field" style="grid-column: span 2;">
                        <label for="pr_reason">Reason / Purpose<span class="req">*</span></label>
                        <input type="text" id="pr_reason" maxlength="2000" placeholder="e.g. Ward stock for the week, new treatment protocol">
                        <span class="form-error" id="err-pr_reason"></span>
                    </div>
                </div>
            </div>
            <div class="pr-card">
                <div class="pr-card-title">
                    <span>Items Needed</span>
                    <span class="pr-actions"><button type="button" class="pr-btn small" id="prFillLow" title="Add what this location is short of, based on its minimum and maximum levels">Fill from low stock</button></span>
                </div>
                <span class="form-error" id="err-pr_items"></span>
                <div id="prLines"></div>
                <div class="pr-add"><select id="prAddItem" aria-label="Add an item"></select></div>
            </div>
            <div class="pr-footer">
                <button type="button" class="pr-btn danger" id="prDeleteDraft" hidden>Delete Draft</button>
                <div class="pr-footer-right">
                    <button type="button" class="pr-btn" data-pr-back>Cancel</button>
                    <button type="button" class="pr-btn" id="prSaveDraft">Save Draft</button>
                    <button type="submit" class="pr-btn primary" id="prSubmit">Submit for Approval</button>
                </div>
            </div>
        </form>
    </div>

    <div id="prDetailPanel" hidden>
        <button type="button" class="pr-btn small pr-back" data-pr-back>&larr; Back to requests</button>
        <div id="prDetail"></div>
    </div>

    <div id="prOrderPanel" hidden>
        <button type="button" class="pr-btn small pr-back" data-pr-back>&larr; Back to requests</button>
        <div class="pr-header"><div><h1>Order from Requests</h1>
            <p>Tick the approved request lines to order and choose a supplier for each. One draft purchase order is made per supplier and delivery location, priced from Supplier Prices; check it and submit it for approval as usual.</p></div></div>
        <div id="prOrderAlert"></div>
        <div id="prOrderBody"><div class="pr-empty">Loading...</div></div>
    </div>
</div>

<div class="modal-overlay" id="prDialogOverlay">
    <div class="modal-box pr-dialog" style="max-width: 500px;" role="dialog" aria-modal="true" aria-labelledby="prDialogTitle">
        <div class="modal-header">
            <h2 id="prDialogTitle"></h2>
            <button type="button" class="modal-close" id="prDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="prDialogBody"></div>
        <div id="prDialogAlert"></div>
        <div class="pr-footer"><div class="pr-footer-right">
            <button type="button" class="pr-btn" id="prDialogCancel">Go Back</button>
            <button type="button" class="pr-btn primary" id="prDialogOk">Confirm</button>
        </div></div>
    </div>
</div>
    `;
}
