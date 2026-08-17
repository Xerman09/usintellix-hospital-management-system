export function SpecimenMethodsView()
{
    return `
<style>
.sm-page {
    width: 100%;
}

.sm-card {
    width: 100%;
}

.sm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.sm-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.sm-icon-badge {
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

.sm-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.sm-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.sm-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.sm-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.sm-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.sm-add-btn svg {
    width: 16px;
    height: 16px;
}

.sm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.sm-stat-pill {
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

.sm-stat-pill svg {
    width: 14px;
    height: 14px;
}

.sm-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.sm-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.sm-search-input {
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

.sm-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.sm-search-clear {
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

.sm-search-clear.show {
    display: flex;
}

.sm-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.sm-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.sm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.sm-table tbody tr {
    animation: sm-row-in .25s ease both;
}

@keyframes sm-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.sm-table th {
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

.sm-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.sm-table tbody tr:last-child td {
    border-bottom: none;
}

.sm-table tbody tr {
    transition: background .12s;
}

.sm-table tbody tr:hover {
    background: #fafbff;
}

.sm-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sm-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent-light);
    color: var(--accent-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.sm-name {
    font-weight: 600;
    color: #1a2338;
}

.sm-description {
    color: #71809b;
}

.sm-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.sm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.sm-icon-btn {
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

.sm-icon-btn svg {
    width: 13px;
    height: 13px;
}

.sm-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.sm-icon-btn.edit:hover {
    background: var(--accent-border);
}

.sm-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.sm-icon-btn.delete:hover {
    background: #fecaca;
}

.sm-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.sm-empty-state .sm-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sm-empty-state .sm-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.sm-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.sm-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.sm-skeleton-row td {
    padding: 16px 18px;
}

.sm-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: sm-shimmer 1.4s ease infinite;
}

@keyframes sm-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.sm-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.sm-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .sm-header { flex-direction: column; }
    .sm-add-btn { width: 100%; justify-content: center; }
    .sm-toolbar { flex-direction: column; align-items: stretch; }
    .sm-search-wrap { max-width: none; }
}
</style>

<div class="sm-page">
    <div class="sm-card">
        <div class="sm-header">
            <div class="sm-header-title">
                <div class="sm-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="m8 8 -3 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3 -4l-3 -9"></path></svg>
                </div>
                <div>
                    <h1>Specimen Method Management</h1>
                    <p class="form-subtitle">Methods registered here become available when documenting how a specimen was collected.</p>
                </div>
            </div>
            <button type="button" class="sm-add-btn" id="openAddSpecimenMethodModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Method
            </button>
        </div>

        <div class="sm-toolbar">
            <span class="sm-stat-pill" id="specimenMethodCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                <span id="specimenMethodCountText">0 methods</span>
            </span>
            <div class="sm-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="sm-search-input" id="specimenMethodSearch" placeholder="Search methods...">
                <button type="button" class="sm-search-clear" id="specimenMethodSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="sm-table-wrap">
            <table class="sm-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="specimenMethodsTableBody">
                    <tr class="sm-skeleton-row"><td colspan="3"><div class="sm-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="sm-skeleton-row"><td colspan="3"><div class="sm-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="sm-skeleton-row"><td colspan="3"><div class="sm-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="specimenMethodModalOverlay">
    <div class="modal-box">
        <div class="sm-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="m8 8 -3 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3 -4l-3 -9"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="specimenMethodModalTitle">Add Method</h2>
            <button type="button" class="modal-close" id="closeSpecimenMethodModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a method used when recording a specimen collection.</p>

        <div id="formAlert"></div>

        <form id="specimenMethodForm">
            <input type="hidden" id="specimen_method_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Venipuncture">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelSpecimenMethod">Cancel</button>
                <button class="login-btn" type="submit" id="saveSpecimenMethodBtn">Add Method</button>
            </div>
        </form>
    </div>
</div>
`;
}
