export function AllergiesView()
{
    return `
<style>
.alg-page {
    width: 100%;
}

.alg-card {
    width: 100%;
}

.alg-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.alg-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.alg-icon-badge {
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

.alg-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.alg-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.alg-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.alg-add-btn {
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

.alg-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.alg-add-btn svg {
    width: 16px;
    height: 16px;
}

.alg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.alg-stat-pill {
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

.alg-stat-pill svg {
    width: 14px;
    height: 14px;
}

.alg-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.alg-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.alg-search-input {
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

.alg-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.alg-search-clear {
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

.alg-search-clear.show {
    display: flex;
}

.alg-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.alg-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.alg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.alg-table tbody tr {
    animation: alg-row-in .25s ease both;
}

@keyframes alg-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.alg-table th {
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

.alg-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.alg-table tbody tr:last-child td {
    border-bottom: none;
}

.alg-table tbody tr:hover {
    background: #fafbff;
}

.alg-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.alg-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #fee2e2;
    color: #b91c1c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.alg-name {
    font-weight: 600;
    color: #1a2338;
}

.alg-description {
    color: #71809b;
}

.alg-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.alg-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.alg-icon-btn {
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

.alg-icon-btn svg {
    width: 13px;
    height: 13px;
}

.alg-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.alg-icon-btn.edit:hover {
    background: var(--accent-border);
}

.alg-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.alg-icon-btn.delete:hover {
    background: #fecaca;
}

.alg-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.alg-empty-state .alg-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.alg-empty-state .alg-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.alg-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.alg-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.alg-skeleton-row td {
    padding: 16px 18px;
}

.alg-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: alg-shimmer 1.4s ease infinite;
}

@keyframes alg-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.alg-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.alg-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .alg-header { flex-direction: column; }
    .alg-add-btn { width: 100%; justify-content: center; }
    .alg-toolbar { flex-direction: column; align-items: stretch; }
    .alg-search-wrap { max-width: none; }
}
</style>

<div class="alg-page">
    <div class="alg-card">
        <div class="alg-header">
            <div class="alg-header-title">
                <div class="alg-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
                <div>
                    <h1>Allergy Management</h1>
                    <p class="form-subtitle">Allergies registered here become available when recording patient allergy history.</p>
                </div>
            </div>
            <button type="button" class="alg-add-btn" id="openAddAllergyModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Allergy
            </button>
        </div>

        <div class="alg-toolbar">
            <span class="alg-stat-pill" id="allergyCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4"></path></svg>
                <span id="allergyCountText">0 allergies</span>
            </span>
            <div class="alg-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="alg-search-input" id="allergySearch" placeholder="Search allergies...">
                <button type="button" class="alg-search-clear" id="allergySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="alg-table-wrap">
            <table class="alg-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="allergiesTableBody">
                    <tr class="alg-skeleton-row"><td colspan="3"><div class="alg-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="alg-skeleton-row"><td colspan="3"><div class="alg-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="alg-skeleton-row"><td colspan="3"><div class="alg-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="allergyModalOverlay">
    <div class="modal-box">
        <div class="alg-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
        <div class="modal-header">
            <h2 id="allergyModalTitle">Add Allergy</h2>
            <button type="button" class="modal-close" id="closeAllergyModal">&times;</button>
        </div>
        <p class="form-subtitle">Define an allergy used when recording patient allergy history.</p>

        <div id="formAlert"></div>

        <form id="allergyForm">
            <input type="hidden" id="allergy_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Penicillin">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAllergy">Cancel</button>
                <button class="login-btn" type="submit" id="saveAllergyBtn">Add Allergy</button>
            </div>
        </form>
    </div>
</div>
`;
}
