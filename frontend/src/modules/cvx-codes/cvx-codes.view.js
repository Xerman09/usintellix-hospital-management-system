export function CvxCodesView()
{
    return `
<style>
.icd-page {
    width: 100%;
}

.icd-card {
    width: 100%;
}

.icd-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.icd-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.icd-icon-badge {
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

.icd-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.icd-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.icd-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.icd-add-btn {
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

.icd-add-btn:hover {
    background: var(--accent-hover);
}

.icd-add-btn svg {
    width: 16px;
    height: 16px;
}

.icd-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.icd-stat-pill {
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

.icd-stat-pill svg {
    width: 14px;
    height: 14px;
}

.icd-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.icd-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.icd-search-input {
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

.icd-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.icd-search-clear {
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

.icd-search-clear.show {
    display: flex;
}

.icd-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.icd-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.icd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.icd-table tbody tr {
    animation: icd-row-in .25s ease both;
}

@keyframes icd-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.icd-table th {
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

.icd-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.icd-table tbody tr:last-child td {
    border-bottom: none;
}

.icd-table tbody tr:hover {
    background: #fafbff;
}

.icd-code-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.icd-description {
    color: #25324b;
}

.icd-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.icd-icon-btn {
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

.icd-icon-btn svg {
    width: 13px;
    height: 13px;
}

.icd-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.icd-icon-btn.edit:hover {
    background: var(--accent-border);
}

.icd-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.icd-icon-btn.delete:hover {
    background: #fecaca;
}

.icd-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.icd-empty-state .icd-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icd-empty-state .icd-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.icd-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.icd-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.icd-skeleton-row td {
    padding: 16px 18px;
}

.icd-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: icd-shimmer 1.4s ease infinite;
}

@keyframes icd-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.icd-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.icd-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.icd-code-input {
    font-family: "Courier New", monospace;
}

.icd-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    flex-wrap: wrap;
}

.icd-pagination-info {
    font-size: 13px;
    color: #71809b;
}

.icd-pagination-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.icd-page-btn {
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

.icd-page-btn svg {
    width: 14px;
    height: 14px;
}

.icd-page-btn:hover:not(:disabled) {
    border-color: var(--accent-border);
    color: var(--accent-text);
}

.icd-page-btn:disabled {
    opacity: .45;
    cursor: not-allowed;
}

.icd-page-indicator {
    font-size: 13px;
    font-weight: 600;
    color: #25324b;
    white-space: nowrap;
}

@media (max-width: 640px) {
    .icd-header { flex-direction: column; }
    .icd-add-btn { width: 100%; justify-content: center; }
    .icd-toolbar { flex-direction: column; align-items: stretch; }
    .icd-search-wrap { max-width: none; }
    .icd-pagination { flex-direction: column; align-items: stretch; }
    .icd-pagination-controls { justify-content: space-between; }
}
</style>

<div class="icd-page">
    <div class="icd-card">
        <div class="icd-header">
            <div class="icd-header-title">
                <div class="icd-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path></svg>
                </div>
                <div>
                    <h1>CVX Immunization Codes</h1>
                    <p class="form-subtitle">CVX codes registered here become available anywhere immunizations need coding, including the patient chart's Immunization Finder.</p>
                </div>
            </div>
            <button type="button" class="icd-add-btn" id="openAddCvxModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add CVX Code
            </button>
        </div>

        <div class="icd-toolbar">
            <span class="icd-stat-pill" id="cvxCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path></svg>
                <span id="cvxCountText">0 codes</span>
            </span>
            <div class="icd-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="icd-search-input" id="cvxSearch" placeholder="Search by code or description...">
                <button type="button" class="icd-search-clear" id="cvxSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="icd-table-wrap">
            <table class="icd-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="cvxTableBody">
                    <tr class="icd-skeleton-row"><td colspan="4"><div class="icd-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="icd-skeleton-row"><td colspan="4"><div class="icd-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="icd-skeleton-row"><td colspan="4"><div class="icd-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>

        <div class="icd-pagination" id="cvxPagination">
            <span class="icd-pagination-info" id="cvxPaginationInfo"></span>
            <div class="icd-pagination-controls">
                <button type="button" class="icd-page-btn" id="cvxPrevPage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                    Prev
                </button>
                <span class="icd-page-indicator" id="cvxPageIndicator">Page 1 of 1</span>
                <button type="button" class="icd-page-btn" id="cvxNextPage">
                    Next
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="cvxModalOverlay">
    <div class="modal-box">
        <div class="icd-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="cvxModalTitle">Add CVX Code</h2>
            <button type="button" class="modal-close" id="closeCvxModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a CVX (vaccine administered) code available for immunization coding.</p>

        <div id="formAlert"></div>

        <form id="cvxForm">
            <input type="hidden" id="record_id">
            <div class="form-grid">
                <div class="form-group">
                    <label>Code</label>
                    <input id="code" class="form-input icd-code-input" placeholder="e.g 03">
                    <span class="form-error" id="err-code"></span>
                </div>

                <div class="form-group">
                    <label>Status</label>
                    <select id="status" class="form-input">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="short_description" class="form-input" placeholder="e.g measles, mumps and rubella virus vaccine">
                    <span class="form-error" id="err-short_description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCvx">Cancel</button>
                <button class="login-btn" type="submit" id="saveCvxBtn">Add CVX Code</button>
            </div>
        </form>
    </div>
</div>
`;
}
