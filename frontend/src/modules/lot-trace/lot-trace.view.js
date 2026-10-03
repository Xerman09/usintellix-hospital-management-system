export function LotTraceView() {
    return `
<style>
.lt-page { width: 100%; font-size: 13.5px; }
.lt-page [hidden] { display: none !important; }
.lt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.lt-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.lt-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 800px; }
.lt-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.lt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.lt-btn:hover { background: var(--bg-surface-alt); }
.lt-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.lt-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.lt-btn:disabled { opacity: .5; cursor: not-allowed; }

.lt-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.lt-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.lt-filters input { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; text-transform: none; font-weight: 400; letter-spacing: 0; }
.lt-filters .lt-q { flex: 1 1 340px; }
.lt-filters label.lt-check { flex-direction: row; align-items: center; height: 32px; text-transform: none; font-size: 12.5px; color: var(--text-primary); font-weight: 400; letter-spacing: 0; gap: 6px; }
.lt-filters input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }

.lt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 14px; }
.lt-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.lt-stat strong { font-size: 21px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.lt-stat span { font-size: 12px; color: var(--text-muted); }
.lt-stat.in strong { color: #15803d; }
.lt-stat.out strong { color: #b91c1c; }
.lt-stat.warn strong { color: #b45309; }
.lt-stat.main { border-color: var(--accent); }
:root[data-theme="dark"] .lt-stat.in strong { color: #86efac; }
:root[data-theme="dark"] .lt-stat.out strong { color: #fca5a5; }
:root[data-theme="dark"] .lt-stat.warn strong { color: #fcd34d; }

.lt-banner { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 12.5px; border: 1px solid; }
.lt-banner.bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.lt-banner.warn { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
:root[data-theme="dark"] .lt-banner.bad { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); color: #fecaca; }
:root[data-theme="dark"] .lt-banner.warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); color: #fde68a; }

.lt-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.lt-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.lt-card-title small { text-transform: none; font-weight: 400; letter-spacing: 0; }
.lt-table-wrap { overflow-x: auto; }
.lt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lt-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.lt-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.lt-table tbody tr:last-child td { border-bottom: none; }
.lt-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.lt-table.wide { min-width: 900px; }
.lt-table tr.lt-click { cursor: pointer; }
.lt-table tr.lt-click:hover td { background: var(--bg-surface-alt); }
.lt-table tr.muted td { color: var(--text-muted); }
.lt-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.lt-in { color: #15803d; font-weight: 700; }
.lt-out { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .lt-in { color: #86efac; }
:root[data-theme="dark"] .lt-out { color: #fca5a5; }
.lt-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.lt-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }
.lt-chips { display: flex; flex-wrap: wrap; gap: 4px; }

.lt-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.lt-badge.in { background: #dcfce7; color: #166534; }
.lt-badge.out { background: #fee2e2; color: #991b1b; }
.lt-badge.move { background: #e0f2fe; color: #075985; }
.lt-badge.adjust { background: #fef3c7; color: #92400e; }
.lt-badge.neutral { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .lt-badge.in { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .lt-badge.out { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .lt-badge.move { background: rgba(14,165,233,.18); color: #bae6fd; }
:root[data-theme="dark"] .lt-badge.adjust { background: rgba(245,158,11,.18); color: #fde68a; }

.lt-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.lt-title h2 { margin: 0; font-size: 18px; color: var(--text-primary); }
.lt-title .lt-sub { font-size: 12.5px; }

/* Flow: suppliers -> locations, then location -> location */
.lt-flow { display: flex; flex-direction: column; gap: 8px; }
.lt-hop { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.lt-node { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface-alt); min-width: 0; overflow-wrap: anywhere; }
.lt-node strong { display: block; font-size: 13px; color: var(--text-primary); }
.lt-node.supplier { border-left: 4px solid #16a34a; }
.lt-node.place { border-left: 4px solid var(--accent); }
.lt-node.gone { border-left: 4px solid #dc2626; }
.lt-arrow { display: flex; flex-direction: column; align-items: center; font-size: 11.5px; color: var(--text-muted); white-space: nowrap; text-align: center; }
.lt-arrow b { font-size: 13px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.lt-arrow::after { content: "\\2192"; font-size: 20px; line-height: 1; color: var(--text-muted); }

@media (max-width: 700px) {
    .lt-filters { flex-direction: column; align-items: stretch; }
    .lt-filters .lt-q { flex: none; }
    .lt-filters input { width: 100%; box-sizing: border-box; }
    .lt-filters label.lt-check input { width: 16px; }
    .lt-hop { grid-template-columns: 1fr; }
    .lt-arrow { flex-direction: row; gap: 6px; justify-content: center; }
    .lt-arrow::after { content: "\\2193"; }
}
</style>

<div class="lt-page">
    <div class="lt-header">
        <div>
            <h1>Lot Tracing</h1>
            <p>Follow a batch from the supplier to every location it went to: where it came from (PO, receiving report, invoice), where it moved, what was returned, destroyed or lost, and exactly where it is now — what you need for a recall.</p>
        </div>
    </div>

    <div id="ltSearchPanel">
        <div class="lt-filters">
            <label class="lt-q">Search
                <input type="search" id="ltQuery" placeholder="Lot number, item, supplier, or a PO / RR / DR / invoice / ST / RTS number" aria-label="Search batches">
            </label>
            <label>Expires on or before<input type="date" id="ltExpiresBy"></label>
            <label class="lt-check"><input type="checkbox" id="ltInStock" checked> Only batches still in stock</label>
            <div class="lt-actions">
                <button type="button" class="lt-btn primary" id="ltSearch">Search</button>
            </div>
        </div>
        <div id="ltResults"><div class="lt-empty">Loading...</div></div>
    </div>

    <div id="ltTracePanel" hidden>
        <div class="lt-actions" style="margin-bottom:12px;">
            <button type="button" class="lt-btn" id="ltBack">&larr; Back to batches</button>
            <span style="flex:1;"></span>
            <button type="button" class="lt-btn" id="ltCsv">Export CSV</button>
            <button type="button" class="lt-btn primary" id="ltPrint">Print Trace Report</button>
        </div>
        <div id="ltTraceBody"></div>
    </div>
</div>
    `;
}
