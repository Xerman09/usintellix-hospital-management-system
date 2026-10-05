/** Shared look for the surgery setup screens (Specializations, Surgeries). */
export const SURGERY_SETUP_STYLES = `
<style>
.ss-page { width: 100%; font-size: 13.5px; }
.ss-page [hidden] { display: none !important; }
.ss-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.ss-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ss-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 760px; }
.ss-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 6px; white-space: nowrap;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ss-btn:hover { background: var(--bg-surface-alt); }
.ss-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.ss-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.ss-btn.danger { border-color: #dc2626; background: #dc2626; color: #fff; }
.ss-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.ss-btn:disabled { opacity: .55; cursor: default; }
.ss-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.ss-tools input[type="search"], .ss-tools select { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 12.5px; font-family: inherit; min-width: 0; }
.ss-tools input[type="search"] { width: 260px; max-width: 100%; }
.ss-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; }
.ss-check input { width: 16px; height: 16px; accent-color: var(--accent); }
.ss-tabs { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; max-width: 100%; }
.ss-tabs button { height: 34px; padding: 0 14px; border: none; border-right: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.ss-tabs button:last-child { border-right: none; }
.ss-tabs button.active { background: var(--accent-light); color: var(--accent-text, var(--accent)); }
.ss-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); overflow: hidden; }
.ss-table-wrap { overflow-x: auto; }
.ss-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ss-table th { text-align: left; padding: 9px 12px; white-space: nowrap; color: var(--text-muted); background: var(--bg-surface-alt); font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.ss-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: middle; }
.ss-table tbody tr:last-child td { border-bottom: none; }
.ss-table tr.off td { opacity: .6; }
.ss-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ss-table .actions { white-space: nowrap; text-align: right; }
.ss-table .actions .ss-btn + .ss-btn { margin-left: 6px; }
.ss-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.ss-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); }
.ss-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ss-badge.surgical { background: #dbeafe; color: #1e40af; }
.ss-badge.anesthesiology { background: #ede9fe; color: #5b21b6; }
.ss-badge.medical { background: #dcfce7; color: #166534; }
.ss-badge.other, .ss-badge.muted { background: var(--bg-surface-alt); color: var(--text-muted); border: 1px solid var(--border-color); }
.ss-badge.warn { background: #fef3c7; color: #92400e; }
.ss-badge.off { background: #fee2e2; color: #991b1b; }
:root[data-theme="dark"] .ss-badge.surgical { background: rgba(59,130,246,.2); color: #bfdbfe; }
:root[data-theme="dark"] .ss-badge.anesthesiology { background: rgba(139,92,246,.22); color: #ddd6fe; }
:root[data-theme="dark"] .ss-badge.medical { background: rgba(34,197,94,.18); color: #bbf7d0; }
:root[data-theme="dark"] .ss-badge.warn { background: rgba(245,158,11,.18); color: #fde68a; }
:root[data-theme="dark"] .ss-badge.off { background: rgba(239,68,68,.18); color: #fecaca; }
.ss-tags { display: flex; flex-wrap: wrap; gap: 4px; }

.ss-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: none; align-items: flex-start; justify-content: center; z-index: 2000; padding: 32px 16px; overflow-y: auto; }
.ss-overlay.open { display: flex; }
.ss-modal { background: var(--bg-surface); color: var(--text-primary); border-radius: 12px; width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
.ss-modal.wide { max-width: 900px; }
.ss-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.ss-modal-head h2 { margin: 0; font-size: 16px; }
.ss-x { background: none; border: none; font-size: 22px; line-height: 1; color: var(--text-muted); cursor: pointer; }
.ss-modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.ss-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-color); }
.ss-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.ss-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.ss-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ss-field.wide { grid-column: 1 / -1; }
.ss-field > span { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.ss-field input, .ss-field select, .ss-field textarea { height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; box-sizing: border-box; min-width: 0; }
.ss-field textarea { height: auto; min-height: 60px; padding: 8px 10px; resize: vertical; }
.ss-field.has-error input, .ss-field.has-error select { border-color: #dc2626; }
.ss-err { font-size: 11.5px; color: #dc2626; min-height: 0; }
.ss-err:empty { display: none; }
:root[data-theme="dark"] .ss-err { color: #fca5a5; }
.ss-hint { font-size: 11.5px; color: var(--text-muted); }
.ss-alert { padding: 9px 12px; border-radius: 8px; font-size: 12.5px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; }
:root[data-theme="dark"] .ss-alert { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.45); color: #fecaca; }
.ss-checks { display: flex; flex-wrap: wrap; gap: 10px 22px; }

@media (max-width: 700px) {
    .ss-tools input[type="search"] { width: 100%; }
    .ss-tools select { width: 100%; }
    .ss-overlay { padding: 12px 8px; }
}
</style>`;

export function SpecializationsView() {
    return `${SURGERY_SETUP_STYLES}
<div class="ss-page">
    <div class="ss-header">
        <div>
            <h1>Specializations</h1>
            <p>The one list of medical specializations. Doctors are linked to theirs under Providers; each surgery type belongs to one. When booking surgery, surgeons are matched by the case's specialization and anesthesiologists by Anesthesiology.</p>
        </div>
        <button type="button" class="ss-btn primary" id="spAdd">+ Add specialization</button>
    </div>
    <div class="ss-tools">
        <div class="ss-tabs" id="spTabs"></div>
        <input type="search" id="spSearch" placeholder="Search specializations..." aria-label="Search specializations">
        <label class="ss-check"><input type="checkbox" id="spShowOff"> Show switched off</label>
    </div>
    <div class="ss-card"><div id="spBody"><div class="ss-empty">Loading...</div></div></div>
</div>

<div class="ss-overlay" id="spOverlay" role="dialog" aria-modal="true" aria-labelledby="spModalTitle">
    <div class="ss-modal">
        <div class="ss-modal-head"><h2 id="spModalTitle">Add specialization</h2><button type="button" class="ss-x" data-sp-close aria-label="Close">&times;</button></div>
        <form id="spForm" autocomplete="off">
            <div class="ss-modal-body">
                <div id="spAlert"></div>
                <label class="ss-field"><span>Name *</span><input id="spName" maxlength="120" placeholder="e.g. Hand Surgery"><span class="ss-err" data-err="name"></span></label>
                <label class="ss-field"><span>Type *</span><select id="spCategory"></select><span class="ss-err" data-err="category"></span>
                    <span class="ss-hint">Surgical specializations can be picked as surgeons; Anesthesiology as anesthesiologists.</span></label>
                <label class="ss-field"><span>Description</span><input id="spDescription" maxlength="255" placeholder="Optional"></label>
            </div>
            <div class="ss-modal-foot"><button type="button" class="ss-btn" data-sp-close>Cancel</button><button type="submit" class="ss-btn primary" id="spSave">Save</button></div>
        </form>
    </div>
</div>

<div class="ss-overlay" id="spConfirm" role="dialog" aria-modal="true" aria-labelledby="spConfirmTitle">
    <div class="ss-modal">
        <div class="ss-modal-head"><h2 id="spConfirmTitle"></h2><button type="button" class="ss-x" data-sp-confirm-close aria-label="Close">&times;</button></div>
        <div class="ss-modal-body" id="spConfirmBody"></div>
        <div class="ss-modal-foot"><button type="button" class="ss-btn" data-sp-confirm-close>Cancel</button><button type="button" class="ss-btn primary" id="spConfirmOk"></button></div>
    </div>
</div>`;
}
