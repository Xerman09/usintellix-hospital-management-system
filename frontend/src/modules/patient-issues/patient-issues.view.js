export function PatientIssuesModalMarkup() {
    return `
<style>
.pis-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.pis-overlay.open { display: flex; }

.pis-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(920px, 94vw);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}

.pis-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.pis-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.pis-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pis-body {
    padding: 18px 20px;
    overflow-y: auto;
}

.pis-title-bar {
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 10px 14px;
    text-align: center;
    font-weight: 700;
    margin-bottom: 12px;
}

.pis-section-toggle {
    display: flex;
    border: 1px solid var(--border-color);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    overflow: hidden;
}

.pis-section-toggle label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px;
    background: var(--bg-surface-alt);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    border-right: 1px solid var(--border-color);
}

.pis-section-toggle label:last-child { border-right: none; }

.pis-table-wrap {
    border: 1px solid var(--border-color);
    border-radius: 0 0 6px 6px;
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: 14px;
}

.pis-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pis-table th {
    text-align: left;
    padding: 8px 12px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
}

.pis-table td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--border-color);
}

.pis-table tbody tr { cursor: pointer; }
.pis-table tbody tr:hover { background: var(--bg-surface-alt); }
.pis-table tbody tr.pis-selected { background: var(--accent-light); }
.pis-table tbody tr.pis-related { background: rgba(21, 128, 61, .15); }

.pis-empty-state {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}

.pis-actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
}

.pis-btn {
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

.pis-btn:hover { background: var(--bg-surface); }

.pis-btn.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
}

.pis-btn.primary:hover { background: var(--accent-hover); }

.pis-instructions {
    font-size: 12.5px;
    color: var(--text-muted);
    border-top: 1px solid var(--border-color);
    padding-top: 12px;
}

.pis-instructions strong { color: var(--text-primary); }
</style>

<div class="pis-overlay" id="issuesModalOverlay">
    <div class="pis-box">
        <div class="pis-header">
            <h2>Issues</h2>
            <button type="button" class="pis-close" id="pisCloseBtn">&times;</button>
        </div>
        <div class="pis-body">
            <div class="pis-title-bar" id="pisTitleBar">Issues and Encounters</div>

            <div class="pis-section-toggle">
                <label><input type="radio" name="pisSection" value="issues" id="pisSectionIssues" checked> Issues Section</label>
                <label><input type="radio" name="pisSection" value="encounters" id="pisSectionEncounters"> Encounters Section</label>
            </div>

            <div class="pis-table-wrap">
                <table class="pis-table" id="pisTable">
                    <thead id="pisTableHead"></thead>
                    <tbody id="pisTableBody"><tr><td class="pis-empty-state">Loading...</td></tr></tbody>
                </table>
            </div>

            <div class="pis-actions">
                <button type="button" class="pis-btn primary" id="pisSaveBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Save</button>
                <button type="button" class="pis-btn primary" id="pisAddIssueBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Issue</button>
                <button type="button" class="pis-btn" id="pisCancelBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
            </div>

            <div class="pis-instructions" id="pisInstructions">
                <strong>Instructions:</strong> Choose a section and click an item within it; then in the other section you will see the related items highlighted, and you can click in that section to add and delete relationships.
            </div>
        </div>
    </div>
</div>

${AddIssueModalMarkup()}
    `;
}

