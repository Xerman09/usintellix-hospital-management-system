export function ScreeningToolsView()
{
    return `
<style>
.st-page {
    width: 100%;
}

.st-card {
    width: 100%;
}

.st-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.st-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.st-icon-badge {
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

.st-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.st-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.st-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.st-add-btn {
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

.st-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.st-add-btn svg {
    width: 16px;
    height: 16px;
}

.st-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.st-stat-pill {
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

.st-stat-pill svg {
    width: 14px;
    height: 14px;
}

.st-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.st-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.st-search-input {
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

.st-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.st-search-clear {
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

.st-search-clear.show {
    display: flex;
}

.st-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.st-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.st-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.st-table tbody tr {
    animation: st-row-in .25s ease both;
}

@keyframes st-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.st-table th {
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

.st-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.st-table tbody tr:last-child td {
    border-bottom: none;
}

.st-table tbody tr {
    transition: background .12s;
}

.st-table tbody tr:hover {
    background: #fafbff;
}

.st-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.st-avatar {
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

.st-name {
    font-weight: 600;
    color: #1a2338;
}

.st-description {
    color: #71809b;
}

.st-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.st-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.st-icon-btn {
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

.st-icon-btn svg {
    width: 13px;
    height: 13px;
}

.st-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.st-icon-btn.edit:hover {
    background: var(--accent-border);
}

.st-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.st-icon-btn.delete:hover {
    background: #fecaca;
}

.st-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.st-empty-state .st-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.st-empty-state .st-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.st-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.st-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.st-skeleton-row td {
    padding: 16px 18px;
}

.st-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: st-shimmer 1.4s ease infinite;
}

@keyframes st-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.st-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.st-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .st-header { flex-direction: column; }
    .st-add-btn { width: 100%; justify-content: center; }
    .st-toolbar { flex-direction: column; align-items: stretch; }
    .st-search-wrap { max-width: none; }
}

/* Custom confirmation modal */
.custom-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}
.custom-modal-overlay.open {
    display: flex;
    opacity: 1;
}
.custom-modal-box {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    padding: 32px;
    box-shadow: 0 20px 40px -8px rgba(0,0,0,0.15);
    transform: translateY(10px) scale(0.98);
    transition: transform 0.2s ease;
    text-align: center;
}
.custom-modal-overlay.open .custom-modal-box {
    transform: translateY(0) scale(1);
}
.custom-modal-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fee2e2;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}
.custom-modal-icon svg { width: 24px; height: 24px; }
.custom-modal-title { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
.custom-modal-desc { margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5; }
.custom-modal-actions { display: flex; gap: 12px; }
.btn-action-cancel { flex: 1; height: 44px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-cancel:hover { background: #e2e8f0; }
.btn-action-delete { flex: 1; height: 44px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-delete:hover { background: #dc2626; }
</style>

<div class="st-page">
    <div class="st-card">
        <div class="st-header">
            <div class="st-header-title">
                <div class="st-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                    <h1>Screening Tools</h1>
                    <p class="form-subtitle">Tools registered here become available for assessing patient conditions.</p>
                </div>
            </div>
            <button type="button" class="st-add-btn" id="openAddScreeningToolModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Screening Tool
            </button>
        </div>

        <div class="st-toolbar">
            <span class="st-stat-pill" id="screeningToolCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                <span id="screeningToolCountText">0 tools</span>
            </span>
            <div class="st-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="st-search-input" id="screeningToolSearch" placeholder="Search tools...">
                <button type="button" class="st-search-clear" id="screeningToolSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="st-table-wrap">
            <table class="st-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="screeningToolsTableBody">
                    <tr class="st-skeleton-row"><td colspan="3"><div class="st-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="st-skeleton-row"><td colspan="3"><div class="st-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="st-skeleton-row"><td colspan="3"><div class="st-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="screeningToolModalOverlay">
    <div class="modal-box">
        <div class="st-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div class="modal-header">
            <h2 id="screeningToolModalTitle">Add Screening Tool</h2>
            <button type="button" class="modal-close" id="closeScreeningToolModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a screening tool used to assess patient conditions.</p>

        <div id="stFormAlert"></div>

        <form id="screeningToolForm">
            <input type="hidden" id="screening_tool_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="st_name" class="form-input" placeholder="e.g Hunger Vital Sign (2-item)">
                    <span class="form-error" id="err-st_name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="st_description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-st_description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelScreeningTool">Cancel</button>
                <button class="login-btn" type="submit" id="saveScreeningToolBtn">Add Screening Tool</button>
            </div>
        </form>
    </div>
</div>

<!-- Custom Confirmation Modal -->
<div id="stConfirmDeleteModal" class="custom-modal-overlay">
    <div class="custom-modal-box">
        <div class="custom-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
        </div>
        <h3 class="custom-modal-title">Remove Screening Tool?</h3>
        <p class="custom-modal-desc">This action cannot be undone and may affect associated patient records.</p>
        <div class="custom-modal-actions">
            <button type="button" class="btn-action-cancel" id="stCancelDeleteBtn">Cancel</button>
            <button type="button" class="btn-action-delete" id="stConfirmDeleteBtn">Delete</button>
        </div>
    </div>
</div>
`;
}
