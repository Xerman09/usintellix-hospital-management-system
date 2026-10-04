export function PharmacyReportsView() {
    return `
<style>
.phr-page { width: 100%; font-size: 13.5px; }
.phr-page [hidden] { display: none !important; }
.phr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.phr-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.phr-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.phr-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.phr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.phr-btn:hover { background: var(--bg-surface-alt); }
.phr-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.phr-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.phr-btn.small { height: 30px; padding: 0 12px; font-size: 12px; }

.phr-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px; max-width: 100%; }
.phr-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.phr-tabs button:last-child { border-right: none; }
.phr-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }

.phr-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.phr-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); min-width: 0; }
.phr-filters input, .phr-filters select { height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; max-width: 100%; text-transform: none; font-weight: 400; letter-spacing: 0; }
.phr-filters select { min-width: 170px; }
.phr-filters label.phr-check { flex-direction: row; align-items: center; height: 32px; text-transform: none; font-size: 12.5px; color: var(--text-primary); font-weight: 400; letter-spacing: 0; gap: 6px; }
.phr-filters input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.phr-filters .phr-actions { margin-left: auto; }

.phr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.phr-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.phr-stat strong { font-size: 21px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.phr-stat span { font-size: 12px; color: var(--text-muted); }
.phr-stat.bad strong { color: #b91c1c; }
.phr-stat.good strong { color: #15803d; }
:root[data-theme="dark"] .phr-stat.bad strong { color: #fca5a5; }
:root[data-theme="dark"] .phr-stat.good strong { color: #86efac; }

.phr-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; margin-bottom: 14px; min-width: 0; }
.phr-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.phr-table-wrap { overflow-x: auto; }
.phr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.phr-table th { text-align: left; padding: 8px 10px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.phr-table td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.phr-table tbody tr:last-child td { border-bottom: none; }
.phr-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-weight: 700; }
.phr-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.phr-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.phr-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
.phr-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

.phr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.phr-badge.late, .phr-badge.bad { background: #fee2e2; color: #991b1b; }
.phr-badge.ok { background: #dcfce7; color: #166534; }
.phr-badge.warn { background: #fef3c7; color: #92400e; }
.phr-badge.muted { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .phr-badge.late, :root[data-theme="dark"] .phr-badge.bad { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .phr-badge.ok { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .phr-badge.warn { background: rgba(245,158,11,.18); color: #fde68a; }
.phr-up { color: #b91c1c; font-weight: 700; }
.phr-down { color: #15803d; font-weight: 700; }
:root[data-theme="dark"] .phr-up { color: #fca5a5; }
:root[data-theme="dark"] .phr-down { color: #86efac; }

.phr-bar { height: 8px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; min-width: 80px; margin-top: 4px; }
.phr-bar span { display: block; height: 100%; background: var(--accent); }
.phr-rate { display: inline-block; min-width: 46px; }

.phr-filters input[type="search"] { min-width: 200px; }
.phr-badge.dd { background: #fee2e2; color: #991b1b; }
.phr-badge.ha { background: #ffedd5; color: #9a3412; }
:root[data-theme="dark"] .phr-badge.dd { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .phr-badge.ha { background: rgba(249,115,22,.18); color: #fed7aa; }
.phr-table tr.voided td { color: var(--text-muted); text-decoration: line-through; text-decoration-color: rgba(127,127,127,.6); }
.phr-table tr.voided td .phr-badge, .phr-table tr.voided td .phr-sub { text-decoration: none; }
.phr-drug-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; align-items: baseline; margin-bottom: 10px; }
.phr-drug-head h2 { margin: 0; font-size: 15px; color: var(--text-primary); }
.phr-drug-head .phr-sub { margin: 0; }
.phr-meds { margin: 0; padding-left: 16px; }
.phr-meds li { margin: 1px 0; }
.phr-signs { display: none; }

@media (max-width: 700px) {
    .phr-filters { flex-direction: column; align-items: stretch; }
    .phr-filters select { min-width: 0; }
    .phr-filters input, .phr-filters select { width: 100%; box-sizing: border-box; }
    .phr-filters label.phr-check input { width: 16px; }
    .phr-filters .phr-actions { margin-left: 0; }
}
</style>

<div class="phr-page">
    <div class="phr-header">
        <div>
            <h1>Pharmacy Reports</h1>
            <p>What was dispensed and to whom, the Dangerous Drugs register, prescriptions still waiting to be filled, and prescriptions by doctor.</p>
        </div>
    </div>
    <div class="phr-tabs" role="tablist" id="phrTabs"></div>
    <div class="phr-filters" id="phrFilters"></div>
    <div id="phrBody"><div class="phr-empty">Loading...</div></div>
</div>
    `;
}
