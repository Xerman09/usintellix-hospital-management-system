export function SuperbillPopupMarkup() {
    return `
<style>
.psb-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.psb-overlay.open { display: flex; }
.psb-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(950px, 96vw);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.psb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.psb-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.psb-header-actions { display: flex; align-items: center; gap: 10px; }
.psb-print-btn {
    padding: 6px 14px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
}
.psb-print-btn:hover { background: var(--accent-hover); }
.psb-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}
.psb-body {
    overflow-y: auto;
    background: #e5e7eb;
    padding: 20px;
}

/* The document itself is styled to look like a printed page (fixed
   white/black) regardless of site theme, same precedent as the
   Reports > Blank Forms superbill template this reuses the layout
   from -- a printout doesn't follow dark mode. */
.psb-doc { background: #fff; color: #000; padding: 24px; max-width: 900px; margin: 0 auto; font-family: Arial, sans-serif; }
.psb-doc .sb-table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; margin-top: 14px; }
.psb-doc .sb-table td, .psb-doc .sb-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; font-size: 11px; }
.psb-doc .sb-checkbox { width: 25px; border-right: 1px solid #000; text-align: center; }
.psb-doc .sb-header-row { display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 4px; font-size: 12px; }
.psb-doc .sb-value { font-weight: 600; }
.psb-doc .sb-charges-list { font-size: 11px; padding: 4px; list-style: none; margin: 0; }
.psb-doc .sb-charges-list li { padding: 2px 0; border-bottom: 1px dashed #ccc; }
.psb-doc .sb-empty-note { color: #666; font-style: italic; }
</style>

<div class="psb-overlay" id="superbillPopupOverlay">
    <div class="psb-box">
        <div class="psb-header">
            <h2>Superbill</h2>
            <div class="psb-header-actions">
                <button type="button" class="psb-print-btn" id="psbPrintBtn">Print</button>
                <button type="button" class="psb-close" id="psbCloseBtn">&times;</button>
            </div>
        </div>
        <div class="psb-body" id="superbillPopupBody"></div>
    </div>
</div>
    `;
}
