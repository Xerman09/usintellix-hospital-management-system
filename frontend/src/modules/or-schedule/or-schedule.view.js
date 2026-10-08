export function OrScheduleView() {
    return `
<style>
.ors-page { width: 100%; font-size: 13.5px; }
.ors-page [hidden], .ors-overlay [hidden] { display: none !important; }
.ors-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.ors-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ors-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.ors-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ors-btn:hover { background: var(--bg-surface-alt); }
.ors-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.ors-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.ors-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.ors-btn:disabled { opacity: .55; cursor: default; }
.ors-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.ors-toolbar select, .ors-toolbar input { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; }
.ors-seg { display: inline-flex; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
.ors-seg button { height: 32px; padding: 0 12px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ors-seg button:last-child { border-right: none; }
.ors-seg button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.ors-range { font-weight: 700; color: var(--text-primary); margin: 0 4px; }
.ors-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 14px; align-items: start; }
.ors-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); min-width: 0; }
.ors-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 12.5px; }
.ors-empty { padding: 26px 14px; text-align: center; color: var(--text-muted); }
.ors-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

/* Day timeline */
.ors-day { overflow-x: auto; }
.ors-day-inner { min-width: 900px; }
.ors-row { display: grid; grid-template-columns: 170px minmax(0, 1fr); border-bottom: 1px solid var(--border-color); }
.ors-row:last-child { border-bottom: none; }
.ors-suite { padding: 8px 10px; border-right: 1px solid var(--border-color); background: var(--bg-surface); position: sticky; left: 0; z-index: 2; }
.ors-suite strong { display: block; font-size: 12.5px; }
.ors-track { position: relative; height: 64px; cursor: copy; background-image: repeating-linear-gradient(to right, transparent 0, transparent calc(100% / var(--hours) - 1px), var(--border-color) calc(100% / var(--hours) - 1px), var(--border-color) calc(100% / var(--hours))); }
.ors-track.off { cursor: not-allowed; background-color: rgba(220,38,38,.06); }
.ors-hours { display: grid; grid-template-columns: 170px minmax(0, 1fr); border-bottom: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.ors-hours > div:last-child { position: relative; height: 26px; }
.ors-hours span { position: absolute; top: 6px; font-size: 10.5px; color: var(--text-muted); transform: translateX(-50%); }
.ors-block { position: absolute; top: 0; bottom: 0; background: rgba(59,130,246,.08); border-left: 2px solid rgba(59,130,246,.45); pointer-events: none; }
.ors-block em { position: absolute; left: 4px; bottom: 2px; font-size: 10px; font-style: normal; font-weight: 700; color: #1d4ed8; white-space: nowrap; overflow: hidden; max-width: calc(100% - 6px); }
.ors-clean { position: absolute; top: 10px; bottom: 10px; background: repeating-linear-gradient(45deg, rgba(148,163,184,.35) 0 4px, transparent 4px 8px); border-radius: 0 6px 6px 0; pointer-events: none; }
.ors-case { position: absolute; top: 8px; bottom: 8px; border-radius: 6px; padding: 4px 6px; overflow: hidden; cursor: pointer; font-size: 11.5px; line-height: 1.25;
    background: #dbeafe; border: 1px solid #93c5fd; color: #1e3a8a; z-index: 1; }
.ors-case:hover { filter: brightness(.97); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.ors-case strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ors-case span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .85; }
.ors-case.urgent { background: #ffedd5; border-color: #fdba74; color: #7c2d12; }
.ors-case.emergency { background: #fee2e2; border-color: #fca5a5; color: #7f1d1d; }
.ors-case.live { background: #dcfce7; border-color: #86efac; color: #14532d; }
.ors-now { position: absolute; top: 0; bottom: 0; width: 2px; background: #dc2626; z-index: 3; pointer-events: none; }

/* Week grid */
.ors-week { overflow-x: auto; }
.ors-week table { width: 100%; border-collapse: collapse; min-width: 900px; table-layout: fixed; }
.ors-week th { padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); text-align: left; }
.ors-week th.today { color: var(--accent); }
.ors-week td { vertical-align: top; padding: 6px; border-bottom: 1px solid var(--border-color); border-left: 1px solid var(--border-color); height: 74px; cursor: copy; }
.ors-week td.suite { cursor: default; border-left: none; width: 150px; }
.ors-chip { display: block; padding: 3px 6px; border-radius: 5px; font-size: 11px; margin-bottom: 3px; background: #dbeafe; color: #1e3a8a; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ors-chip.urgent { background: #ffedd5; color: #7c2d12; }
.ors-chip.emergency { background: #fee2e2; color: #7f1d1d; }
.ors-chip.block { background: transparent; border: 1px dashed rgba(59,130,246,.5); color: #1d4ed8; cursor: default; }

/* Ready list */
.ors-ready { display: flex; flex-direction: column; gap: 8px; padding: 10px; max-height: 70vh; overflow-y: auto; }
.ors-req { border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; background: var(--bg-surface); }
.ors-req strong { font-size: 12.5px; }
.ors-req .row { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-top: 6px; }
.ors-badge { display: inline-flex; align-items: center; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
.ors-badge.emergency { background: #fee2e2; color: #991b1b; }
.ors-badge.urgent { background: #ffedd5; color: #9a3412; }
.ors-badge.muted { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.ors-badge.ok { background: #dcfce7; color: #166534; }
.ors-badge.bad { background: #fee2e2; color: #991b1b; }
.ors-badge.warn { background: #fef3c7; color: #92400e; }
.ors-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11.5px; color: var(--text-muted); margin-top: 8px; }
.ors-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 4px; }

/* Dialogs */
.ors-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: none; align-items: flex-start; justify-content: center; z-index: 2000; padding: 28px 16px; overflow-y: auto; }
.ors-overlay.open { display: flex; }
.ors-overlay.top { z-index: 2050; }
.ors-modal { background: var(--bg-surface); color: var(--text-primary); border-radius: 12px; width: 100%; max-width: 820px; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
.ors-modal.narrow { max-width: 520px; }
.ors-mhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.ors-mhead h2 { margin: 0; font-size: 16px; }
.ors-x { background: none; border: none; font-size: 22px; line-height: 1; color: var(--text-muted); cursor: pointer; }
.ors-mbody { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.ors-mfoot { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-color); }
.ors-mfoot .left { margin-right: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.ors-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.ors-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.ors-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ors-field.wide { grid-column: 1 / -1; }
.ors-field > span:first-child { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.ors-field input, .ors-field select, .ors-field textarea { height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; box-sizing: border-box; min-width: 0; }
.ors-field textarea { height: auto; min-height: 56px; padding: 8px 10px; resize: vertical; }
.ors-field.has-error input, .ors-field.has-error select, .ors-field.has-error textarea { border-color: #dc2626; }
.ors-err { font-size: 11.5px; color: #dc2626; }
.ors-err:empty { display: none; }
.ors-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px 14px; padding: 10px 12px; border-radius: 10px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); }
.ors-summary div > span { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); font-weight: 600; }
.ors-avail { border-radius: 10px; padding: 10px 12px; font-size: 12.5px; border: 1px solid var(--border-color); }
.ors-avail.ok { border-color: #86efac; background: #f0fdf4; color: #166534; }
.ors-avail.bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
.ors-avail.warn { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.ors-avail ul { margin: 4px 0 0; padding-left: 18px; }
.ors-alert { padding: 9px 12px; border-radius: 8px; font-size: 12.5px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; }
.ors-check { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; }
.ors-check input { width: 16px; height: 16px; margin-top: 1px; accent-color: var(--accent); }
.ors-hist { display: flex; flex-direction: column; gap: 8px; }
.ors-hist div { border-left: 3px solid var(--border-color); padding: 2px 0 2px 10px; font-size: 12.5px; }
.ors-hist div.cancelled { border-left-color: #dc2626; }
.ors-hist div.rescheduled { border-left-color: #d97706; }
.ors-hist div.booked { border-left-color: #16a34a; }
.ors-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ors-table th { text-align: left; padding: 7px 8px; font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color); }
.ors-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }

:root[data-theme="dark"] .ors-case, :root[data-theme="dark"] .ors-chip { background: rgba(59,130,246,.22); border-color: rgba(59,130,246,.5); color: #dbeafe; }
:root[data-theme="dark"] .ors-case.urgent, :root[data-theme="dark"] .ors-chip.urgent { background: rgba(249,115,22,.22); border-color: rgba(249,115,22,.5); color: #fed7aa; }
:root[data-theme="dark"] .ors-case.emergency, :root[data-theme="dark"] .ors-chip.emergency { background: rgba(239,68,68,.24); border-color: rgba(239,68,68,.5); color: #fecaca; }
:root[data-theme="dark"] .ors-case.live { background: rgba(34,197,94,.22); border-color: rgba(34,197,94,.5); color: #bbf7d0; }
:root[data-theme="dark"] .ors-block em, :root[data-theme="dark"] .ors-chip.block { color: #93c5fd; }
:root[data-theme="dark"] .ors-avail.ok { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.45); color: #bbf7d0; }
:root[data-theme="dark"] .ors-avail.bad, :root[data-theme="dark"] .ors-alert { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.45); color: #fecaca; }
:root[data-theme="dark"] .ors-avail.warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); color: #fde68a; }
:root[data-theme="dark"] .ors-badge.emergency, :root[data-theme="dark"] .ors-badge.bad { background: rgba(239,68,68,.18); color: #fecaca; }
:root[data-theme="dark"] .ors-badge.urgent { background: rgba(249,115,22,.18); color: #fed7aa; }
:root[data-theme="dark"] .ors-badge.ok { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .ors-badge.warn { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .ors-err { color: #fca5a5; }

@media (max-width: 1000px) { .ors-layout { grid-template-columns: minmax(0, 1fr); } .ors-ready { max-height: none; } }
@media (max-width: 640px) { .ors-overlay { padding: 10px 6px; } .ors-toolbar > * { flex: 1 1 auto; } }
</style>

<div class="ors-page">
    <div class="ors-header">
        <div>
            <h1>OR Schedule</h1>
            <p>Book surgery requests that are ready into the operating rooms. Bookings are checked for overlapping cases (with each suite's cleaning time), people in two places at once, and suites under maintenance; block times reserve a suite for a specialization.</p>
        </div>
        <button type="button" class="ors-btn" id="orsBlocksBtn" hidden>Block times &amp; cleaning time</button>
    </div>
    <div class="ors-toolbar">
        <div class="ors-seg" role="group" aria-label="View"><button type="button" data-ors-days="1" class="active">Day</button><button type="button" data-ors-days="7">Week</button></div>
        <button type="button" class="ors-btn small" id="orsPrev" aria-label="Previous">&#9664;</button>
        <button type="button" class="ors-btn small" id="orsToday">Today</button>
        <button type="button" class="ors-btn small" id="orsNext" aria-label="Next">&#9654;</button>
        <input type="date" id="orsDate" aria-label="Date">
        <span class="ors-range" id="orsRange"></span>
        <select id="orsSpec" aria-label="Specialization"><option value="">All specializations</option></select>
        <select id="orsSuite" aria-label="Suite"><option value="">All suites</option></select>
        <select id="orsSurgeon" aria-label="Surgeon"><option value="">All surgeons</option></select>
        <button type="button" class="ors-btn small" id="orsPrint" title="Print the OR list for the day shown (the suite chosen, or all)">Print OR list</button>
    </div>
    <div class="ors-layout">
        <div>
            <div class="ors-card"><div id="orsCalendar"><div class="ors-empty">Loading...</div></div></div>
            <div class="ors-legend"><span><i style="background:#dbeafe;border:1px solid #93c5fd;"></i>Elective</span><span><i style="background:#ffedd5;border:1px solid #fdba74;"></i>Urgent</span>
                <span><i style="background:#fee2e2;border:1px solid #fca5a5;"></i>Emergency</span><span><i style="background:#dcfce7;border:1px solid #86efac;"></i>In progress</span>
                <span><i style="background:repeating-linear-gradient(45deg, rgba(148,163,184,.5) 0 3px, transparent 3px 6px);"></i>Cleaning</span>
                <span><i style="background:rgba(59,130,246,.12);border-left:2px solid rgba(59,130,246,.5);"></i>Block time</span>
                <span>Click an empty slot to book it.</span></div>
        </div>
        <div class="ors-card">
            <div class="ors-card-head"><span>Ready to schedule</span><span class="ors-badge muted" id="orsReadyCount">0</span></div>
            <div class="ors-ready" id="orsReady"><div class="ors-empty">Loading...</div></div>
        </div>
    </div>
</div>

<div class="ors-overlay" id="orsBookOverlay" role="dialog" aria-modal="true" aria-labelledby="orsBookTitle"><div class="ors-modal" id="orsBookModal"></div></div>
<div class="ors-overlay" id="orsCaseOverlay" role="dialog" aria-modal="true" aria-labelledby="orsCaseTitle"><div class="ors-modal" id="orsCaseModal"></div></div>
<div class="ors-overlay" id="orsBlocksOverlay" role="dialog" aria-modal="true" aria-labelledby="orsBlocksTitle"><div class="ors-modal" id="orsBlocksModal"></div></div>
<div class="ors-overlay top" id="orsDialogOverlay" role="dialog" aria-modal="true" aria-labelledby="orsDialogTitle"><div class="ors-modal narrow" id="orsDialogModal"></div></div>`;
}
