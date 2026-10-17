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
    margin-bottom: 12px;
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
    max-width: 580px;
}

.vc-header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.vc-tab-nav {
    display: inline-flex;
    background: #f1f4fa;
    padding: 4px;
    border-radius: 12px;
    gap: 4px;
}

.vc-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: #64748b;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all .16s ease;
}

.vc-tab-btn:hover {
    color: #1e293b;
}

.vc-tab-btn.active {
    background: white;
    color: var(--accent);
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

.vc-tab-btn svg {
    width: 16px;
    height: 16px;
}

.vc-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.vc-add-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(var(--accent-rgb),.3);
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
    margin: 20px 0 18px;
    flex-wrap: wrap;
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

/* Table styles */
.vc-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
    background: white;
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

.vc-badge-admin {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    background: #fef3c7;
    color: #92400e;
    font-size: 11px;
    font-weight: 700;
    margin-left: 6px;
    text-transform: uppercase;
    letter-spacing: .5px;
}

.vc-description {
    color: #71809b;
}

.vc-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.vc-perm-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #dcfce7;
}

.vc-perm-count-badge.super {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #dbeafe;
}

.vc-perm-count-badge svg {
    width: 13px;
    height: 13px;
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

.vc-icon-btn.permissions {
    background: #e0f2fe;
    color: #0369a1;
}

.vc-icon-btn.permissions:hover {
    background: #bae6fd;
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

/* Matrix View Styling */
.vc-matrix-container {
    background: white;
    border-radius: 16px;
    border: 1px solid #eef1f7;
    overflow: hidden;
}

.vc-matrix-toolbar {
    padding: 16px 20px;
    border-bottom: 1px solid #eef1f7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: #fcfdfe;
    flex-wrap: wrap;
}

.vc-matrix-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.vc-select-filter {
    height: 38px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    font-size: 13.5px;
    color: #1e293b;
    background: white;
    outline: none;
    cursor: pointer;
}

.vc-select-filter:focus {
    border-color: var(--accent);
}

.vc-matrix-table-wrap {
    max-height: 720px;
    overflow: auto;
    position: relative;
}

.vc-matrix-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13.5px;
}

.vc-matrix-table th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 14px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    color: #475569;
    white-space: nowrap;
}

.vc-matrix-table th.col-capability {
    left: 0;
    z-index: 20;
    background: #f8fafc;
    width: 340px;
    min-width: 300px;
}

.vc-matrix-table th.col-role {
    text-align: center;
    min-width: 120px;
    border-left: 1px solid #f1f5f9;
}

.vc-matrix-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    border-left: 1px solid #f1f5f9;
    vertical-align: middle;
}

.vc-matrix-table td.col-capability {
    position: sticky;
    left: 0;
    z-index: 5;
    background: white;
    border-left: none;
}

.vc-matrix-table tr:hover td {
    background-color: #f8fafc;
}

.vc-matrix-table tr:hover td.col-capability {
    background-color: #f8fafc;
}

.vc-matrix-subsystem-row td {
    background: #f1f5f9 !important;
    font-weight: 700;
    color: #1e293b;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 10px 16px;
    border-top: 1px solid #e2e8f0;
}

.vc-matrix-subsystem-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.vc-matrix-subsystem-header svg {
    width: 16px;
    height: 16px;
    color: var(--accent);
}

.vc-matrix-check-cell {
    text-align: center;
    cursor: pointer;
}

.vc-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1.5px solid #cbd5e1;
    cursor: pointer;
    accent-color: var(--accent);
}

.vc-checkbox:disabled {
    cursor: not-allowed;
    opacity: .6;
}

.vc-cap-title {
    font-weight: 600;
    color: #1e293b;
    display: block;
    margin-bottom: 2px;
}

.vc-cap-desc {
    font-size: 11.5px;
    color: #64748b;
    display: block;
    line-height: 1.35;
}

.vc-cap-code {
    display: inline-block;
    margin-top: 2px;
    font-size: 10px;
    font-family: monospace;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
}

