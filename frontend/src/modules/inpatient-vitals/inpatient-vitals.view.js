export function InpatientVitalsView() {
    return `
<style>
.ivb-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1280px; min-width: 0; }
.ivb-page h1 { margin: 0; font-size: 22px; }
.ivb-intro { margin: 4px 0 14px; color: var(--text-muted); max-width: 820px; line-height: 1.5; }
.ivb-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.ivb-bar select { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.ivb-counts { display: flex; gap: 8px; flex-wrap: wrap; }
.ivb-count { border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 12px; background: var(--bg-surface); font-size: 13px; }
.ivb-count b { font-variant-numeric: tabular-nums; font-size: 15px; margin-right: 4px; }
.ivb-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.ivb-table { width: 100%; border-collapse: collapse; }
.ivb-table th, .ivb-table td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.ivb-table th { color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface-alt); white-space: nowrap; }
.ivb-table td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ivb-table tr:last-child td { border-bottom: 0; }
.ivb-bed { font-weight: 700; white-space: nowrap; }
.ivb-sub { color: var(--text-muted); font-size: 12px; }
.ivb-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.ivb-empty { padding: 32px 16px; text-align: center; color: var(--text-muted); }
@media (max-width: 700px) { .ivb-page { padding: 16px; } .ivb-hide-sm { display: none; } }
</style>
<div class="ivb-page" id="ivbPage">
    <h1>Vital Signs</h1>
    <p class="ivb-intro">Each inpatient's latest vital signs, NEWS2 early warning score and when the next set is due. Sets are due every 4 hours by default (every hour in the ICU). A NEWS2 of 5 or more, or 3 in any single parameter, alerts the nurse, charge nurse and doctor. * = partial score (not every parameter measured).</p>
    <div class="ivb-bar">
        <select id="ivbWard" aria-label="Ward"></select>
        <div class="ivb-counts" id="ivbCounts"></div>
    </div>
    <div class="ivb-card" id="ivbList"><div class="ivb-empty">Loading…</div></div>
</div>`;
}
