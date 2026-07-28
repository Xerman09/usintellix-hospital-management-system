export function RoleManagementView()
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
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
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
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.vc-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
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
    background: var(--accent-light);
    color: var(--accent-text);
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
    padding: 0 34px 0 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    transition: .15s;
}

.vc-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.vc-search-clear {
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

.vc-search-clear.show {
    display: flex;
}

.vc-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
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

.vc-table tbody tr {
    animation: vc-row-in .25s ease both;
}

@keyframes vc-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
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
    background: var(--accent-light);
    color: var(--accent-text);
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
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.vc-icon-btn.edit:hover {
    background: var(--accent-border);
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
    background: linear-gradient(135deg, var(--accent), var(--accent));
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
                </div>
                <div>
                    <h1>Role Management</h1>
                    <p class="form-subtitle">Roles registered here are used to control access levels for employees within the system.</p>
                </div>
            </div>
            <button type="button" class="vc-add-btn" id="openAddRoleModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Role
            </button>
        </div>

        <div class="vc-toolbar">
            <span class="vc-stat-pill" id="roleCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
                <span id="roleCountText">0 roles</span>
            </span>
            <div class="vc-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="vc-search-input" id="roleSearch" placeholder="Search roles...">
                <button type="button" class="vc-search-clear" id="roleSearchClear" aria-label="Clear search">&times;</button>
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
                <tbody id="rolesTableBody">
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="3"><div class="vc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="roleModalOverlay">
    <div class="modal-box">
        <div class="vc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="roleModalTitle">Add Role</h2>
            <button type="button" class="modal-close" id="closeRoleModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a role used to control employee access levels.</p>

        <div id="formAlert"></div>

        <form id="roleForm">
            <input type="hidden" id="role_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Nurse">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelRole">Cancel</button>
                <button class="login-btn" type="submit" id="saveRoleBtn">Add Role</button>
            </div>
        </form>
    </div>
</div>
`;
}
