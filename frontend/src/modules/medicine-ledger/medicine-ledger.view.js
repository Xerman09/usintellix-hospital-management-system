export function MedicineLedgerView() {
    return `
<style>
.ml-page { width: 100%; font-size: 13.5px; }
.ml-page [hidden] { display: none !important; }
.ml-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.ml-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ml-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 780px; }
.ml-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ml-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ml-btn:hover { background: var(--bg-surface-alt); }
.ml-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.ml-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.ml-btn:disabled { opacity: .5; cursor: not-allowed; }

.ml-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; max-width: 100%; }
.ml-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ml-tabs button:last-child { border-right: none; }
.ml-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.ml-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.ml-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.ml-filters input, .ml-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; text-transform: none; font-weight: 400; letter-spacing: 0; }
.ml-filters select { min-width: 160px; }
.ml-filters .ml-item select { min-width: 260px; }
.ml-filters label.ml-check { flex-direction: row; align-items: center; height: 32px; text-transform: none; font-size: 12.5px; color: var(--text-primary); font-weight: 400; letter-spacing: 0; gap: 6px; }
.ml-filters input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.ml-filters .ml-actions { margin-left: auto; }

.ml-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 14px; }
.ml-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.ml-stat strong { font-size: 21px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.ml-stat span { font-size: 12px; color: var(--text-muted); }
.ml-stat.in strong { color: #15803d; }
.ml-stat.out strong { color: #b91c1c; }
:root[data-theme="dark"] .ml-stat.in strong { color: #86efac; }
:root[data-theme="dark"] .ml-stat.out strong { color: #fca5a5; }

.ml-check-ok, .ml-check-bad { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 12.5px; border: 1px solid; }
.ml-check-ok { border-color: #86efac; background: #f0fdf4; color: #166534; }
.ml-check-bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
:root[data-theme="dark"] .ml-check-ok { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); color: #bbf7d0; }
:root[data-theme="dark"] .ml-check-bad { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); color: #fecaca; }

.ml-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.ml-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ml-table-wrap { overflow-x: auto; }
.ml-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ml-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.ml-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.ml-table tbody tr:last-child td { border-bottom: none; }
.ml-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-weight: 700; }
.ml-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ml-table.card { min-width: 1080px; }
.ml-table.card td.details { min-width: 190px; }
.ml-table.card td.place { min-width: 130px; }
.ml-table tr.opening td { background: var(--bg-surface-alt); font-weight: 600; }
.ml-table tr.ml-click { cursor: pointer; }
.ml-table tr.ml-click:hover td { background: var(--bg-surface-alt); }
.ml-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.ml-in { color: #15803d; font-weight: 700; }
.ml-out { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .ml-in { color: #86efac; }
:root[data-theme="dark"] .ml-out { color: #fca5a5; }
.ml-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.ml-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

.ml-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ml-badge.in { background: #dcfce7; color: #166534; }
.ml-badge.out { background: #fee2e2; color: #991b1b; }
.ml-badge.move { background: #e0f2fe; color: #075985; }
.ml-badge.adjust { background: #fef3c7; color: #92400e; }
.ml-badge.neutral { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .ml-badge.in { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .ml-badge.out { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .ml-badge.move { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .ml-badge.adjust { background: rgba(245,158,11,.18); color: #fde68a; }

@media (max-width: 700px) {
    .ml-filters { flex-direction: column; align-items: stretch; }
    .ml-filters select, .ml-filters .ml-item select { min-width: 0; }
    .ml-filters input, .ml-filters select { width: 100%; box-sizing: border-box; }
    .ml-filters label.ml-check input { width: 16px; }
    .ml-filters .ml-actions { margin-left: 0; }
}
</style>

<div class="ml-page">
    <div class="ml-header">
        <div>
            <h1>Medicine Ledger</h1>
            <p>Every movement of stock — received, transferred, returned, disposed of, corrected by a count — in date order with a running balance. Entries are written automatically as stock moves and can't be edited.</p>
        </div>
    </div>
    <div class="ml-tabs" role="tablist" id="mlTabs">
        <button type="button" data-ml-tab="card" class="active">Stock Card</button>
        <button type="button" data-ml-tab="summary">Movement Summary</button>
    </div>

    <div id="mlCardPanel">
        <div class="ml-filters">
            <label class="ml-item">Item
                <input type="text" id="mlItemSearch" placeholder="Type to find an item..." aria-label="Find an item">
                <select id="mlDrug" aria-label="Item"></select>
            </label>
            <label>Location<select id="mlWarehouse"></select></label>
            <label>Lot<select id="mlLot"></select></label>
            <label>From<input type="date" id="mlFrom"></label>
            <label>To<input type="date" id="mlTo"></label>
            <label>Movement<select id="mlType"></select></label>
            <div class="ml-actions">
                <button type="button" class="ml-btn primary" id="mlShow">Show</button>
                <button type="button" class="ml-btn" id="mlCsv" disabled>Export CSV</button>
                <button type="button" class="ml-btn" id="mlPrint" disabled>Print</button>
            </div>
        </div>
        <div id="mlCardBody"><div class="ml-empty">Choose an item to see its stock card.</div></div>
    </div>

    <div id="mlSummaryPanel" hidden>
        <div class="ml-filters">
            <label>From<input type="date" id="mlSumFrom"></label>
            <label>To<input type="date" id="mlSumTo"></label>
            <label>Location<select id="mlSumWarehouse"></select></label>
            <label class="ml-check"><input type="checkbox" id="mlSumMoved" checked> Only items that moved</label>
            <div class="ml-actions">
                <button type="button" class="ml-btn primary" id="mlSumShow">Show</button>
                <button type="button" class="ml-btn" id="mlSumCsv" disabled>Export CSV</button>
                <button type="button" class="ml-btn" id="mlSumPrint" disabled>Print</button>
            </div>
        </div>
        <div id="mlSummaryBody"><div class="ml-empty">Loading...</div></div>
    </div>
</div>
    `;
}
