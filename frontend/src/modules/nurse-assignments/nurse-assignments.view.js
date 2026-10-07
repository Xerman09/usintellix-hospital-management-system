export function NurseAssignmentsView() {
    return `
<style>
.nas-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1280px; min-width: 0; }
.nas-page h1 { margin: 0; font-size: 22px; }
.nas-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 820px; line-height: 1.5; }
.nas-mine { background: var(--bg-surface); border: 1px solid var(--border-color); border-left: 4px solid var(--accent); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
.nas-mine h2 { margin: 0 0 8px; font-size: 15px; }
.nas-mine-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
.nas-mine-item { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; background: var(--bg-surface-alt); }
.nas-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.nas-bar select, .nas-bar input, .nas-row select, .nas-form textarea, .nas-form select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.nas-bar input[type=date] { width: 150px; }
.nas-state { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 10px; }
.nas-state.current { background: #dcfce7; color: #166534; }
.nas-state.future { background: var(--accent-lighter); color: var(--accent-text); }
.nas-state.past { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
:root[data-theme="dark"] .nas-state.current { background: #14532d; color: #bbf7d0; }
.nas-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
.nas-btn:hover { background: var(--bg-surface-alt); }
.nas-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.nas-btn.primary:hover { background: var(--accent-hover); }
.nas-btn.small { padding: 4px 9px; font-size: 12px; }
.nas-btn:disabled { opacity: .55; cursor: default; }
.nas-btn:focus-visible, .nas-row select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.nas-note { background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 12px; color: var(--text-muted); margin-bottom: 12px; }
.nas-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 14px; align-items: start; }
@media (max-width: 980px) { .nas-grid { grid-template-columns: minmax(0, 1fr); } }
.nas-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; min-width: 0; }
.nas-table { width: 100%; border-collapse: collapse; }
.nas-table th, .nas-table td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.nas-table th { color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.nas-table tr:last-child td { border-bottom: 0; }
.nas-table tr.changed td { background: rgba(var(--accent-rgb), .06); }
.nas-table tr.gone td { opacity: .6; }
.nas-bed { font-weight: 700; white-space: nowrap; }
.nas-pt { font-weight: 600; }
.nas-link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; font-weight: 600; cursor: pointer; text-align: left; }
.nas-link:hover { text-decoration: underline; }
.nas-sub { color: var(--text-muted); font-size: 12px; }
.nas-iso { display: inline-block; font-size: 11px; font-weight: 700; color: #b91c1c; background: #fee2e2; border-radius: 8px; padding: 1px 7px; margin-top: 3px; }
:root[data-theme="dark"] .nas-iso { background: #7f1d1d; color: #fecaca; }
.nas-row select { width: 100%; min-width: 150px; }
.nas-ho { font-size: 12px; white-space: nowrap; }
.nas-ho.ok { color: #15803d; }
.nas-ho.wait { color: #b45309; font-weight: 600; }
:root[data-theme="dark"] .nas-ho.ok { color: #86efac; }
:root[data-theme="dark"] .nas-ho.wait { color: #fcd34d; }
.nas-staff { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; }
.nas-staff h3 { margin: 0 0 8px; font-size: 14px; }
.nas-staff-row { display: flex; justify-content: space-between; gap: 8px; padding: 5px 0; border-bottom: 1px dashed var(--border-color); font-size: 13px; }
.nas-staff-row:last-child { border-bottom: 0; }
.nas-load { font-variant-numeric: tabular-nums; font-weight: 700; }
.nas-load.heavy { color: #dc2626; }
.nas-empty { padding: 32px 16px; text-align: center; color: var(--text-muted); }
.nas-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap; }
.nas-dirty { color: var(--text-muted); font-size: 12.5px; margin-right: auto; }
@media (max-width: 700px) { .nas-page { padding: 16px; } .nas-hide-sm { display: none; } }
</style>
<div class="nas-page" id="nasPage">
    <h1>Shift Assignments</h1>
    <p class="nas-intro">Who looks after each patient this shift: one nurse and one CNA per patient. The charge nurse assigns the ward's patients; at the end of the shift each nurse writes a hand-over that the next shift receives.</p>
    <div id="nasMine"></div>
    <div class="nas-bar">
        <select id="nasWard" aria-label="Ward"></select>
        <button type="button" class="nas-btn small" id="nasPrev" aria-label="Previous shift">‹</button>
        <input type="date" id="nasDate" aria-label="Date">
        <select id="nasShift" aria-label="Shift"></select>
        <button type="button" class="nas-btn small" id="nasNext" aria-label="Next shift">›</button>
        <button type="button" class="nas-btn small" id="nasNow">Now</button>
        <span id="nasState"></span>
    </div>
    <div id="nasNote"></div>
    <div class="nas-grid">
        <div>
            <div class="nas-card" id="nasList"><div class="nas-empty">Loading…</div></div>
            <div class="nas-foot" id="nasFoot" hidden>
                <span class="nas-dirty" id="nasDirty"></span>
                <button type="button" class="nas-btn" id="nasCopy">Copy from previous shift</button>
                <button type="button" class="nas-btn primary" id="nasSave" disabled>Save assignments</button>
            </div>
        </div>
        <aside class="nas-staff" id="nasStaff" aria-label="Staff on this ward"></aside>
    </div>
</div>`;
}
