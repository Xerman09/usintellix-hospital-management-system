export function SpecimenSitesView()
{
    return `
<style>
.ss-page {
    width: 100%;
}

.ss-card {
    width: 100%;
}

.ss-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.ss-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.ss-icon-badge {
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

.ss-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.ss-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.ss-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.ss-add-btn {
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

.ss-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.ss-add-btn svg {
    width: 16px;
    height: 16px;
}

.ss-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.ss-stat-pill {
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

.ss-stat-pill svg {
    width: 14px;
    height: 14px;
}

.ss-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.ss-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.ss-search-input {
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

.ss-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.ss-search-clear {
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

.ss-search-clear.show {
    display: flex;
}

.ss-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.ss-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.ss-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.ss-table tbody tr {
    animation: ss-row-in .25s ease both;
}

@keyframes ss-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.ss-table th {
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

.ss-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.ss-table tbody tr:last-child td {
    border-bottom: none;
}

.ss-table tbody tr {
    transition: background .12s;
}

.ss-table tbody tr:hover {
    background: #fafbff;
}

.ss-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ss-avatar {
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

.ss-name {
    font-weight: 600;
    color: #1a2338;
}

.ss-description {
    color: #71809b;
}

.ss-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.ss-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.ss-icon-btn {
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

.ss-icon-btn svg {
    width: 13px;
    height: 13px;
}

.ss-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.ss-icon-btn.edit:hover {
    background: var(--accent-border);
}

.ss-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.ss-icon-btn.delete:hover {
    background: #fecaca;
}

.ss-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.ss-empty-state .ss-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ss-empty-state .ss-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.ss-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.ss-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.ss-skeleton-row td {
    padding: 16px 18px;
}

.ss-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: ss-shimmer 1.4s ease infinite;
}

@keyframes ss-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.ss-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.ss-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .ss-header { flex-direction: column; }
    .ss-add-btn { width: 100%; justify-content: center; }
    .ss-toolbar { flex-direction: column; align-items: stretch; }
    .ss-search-wrap { max-width: none; }
}
</style>

<div class="ss-page">
    <div class="ss-card">
        <div class="ss-header">
            <div class="ss-header-title">
                <div class="ss-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2v6.5a2 2 0 0 0 .6 1.4l5 5a2 2 0 0 1-1.4 3.4H5.3a2 2 0 0 1-1.4-3.4l5-5a2 2 0 0 0 .6-1.4V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path></svg>
                </div>
                <div>
                    <h1>Specimen Site Management</h1>
                    <p class="form-subtitle">Sites registered here become available when documenting where a specimen was collected from.</p>
                </div>
            </div>
            <button type="button" class="ss-add-btn" id="openAddSpecimenSiteModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Site
            </button>
        </div>

        <div class="ss-toolbar">
            <span class="ss-stat-pill" id="specimenSiteCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                <span id="specimenSiteCountText">0 sites</span>
            </span>
            <div class="ss-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="ss-search-input" id="specimenSiteSearch" placeholder="Search sites...">
                <button type="button" class="ss-search-clear" id="specimenSiteSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="ss-table-wrap">
            <table class="ss-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="specimenSitesTableBody">
                    <tr class="ss-skeleton-row"><td colspan="3"><div class="ss-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="ss-skeleton-row"><td colspan="3"><div class="ss-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="ss-skeleton-row"><td colspan="3"><div class="ss-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="specimenSiteModalOverlay">
    <div class="modal-box">
        <div class="ss-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2v6.5a2 2 0 0 0 .6 1.4l5 5a2 2 0 0 1-1.4 3.4H5.3a2 2 0 0 1-1.4-3.4l5-5a2 2 0 0 0 .6-1.4V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="specimenSiteModalTitle">Add Site</h2>
            <button type="button" class="modal-close" id="closeSpecimenSiteModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a site used when recording a specimen collection.</p>

        <div id="formAlert"></div>

        <form id="specimenSiteForm">
            <input type="hidden" id="specimen_site_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Left Antecubital Fossa">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelSpecimenSite">Cancel</button>
                <button class="login-btn" type="submit" id="saveSpecimenSiteBtn">Add Site</button>
            </div>
        </form>
    </div>
</div>
`;
}
