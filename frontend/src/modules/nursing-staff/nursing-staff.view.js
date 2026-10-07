export function NursingStaffView() {
    return `
<style>
.nsw-page { padding: 20px 24px 32px; color: var(--text-primary); font-size: 13.5px; max-width: 1200px; min-width: 0; }
.nsw-page h1 { margin: 0; font-size: 22px; }
.nsw-intro { margin: 4px 0 16px; color: var(--text-muted); max-width: 780px; line-height: 1.5; }
.nsw-wards { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
.nsw-ward { text-align: left; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 12px; cursor: pointer; color: inherit; font: inherit; }
.nsw-ward:hover { background: var(--bg-surface-alt); }
.nsw-ward.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.nsw-ward:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.nsw-ward .n { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.nsw-ward .l { color: var(--text-muted); font-size: 12px; overflow-wrap: anywhere; }
.nsw-ward.warn .n { color: #d97706; }
.nsw-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; align-items: center; }
.nsw-bar select, .nsw-bar input { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; }
.nsw-bar input { flex: 1; min-width: 180px; max-width: 320px; }
.nsw-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto; }
.nsw-table { width: 100%; border-collapse: collapse; }
.nsw-table th, .nsw-table td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.nsw-table th { color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface-alt); }
.nsw-table tr:last-child td { border-bottom: 0; }
.nsw-name { font-weight: 600; }
.nsw-sub { color: var(--text-muted); font-size: 12px; }
.nsw-role { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--accent-lighter); color: var(--accent-text); white-space: nowrap; }
.nsw-role.charge_nurse { background: #ede9fe; color: #5b21b6; }
.nsw-role.cna { background: #dcfce7; color: #166534; }
:root[data-theme="dark"] .nsw-role.charge_nurse { background: #3b0764; color: #ddd6fe; }
:root[data-theme="dark"] .nsw-role.cna { background: #14532d; color: #bbf7d0; }
.nsw-chip { display: inline-block; border: 1px solid var(--border-color); border-radius: 12px; padding: 2px 9px; font-size: 12px; margin: 2px 4px 2px 0; white-space: nowrap; }
.nsw-chip.main { border-color: var(--accent); color: var(--accent-text); font-weight: 600; }
.nsw-none { color: #d97706; font-size: 12.5px; font-weight: 600; }
.nsw-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
.nsw-btn:hover { background: var(--bg-surface-alt); }
.nsw-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.nsw-btn.primary:hover { background: var(--accent-hover); }
.nsw-btn:disabled { opacity: .55; cursor: default; }
.nsw-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.nsw-empty { padding: 36px 16px; text-align: center; color: var(--text-muted); }
.nsw-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 4000; display: none; align-items: flex-start; justify-content: center; padding: 8vh 16px 16px; overflow-y: auto; }
.nsw-overlay.open { display: flex; }
.nsw-modal { background: var(--bg-surface); color: var(--text-primary); width: 100%; max-width: 520px; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.3); }
.nsw-mhead { display: flex; justify-content: space-between; gap: 10px; padding: 16px 20px 6px; }
.nsw-mhead h2 { margin: 0; font-size: 18px; }
.nsw-x { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.nsw-x:hover { background: var(--bg-surface-alt); color: var(--text-primary); }
.nsw-mbody { padding: 4px 20px 8px; }
.nsw-wardrow { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 8px; }
.nsw-wardrow.locked { opacity: .6; }
.nsw-wardrow input { width: 16px; height: 16px; margin: 0; }
.nsw-main-pick { font-size: 12.5px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.nsw-err { color: #dc2626; font-size: 12.5px; margin-top: 6px; }
.nsw-mfoot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--border-color); margin-top: 8px; }
.nsw-hist { margin-top: 12px; font-size: 12.5px; color: var(--text-muted); }
.nsw-hist li { margin-bottom: 4px; }
@media (max-width: 700px) { .nsw-page { padding: 16px; } .nsw-hide-sm { display: none; } }
</style>
<div class="nsw-page" id="nswPage">
    <h1>Nursing Staff &amp; Wards</h1>
    <p class="nsw-intro" id="nswIntro">Nurses, charge nurses and CNAs, and the wards each one works in. A person can work in several wards; one is their main ward.</p>
    <div class="nsw-wards" id="nswWards" aria-label="Filter by ward"></div>
    <div class="nsw-bar">
        <select id="nswRole" aria-label="Role"><option value="">All nursing roles</option></select>
        <input type="search" id="nswQ" placeholder="Search by name or employee number" aria-label="Search staff">
    </div>
    <div class="nsw-card" id="nswList"><div class="nsw-empty">Loading…</div></div>
    <div class="nsw-overlay" id="nswOverlay" role="dialog" aria-modal="true" aria-labelledby="nswModalTitle"><div class="nsw-modal" id="nswModal"></div></div>
</div>`;
}
