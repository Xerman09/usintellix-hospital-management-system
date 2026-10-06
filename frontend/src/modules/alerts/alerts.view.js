export function AlertsView() {
    return `
<style>
.alp-page { min-width: 0; padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; }
.alp-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.alp-top h1 { margin: 0; font-size: 22px; }
.alp-top p { margin: 4px 0 0; color: var(--text-muted); }
.alp-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 8px 14px; font-weight: 600; font-size: 13px; cursor: pointer; }
.alp-btn:hover { background: var(--bg-surface-alt); }
.alp-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.alp-btn.primary:hover { background: var(--accent-hover); }
.alp-btn.red { background: #dc2626; border-color: #dc2626; color: #fff; }
.alp-btn.red:hover { background: #b91c1c; }
.alp-btn:disabled { opacity: .6; cursor: default; }
.alp-btn:focus-visible, .alp-tabs button:focus-visible, .alp-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.alp-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.alp-tabs { display: inline-flex; background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 9px; padding: 3px; flex-wrap: wrap; }
.alp-tabs button { border: 0; background: transparent; color: var(--text-muted); padding: 6px 12px; border-radius: 7px; font-weight: 600; font-size: 12.5px; cursor: pointer; }
.alp-tabs button.active { background: var(--bg-surface); color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.alp-bar select, .alp-bar input, .alp-form input, .alp-form select, .alp-form textarea { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.alp-bar input { min-width: 200px; flex: 1; max-width: 320px; }
.alp-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.alp-row { display: grid; grid-template-columns: 10px minmax(0, 1fr) 170px 130px; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; }
.alp-row:last-child { border-bottom: 0; }
.alp-row:hover { background: var(--bg-surface-alt); }
.alp-row.unread { background: var(--accent-light); }
.alp-dot { width: 8px; height: 8px; border-radius: 50%; }
.alp-row.unread .alp-dot { background: var(--accent); }
.alp-title { font-weight: 600; overflow-wrap: anywhere; }
.alp-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
.alp-when { color: var(--text-muted); font-size: 12.5px; }
.alp-state { font-size: 12.5px; }
.alp-empty { padding: 40px 16px; text-align: center; color: var(--text-muted); }
.alp-pager { display: flex; justify-content: space-between; align-items: center; padding: 10px 2px; color: var(--text-muted); font-size: 12.5px; gap: 8px; flex-wrap: wrap; }
.alp-pager div { display: flex; gap: 6px; }
@media (max-width: 760px) {
    .alp-page { padding: 16px; }
    .alp-row { grid-template-columns: 10px minmax(0, 1fr); }
    .alp-when, .alp-state { grid-column: 2; }
}

.alp-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4000; display: none; align-items: flex-start; justify-content: center; padding: 6vh 16px 16px; overflow-y: auto; }
.alp-overlay.open { display: flex; }
.alp-modal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 620px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); }
.alp-mhead { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 16px 20px 10px; }
.alp-mhead h2 { margin: 6px 0 0; font-size: 18px; overflow-wrap: anywhere; }
.alp-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.alp-x:hover { background: var(--bg-surface-alt); color: var(--text-primary); }
.alp-mbody { padding: 0 20px 8px; }
.alp-mbody p.body { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.45; margin: 0 0 12px; }
.alp-facts { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 6px 12px; margin: 0 0 14px; font-size: 13px; }
.alp-facts dt { color: var(--text-muted); }
.alp-facts dd { margin: 0; overflow-wrap: anywhere; }
.alp-h3 { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }
.alp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.alp-table th, .alp-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
.alp-table th { color: var(--text-muted); font-weight: 600; }
.alp-tablewrap { overflow-x: auto; }
.alp-mfoot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 12px 20px 16px; border-top: 1px solid var(--border-color); margin-top: 10px; }

.alp-form { display: grid; gap: 12px; }
.alp-form label { display: block; font-size: 12.5px; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
.alp-form input, .alp-form select, .alp-form textarea { width: 100%; box-sizing: border-box; }
.alp-form textarea { min-height: 80px; resize: vertical; }
.alp-urg { display: flex; gap: 8px; flex-wrap: wrap; }
.alp-urg label { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 12px; cursor: pointer; margin: 0; color: var(--text-primary); font-weight: 600; }
.alp-urg input { width: auto; margin: 0; }
.alp-urg label:has(input:checked) { border-color: var(--accent); background: var(--accent-light); }
.alp-hint { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
.alp-target-add { display: grid; grid-template-columns: 150px minmax(0, 1fr) auto; gap: 8px; }
@media (max-width: 560px) { .alp-target-add { grid-template-columns: 1fr; } .alp-facts { grid-template-columns: 1fr; } }
.alp-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.alp-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-lighter); color: var(--accent-text); border-radius: 14px; padding: 3px 4px 3px 10px; font-size: 12.5px; font-weight: 600; }
.alp-chip button { border: 0; background: none; color: inherit; cursor: pointer; font-size: 15px; line-height: 1; padding: 0 5px; border-radius: 10px; }
.alp-err { color: #dc2626; font-size: 12px; margin-top: 4px; }
.alp-patient-results { border: 1px solid var(--border-color); border-radius: 8px; margin-top: 4px; max-height: 180px; overflow-y: auto; }
.alp-patient-results button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); padding: 7px 10px; cursor: pointer; font: inherit; font-size: 13px; }
.alp-patient-results button:hover, .alp-patient-results button:focus-visible { background: var(--bg-surface-alt); outline: none; }
.alp-picked { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px; }
/* Admin sections (Phase 2): page tabs, escalation chains, report. */
.alp-pagetabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; flex-wrap: wrap; }
.alp-pagetabs[hidden] { display: none; }
.alp-pagetabs button { border: 0; background: none; color: var(--text-muted); padding: 9px 14px; font-weight: 600; font-size: 13.5px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.alp-pagetabs button.active { color: var(--accent-text); border-bottom-color: var(--accent); }
.alp-pagetabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.alp-section[hidden] { display: none; }
.alp-intro { color: var(--text-muted); margin: 0 0 14px; max-width: 760px; line-height: 1.5; }
.alp-pol { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
.alp-pol-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.alp-pol-head h3 { margin: 0; font-size: 15px; }
.alp-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; font-size: 13px; }
.alp-chain .lvl { background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 10px; }
.alp-chain .arrow { color: var(--text-muted); font-size: 12px; }
.alp-off { color: var(--text-muted); font-style: italic; }
.alp-steps { display: grid; gap: 8px; }
.alp-step { display: grid; grid-template-columns: 60px 110px 130px minmax(0, 1fr) 34px; gap: 8px; align-items: center; }
.alp-step .n { font-weight: 700; font-size: 12.5px; color: var(--text-muted); }
.alp-step input[type=number] { width: 100%; }
.alp-icon-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-muted); border-radius: 8px; height: 34px; cursor: pointer; font-size: 16px; }
.alp-icon-btn:hover { color: #dc2626; border-color: #dc2626; }
@media (max-width: 640px) { .alp-step { grid-template-columns: 1fr 1fr; } .alp-step .n { grid-column: 1 / -1; } }
.alp-switch { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary) !important; cursor: pointer; }
.alp-switch input { width: auto !important; }
.alp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
.alp-kpi { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; }
.alp-kpi .v { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.alp-kpi .l { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.alp-kpi.bad .v { color: #dc2626; }
.alp-rcard { min-width: 0; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
.alp-rcard h3 { margin: 0 0 8px; font-size: 14.5px; display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
.alp-rcard .alp-table td.num, .alp-rcard .alp-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
.alp-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 900px) { .alp-grid2 { grid-template-columns: minmax(0, 1fr); } }
.alp-link { background: none; border: 0; color: var(--accent); cursor: pointer; padding: 0; font: inherit; text-align: left; }
.alp-link:hover { text-decoration: underline; }
@media print {
    body * { visibility: hidden; }
    #alpReport, #alpReport * { visibility: visible; }
    #alpReport { position: absolute; left: 0; top: 0; width: 100%; }
    #alpReport .alp-bar, #alpReport [data-csv] { display: none !important; }
    .alp-rcard, .alp-kpi { break-inside: avoid; }
}
</style>
<div class="alp-page" id="alpPage">
    <div class="alp-top">
        <div>
            <h1>Alerts</h1>
            <p>Alerts sent to you, your role or your unit. Urgent and critical alerts stay open until someone acknowledges them.</p>
        </div>
        <button type="button" class="alp-btn primary" id="alpSend" hidden>Send alert</button>
    </div>
    <div class="alp-pagetabs" id="alpPageTabs" role="tablist" aria-label="Alerts sections" hidden>
        <button type="button" role="tab" data-section="alpMine" class="active" aria-selected="true">My alerts</button>
        <button type="button" role="tab" data-section="alpEsc" aria-selected="false">Escalation</button>
        <button type="button" role="tab" data-section="alpReport" aria-selected="false">Report</button>
    </div>
    <div class="alp-section" id="alpMine">
    <div class="alp-bar">
        <div class="alp-tabs" role="tablist" aria-label="Show">
            <button type="button" role="tab" data-status="all" class="active" aria-selected="true">All</button>
            <button type="button" role="tab" data-status="unread" aria-selected="false">Unread</button>
            <button type="button" role="tab" data-status="open" aria-selected="false">Waiting for acknowledgement</button>
            <button type="button" role="tab" data-status="closed" aria-selected="false">Closed</button>
            <button type="button" role="tab" data-status="sent" aria-selected="false">Sent by me</button>
        </div>
        <select id="alpUrgency" aria-label="Urgency">
            <option value="">All urgencies</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="info">Info</option>
        </select>
        <input type="search" id="alpQ" placeholder="Search alerts" aria-label="Search alerts">
        <button type="button" class="alp-btn" id="alpReadAll">Mark all as read</button>
    </div>
    <div class="alp-card" id="alpList"><div class="alp-empty">Loading…</div></div>
    <div class="alp-pager" id="alpPager"></div>
    </div>
    <div class="alp-section" id="alpEsc" hidden></div>
    <div class="alp-section" id="alpReport" hidden></div>
    <div class="alp-overlay" id="alpOverlay" role="dialog" aria-modal="true" aria-labelledby="alpModalTitle"><div class="alp-modal" id="alpModal"></div></div>
</div>`;
}
