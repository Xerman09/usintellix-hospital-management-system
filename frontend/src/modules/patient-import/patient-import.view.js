export function PatientImportModalMarkup() {
    return `
<style>
.pim-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.pim-overlay.open { display: flex; }

.pim-box {
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

.pim-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.pim-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

.pim-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pim-body {
    padding: 18px 20px;
    overflow-y: auto;
}

.pim-alert { margin-bottom: 12px; }

.pim-textarea {
    width: 100%;
    height: 300px;
    padding: 12px 14px;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
}

.pim-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding: 14px 20px;
    border-top: 1px solid var(--border-color);
}

.pim-btn {
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

.pim-btn:hover { background: var(--bg-surface); }

.pim-cancel-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    padding: 0;
}

.pim-cancel-link:hover { color: var(--accent-hover); }
</style>

<div class="pim-overlay" id="importModalOverlay">
    <div class="pim-box">
        <div class="pim-header">
            <h2>Import</h2>
            <button type="button" class="pim-close" id="pimCloseBtn">&times;</button>
        </div>
        <div class="pim-body">
            <div class="pim-alert" id="pimAlert"></div>
            <textarea class="pim-textarea" id="pimTextarea" placeholder="Paste patient export XML here..."></textarea>
        </div>
        <div class="pim-footer">
            <button type="button" class="pim-btn" id="pimImportBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Import</button>
            <button type="button" class="pim-cancel-link" id="pimCancelBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
        </div>
    </div>
</div>
    `;
}
