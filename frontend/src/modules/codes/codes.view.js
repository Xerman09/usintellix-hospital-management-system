import { CODE_TYPES, CODE_CATEGORIES } from "./codes.constants.js";

export function CodesView()
{
    const typeOptions = CODE_TYPES.map((type) => `<option value="${type.value}">${type.label}</option>`).join("");
    const categoryOptions = CODE_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("");

    return `
<style>
.cdx-page {
    width: 100%;
}

.cdx-card {
    width: 100%;
}

.cdx-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

.cdx-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.cdx-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
}

.cdx-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.cdx-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.cdx-header .form-subtitle {
    margin: 0;
    max-width: 520px;
}

.cdx-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.cdx-add-btn, .cdx-import-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: .18s;
    white-space: nowrap;
}

.cdx-add-btn {
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
}

.cdx-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.cdx-import-btn {
    background: #eef1f7;
    color: #34435c;
}

.cdx-import-btn:hover {
    background: #e2e8f0;
}

.cdx-add-btn svg, .cdx-import-btn svg {
    width: 16px;
    height: 16px;
}

.cdx-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
    flex-wrap: wrap;
}

.cdx-toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.cdx-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.cdx-stat-pill svg {
    width: 14px;
    height: 14px;
}

.cdx-type-filter {
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    min-width: 200px;
}

.cdx-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.cdx-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.cdx-search-input {
    width: 100%;
    height: 40px;
    padding: 0 34px 0 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    transition: .15s;
}

.cdx-search-input:focus, .cdx-type-filter:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.cdx-search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 6px;
    background: #eef1f7;
    color: #71809b;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.cdx-search-clear.show {
    display: flex;
}

.cdx-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.cdx-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.cdx-table th {
    text-align: left;
    padding: 12px 14px;
    color: #71809b;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.cdx-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
    white-space: nowrap;
}

.cdx-table tbody tr:last-child td {
    border-bottom: none;
}

.cdx-table tbody tr:hover {
    background: #fafbff;
}

.cdx-code {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 6px;
    background: #eef1f7;
    color: #4a5a78;
    font-size: 12.5px;
    font-weight: 600;
    font-family: monospace;
}

.cdx-type-badge {
    display: inline-flex;
    padding: 3px 9px;
    border-radius: 6px;
    background: var(--accent-lighter);
    color: var(--accent-text);
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
}

.cdx-desc-cell {
    white-space: normal;
    max-width: 260px;
    color: #71809b;
}

.cdx-flag-yes {
    color: #15803d;
    font-weight: 700;
}

.cdx-flag-no {
    color: #a2aec4;
}

.cdx-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.cdx-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
}

.cdx-icon-btn svg {
    width: 13px;
    height: 13px;
}

.cdx-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.cdx-icon-btn.edit:hover {
    background: var(--accent-border);
}

.cdx-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.cdx-icon-btn.delete:hover {
    background: #fecaca;
}

.cdx-empty-state {
    text-align: center;
    padding: 64px 20px !important;
    white-space: normal !important;
}

.cdx-empty-state .cdx-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cdx-empty-state .cdx-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.cdx-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.cdx-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.cdx-skeleton-row td {
    padding: 16px 18px;
}

.cdx-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: cdx-shimmer 1.4s ease infinite;
}

@keyframes cdx-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.cdx-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.cdx-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.cdx-checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: #52627a;
    cursor: pointer;
    margin-top: 8px;
}

.cdx-checkbox-label input {
    width: 15px;
    height: 15px;
    accent-color: var(--accent);
    cursor: pointer;
}

@media (max-width: 640px) {
    .cdx-header { flex-direction: column; }
    .cdx-header-actions { width: 100%; }
    .cdx-add-btn, .cdx-import-btn { flex: 1; justify-content: center; }
    .cdx-toolbar { flex-direction: column; align-items: stretch; }
    .cdx-search-wrap { max-width: none; }
}
</style>

<div class="cdx-page">
    <div class="cdx-card">
        <div class="cdx-header">
            <div class="cdx-header-title">
                <div class="cdx-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 9h10M7 13h6M7 17h4"></path></svg>
                </div>
                <div>
                    <h1>Codes</h1>
                    <p class="form-subtitle">Manage procedure, diagnosis and other reference codes (CPT4, HCPCS, CVX, ICD10, LOINC, PHIN Questions, NCI Concept ID, CQM Valueset, OID Valueset).</p>
                </div>
            </div>
            <div class="cdx-header-actions">
                <button type="button" class="cdx-import-btn" id="openImportCodeModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M4 21h16"></path></svg>
                    Import CSV
                </button>
                <button type="button" class="cdx-add-btn" id="openAddCodeModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                    Add Code
                </button>
            </div>
        </div>

        <div class="cdx-toolbar">
            <div class="cdx-toolbar-left">
                <span class="cdx-stat-pill" id="codeCountPill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>
                    <span id="codeCountText">0 codes</span>
                </span>
                <select class="cdx-type-filter" id="codeTypeFilter">
                    <option value="">All Types</option>
                    ${typeOptions}
                </select>
            </div>
            <div class="cdx-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="cdx-search-input" id="codeSearch" placeholder="Search code, description...">
                <button type="button" class="cdx-search-clear" id="codeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cdx-table-wrap">
            <table class="cdx-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Code</th>
                        <th>Mod</th>
                        <th>Act</th>
                        <th>Category</th>
                        <th>Dx Rep</th>
                        <th>Serv Rep</th>
                        <th>Description</th>
                        <th>Short Description</th>
                        <th>Related</th>
                        <th>Standard</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="codesTableBody">
                    <tr class="cdx-skeleton-row"><td colspan="12"><div class="cdx-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cdx-skeleton-row"><td colspan="12"><div class="cdx-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cdx-skeleton-row"><td colspan="12"><div class="cdx-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="codeModalOverlay">
    <div class="modal-box">
        <div class="cdx-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 9h10M7 13h6M7 17h4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="codeModalTitle">Add Code</h2>
            <button type="button" class="modal-close" id="closeCodeModal">&times;</button>
        </div>
        <p class="form-subtitle">Not all fields are required for all code types.</p>

        <div id="formAlert"></div>

        <form id="codeForm">
            <input type="hidden" id="code_id">
            <div class="form-grid">
                <div class="form-group">
                    <label>Type</label>
                    <select id="code_type" class="form-input">
                        ${typeOptions}
                    </select>
                    <span class="form-error" id="err-code_type"></span>
                </div>

                <div class="form-group">
                    <label>Code</label>
                    <input id="code" class="form-input" placeholder="e.g. 99213">
                    <span class="form-error" id="err-code"></span>
                </div>

                <div class="form-group">
                    <label>Modifier</label>
                    <input id="modifier" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-modifier"></span>
                </div>

                <div class="form-group">
                    <label>&nbsp;</label>
                    <label class="cdx-checkbox-label">
                        <input type="checkbox" id="active" checked>
                        Active
                    </label>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Full code description">
                    <span class="form-error" id="err-description"></span>
                </div>

                <div class="form-group full">
                    <label>Short Description</label>
                    <input id="short_description" class="form-input" placeholder="Optional short description">
                    <span class="form-error" id="err-short_description"></span>
                </div>

                <div class="form-group">
                    <label>Category</label>
                    <select id="category" class="form-input">
                        ${categoryOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label>Fees: Standard</label>
                    <input id="fee_standard" type="number" step="0.01" min="0" class="form-input" placeholder="0.00">
                </div>

                <div class="form-group">
                    <label class="cdx-checkbox-label">
                        <input type="checkbox" id="diagnosis_reporting">
                        Diagnosis Reporting
                    </label>
                </div>

                <div class="form-group">
                    <label class="cdx-checkbox-label">
                        <input type="checkbox" id="service_reporting">
                        Service Reporting
                    </label>
                </div>

                <div class="form-group full">
                    <label>Relate To</label>
                    <input id="related_code" class="form-input" placeholder="Optional related code">
                    <span class="form-error" id="err-related_code"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCode">Cancel</button>
                <button class="login-btn" type="submit" id="saveCodeBtn">Add Code</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="importCodeModalOverlay">
    <div class="modal-box">
        <div class="cdx-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M4 21h16"></path></svg>
        </div>
        <div class="modal-header">
            <h2>Import Codes</h2>
            <button type="button" class="modal-close" id="closeImportCodeModal">&times;</button>
        </div>
        <p class="form-subtitle">CSV header: code, modifier, description, short_description, category, diagnosis_reporting, service_reporting, related_code, fee_standard, active</p>

        <div id="importAlert"></div>

        <form id="importCodeForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Type</label>
                    <select id="import_code_type" class="form-input">
                        ${typeOptions}
                    </select>
                </div>

                <div class="form-group full">
                    <label>CSV File</label>
                    <input id="import_file" type="file" accept=".csv,text/csv" class="form-input">
                    <span class="form-error" id="err-import_file"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelImportCode">Cancel</button>
                <button class="login-btn" type="submit" id="submitImportCodeBtn">Import</button>
            </div>
        </form>
    </div>
</div>
`;
}
