export function StockCountsView() {
    return `
<style>
.sc-page { width: 100%; font-size: 13.5px; }
.sc-page [hidden] { display: none !important; }
.sc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.sc-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.sc-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.sc-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sc-btn:hover { background: var(--bg-surface-alt); }
.sc-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.sc-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.sc-btn.success { border-color: #16a34a; background: #16a34a; color: #fff; }
.sc-btn.danger { border-color: #fca5a5; color: #b91c1c; }
.sc-btn.danger:hover { background: #fee2e2; }
.sc-btn.danger.solid { background: #dc2626; border-color: #dc2626; color: #fff; }
.sc-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.sc-btn:disabled { opacity: .5; cursor: not-allowed; }
:root[data-theme="dark"] .sc-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,.5); }
:root[data-theme="dark"] .sc-btn.danger.solid { color: #fff; }

.sc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.sc-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.sc-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); overflow-wrap: anywhere; }
.sc-stat span { font-size: 12px; color: var(--text-muted); }
.sc-stat.warn strong { color: #b45309; }
.sc-stat.gain strong { color: #15803d; }
.sc-stat.loss strong { color: #b91c1c; }
:root[data-theme="dark"] .sc-stat.warn strong { color: #fcd34d; }
:root[data-theme="dark"] .sc-stat.gain strong { color: #86efac; }
:root[data-theme="dark"] .sc-stat.loss strong { color: #fca5a5; }

.sc-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.sc-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sc-tabs button:last-child { border-right: none; }
.sc-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.sc-tabs .count { margin-left: 4px; color: var(--text-muted); }

.sc-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.sc-filters input[type="text"], .sc-filters input[type="date"], .sc-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; }
.sc-filters input[type="text"] { min-width: 260px; }
.sc-filters label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; }
.sc-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.sc-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.sc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sc-table th { text-align: left; padding: 9px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.sc-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.sc-table tbody tr:last-child td { border-bottom: none; }
.sc-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-weight: 700; }
.sc-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sc-table tr.sc-row { cursor: pointer; }
.sc-table tr.sc-row:hover td { background: var(--bg-surface-alt); }
.sc-table tr.diff td { background: rgba(245,158,11,.06); }
.sc-table input, .sc-table select { height: 32px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; box-sizing: border-box; }
.sc-table input[type="number"] { width: 96px; text-align: right; }
.sc-table input[type="text"] { width: 100%; min-width: 120px; }
.sc-table input[type="date"] { width: 140px; }
.sc-table select { width: 100%; min-width: 150px; }
.sc-table .form-error { display: block; }
.sc-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.sc-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.sc-plus { color: #15803d; font-weight: 700; }
.sc-minus { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .sc-plus { color: #86efac; }
:root[data-theme="dark"] .sc-minus { color: #fca5a5; }

.sc-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sc-badge.counting { background: #e0f2fe; color: #075985; }
.sc-badge.submitted { background: #fef3c7; color: #92400e; }
.sc-badge.rejected { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.sc-badge.approved { background: #dcfce7; color: #166534; }
.sc-badge.cancelled, .sc-badge.expired { background: #fee2e2; color: #991b1b; }
.sc-badge.found, .sc-badge.partial { background: #ede9fe; color: #5b21b6; }
.sc-badge.full { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .sc-badge.counting { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .sc-badge.submitted { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .sc-badge.rejected { background: rgba(249,115,22,.18); color: #fed7aa; border-color: rgba(249,115,22,.5); }
:root[data-theme="dark"] .sc-badge.approved { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .sc-badge.cancelled, :root[data-theme="dark"] .sc-badge.expired { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .sc-badge.found, :root[data-theme="dark"] .sc-badge.partial { background: rgba(139,92,246,.2); color: #ddd6fe; }

.sc-bar { height: 6px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; margin-top: 4px; width: 120px; }
.sc-bar span { display: block; height: 100%; background: var(--accent); }

.sc-back { margin-bottom: 10px; }
.sc-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.sc-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sc-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; margin: 0; }
.sc-info dt { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.sc-info dd { margin: 2px 0 0; color: var(--text-primary); }
.sc-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

.sc-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 14px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.sc-banner strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
.sc-banner span { font-size: 12.5px; color: var(--text-muted); }
.sc-banner.submitted { border-color: #f59e0b; background: #fffbeb; }
.sc-banner.counting { border-color: #7dd3fc; background: #f0f9ff; }
.sc-banner.rejected { border-color: #fdba74; background: #fff7ed; }
.sc-banner.cancelled { border-color: #fca5a5; background: #fef2f2; }
.sc-banner.approved { border-color: #86efac; background: #f0fdf4; }
:root[data-theme="dark"] .sc-banner.submitted { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .sc-banner.counting { background: rgba(14,165,233,.10); border-color: rgba(14,165,233,.45); }
:root[data-theme="dark"] .sc-banner.rejected { background: rgba(249,115,22,.10); border-color: rgba(249,115,22,.45); }
:root[data-theme="dark"] .sc-banner.cancelled { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); }
:root[data-theme="dark"] .sc-banner.approved { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); }

.sc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 10px; }
.sc-toolbar input[type="text"] { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; flex: 0 1 300px; min-width: 0; }
.sc-toolbar label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; }
.sc-toolbar input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.sc-progress { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }
.sc-blind .sc-sys { display: none; }

.sc-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.sc-timeline li { padding-left: 14px; border-left: 3px solid var(--border-color); color: var(--text-primary); font-size: 13px; }
.sc-timeline li.approved { border-left-color: #16a34a; }
.sc-timeline li.rejected, .sc-timeline li.cancelled { border-left-color: #dc2626; }
.sc-timeline li.submitted, .sc-timeline li.resubmitted { border-left-color: #f59e0b; }
.sc-timeline .when { display: block; font-size: 11.5px; color: var(--text-muted); }
.sc-timeline .note { display: block; font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

.sc-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 0 4px; }
.sc-footer-right { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.sc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.sc-field { margin-bottom: 12px; }
.sc-field > label, .sc-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 0 0 4px; color: var(--text-primary); }
.sc-field select, .sc-field textarea, .sc-field input[type="text"], .sc-dialog textarea { width: 100%; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.sc-field select, .sc-field input[type="text"] { height: 34px; padding: 0 10px; }
.sc-field textarea, .sc-dialog textarea { min-height: 64px; padding: 8px 10px; resize: vertical; }
.sc-choice { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sc-choice label { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-weight: 400; margin: 0; }
.sc-choice label.active { border-color: var(--accent); background: var(--accent-light); }
.sc-choice strong { display: block; font-size: 13px; color: var(--text-primary); }
.sc-choice span { font-size: 12px; color: var(--text-muted); }
.sc-choice input { accent-color: var(--accent); margin-top: 2px; }
.sc-picks { max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.sc-picks label { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-weight: 400; margin: 0; cursor: pointer; color: var(--text-primary); }
.sc-picks label:last-child { border-bottom: none; }
.sc-picks input { width: 16px; height: 16px; accent-color: var(--accent); flex: none; }
.sc-picks .sc-sub { margin: 0 0 0 auto; text-align: right; }

.sc-dialog-summary { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); font-size: 13px; }
.sc-dialog-summary dt { color: var(--text-muted); }
.sc-dialog-summary dd { margin: 0; min-width: 0; overflow-wrap: break-word; color: var(--text-primary); text-align: right; font-weight: 600; }
.sc-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }

@media (max-width: 800px) { .sc-two, .sc-choice { grid-template-columns: 1fr; } }
@media (max-width: 600px) {
    .sc-filters input[type="text"] { min-width: 0; width: 100%; }
    .sc-count, .sc-progress { margin-left: 0; }
    .sc-dialog-summary { grid-template-columns: 1fr; gap: 2px; }
    .sc-dialog-summary dd { text-align: left; margin-bottom: 6px; }
}
</style>

<div class="sc-page">
    <div id="scListPanel">
        <div class="sc-header">
            <div>
                <h1>Stock Count</h1>
                <p>Count what is actually on the shelf of a storage location. The system quantity is frozen when the count starts; differences need a reason, and an administrator or the accountant approves the adjustment before stock changes.</p>
            </div>
            <div class="sc-actions">
                <button type="button" class="sc-btn" id="scReportBtn">Difference Report</button>
                <button type="button" class="sc-btn primary" id="scNewBtn" hidden>+ Start Count</button>
            </div>
        </div>
        <div class="sc-stats">
            <div class="sc-stat"><strong id="scStatOpen">0</strong><span>Counts in progress</span></div>
            <div class="sc-stat warn"><strong id="scStatMine">0</strong><span>Waiting for my approval</span></div>
            <div class="sc-stat gain"><strong id="scStatGain">₱0.00</strong><span>Gained this year (approved)</span></div>
            <div class="sc-stat loss"><strong id="scStatLoss">₱0.00</strong><span>Lost this year (approved)</span></div>
        </div>
        <div class="sc-tabs" role="tablist" id="scTabs"></div>
        <div class="sc-filters">
            <input type="text" id="scSearch" placeholder="Search SC no., location, started by...">
            <span class="sc-count" id="scCount"></span>
        </div>
        <div id="scList"><div class="sc-empty">Loading...</div></div>
    </div>

    <div id="scStartPanel" hidden>
        <button type="button" class="sc-btn small sc-back" data-sc-back>&larr; Back to counts</button>
        <div class="sc-header"><div><h1>Start a Stock Count</h1>
            <p>Starting freezes the system quantity of every lot on the sheet. Print the blind count sheet, count, then enter what was found.</p></div></div>
        <div id="scStartAlert"></div>
        <div class="sc-card">
            <div class="sc-field">
                <label for="sc_warehouse_id">Storage Location<span style="color:#dc2626;">*</span></label>
                <select id="sc_warehouse_id"></select>
                <span class="sc-hint" id="scWarehouseHint"></span>
                <span class="form-error" id="err-sc_warehouse_id"></span>
            </div>
            <div class="sc-field">
                <label>What to Count</label>
                <div class="sc-choice" id="scTypeChoice">
                    <label class="active"><input type="radio" name="sc_type" value="full" checked><div><strong>Full count</strong><span>Every lot with stock at this location.</span></div></label>
                    <label><input type="radio" name="sc_type" value="partial"><div><strong>Selected items</strong><span>A spot check, or to write off a breakage or loss. Lists every lot of the chosen items.</span></div></label>
                </div>
            </div>
            <div class="sc-field" id="scPickField" hidden>
                <label for="scPickSearch">Items to Count<span style="color:#dc2626;">*</span></label>
                <div class="sc-toolbar"><input type="text" id="scPickSearch" placeholder="Search items..."><label><input type="checkbox" id="scPickStocked" checked> Only items stocked here</label><span class="sc-progress" id="scPickCount"></span></div>
                <div class="sc-picks" id="scPicks"></div>
                <span class="form-error" id="err-sc_drug_ids"></span>
            </div>
            <div class="sc-field">
                <label for="sc_notes">Notes</label>
                <textarea id="sc_notes" maxlength="1000" placeholder="e.g. Quarterly count, counted by the night shift"></textarea>
            </div>
        </div>
        <div class="sc-footer"><div class="sc-footer-right">
            <button type="button" class="sc-btn" data-sc-back>Cancel</button>
            <button type="button" class="sc-btn primary" id="scStartBtn">Start Count</button>
        </div></div>
    </div>

    <div id="scDetailPanel" hidden>
        <button type="button" class="sc-btn small sc-back" data-sc-back>&larr; Back to counts</button>
        <div id="scDetail"></div>
    </div>

    <div id="scReportPanel" hidden>
        <button type="button" class="sc-btn small sc-back" data-sc-back>&larr; Back to counts</button>
        <div class="sc-header"><div><h1>Stock Difference Report</h1>
            <p>Every approved stock correction, with the value gained or lost at the lot's cost.</p></div>
            <div class="sc-actions"><button type="button" class="sc-btn" id="scReportPrint">Print</button></div></div>
        <div class="sc-filters">
            <label>From <input type="date" id="scRepFrom"></label>
            <label>To <input type="date" id="scRepTo"></label>
            <select id="scRepWarehouse" aria-label="Location"></select>
            <select id="scRepReason" aria-label="Reason"></select>
            <button type="button" class="sc-btn small primary" id="scRepRun">Show</button>
        </div>
        <div id="scReportBody"><div class="sc-empty">Loading...</div></div>
    </div>
</div>

<div class="modal-overlay" id="scDialogOverlay">
    <div class="modal-box sc-dialog" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="scDialogTitle">
        <div class="modal-header">
            <h2 id="scDialogTitle"></h2>
            <button type="button" class="modal-close" id="scDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="scDialogBody"></div>
        <div id="scDialogAlert"></div>
        <div class="sc-footer"><div class="sc-footer-right">
            <button type="button" class="sc-btn" id="scDialogCancel">Go Back</button>
            <button type="button" class="sc-btn primary" id="scDialogOk">Confirm</button>
        </div></div>
    </div>
</div>
    `;
}
