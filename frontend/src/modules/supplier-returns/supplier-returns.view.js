export function SupplierReturnsView() {
    return `
<style>
.sr-page { width: 100%; font-size: 13.5px; }
.sr-page [hidden] { display: none !important; }

.sr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.sr-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.sr-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 720px; }
.sr-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.sr-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.sr-btn:hover { background: var(--bg-surface-alt); }
.sr-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.sr-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.sr-btn.success { border-color: #16a34a; background: #16a34a; color: #fff; }
.sr-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.sr-btn.danger:hover { background: #fee2e2; }
.sr-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.sr-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.sr-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .sr-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .sr-btn.danger.solid { color: #fff; }

.sr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.sr-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.sr-stat strong { font-size: 20px; line-height: 1.15; color: var(--text-primary); }
.sr-stat span { font-size: 12px; color: var(--text-muted); }
.sr-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .sr-stat.warn strong { color: #fcd34d; }

.sr-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.sr-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sr-tabs button:last-child { border-right: none; }
.sr-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.sr-tabs .count { margin-left: 4px; color: var(--text-muted); }

.sr-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.sr-filters input[type="text"] { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; min-width: 260px; max-width: 100%; }
.sr-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.sr-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.sr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sr-table th { text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.sr-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.sr-table tbody tr:last-child td { border-bottom: none; }
.sr-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sr-table tr.sr-row { cursor: pointer; }
.sr-table tr.sr-row:hover td { background: var(--bg-surface-alt); }
.sr-table tr.is-cancelled td { color: var(--text-muted); }
.sr-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.sr-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.sr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sr-badge.draft { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.sr-badge.pending_approval { background: #fef3c7; color: #92400e; }
.sr-badge.rejected { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.sr-badge.approved { background: #e0f2fe; color: #075985; }
.sr-badge.sent { background: #ede9fe; color: #5b21b6; }
.sr-badge.credited { background: #dcfce7; color: #166534; }
.sr-badge.cancelled { background: #fee2e2; color: #991b1b; }
.sr-badge.source { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.sr-badge.expired { background: #fee2e2; color: #991b1b; }
.sr-badge.soon { background: #fef3c7; color: #92400e; }
:root[data-theme="dark"] .sr-badge.pending_approval, :root[data-theme="dark"] .sr-badge.soon { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .sr-badge.rejected { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .sr-badge.approved { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .sr-badge.sent { background: rgba(139,92,246,.2); color: #ddd6fe; }
:root[data-theme="dark"] .sr-badge.credited { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .sr-badge.cancelled, :root[data-theme="dark"] .sr-badge.expired { background: rgba(239,68,68,.18); color: #fecaca; }

.sr-back { margin-bottom: 10px; }
.sr-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.sr-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.sr-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.sr-field .req { color: #dc2626; margin-left: 2px; }
.sr-field input, .sr-field select, .sr-lines input, .sr-lines select, .sr-dialog input {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.sr-field .form-error, .sr-lines .form-error, .sr-dialog .form-error { display: block; }
.sr-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.sr-pick-tabs { display: inline-flex; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.sr-pick-tabs button { height: 30px; padding: 0 12px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12px; cursor: pointer; font-family: inherit; }
.sr-pick-tabs button:last-child { border-right: none; }
.sr-pick-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.sr-pick-list { max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.sr-pick-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; border-bottom: 1px solid var(--border-color); }
.sr-pick-row:last-child { border-bottom: none; }
.sr-pick-row .grow { flex: 1; min-width: 0; }
.sr-pick-row.added { opacity: .55; }

.sr-lines-wrap { overflow-x: auto; }
.sr-lines { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 980px; }
.sr-lines th { text-align: left; padding: 8px; white-space: nowrap; color: var(--text-muted); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.sr-lines td { padding: 9px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-primary); }
.sr-lines .num { text-align: right; white-space: nowrap; }
.sr-lines input[type="number"] { text-align: right; padding: 0 8px; }
.sr-remove { width: 28px; height: 28px; border-radius: 6px; border: 1px solid transparent; background: none; color: var(--text-muted); font-size: 17px; cursor: pointer; line-height: 1; }
.sr-remove:hover { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; }

.sr-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; margin: 0; }
.sr-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.sr-info dd { margin: 2px 0 0; color: var(--text-primary); }

.sr-totals { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; font-size: 13px; max-width: 360px; margin-left: auto; }
.sr-totals .label { color: var(--text-muted); }
.sr-totals .val { text-align: right; font-variant-numeric: tabular-nums; }
.sr-totals .grand { font-size: 17px; font-weight: 800; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-color); }

.sr-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.sr-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.sr-banner span { font-size: 12.5px; color: var(--text-muted); }
.sr-banner.pending_approval { border-color: #f59e0b; background: #fffbeb; }
.sr-banner.approved { border-color: #7dd3fc; background: #f0f9ff; }
.sr-banner.sent { border-color: #c4b5fd; background: #f5f3ff; }
.sr-banner.credited { border-color: #86efac; background: #f0fdf4; }
.sr-banner.rejected { border-color: #fdba74; background: #fff7ed; }
.sr-banner.cancelled { border-color: #fca5a5; background: #fef2f2; }
:root[data-theme="dark"] .sr-banner.pending_approval { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .sr-banner.approved { background: rgba(14,165,233,.10); border-color: rgba(14,165,233,.45); }
:root[data-theme="dark"] .sr-banner.sent { background: rgba(139,92,246,.10); border-color: rgba(139,92,246,.45); }
:root[data-theme="dark"] .sr-banner.credited { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .sr-banner.rejected { background: rgba(249,115,22,.10); border-color: rgba(249,115,22,.45); }
:root[data-theme="dark"] .sr-banner.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }

.sr-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.sr-timeline li { padding-left: 14px; border-left: 3px solid var(--border-color); color: var(--text-primary); font-size: 13px; }
.sr-timeline li.approved, .sr-timeline li.credited { border-left-color: #16a34a; }
.sr-timeline li.sent { border-left-color: #7c3aed; }
.sr-timeline li.rejected, .sr-timeline li.cancelled { border-left-color: #dc2626; }
.sr-timeline li.submitted, .sr-timeline li.resubmitted { border-left-color: #f59e0b; }
.sr-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.sr-timeline .note { display: block; font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

.sr-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.sr-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.sr-dialog-summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.sr-dialog-summary dt { color: var(--text-muted); }
.sr-dialog-summary dd { margin: 0; min-width: 0; overflow-wrap: break-word; color: var(--text-primary); text-align: right; font-weight: 600; }
.sr-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.sr-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 8px 0 4px; color: var(--text-primary); }
.sr-dialog textarea { width: 100%; min-height: 70px; padding: 8px 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical; }

@media (max-width: 900px) { .sr-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) {
    .sr-grid { grid-template-columns: 1fr; }
    .sr-filters input[type="text"] { min-width: 0; width: 100%; }
    .sr-count { margin-left: 0; }
    .sr-dialog-summary { grid-template-columns: 1fr; gap: 2px; }
    .sr-dialog-summary dd { text-align: left; margin-bottom: 6px; }
}
</style>

<div class="sr-page">
    <div id="srListPanel">
        <div class="sr-header">
            <div>
                <h1>Supplier Returns</h1>
                <p>Send rejected, damaged, wrong or near-expiry items back to the supplier and record the credit they give for them.</p>
            </div>
            <div class="sr-actions"><button type="button" class="sr-btn primary" id="srNewBtn" hidden>+ New Return</button></div>
        </div>

        <div class="sr-stats">
            <div class="sr-stat warn"><strong id="srStatPending">0</strong><span>Waiting for approval</span></div>
            <div class="sr-stat"><strong id="srStatToSend">0</strong><span>Approved, not sent yet</span></div>
            <div class="sr-stat warn"><strong id="srStatAwaiting">0</strong><span>Sent, waiting for credit</span></div>
            <div class="sr-stat"><strong id="srStatCredit">₱0.00</strong><span>Credit not yet applied</span></div>
        </div>

        <div class="sr-tabs" role="tablist" id="srTabs"></div>
        <div class="sr-filters">
            <input type="text" id="srSearch" placeholder="Search RTS no., supplier, credit memo no....">
            <span class="sr-count" id="srCount"></span>
        </div>
        <div id="srList"><div class="sr-empty">Loading...</div></div>
    </div>

    <div id="srEditPanel" hidden>
        <button type="button" class="sr-btn small sr-back" data-sr-back>&larr; Back to returns</button>
        <div class="sr-header">
            <div>
                <h1 id="srEditTitle">New Return to Supplier</h1>
                <p id="srEditSub">Pick what goes back: quantities rejected at receiving, or stock from a storage location.</p>
            </div>
        </div>
        <div id="srEditAlert"></div>

        <form id="srForm" novalidate>
            <div class="sr-card">
                <div class="sr-grid">
                    <div class="sr-field">
                        <label for="sr_supplier_id">Supplier<span class="req">*</span></label>
                        <select id="sr_supplier_id"></select>
                        <span class="form-error" id="err-sr_supplier_id"></span>
                    </div>
                    <div class="sr-field">
                        <label for="sr_return_date">Return Date<span class="req">*</span></label>
                        <input type="date" id="sr_return_date">
                        <span class="form-error" id="err-sr_return_date"></span>
                    </div>
                    <div class="sr-field">
                        <label for="sr_notes">Notes</label>
                        <input type="text" id="sr_notes" maxlength="2000" placeholder="e.g. Supplier's RA no. 2231">
                    </div>
                </div>
            </div>

            <div class="sr-card" id="srPickCard">
                <div class="sr-card-title">Add Items to Return</div>
                <div class="sr-pick-tabs">
                    <button type="button" class="active" data-sr-pick="rejected">Rejected at Receiving</button>
                    <button type="button" data-sr-pick="stock">From Stock</button>
                </div>
                <div id="srPickList" class="sr-pick-list"></div>
            </div>

            <div class="sr-card">
                <div class="sr-card-title">Items Going Back</div>
                <span class="form-error" id="err-sr_items"></span>
                <div id="srLines"></div>
                <div class="sr-totals" style="margin-top:14px;">
                    <span class="label">Value before VAT</span><span class="val" id="srSubtotal">₱0.00</span>
                    <span class="label">VAT (12%)</span><span class="val" id="srVat">₱0.00</span>
                    <span class="label grand">Return Value</span><span class="val grand" id="srTotal">₱0.00</span>
                </div>
            </div>

            <div class="sr-footer">
                <button type="button" class="sr-btn danger" id="srDeleteDraft" hidden>Delete Draft</button>
                <div class="sr-footer-right">
                    <button type="button" class="sr-btn" data-sr-back>Cancel</button>
                    <button type="button" class="sr-btn" id="srSaveDraft">Save Draft</button>
                    <button type="submit" class="sr-btn primary" id="srSubmit">Submit for Approval</button>
                </div>
            </div>
        </form>
    </div>

    <div id="srDetailPanel" hidden>
        <button type="button" class="sr-btn small sr-back" data-sr-back>&larr; Back to returns</button>
        <div id="srDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="srDialogOverlay">
    <div class="modal-box sr-dialog" style="max-width: 500px;" role="dialog" aria-modal="true" aria-labelledby="srDialogTitle">
        <div class="modal-header">
            <h2 id="srDialogTitle"></h2>
            <button type="button" class="modal-close" id="srDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="srDialogBody"></div>
        <div id="srDialogAlert"></div>
        <div class="sr-footer">
            <div class="sr-footer-right">
                <button type="button" class="sr-btn" id="srDialogCancel">Go Back</button>
                <button type="button" class="sr-btn primary" id="srDialogOk">Confirm</button>
            </div>
        </div>
    </div>
</div>
    `;
}
