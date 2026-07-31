export function PreferenceTypesView()
{
    return `
<style>
.pft-page {
    width: 100%;
}

.pft-card {
    width: 100%;
}

.pft-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pft-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pft-icon-badge {
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

.pft-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pft-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pft-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pft-add-btn {
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

.pft-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.pft-add-btn svg {
    width: 16px;
    height: 16px;
}

.pft-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pft-stat-pill {
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

.pft-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pft-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pft-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pft-search-input {
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

.pft-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.pft-search-clear {
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

.pft-search-clear.show {
    display: flex;
}

.pft-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pft-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pft-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pft-table tbody tr {
    animation: pft-row-in .25s ease both;
}

@keyframes pft-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pft-table th {
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

.pft-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pft-table tbody tr:last-child td {
    border-bottom: none;
}

.pft-table tbody tr {
    transition: background .12s;
}

.pft-table tbody tr:hover {
    background: #fafbff;
}

.pft-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pft-avatar {
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

.pft-name {
    font-weight: 600;
    color: #1a2338;
}

.pft-code {
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

.pft-code.empty {
    font-style: italic;
    font-family: inherit;
    font-weight: 400;
    color: #a2aec4;
    background: transparent;
    padding-left: 0;
}

.pft-description {
    color: #71809b;
}

.pft-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.pft-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pft-icon-btn {
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

.pft-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pft-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.pft-icon-btn.edit:hover {
    background: var(--accent-border);
}

.pft-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pft-icon-btn.delete:hover {
    background: #fecaca;
}

.pft-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pft-empty-state .pft-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pft-empty-state .pft-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pft-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pft-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pft-skeleton-row td {
    padding: 16px 18px;
}

.pft-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pft-shimmer 1.4s ease infinite;
}

@keyframes pft-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pft-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pft-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .pft-header { flex-direction: column; }
    .pft-add-btn { width: 100%; justify-content: center; }
    .pft-toolbar { flex-direction: column; align-items: stretch; }
    .pft-search-wrap { max-width: none; }
}
</style>

<div class="pft-page">
    <div class="pft-card">
        <div class="pft-header">
            <div class="pft-header-title">
                <div class="pft-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.9.37 4.14 1.02"></path><path d="M21 5l-9 9"></path></svg>
                </div>
                <div>
                    <h1>Preference Types</h1>
                    <p class="form-subtitle">LOINC-coded list of treatment preference types available when recording a patient's treatment preferences (FHIR compliant).</p>
                </div>
            </div>
            <button type="button" class="pft-add-btn" id="openAddPreferenceTypeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Preference Type
            </button>
        </div>

        <div class="pft-toolbar">
            <span class="pft-stat-pill" id="preferenceTypeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>
                <span id="preferenceTypeCountText">0 preference types</span>
            </span>
            <div class="pft-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pft-search-input" id="preferenceTypeSearch" placeholder="Search preference types...">
                <button type="button" class="pft-search-clear" id="preferenceTypeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pft-table-wrap">
            <table class="pft-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>LOINC Code</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="preferenceTypesTableBody">
                    <tr class="pft-skeleton-row"><td colspan="4"><div class="pft-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pft-skeleton-row"><td colspan="4"><div class="pft-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pft-skeleton-row"><td colspan="4"><div class="pft-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="preferenceTypeModalOverlay">
    <div class="modal-box">
        <div class="pft-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.9.37 4.14 1.02"></path><path d="M21 5l-9 9"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="preferenceTypeModalTitle">Add Preference Type</h2>
            <button type="button" class="modal-close" id="closePreferenceTypeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a treatment preference type patients can be asked about.</p>

        <div id="formAlert"></div>

        <form id="preferenceTypeForm">
            <input type="hidden" id="preference_type_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g. Resuscitation Status">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>LOINC Code</label>
                    <input id="loinc_code" class="form-input" placeholder="e.g. 75320-2">
                    <span class="form-error" id="err-loinc_code"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPreferenceType">Cancel</button>
                <button class="login-btn" type="submit" id="savePreferenceTypeBtn">Add Preference Type</button>
            </div>
        </form>
    </div>
</div>
`;
}
