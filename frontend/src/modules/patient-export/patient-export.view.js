export function PatientExportModalMarkup() {
    return `
<style>
.pex-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.pex-overlay.open { display: flex; }

.pex-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(760px, 94vw);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}

.pex-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.pex-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

.pex-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pex-body {
    padding: 18px 20px;
    overflow-y: auto;
}

.pex-textarea {
    width: 100%;
    height: 360px;
    padding: 12px 14px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface-alt);
    color: var(--text-primary);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
}

.pex-footer {
    display: flex;
    justify-content: flex-end;
    padding: 14px 20px;
    border-top: 1px solid var(--border-color);
}

.pex-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface-alt);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.pex-btn:hover { background: var(--bg-surface); }
</style>

<div class="pex-overlay" id="exportModalOverlay">
    <div class="pex-box">
        <div class="pex-header">
            <h2>Export</h2>
            <button type="button" class="pex-close" id="pexCloseBtn">&times;</button>
        </div>
        <div class="pex-body">
            <textarea class="pex-textarea" id="pexTextarea" readonly></textarea>
        </div>
        <div class="pex-footer">
            <button type="button" class="pex-btn" id="pexCloseBtn2"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Close</button>
        </div>
    </div>
</div>
    `;
}
