export function AdministrationRoutesView()
{
    return `
<style>
.ar-page {
    width: 100%;
}

.ar-card {
    width: 100%;
}

.ar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.ar-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.ar-icon-badge {
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

.ar-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.ar-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.ar-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.ar-add-btn {
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

.ar-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.ar-add-btn svg {
    width: 16px;
    height: 16px;
}

.ar-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.ar-stat-pill {
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

.ar-stat-pill svg {
    width: 14px;
    height: 14px;
}

.ar-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.ar-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.ar-search-input {
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

.ar-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.ar-search-clear {
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

.ar-search-clear.show {
    display: flex;
}

.ar-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.ar-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.ar-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.ar-table tbody tr {
    animation: ar-row-in .25s ease both;
}

@keyframes ar-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.ar-table th {
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

.ar-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.ar-table tbody tr:last-child td {
    border-bottom: none;
}

.ar-table tbody tr {
    transition: background .12s;
}

.ar-table tbody tr:hover {
    background: #fafbff;
}

.ar-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ar-avatar {
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

.ar-name {
    font-weight: 600;
    color: #1a2338;
}

.ar-description {
    color: #71809b;
}

.ar-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.ar-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.ar-icon-btn {
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

.ar-icon-btn svg {
    width: 13px;
    height: 13px;
}

.ar-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.ar-icon-btn.edit:hover {
    background: var(--accent-border);
}

.ar-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.ar-icon-btn.delete:hover {
    background: #fecaca;
}

.ar-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.ar-empty-state .ar-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ar-empty-state .ar-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.ar-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.ar-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.ar-skeleton-row td {
    padding: 16px 18px;
}

.ar-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: ar-shimmer 1.4s ease infinite;
}

@keyframes ar-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.ar-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.ar-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .ar-header { flex-direction: column; }
    .ar-add-btn { width: 100%; justify-content: center; }
    .ar-toolbar { flex-direction: column; align-items: stretch; }
    .ar-search-wrap { max-width: none; }
}
</style>

<div class="ar-page">
    <div class="ar-card">
        <div class="ar-header">
            <div class="ar-header-title">
                <div class="ar-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path><circle cx="18" cy="5" r="3"></circle></svg>
                </div>
                <div>
                    <h1>Routes Management</h1>
                    <p class="form-subtitle">Administration routes registered here become available when recording how a medication or immunization was given.</p>
                </div>
            </div>
            <button type="button" class="ar-add-btn" id="openAddAdministrationRouteModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Route
            </button>
        </div>

        <div class="ar-toolbar">
            <span class="ar-stat-pill" id="administrationRouteCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path></svg>
                <span id="administrationRouteCountText">0 routes</span>
            </span>
            <div class="ar-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="ar-search-input" id="administrationRouteSearch" placeholder="Search routes...">
                <button type="button" class="ar-search-clear" id="administrationRouteSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="ar-table-wrap">
            <table class="ar-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="administrationRoutesTableBody">
                    <tr class="ar-skeleton-row"><td colspan="3"><div class="ar-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="ar-skeleton-row"><td colspan="3"><div class="ar-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="ar-skeleton-row"><td colspan="3"><div class="ar-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="administrationRouteModalOverlay">
    <div class="modal-box">
        <div class="ar-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path><circle cx="18" cy="5" r="3"></circle></svg>
        </div>
        <div class="modal-header">
            <h2 id="administrationRouteModalTitle">Add Route</h2>
            <button type="button" class="modal-close" id="closeAdministrationRouteModal">&times;</button>
        </div>
        <p class="form-subtitle">Define an administration route used when recording medications and immunizations.</p>

        <div id="formAlert"></div>

        <form id="administrationRouteForm">
            <input type="hidden" id="administration_route_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Intramuscular">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAdministrationRoute">Cancel</button>
                <button class="login-btn" type="submit" id="saveAdministrationRouteBtn">Add Route</button>
            </div>
        </form>
    </div>
</div>
`;
}
