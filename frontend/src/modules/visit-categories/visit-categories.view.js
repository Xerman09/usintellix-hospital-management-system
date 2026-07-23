export function VisitCategoriesView()
{
    return `
<style>
.vc-page {
    width: 100%;
}

.vc-card {
    width: 100%;
}

.vc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.vc-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.vc-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(79,70,229,.28);
}

.vc-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.vc-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.vc-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.vc-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #4f46e5, #2563eb);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(37,99,235,.24);
    transition: .18s;
    white-space: nowrap;
}

.vc-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.vc-add-btn svg {
    width: 16px;
    height: 16px;
}

.vc-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.vc-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.vc-stat-pill svg {
    width: 14px;
    height: 14px;
}

.vc-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.vc-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.vc-search-input {
    width: 100%;
    height: 40px;
    padding: 0 14px 0 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    transition: .15s;
}

.vc-search-input:focus {
    border-color: #4f46e5;
    background: white;
    box-shadow: 0 0 0 4px rgba(79,70,229,.1);
}

.vc-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.vc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.vc-table th {
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

.vc-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.vc-table tbody tr:last-child td {
    border-bottom: none;
}

.vc-table tbody tr {
    transition: background .12s;
}

.vc-table tbody tr:hover {
    background: #fafbff;
}

.vc-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.vc-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #eef2ff;
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.vc-name {
    font-weight: 600;
    color: #1a2338;
}

.vc-description {
    color: #71809b;
}

.vc-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.vc-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.vc-icon-btn {
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

.vc-icon-btn svg {
    width: 13px;
    height: 13px;
}

.vc-icon-btn.edit {
    background: #e0e7ff;
    color: #4338ca;
}

.vc-icon-btn.edit:hover {
    background: #c7d2fe;
}

.vc-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.vc-icon-btn.delete:hover {
    background: #fecaca;
}

.vc-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.vc-empty-state .vc-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vc-empty-state .vc-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.vc-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.vc-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.vc-skeleton-row td {
    padding: 16px 18px;
}

.vc-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: vc-shimmer 1.4s ease infinite;
}

@keyframes vc-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.vc-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.vc-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .vc-header { flex-direction: column; }
    .vc-add-btn { width: 100%; justify-content: center; }
    .vc-toolbar { flex-direction: column; align-items: stretch; }
    .vc-search-wrap { max-width: none; }
}
</style>

<div class="vc-page">
    <div class="vc-card">
        <div class="vc-header">
            <div class="vc-header-title">
                <div class="vc-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1"></rect><path d="M9 13h6M9 17h4"></path></svg>
                </div>
                <div>
                    <h1>Visit Categories</h1>
                    <p class="form-subtitle">Categories registered here become available when scheduling and classifying patient visits.</p>
                </div>
            </div>
            <button type="button" class="vc-add-btn" id="openAddVisitCategoryModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Visit Category
            </button>
        </div>

        <div id="listAlert"></div>

        <div class="vc-toolbar">
            <span class="vc-stat-pill" id="visitCategoryCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1"></rect></svg>
                <span id="visitCategoryCountText">0 categories</span>
            </span>
            <div class="vc-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="vc-search-input" id="visitCategorySearch" placeholder="Search categories...">
            </div>
        </div>

        <div class="vc-table-wrap">
            <table class="vc-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="visitCategoriesTableBody">
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="visitCategoryModalOverlay">
    <div class="modal-box">
        <div class="vc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1"></rect><path d="M9 13h6M9 17h4"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="visitCategoryModalTitle">Add Visit Category</h2>
            <button type="button" class="modal-close" id="closeVisitCategoryModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a category used to classify patient visits.</p>

        <div id="formAlert"></div>

        <form id="visitCategoryForm">
            <input type="hidden" id="visit_category_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Consultation">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelVisitCategory">Cancel</button>
                <button class="login-btn" type="submit" id="saveVisitCategoryBtn">Add Visit Category</button>
            </div>
        </form>
    </div>
</div>
`;
}
