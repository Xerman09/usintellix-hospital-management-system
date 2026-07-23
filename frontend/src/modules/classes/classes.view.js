export function ClassesView()
{
    return `
<style>
.cls-page {
    width: 100%;
}

.cls-card {
    width: 100%;
}

.cls-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.cls-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.cls-icon-badge {
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

.cls-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.cls-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.cls-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.cls-add-btn {
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

.cls-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.cls-add-btn svg {
    width: 16px;
    height: 16px;
}

.cls-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.cls-stat-pill {
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

.cls-stat-pill svg {
    width: 14px;
    height: 14px;
}

.cls-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.cls-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.cls-search-input {
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

.cls-search-input:focus {
    border-color: #4f46e5;
    background: white;
    box-shadow: 0 0 0 4px rgba(79,70,229,.1);
}

.cls-search-clear {
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

.cls-search-clear.show {
    display: flex;
}

.cls-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.cls-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.cls-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.cls-table tbody tr {
    animation: cls-row-in .25s ease both;
}

@keyframes cls-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.cls-table th {
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

.cls-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.cls-table tbody tr:last-child td {
    border-bottom: none;
}

.cls-table tbody tr {
    transition: background .12s;
}

.cls-table tbody tr:hover {
    background: #fafbff;
}

.cls-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cls-avatar {
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

.cls-name {
    font-weight: 600;
    color: #1a2338;
}

.cls-description {
    color: #71809b;
}

.cls-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.cls-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.cls-icon-btn {
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

.cls-icon-btn svg {
    width: 13px;
    height: 13px;
}

.cls-icon-btn.edit {
    background: #e0e7ff;
    color: #4338ca;
}

.cls-icon-btn.edit:hover {
    background: #c7d2fe;
}

.cls-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.cls-icon-btn.delete:hover {
    background: #fecaca;
}

.cls-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.cls-empty-state .cls-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cls-empty-state .cls-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.cls-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.cls-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.cls-skeleton-row td {
    padding: 16px 18px;
}

.cls-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: cls-shimmer 1.4s ease infinite;
}

@keyframes cls-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.cls-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.cls-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .cls-header { flex-direction: column; }
    .cls-add-btn { width: 100%; justify-content: center; }
    .cls-toolbar { flex-direction: column; align-items: stretch; }
    .cls-search-wrap { max-width: none; }
}
</style>

<div class="cls-page">
    <div class="cls-card">
        <div class="cls-header">
            <div class="cls-header-title">
                <div class="cls-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18M8 4v5"></path></svg>
                </div>
                <div>
                    <h1>Classes</h1>
                    <p class="form-subtitle">Classes registered here become available for classification and grouping across the system.</p>
                </div>
            </div>
            <button type="button" class="cls-add-btn" id="openAddClassModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Class
            </button>
        </div>

        <div class="cls-toolbar">
            <span class="cls-stat-pill" id="classCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path></svg>
                <span id="classCountText">0 classes</span>
            </span>
            <div class="cls-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="cls-search-input" id="classSearch" placeholder="Search classes...">
                <button type="button" class="cls-search-clear" id="classSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="cls-table-wrap">
            <table class="cls-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="classesTableBody">
                    <tr class="cls-skeleton-row"><td colspan="3"><div class="cls-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="cls-skeleton-row"><td colspan="3"><div class="cls-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="cls-skeleton-row"><td colspan="3"><div class="cls-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="classModalOverlay">
    <div class="modal-box">
        <div class="cls-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18M8 4v5"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="classModalTitle">Add Class</h2>
            <button type="button" class="modal-close" id="closeClassModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a class used for classification across the system.</p>

        <div id="formAlert"></div>

        <form id="classForm">
            <input type="hidden" id="class_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Class A">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelClass">Cancel</button>
                <button class="login-btn" type="submit" id="saveClassBtn">Add Class</button>
            </div>
        </form>
    </div>
</div>
`;
}
