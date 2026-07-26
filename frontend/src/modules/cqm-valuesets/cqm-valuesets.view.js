export function CqmValuesetsView()
{
    return `
<style>
.cqm-page {
    width: 100%;
}

.cqm-card {
    width: 100%;
}

.cqm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.cqm-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.cqm-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
}

.cqm-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.cqm-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.cqm-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.cqm-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background-color .15s;
    white-space: nowrap;
}

.cqm-add-btn:hover {
    background: var(--accent-hover);
}

.cqm-add-btn svg {
    width: 16px;
    height: 16px;
}

.cqm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.cqm-stat-pill {
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

.cqm-stat-pill svg {
    width: 14px;
    height: 14px;
}

.cqm-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.cqm-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.cqm-search-input {
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

.cqm-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.cqm-search-clear {
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

.cqm-search-clear.show {
    display: flex;
}

.cqm-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.cqm-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.cqm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.cqm-table tbody tr {
    animation: cqm-row-in .25s ease both;
}

@keyframes cqm-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.cqm-table th {
    text-align: left;
    padding: 14px 18px;
    color: #71809b;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.cqm-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.cqm-table tbody tr:last-child td {
    border-bottom: none;
}

.cqm-table tbody tr:hover {
    background: #fafbff;
}

.cqm-oid-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.cqm-system-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--accent-lighter);
    color: var(--accent-text);
    font-size: 12px;
    font-weight: 700;
}

.cqm-name {
    color: #25324b;
}

.cqm-codes-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    background: white;
    color: #34435c;
    transition: .12s;
}

.cqm-codes-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent-text);
}

.cqm-codes-btn svg {
    width: 13px;
    height: 13px;
}

.cqm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.cqm-icon-btn {
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

.cqm-icon-btn svg {
    width: 13px;
    height: 13px;
}

.cqm-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.cqm-icon-btn.edit:hover {
    background: var(--accent-border);
}

.cqm-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.cqm-icon-btn.delete:hover {
    background: #fecaca;
}

.cqm-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.cqm-empty-state .cqm-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cqm-empty-state .cqm-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.cqm-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.cqm-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.cqm-skeleton-row td {
    padding: 16px 18px;
}

.cqm-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: cqm-shimmer 1.4s ease infinite;
}

@keyframes cqm-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.cqm-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.cqm-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.cqm-code-input {
    font-family: "Courier New", monospace;
}

.cqm-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    flex-wrap: wrap;
}

.cqm-pagination-info {
    font-size: 13px;
    color: #71809b;
}

.cqm-pagination-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cqm-page-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #34435c;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
}

.cqm-page-btn svg {
    width: 14px;
    height: 14px;
}

.cqm-page-btn:hover:not(:disabled) {
    border-color: var(--accent-border);
    color: var(--accent-text);
}

.cqm-page-btn:disabled {
    opacity: .45;
    cursor: not-allowed;
}

.cqm-page-indicator {
    font-size: 13px;
    font-weight: 600;
    color: #25324b;
    white-space: nowrap;
}

.cqm-codes-modal-box {
    max-width: 860px;
}

.cqm-codes-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.cqm-codes-modal-header .form-subtitle {
    margin: 4px 0 0;
}

.cqm-codes-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin: 18px 0 14px;
}

.cqm-codes-table-wrap {
    max-height: 380px;
    overflow-y: auto;
    border: 1px solid #eef1f7;
    border-radius: 14px;
}

@media (max-width: 640px) {
    .cqm-header { flex-direction: column; }
    .cqm-add-btn { width: 100%; justify-content: center; }
    .cqm-toolbar { flex-direction: column; align-items: stretch; }
    .cqm-search-wrap { max-width: none; }
    .cqm-pagination { flex-direction: column; align-items: stretch; }
    .cqm-page-btn { justify-content: center; }
    .cqm-pagination-controls { justify-content: space-between; }
}
</style>

<div class="cqm-page">
    <div class="cqm-card">
        <div class="cqm-header">
            <div class="cqm-header-title">
                <div class="cqm-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>
                </div>
                <div>
                    <h1>CQM Valueset</h1>
                    <p class="form-subtitle">Manage clinical quality measure value sets and their member codes used for eCQM reporting.</p>
                </div>
            </div>
            <button type="button" class="cqm-add-btn" id="openAddCqmModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Value Set
            </button>
        </div>

        <div class="cqm-toolbar">
            <span class="cqm-stat-pill" id="cqmCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>
                <span id="cqmCountText">0 value sets</span>
            </span>
            <div class="cqm-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="cqm-search-input" id="cqmSearch" placeholder="Search by OID, name, or code system...">
                <button type="button" class="cqm-search-clear" id="cqmSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cqm-table-wrap">
            <table class="cqm-table">
                <thead>
                    <tr>
                        <th>OID</th>
                        <th>Name</th>
                        <th>Code System</th>
                        <th>Codes</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="cqmTableBody">
                    <tr class="cqm-skeleton-row"><td colspan="5"><div class="cqm-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cqm-skeleton-row"><td colspan="5"><div class="cqm-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cqm-skeleton-row"><td colspan="5"><div class="cqm-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>

        <div class="cqm-pagination" id="cqmPagination">
            <span class="cqm-pagination-info" id="cqmPaginationInfo"></span>
            <div class="cqm-pagination-controls">
                <button type="button" class="cqm-page-btn" id="cqmPrevPage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                    Prev
                </button>
                <span class="cqm-page-indicator" id="cqmPageIndicator">Page 1 of 1</span>
                <button type="button" class="cqm-page-btn" id="cqmNextPage">
                    Next
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="cqmModalOverlay">
    <div class="modal-box">
        <div class="cqm-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="cqmModalTitle">Add Value Set</h2>
            <button type="button" class="modal-close" id="closeCqmModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a CQM value set used to group codes for eCQM measure logic.</p>

        <div id="cqmFormAlert"></div>

        <form id="cqmForm">
            <input type="hidden" id="cqm_record_id">
            <div class="form-grid">
                <div class="form-group">
                    <label>OID</label>
                    <input id="cqm_oid" class="form-input cqm-code-input" placeholder="e.g 2.16.840.1.113883.3.464.1003.103.12.1001">
                    <span class="form-error" id="err-cqm_oid"></span>
                </div>

                <div class="form-group">
                    <label>Code System</label>
                    <select id="cqm_code_system" class="form-input">
                        <option value="">Select code system...</option>
                        <option value="ICD10CM">ICD-10-CM</option>
                        <option value="ICD9CM">ICD-9-CM</option>
                        <option value="SNOMEDCT">SNOMED CT</option>
                        <option value="LOINC">LOINC</option>
                        <option value="RXNORM">RxNorm</option>
                        <option value="CPT">CPT</option>
                        <option value="HCPCS">HCPCS</option>
                        <option value="CVX">CVX</option>
                    </select>
                    <span class="form-error" id="err-cqm_code_system"></span>
                </div>

                <div class="form-group full">
                    <label>Name</label>
                    <input id="cqm_name" class="form-input" placeholder="e.g Acute Pharyngitis">
                    <span class="form-error" id="err-cqm_name"></span>
                </div>

                <div class="form-group full">
                    <label>Definition Version <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
                    <input id="cqm_definition_version" class="form-input" placeholder="e.g 20210220">
                    <span class="form-error" id="err-cqm_definition_version"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCqm">Cancel</button>
                <button class="login-btn" type="submit" id="saveCqmBtn">Add Value Set</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="cqmCodesModalOverlay">
    <div class="modal-box cqm-codes-modal-box">
        <div class="cqm-codes-modal-header">
            <div>
                <div class="modal-header" style="margin-bottom:0;">
                    <h2 id="cqmCodesModalTitle">Manage Codes</h2>
                    <button type="button" class="modal-close" id="closeCqmCodesModal">&times;</button>
                </div>
                <p class="form-subtitle" id="cqmCodesModalSubtitle"></p>
            </div>
        </div>

        <div class="cqm-codes-toolbar">
            <button type="button" class="cqm-add-btn" id="openAddCqmCodeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Code
            </button>
        </div>

        <div class="cqm-codes-table-wrap">
            <table class="cqm-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Code System</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="cqmCodesTableBody"></tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="cqmCodeFormModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="cqmCodeFormModalTitle">Add Code</h2>
            <button type="button" class="modal-close" id="closeCqmCodeFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Add a member code to this value set.</p>

        <div id="cqmCodeFormAlert"></div>

        <form id="cqmCodeForm">
            <input type="hidden" id="cqm_code_record_id">
            <div class="form-grid">
                <div class="form-group">
                    <label>Code</label>
                    <input id="cqm_code_code" class="form-input cqm-code-input" placeholder="e.g J02.9">
                    <span class="form-error" id="err-cqm_code_code"></span>
                </div>

                <div class="form-group">
                    <label>Code System</label>
                    <select id="cqm_code_code_system" class="form-input">
                        <option value="">Select code system...</option>
                        <option value="ICD10CM">ICD-10-CM</option>
                        <option value="ICD9CM">ICD-9-CM</option>
                        <option value="SNOMEDCT">SNOMED CT</option>
                        <option value="LOINC">LOINC</option>
                        <option value="RXNORM">RxNorm</option>
                        <option value="CPT">CPT</option>
                        <option value="HCPCS">HCPCS</option>
                        <option value="CVX">CVX</option>
                    </select>
                    <span class="form-error" id="err-cqm_code_code_system"></span>
                </div>

                <div class="form-group full">
                    <label>Description <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
                    <input id="cqm_code_description" class="form-input" placeholder="e.g Acute pharyngitis, unspecified">
                    <span class="form-error" id="err-cqm_code_description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCqmCode">Cancel</button>
                <button class="login-btn" type="submit" id="saveCqmCodeBtn">Add Code</button>
            </div>
        </form>
    </div>
</div>
`;
}
