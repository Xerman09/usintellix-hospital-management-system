export function PayablesView() {
    return `
<style>
.ap-page { width: 100%; font-size: 13.5px; }
.ap-page [hidden] { display: none !important; }

.ap-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.ap-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ap-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 720px; }
.ap-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.ap-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.ap-btn:hover { background: var(--bg-surface-alt); }
.ap-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.ap-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.ap-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.ap-btn.danger:hover { background: #fee2e2; }
.ap-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.ap-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.ap-btn.link { border: none; background: none; color: var(--accent-text, var(--accent)); padding: 0 4px; height: auto; }
.ap-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .ap-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .ap-btn.danger:hover { background: rgba(239,68,68,.15); }
:root[data-theme="dark"] .ap-btn.danger.solid { color: #fff; }

.ap-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px; }
.ap-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.ap-stat strong { font-size: 20px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.ap-stat span { font-size: 12px; color: var(--text-muted); }
.ap-stat.bad strong { color: #b91c1c; }
.ap-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .ap-stat.bad strong { color: #fca5a5; }
:root[data-theme="dark"] .ap-stat.warn strong { color: #fcd34d; }

.ap-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.ap-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ap-tabs button:last-child { border-right: none; }
.ap-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.ap-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.ap-filters input, .ap-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; }
.ap-filters input[type="text"] { min-width: 240px; }
.ap-filters label { font-size: 12px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; }
.ap-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.ap-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.ap-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ap-table th {
    text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.ap-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.ap-table tbody tr:last-child td { border-bottom: none; }
.ap-table tfoot td { font-weight: 700; background: var(--bg-surface-alt); border-top: 1px solid var(--border-color); }
.ap-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ap-table tr.ap-row { cursor: pointer; }
.ap-table tr.ap-row:hover td { background: var(--bg-surface-alt); }
.ap-table tr.is-voided td { color: var(--text-muted); }
.ap-table tr.is-voided td:first-child strong { text-decoration: line-through; }
.ap-table tr.ap-sub td { background: var(--bg-surface-alt); font-size: 12.5px; padding-top: 6px; padding-bottom: 6px; }
.ap-table input[type="checkbox"] { accent-color: var(--accent); width: 16px; height: 16px; }
.ap-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.ap-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.ap-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ap-badge.unpaid { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.ap-badge.partially_paid { background: #e0f2fe; color: #075985; }
.ap-badge.paid, .ap-badge.posted { background: #dcfce7; color: #166534; }
.ap-badge.overdue, .ap-badge.voided { background: #fee2e2; color: #991b1b; }
.ap-badge.soon { background: #fef3c7; color: #92400e; }
:root[data-theme="dark"] .ap-badge.partially_paid { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .ap-badge.paid, :root[data-theme="dark"] .ap-badge.posted { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .ap-badge.overdue, :root[data-theme="dark"] .ap-badge.voided { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .ap-badge.soon { background: rgba(245,158,11,.18); color: #fde68a; }

.ap-selbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; margin-bottom: 10px; border-radius: 10px; border: 1px solid var(--accent); background: var(--accent-light); }
.ap-selbar span { font-size: 13px; color: var(--text-primary); }

.ap-back { margin-bottom: 10px; }
.ap-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.ap-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.ap-grid .span-3 { grid-column: 1 / -1; }
.ap-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.ap-field .req { color: #dc2626; margin-left: 2px; }
.ap-field input, .ap-field select, .ap-alloc input {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.ap-field .form-error, .ap-alloc .form-error { display: block; }
.ap-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }
.ap-alloc input { text-align: right; width: 130px; }

.ap-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; margin: 0; }
.ap-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.ap-info dd { margin: 2px 0 0; color: var(--text-primary); }

.ap-totals { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; font-size: 13px; max-width: 380px; margin-left: auto; }
.ap-totals .label { color: var(--text-muted); }
.ap-totals .val { text-align: right; font-variant-numeric: tabular-nums; }
.ap-totals .grand { font-size: 17px; font-weight: 800; color: var(--text-primary); padding-top: 8px; border-top: 1px solid var(--border-color); }

.ap-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid #86efac; background: #f0fdf4; }
.ap-banner.voided { border-color: #fca5a5; background: #fef2f2; }
.ap-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.ap-banner span { font-size: 12.5px; color: var(--text-muted); }
:root[data-theme="dark"] .ap-banner { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .ap-banner.voided { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }

.ap-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.ap-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.ap-dialog-summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.ap-dialog-summary dt { color: var(--text-muted); }
.ap-dialog-summary dd { margin: 0; min-width: 0; overflow-wrap: break-word; color: var(--text-primary); text-align: right; font-weight: 600; }
.ap-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.ap-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 4px 0; color: var(--text-primary); }
.ap-dialog textarea { width: 100%; min-height: 70px; padding: 8px 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical; }

@media (max-width: 900px) { .ap-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) {
    .ap-grid { grid-template-columns: 1fr; }
    .ap-filters input[type="text"] { min-width: 0; width: 100%; }
    .ap-count { margin-left: 0; }
    .ap-dialog-summary { grid-template-columns: 1fr; gap: 2px; }
    .ap-dialog-summary dd { text-align: left; margin-bottom: 6px; }
}
</style>

<div class="ap-page">

    <!-- Overview: bills, payments, aging, ledger -->
    <div id="apMainPanel">
        <div class="ap-header">
            <div>
                <h1>Accounts Payable</h1>
                <p>What the hospital owes its suppliers: approved supplier invoices, when they're due, and the payments made against them.</p>
            </div>
            <div class="ap-actions">
                <button type="button" class="ap-btn primary" id="apPayBtn">+ Record Payment</button>
            </div>
        </div>

        <div class="ap-stats">
            <div class="ap-stat"><strong id="apStatPayable">₱0.00</strong><span id="apStatPayableSub">Total payable</span></div>
            <div class="ap-stat bad"><strong id="apStatOverdue">₱0.00</strong><span id="apStatOverdueSub">Overdue</span></div>
            <div class="ap-stat warn"><strong id="apStatWeek">₱0.00</strong><span id="apStatWeekSub">Due in the next 7 days</span></div>
            <div class="ap-stat"><strong id="apStatPaid">₱0.00</strong><span>Paid this month</span></div>
        </div>

        <div class="ap-tabs" role="tablist">
            <button type="button" class="active" data-ap-tab="bills" role="tab">Open Bills</button>
            <button type="button" data-ap-tab="payments" role="tab">Payments</button>
            <button type="button" data-ap-tab="aging" role="tab">Aging</button>
            <button type="button" data-ap-tab="ledger" role="tab">Supplier Ledger</button>
        </div>

        <div id="apTabBody"><div class="ap-empty">Loading...</div></div>
    </div>

    <!-- Record a payment -->
    <div id="apPayPanel" hidden>
        <button type="button" class="ap-btn small ap-back" data-ap-back>&larr; Back to accounts payable</button>
        <div class="ap-header">
            <div>
                <h1>Record Payment</h1>
                <p>Pay one supplier: choose the invoices and how much goes to each. Partial payments are fine; the rest stays owed.</p>
            </div>
        </div>
        <div id="apPayAlert"></div>

        <form id="apPayForm" novalidate>
            <div class="ap-card">
                <div class="ap-card-title">Payment</div>
                <div class="ap-grid">
                    <div class="ap-field">
                        <label for="ap_supplier_id">Supplier<span class="req">*</span></label>
                        <select id="ap_supplier_id"></select>
                        <span class="form-error" id="err-ap_supplier_id"></span>
                    </div>
                    <div class="ap-field">
                        <label for="ap_payment_date">Payment Date<span class="req">*</span></label>
                        <input type="date" id="ap_payment_date">
                        <span class="form-error" id="err-ap_payment_date"></span>
                    </div>
                    <div class="ap-field">
                        <label for="ap_method">Paid By<span class="req">*</span></label>
                        <select id="ap_method">
                            <option value="check">Check</option>
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                        </select>
                        <span class="form-error" id="err-ap_method"></span>
                    </div>
                    <div class="ap-field">
                        <label for="ap_reference_no" id="apRefLabel">Check No.<span class="req">*</span></label>
                        <input type="text" id="ap_reference_no" maxlength="100">
                        <span class="form-error" id="err-ap_reference_no"></span>
                    </div>
                    <div class="ap-field" id="apCheckDateField">
                        <label for="ap_check_date">Check Date</label>
                        <input type="date" id="ap_check_date">
                        <span class="form-error" id="err-ap_check_date"></span>
                    </div>
                    <div class="ap-field">
                        <label for="ap_paid_from">Paid From</label>
                        <input type="text" id="ap_paid_from" maxlength="150" placeholder="e.g. BDO Current Account 0012">
                    </div>
                    <div class="ap-field">
                        <label for="ap_ewt_rate">Withholding Tax (EWT)</label>
                        <select id="ap_ewt_rate">
                            <option value="0">None</option>
                            <option value="1">1% — goods</option>
                            <option value="2">2% — services</option>
                            <option value="5">5%</option>
                            <option value="10">10%</option>
                            <option value="15">15%</option>
                        </select>
                        <span class="ap-hint">Computed on the amount before VAT.</span>
                        <span class="form-error" id="err-ap_ewt_rate"></span>
                    </div>
                    <div class="ap-field" style="grid-column: span 2;">
                        <label for="ap_notes">Notes</label>
                        <input type="text" id="ap_notes" maxlength="2000" placeholder="e.g. Released to supplier's collector, J. Santos">
                    </div>
                </div>
            </div>

            <div class="ap-card">
                <div class="ap-card-title">
                    <span>Invoices Paid</span>
                    <span class="ap-actions"><button type="button" class="ap-btn small" id="apPayAll">Pay all in full</button></span>
                </div>
                <span class="form-error" id="err-ap_allocations"></span>
                <div id="apAllocations"></div>
                <div class="ap-totals" style="margin-top:14px;">
                    <span class="label">Applied to invoices</span><span class="val" id="apTotApplied">₱0.00</span>
                    <span class="label">Less: tax withheld (EWT)</span><span class="val" id="apTotEwt">₱0.00</span>
                    <span class="label grand">Amount to Pay</span><span class="val grand" id="apTotCash">₱0.00</span>
                </div>
            </div>

            <div class="ap-footer">
                <div class="ap-footer-right">
                    <button type="button" class="ap-btn" data-ap-back>Cancel</button>
                    <button type="submit" class="ap-btn primary" id="apPaySave">Record Payment</button>
                </div>
            </div>
        </form>
    </div>

    <!-- Payment detail -->
    <div id="apDetailPanel" hidden>
        <button type="button" class="ap-btn small ap-back" data-ap-back>&larr; Back to accounts payable</button>
        <div id="apDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="apDialogOverlay">
    <div class="modal-box ap-dialog" style="max-width: 500px;" role="dialog" aria-modal="true" aria-labelledby="apDialogTitle">
        <div class="modal-header">
            <h2 id="apDialogTitle"></h2>
            <button type="button" class="modal-close" id="apDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="apDialogBody"></div>
        <div id="apDialogAlert"></div>
        <div id="apDialogField">
            <label for="apDialogText" id="apDialogLabel"></label>
            <textarea id="apDialogText" maxlength="255"></textarea>
            <span class="form-error" id="err-ap_dialog"></span>
        </div>
        <div class="ap-footer">
            <div class="ap-footer-right">
                <button type="button" class="ap-btn" id="apDialogCancel">Go Back</button>
                <button type="button" class="ap-btn primary" id="apDialogOk">Confirm</button>
            </div>
        </div>
    </div>
</div>
    `;
}
