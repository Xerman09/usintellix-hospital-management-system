export function PurchaseOrdersView() {
    return `
<style>
.po-page { width: 100%; font-size: 13.5px; }
.po-page [hidden] { display: none !important; }

.po-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.po-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.po-header p { margin: 0; color: var(--text-muted); font-size: 13px; }
.po-header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.po-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.po-btn:hover { background: var(--bg-surface-alt); }
.po-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.po-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.po-btn.danger { border-color: #fca5a5; color: #b91c1c; background: transparent; }
.po-btn.danger:hover { background: #fee2e2; }
:root[data-theme="dark"] .po-btn.danger { color: #fca5a5; border-color: rgba(252,165,165,.5); }
:root[data-theme="dark"] .po-btn.danger:hover { background: rgba(239,68,68,.15); }
.po-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.po-btn.link { border: none; background: none; color: var(--accent-text, var(--accent)); padding: 0 4px; height: auto; }
.po-btn:disabled { opacity: .5; cursor: not-allowed; }

/* List */
.po-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.po-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.po-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.po-stat span { font-size: 12px; color: var(--text-muted); }
.po-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .po-stat.warn strong { color: #fcd34d; }

.po-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.po-filters input[type="text"], .po-filters select {
    height: 32px; padding: 0 10px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px;
}
.po-filters input[type="text"] { min-width: 240px; }
.po-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.po-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.po-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.po-table th {
    text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.po-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.po-table tbody tr:last-child td { border-bottom: none; }
.po-table .num { text-align: right; white-space: nowrap; }
.po-table tbody tr.po-row { cursor: pointer; }
.po-table tbody tr.po-row:hover td { background: var(--bg-surface-alt); }
.po-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.po-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.po-status { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.po-status.draft { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.po-status.pending_approval { background: #fef3c7; color: #92400e; }
.po-status.approved { background: #dcfce7; color: #166534; }
.po-status.rejected { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.po-status.cancelled { background: #fee2e2; color: #991b1b; }
.po-status.overdue { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; margin-left: 4px; }
:root[data-theme="dark"] .po-status.pending_approval { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .po-status.approved { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .po-status.rejected { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .po-status.cancelled { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .po-status.overdue { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }

/* Editor + detail */
.po-back { margin-bottom: 10px; }
.po-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.po-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.po-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.po-grid .span-2 { grid-column: span 2; }
.po-grid .span-3 { grid-column: 1 / -1; }
.po-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.po-field label .req { color: #dc2626; margin-left: 2px; }
.po-field input, .po-field select, .po-field textarea, .po-lines input, .po-lines select, .po-add select {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.po-field textarea { height: auto; min-height: 64px; padding: 8px 10px; resize: vertical; }
.po-field .form-error, .po-lines .form-error { display: block; }
.po-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.po-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 9px 12px; border-radius: 8px; font-size: 12.5px; }
.po-note.warn { border: 1px solid #f59e0b; background: #fffbeb; color: #92400e; }
.po-note.info { border: 1px solid var(--border-color); background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .po-note.warn { background: rgba(245,158,11,.12); color: #fde68a; border-color: rgba(245,158,11,.5); }

.po-add { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
.po-add select { flex: 1 1 320px; width: auto; }

.po-lines-wrap { overflow-x: auto; }
.po-lines { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 860px; }
.po-lines th {
    text-align: left; padding: 8px 8px; white-space: nowrap; color: var(--text-muted);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.po-lines td { padding: 10px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-primary); }
.po-lines .num { text-align: right; white-space: nowrap; }
.po-lines .col-qty { width: 90px; }
.po-lines .col-unit { width: 150px; }
.po-lines .col-price { width: 120px; }
.po-lines .col-disc { width: 110px; }
.po-lines .col-amt { width: 120px; }
.po-lines input[type="number"] { text-align: right; padding: 0 8px; }
.po-line-name { font-weight: 600; }
.po-line-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.po-tag { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.po-tag.promo { background: #ffedd5; color: #9a3412; }
.po-tag.warn { background: #fef3c7; color: #92400e; }
.po-tag.low { background: #fee2e2; color: #991b1b; }
.po-tag.info { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .po-tag.promo { background: rgba(249,115,22,.18); color: #fed7aa; }
:root[data-theme="dark"] .po-tag.warn { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .po-tag.low { background: rgba(239,68,68,.18); color: #fecaca; }
.po-remove { width: 30px; height: 30px; border-radius: 6px; border: 1px solid transparent; background: none; color: var(--text-muted); font-size: 18px; cursor: pointer; line-height: 1; }
.po-remove:hover { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; }
.po-lines-empty { padding: 24px 12px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px; }

.po-bottom { display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: start; }
.po-totals { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; font-size: 13px; align-items: center; }
.po-totals .label { color: var(--text-muted); }
.po-totals .val { text-align: right; font-variant-numeric: tabular-nums; }
.po-totals input { width: 120px; height: 32px; text-align: right; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-family: inherit; }
.po-totals .grand { font-size: 17px; font-weight: 800; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-color); }

.po-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.po-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }

.po-detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.po-detail-head h2 { margin: 0 0 4px; font-size: 20px; color: var(--text-primary); }
.po-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 20px; margin-top: 14px; }
.po-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.po-info dd { margin: 2px 0 0; color: var(--text-primary); }

/* Approval banner + history */
.po-approval { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface); }
.po-approval strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.po-approval span { font-size: 12.5px; color: var(--text-muted); }
.po-approval .po-approval-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.po-approval.pending { border-color: #f59e0b; background: #fffbeb; }
.po-approval.approved { border-color: #86efac; background: #f0fdf4; }
.po-approval.rejected { border-color: #fdba74; background: #fff7ed; }
.po-approval.cancelled { border-color: #fca5a5; background: #fef2f2; }
:root[data-theme="dark"] .po-approval.pending { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .po-approval.approved { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .po-approval.rejected { background: rgba(249,115,22,.10); border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .po-approval.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }
.po-approval .quote { display: block; margin-top: 4px; color: var(--text-primary); font-style: italic; }

.po-timeline { list-style: none; margin: 0; padding: 0; }
.po-timeline li { position: relative; padding: 0 0 14px 22px; font-size: 13px; color: var(--text-primary); }
.po-timeline li::before { content: ""; position: absolute; left: 4px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
.po-timeline li::after { content: ""; position: absolute; left: 7px; top: 15px; bottom: 0; width: 2px; background: var(--border-color); }
.po-timeline li:last-child { padding-bottom: 0; }
.po-timeline li:last-child::after { display: none; }
.po-timeline li.approved::before { background: #16a34a; }
.po-timeline li.rejected::before, .po-timeline li.cancelled::before { background: #dc2626; }
.po-timeline li.submitted::before, .po-timeline li.resubmitted::before { background: #d97706; }
.po-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.po-timeline .note { display: block; margin-top: 2px; color: var(--text-muted); font-style: italic; }

.po-confirm-summary { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.po-confirm-summary dt { color: var(--text-muted); }
.po-confirm-summary dd { margin: 0; min-width: 0; overflow-wrap: anywhere; color: var(--text-primary); text-align: right; font-weight: 600; }
.po-confirm-summary .grand { padding-top: 8px; border-top: 1px solid var(--border-color); font-size: 16px; font-weight: 800; color: var(--text-primary); }
.po-confirm-note { margin: 0; font-size: 12.5px; color: var(--text-muted); }
#poConfirmBody p, #poActionIntro p { margin: 0 0 12px; color: var(--text-primary); font-size: 13.5px; }
#poActionIntro .po-note { margin: 0 0 12px; }
#poConfirmBody p.po-confirm-note { color: var(--text-muted); font-size: 12.5px; }

@media (max-width: 900px) {
    .po-grid { grid-template-columns: 1fr 1fr; }
    .po-bottom { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
    .po-grid { grid-template-columns: 1fr; }
    .po-grid .span-2 { grid-column: auto; }
    .po-filters input[type="text"] { min-width: 0; width: 100%; }
    .po-count { margin-left: 0; }
}
</style>

<div class="po-page">

    <!-- List -->
    <div id="poListPanel">
        <div class="po-header">
            <div>
                <h1>Purchase Orders</h1>
                <p>Orders to suppliers for medicines and supplies. Prices come from Supplier Prices.</p>
            </div>
            <button type="button" class="po-btn primary" id="poNewBtn">+ New Purchase Order</button>
        </div>

        <div class="po-stats">
            <div class="po-stat"><strong id="poStatDrafts">0</strong><span>Drafts &amp; rejected</span></div>
            <div class="po-stat warn"><strong id="poStatPending">0</strong><span id="poStatPendingLabel">Awaiting approval</span></div>
            <div class="po-stat"><strong id="poStatOpen">0</strong><span>Approved, awaiting delivery</span></div>
            <div class="po-stat warn"><strong id="poStatOverdue">0</strong><span>Past expected delivery</span></div>
            <div class="po-stat"><strong id="poStatMonth">₱0.00</strong><span>Ordered this month</span></div>
        </div>

        <div class="po-filters">
            <input type="text" id="poSearch" placeholder="Search PO number, supplier, reference...">
            <select id="poStatusFilter">
                <option value="">All statuses</option>
                <option value="mine">Waiting for my approval</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <select id="poSupplierFilter"><option value="">All suppliers</option></select>
            <span class="po-count" id="poCount"></span>
        </div>

        <div id="poList"><div class="po-empty">Loading...</div></div>
    </div>

    <!-- Editor (new / draft) -->
    <div id="poEditorPanel" hidden>
        <button type="button" class="po-btn small po-back" data-po-back>&larr; Back to purchase orders</button>

        <div class="po-header">
            <div>
                <h1 id="poEditorTitle">New Purchase Order</h1>
                <p id="poEditorSub">Fill in the supplier and items, then save as a draft or submit the order.</p>
            </div>
        </div>

        <div id="poEditorNotice"></div>
        <div id="poEditorAlert"></div>

        <form id="poForm" novalidate>
            <div class="po-card">
                <div class="po-card-title">Supplier &amp; Delivery</div>
                <div class="po-grid">
                    <div class="po-field span-2">
                        <label for="po_supplier_id">Supplier<span class="req">*</span></label>
                        <select id="po_supplier_id"></select>
                        <span class="po-hint" id="poSupplierMeta"></span>
                        <span class="form-error" id="err-po_supplier_id"></span>
                    </div>
                    <div class="po-field">
                        <label for="po_supplier_reference">Supplier Quotation / Ref. No.</label>
                        <input type="text" id="po_supplier_reference" maxlength="100" placeholder="Optional">
                    </div>
                    <div class="po-field">
                        <label for="po_order_date">Order Date<span class="req">*</span></label>
                        <input type="date" id="po_order_date">
                        <span class="form-error" id="err-po_order_date"></span>
                    </div>
                    <div class="po-field">
                        <label for="po_expected_date">Expected Delivery</label>
                        <input type="date" id="po_expected_date">
                        <span class="po-hint" id="poExpectedHint"></span>
                        <span class="form-error" id="err-po_expected_date"></span>
                    </div>
                    <div class="po-field">
                        <label for="po_warehouse_id">Deliver To<span class="req">*</span></label>
                        <select id="po_warehouse_id"></select>
                        <span class="form-error" id="err-po_warehouse_id"></span>
                    </div>
                    <div class="po-field">
                        <label for="po_payment_terms">Payment Terms</label>
                        <input type="text" id="po_payment_terms" maxlength="50" list="poTermsList" placeholder="e.g. Net 30">
                        <datalist id="poTermsList">
                            <option value="Cash on Delivery"></option>
                            <option value="Net 15"></option>
                            <option value="Net 30"></option>
                            <option value="Net 45"></option>
                            <option value="Net 60"></option>
                            <option value="Advance Payment"></option>
                        </datalist>
                    </div>
                </div>
                <div id="poSupplierNotes"></div>
            </div>

            <div class="po-card">
                <div class="po-card-title">
                    <span>Items <span id="poLineCount"></span></span>
                </div>
                <div class="po-add">
                    <select id="poAddItem" aria-label="Add an item"></select>
                    <button type="button" class="po-btn" id="poAddLowStock" title="Add every item this supplier sells that is below its reorder level">+ Add low-stock items</button>
                </div>
                <span class="form-error" id="err-po_items"></span>
                <div id="poLines"></div>
            </div>

            <div class="po-bottom">
                <div class="po-card">
                    <div class="po-field">
                        <label for="po_notes">Notes / Instructions to Supplier</label>
                        <textarea id="po_notes" maxlength="2000" rows="4" placeholder="e.g. Deliver Mon-Fri 8am-4pm. Include the Certificate of Analysis and official receipt."></textarea>
                    </div>
                </div>
                <div class="po-card">
                    <div class="po-totals">
                        <span class="label">Subtotal</span><span class="val" id="poSubtotal">₱0.00</span>
                        <span class="label">Discounts</span><span class="val" id="poDiscountTotal">₱0.00</span>
                        <label class="label" for="po_shipping_fee">Delivery / Other Charges</label>
                        <span class="val"><input type="number" id="po_shipping_fee" min="0" step="0.01" placeholder="0.00"></span>
                        <span class="label grand">Total</span><span class="val grand" id="poTotal">₱0.00</span>
                    </div>
                    <span class="form-error" id="err-po_shipping_fee"></span>
                </div>
            </div>

            <div class="po-footer">
                <button type="button" class="po-btn danger" id="poDeleteDraft" hidden>Delete Draft</button>
                <div class="po-footer-right">
                    <button type="button" class="po-btn" data-po-back>Cancel</button>
                    <button type="button" class="po-btn" id="poSaveDraft">Save as Draft</button>
                    <button type="submit" class="po-btn primary" id="poSubmit">Submit for Approval</button>
                </div>
            </div>
        </form>
    </div>

    <!-- Detail (submitted / cancelled) -->
    <div id="poDetailPanel" hidden>
        <button type="button" class="po-btn small po-back" data-po-back>&larr; Back to purchase orders</button>
        <div id="poDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="poConfirmOverlay">
    <div class="modal-box" style="max-width: 460px;" role="dialog" aria-modal="true" aria-labelledby="poConfirmTitle">
        <div class="modal-header">
            <h2 id="poConfirmTitle">Are you sure?</h2>
            <button type="button" class="modal-close" id="poConfirmClose" aria-label="Close">&times;</button>
        </div>
        <div id="poConfirmBody"></div>
        <div class="po-footer">
            <div class="po-footer-right">
                <button type="button" class="po-btn" id="poConfirmCancel">Go Back</button>
                <button type="button" class="po-btn primary" id="poConfirmOk">Confirm</button>
            </div>
        </div>
    </div>
</div>

<!-- Approve / Reject / Cancel: one dialog, set up per action -->
<div class="modal-overlay" id="poActionOverlay">
    <div class="modal-box" style="max-width: 500px;" role="dialog" aria-modal="true" aria-labelledby="poActionTitle">
        <div class="modal-header">
            <h2 id="poActionTitle">Cancel Purchase Order</h2>
            <button type="button" class="modal-close" id="poActionClose" aria-label="Close">&times;</button>
        </div>
        <form id="poActionForm" novalidate>
            <div id="poActionIntro"></div>
            <div class="po-field">
                <label for="po_action_text" id="poActionLabel">Reason<span class="req">*</span></label>
                <textarea id="po_action_text" maxlength="255" rows="3"></textarea>
                <span class="form-error" id="err-po_action_text"></span>
            </div>
            <div class="po-footer">
                <div class="po-footer-right">
                    <button type="button" class="po-btn" id="poActionBack">Go Back</button>
                    <button type="submit" class="po-btn danger" id="poActionConfirm">Confirm</button>
                </div>
            </div>
        </form>
    </div>
</div>
    `;
}
