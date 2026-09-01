import { CODE_TYPES } from "../codes/codes.constants.js";

export function InstallCodeSetView()
{
    return `
<style>
.ics-page {
    width: 100%;
}

.ics-page h1 {
    margin: 0 0 20px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.ics-card {
    width: 100%;
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
}

.ics-field-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 18px;
}

.ics-field-row label {
    flex-shrink: 0;
    width: 200px;
    font-size: 13.5px;
    font-weight: 600;
    color: #34435c;
}

.ics-field-row .form-input {
    flex: 1;
    max-width: 420px;
}

.ics-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 220px;
    margin-bottom: 20px;
}

.ics-checkbox-row input {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.ics-checkbox-row label {
    font-size: 13.5px;
    color: #34435c;
    cursor: pointer;
}

.ics-actions {
    margin-left: 220px;
}

.ics-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 24px;
    border: none;
    border-radius: 12px;
    background: #1a2338;
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: .18s;
}

.ics-submit-btn:hover {
    background: #0e1524;
}

.ics-submit-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.ics-submit-btn svg {
    width: 16px;
    height: 16px;
}

.ics-warning {
    margin-left: 220px;
    margin-bottom: 20px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #fff7ed;
    border: 1px solid #fcd9a8;
    color: #92400e;
    font-size: 12.5px;
    line-height: 1.6;
    max-width: 640px;
}

.ics-results {
    padding: 16px 18px;
    border-radius: 12px;
    background: #f8fafc;
    border: 1px solid #eef1f7;
    font-size: 13.5px;
    color: #34435c;
}

.ics-results p {
    margin: 0 0 8px;
}

.ics-results ul {
    margin: 0;
    padding-left: 20px;
    max-height: 220px;
    overflow-y: auto;
    color: #b91c1c;
}

.ics-help-card h2 {
    margin: 0 0 12px;
    font-size: 15px;
    color: #1a2338;
}

.ics-help-card h3 {
    margin: 16px 0 6px;
    font-size: 13px;
    color: #1a2338;
}

.ics-help-card p, .ics-help-card li {
    font-size: 12.5px;
    color: #5a6478;
    line-height: 1.7;
}

.ics-help-card ul {
    margin: 4px 0;
    padding-left: 20px;
}

.ics-ini-box {
    margin-top: 14px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #f1f5fb;
    border: 1px solid #dbe4f0;
    font-size: 12.5px;
    color: #34435c;
    line-height: 1.7;
}

.ics-ini-box code {
    background: #e4ebf5;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
}

@media (max-width: 640px) {
    .ics-field-row { flex-direction: column; align-items: stretch; gap: 6px; }
    .ics-field-row label { width: auto; }
    .ics-field-row .form-input { max-width: none; }
    .ics-checkbox-row, .ics-actions, .ics-warning { margin-left: 0; }
}
</style>

<div class="ics-page">
    <h1>Install Code Set</h1>

    <div class="ics-card">
        <div class="ics-field-row">
            <label>Code Type</label>
            <select id="icsCodeType" class="form-input">
                <option value="">Select code type...</option>
                ${CODE_TYPES.map((type) => `<option value="${type.value}">${type.label}</option>`).join("")}
            </select>
        </div>

        <div class="ics-field-row">
            <label>Source File (.zip, .rrf, or .csv)</label>
            <input type="file" id="icsFile" class="form-input" accept=".zip,.rrf,.csv,.txt">
        </div>

        <div class="ics-checkbox-row">
            <input type="checkbox" id="icsReplace" checked>
            <label for="icsReplace">Replace entire code set</label>
        </div>

        <div class="ics-warning">
            <strong>Be patient</strong> — some files can take several minutes to process! Unchecking "Replace entire code set" will add/update codes without removing existing ones of this type; checking it will first remove all existing codes of the selected type before installing the new set. This action cannot be undone.
        </div>

        <div id="icsAlert"></div>

        <div class="ics-actions">
            <button type="button" class="ics-submit-btn" id="icsSubmitBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"></path></svg>
                Upload and Install
            </button>
        </div>

        <div class="ics-results" id="icsResults" style="display: none;"></div>
    </div>

    <div class="ics-card ics-help-card">
        <h2>About Native Data Loads</h2>
        <p>This loads a code set directly from its native distribution format (the same files published by the coding authority), rather than this app's own CSV import format. Currently supported native format: <strong>RXCUI</strong> (RxNorm).</p>

        <h3>RXCUI (RxNorm)</h3>
        <p>Download the RxNorm full monthly release from the National Library of Medicine's RxNorm site (requires a free UMLS account). You may upload:</p>
        <ul>
            <li>The full release <strong>.zip</strong> file as downloaded — the installer will locate <code>rrf/RXNCONSO.RRF</code> inside it automatically, or</li>
            <li>Just the extracted <strong>RXNCONSO.RRF</strong> file on its own.</li>
        </ul>
        <p>Only English (<code>ENG</code>), RxNorm-sourced (<code>SAB=RXNORM</code>), non-suppressed rows are installed; duplicate RXCUIs in the source file are deduplicated automatically.</p>

        <h3>Other code types</h3>
        <p>For code types without a dedicated native parser, upload a <strong>.csv</strong> file using this system's generic import column layout instead (see the Codes module's Import action).</p>

        <div class="ics-ini-box">
            Large source files may exceed your server's default PHP upload limits. If an upload fails silently or is truncated, check <code>php.ini</code>'s <code>upload_max_filesize</code> and <code>post_max_size</code> directives — both must be large enough to hold the uploaded file, and <code>post_max_size</code> must be greater than <code>upload_max_filesize</code>.
        </div>
    </div>
</div>
`;
}
