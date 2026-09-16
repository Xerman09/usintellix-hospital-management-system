export function BarcodeLabelPopupMarkup() {
    return `
<style>
.pbl-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.pbl-overlay.open { display: flex; }
.pbl-box {
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
.pbl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.pbl-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.pbl-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pbl-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: #2d3748;
    color: #fff;
    flex-shrink: 0;
    flex-wrap: wrap;
}
.pbl-toolbar-group { display: flex; align-items: center; gap: 6px; }
.pbl-toolbar button {
    background: none; border: 1px solid rgba(255,255,255,.25); color: #fff;
    width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
}
.pbl-toolbar button:hover { background: rgba(255,255,255,.12); }
.pbl-toolbar select {
    background: rgba(255,255,255,.08); color: #fff; border: 1px solid rgba(255,255,255,.25);
    border-radius: 4px; padding: 4px;
}
.pbl-toolbar label { font-size: 13px; }
.pbl-print-btn {
    margin-left: auto;
    background: var(--accent); color: #fff; border: none; padding: 7px 16px;
    border-radius: 4px; cursor: pointer; font-size: 14px;
}
.pbl-print-btn:hover { background: var(--accent-hover); }

.pbl-preview-wrap { overflow: auto; background: #525659; padding: 24px; flex: 1; display: flex; align-items: flex-start; justify-content: center; }
.pbl-sheet {
    background: #fff; color: #000; width: 8.5in; min-height: 11in;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 10px rgba(0,0,0,.4);
    transform-origin: top center;
}
.pbl-label-block { text-align: center; font-family: Arial, sans-serif; }
.pbl-label-block svg { max-width: 100%; }
</style>

<div class="pbl-overlay" id="barcodeLabelPopupOverlay">
    <div class="pbl-box">
        <div class="pbl-header">
            <h2>Barcode Label</h2>
            <button type="button" class="pbl-close" id="pblCloseBtn">&times;</button>
        </div>
        <div class="pbl-toolbar">
            <div class="pbl-toolbar-group">
                <button type="button" id="pblZoomOutBtn" title="Zoom out">&minus;</button>
                <button type="button" id="pblZoomInBtn" title="Zoom in">&plus;</button>
            </div>
            <div class="pbl-toolbar-group">
                <label for="pblFormat">Format:</label>
                <select id="pblFormat">
                    <option value="CODE128">Code 128</option>
                    <option value="CODE39">Code 39</option>
                </select>
            </div>
            <button type="button" class="pbl-print-btn" id="pblPrintBtn">Print</button>
        </div>
        <div class="pbl-preview-wrap">
            <div class="pbl-sheet" id="pblSheet">
                <div class="pbl-label-block">
                    <svg id="pblBarcode"></svg>
                </div>
            </div>
        </div>
    </div>
</div>
    `;
}