/* Permissions Modal (Role Specific) */
.vc-modal-wide {
    width: 900px;
    max-width: 94vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    padding: 0;
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.vc-modal-head {
    padding: 22px 28px 18px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.vc-modal-head-title {
    display: flex;
    align-items: center;
    gap: 14px;
}

.vc-modal-head-title h2 {
    margin: 0;
    font-size: 20px;
    color: #0f172a;
}

.vc-modal-head-title p {
    margin: 3px 0 0;
    font-size: 13px;
    color: #64748b;
}

.vc-modal-search-bar {
    padding: 12px 28px;
    border-bottom: 1px solid #eef1f7;
    background: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.vc-modal-body-scroll {
    padding: 24px 28px;
    overflow-y: auto;
    flex: 1;
}

.vc-subsystem-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    margin-bottom: 18px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,.02);
}

.vc-subsystem-head {
    padding: 14px 18px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.vc-subsystem-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.vc-subsystem-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--accent-light);
    color: var(--accent-text);
    display: flex;
    align-items: center;
    justify-content: center;
}

.vc-subsystem-icon svg {
    width: 17px;
    height: 17px;
}

.vc-subsystem-title {
    font-size: 14.5px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.vc-subsystem-meta {
    font-size: 12px;
    color: #64748b;
    margin: 2px 0 0;
}

.vc-subsystem-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.vc-badge-counter {
    padding: 3px 9px;
    border-radius: 999px;
    background: #e2e8f0;
    font-size: 11.5px;
    font-weight: 700;
    color: #475569;
}

.vc-btn-ghost-toggle {
    background: transparent;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all .14s;
}

.vc-btn-ghost-toggle:hover {
    background: #f1f5f9;
    color: #0f172a;
}

.vc-cap-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 10px;
    padding: 14px 18px;
}

.vc-cap-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #f1f5f9;
    background: #fcfdfe;
    cursor: pointer;
    transition: all .12s ease;
}

.vc-cap-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.vc-cap-item.active {
    background: #f0fdf4;
    border-color: #bbf7d0;
}

.vc-cap-item input[type="checkbox"] {
    margin-top: 3px;
    width: 17px;
    height: 17px;
    cursor: pointer;
    accent-color: var(--accent);
}

.vc-cap-text {
    flex: 1;
}

.vc-modal-foot {
    padding: 16px 28px;
    background: #f8fafc;
    border-top: 1px solid #eef1f7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.vc-badge-total {
    font-size: 13.5px;
    font-weight: 600;
    color: #475569;
}

.vc-foot-buttons {
    display: flex;
    align-items: center;
    gap: 10px;
}

