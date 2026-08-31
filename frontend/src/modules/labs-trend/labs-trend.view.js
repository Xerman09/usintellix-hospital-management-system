export function LabsTrendView()
{
    return `
<style>
.lt-page {
    width: 100%;
    font-size: 13.5px;
}

.lt-page h1 {
    margin: 0 0 12px;
    font-size: 26px;
    font-weight: 400;
    color: #1a2338;
}

.lt-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.lt-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    border: 1px solid #c3cbd8;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.lt-back-btn:hover {
    background: #e2e7ee;
}

.lt-back-btn svg {
    width: 14px;
    height: 14px;
}

.lt-toggle-all {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #34435c;
    cursor: pointer;
}

.lt-panel {
    background: #e8eaed;
    border-radius: 8px;
    padding: 24px;
}

.lt-label {
    display: block;
    font-size: 18px;
    font-weight: 400;
    color: #1a2338;
    margin-bottom: 10px;
}

.lt-field-group {
    margin-bottom: 18px;
}

.lt-multiselect {
    position: relative;
}

.lt-multiselect-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid #b9c0cc;
    background: white;
    cursor: text;
}

.lt-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px 3px 10px;
    border-radius: 14px;
    background: var(--accent-light);
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
}

.lt-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
}

.lt-chip-remove:hover {
    background: rgba(0,0,0,.08);
}

.lt-filter-input {
    flex: 1;
    min-width: 120px;
    border: none;
    outline: none;
    font-size: 13px;
    padding: 4px 2px;
    background: transparent;
}

.lt-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 240px;
    overflow-y: auto;
    background: white;
    border: 1px solid #d7dee8;
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(20,30,60,.12);
    z-index: 20;
}

.lt-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 13px;
    color: #29323f;
    cursor: pointer;
}

.lt-dropdown-item:hover {
    background: #f1f4fa;
}

.lt-dropdown-item span.lt-item-count {
    color: #8b96a8;
    font-size: 11.5px;
}

.lt-dropdown-empty {
    padding: 14px 12px;
    color: #8b96a8;
    font-size: 13px;
    text-align: center;
}

.lt-divider {
    border: none;
    border-top: 1px solid #cfd4dc;
    margin: 20px 0;
}

.lt-radio-row {
    display: flex;
    gap: 20px;
}

.lt-radio-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #1c2534;
    cursor: pointer;
}

.lt-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 18px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.lt-submit-btn:hover {
    background: #1742b0;
}

.lt-submit-btn svg {
    width: 14px;
    height: 14px;
}

.lt-no-params {
    margin: 0;
    color: #4a5568;
    font-size: 13.5px;
}

.lt-results-table-wrap {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    border: 1px solid #d7dee8;
}

.lt-results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.lt-results-table th {
    background: #eef1f5;
    color: #4a5568;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
    text-align: left;
}

.lt-results-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    white-space: nowrap;
}

.lt-abn-value {
    color: #b23c3c;
    font-weight: 700;
}

.lt-empty-cell {
    color: #c3cbd8;
}
</style>

<div class="lt-page">
    <h1>Labs</h1>

    <div class="lt-toolbar">
        <button type="button" class="lt-back-btn" id="ltBackBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
            Back to Patient
        </button>
        <label class="lt-toggle-all">
            <input type="checkbox" id="ltToggleAll">
            Toggle All
        </label>
    </div>

    <div class="lt-panel">
        <div class="lt-field-group">
            <label class="lt-label">Select items:</label>
            <div class="lt-multiselect" id="ltMultiselect">
                <div class="lt-multiselect-box" id="ltMultiselectBox">
                    <input type="text" id="ltItemFilter" class="lt-filter-input" placeholder="">
                </div>
                <div class="lt-dropdown" id="ltDropdown" style="display: none;"></div>
            </div>
        </div>

        <hr class="lt-divider">

        <div class="lt-field-group">
            <label class="lt-label">Select output:</label>
            <div class="lt-radio-row">
                <label class="lt-radio-label"><input type="radio" name="ltOutput" value="list"> List</label>
                <label class="lt-radio-label"><input type="radio" name="ltOutput" value="matrix" checked> Matrix</label>
            </div>
        </div>

        <button type="button" class="lt-submit-btn" id="ltSubmitBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
            Submit
        </button>

        <hr class="lt-divider">

        <div id="ltResults">
            <p class="lt-no-params">No parameters selected.</p>
        </div>
    </div>
</div>
`;
}
