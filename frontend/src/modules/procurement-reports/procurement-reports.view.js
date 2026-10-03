export function ProcurementReportsView() {
    return `
<style>
.pq-page { width: 100%; font-size: 13.5px; }
.pq-page [hidden] { display: none !important; }
.pq-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.pq-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.pq-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.pq-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pq-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pq-btn:hover { background: var(--bg-surface-alt); }
.pq-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.pq-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.pq-btn.small { height: 30px; padding: 0 12px; font-size: 12px; }

.pq-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; max-width: 100%; }
.pq-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pq-tabs button:last-child { border-right: none; }
.pq-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.pq-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.pq-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.pq-filters input, .pq-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; text-transform: none; font-weight: 400; letter-spacing: 0; }
.pq-filters select { min-width: 170px; }
.pq-filters label.pq-check { flex-direction: row; align-items: center; height: 32px; text-transform: none; font-size: 12.5px; color: var(--text-primary); font-weight: 400; letter-spacing: 0; gap: 6px; }
.pq-filters input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.pq-filters .pq-actions { margin-left: auto; }

.pq-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.pq-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.pq-stat strong { font-size: 21px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.pq-stat span { font-size: 12px; color: var(--text-muted); }
.pq-stat.bad strong { color: #b91c1c; }
.pq-stat.good strong { color: #15803d; }
:root[data-theme="dark"] .pq-stat.bad strong { color: #fca5a5; }
:root[data-theme="dark"] .pq-stat.good strong { color: #86efac; }

.pq-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.pq-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.pq-table-wrap { overflow-x: auto; }
.pq-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pq-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.pq-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.pq-table tbody tr:last-child td { border-bottom: none; }
.pq-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-weight: 700; }
.pq-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pq-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.pq-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.pq-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

.pq-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pq-badge.late, .pq-badge.bad { background: #fee2e2; color: #991b1b; }
.pq-badge.ok { background: #dcfce7; color: #166534; }
.pq-badge.warn { background: #fef3c7; color: #92400e; }
.pq-badge.muted { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .pq-badge.late, :root[data-theme="dark"] .pq-badge.bad { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .pq-badge.ok { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .pq-badge.warn { background: rgba(245,158,11,.18); color: #fde68a; }
.pq-up { color: #b91c1c; font-weight: 700; }
.pq-down { color: #15803d; font-weight: 700; }
:root[data-theme="dark"] .pq-up { color: #fca5a5; }
:root[data-theme="dark"] .pq-down { color: #86efac; }

.pq-bar { height: 8px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; min-width: 80px; margin-top: 4px; }
.pq-bar span { display: block; height: 100%; background: var(--accent); }
.pq-rate { display: inline-block; min-width: 46px; }

@media (max-width: 700px) {
    .pq-filters { flex-direction: column; align-items: stretch; }
    .pq-filters select { min-width: 0; }
    .pq-filters input, .pq-filters select { width: 100%; box-sizing: border-box; }
    .pq-filters label.pq-check input { width: 16px; }
    .pq-filters .pq-actions { margin-left: 0; }
}
</style>

<div class="pq-page">
    <div class="pq-header">
        <div>
            <h1>Procurement Reports</h1>
            <p>Open purchase orders and late deliveries, how suppliers perform, where the money goes, and what items cost over time.</p>
        </div>
    </div>
    <div class="pq-tabs" role="tablist" id="pqTabs"></div>
    <div class="pq-filters" id="pqFilters"></div>
    <div id="pqBody"><div class="pq-empty">Loading...</div></div>
</div>
    `;
}
