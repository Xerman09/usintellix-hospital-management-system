export function ChartLabelPopupMarkup() {
    return `
<style>
.pcl-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.pcl-overlay.open { display: flex; }
.pcl-box {
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
.pcl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.pcl-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.pcl-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pcl-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: #2d3748;
    color: #fff;
    flex-shrink: 0;
    flex-wrap: wrap;
}
.pcl-toolbar-group { display: flex; align-items: center; gap: 6px; }
.pcl-toolbar button {
    background: none; border: 1px solid rgba(255,255,255,.25); color: #fff;
    width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
}
.pcl-toolbar button:hover { background: rgba(255,255,255,.12); }
.pcl-toolbar label { font-size: 13px; }
.pcl-toolbar input[type="number"] {
    width: 60px; padding: 4px; border-radius: 4px; border: 1px solid rgba(255,255,255,.25);
    background: rgba(255,255,255,.08); color: #fff;
}
.pcl-print-btn {
    margin-left: auto;
    background: var(--accent); color: #fff; border: none; padding: 7px 16px;
    border-radius: 4px; cursor: pointer; font-size: 14px;
}
.pcl-print-btn:hover { background: var(--accent-hover); }

.pcl-preview-wrap { overflow: auto; background: #525659; padding: 24px; flex: 1; }
.pcl-sheet {
    background: #fff; color: #000; margin: 0 auto;
    width: 8.5in; min-height: 11in; padding: 0.5in 0.1875in;
    box-shadow: 0 2px 10px rgba(0,0,0,.4);
    display: grid; grid-template-columns: repeat(3, 2.625in); column-gap: 0.125in; row-gap: 0;
    transform-origin: top center;
}
.pcl-label {
    width: 2.625in; height: 1in; box-sizing: border-box; padding: 6px 8px;
    font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000;
    overflow: hidden;
}
</style>

<div class="pcl-overlay" id="chartLabelPopupOverlay">
    <div class="pcl-box">
        <div class="pcl-header">
            <h2>Chart Label</h2>
            <button type="button" class="pcl-close" id="pclCloseBtn">&times;</button>
        </div>
        <div class="pcl-toolbar">
            <div class="pcl-toolbar-group">
                <button type="button" id="pclZoomOutBtn" title="Zoom out">&minus;</button>
                <button type="button" id="pclZoomInBtn" title="Zoom in">&plus;</button>
            </div>
            <div class="pcl-toolbar-group">
                <label for="pclCopies">Copies:</label>
                <input type="number" id="pclCopies" min="1" max="60" value="30">
            </div>
            <span style="opacity:.7; font-size: 12px;">30-up sheet (Avery 5160-style, 3 &times; 10)</span>
            <button type="button" class="pcl-print-btn" id="pclPrintBtn">Print</button>
        </div>
        <div class="pcl-preview-wrap">
            <div class="pcl-sheet" id="pclSheet"></div>
        </div>
    </div>
</div>
    `;
}
