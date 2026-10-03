export function StockLevelsView() {
    return `
<style>
.sl-page { width: 100%; font-size: 13.5px; }
.sl-page [hidden] { display: none !important; }
.sl-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.sl-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.sl-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 800px; }
.sl-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sl-btn:hover { background: var(--bg-surface-alt); }
.sl-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.sl-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.sl-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.sl-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.sl-btn:disabled { opacity: .5; cursor: not-allowed; }

.sl-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; max-width: 100%; }
.sl-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.sl-tabs button:last-child { border-right: none; }
.sl-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.sl-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.sl-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.sl-filters input, .sl-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; text-transform: none; font-weight: 400; letter-spacing: 0; }
.sl-filters select { min-width: 170px; }
.sl-filters .sl-grow { flex: 1 1 220px; }
.sl-filters .sl-actions { margin-left: auto; }

.sl-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
.sl-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.sl-stat strong { font-size: 21px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.sl-stat span { font-size: 12px; color: var(--text-muted); }
.sl-stat.out strong { color: #b91c1c; }
.sl-stat.low strong { color: #b45309; }
:root[data-theme="dark"] .sl-stat.out strong { color: #fca5a5; }
:root[data-theme="dark"] .sl-stat.low strong { color: #fcd34d; }

.sl-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.sl-card.alert { border-left: 4px solid #dc2626; }
.sl-card.warn { border-left: 4px solid #f59e0b; }
.sl-card.good { border-left: 4px solid #16a34a; }
.sl-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.sl-card-head h3 { margin: 0; font-size: 15px; color: var(--text-primary); }
.sl-card-head .sl-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.sl-table-wrap { overflow-x: auto; }
.sl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sl-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.sl-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: middle; }
.sl-table tbody tr:last-child td { border-bottom: none; }
.sl-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sl-table.wide { min-width: 860px; }
.sl-table tr.changed td { background: var(--accent-light); }
.sl-table tr.has-error td { background: #fef2f2; }
:root[data-theme="dark"] .sl-table tr.has-error td { background: rgba(239,68,68,.10); }
.sl-table input.sl-qty { width: 96px; height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; text-align: right; font-family: inherit; }
.sl-table input.sl-qty:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
.sl-err { display: block; color: #b91c1c; font-size: 11.5px; margin-top: 3px; }
:root[data-theme="dark"] .sl-err { color: #fca5a5; }
.sl-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.sl-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.sl-ok-line { color: var(--text-muted); font-size: 12.5px; margin: 0; }
.sl-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

.sl-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sl-badge.out { background: #fee2e2; color: #991b1b; }
.sl-badge.low { background: #fef3c7; color: #92400e; }
.sl-badge.ok { background: #dcfce7; color: #166534; }
.sl-badge.over { background: #e0f2fe; color: #075985; }
.sl-badge.no_level { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .sl-badge.out { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .sl-badge.low { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .sl-badge.ok { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .sl-badge.over { background: rgba(14,165,233,.18); color: #bae6fd; }

.sl-savebar { position: sticky; bottom: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    padding: 10px 14px; margin-top: 10px; border: 1px solid var(--accent); border-radius: 10px; background: var(--bg-surface); box-shadow: 0 -4px 14px rgba(0,0,0,.08); }
.sl-dialog p { margin: 0 0 10px; font-size: 12.5px; color: var(--text-muted); }
.sl-dialog label { display: block; font-size: 12px; font-weight: 600; margin: 0 0 4px; color: var(--text-primary); }
.sl-dialog select { width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit; margin-bottom: 10px; }
.sl-dialog .sl-radio { display: flex; gap: 8px; align-items: flex-start; font-weight: 400; margin-bottom: 8px; cursor: pointer; }
.sl-dialog .sl-radio input { margin-top: 2px; accent-color: var(--accent); }
.sl-dialog-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

@media (max-width: 700px) {
    .sl-filters { flex-direction: column; align-items: stretch; }
    .sl-filters .sl-grow { flex: none; }
    .sl-filters input, .sl-filters select { width: 100%; box-sizing: border-box; min-width: 0; }
    .sl-filters .sl-actions { margin-left: 0; }
}
</style>

<div class="sl-page">
    <div class="sl-header">
        <div>
            <h1>Stock Levels</h1>
            <p>Set the minimum (reorder point) and maximum of each item at each storage location. An item is <b>low</b> when its usable stock — not counting expired lots — falls below the minimum, and <b>out</b> when none is left.</p>
        </div>
    </div>
    <div class="sl-tabs" role="tablist" id="slTabs">
        <button type="button" data-sl-tab="low" class="active">Low Stock</button>
        <button type="button" data-sl-tab="set">Set Levels</button>
    </div>

    <div id="slLowPanel">
        <div class="sl-filters">
            <label>Location<select id="slLowLocation"></select></label>
            <label class="sl-grow">Item<input type="search" id="slLowSearch" placeholder="Filter by item name..."></label>
            <div class="sl-actions">
                <button type="button" class="sl-btn" id="slLowRefresh">Refresh</button>
                <button type="button" class="sl-btn" id="slLowCsv" disabled>Export CSV</button>
                <button type="button" class="sl-btn" id="slLowPrint" disabled>Print</button>
            </div>
        </div>
        <div id="slLowBody"><div class="sl-empty">Loading...</div></div>
    </div>

    <div id="slSetPanel" hidden>
        <div class="sl-filters">
            <label>Location<select id="slSetLocation"></select></label>
            <label class="sl-grow">Item<input type="search" id="slSetSearch" placeholder="Filter by item name..."></label>
            <label>Show<select id="slSetShow">
                <option value="all">All items</option>
                <option value="set">With a level</option>
                <option value="unset">Without a level</option>
                <option value="below">Out or low</option>
                <option value="over">Over the maximum</option>
                <option value="stocked">Stocked here</option>
            </select></label>
            <div class="sl-actions">
                <button type="button" class="sl-btn" id="slCopy" hidden>Copy from another location</button>
            </div>
        </div>
        <div id="slSetBody"><div class="sl-empty">Loading...</div></div>
    </div>
</div>

<div class="modal-overlay" id="slDialogOverlay">
    <div class="modal-box sl-dialog" style="max-width: 500px;" role="dialog" aria-modal="true" aria-labelledby="slDialogTitle">
        <div class="modal-header">
            <h2 id="slDialogTitle"></h2>
            <button type="button" class="modal-close" id="slDialogClose" aria-label="Close">&times;</button>
        </div>
        <div id="slDialogBody"></div>
        <div id="slDialogAlert"></div>
        <div class="sl-dialog-foot">
            <button type="button" class="sl-btn" id="slDialogCancel">Go Back</button>
            <button type="button" class="sl-btn primary" id="slDialogOk">Confirm</button>
        </div>
    </div>
</div>
    `;
}
