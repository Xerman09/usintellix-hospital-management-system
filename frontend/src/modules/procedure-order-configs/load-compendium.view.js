export function LoadCompendiumView()
{
    return `
<style>
.lc-page {
    width: 100%;
}

.lc-page h1 {
    margin: 0 0 20px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.lc-card {
    width: 100%;
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 16px;
    padding: 24px;
}

.lc-field-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 18px;
}

.lc-field-row label {
    flex-shrink: 0;
    width: 180px;
    font-size: 13.5px;
    font-weight: 600;
    color: #34435c;
}

.lc-field-row .form-input {
    flex: 1;
}

.lc-hint {
    margin: -4px 0 20px 200px;
    font-size: 12.5px;
    color: #a2aec4;
    line-height: 1.5;
}

.lc-actions {
    margin-left: 200px;
}

.lc-results {
    margin-top: 20px;
    padding: 16px 18px;
    border-radius: 12px;
    background: #f8fafc;
    border: 1px solid #eef1f7;
    font-size: 13.5px;
    color: #34435c;
}

.lc-results p {
    margin: 0 0 8px;
}

.lc-results ul {
    margin: 0;
    padding-left: 20px;
    color: #b91c1c;
}

.lc-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 24px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
}

.lc-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.lc-submit-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
    transform: none;
}

.lc-submit-btn svg {
    width: 16px;
    height: 16px;
}

@media (max-width: 640px) {
    .lc-field-row { flex-direction: column; align-items: stretch; gap: 6px; }
    .lc-field-row label { width: auto; }
    .lc-hint, .lc-actions { margin-left: 0; }
}
</style>

<div class="lc-page">
    <h1>Load Lab Compendium</h1>
    <div class="lc-card">
        <div class="lc-field-row">
            <label>Vendor</label>
            <select id="lcVendor" class="form-input">
                <option value="">Select vendor...</option>
            </select>
        </div>

        <div class="lc-field-row">
            <label>Action</label>
            <select id="lcAction" class="form-input">
                <option value="load_order_definitions">Load Order Definitions</option>
                <option value="load_order_entry_questions" disabled>Load Order Entry Questions</option>
                <option value="load_oe_question_options" disabled>Load OE Question Options</option>
            </select>
        </div>

        <div class="lc-field-row">
            <label>Container Group Name</label>
            <select id="lcContainerGroup" class="form-input">
                <option value="">Select group...</option>
            </select>
        </div>

        <div class="lc-field-row">
            <label>File to Upload</label>
            <input type="file" id="lcFile" class="form-input" accept=".csv,text/csv">
        </div>

        <p class="lc-hint">CSV columns expected: <strong>name</strong> (required), order_test_type, identifying_code, standard_code, body_site, specimen_type, administer_via, laterality, description, sequence.</p>

        <div id="lcAlert"></div>

        <div class="lc-actions">
            <button type="button" class="lc-submit-btn" id="lcSubmitBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                Submit
            </button>
        </div>
    </div>

    <div class="lc-results" id="lcResults" style="display: none;"></div>
</div>
`;
}