@media (max-width: 768px) {
    .vc-header { flex-direction: column; }
    .vc-header-actions { width: 100%; justify-content: space-between; }
    .vc-toolbar { flex-direction: column; align-items: stretch; }
    .vc-search-wrap { max-width: none; }
    .vc-cap-grid { grid-template-columns: 1fr; }
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
                    <h1>Role-Based Access Control (RBAC)</h1>
                    <p class="form-subtitle">Configure granular subsystem capabilities and permissions dynamically across all 10 enterprise hospital modules.</p>
                </div>
            </div>
            <div class="vc-header-actions">
                <div class="vc-tab-nav" role="tablist">
                    <button type="button" class="vc-tab-btn active" id="tabBtnDirectory" role="tab" aria-selected="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Role Directory
                    </button>
                    <button type="button" class="vc-tab-btn" id="tabBtnMatrix" role="tab" aria-selected="false">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                        Capability Matrix Grid
                    </button>
                </div>
                <button type="button" class="vc-add-btn" id="openAddRoleModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                    Create Role
                </button>
            </div>
        </div>

        <!-- VIEW 1: ROLE DIRECTORY -->
        <div id="viewDirectory">
            <div class="vc-toolbar">
                <span class="vc-stat-pill" id="roleCountPill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
                    <span id="roleCountText">0 roles</span>
                </span>
                <div class="vc-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" class="vc-search-input" id="roleSearch" placeholder="Search roles or descriptions...">
                    <button type="button" class="vc-search-clear" id="roleSearchClear" aria-label="Clear search">&times;</button>
                </div>
            </div>

            <div class="vc-table-wrap">
                <table class="vc-table">
                    <thead>
                        <tr>
                            <th style="width: 250px;">Role Name</th>
                            <th>Description</th>
                            <th style="width: 200px;">Granted Capabilities</th>
                            <th style="text-align: right; width: 260px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="rolesTableBody">
                        <tr class="vc-skeleton-row"><td colspan="4"><div class="vc-skeleton-bar" style="width: 60%;"></div></td></tr>
                        <tr class="vc-skeleton-row"><td colspan="4"><div class="vc-skeleton-bar" style="width: 45%;"></div></td></tr>
                        <tr class="vc-skeleton-row"><td colspan="4"><div class="vc-skeleton-bar" style="width: 70%;"></div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- VIEW 2: INTERACTIVE MATRIX GRID -->
        <div id="viewMatrix" style="display: none;">
            <div class="vc-matrix-container">
                <div class="vc-matrix-toolbar">
                    <div class="vc-matrix-filters">
                        <select class="vc-select-filter" id="matrixSubsystemFilter">
                            <option value="">All Subsystems (10)</option>
                            <option value="admin">1. System Admin & Security</option>
                            <option value="pas">2. PAS & Bed Management</option>
                            <option value="clinical_ehr">3. Clinical EHR & Documentation</option>
                            <option value="pharmacy">4. Pharmacy & Medication</option>
                            <option value="diagnostics">5. Diagnostics & Lab/Rad</option>
                            <option value="billing">6. Billing & Revenue Cycle</option>
                            <option value="hr">7. HR & Workforce Roster</option>
                            <option value="supply_chain">8. Supply Chain & Equipment</option>
                            <option value="analytics">9. Analytics & Compliance</option>
                            <option value="doctor_portal">10. Doctor Portal & Workspace</option>
                        </select>
                        <div class="vc-search-wrap" style="max-width: 260px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                            <input type="text" class="vc-search-input" id="matrixSearch" placeholder="Filter capabilities...">
                        </div>
                    </div>
                    <div>
                        <button type="button" class="vc-add-btn" id="matrixSaveAllBtn" style="background: linear-gradient(90deg, #10b981, #059669); box-shadow: 0 4px 14px rgba(16,185,129,.3);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            Save Matrix Changes
                        </button>
                    </div>
                </div>

                <div class="vc-matrix-table-wrap" id="matrixTableScroll">
                    <table class="vc-matrix-table" id="matrixTable">
                        <thead id="matrixHead">
                            <!-- Populated dynamically: Capability col + Role cols -->
                        </thead>
                        <tbody id="matrixBody">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </div>
</div>

<!-- MODAL: ADD / EDIT ROLE BASIC INFO -->
<div class="modal-overlay" id="roleModalOverlay">
    <div class="modal-box">
        <div class="vc-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="roleModalTitle">Add Role</h2>
            <button type="button" class="modal-close" id="closeRoleModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a role name used to categorize staff and control access levels.</p>

        <div id="formAlert"></div>

        <form id="roleForm">
            <input type="hidden" id="role_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Role Identifier / Name</label>
                    <input id="name" class="form-input" placeholder="e.g. triage_nurse">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="e.g. Handles emergency intake and triage assessments">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelRole">Cancel</button>
                <button class="login-btn" type="submit" id="saveRoleBtn">Save Role</button>
            </div>
        </form>
    </div>
</div>

<!-- MODAL: ROLE PERMISSIONS CAPABILITY EDITOR -->
<div class="modal-overlay" id="permissionsModalOverlay">
    <div class="vc-modal-wide">
        <div class="vc-modal-head">
            <div class="vc-modal-head-title">
                <div class="vc-icon-badge" style="width: 42px; height: 42px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div>
                    <h2 id="permModalRoleName">Permissions: Doctor</h2>
                    <p id="permModalRoleDesc">Configure granular subsystem capabilities granted to this role</p>
                </div>
            </div>
            <button type="button" class="modal-close" id="closePermModal">&times;</button>
        </div>

        <div class="vc-modal-search-bar">
            <div class="vc-search-wrap" style="max-width: 320px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="vc-search-input" id="permSearchInput" placeholder="Filter capabilities...">
            </div>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="vc-btn-ghost-toggle" id="btnSelectAllCaps">Select All</button>
                <button type="button" class="vc-btn-ghost-toggle" id="btnClearAllCaps">Clear All</button>
            </div>
        </div>

        <div class="vc-modal-body-scroll" id="permSubsystemsContainer">
            <!-- Dynamic 10 subsystem cards -->
        </div>

        <div class="vc-modal-foot">
            <div class="vc-badge-total" id="permTotalSelectedText">
                0 of 53 capabilities selected
            </div>
            <div class="vc-foot-buttons">
                <button type="button" class="btn-secondary" id="cancelPermModal">Cancel</button>
                <button type="button" class="vc-add-btn" id="saveRolePermsBtn" style="background: linear-gradient(90deg, #10b981, #059669); box-shadow: 0 4px 14px rgba(16,185,129,.3);">
                    Save Permissions
                </button>
            </div>
        </div>
    </div>
</div>
`;
}
