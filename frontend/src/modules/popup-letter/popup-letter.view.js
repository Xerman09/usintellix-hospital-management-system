export function LetterPopupMarkup() {
    return `
<style>
.plt-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.plt-overlay.open { display: flex; }
.plt-box {
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
.plt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.plt-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.plt-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}
.plt-body { overflow-y: auto; padding: 20px; }

.plt-title { text-align: center; font-weight: 600; font-size: 15px; margin-bottom: 16px; }
.plt-fields { display: grid; grid-template-columns: 90px 1fr 90px 1fr; gap: 10px 14px; align-items: center; margin-bottom: 14px; }
.plt-fields label { color: var(--text-primary); text-align: right; }
.plt-select, .plt-input {
    padding: 6px; border: 1px solid var(--border-color); border-radius: 3px;
    background: var(--bg-surface); color: var(--text-primary); width: 100%;
}
.plt-special-row { display: flex; align-items: center; gap: 10px; background: var(--bg-surface-alt); padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; }
.plt-special-row label { color: var(--text-primary); white-space: nowrap; }
.plt-body-text {
    width: 100%; min-height: 260px; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;
    background: var(--bg-surface); color: var(--text-primary); resize: vertical; font-family: inherit; font-size: 14px;
    box-sizing: border-box;
}
.plt-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.plt-btn { border: none; padding: 8px 16px; border-radius: 3px; font-size: 14px; cursor: pointer; }
.plt-btn-primary { background: var(--accent); color: #fff; }
.plt-btn-primary:hover { background: var(--accent-hover); }
.plt-btn-secondary { background: var(--bg-surface-alt); color: var(--text-primary); border: 1px solid var(--border-color); }
</style>

<div class="plt-overlay" id="letterPopupOverlay">
    <div class="plt-box">
        <div class="plt-header">
            <h2>Letter</h2>
            <button type="button" class="plt-close" id="pltCloseBtn">&times;</button>
        </div>
        <div class="plt-body" id="letterPopupBody"></div>
    </div>
</div>
    `;
}

export function LetterView(patientLabel) {
    return `
        <div class="plt-title">Generate Letter regarding ${patientLabel}</div>

        <div class="plt-fields">
            <label>From:</label>
            <select id="pltFrom" class="plt-select"></select>

            <label>Date:</label>
            <input id="pltDate" type="date" class="plt-input">

            <label>Specialty:</label>
            <select id="pltSpecialty" class="plt-select"></select>

            <label>Template:</label>
            <select id="pltTemplate" class="plt-select">
                <option value="">(none)</option>
            </select>

            <label>To:</label>
            <select id="pltTo" class="plt-select"></select>

            <label>Print Format:</label>
            <select id="pltPrintFormat" class="plt-select">
                <option value="html">HTML</option>
                <option value="plain">Plain Text</option>
            </select>
        </div>

        <div class="plt-special-row">
            <label>Insert special field:</label>
            <select id="pltSpecialField" class="plt-select" style="max-width: 260px;">
                <option value="">- Choose -</option>
            </select>
        </div>

        <textarea id="pltBody" class="plt-body-text"></textarea>

        <div class="plt-actions">
            <button id="pltSaveNewBtn" type="button" class="plt-btn plt-btn-secondary">Save as New</button>
            <button id="pltSaveChangesBtn" type="button" class="plt-btn plt-btn-secondary" disabled>Save Changes</button>
            <button id="pltGenerateBtn" type="button" class="plt-btn plt-btn-primary">Generate Letter</button>
        </div>
    `;
}
