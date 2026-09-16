export function AddressLabelPopupMarkup() {
    return `
<style>
.pal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.pal-overlay.open { display: flex; }
.pal-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(1000px, 96vw);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.pal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.pal-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.pal-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pal-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: #2d3748;
    color: #fff;
    flex-shrink: 0;
    flex-wrap: wrap;
}
.pal-toolbar-group { display: flex; align-items: center; gap: 6px; }
.pal-toolbar button {
    background: none; border: 1px solid rgba(255,255,255,.25); color: #fff;
    width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
}
.pal-toolbar button:hover { background: rgba(255,255,255,.12); }
.pal-toolbar button.active { background: var(--accent); border-color: var(--accent); }
.pal-print-btn {
    margin-left: auto;
    background: var(--accent); color: #fff; border: none; padding: 7px 16px;
    border-radius: 4px; cursor: pointer; font-size: 14px;
}
.pal-print-btn:hover { background: var(--accent-hover); }

.pal-preview-wrap { overflow: auto; background: #525659; padding: 24px; flex: 1; display: flex; align-items: flex-start; justify-content: center; }
.pal-sheet {
    background: #fff; color: #000; width: 8.5in; min-height: 11in;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 10px rgba(0,0,0,.4);
    transform-origin: top center;
}
.pal-label-text {
    font-family: Arial, sans-serif; font-size: 18px; line-height: 1.5; text-align: center; white-space: nowrap;
    transition: transform .15s ease;
}
</style>

<div class="pal-overlay" id="addressLabelPopupOverlay">
    <div class="pal-box">
        <div class="pal-header">
            <h2>Address Label</h2>
            <button type="button" class="pal-close" id="palCloseBtn">&times;</button>
        </div>
        <div class="pal-toolbar">
            <div class="pal-toolbar-group">
                <button type="button" id="palZoomOutBtn" title="Zoom out">&minus;</button>
                <button type="button" id="palZoomInBtn" title="Zoom in">&plus;</button>
            </div>
            <div class="pal-toolbar-group">
                <button type="button" id="palRotateBtn" title="Rotate 90&deg;">&#8635;</button>
            </div>
            <button type="button" class="pal-print-btn" id="palPrintBtn">Print</button>
        </div>
        <div class="pal-preview-wrap">
            <div class="pal-sheet" id="palSheet">
                <div class="pal-label-text" id="palLabelText"></div>
            </div>
        </div>
    </div>
</div>
    `;
}
