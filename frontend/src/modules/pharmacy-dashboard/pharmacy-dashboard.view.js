export function PharmacyDashboardView() {
    return `
<style>
.pd-page { width: 100%; font-size: 13.5px; }
.pd-page [hidden] { display: none !important; }
.pd-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.pd-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.pd-header p { margin: 0; color: var(--text-muted); font-size: 12.5px; }
.pd-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pd-controls select { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 180px; max-width: 100%; }
.pd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.pd-btn:hover { background: var(--bg-surface-alt); }
.pd-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.pd-btn:disabled { opacity: .5; cursor: not-allowed; }
.pd-link { background: none; border: none; padding: 0; color: var(--accent-text, var(--accent)); font-weight: 600; font-size: 12px; cursor: pointer; font-family: inherit; white-space: nowrap; }
.pd-link:hover { text-decoration: underline; }

.pd-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; margin-bottom: 14px; }
.pd-kpi { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; text-align: left; font-family: inherit; color: inherit; }
button.pd-kpi { cursor: pointer; }
button.pd-kpi:hover { border-color: var(--accent); }
.pd-kpi strong { font-size: 22px; line-height: 1.15; color: var(--text-primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.pd-kpi span { font-size: 12px; color: var(--text-muted); }
.pd-kpi.red { border-left: 4px solid #dc2626; } .pd-kpi.red strong { color: #b91c1c; }
.pd-kpi.amber { border-left: 4px solid #f59e0b; } .pd-kpi.amber strong { color: #b45309; }
.pd-kpi.green { border-left: 4px solid #16a34a; }
:root[data-theme="dark"] .pd-kpi.red strong { color: #fca5a5; }
:root[data-theme="dark"] .pd-kpi.amber strong { color: #fcd34d; }

.pd-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.pd-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pd-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 16px; min-width: 0; }
.pd-card-title { margin: 0 0 12px; font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.pd-card-title small { text-transform: none; font-weight: 400; letter-spacing: 0; }

.pd-locs { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.pd-loc { border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: var(--bg-surface); min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pd-loc.red { border-left: 4px solid #dc2626; }
.pd-loc.amber { border-left: 4px solid #f59e0b; }
.pd-loc.green { border-left: 4px solid #16a34a; }
.pd-loc.grey { border-left: 4px solid var(--border-color); }
.pd-loc-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.pd-loc-head h3 { margin: 0; font-size: 14px; color: var(--text-primary); overflow-wrap: anywhere; }
.pd-chips { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
.pd-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.pd-items li { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; }
.pd-items li span:first-child { min-width: 0; overflow-wrap: anywhere; color: var(--text-primary); }
.pd-items li span:last-child { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--text-muted); }
.pd-muted { color: var(--text-muted); font-size: 12.5px; margin: 0; }
.pd-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

.pd-table-wrap { overflow-x: auto; }
.pd-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pd-table th { text-align: left; padding: 7px 8px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.pd-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.pd-table tbody tr:last-child td { border-bottom: none; }
.pd-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

.pd-list { list-style: none; margin: 0; padding: 0; }
.pd-list li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
.pd-list li:last-child { border-bottom: none; }
.pd-list .pd-count { min-width: 30px; height: 26px; padding: 0 8px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-variant-numeric: tabular-nums; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.pd-list .pd-count.hot { background: var(--accent); color: #fff; border-color: var(--accent); }
.pd-list button.pd-row { all: unset; display: flex; justify-content: space-between; align-items: center; gap: 10px; width: 100%; cursor: pointer; box-sizing: border-box; }
.pd-list button.pd-row:hover .pd-row-label { text-decoration: underline; }
.pd-list button.pd-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

.pd-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.pd-badge.red { background: #fee2e2; color: #991b1b; }
.pd-badge.amber { background: #fef3c7; color: #92400e; }
.pd-badge.green { background: #dcfce7; color: #166534; }
.pd-badge.blue { background: #e0f2fe; color: #075985; }
.pd-badge.grey { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .pd-badge.red { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .pd-badge.amber { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .pd-badge.green { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .pd-badge.blue { background: rgba(14,165,233,.18); color: #bae6fd; }
.pd-in { color: #15803d; font-weight: 700; }
.pd-out { color: #b91c1c; font-weight: 700; }
:root[data-theme="dark"] .pd-in { color: #86efac; }
:root[data-theme="dark"] .pd-out { color: #fca5a5; }
.pd-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

@media (max-width: 1000px) {
    .pd-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
    .pd-controls, .pd-controls select { width: 100%; }
    .pd-controls select { min-width: 0; box-sizing: border-box; }
    .pd-locs { grid-template-columns: minmax(0, 1fr); }
}
</style>

<div class="pd-page">
    <div class="pd-header">
        <div>
            <h1>Pharmacy Dashboard</h1>
            <p id="pdAsOf">Loading...</p>
        </div>
        <div class="pd-controls">
            <select id="pdLocation" aria-label="Storage location"><option value="">All locations</option></select>
            <button type="button" class="pd-btn" id="pdRefresh">Refresh</button>
        </div>
    </div>
    <div id="pdBody"><div class="pd-empty">Loading...</div></div>
</div>
    `;
}
