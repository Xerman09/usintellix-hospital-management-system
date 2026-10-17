export function AddEmployeeView()
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

.vc-table-wrap {
    background: white;
    border-radius: 14px;
    border: 1px solid #eef1f7;
    overflow-x: auto;
    box-shadow: 0 2px 8px rgba(18,38,63,.03);
}

.vc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.vc-table th {
    text-align: left;
    padding: 14px 18px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.vc-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
}

.vc-table tr:hover td {
    background: #fcfdfe;
}

.vc-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.vc-avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.vc-name {
    font-weight: 600;
    color: #1e293b;
}

.vc-subtext {
    color: #64748b;
    font-size: 12px;
}

.vc-role-pill {
    display: inline-flex;
    padding: 3px 9px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #334155;
    font-size: 11.5px;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
}

.vc-dept-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #dbeafe;
}

.vc-duty-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .4px;
}

.duty-primary { background: #e0e7ff; color: #3730a3; }
.duty-on_call { background: #fef3c7; color: #92400e; }
.duty-floater { background: #fae8ff; color: #86198f; }
.duty-consultant { background: #dcfce7; color: #166534; }
.duty-attending { background: #cffafe; color: #155e75; }
.duty-resident { background: #f1f5f9; color: #475569; }

.vc-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
}

.status-active { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.status-suspended { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.status-locked { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.status-decommissioned { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

.vc-session-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    background: #f8fafc;
    color: #475569;
    border: 1px solid #cbd5e1;
    cursor: pointer;
    transition: .15s;
    margin-top: 4px;
}

.vc-session-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
}

.vc-session-btn.has-active {
    background: #f0fdf4;
    color: #166534;
    border-color: #86efac;
}

.vc-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
}

.vc-btn-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 9px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: .15s;
}

.vc-btn-edit { background: var(--accent-lighter); color: var(--accent-text); border-color: var(--accent-border); }
.vc-btn-edit:hover { background: var(--accent-border); }

.vc-btn-status { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
.vc-btn-status:hover { background: #e2e8f0; color: #0f172a; }

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

.vc-form-hint {
    margin: -10px 0 14px;
    font-size: 12px;
    color: #71809b;
}

.section-divider {
    grid-column: 1 / -1;
    margin-top: 10px;
    border-top: 1px dashed #cbd5e1;
    padding-top: 14px;
}

.section-title {
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
}

.section-subtitle {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div>
                    <h1>Employee Management</h1>
                    <p class="form-subtitle">Create login accounts, assign clinical departments and duty tags, manage account lifecycle & active sessions.</p>
                </div>
            </div>
            <button type="button" class="vc-add-btn" id="openAddEmployeeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Employee
            </button>
        </div>

        <div class="vc-toolbar">
            <span class="vc-stat-pill" id="employeeCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                <span id="employeeCountText">0 employees</span>
            </span>
            <div class="vc-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="vc-search-input" id="employeeSearch" placeholder="Search by name, employee no, email...">
                <button type="button" class="vc-search-clear" id="employeeSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="vc-table-wrap">
            <table class="vc-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Username & Role</th>
                        <th>Clinical Department Mapping</th>
                        <th>Contact</th>
                        <th>Account Status & Sessions</th>
                        <th>HIPAA Training</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="employeesTableBody">
                    <tr class="vc-skeleton-row"><td colspan="7"><div class="vc-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="7"><div class="vc-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="vc-skeleton-row"><td colspan="7"><div class="vc-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- ADD / EDIT EMPLOYEE MODAL                  -->
<!-- ========================================== -->
<div class="modal-overlay" id="employeeModalOverlay">
    <div class="modal-box" style="max-width: 720px;">
        <div class="modal-header">
            <h2 id="employeeModalTitle">Add Employee</h2>
            <button type="button" class="modal-close" id="closeEmployeeModal">&times;</button>
        </div>
        <p class="form-subtitle" id="employeeModalSubtitle">Create or update employee profile, clinical units, and access status.</p>

        <div id="formAlert"></div>

        <form id="addEmployeeForm">
            <input type="hidden" id="employee_id">
            <div class="form-grid">
                <!-- User Credentials -->
                <div class="form-group full">
                    <div class="section-title" style="color: var(--accent);">
                        <i class="fa-solid fa-user-lock"></i>
                        <span>Account Credentials & Role</span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Username</label>
                    <input id="username" class="form-input" placeholder="e.g. juan.delacruz">
                    <span class="form-error" id="err-username"></span>
                </div>

                <div class="form-group">
                    <label>Role</label>
                    <select id="role_id" class="form-input">
                        <option value="">Select role</option>
                    </select>
                    <span class="form-error" id="err-role_id"></span>
                </div>

                <div class="form-group full">
                    <label>Password</label>
                    <input id="password" type="password" class="form-input" placeholder="••••••••">
                    <span class="form-error" id="err-password"></span>
                    <span class="vc-form-hint" id="passwordHint" style="display:none;">Leave blank to preserve existing password.</span>
                </div>

                <!-- Account Lifecycle Status -->
                <div class="form-group">
                    <label>Account Lifecycle Status</label>
                    <select id="status" class="form-input">
                        <option value="active">Active (Full Access Authorized)</option>
                        <option value="suspended">Suspended (Access Temporarily Blocked)</option>
                        <option value="locked">Locked (Administrative Lockout)</option>
                        <option value="decommissioned">Decommissioned (Offboarded / Terminated)</option>
                    </select>
                    <span class="form-error" id="err-status"></span>
                </div>

                <div class="form-group">
                    <label>Status Transition Reason</label>
                    <input id="status_reason" class="form-input" placeholder="e.g. Administrative review, Resigned, Sabbatical">
                    <span class="form-error" id="err-status_reason"></span>
                </div>

                <!-- Department & Clinical Unit Mapping -->
                <div class="section-divider">
                    <div class="section-title" style="color: #0284c7;">
                        <i class="fa-solid fa-hospital-user"></i>
                        <span>Department & Clinical Unit Assignment</span>
                    </div>
                    <div class="section-subtitle">
                        Bind employee to primary unit and secondary duty tags (e.g. ICU, Emergency, Surgery, Pediatrics).
                    </div>
                </div>

                <div class="form-group">
                    <label>Primary Medical Department <span style="color:#ef4444;">*</span></label>
                    <select id="department_id" class="form-input">
                        <option value="">Select primary unit</option>
                    </select>
                    <span class="form-error" id="err-department_id"></span>
                </div>

                <div class="form-group">
                    <label>Secondary Department (Optional)</label>
                    <select id="secondary_department_id" class="form-input">
                        <option value="">None / Single Department</option>
                    </select>
                    <span class="form-error" id="err-secondary_department_id"></span>
                </div>

                <div class="form-group">
                    <label>Clinical Duty Tag</label>
                    <select id="duty_tag" class="form-input">
                        <option value="primary">Primary Staff (Regular Unit Duty)</option>
                        <option value="on_call">On-Call Specialist / Consultant</option>
                        <option value="floater">Floater / Cross-Cover Nurse</option>
                        <option value="attending">Attending Physician</option>
                        <option value="resident">Resident / Fellow</option>
                        <option value="consultant">Visiting Consultant</option>
                    </select>
                    <span class="form-error" id="err-duty_tag"></span>
                </div>

                <div class="form-group">
                    <label>Duty Assignment Notes</label>
                    <input id="assignment_notes" class="form-input" placeholder="e.g. Assigned to Trauma ICU on weekdays; On-call for ER">
                </div>

                <!-- Personal & Demographics -->
                <div class="section-divider">
                    <div class="section-title" style="color: #334155;">
                        <i class="fa-solid fa-id-card"></i>
                        <span>Staff Demographics & Contact</span>
                    </div>
                </div>

                <div class="form-group">
                    <label>First Name</label>
                    <input id="first_name" class="form-input" placeholder="First name">
                    <span class="form-error" id="err-first_name"></span>
                </div>

                <div class="form-group">
                    <label>Middle Name</label>
                    <input id="middle_name" class="form-input" placeholder="Middle name (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Last Name</label>
                    <input id="last_name" class="form-input" placeholder="Last name">
                    <span class="form-error" id="err-last_name"></span>
                </div>

                <div class="form-group">
                    <label>Suffix</label>
                    <input id="suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Sex</label>
                    <select id="sex" class="form-input">
                        <option value="">Select sex</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    <span class="form-error" id="err-sex"></span>
                </div>

                <div class="form-group">
                    <label>Birthdate</label>
                    <input id="birthdate" type="date" class="form-input">
                    <span class="form-error" id="err-birthdate"></span>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input id="email" type="email" class="form-input" placeholder="name@hospital.local">
                    <span class="form-error" id="err-email"></span>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input id="phone" class="form-input" placeholder="09XXXXXXXXX">
                    <span class="form-error" id="err-phone"></span>
                </div>

                <!-- HIPAA Training -->
                <div class="section-divider">
                    <div class="section-title" style="color: #4338ca;">
                        <i class="fa-solid fa-user-shield"></i>
                        <span>HIPAA Workforce Training Certification (45 CFR § 164.308(a)(5))</span>
                    </div>
                    <div class="section-subtitle">
                        Initial security training is mandatory within 30 days of hire, with annual refreshers thereafter.
                    </div>
                </div>

                <div class="form-group">
                    <label>Certification Status</label>
                    <select id="hipaa_training_status" class="form-input">
                        <option value="compliant">Compliant</option>
                        <option value="approaching_due">Approaching Due (&le;30d)</option>
                        <option value="overdue">Overdue</option>
                        <option value="exempt">Exempt</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Initial Training Date</label>
                    <input id="hipaa_initial_training_date" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>Last Refresher Date</label>
                    <input id="hipaa_last_refresher_date" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>Next Refresher Due Date</label>
                    <input id="hipaa_next_refresher_due" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>Training Score (%)</label>
                    <input id="hipaa_training_score" type="number" step="0.5" min="0" max="100" class="form-input" placeholder="e.g. 95.0">
                </div>

                <div class="form-group">
                    <label>Certificate Reference</label>
                    <input id="hipaa_cert_ref" class="form-input" placeholder="e.g. CERT-2026-0001">
                </div>
            </div>

            <div class="form-actions" style="margin-top: 24px;">
                <button type="button" class="btn-secondary" id="cancelEmployee">Cancel</button>
                <button class="login-btn" type="submit" id="saveEmployeeBtn">Create Employee</button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================== -->
<!-- ACTIVE SESSIONS & AUDIT MODAL              -->
<!-- ========================================== -->
<div class="modal-overlay" id="sessionHistoryModalOverlay">
    <div class="modal-box" style="max-width: 760px;">
        <div class="modal-header">
            <div>
                <h2 id="sessionModalEmployeeName" style="margin: 0; font-size: 19px; color: #0f172a;">Active Sessions & Login Audit</h2>
                <p id="sessionModalEmployeeDetails" style="margin: 4px 0 0; font-size: 13px; color: #64748b;"></p>
            </div>
            <button type="button" class="modal-close" id="closeSessionModal">&times;</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 10px; margin: 16px 0; border: 1px solid #e2e8f0;">
            <div style="font-size: 13px; color: #334155;">
                <span id="sessionSummaryActiveCount" style="font-weight: 700; color: #166534;">0 active</span> sessions currently authenticated across all devices.
            </div>
            <button type="button" id="revokeAllSessionsBtn" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                <i class="fa-solid fa-power-off"></i> Revoke All Sessions
            </button>
        </div>

        <div style="max-height: 380px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
            <table class="vc-table" style="font-size: 12.5px;">
                <thead>
                    <tr>
                        <th>Device / Client</th>
                        <th>IP Address</th>
                        <th>Login Time</th>
                        <th>Last Activity</th>
                        <th>Status</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody id="sessionHistoryTableBody">
                    <tr><td colspan="6" style="text-align: center; padding: 24px;">Loading session history...</td></tr>
                </tbody>
            </table>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
            <button type="button" class="btn-secondary" id="closeSessionModalFooterBtn">Close</button>
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- QUICK STATUS TRANSITION MODAL              -->
<!-- ========================================== -->
<div class="modal-overlay" id="quickStatusModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <div>
                <h2 style="margin: 0; font-size: 18px; color: #0f172a;">Account Lifecycle Transition</h2>
                <p id="quickStatusTargetUser" style="margin: 4px 0 0; font-size: 12.5px; color: #64748b;"></p>
            </div>
            <button type="button" class="modal-close" id="closeQuickStatusModal">&times;</button>
        </div>

        <form id="quickStatusForm" style="margin-top: 16px;">
            <input type="hidden" id="quickStatusUserId">

            <div class="form-group full" style="margin-bottom: 14px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">New Status</label>
                <select id="quickStatusSelect" class="form-input" style="width: 100%;">
                    <option value="active">Active (Authorize full system access)</option>
                    <option value="suspended">Suspended (Temporarily block access & revoke sessions)</option>
                    <option value="locked">Locked (Administrative lock)</option>
                    <option value="decommissioned">Decommissioned (Permanent offboarding / revoke sessions)</option>
                </select>
            </div>

            <div class="form-group full" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Audit Reason</label>
                <textarea id="quickStatusReason" class="form-input" rows="3" style="width: 100%; resize: vertical;" placeholder="Provide audit trail rationale for this status transition (HIPAA § 164.312 requirement)..."></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelQuickStatus">Cancel</button>
                <button class="login-btn" type="submit" id="saveQuickStatusBtn">Apply Transition</button>
            </div>
        </form>
    </div>
</div>
`;
}
