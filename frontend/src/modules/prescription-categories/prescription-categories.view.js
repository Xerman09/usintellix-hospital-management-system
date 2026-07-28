export function PrescriptionCategoriesView()
{
    return `
<style>
.pc-page {
    width: 100%;
}

.pc-card {
    width: 100%;
}

.pc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.pc-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.pc-icon-badge {
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

.pc-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.pc-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pc-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.pc-add-btn {
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

.pc-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.pc-add-btn svg {
    width: 16px;
    height: 16px;
}

.pc-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.pc-stat-pill {
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

.pc-stat-pill svg {
    width: 14px;
    height: 14px;
}

.pc-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.pc-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.pc-search-input {
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

.pc-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.pc-search-clear {
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

.pc-search-clear.show {
    display: flex;
}

.pc-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.pc-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.pc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.pc-table tbody tr {
    animation: pc-row-in .25s ease both;
}

@keyframes pc-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.pc-table th {
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

.pc-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.pc-table tbody tr:last-child td {
    border-bottom: none;
}

.pc-table tbody tr {
    transition: background .12s;
}

.pc-table tbody tr:hover {
    background: #fafbff;
}

.pc-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pc-avatar {
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

.pc-name {
    font-weight: 600;
    color: #1a2338;
}

.pc-description {
    color: #71809b;
}

.pc-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.pc-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.pc-icon-btn {
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

.pc-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pc-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.pc-icon-btn.edit:hover {
    background: var(--accent-border);
}

.pc-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.pc-icon-btn.delete:hover {
    background: #fecaca;
}

.pc-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.pc-empty-state .pc-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pc-empty-state .pc-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pc-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.pc-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pc-skeleton-row td {
    padding: 16px 18px;
}

.pc-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: pc-shimmer 1.4s ease infinite;
}

@keyframes pc-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.pc-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.pc-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .pc-header { flex-direction: column; }
    .pc-add-btn { width: 100%; justify-content: center; }
    .pc-toolbar { flex-direction: column; align-items: stretch; }
    .pc-search-wrap { max-width: none; }
}
</style>

<div class="pc-page">
    <div class="pc-card">
        <div class="pc-header">
            <div class="pc-header-title">
                <div class="pc-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path><path d="M9 3v18M9 9h9M9 15h9"></path></svg>
                </div>
                <div>
                    <h1>Prescription Categories</h1>
                    <p class="form-subtitle">Categories registered here become available when classifying and organizing patient prescriptions.</p>
                </div>
            </div>
            <button type="button" class="pc-add-btn" id="openAddPrescriptionCategoryModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Prescription Category
            </button>
        </div>

        <div class="pc-toolbar">
            <span class="pc-stat-pill" id="prescriptionCategoryCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path></svg>
                <span id="prescriptionCategoryCountText">0 categories</span>
            </span>
            <div class="pc-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="pc-search-input" id="prescriptionCategorySearch" placeholder="Search categories...">
                <button type="button" class="pc-search-clear" id="prescriptionCategorySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="pc-table-wrap">
            <table class="pc-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="prescriptionCategoriesTableBody">
                    <tr class="pc-skeleton-row"><td colspan="3"><div class="pc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pc-skeleton-row"><td colspan="3"><div class="pc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pc-skeleton-row"><td colspan="3"><div class="pc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="prescriptionCategoryModalOverlay">
    <div class="modal-box">
        <div class="pc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path><path d="M9 3v18M9 9h9M9 15h9"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="prescriptionCategoryModalTitle">Add Prescription Category</h2>
            <button type="button" class="modal-close" id="closePrescriptionCategoryModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a category used to classify patient prescriptions.</p>

        <div id="formAlert"></div>

        <form id="prescriptionCategoryForm">
            <input type="hidden" id="prescription_category_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Antibiotics">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelPrescriptionCategory">Cancel</button>
                <button class="login-btn" type="submit" id="savePrescriptionCategoryBtn">Add Prescription Category</button>
            </div>
        </form>
    </div>
</div>
`;
}
