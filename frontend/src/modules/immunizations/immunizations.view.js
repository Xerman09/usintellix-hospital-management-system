export function ImmunizationsView()
{
    return `
<style>
.imm-page {
    width: 100%;
}

.imm-card {
    width: 100%;
}

.imm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.imm-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.imm-icon-badge {
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

.imm-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.imm-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.imm-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.imm-add-btn {
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

.imm-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.imm-add-btn svg {
    width: 16px;
    height: 16px;
}

.imm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.imm-stat-pill {
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

.imm-stat-pill svg {
    width: 14px;
    height: 14px;
}

.imm-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.imm-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.imm-search-input {
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

.imm-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.imm-search-clear {
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

.imm-search-clear.show {
    display: flex;
}

.imm-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.imm-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.imm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.imm-table tbody tr {
    animation: imm-row-in .25s ease both;
}

@keyframes imm-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.imm-table th {
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

.imm-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.imm-table tbody tr:last-child td {
    border-bottom: none;
}

.imm-table tbody tr {
    transition: background .12s;
}

.imm-table tbody tr:hover {
    background: #fafbff;
}

.imm-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.imm-avatar {
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

.imm-name {
    font-weight: 600;
    color: #1a2338;
}

.imm-description {
    color: #71809b;
}

.imm-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.imm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.imm-icon-btn {
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

.imm-icon-btn svg {
    width: 13px;
    height: 13px;
}

.imm-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.imm-icon-btn.edit:hover {
    background: var(--accent-border);
}

.imm-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.imm-icon-btn.delete:hover {
    background: #fecaca;
}

.imm-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.imm-empty-state .imm-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.imm-empty-state .imm-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.imm-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.imm-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.imm-skeleton-row td {
    padding: 16px 18px;
}

.imm-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: imm-shimmer 1.4s ease infinite;
}

@keyframes imm-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.imm-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.imm-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .imm-header { flex-direction: column; }
    .imm-add-btn { width: 100%; justify-content: center; }
    .imm-toolbar { flex-direction: column; align-items: stretch; }
    .imm-search-wrap { max-width: none; }
}
</style>

<div class="imm-page">
    <div class="imm-card">
        <div class="imm-header">
            <div class="imm-header-title">
                <div class="imm-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"></path><path d="m17 7 3-3"></path><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"></path><path d="m9 11 4 4"></path><path d="m5 19-3 3"></path><path d="m14 4 6 6"></path></svg>
                </div>
                <div>
                    <h1>Immunizations</h1>
                    <p class="form-subtitle">Immunizations registered here become available when recording patient vaccinations.</p>
                </div>
            </div>
            <button type="button" class="imm-add-btn" id="openAddImmunizationModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Immunization
            </button>
        </div>

        <div class="imm-toolbar">
            <span class="imm-stat-pill" id="immunizationCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"></path></svg>
                <span id="immunizationCountText">0 immunizations</span>
            </span>
            <div class="imm-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="imm-search-input" id="immunizationSearch" placeholder="Search immunizations...">
                <button type="button" class="imm-search-clear" id="immunizationSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="imm-table-wrap">
            <table class="imm-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="immunizationsTableBody">
                    <tr class="imm-skeleton-row"><td colspan="3"><div class="imm-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="imm-skeleton-row"><td colspan="3"><div class="imm-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="imm-skeleton-row"><td colspan="3"><div class="imm-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="immunizationModalOverlay">
    <div class="modal-box">
        <div class="imm-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"></path><path d="m17 7 3-3"></path><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"></path><path d="m9 11 4 4"></path><path d="m5 19-3 3"></path><path d="m14 4 6 6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="immunizationModalTitle">Add Immunization</h2>
            <button type="button" class="modal-close" id="closeImmunizationModal">&times;</button>
        </div>
        <p class="form-subtitle">Define an immunization used when recording patient vaccinations.</p>

        <div id="formAlert"></div>

        <form id="immunizationForm">
            <input type="hidden" id="immunization_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Influenza">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelImmunization">Cancel</button>
                <button class="login-btn" type="submit" id="saveImmunizationBtn">Add Immunization</button>
            </div>
        </form>
    </div>
</div>
`;
}
