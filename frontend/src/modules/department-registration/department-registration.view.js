export function DepartmentRegistrationView() {
    return `
<style>
.dept-page {
    width: 100%;
}

.dept-card {
    width: 100%;
}

.dept-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.dept-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.dept-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb), .28);
}

.dept-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.dept-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

:root[data-theme="dark"] .dept-header h1 {
    color: var(--text-primary);
}

.dept-header .form-subtitle {
    margin: 0;
    max-width: 580px;
}

.dept-add-btn {
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
    box-shadow: 0 10px 24px rgba(var(--accent-rgb), .24);
    transition: .18s;
    white-space: nowrap;
}

.dept-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb), .3);
}

.dept-add-btn svg {
    width: 16px;
    height: 16px;
}

/* KPI Stat Cards Bar */
.dept-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin: 22px 0 20px;
}

.dept-stat-card {
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: transform .15s, box-shadow .15s;
}

.dept-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.04);
}

.dept-stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.dept-stat-icon svg {
    width: 20px;
    height: 20px;
}

.dept-stat-icon.total { background: var(--accent-light); color: var(--accent); }
.dept-stat-icon.active { background: #ecfdf5; color: #10b981; }
.dept-stat-icon.clinical { background: #f5f3ff; color: #8b5cf6; }
.dept-stat-icon.staff { background: #fffbeb; color: #f59e0b; }

.dept-stat-info {
    display: flex;
    flex-direction: column;
}

.dept-stat-val {
    font-size: 20px;
    font-weight: 700;
    color: #1a2338;
    line-height: 1.2;
}

.dept-stat-lbl {
    font-size: 11.5px;
    font-weight: 600;
    color: #71809b;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: .3px;
}

/* Toolbar & Filters */
.dept-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 10px 0 20px;
    flex-wrap: wrap;
}

.dept-filters-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex: 1;
}

.dept-search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 320px;
}

.dept-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.dept-search-input {
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

.dept-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb), .1);
}

.dept-search-clear {
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

.dept-search-clear.show {
    display: flex;
}

.dept-select-filter {
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13px;
    color: #24324a;
    background: #fbfcfe;
    cursor: pointer;
    transition: .15s;
}

.dept-select-filter:focus {
    border-color: var(--accent);
    background: white;
}

.dept-view-toggles {
    display: flex;
    align-items: center;
    gap: 6px;
}

.dept-view-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #fbfcfe;
    color: #71809b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: .15s;
}

.dept-view-btn.active, .dept-view-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
}

.dept-view-btn svg {
    width: 18px;
    height: 18px;
}

/* Table Design */
.dept-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
    background: white;
}

.dept-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.dept-table th {
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

.dept-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.dept-table tbody tr:last-child td {
    border-bottom: none;
}

.dept-table tbody tr:hover {
    background: #fafbff;
}

.dept-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
}

.dept-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.dept-name-title {
    font-weight: 600;
    color: #1a2338;
}

.dept-code-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-light);
    padding: 1px 6px;
    border-radius: 4px;
    display: inline-block;
    width: fit-content;
    margin-top: 2px;
}

/* Badges */
.dept-pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.dept-pill-badge.active { background: #dcfce7; color: #15803d; }
.dept-pill-badge.inactive { background: #f1f5f9; color: #64748b; }
.dept-pill-badge.maintenance { background: #fef3c7; color: #b45309; }

.dept-pill-badge.clinical { background: #f5f3ff; color: #6d28d9; }
.dept-pill-badge.emergency { background: #fee2e2; color: #b91c1c; }
.dept-pill-badge.diagnostic { background: #e0f2fe; color: #0369a1; }
.dept-pill-badge.support { background: #f1f5f9; color: #475569; }

.dept-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
}

.dept-btn-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: .15s;
}

.dept-btn-icon:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-light);
}

.dept-btn-icon.delete:hover {
    color: #dc2626;
    border-color: #fca5a5;
    background: #fef2f2;
}

.dept-btn-icon svg {
    width: 15px;
    height: 15px;
}

/* Cards Grid Alternative */
.dept-grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
}

.dept-card-item {
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform .15s, box-shadow .15s;
}

.dept-card-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.04);
}

/* Modals */
.dept-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.dept-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.dept-section {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #e5e9f2;
}

.dept-section:first-of-type {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
}

.dept-section-label {
    font-size: 13.5px;
    font-weight: 700;
    color: #1a2338;
    margin: 0 0 2px;
}

:root[data-theme="dark"] .dept-section-label {
    color: var(--text-primary);
}

.dept-section-desc {
    font-size: 12px;
    color: #8792a6;
    margin: 0 0 14px;
}

.dept-info-textarea {
    width: 100%;
    min-height: 80px;
    padding: 10px 13px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    font-family: inherit;
    color: #24324a;
    background: #fbfcfe;
    resize: vertical;
    transition: .15s;
}

.dept-info-textarea:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb), .1);
}

/* Responsive */
@media (max-width: 640px) {
    .dept-header { flex-direction: column; }
    .dept-add-btn { width: 100%; justify-content: center; }
    .dept-toolbar { flex-direction: column; align-items: stretch; }
    .dept-search-wrap { max-width: none; }
}
</style>

<div class="dept-page">
    <div class="dept-card">
        <!-- Header -->
        <div class="dept-header">
            <div class="dept-header-title">
                <div class="dept-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                        <path d="M3 9h18"></path>
                        <path d="M9 21V9"></path>
                    </svg>
                </div>
                <div>
                    <h1>Department Registration</h1>
                    <p class="form-subtitle">Register and oversee hospital departments, clinical wings, head of departments, and staff allocation.</p>
                </div>
            </div>
            <button type="button" class="dept-add-btn" id="deptOpenCreateBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                Create Department
            </button>
        </div>

        <!-- KPI Summary Cards -->
        <div class="dept-stats-grid">
            <div class="dept-stat-card">
                <div class="dept-stat-icon total">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path>
                    </svg>
                </div>
                <div class="dept-stat-info">
                    <span class="dept-stat-val" id="statTotalDepts">--</span>
                    <span class="dept-stat-lbl">Total Departments</span>
                </div>
            </div>
            <div class="dept-stat-card">
                <div class="dept-stat-icon active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <div class="dept-stat-info">
                    <span class="dept-stat-val" id="statActiveDepts">--</span>
                    <span class="dept-stat-lbl">Active &amp; Operational</span>
                </div>
            </div>
            <div class="dept-stat-card">
                <div class="dept-stat-icon clinical">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                    </svg>
                </div>
                <div class="dept-stat-info">
                    <span class="dept-stat-val" id="statClinicalDepts">--</span>
                    <span class="dept-stat-lbl">Clinical &amp; Inpatient</span>
                </div>
            </div>
            <div class="dept-stat-card">
                <div class="dept-stat-icon staff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="dept-stat-info">
                    <span class="dept-stat-val" id="statAssignedStaff">--</span>
                    <span class="dept-stat-lbl">Assigned Personnel</span>
                </div>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="dept-toolbar">
            <div class="dept-filters-left">
                <div class="dept-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="7"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                    <input type="text" class="dept-search-input" id="deptSearchInput" placeholder="Search departments...">
                    <button type="button" class="dept-search-clear" id="deptSearchClear" aria-label="Clear search">&times;</button>
                </div>

                <select class="dept-select-filter" id="deptTypeFilter">
                    <option value="all">All Classifications</option>
                    <option value="Clinical">Clinical</option>
                    <option value="Inpatient">Inpatient</option>
                    <option value="Outpatient">Outpatient</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Support Services">Support Services</option>
                </select>

                <select class="dept-select-filter" id="deptStatusFilter">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                </select>

                <select class="dept-select-filter" id="deptFacilityFilter">
                    <option value="all">All Facilities</option>
                </select>
            </div>

            <div class="dept-view-toggles">
                <button type="button" class="dept-view-btn active" id="deptViewTableBtn" title="Table View">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"></path>
                    </svg>
                </button>
                <button type="button" class="dept-view-btn" id="deptViewGridBtn" title="Cards Grid View">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                        <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                        <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                        <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Table View -->
        <div class="dept-table-wrap" id="deptTableView">
            <table class="dept-table">
                <thead>
                    <tr>
                        <th>Department</th>
                        <th>Classification</th>
                        <th>Facility &amp; Location</th>
                        <th>Head of Department</th>
                        <th>Hours &amp; Contact</th>
                        <th>Staff Count</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="deptTableBody">
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 32px; color: #71809b;">Loading departments...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Grid View -->
        <div class="dept-grid-container" id="deptGridView" style="display: none;"></div>
    </div>
</div>

<!-- =========================================================================
     MODAL: Register / Edit Department (Standard App Modal Design)
     ========================================================================= -->
<div class="modal-overlay" id="deptFormModal">
    <div class="modal-box" style="max-width: 820px;">
        <div class="dept-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M3 9h18M9 21V9"></path>
            </svg>
        </div>
        <div class="modal-header">
            <h2 id="deptModalTitle">Add Department</h2>
            <button type="button" class="modal-close" id="deptCloseFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Register and configure department resources, operational hours, and facility assignments.</p>

        <div id="deptFormAlert"></div>

        <form id="departmentForm">
            <input type="hidden" id="dept_id" name="id">

            <div class="dept-section">
                <p class="dept-section-label">General Information</p>
                <p class="dept-section-desc">Department identity, shorthand code, and medical classification.</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Department Name <span style="color:#ef4444;">*</span></label>
                        <input id="dept_name" class="form-input" placeholder="e.g. Cardiology &amp; Vascular Wing" required>
                        <span class="form-error" id="err-dept_name"></span>
                    </div>
                    <div class="form-group">
                        <label>Department Code (Abbreviation)</label>
                        <input id="dept_code" class="form-input" placeholder="e.g. CARD (Auto-generated if blank)">
                        <span class="form-error" id="err-dept_code"></span>
                    </div>
                    <div class="form-group">
                        <label>Classification <span style="color:#ef4444;">*</span></label>
                        <select id="dept_type" class="form-input" required>
                            <option value="Clinical">Clinical</option>
                            <option value="Inpatient">Inpatient</option>
                            <option value="Outpatient">Outpatient</option>
                            <option value="Emergency">Emergency</option>
                            <option value="Surgical">Surgical</option>
                            <option value="Diagnostic">Diagnostic</option>
                            <option value="Laboratory">Laboratory</option>
                            <option value="Administrative">Administrative</option>
                            <option value="Support Services">Support Services</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Operating Status <span style="color:#ef4444;">*</span></label>
                        <select id="dept_status" class="form-input" required>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="dept-section">
                <p class="dept-section-label">Facility &amp; Leadership</p>
                <p class="dept-section-desc">Campus location and appointed Head of Department.</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Facility / Campus</label>
                        <select id="dept_facility" class="form-input">
                            <option value="">-- Main Facility / General --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Head of Department (HOD)</label>
                        <select id="dept_head" class="form-input">
                            <option value="">-- Select Assigned HOD --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Physical Location / Floor / Wing</label>
                        <input id="dept_location" class="form-input" placeholder="e.g. Building A, 3rd Floor, Suite 300">
                    </div>
                    <div class="form-group">
                        <label>Operating Hours</label>
                        <input id="dept_hours" class="form-input" placeholder="e.g. 24/7 or Mon-Fri 8:00 AM - 5:00 PM">
                    </div>
                </div>
            </div>

            <div class="dept-section">
                <p class="dept-section-label">Contact &amp; Overview</p>
                <p class="dept-section-desc">Department communication channels and operational description.</p>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Contact Phone / Extension</label>
                        <input id="dept_phone" class="form-input" placeholder="e.g. +1 (555) 234-5678 ext. 102">
                    </div>
                    <div class="form-group">
                        <label>Department Email</label>
                        <input id="dept_email" class="form-input" type="email" placeholder="e.g. cardiology@hospital.org">
                    </div>
                    <div class="form-group full">
                        <label>Operational Scope / Notes</label>
                        <textarea id="dept_description" class="dept-info-textarea" placeholder="Brief description of department scope, clinical capabilities, and equipment..."></textarea>
                    </div>
                </div>
            </div>

            <div class="form-actions" style="margin-top: 24px;">
                <button type="button" class="btn-secondary" id="deptCancelFormBtn">Cancel</button>
                <button class="login-btn" type="submit" id="deptSaveBtn">Save Department</button>
            </div>
        </form>
    </div>
</div>

<!-- =========================================================================
     MODAL: Department Staff Roster
     ========================================================================= -->
<div class="modal-overlay" id="deptStaffModal">
    <div class="modal-box" style="max-width: 820px;">
        <div class="dept-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        </div>
        <div class="modal-header">
            <h2 id="deptStaffModalTitle">Personnel Roster</h2>
            <button type="button" class="modal-close" id="deptCloseStaffModal">&times;</button>
        </div>
        <p class="form-subtitle">Personnel currently assigned to this department and their HIPAA compliance credentials.</p>

        <div style="margin-top: 18px; border: 1px solid #eef1f7; border-radius: 12px; overflow: hidden;">
            <table class="dept-table">
                <thead>
                    <tr>
                        <th>Employee No.</th>
                        <th>Staff Member</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>HIPAA Status</th>
                    </tr>
                </thead>
                <tbody id="deptStaffTableBody">
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 24px; color: #71809b;">Loading roster...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="form-actions" style="margin-top: 24px;">
            <button type="button" class="btn-secondary" id="deptCloseStaffBtn">Close</button>
        </div>
    </div>
</div>
    `;
}
