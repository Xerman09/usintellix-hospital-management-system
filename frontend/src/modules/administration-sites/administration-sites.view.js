export function AdministrationSitesView()
{
    return `
<style>
.as-page {
    width: 100%;
}

.as-card {
    width: 100%;
}

.as-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.as-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.as-icon-badge {
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

.as-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.as-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.as-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.as-add-btn {
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

.as-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.as-add-btn svg {
    width: 16px;
    height: 16px;
}

.as-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.as-stat-pill {
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

.as-stat-pill svg {
    width: 14px;
    height: 14px;
}

.as-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.as-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.as-search-input {
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

.as-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.as-search-clear {
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

.as-search-clear.show {
    display: flex;
}

.as-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.as-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.as-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.as-table tbody tr {
    animation: as-row-in .25s ease both;
}

@keyframes as-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.as-table th {
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

.as-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.as-table tbody tr:last-child td {
    border-bottom: none;
}

.as-table tbody tr {
    transition: background .12s;
}

.as-table tbody tr:hover {
    background: #fafbff;
}

.as-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.as-avatar {
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

.as-name {
    font-weight: 600;
    color: #1a2338;
}

.as-description {
    color: #71809b;
}

.as-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.as-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.as-icon-btn {
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

.as-icon-btn svg {
    width: 13px;
    height: 13px;
}

.as-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.as-icon-btn.edit:hover {
    background: var(--accent-border);
}

.as-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.as-icon-btn.delete:hover {
    background: #fecaca;
}

.as-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.as-empty-state .as-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.as-empty-state .as-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.as-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.as-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.as-skeleton-row td {
    padding: 16px 18px;
}

.as-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: as-shimmer 1.4s ease infinite;
}

@keyframes as-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.as-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.as-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .as-header { flex-direction: column; }
    .as-add-btn { width: 100%; justify-content: center; }
    .as-toolbar { flex-direction: column; align-items: stretch; }
    .as-search-wrap { max-width: none; }
}
</style>

<div class="as-page">
    <div class="as-card">
        <div class="as-header">
            <div class="as-header-title">
                <div class="as-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 0 0 4 10.2C4 17.5 12 22 12 22Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div>
                    <h1>Administration Site Management</h1>
                    <p class="form-subtitle">Administration sites registered here become available when recording where a medication or immunization was given on the body.</p>
                </div>
            </div>
            <button type="button" class="as-add-btn" id="openAddAdministrationSiteModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Site
            </button>
        </div>

        <div class="as-toolbar">
            <span class="as-stat-pill" id="administrationSiteCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"></circle></svg>
                <span id="administrationSiteCountText">0 sites</span>
            </span>
            <div class="as-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="as-search-input" id="administrationSiteSearch" placeholder="Search sites...">
                <button type="button" class="as-search-clear" id="administrationSiteSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="as-table-wrap">
            <table class="as-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="administrationSitesTableBody">
                    <tr class="as-skeleton-row"><td colspan="3"><div class="as-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="as-skeleton-row"><td colspan="3"><div class="as-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="as-skeleton-row"><td colspan="3"><div class="as-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="administrationSiteModalOverlay">
    <div class="modal-box">
        <div class="as-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 0 0 4 10.2C4 17.5 12 22 12 22Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <div class="modal-header">
            <h2 id="administrationSiteModalTitle">Add Site</h2>
            <button type="button" class="modal-close" id="closeAdministrationSiteModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a body site used when recording medications and immunizations.</p>

        <div id="formAlert"></div>

        <form id="administrationSiteForm">
            <input type="hidden" id="administration_site_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Left Deltoid">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAdministrationSite">Cancel</button>
                <button class="login-btn" type="submit" id="saveAdministrationSiteBtn">Add Site</button>
            </div>
        </form>
    </div>
</div>
`;
}
