export function OrBoardView() {
    return `
<style>
.orb-page { width: 100%; font-size: 13.5px; }
.orb-page [hidden] { display: none !important; }
.orb-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.orb-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.orb-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.orb-clock { text-align: right; line-height: 1.1; }
.orb-clock strong { display: block; font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.orb-clock span { font-size: 12px; color: var(--text-muted); }
.orb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.orb-btn:hover { background: var(--bg-surface-alt); }
.orb-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.orb-btn.go { border-color: #16a34a; background: #16a34a; color: #fff; }
.orb-btn.need { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.orb-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.orb-toolbar input[type=date] { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-family: inherit; }
.orb-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; }
.orb-toggle input { accent-color: var(--accent); width: 15px; height: 15px; }
.orb-updated { font-size: 11.5px; color: var(--text-muted); margin-left: auto; }
.orb-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 14px; }
.orb-kpi { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 10px 12px; }
.orb-kpi span { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.orb-kpi strong { font-size: 22px; font-weight: 800; color: var(--text-primary); }
.orb-kpi.warn strong { color: #d97706; }
.orb-kpi.live strong { color: #16a34a; }
.orb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; margin-bottom: 14px; }
.orb-suite { border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.orb-suite.surgery { border-color: #86efac; box-shadow: inset 4px 0 0 #16a34a; }
.orb-suite.cleaning { border-color: #fcd34d; box-shadow: inset 4px 0 0 #f59e0b; }
.orb-suite.down { opacity: .8; box-shadow: inset 4px 0 0 #94a3b8; }
.orb-suite-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.orb-suite-head strong { font-size: 14px; }
.orb-suite-head .orb-sub { margin: 0; }
.orb-suite-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.orb-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.orb-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.orb-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.orb-pill.live { background: #dcfce7; color: #166534; border-color: #86efac; }
.orb-pill.bad { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.orb-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.orb-pill.info { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
.orb-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #16a34a; animation: orbPulse 1.6s infinite; }
@keyframes orbPulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.orb-stage { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.orb-stage strong { font-size: 16px; color: #15803d; }
.orb-stage .t { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.orb-who { font-size: 13px; line-height: 1.35; min-width: 0; }
.orb-who b { font-size: 13.5px; }
.orb-proc { font-weight: 700; font-size: 13.5px; }
.orb-team { font-size: 12px; color: var(--text-muted); line-height: 1.45; }
.orb-team span { color: var(--text-primary); }
.orb-bar { height: 7px; border-radius: 999px; background: var(--bg-surface-alt); overflow: hidden; border: 1px solid var(--border-color); }
.orb-bar i { display: block; height: 100%; background: #16a34a; border-radius: 999px; }
.orb-bar.over i { background: #dc2626; }
.orb-timing { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.orb-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.orb-check { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 7px; border: 1px solid var(--border-color); color: var(--text-muted); }
.orb-check.ok { background: #f0fdf4; border-color: #86efac; color: #166534; }
.orb-check.due { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
.orb-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 4px; }
.orb-free { padding: 10px; border-radius: 8px; background: var(--bg-surface-alt); text-align: center; font-size: 12.5px; color: var(--text-muted); }
.orb-free strong { display: block; font-size: 14px; color: var(--text-primary); }
.orb-queue { border-top: 1px dashed var(--border-color); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.orb-queue > span { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); }
.orb-qrow { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: 12px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
.orb-qrow:hover { background: var(--bg-surface-alt); }
.orb-qrow .n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orb-qrow .tm { font-weight: 700; font-variant-numeric: tabular-nums; }
.orb-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.orb-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 12.5px; }
.orb-table-wrap { overflow-x: auto; }
.orb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 860px; }
.orb-table th { text-align: left; padding: 8px; font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.orb-table td { padding: 8px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.orb-table tbody tr { cursor: pointer; }
.orb-table tbody tr:hover { background: var(--bg-surface-alt); }
.orb-table tr.cancelled td { color: var(--text-muted); text-decoration: line-through; }
.orb-empty { padding: 26px 14px; text-align: center; color: var(--text-muted); }
.orb-mini { display: inline-flex; gap: 3px; }
.orb-mini i { width: 18px; height: 18px; border-radius: 4px; font-size: 9.5px; font-style: normal; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;
    background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.orb-mini i.ok { background: #16a34a; border-color: #16a34a; color: #fff; }

.orb-pacu { margin-bottom: 14px; }
.orb-pacu-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; padding: 10px; }
.orb-prow { border: 1px solid var(--border-color); border-radius: 10px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.orb-prow.ready { border-color: #86efac; box-shadow: inset 4px 0 0 #16a34a; }
.orb-scores { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); }
.orb-scores b { font-size: 17px; color: var(--text-primary); }

/* Theater mode: the board alone, large, for a wall screen. */
.orb-page.orb-theater { position: fixed; inset: 0; z-index: 1900; background: var(--bg-page, var(--bg-surface-alt)); padding: 16px 20px; overflow-y: auto; font-size: 15px; }
.orb-theater .orb-header p, .orb-theater .orb-list, .orb-theater [data-orb-hide-theater] { display: none !important; }
.orb-theater .orb-header h1 { font-size: 26px; }
.orb-theater .orb-clock strong { font-size: 40px; }
.orb-theater .orb-grid { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }
.orb-theater .orb-stage strong { font-size: 20px; }
.orb-theater .orb-stage .t { font-size: 17px; }
.orb-theater .orb-proc, .orb-theater .orb-who b { font-size: 16px; }
.orb-theater .orb-team { font-size: 13.5px; }
.orb-theater .orb-kpi strong { font-size: 28px; }

:root[data-theme="dark"] .orb-pill.ok, :root[data-theme="dark"] .orb-pill.live, :root[data-theme="dark"] .orb-check.ok { background: rgba(34,197,94,.16); color: #bbf7d0; border-color: rgba(34,197,94,.45); }
:root[data-theme="dark"] .orb-pill.bad { background: rgba(239,68,68,.18); color: #fecaca; border-color: rgba(239,68,68,.45); }
:root[data-theme="dark"] .orb-pill.warn, :root[data-theme="dark"] .orb-check.due, :root[data-theme="dark"] .orb-btn.need { background: rgba(245,158,11,.16); color: #fde68a; border-color: rgba(245,158,11,.45); }
:root[data-theme="dark"] .orb-pill.info { background: rgba(59,130,246,.18); color: #bfdbfe; border-color: rgba(59,130,246,.45); }
:root[data-theme="dark"] .orb-prow.ready { border-color: rgba(34,197,94,.5); }
:root[data-theme="dark"] .orb-stage strong { color: #4ade80; }
:root[data-theme="dark"] .orb-suite.surgery { border-color: rgba(34,197,94,.5); }
:root[data-theme="dark"] .orb-suite.cleaning { border-color: rgba(245,158,11,.5); }

@media (max-width: 640px) {
    .orb-grid, .orb-theater .orb-grid { grid-template-columns: minmax(0, 1fr); }
    .orb-updated { margin-left: 0; width: 100%; }
    .orb-clock { text-align: left; }
}
</style>

<div class="orb-page" id="orbPage">
    <div class="orb-header">
        <div>
            <h1>OR Live Board</h1>
            <p>Every operating room right now: who is in it, the stage and how long, the safety checklist and delays. Stages move in order; the Sign-In, Time-Out and Sign-Out must be done before the patient goes in, before the incision, and before leaving the room.</p>
        </div>
        <div class="orb-clock"><strong id="orbClock">--:--</strong><span id="orbDateLabel"></span></div>
    </div>
    <div class="orb-toolbar">
        <span data-orb-hide-theater style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="orb-btn small" id="orbPrev" aria-label="Previous day">&#9664;</button>
            <button type="button" class="orb-btn small" id="orbToday">Today</button>
            <button type="button" class="orb-btn small" id="orbNext" aria-label="Next day">&#9654;</button>
            <input type="date" id="orbDate" aria-label="Date">
        </span>
        <label class="orb-toggle"><input type="checkbox" id="orbInitials"> Patient initials only</label>
        <span class="orb-updated" id="orbUpdated"></span>
        <button type="button" class="orb-btn small" id="orbTheater">&#x26F6; Theater mode</button>
    </div>
    <div class="orb-kpis" id="orbKpis"></div>
    <div class="orb-grid" id="orbSuites"><div class="orb-empty">Loading...</div></div>
    <div class="orb-card orb-pacu" id="orbPacuWrap" hidden>
        <div class="orb-card-head"><span>In recovery (PACU)</span><span class="orb-pill" id="orbPacuCount">0</span></div>
        <div class="orb-pacu-list" id="orbPacu"></div>
    </div>
    <div class="orb-card orb-list">
        <div class="orb-card-head"><span>All cases</span><span class="orb-sub" id="orbListNote" style="margin:0;font-weight:500;"></span></div>
        <div class="orb-table-wrap" id="orbList"></div>
    </div>
</div>`;
}
