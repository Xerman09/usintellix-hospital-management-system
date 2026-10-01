export function ReceivingView() {
    return `
<style>
.rv-page { width: 100%; font-size: 13.5px; }
.rv-page [hidden] { display: none !important; }

.rv-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.rv-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.rv-header p { margin: 0; color: var(--text-muted); font-size: 13px; }
.rv-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.rv-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit;
}
.rv-btn:hover { background: var(--bg-surface-alt); }
.rv-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.rv-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.rv-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.rv-btn.link { border: none; background: none; color: var(--accent-text, var(--accent)); padding: 0 4px; height: auto; }
.rv-btn:disabled { opacity: .5; cursor: not-allowed; }

.rv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.rv-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.rv-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.rv-stat span { font-size: 12px; color: var(--text-muted); }
.rv-stat.warn strong { color: #b45309; }
:root[data-theme="dark"] .rv-stat.warn strong { color: #fcd34d; }

.rv-tabs { display: inline-flex; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.rv-tabs button { height: 34px; padding: 0 16px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.rv-tabs button:last-child { border-right: none; }
.rv-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.rv-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.rv-filters input[type="text"] { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; min-width: 260px; }
.rv-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.rv-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.rv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rv-table th {
    text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.rv-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.rv-table tbody tr:last-child td { border-bottom: none; }
.rv-table .num { text-align: right; white-space: nowrap; }
.rv-table tr.rv-row { cursor: pointer; }
.rv-table tr.rv-row:hover td { background: var(--bg-surface-alt); }
.rv-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.rv-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

.rv-progress { width: 140px; }
.rv-bar { height: 6px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; margin-bottom: 4px; }
.rv-bar span { display: block; height: 100%; background: #16a34a; }

.rv-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.rv-badge.approved { background: #dcfce7; color: #166534; }
.rv-badge.partially_received { background: #e0f2fe; color: #075985; }
.rv-badge.received { background: #ede9fe; color: #5b21b6; }
.rv-badge.overdue { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; margin-left: 4px; }
.rv-badge.rejected { background: #fee2e2; color: #991b1b; }
:root[data-theme="dark"] .rv-badge.approved { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .rv-badge.partially_received { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .rv-badge.received { background: rgba(139,92,246,.2); color: #ddd6fe; }
:root[data-theme="dark"] .rv-badge.overdue { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .rv-badge.rejected { background: rgba(239,68,68,.18); color: #fecaca; }

/* Receive form + receipt detail */
.rv-back { margin-bottom: 10px; }
.rv-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; }
.rv-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.rv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.rv-grid .span-3 { grid-column: 1 / -1; }
.rv-field > label { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.rv-field label .req, .rv-lines .req { color: #dc2626; margin-left: 2px; }
.rv-field input, .rv-field select, .rv-field textarea, .rv-lines input {
    width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.rv-field textarea { height: auto; min-height: 56px; padding: 8px 10px; resize: vertical; }
.rv-field .form-error, .rv-lines .form-error { display: block; }
.rv-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.rv-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px 20px; }
.rv-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.rv-info dd { margin: 2px 0 0; color: var(--text-primary); }

.rv-lines-wrap { overflow-x: auto; }
.rv-lines { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 980px; }
.rv-lines th { text-align: left; padding: 8px 8px; white-space: nowrap; color: var(--text-muted); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.rv-lines td { padding: 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; color: var(--text-primary); }
.rv-lines tr.lot-extra td { border-top: none; }
.rv-lines tr.line-start td { border-top: 2px solid var(--border-color); }
.rv-lines input[type="number"] { text-align: right; padding: 0 8px; }
.rv-lines .col-qty { width: 96px; }
.rv-lines .col-lot { width: 140px; }
.rv-lines .col-exp { width: 150px; }
.rv-lines .col-rej { width: 90px; }
.rv-lines .col-reason { width: 180px; }
.rv-lines .num { text-align: right; white-space: nowrap; }
.rv-item-name { font-weight: 600; }
.rv-qtybar { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.rv-chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); white-space: nowrap; }
.rv-chip.todo { background: #e0f2fe; color: #075985; border-color: transparent; }
:root[data-theme="dark"] .rv-chip.todo { background: rgba(14,165,233,.18); color: #bae6fd; }
.rv-unit { display: block; font-size: 11px; color: var(--text-muted); margin-top: 3px; text-align: right; }
.rv-remove { width: 28px; height: 28px; border-radius: 6px; border: 1px solid transparent; background: none; color: var(--text-muted); font-size: 17px; cursor: pointer; line-height: 1; }
.rv-remove:hover { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; }
.rv-done-note { margin-top: 10px; font-size: 12.5px; color: var(--text-muted); }

.rv-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.rv-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.rv-summary { font-size: 13px; color: var(--text-muted); }
.rv-summary strong { color: var(--text-primary); }

.rv-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid #86efac; background: #f0fdf4; }
.rv-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.rv-banner span { font-size: 12.5px; color: var(--text-muted); }
:root[data-theme="dark"] .rv-banner { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }

.rv-confirm-summary { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.rv-confirm-summary dt { color: var(--text-muted); }
.rv-confirm-summary dd { margin: 0; min-width: 0; overflow-wrap: anywhere; color: var(--text-primary); text-align: right; font-weight: 600; }
.rv-confirm-note { margin: 0; font-size: 12.5px; color: var(--text-muted); }

@media (max-width: 900px) { .rv-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) {
    .rv-grid { grid-template-columns: 1fr; }
    .rv-filters input[type="text"] { min-width: 0; width: 100%; }
    .rv-count { margin-left: 0; }
}
</style>

<div class="rv-page">

    <!-- Lists -->
    <div id="rvListPanel">
        <div class="rv-header">
            <div>
                <h1>Receiving</h1>
                <p>Receive deliveries against approved purchase orders. What you receive goes straight into stock.</p>
            </div>
        </div>

        <div class="rv-stats">
            <div class="rv-stat"><strong id="rvStatAwaiting">0</strong><span>Ready for receiving</span></div>
            <div class="rv-stat warn"><strong id="rvStatOverdue">0</strong><span>Past expected delivery</span></div>
            <div class="rv-stat"><strong id="rvStatPartial">0</strong><span>Partially received</span></div>
            <div class="rv-stat"><strong id="rvStatMonth">0</strong><span>Deliveries received this month</span></div>
        </div>

        <div class="rv-tabs" role="tablist">
            <button type="button" class="active" data-rv-tab="pending" role="tab">Ready for Receiving</button>
            <button type="button" data-rv-tab="received" role="tab">Received Deliveries</button>
        </div>

        <div class="rv-filters">
            <input type="text" id="rvSearch" placeholder="Search PO / RR number, supplier, DR or invoice no....">
            <span class="rv-count" id="rvCount"></span>
        </div>

        <div id="rvList"><div class="rv-empty">Loading...</div></div>
    </div>

    <!-- Receive a delivery -->
    <div id="rvFormPanel" hidden>
        <button type="button" class="rv-btn small rv-back" data-rv-back>&larr; Back to receiving</button>

        <div class="rv-header">
            <div>
                <h1 id="rvFormTitle">Receive Delivery</h1>
                <p id="rvFormSub"></p>
            </div>
        </div>

        <div id="rvFormAlert"></div>

        <form id="rvForm" novalidate>
            <div class="rv-card">
                <div class="rv-card-title">Order</div>
                <dl class="rv-info" id="rvOrderInfo"></dl>
            </div>

            <div class="rv-card">
                <div class="rv-card-title">Delivery</div>
                <div class="rv-grid">
                    <div class="rv-field">
                        <label for="rv_received_date">Date Received<span class="req">*</span></label>
                        <input type="date" id="rv_received_date">
                        <span class="form-error" id="err-rv_received_date"></span>
                    </div>
                    <div class="rv-field">
                        <label for="rv_warehouse_id">Received Into<span class="req">*</span></label>
                        <select id="rv_warehouse_id"></select>
                        <span class="form-error" id="err-rv_warehouse_id"></span>
                    </div>
                    <div class="rv-field">
                        <label for="rv_delivery_receipt_no">Supplier's Delivery Receipt (DR) No.</label>
                        <input type="text" id="rv_delivery_receipt_no" maxlength="100" placeholder="From the supplier's DR">
                    </div>
                    <div class="rv-field">
                        <label for="rv_invoice_no">Supplier's Invoice (SI) No.</label>
                        <input type="text" id="rv_invoice_no" maxlength="100" placeholder="If the invoice came with it">
                    </div>
                    <div class="rv-field" style="grid-column: span 2;">
                        <label for="rv_notes">Notes</label>
                        <input type="text" id="rv_notes" maxlength="2000" placeholder="e.g. Delivered by J. Cruz, checked by pharmacy">
                    </div>
                </div>
            </div>

            <div class="rv-card">
                <div class="rv-card-title">
                    <span>Items Delivered</span>
                    <span class="rv-actions">
                        <button type="button" class="rv-btn small" id="rvFillAll">Fill all remaining</button>
                        <button type="button" class="rv-btn small" id="rvClearAll">Clear all</button>
                    </span>
                </div>
                <span class="form-error" id="err-rv_items"></span>
                <div id="rvLines"></div>
            </div>

            <div class="rv-footer">
                <span class="rv-summary" id="rvSummary"></span>
                <div class="rv-footer-right">
                    <button type="button" class="rv-btn" data-rv-back>Cancel</button>
                    <button type="submit" class="rv-btn primary" id="rvSave">Receive Into Stock</button>
                </div>
            </div>
        </form>
    </div>

    <!-- A saved receipt -->
    <div id="rvDetailPanel" hidden>
        <button type="button" class="rv-btn small rv-back" data-rv-back>&larr; Back to receiving</button>
        <div id="rvDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="rvConfirmOverlay">
    <div class="modal-box" style="max-width: 480px;" role="dialog" aria-modal="true" aria-labelledby="rvConfirmTitle">
        <div class="modal-header">
            <h2 id="rvConfirmTitle">Receive into stock?</h2>
            <button type="button" class="modal-close" id="rvConfirmClose" aria-label="Close">&times;</button>
        </div>
        <div id="rvConfirmBody"></div>
        <div class="rv-footer">
            <div class="rv-footer-right">
                <button type="button" class="rv-btn" id="rvConfirmCancel">Go Back</button>
                <button type="button" class="rv-btn primary" id="rvConfirmOk">Receive Into Stock</button>
            </div>
        </div>
    </div>
</div>
    `;
}
