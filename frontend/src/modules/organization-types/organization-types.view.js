export function OrganizationTypesView()
{
    return `
<style>
.org-page {
    width: 100%;
}

.org-card {
    width: 100%;
}

.org-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.org-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.org-icon-badge {
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

.org-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.org-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.org-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.org-add-btn {
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

.org-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.org-add-btn svg {
    width: 16px;
    height: 16px;
}

.org-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.org-stat-pill {
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

.org-stat-pill svg {
    width: 14px;
    height: 14px;
}

.org-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.org-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.org-search-input {
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

.org-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.org-search-clear {
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

.org-search-clear.show {
    display: flex;
}

.org-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.org-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.org-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.org-table tbody tr {
    animation: org-row-in .25s ease both;
}

@keyframes org-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.org-table th {
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

.org-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.org-table tbody tr:last-child td {
    border-bottom: none;
}

.org-table tbody tr:hover {
    background: #fafbff;
}

.org-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.org-avatar {
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

.org-name {
    font-weight: 600;
    color: #1a2338;
}

.org-description {
    color: #71809b;
}

.org-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.org-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.org-icon-btn {
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

.org-icon-btn svg {
    width: 13px;
    height: 13px;
}

.org-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.org-icon-btn.edit:hover {
    background: var(--accent-border);
}

.org-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.org-icon-btn.delete:hover {
    background: #fecaca;
}

.org-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.org-empty-state .org-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.org-empty-state .org-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.org-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.org-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.org-skeleton-row td {
    padding: 16px 18px;
}

.org-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: org-shimmer 1.4s ease infinite;
}

@keyframes org-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.org-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.org-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .org-header { flex-direction: column; }
    .org-add-btn { width: 100%; justify-content: center; }
    .org-toolbar { flex-direction: column; align-items: stretch; }
    .org-search-wrap { max-width: none; }
}
</style>

<div class="org-page">
    <div class="org-card">
        <div class="org-header">
            <div class="org-header-title">
                <div class="org-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
                </div>
                <div>
                    <h1>Organization Type Registration</h1>
                    <p class="form-subtitle">Organization types registered here become available when classifying affiliated organizations.</p>
                </div>
            </div>
            <button type="button" class="org-add-btn" id="openAddOrganizationTypeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Organization Type
            </button>
        </div>

        <div class="org-toolbar">
            <span class="org-stat-pill" id="organizationTypeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
                <span id="organizationTypeCountText">0 organization types</span>
            </span>
            <div class="org-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="org-search-input" id="organizationTypeSearch" placeholder="Search organization types...">
                <button type="button" class="org-search-clear" id="organizationTypeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="org-table-wrap">
            <table class="org-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="organizationTypesTableBody">
                    <tr class="org-skeleton-row"><td colspan="3"><div class="org-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="org-skeleton-row"><td colspan="3"><div class="org-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="org-skeleton-row"><td colspan="3"><div class="org-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="organizationTypeModalOverlay">
    <div class="modal-box">
        <div class="org-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
        </div>
        <div class="modal-header">
            <h2 id="organizationTypeModalTitle">Add Organization Type</h2>
            <button type="button" class="modal-close" id="closeOrganizationTypeModal">&times;</button>
        </div>
        <p class="form-subtitle">Define an organization type used for classification.</p>

        <div id="formAlert"></div>

        <form id="organizationTypeForm">
            <input type="hidden" id="organization_type_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Referring Clinic">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelOrganizationType">Cancel</button>
                <button class="login-btn" type="submit" id="saveOrganizationTypeBtn">Add Organization Type</button>
            </div>
        </form>
    </div>
</div>
`;
}
