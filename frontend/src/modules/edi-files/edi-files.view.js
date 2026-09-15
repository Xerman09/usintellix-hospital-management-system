export function EdiFilesView() {
    return `
<style>
.edi-page {
    width: 100%;
    font-size: 13.5px;
}

.edi-header h1 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
}

.edi-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0;
}

.edi-tab {
    border: 1px solid transparent;
    border-bottom: none;
    background: none;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    margin-bottom: -1px;
}

.edi-tab.active {
    color: var(--text-primary);
    background: var(--bg-surface);
    border-color: var(--border-color);
}

.edi-tab-panel { display: none; }
.edi-tab-panel.active { display: block; }

.edi-panel-body {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 0 8px 8px 8px;
    padding: 18px 20px;
}

.edi-columns {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
}

.edi-column h3 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
}

.edi-column {
    min-width: 260px;
}

.edi-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 12px 14px;
    margin-bottom: 14px;
}

.edi-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 12px 0 14px;
}

.edi-file-view-row {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 14px;
    margin-bottom: 6px;
}

.edi-file-view-row .edi-field { width: auto; }
.edi-file-view-row input[type="checkbox"] { width: 20px; height: 34px; }

.edi-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.edi-field input,
.edi-field select {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
}

.edi-file-input-row {
    display: flex;
    gap: 0;
    margin-bottom: 14px;
}

.edi-file-input-row input[type="file"] {
    flex: 1;
    max-width: 320px;
    height: 34px;
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
}

.edi-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.edi-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.edi-btn:disabled { opacity: .5; cursor: not-allowed; }

.edi-btn.secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-color: var(--border-color);
}

.edi-btn.secondary:hover { background: var(--bg-surface-alt); }

.edi-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--text-primary);
    font-size: 12.5px;
}

.edi-checkbox-row input:disabled + label,
.edi-checkbox-row input:disabled { opacity: .55; cursor: not-allowed; }

.edi-disabled-note {
    font-size: 11.5px;
    color: var(--text-muted);
    margin: 6px 0 0;
    max-width: 320px;
}

.edi-alert-area { margin-bottom: 12px; }

.edi-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-top: 18px;
}

.edi-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.edi-table th {
    text-align: left;
    padding: 9px 12px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.edi-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.edi-table tbody tr:last-child td { border-bottom: none; }
.edi-table tbody tr.edi-clickable { cursor: pointer; }
.edi-table tbody tr.edi-clickable:hover { background: var(--bg-surface); }
.edi-table tbody tr.edi-selected { background: var(--accent-light); }

.edi-empty-state {
    padding: 24px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.edi-placeholder {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
}

.edi-placeholder svg {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
    color: var(--text-muted);
}

.edi-file-picker {
    margin-bottom: 16px;
}

.edi-file-picker select {
    width: 100%;
    max-width: 420px;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
}

.edi-preview-box {
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px;
    font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
    font-size: 12px;
    color: var(--text-primary);
    max-height: 420px;
    overflow-y: auto;
}

.edi-notes-list {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
}

.edi-note-item {
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-surface);
    margin-bottom: 8px;
}

.edi-note-meta {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-bottom: 4px;
}

.edi-note-form {
    display: flex;
    gap: 8px;
}

.edi-note-form input {
    flex: 1;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
}
</style>

<div class="edi-page">
    <div class="edi-header"><h1>EDI History</h1></div>

    <div class="edi-tabs">
        <button type="button" class="edi-tab active" data-edi-tab="new">New Files</button>
        <button type="button" class="edi-tab" data-edi-tab="csv">CSV Tables</button>
        <button type="button" class="edi-tab" data-edi-tab="file">EDI File</button>
        <button type="button" class="edi-tab" data-edi-tab="notes">Notes</button>
        <button type="button" class="edi-tab" data-edi-tab="archive">Archive</button>
    </div>

    <div class="edi-tab-panel active" id="ediNewPanel" data-edi-panel="new">
        <div class="edi-panel-body">
            <div id="ediUploadAlert" class="edi-alert-area"></div>

            <div class="edi-columns">
                <div class="edi-column">
                    <h3>Select one or more files to upload</h3>
                    <div class="edi-file-input-row">
                        <input type="file" id="ediFileInput" multiple>
                    </div>
                    <div>
                        <button type="button" class="edi-btn" id="ediUploadBtn">+ Submit</button>
                        <button type="button" class="edi-btn secondary" id="ediResetBtn">Reset</button>
                    </div>
                </div>

                <div class="edi-column">
                    <h3>Process new files for CSV records:</h3>
                    <div class="edi-checkbox-row">
                        <input type="checkbox" id="ediHtmlOutput" checked disabled>
                        <label for="ediHtmlOutput">HTML Output?</label>
                        <input type="checkbox" id="ediErrorsOnly" checked disabled style="margin-left:14px;">
                        <label for="ediErrorsOnly">Show Errors Only?</label>
                    </div>
                    <button type="button" class="edi-btn" id="ediProcessBtn" disabled title="Needs a real X12 835/837 parser -- not available in this build">Process New Files</button>
                    <p class="edi-disabled-note">Parsing an EDI file into CSV claim/payment records needs a real X12 parser and payer conventions this app doesn't have. Files upload and store correctly above; open the "EDI File" tab to read a file's raw contents instead.</p>
                </div>
            </div>

            <div class="edi-table-wrap">
                <table class="edi-table">
                    <thead><tr><th>Filename</th><th>Uploaded By</th><th>Uploaded At</th><th>Size</th><th>Notes</th><th></th></tr></thead>
                    <tbody id="ediNewFilesBody"><tr><td colspan="6" class="edi-empty-state">Loading...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="edi-tab-panel" id="ediCsvPanel" data-edi-panel="csv">
        <div class="edi-panel-body">
            <p class="edi-disabled-note" style="max-width:640px; margin-bottom:16px;">
                This app has no real X12 835/837 parser, so these tables aren't parsed-EDI output -- they browse the real Charges and Payments already posted through Fee Sheet, Checkout, Billing Manager, Payments, and Posting Payments.
            </p>

            <div id="ediCsvAlert" class="edi-alert-area"></div>

            <div class="edi-columns">
                <div class="edi-column">
                    <h3>View CSV tables:</h3>
                    <p style="margin:0 0 10px; font-size:12px; color:var(--text-muted);">Choose a period or dates (YYYY-MM-DD)</p>

                    <div class="edi-form-grid">
                        <div class="edi-field">
                            <label>Choose CSV table:</label>
                            <select id="ediCsvTableSelect">
                                <option value="charges">Charges</option>
                                <option value="payments">Payments</option>
                            </select>
                        </div>
                        <div class="edi-field">
                            <label>From Period:</label>
                            <select id="ediCsvPeriod">
                                <option value="">Custom</option>
                                <option value="7">1 week</option>
                                <option value="14" selected>2 weeks</option>
                                <option value="30">1 month</option>
                                <option value="90">3 months</option>
                                <option value="365">1 year</option>
                            </select>
                        </div>
                        <div class="edi-field"><label>Start Date:</label><input type="date" id="ediCsvStartDate"></div>
                        <div class="edi-field"><label>End Date:</label><input type="date" id="ediCsvEndDate"></div>
                    </div>

                    <button type="button" class="edi-btn" id="ediCsvSubmitBtn">+ Submit</button>
                </div>

                <div class="edi-column">
                    <h3>Per Encounter</h3>
                    <p style="margin:0 0 10px; font-size:12px; color:var(--text-muted);">Enter Encounter Number</p>

                    <div class="edi-form-grid" style="grid-template-columns: 160px auto;">
                        <div class="edi-field"><label>Encounter:</label><input type="number" id="ediCsvEncounter"></div>
                        <div class="edi-field" style="align-self:end;"><button type="button" class="edi-btn" id="ediCsvEncounterSubmitBtn">+ Submit</button></div>
                    </div>
                </div>
            </div>

            <div class="edi-table-wrap" id="ediCsvResultsWrap" style="display:none;">
                <div style="display:flex; justify-content:flex-end; padding:10px 12px; border-bottom:1px solid var(--border-color); background:var(--bg-surface-alt);">
                    <button type="button" class="edi-btn secondary" id="ediCsvDownloadBtn">Download CSV</button>
                </div>
                <table class="edi-table">
                    <thead id="ediCsvTableHead"></thead>
                    <tbody id="ediCsvTableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="edi-tab-panel" id="ediFilePanel" data-edi-panel="file">
        <div class="edi-panel-body">
            <h3 style="margin:0 0 14px; font-size:15px; font-weight:700; color:var(--text-primary);">View EDI x12 file:</h3>

            <div class="edi-file-view-row">
                <div class="edi-field">
                    <label>Report?</label>
                    <input type="checkbox" id="ediFileReport" disabled title="Needs a real X12 835/837 parser -- not available in this build">
                </div>
                <div class="edi-field" style="min-width:240px;">
                    <label>Choose File:</label>
                    <select id="ediFileSelect"><option value="">-- Select a file --</option></select>
                </div>
                <div class="edi-field">
                    <label>&nbsp;</label>
                    <button type="button" class="edi-btn" id="ediFileSubmitBtn">+ Submit</button>
                </div>
                <div class="edi-field">
                    <label>&nbsp;</label>
                    <button type="button" class="edi-btn secondary" id="ediFileResetBtn">&times; Reset</button>
                </div>
            </div>

            <p class="edi-disabled-note">"Report?" would render a formatted 835/837 report and needs a real X12 parser -- not available in this build. Submit shows the file's raw contents instead.</p>

            <div id="ediFileAlert" class="edi-alert-area"></div>
            <div id="ediFileMeta"></div>
            <div class="edi-preview-box" id="ediPreviewBox" style="display:none;"></div>
        </div>
    </div>

    <div class="edi-tab-panel" id="ediNotesPanel" data-edi-panel="notes">
        <div class="edi-panel-body">
            <div class="edi-columns">
                <div class="edi-column" style="flex:1.4;">
                    <h3>Inspect the log</h3>

                    <div class="edi-field" style="max-width:420px;">
                        <label>View Log</label>
                        <select id="ediNotesFileSelect"><option value="">-- Choose from list --</option></select>
                    </div>

                    <div class="edi-actions-row">
                        <button type="button" class="edi-btn" id="ediNotesSubmitBtn">+ Submit</button>
                        <button type="button" class="edi-btn secondary" id="ediNotesArchiveBtn">Archive</button>
                        <button type="button" class="edi-btn secondary" id="ediNotesCloseBtn">&times; Close</button>
                    </div>

                    <div id="ediNotesAlert" class="edi-alert-area"></div>

                    <ul class="edi-notes-list" id="ediNotesList"></ul>
                </div>

                <div class="edi-column">
                    <h3>Notes</h3>

                    <div class="edi-field">
                        <label>Notes</label>
                        <input type="text" id="ediNoteInput" placeholder="Add a note..." disabled>
                    </div>

                    <div class="edi-actions-row">
                        <button type="button" class="edi-btn secondary" id="ediNoteOpenBtn">Open</button>
                        <button type="button" class="edi-btn" id="ediAddNoteBtn" disabled>&check; Save</button>
                        <button type="button" class="edi-btn secondary" id="ediNoteCloseBtn">&times; Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="edi-tab-panel" id="ediArchivePanel" data-edi-panel="archive">
        <div class="edi-panel-body">
            <p class="edi-disabled-note" style="max-width:680px; margin-bottom:16px;">
                Selected files are archived, not permanently deleted -- unlike real OpenEMR's wording, this app never hard-deletes records, so anything archived here can always be restored below.
            </p>

            <div id="ediArchiveAlert" class="edi-alert-area"></div>

            <div class="edi-columns">
                <div class="edi-column">
                    <h3>Archive old files</h3>

                    <div class="edi-field" style="max-width:220px;">
                        <label>Older than:</label>
                        <select id="ediArchiveOlderThan">
                            <option value="">Choose</option>
                            <option value="7">1 week</option>
                            <option value="14">2 weeks</option>
                            <option value="30">1 month</option>
                            <option value="90">3 months</option>
                            <option value="180">6 months</option>
                            <option value="365">1 year</option>
                        </select>
                    </div>

                    <div class="edi-actions-row">
                        <span style="font-size:12.5px; font-weight:600; color:var(--text-primary);">Report:</span>
                        <button type="button" class="edi-btn secondary" id="ediArchiveReportBtn">Report</button>
                        <span style="font-size:12.5px; font-weight:600; color:var(--text-primary); margin-left:6px;">Archive:</span>
                        <button type="button" class="edi-btn" id="ediArchiveBulkBtn">Archive</button>
                    </div>

                    <div class="edi-table-wrap" id="ediArchiveReportWrap" style="display:none;">
                        <table class="edi-table">
                            <thead><tr><th>Filename</th><th>Uploaded By</th><th>Uploaded At</th></tr></thead>
                            <tbody id="ediArchiveReportBody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="edi-column">
                    <h3>Restore Archive</h3>

                    <div class="edi-field" style="max-width:280px;">
                        <label>Restore:</label>
                        <select id="ediRestoreSelect"><option value="">No Archives</option></select>
                    </div>

                    <div class="edi-actions-row">
                        <span style="font-size:12.5px; font-weight:600; color:var(--text-primary);">Restore:</span>
                        <button type="button" class="edi-btn" id="ediRestoreBtn">Restore</button>
                    </div>
                </div>
            </div>

            <h3 style="margin:22px 0 12px; font-size:15px; font-weight:700; color:var(--text-primary);">Archived Files</h3>
            <div class="edi-table-wrap">
                <table class="edi-table">
                    <thead><tr><th>Filename</th><th>Uploaded By</th><th>Uploaded At</th><th>Archived At</th><th></th></tr></thead>
                    <tbody id="ediArchiveBody"><tr><td colspan="5" class="edi-empty-state">Loading...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>
</div>
    `;
}
