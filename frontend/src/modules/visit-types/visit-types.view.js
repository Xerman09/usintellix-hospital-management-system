export function VisitTypesView()
{
    return `
<style>
.vt-page {
    width: 100%;
}

.vt-card {
    width: 100%;
}

.vt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.vt-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.vt-icon-badge {
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

.vt-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.vt-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.vt-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.vt-add-btn {
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

.vt-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.vt-add-btn svg {
    width: 16px;
    height: 16px;
}

.vt-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.vt-stat-pill {
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

.vt-stat-pill svg {
    width: 14px;
    height: 14px;
}

.vt-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.vt-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.vt-search-input {
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

.vt-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.vt-search-clear {
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

.vt-search-clear.show {
    display: flex;
}

.vt-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.vt-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.vt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.vt-table tbody tr {
    animation: vt-row-in .25s ease both;
}

@keyframes vt-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.vt-table th {
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

.vt-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.vt-table tbody tr:last-child td {
    border-bottom: none;
}

.vt-table tbody tr {
    transition: background .12s;
}

.vt-table tbody tr:hover {
    background: #fafbff;
}

.vt-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.vt-avatar {
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

.vt-name {
    font-weight: 600;
    color: #1a2338;
}

.vt-description {
    color: #71809b;
}

.vt-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.vt-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.vt-icon-btn {
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

.vt-icon-btn svg {
    width: 13px;
    height: 13px;
}

.vt-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.vt-icon-btn.edit:hover {
    background: var(--accent-border);
}

.vt-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.vt-icon-btn.delete:hover {
    background: #fecaca;
}

.vt-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.vt-empty-state .vt-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vt-empty-state .vt-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.vt-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.vt-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.vt-skeleton-row td {
    padding: 16px 18px;
}

.vt-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: vt-shimmer 1.4s ease infinite;
}

@keyframes vt-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.vt-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.vt-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .vt-header { flex-direction: column; }
    .vt-add-btn { width: 100%; justify-content: center; }
    .vt-toolbar { flex-direction: column; align-items: stretch; }
    .vt-search-wrap { max-width: none; }
}
</style>

<div class="vt-page">
    <div class="vt-card">
        <div class="vt-header">
            <div class="vt-header-title">
                <div class="vt-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"></path><path d="m2 17 10 5 10-5M2 12l10 5 10-5"></path></svg>
                </div>
                <div>
                    <h1>Visit Types</h1>
                    <p class="form-subtitle">Visit types registered here become available when scheduling and classifying patient visits.</p>
                </div>
            </div>
            <button type="button" class="vt-add-btn" id="openAddVisitTypeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Visit Type
            </button>
        </div>

        <div class="vt-toolbar">
            <span class="vt-stat-pill" id="visitTypeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"></path></svg>
                <span id="visitTypeCountText">0 visit types</span>
            </span>
            <div class="vt-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="vt-search-input" id="visitTypeSearch" placeholder="Search visit types...">
                <button type="button" class="vt-search-clear" id="visitTypeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="vt-table-wrap">
            <table class="vt-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="visitTypesTableBody">
                    <tr class="vt-skeleton-row"><td colspan="3"><div class="vt-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="vt-skeleton-row"><td colspan="3"><div class="vt-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="vt-skeleton-row"><td colspan="3"><div class="vt-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="visitTypeModalOverlay">
    <div class="modal-box">
        <div class="vt-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"></path><path d="m2 17 10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="visitTypeModalTitle">Add Visit Type</h2>
            <button type="button" class="modal-close" id="closeVisitTypeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a type used to classify patient visits.</p>

        <div id="formAlert"></div>

        <form id="visitTypeForm">
            <input type="hidden" id="visit_type_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Type</label>
                    <input id="type" class="form-input" placeholder="e.g Follow-up">
                    <span class="form-error" id="err-type"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelVisitType">Cancel</button>
                <button class="login-btn" type="submit" id="saveVisitTypeBtn">Add Visit Type</button>
            </div>
        </form>
    </div>
</div>
`;
}
