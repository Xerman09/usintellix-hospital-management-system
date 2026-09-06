export function BatchResultsView()
{
    return `
<style>
.br-page {
    width: 100%;
    font-size: 13.5px;
}

.br-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid #e5e9f0;
}

.br-toolbar label {
    font-size: 13px;
    font-weight: 600;
    color: #34435c;
    white-space: nowrap;
}

.br-procedure-input {
    width: 220px;
    height: 34px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    background: #eef1f5;
    color: #1c2534;
    font-size: 13px;
    cursor: pointer;
}

.br-procedure-input:hover {
    border-color: var(--accent-border);
}

.br-date-input {
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
}

.br-date-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.br-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.br-refresh-btn:hover {
    background: #1742b0;
}

.br-refresh-btn svg {
    width: 14px;
    height: 14px;
}

.br-results-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 64px 20px;
    color: #71809b;
}

.br-results-empty .br-empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.br-results-empty .br-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.br-results-empty strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.br-results-empty p {
    margin: 0;
    font-size: 13px;
    max-width: 360px;
}

@media (max-width: 640px) {
    .br-toolbar { flex-direction: column; align-items: stretch; }
    .br-procedure-input { width: 100%; }
}

:root[data-theme="dark"] .br-toolbar { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .br-toolbar label { color: var(--text-primary); }
:root[data-theme="dark"] .br-procedure-input,
:root[data-theme="dark"] .br-date-input {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}
:root[data-theme="dark"] .br-results-empty { color: var(--text-muted); }
:root[data-theme="dark"] .br-results-empty .br-empty-icon { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .br-results-empty strong { color: var(--text-primary); }
</style>

<div class="br-page">
    <div class="br-toolbar">
        <label for="brProcedureInput">Procedure:</label>
        <input type="text" id="brProcedureInput" class="br-procedure-input" placeholder="Click to select..." readonly>
        <input type="hidden" id="brProcedureId">

        <label for="brFromDate">From:</label>
        <input type="date" id="brFromDate" class="br-date-input">

        <label for="brToDate">To:</label>
        <input type="date" id="brToDate" class="br-date-input">

        <button type="button" class="br-refresh-btn" id="brRefreshBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"></path><path d="M3 21v-5h5"></path></svg>
            Refresh
        </button>
    </div>

    <div id="brResults"></div>
</div>

<div class="modal-overlay" id="brProcedurePickerModalOverlay">
    <div class="modal-box" style="max-width: 900px;">
        <button type="button" class="modal-close" id="brProcedurePickerClose" style="float: right;">&times;</button>
        <div id="brProcedurePickerContent" style="clear: both;"></div>
    </div>
</div>
`;
}
