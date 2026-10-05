export function OrReportsView() {
    return `
<style>
.orr-page { width: 100%; font-size: 13.5px; }
.orr-page [hidden] { display: none !important; }
.orr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.orr-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.orr-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.orr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.orr-btn:hover { background: var(--bg-surface-alt); }
.orr-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.orr-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border-color); overflow-x: auto; margin-bottom: 12px; }
.orr-tabs button { border: none; background: none; padding: 9px 12px; font-weight: 600; font-size: 13px; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; font-family: inherit; }
.orr-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.orr-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-bottom: 14px; }
.orr-filters label { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; font-weight: 600; color: var(--text-muted); min-width: 0; }
.orr-filters input, .orr-filters select { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; }
.orr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
.orr-kpi { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 10px 12px; }
.orr-kpi span { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.orr-kpi strong { font-size: 22px; font-weight: 800; color: var(--text-primary); }
.orr-kpi small { display: block; font-size: 11.5px; color: var(--text-muted); }
.orr-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); margin-bottom: 14px; min-width: 0; }
.orr-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 13px; }
.orr-wrap { overflow-x: auto; }
.orr-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.orr-table th { text-align: left; padding: 8px; font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.orr-table td { padding: 8px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.orr-table tr:last-child td { border-bottom: none; }
.orr-table .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.orr-table tbody tr[data-case] { cursor: pointer; }
.orr-table tbody tr[data-case]:hover { background: var(--bg-surface-alt); }
.orr-bar { display: flex; align-items: center; gap: 8px; min-width: 140px; }
.orr-bar i { display: block; height: 8px; border-radius: 999px; background: var(--accent); min-width: 2px; }
.orr-bar.good i { background: #16a34a; }
.orr-bar.warn i { background: #f59e0b; }
.orr-bar.bad i { background: #dc2626; }
.orr-bar span { font-size: 12px; font-variant-numeric: tabular-nums; }
.orr-empty { padding: 22px 14px; text-align: center; color: var(--text-muted); }
.orr-note { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }
.orr-pill { display: inline-flex; align-items: center; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; margin: 1px 2px 1px 0;
    background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.orr-pill.bad { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.orr-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.orr-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.orr-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.orr-grid2 > .orr-card { margin-bottom: 0; }
.orr-grid2 + .orr-card, .orr-grid2 + .orr-grid2 { margin-top: 14px; }
:root[data-theme="dark"] .orr-pill.bad { background: rgba(239,68,68,.18); color: #fecaca; border-color: rgba(239,68,68,.45); }
:root[data-theme="dark"] .orr-pill.warn { background: rgba(245,158,11,.18); color: #fde68a; border-color: rgba(245,158,11,.45); }
:root[data-theme="dark"] .orr-pill.ok { background: rgba(34,197,94,.16); color: #bbf7d0; border-color: rgba(34,197,94,.45); }
/* Print the report only, not the app around it. */
@media print {
    body * { visibility: hidden; }
    .orr-page, .orr-page * { visibility: visible; }
    .orr-page { position: absolute; left: 0; top: 0; width: 100%; }
    .orr-tabs button:not(.active), #orrPrint, [data-csv], [data-range], .orr-filters select, .orr-filters input { display: none !important; }
    .orr-wrap { overflow: visible; }
    .orr-card { break-inside: avoid; }
}
@media (max-width: 900px) { .orr-grid2 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) { .orr-filters > * { flex: 1 1 140px; } }
</style>

<div class="orr-page">
    <div class="orr-header">
        <div>
            <h1>OR Reports</h1>
            <p>How the operating rooms are used: utilization, on-time starts and turnover, cancellations, case volume, safety-checklist compliance and surgical-site infections. Every report can be narrowed to one specialization.</p>
        </div>
        <button type="button" class="orr-btn" id="orrPrint">Print</button>
    </div>
    <div class="orr-tabs" role="tablist" id="orrTabs">
        <button type="button" data-orr="utilization" class="active">Utilization</button>
        <button type="button" data-orr="timeliness">On-time starts &amp; turnover</button>
        <button type="button" data-orr="cancellations">Cancellations</button>
        <button type="button" data-orr="volume">Volume</button>
        <button type="button" data-orr="compliance">Safety checklist</button>
        <button type="button" data-orr="ssi">Surgical-site infections</button>
    </div>
    <div class="orr-filters">
        <label>From<input type="date" id="orrFrom"></label>
        <label>To<input type="date" id="orrTo"></label>
        <label>Specialization<select id="orrSpec"><option value="">All specializations</option></select></label>
        <label>Suite<select id="orrSuite"><option value="">All suites</option></select></label>
        <label data-only="utilization">Staffed hours / day<input type="number" id="orrHours" min="1" max="24" step="0.5" value="8" style="width:110px;"></label>
        <label data-only="utilization">Operating days<select id="orrDays"><option value="mon_sat">Mon–Sat</option><option value="mon_fri">Mon–Fri</option><option value="all">Every day</option></select></label>
        <button type="button" class="orr-btn small" data-range="month">This month</button>
        <button type="button" class="orr-btn small" data-range="last">Last month</button>
        <button type="button" class="orr-btn small" data-range="year">This year</button>
    </div>
    <div id="orrBody"><div class="orr-empty">Loading...</div></div>
</div>`;
}