function AddIssueModalMarkup() {
    return `
<style>
.ai-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .6);
    align-items: center;
    justify-content: center;
    z-index: 2100;
}

.ai-overlay.open { display: flex; }

.ai-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(560px, 94vw);
    max-height: 92vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,.4);
}

.ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--accent);
    color: white;
    border-radius: 10px 10px 0 0;
}

.ai-header h2 { margin: 0; font-size: 16px; font-weight: 600; }

.ai-close {
    border: none;
    background: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
}

.ai-form { padding: 18px 20px; }

.ai-field-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
}

.ai-type-row {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 8px;
    font-size: 13px;
}

.ai-type-row label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
}

.ai-title-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 14px 0;
}

.ai-title-grid label {
    font-size: 12px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 4px;
}

.ai-title-grid input {
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

.ai-search-wrap { position: relative; }

.ai-search-wrap .ai-search-icon {
    position: absolute;
    right: 8px;
    top: 8px;
    color: var(--text-muted);
    pointer-events: none;
}

.ai-catalog-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    max-height: 180px;
    overflow-y: auto;
    z-index: 10;
    display: none;
}

.ai-catalog-dropdown.open { display: block; }

.ai-catalog-item {
    padding: 7px 10px;
    font-size: 12.5px;
    cursor: pointer;
}

.ai-catalog-item:hover { background: var(--bg-surface-alt); }

.ai-field {
    margin-bottom: 14px;
}

.ai-field label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
}

.ai-field input,
.ai-field textarea,
.ai-field select {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
    color-scheme: light;
}

:root[data-theme="dark"] .ai-field input,
:root[data-theme="dark"] .ai-field select {
    color-scheme: dark;
}

.ai-field textarea {
    height: 70px;
    padding: 8px 10px;
    resize: vertical;
}

.ai-more-toggle {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 4px 0 14px;
}

.ai-more-fields {
    display: none;
    grid-template-columns: 1fr 1fr;
    gap: 12px 14px;
    margin-bottom: 10px;
}

.ai-more-fields.open { display: grid; }

.ai-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
}

.ai-alert { margin-bottom: 10px; }
</style>

<div class="ai-overlay" id="addIssueModalOverlay">
    <div class="ai-box">
        <div class="ai-header">
            <h2>Issue</h2>
            <button type="button" class="ai-close" id="aiCloseBtn">&times;</button>
        </div>
        <div class="ai-form">
            <div id="aiAlert"></div>

            <p class="ai-field-label">Type:</p>
            <div class="ai-type-row">
                <label><input type="radio" name="aiType" value="problem" checked> Problem</label>
                <label><input type="radio" name="aiType" value="health_concern"> Health Concern</label>
            </div>
            <div class="ai-type-row">
                <label><input type="radio" name="aiType" value="allergy"> Allergy</label>
                <label><input type="radio" name="aiType" value="medication"> Medication</label>
                <label><input type="radio" name="aiType" value="surgery"> Surgery</label>
                <label><input type="radio" name="aiType" value="dental"> Dental</label>
            </div>

            <p class="ai-field-label" style="margin-top:14px;">Select from list or type your own in Title</p>
            <div class="ai-title-grid">
                <div>
                    <label>Title</label>
                    <input type="text" id="aiTitle" placeholder="Type your own">
                </div>
                <div class="ai-search-wrap">
                    <label>Title (from list)</label>
                    <input type="text" id="aiCatalogSearch" placeholder="Search catalog...">
                    <span class="ai-search-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <div class="ai-catalog-dropdown" id="aiCatalogDropdown"></div>
                </div>
            </div>

            <div class="ai-field">
                <label>Begin Date:</label>
                <input type="date" id="aiBeginDate">
            </div>

            <div class="ai-field">
                <label>End Date:</label>
                <input type="date" id="aiEndDate" placeholder="leave blank if still active">
            </div>

            <div class="ai-field">
                <label>Comments:</label>
                <textarea id="aiComments"></textarea>
            </div>

            <button type="button" class="ai-more-toggle" id="aiMoreToggle">Show More Fields <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>

            <div class="ai-more-fields" id="aiMoreFields">
                <div class="ai-field"><label>Coding</label><input type="text" id="aiCoding"></div>
                <div class="ai-field"><label>Occurrence</label><input type="text" id="aiOccurrence"></div>
                <div class="ai-field"><label>Outcome</label><input type="text" id="aiOutcome"></div>
                <div class="ai-field"><label>Classification Type</label><input type="text" id="aiClassificationType"></div>
                <div class="ai-field">
                    <label>Verification Status</label>
                    <select id="aiVerificationStatus">
                        <option value="Unconfirmed">Unconfirmed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Refuted">Refuted</option>
                        <option value="Entered in Error">Entered in Error</option>
                    </select>
                </div>
                <div class="ai-field"><label>Referred By</label><input type="text" id="aiReferredBy"></div>
                <div class="ai-field" style="grid-column:1 / -1;"><label>Destination</label><input type="text" id="aiDestination"></div>
            </div>

            <div class="ai-actions">
                <button type="button" class="pis-btn" id="aiCancelBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
                <button type="button" class="pis-btn primary" id="aiSaveBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Save</button>
            </div>
        </div>
    </div>
</div>
    `;
}
