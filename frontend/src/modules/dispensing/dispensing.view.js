export function DispensingView() {
    return `
<style>
.dp-page { width: 100%; font-size: 13.5px; }
.dp-page [hidden] { display: none !important; }
.dp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.dp-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.dp-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 820px; }
.dp-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.dp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.dp-btn:hover { background: var(--bg-surface-alt); }
.dp-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.dp-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.dp-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.dp-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.dp-btn:disabled { opacity: .5; cursor: not-allowed; }

.dp-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; max-width: 100%; }
.dp-tabs button { height: 34px; padding: 0 12px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.dp-tabs button:last-child { border-right: none; }
.dp-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.dp-tabs .dp-count { display: inline-block; min-width: 18px; padding: 0 5px; margin-left: 4px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 11px; line-height: 18px; }
.dp-tabs .dp-count.warn { background: #dc2626; }
.dp-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.dp-toolbar input[type="search"] { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; flex: 1 1 240px; min-width: 0; }

.dp-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.dp-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.dp-card-title small { text-transform: none; font-weight: 400; letter-spacing: 0; }
.dp-table-wrap { overflow-x: auto; }
.dp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dp-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.dp-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.dp-table tbody tr:last-child td { border-bottom: none; }
.dp-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.dp-table.wide { min-width: 900px; }
.dp-table tr.dp-click { cursor: pointer; }
.dp-table tr.dp-click:hover td { background: var(--bg-surface-alt); }
.dp-table tr.done td { color: var(--text-muted); }
.dp-table tr.has-error td { background: #fef2f2; }
:root[data-theme="dark"] .dp-table tr.has-error td { background: rgba(239,68,68,.10); }
.dp-table input, .dp-table select { height: 32px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; max-width: 100%; }
.dp-table input.dp-qty { width: 90px; text-align: right; }
.dp-table select.dp-lot { min-width: 190px; }
.dp-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.dp-err { display: block; font-size: 11.5px; color: #b91c1c; margin-top: 3px; }
:root[data-theme="dark"] .dp-err { color: #fca5a5; }
.dp-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.dp-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

.dp-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.dp-badge.pending { background: #e0f2fe; color: #075985; }
.dp-badge.partial { background: #fef3c7; color: #92400e; }
.dp-badge.dispensed { background: #dcfce7; color: #166534; }
.dp-badge.closed, .dp-badge.none, .dp-badge.voided { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.dp-badge.expired, .dp-badge.dd { background: #fee2e2; color: #991b1b; }
:root[data-theme="dark"] .dp-badge.pending { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .dp-badge.partial { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .dp-badge.dispensed { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .dp-badge.expired, :root[data-theme="dark"] .dp-badge.dd { background: rgba(239,68,68,.18); color: #fecaca; }

.dp-banner { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 12.5px; border: 1px solid; }
.dp-banner.bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.dp-banner.warn { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.dp-banner.ok { border-color: #86efac; background: #f0fdf4; color: #166534; justify-content: space-between; flex-wrap: wrap; }
:root[data-theme="dark"] .dp-banner.bad { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); color: #fecaca; }
:root[data-theme="dark"] .dp-banner.warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); color: #fde68a; }
:root[data-theme="dark"] .dp-banner.ok { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); color: #bbf7d0; }

.dp-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px 16px; }
.dp-facts div span { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.dp-facts div strong { display: block; font-size: 13.5px; color: var(--text-primary); overflow-wrap: anywhere; }
.dp-form-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
.dp-form-row label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.dp-form-row select, .dp-form-row input { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; text-transform: none; letter-spacing: 0; font-weight: 400; min-width: 0; }
.dp-form-row .dp-grow { flex: 1 1 260px; }
.dp-history { display: flex; flex-direction: column; gap: 10px; }
.dp-hist { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; }
.dp-hist.voided { opacity: .75; }
.dp-hist-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: center; }
.dp-hist ul { margin: 6px 0 0; padding-left: 18px; }

.dp-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.dp-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 0 0 4px; color: var(--text-primary); }
.dp-dialog textarea { width: 100%; box-sizing: border-box; min-height: 70px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.dp-dialog ul { margin: 0 0 10px; padding-left: 18px; font-size: 13px; }
.dp-dialog-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

@media (max-width: 700px) {
    .dp-form-row { flex-direction: column; align-items: stretch; }
    .dp-form-row .dp-grow { flex: none; }
}
</style>

<div class="dp-page">
    <div class="dp-header">
        <div>
            <h1>Dispensing</h1>
            <p>Prescriptions waiting at the pharmacy. Open one, choose where you're giving the medicines from, and dispense all or part of it — stock goes down, the earliest-expiring usable lot is used first, and the Medicine Ledger records it against the patient.</p>
        </div>
    </div>

    <div id="dpQueuePanel">
        <div class="dp-toolbar">
            <div class="dp-tabs" id="dpViews" role="tablist">
                <button type="button" data-dp-view="to_fill" class="active">To dispense <span class="dp-count" id="dpCountToFill" hidden></span></button>
                <button type="button" data-dp-view="refills">Refill requests <span class="dp-count" id="dpCountRefills" hidden></span></button>
                <button type="button" data-dp-view="partial">Partly dispensed</button>
                <button type="button" data-dp-view="expired">Expired <span class="dp-count warn" id="dpCountExpired" hidden></span></button>
                <button type="button" data-dp-view="dispensed">Dispensed</button>
                <button type="button" data-dp-view="closed">Closed</button>
                <button type="button" data-dp-view="all">All</button>
            </div>
            <input type="search" id="dpSearch" placeholder="Patient name or number, or Rx number" aria-label="Search prescriptions">
            <button type="button" class="dp-btn" id="dpRefresh">Refresh</button>
        </div>
        <div id="dpQueue"><div class="dp-empty">Loading...</div></div>
    </div>

    <div id="dpDetailPanel" hidden>
        <div class="dp-actions" style="margin-bottom:12px;">
            <button type="button" class="dp-btn" id="dpBack">&larr; Back to the queue</button>
        </div>
        <div id="dpDetail"></div>
    </div>
</div>

<div class="modal-overlay" id="dpDialogOverlay">
    <div class="modal-box dp-dialog" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="dpDialogTitle">
        <div class="modal-header">
            <h2 id="dpDialogTitle"></h2>
            <button type="button" class="modal-close" id="dpDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="dpDialogBody"></div>
        <div id="dpDialogAlert"></div>
        <div class="dp-dialog-foot">
            <button type="button" class="dp-btn" id="dpDialogCancel">Go Back</button>
            <button type="button" class="dp-btn primary" id="dpDialogOk">Confirm</button>
        </div>
    </div>
</div>
    `;
}
