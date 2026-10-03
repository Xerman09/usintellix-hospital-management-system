export function SupplierInvoicesView() {
    return `
<style>
.si-page { width: 100%; font-size: 13.5px; }
.si-page [hidden] { display: none !important; }

.si-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.si-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.si-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 720px; }
.si-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.si-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.si-btn:hover { background: var(--bg-surface-alt); }
.si-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.si-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.si-btn.success { border-color: #16a34a; background: #16a34a; color: #fff; }
.si-btn.success:hover { background: #15803d; border-color: #15803d; }
.si-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.si-btn.danger:hover { background: #fee2e2; }
.si-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.si-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.si-btn.link { border: none; background: none; color: var(--accent-text, var(--accent)); padding: 0 4px; height: auto; }
.si-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .si-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .si-btn.danger:hover { background: rgba(239,68,68,.15); }
:root[data-theme="dark"] .si-btn.danger.solid { color: #fff; }

.si-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.si-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); text-align: left; font-family: inherit; }
.si-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.si-stat span { font-size: 12px; color: var(--text-muted); }
.si-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .si-stat.warn strong { color: #fcd34d; }

.si-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.si-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.si-tabs button:last-child { border-right: none; }
.si-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.si-tabs .count { margin-left: 4px; font-weight: 700; color: var(--text-muted); }

.si-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.si-filters input[type="text"] { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; min-width: 280px; }
.si-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.si-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.si-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.si-table th {
    text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.si-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.si-table tbody tr:last-child td { border-bottom: none; }
.si-table .num { text-align: right; white-space: nowrap; }
.si-table tr.si-row { cursor: pointer; }
.si-table tr.si-row:hover td { background: var(--bg-surface-alt); }
.si-table tr.is-cancelled td { color: var(--text-muted); }
.si-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.si-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.si-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.si-badge.draft { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.si-badge.pending_approval { background: #fef3c7; color: #92400e; }
.si-badge.approved { background: #dcfce7; color: #166534; }
.si-badge.rejected { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.si-badge.cancelled { background: #fee2e2; color: #991b1b; }
:root[data-theme="dark"] .si-badge.pending_approval { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .si-badge.approved { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .si-badge.rejected { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .si-badge.cancelled { background: rgba(239,68,68,.18); color: #fecaca; }

.si-match { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.si-match.matched, .si-match.under_billed { background: #dcfce7; color: #166534; }
.si-match.variance, .si-match.qty_variance, .si-match.price_variance, .si-match.vat_mismatch { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
.si-match.not_received { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.si-match.pending { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .si-match.matched, :root[data-theme="dark"] .si-match.under_billed { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .si-match.variance, :root[data-theme="dark"] .si-match.qty_variance,
:root[data-theme="dark"] .si-match.price_variance, :root[data-theme="dark"] .si-match.vat_mismatch { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .si-match.not_received { background: rgba(239,68,68,.18); color: #fecaca; border-color: rgba(239,68,68,.5); }

.si-back { margin-bottom: 10px; }
.si-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.si-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.si-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.si-grid .span-2 { grid-column: span 2; }
.si-grid .span-3 { grid-column: 1 / -1; }
.si-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.si-field .req { color: #dc2626; margin-left: 2px; }
.si-field input, .si-field select, .si-field textarea, .si-lines input, .si-lines select {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.si-field textarea { height: auto; min-height: 56px; padding: 8px 10px; resize: vertical; }
.si-field .form-error, .si-lines .form-error { display: block; }
.si-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.si-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px 20px; margin: 0; }
.si-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.si-info dd { margin: 2px 0 0; color: var(--text-primary); }

.si-receipts { display: grid; gap: 6px; }
.si-receipt { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; }
.si-receipt:hover { background: var(--bg-surface-alt); }
.si-receipt input { margin-top: 3px; accent-color: var(--accent); }
.si-receipt .grow { flex: 1; min-width: 0; }
.si-receipt strong { color: var(--text-primary); }

.si-lines-wrap { overflow-x: auto; }
.si-lines { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1060px; }
.si-lines th { text-align: left; padding: 8px; white-space: nowrap; color: var(--text-muted); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.si-lines td { padding: 9px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-primary); }
.si-lines .num { text-align: right; white-space: nowrap; }
.si-lines input[type="number"] { text-align: right; padding: 0 8px; }
.si-lines .col-qty { width: 92px; }
.si-lines .col-unit { width: 120px; }
.si-lines .col-price { width: 110px; }
.si-lines .col-disc { width: 100px; }
.si-lines .col-vat { width: 118px; }
.si-lines .col-amt { width: 120px; }
.si-lines .col-match { width: 210px; }
.si-lines tr.is-extra td { background: rgba(245,158,11,.05); }
.si-lines tr.is-flagged td { background: rgba(245,158,11,.07); }
.si-lines tr.is-missing td { background: rgba(239,68,68,.06); }
.si-item-name { font-weight: 600; }
.si-chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); white-space: nowrap; margin: 4px 4px 0 0; }
.si-chip.extra { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
:root[data-theme="dark"] .si-chip.extra { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
.si-match-note { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.35; }
.si-remove { width: 28px; height: 28px; border-radius: 6px; border: 1px solid transparent; background: none; color: var(--text-muted); font-size: 17px; cursor: pointer; line-height: 1; }
.si-remove:hover { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; }
.si-add { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; }
.si-add select { flex: 0 1 420px; min-width: 0; max-width: 100%; height: 34px; padding: 0 10px; border-radius: 6px; border: 1px dashed var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; }

.si-bottom { display: grid; grid-template-columns: 1fr 360px; gap: 14px; align-items: start; }
.si-totals { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; font-size: 13px; align-items: center; }
.si-totals .label { color: var(--text-muted); }
.si-totals .val { text-align: right; font-variant-numeric: tabular-nums; }
.si-totals input { width: 120px; height: 32px; text-align: right; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-family: inherit; }
.si-totals .grand { font-size: 17px; font-weight: 800; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-color); }

.si-summary { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); font-size: 13px; color: var(--text-primary); }
.si-summary.matched { border-color: #86efac; background: #f0fdf4; }
.si-summary.variance { border-color: #f59e0b; background: #fffbeb; }
:root[data-theme="dark"] .si-summary.matched { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .si-summary.variance { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
.si-summary strong { display: block; font-size: 14px; margin-bottom: 4px; }
.si-summary ul { margin: 6px 0 0; padding-left: 18px; color: var(--text-muted); }
.si-summary li { margin: 2px 0; }

.si-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.si-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.si-banner span { font-size: 12.5px; color: var(--text-muted); }
.si-banner.pending_approval { border-color: #f59e0b; background: #fffbeb; }
.si-banner.approved { border-color: #86efac; background: #f0fdf4; }
.si-banner.rejected { border-color: #fdba74; background: #fff7ed; }
.si-banner.cancelled { border-color: #fca5a5; background: #fef2f2; }
:root[data-theme="dark"] .si-banner.pending_approval { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .si-banner.approved { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .si-banner.rejected { background: rgba(249,115,22,.10); border-color: rgba(249,115,22,.45); }
:root[data-theme="dark"] .si-banner.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }

.si-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.si-detail-head h2 { margin: 0; font-size: 18px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.si-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.si-timeline li { padding-left: 14px; border-left: 3px solid var(--border-color); color: var(--text-primary); font-size: 13px; }
.si-timeline li.approved, .si-timeline li.paid, .si-timeline li.partially_paid { border-left-color: #16a34a; }
.si-timeline li.payment_voided { border-left-color: #dc2626; }
.si-timeline li.rejected, .si-timeline li.cancelled { border-left-color: #dc2626; }
.si-timeline li.submitted, .si-timeline li.resubmitted { border-left-color: #f59e0b; }
.si-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.si-timeline .note { display: block; font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

.si-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.si-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.si-dialog-summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.si-dialog-summary dt { color: var(--text-muted); }
.si-dialog-summary dd { margin: 0; min-width: 0; overflow-wrap: break-word; color: var(--text-primary); text-align: right; font-weight: 600; }
.si-dialog textarea { width: 100%; min-height: 76px; padding: 8px 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical; }
.si-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 4px 0; color: var(--text-primary); }
.si-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }

@media (max-width: 900px) {
    .si-grid { grid-template-columns: 1fr 1fr; }
    .si-bottom { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
    .si-grid { grid-template-columns: 1fr; }
    .si-dialog-summary { grid-template-columns: 1fr; gap: 2px; }
    .si-dialog-summary dd { text-align: left; margin-bottom: 6px; }
    .si-grid .span-2 { grid-column: auto; }
    .si-filters input[type="text"] { min-width: 0; width: 100%; }
    .si-count { margin-left: 0; }
}
</style>

<div class="si-page">

    <!-- List -->
    <div id="siListPanel">
        <div class="si-header">
            <div>
                <h1>Supplier Invoices</h1>
                <p>Record each supplier's bill and match it against the purchase order and what was actually received,
                before it is approved for payment.</p>
            </div>
            <div class="si-actions">
                <button type="button" class="si-btn primary" id="siNewBtn" hidden>+ New Supplier Invoice</button>
            </div>
        </div>

        <div class="si-stats">
            <div class="si-stat warn"><strong id="siStatPending">0</strong><span>Waiting for approval</span></div>
            <div class="si-stat warn"><strong id="siStatVariance">0</strong><span>With differences to review</span></div>
            <div class="si-stat"><strong id="siStatApproved">0</strong><span>Approved for payment</span></div>
            <div class="si-stat"><strong id="siStatUnbilled">0</strong><span>Orders with deliveries not billed</span></div>
        </div>

        <div class="si-tabs" role="tablist" id="siTabs"></div>

        <div class="si-filters">
            <input type="text" id="siSearch" placeholder="Search AP no., supplier invoice no., supplier, PO or RR no....">
            <span class="si-count" id="siCount"></span>
        </div>

        <div id="siList"><div class="si-empty">Loading...</div></div>
    </div>

    <!-- Pick the order to bill -->
    <div id="siPickPanel" hidden>
        <button type="button" class="si-btn small si-back" data-si-back>&larr; Back to supplier invoices</button>
        <div class="si-header">
            <div>
                <h1>New Supplier Invoice</h1>
                <p>Choose the purchase order the supplier is billing. Only orders with deliveries that aren't billed yet are listed.</p>
            </div>
        </div>
        <div class="si-filters">
            <input type="text" id="siPickSearch" placeholder="Search PO number or supplier...">
        </div>
        <div id="siPickList"></div>
    </div>

    <!-- Record / edit -->
    <div id="siEditPanel" hidden>
        <button type="button" class="si-btn small si-back" data-si-back>&larr; Back to supplier invoices</button>

        <div class="si-header">
            <div>
                <h1 id="siEditTitle">New Supplier Invoice</h1>
                <p id="siEditSub"></p>
            </div>
        </div>

        <div id="siEditAlert"></div>

        <form id="siForm" novalidate>
            <div class="si-card">
                <div class="si-card-title">Supplier's Invoice</div>
                <div class="si-grid">
                    <div class="si-field">
                        <label for="si_supplier_invoice_no">Supplier Invoice No.<span class="req">*</span></label>
                        <input type="text" id="si_supplier_invoice_no" maxlength="100" placeholder="As printed on the invoice">
                        <span class="form-error" id="err-si_supplier_invoice_no"></span>
                    </div>
                    <div class="si-field">
                        <label for="si_invoice_date">Invoice Date<span class="req">*</span></label>
                        <input type="date" id="si_invoice_date">
                        <span class="form-error" id="err-si_invoice_date"></span>
                    </div>
                    <div class="si-field">
                        <label for="si_due_date">Due Date</label>
                        <input type="date" id="si_due_date">
                        <span class="si-hint" id="siTermsHint"></span>
                        <span class="form-error" id="err-si_due_date"></span>
                    </div>
                    <div class="si-field span-3">
                        <label for="si_notes">Notes</label>
                        <input type="text" id="si_notes" maxlength="2000" placeholder="e.g. Received by accounting on Oct 3">
                    </div>
                </div>
                <dl class="si-info" id="siOrderInfo" style="margin-top:14px;"></dl>
                <span class="form-error" id="err-si_purchase_order_id"></span>
            </div>

            <div class="si-card">
                <div class="si-card-title">
                    <span>Deliveries Billed <span style="text-transform:none;font-weight:500;">(receiving reports)</span></span>
                </div>
                <span class="form-error" id="err-si_receipt_ids"></span>
                <div class="si-receipts" id="siReceipts"></div>
            </div>

            <div class="si-card">
                <div class="si-card-title">
                    <span>Lines Billed</span>
                    <span class="si-actions">
                        <button type="button" class="si-btn small" id="siRefill" title="Rebuild the lines from the chosen deliveries at the order's prices">Refill from deliveries</button>
                    </span>
                </div>
                <p class="si-hint" style="margin:-6px 0 10px;">Lines start with what was received at the order's prices. Change them to what the supplier's invoice actually says &mdash; prices are before VAT.</p>
                <span class="form-error" id="err-si_items"></span>
                <div id="siLines"></div>
                <div class="si-add">
                    <select id="siAddLine" aria-label="Add an order line"></select>
                    <span class="si-hint" style="margin:0;">For an order line the supplier billed that isn't in these deliveries.</span>
                </div>
            </div>

            <div class="si-bottom">
                <div id="siMatchSummary" class="si-summary">Checking against the order and deliveries...</div>
                <div class="si-card" style="margin:0;">
                    <div class="si-totals">
                        <span class="label">Subtotal</span><span class="val" id="siSubtotal">₱0.00</span>
                        <span class="label">Discounts</span><span class="val" id="siDiscounts">₱0.00</span>
                        <span class="label">VAT (12%)</span><span class="val" id="siVat">₱0.00</span>
                        <label class="label" for="si_other_charges">Delivery / Other Charges</label>
                        <span class="val"><input type="number" id="si_other_charges" min="0" step="0.01" placeholder="0.00"></span>
                        <span class="label grand">Invoice Total</span><span class="val grand" id="siTotal">₱0.00</span>
                    </div>
                    <span class="si-hint" id="siChargesHint"></span>
                    <span class="form-error" id="err-si_other_charges"></span>
                </div>
            </div>

            <div class="si-footer">
                <button type="button" class="si-btn danger" id="siDeleteDraft" hidden>Delete Draft</button>
                <div class="si-footer-right">
                    <button type="button" class="si-btn" data-si-back>Cancel</button>
                    <button type="button" class="si-btn" id="siSaveDraft">Save Draft</button>
                    <button type="submit" class="si-btn primary" id="siSubmit">Submit for Approval</button>
                </div>
            </div>
        </form>
    </div>

    <!-- Detail -->
    <div id="siDetailPanel" hidden>
        <button type="button" class="si-btn small si-back" data-si-back>&larr; Back to supplier invoices</button>
        <div id="siDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="siDialogOverlay">
    <div class="modal-box si-dialog" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="siDialogTitle">
        <div class="modal-header">
            <h2 id="siDialogTitle"></h2>
            <button type="button" class="modal-close" id="siDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="siDialogBody"></div>
        <div id="siDialogAlert"></div>
        <div id="siDialogField">
            <label for="siDialogText" id="siDialogLabel"></label>
            <textarea id="siDialogText" maxlength="500"></textarea>
            <span class="form-error" id="err-si_dialog"></span>
        </div>
        <div class="si-footer">
            <div class="si-footer-right">
                <button type="button" class="si-btn" id="siDialogCancel">Go Back</button>
                <button type="button" class="si-btn primary" id="siDialogOk">Confirm</button>
            </div>
        </div>
    </div>
</div>
    `;
}
