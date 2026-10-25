import { api } from "../../core/api.js?v=10";

// State
let state = {
    activeTab: "credentials", // "credentials" | "privileges" | "checker"
    credPage: 1,
    credPerPage: 15,
    credTypeFilter: "",
    credStatusFilter: "",
    credExpiringFilter: false,
    credSearch: "",
    privPage: 1,
    privPerPage: 15,
    privTierFilter: "",
    privStatusFilter: "",
    privSearch: "",
    checker: {
        employeeId: 102,
        procedure: "Laparoscopic Cholecystectomy",
        result: null
    }
};

let cache = {
    metrics: null,
    credentialsData: null,
    privilegesData: null,
    doctorsList: []
};

export function StaffCredentialsView() {
    return `<div class="sc-root" id="staffCredentialsRoot"><div class="sc-loading"><i class="fas fa-spinner fa-spin"></i> Loading Staff Credentials &amp; Clinical Privileges Registry...</div></div>`;
}

export async function initStaffCredentials() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("staffCredentialsRoot");
    if (!root) return;

    try {
        const [metRes, credRes, privRes] = await Promise.all([
            api("/staff-credentials/metrics").catch(() => null),
            api(`/staff-credentials?page=${state.credPage}&per_page=${state.credPerPage}&credential_type=${state.credTypeFilter}&verification_status=${state.credStatusFilter}&expiring_soon=${state.credExpiringFilter ? '1' : ''}&q=${encodeURIComponent(state.credSearch)}`).catch(() => null),
            api(`/clinical-privileges?page=${state.privPage}&per_page=${state.privPerPage}&tier=${state.privTierFilter}&status=${state.privStatusFilter}&q=${encodeURIComponent(state.privSearch)}`).catch(() => null)
        ]);

        cache.metrics = metRes?.data || {};
        cache.credentialsData = credRes?.data || { total: 0, records: [] };
        cache.privilegesData = privRes?.data || { total: 0, records: [] };

        // Build doctors list
        const docMap = new Map();
        (cache.privilegesData.records || []).forEach(p => {
            if (p.employee_id) docMap.set(p.employee_id, { id: p.employee_id, name: p.doctor_name, dept: p.department_name });
        });
        (cache.credentialsData.records || []).forEach(c => {
            if (c.employee_id && !docMap.has(c.employee_id)) {
                docMap.set(c.employee_id, { id: c.employee_id, name: c.staff_full_name, dept: c.department_name });
            }
        });

        cache.doctorsList = Array.from(docMap.values());
        if (cache.doctorsList.length === 0) {
            cache.doctorsList = [
                { id: 102, name: "Dr. Elena Rostova", dept: "Surgical Services" },
                { id: 103, name: "Dr. Jonathan Hayes", dept: "Cardiology" },
                { id: 104, name: "Dr. Arthur Sterling", dept: "Anesthesiology" },
                { id: 105, name: "Dr. Sarah Lin", dept: "Radiology" },
                { id: 108, name: "Dr. Christopher Nolan", dept: "Surgical Services" }
            ];
        }

        renderRoot();
    } catch (err) {
        console.error("Error loading staff credentials:", err);
        root.innerHTML = `
            <div class="sc-error-card">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Credentials Registry</h3>
                <p>${err.message || 'Server error'}</p>
                <button class="btn btn-primary" id="btnScRetry"><i class="fas fa-redo"></i> Retry</button>
            </div>
        `;
        document.getElementById("btnScRetry")?.addEventListener("click", () => initStaffCredentials());
    }
}

function renderRoot() {
    const root = document.getElementById("staffCredentialsRoot");
    if (!root) return;

    const m = cache.metrics || {};
    const totalCreds = m.total_credentials || 0;
    const verifiedCreds = m.verified_credentials || 0;
    const expiringSoon = m.expiring_soon_60d || 0;
    const totalGrants = m.total_privilege_grants || 0;
    const fullTier = m.full_privilege_count || 0;
    const provTier = m.provisional_privilege_count || 0;
    const totalProcs = m.total_authorized_procedures || 0;

    root.innerHTML = `
        <div class="sc-container">
            <!-- Header -->
            <header class="sc-header">
                <div>
                    <div class="sc-title-row">
                        <span class="sc-badge-tag"><i class="fas fa-user-shield"></i> Medical Governance &amp; Credentialing</span>
                        <h1>Hospital Clinical Privileges &amp; Credentials Registry</h1>
                    </div>
                    <p class="sc-sub">Medical/Nursing Licensure, Specialty Board Certifications, Clinical Privilege Tiers, and Real-Time Procedural Scope Verification.</p>
                </div>
                <div class="sc-actions">
                    <button class="btn btn-outline" id="btnScSeedDemo"><i class="fas fa-magic"></i> Seed Realistic Registry Data</button>
                    <button class="btn btn-outline" id="btnScCheckerNav"><i class="fas fa-check-double"></i> Procedure Safety Check</button>
                    <button class="btn btn-primary" id="btnScNewPrivilege"><i class="fas fa-award"></i> Grant Clinical Privileges</button>
                    <button class="btn btn-outline" id="btnScNewCred"><i class="fas fa-plus"></i> Register Credential</button>
                </div>
            </header>

            <!-- Metrics Strip -->
            <div class="sc-kpi-grid">
                <div class="sc-kpi-card">
                    <span class="sc-kpi-label"><i class="fas fa-id-card"></i> Registered Credentials</span>
                    <span class="sc-kpi-val">${totalCreds}</span>
                    <span class="sc-kpi-sub">${verifiedCreds} Primary Source Verified</span>
                </div>
                <div class="sc-kpi-card ${expiringSoon > 0 ? 'warning' : ''}">
                    <span class="sc-kpi-label"><i class="fas fa-hourglass-half"></i> Expiring Soon (&lt;60 Days)</span>
                    <span class="sc-kpi-val ${expiringSoon > 0 ? 'text-amber' : ''}">${expiringSoon}</span>
                    <span class="sc-kpi-sub">Requires Re-Credentialing</span>
                </div>
                <div class="sc-kpi-card">
                    <span class="sc-kpi-label"><i class="fas fa-hospital-user"></i> Active Privilege Grants</span>
                    <span class="sc-kpi-val text-blue">${totalGrants}</span>
                    <span class="sc-kpi-sub">Across Medical Departments</span>
                </div>
                <div class="sc-kpi-card highlight">
                    <span class="sc-kpi-label"><i class="fas fa-user-check"></i> Full Independent Privileges</span>
                    <span class="sc-kpi-val text-emerald">${fullTier}</span>
                    <span class="sc-kpi-sub">Unrestricted Attending Staff</span>
                </div>
                <div class="sc-kpi-card">
                    <span class="sc-kpi-label"><i class="fas fa-user-clock"></i> Provisional / Proctored</span>
                    <span class="sc-kpi-val text-purple">${provTier}</span>
                    <span class="sc-kpi-sub">Supervised Practice Tier</span>
                </div>
                <div class="sc-kpi-card">
                    <span class="sc-kpi-label"><i class="fas fa-procedures"></i> Authorized Procedural Scopes</span>
                    <span class="sc-kpi-val text-indigo">${totalProcs}</span>
                    <span class="sc-kpi-sub">Active Surgical &amp; Bedside Privileges</span>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="sc-nav-tabs">
                <button class="sc-tab-btn ${state.activeTab === 'credentials' ? 'active' : ''}" data-tab="credentials">
                    <i class="fas fa-certificate"></i> Professional Credentials Directory (${totalCreds})
                </button>
                <button class="sc-tab-btn ${state.activeTab === 'privileges' ? 'active' : ''}" data-tab="privileges">
                    <i class="fas fa-hospital"></i> Clinical Privileges Registry (${totalGrants})
                </button>
                <button class="sc-tab-btn ${state.activeTab === 'checker' ? 'active' : ''}" data-tab="checker">
                    <i class="fas fa-check-double"></i> Real-Time Procedure Safety Checker
                </button>
            </div>

            <!-- Tab Content -->
            <div class="sc-tab-content" id="scTabContent">
                ${renderCurrentTab()}
            </div>
        </div>
    `;

    bindRootEvents();
}

function renderCurrentTab() {
    switch (state.activeTab) {
        case "credentials":
            return renderCredentialsTab();
        case "privileges":
            return renderPrivilegesTab();
        case "checker":
            return renderCheckerTab();
        default:
            return renderCredentialsTab();
    }
}

// -------------------------------------------------------------
// TAB 1: CREDENTIALS DIRECTORY
// -------------------------------------------------------------
function renderCredentialsTab() {
    const data = cache.credentialsData || { total: 0, records: [] };
    const records = data.records || [];

    return `
        <div class="sc-panel">
            <div class="sc-toolbar">
                <div class="sc-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="credSearchInput" placeholder="Search credential title, certificate #, issuing body, or physician..." value="${escapeHtml(state.credSearch)}">
                </div>
                <div class="sc-filter-group">
                    <select id="credTypeSelect" class="form-select">
                        <option value="">All Credential Types</option>
                        <option value="medical_license" ${state.credTypeFilter === 'medical_license' ? 'selected' : ''}>Medical Board License (PRC)</option>
                        <option value="nursing_license" ${state.credTypeFilter === 'nursing_license' ? 'selected' : ''}>Board of Nursing License</option>
                        <option value="specialty_board_cert" ${state.credTypeFilter === 'specialty_board_cert' ? 'selected' : ''}>Specialty Board Certification</option>
                        <option value="dea_narcotics_permit" ${state.credTypeFilter === 'dea_narcotics_permit' ? 'selected' : ''}>PDEA / DEA S2 Narcotics Permit</option>
                        <option value="subspecialty_fellowship" ${state.credTypeFilter === 'subspecialty_fellowship' ? 'selected' : ''}>Subspecialty Fellowship</option>
                        <option value="bls_acls_certification" ${state.credTypeFilter === 'bls_acls_certification' ? 'selected' : ''}>ACLS / BLS Certification</option>
                        <option value="malpractice_insurance" ${state.credTypeFilter === 'malpractice_insurance' ? 'selected' : ''}>Professional Malpractice Policy</option>
                    </select>
                    <select id="credStatusSelect" class="form-select">
                        <option value="">All Statuses</option>
                        <option value="verified" ${state.credStatusFilter === 'verified' ? 'selected' : ''}>Verified (PSV)</option>
                        <option value="pending_verification" ${state.credStatusFilter === 'pending_verification' ? 'selected' : ''}>Pending Verification</option>
                        <option value="expired" ${state.credStatusFilter === 'expired' ? 'selected' : ''}>Expired</option>
                    </select>
                    <label class="sc-checkbox-label">
                        <input type="checkbox" id="credExpiringCheckbox" ${state.credExpiringFilter ? 'checked' : ''}>
                        <span>Expiring Soon (&lt;60d)</span>
                    </label>
                    <button class="btn btn-outline" id="btnCredReset" title="Reset Filters"><i class="fas fa-undo"></i></button>
                </div>
            </div>

            <div class="sc-table-wrapper">
                <table class="sc-table">
                    <thead>
                        <tr>
                            <th>Physician / Staff Member</th>
                            <th>Credential Title &amp; Category</th>
                            <th>Issuing Regulatory Body</th>
                            <th>Certificate / License #</th>
                            <th>Issue Date</th>
                            <th>Expiry Date</th>
                            <th class="text-center">Verification Status</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr><td colspan="8" class="sc-empty-row"><i class="fas fa-folder-open"></i> No credentials found matching filters.</td></tr>
                        ` : records.map(c => renderCredentialRow(c)).join('')}
                    </tbody>
                </table>
            </div>

            <div class="sc-pagination">
                <span>Showing ${records.length} of ${data.total || 0} credentials</span>
                <div class="sc-page-btns">
                    <button class="btn btn-sm btn-outline" id="btnCredPrev" ${data.page <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Previous</button>
                    <span>Page ${data.page || 1} of ${data.total_pages || 1}</span>
                    <button class="btn btn-sm btn-outline" id="btnCredNext" ${data.page >= data.total_pages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `;
}

function renderCredentialRow(c) {
    const days = c.days_until_expiry !== null ? parseInt(c.days_until_expiry, 10) : null;
    let expiryHtml = c.expiry_date ? formatDate(c.expiry_date) : '<span class="text-muted">Lifetime / Indefinite</span>';

    if (days !== null) {
        if (days < 0) {
            expiryHtml += ` <span class="sc-pill sc-pill-rose">Expired</span>`;
        } else if (days <= 60) {
            expiryHtml += ` <span class="sc-pill sc-pill-amber" title="${days} days remaining"><i class="fas fa-clock"></i> ${days}d left</span>`;
        }
    }

    const isVerified = c.verification_status === 'verified';
    const statusPill = isVerified
        ? `<span class="sc-pill sc-pill-emerald"><i class="fas fa-check-circle"></i> Verified</span>`
        : `<span class="sc-pill sc-pill-amber"><i class="fas fa-exclamation-circle"></i> Pending PSV</span>`;

    return `
        <tr>
            <td>
                <div class="sc-staff-name"><i class="fas fa-user-md text-blue"></i> <strong>${escapeHtml(c.staff_full_name)}</strong></div>
                <small class="text-muted">${escapeHtml(c.department_name || 'Medical Staff')}</small>
            </td>
            <td>
                <div class="font-weight-bold">${escapeHtml(c.credential_title)}</div>
                <div class="sc-cat-badge">${formatCredentialTypeBadge(c.credential_type)}</div>
            </td>
            <td>
                <div>${escapeHtml(c.issuing_body)}</div>
            </td>
            <td class="font-mono font-weight-bold">
                ${escapeHtml(c.certificate_number)}
            </td>
            <td>${formatDate(c.issue_date)}</td>
            <td>${expiryHtml}</td>
            <td class="text-center">${statusPill}</td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline btn-edit-cred" data-id="${c.id}" title="Edit Credential">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

// -------------------------------------------------------------
// TAB 2: CLINICAL PRIVILEGES REGISTRY
// -------------------------------------------------------------
function renderPrivilegesTab() {
    const data = cache.privilegesData || { total: 0, records: [] };
    const records = data.records || [];

    return `
        <div class="sc-panel">
            <div class="sc-panel-header">
                <div>
                    <h3><i class="fas fa-hospital"></i> Medical Staff Clinical Privilege Delineations</h3>
                    <p class="text-muted">Approved hospital scope of practice, privilege tiers, and authorized procedural lists.</p>
                </div>
                <div>
                    <button class="btn btn-primary" id="btnScAddPrivilegeTop"><i class="fas fa-plus"></i> Grant Clinical Privileges</button>
                </div>
            </div>

            <div class="sc-table-wrapper">
                <table class="sc-table">
                    <thead>
                        <tr>
                            <th>Privilege Code</th>
                            <th>Physician &amp; Department</th>
                            <th class="text-center">Privilege Tier</th>
                            <th>Effective Date</th>
                            <th>Biennial Review Date</th>
                            <th>Approving Committee &amp; Resolution</th>
                            <th class="text-center">Authorized Procedures</th>
                            <th class="text-center">Status</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr><td colspan="9" class="sc-empty-row">No clinical privilege grants found.</td></tr>
                        ` : records.map(p => renderPrivilegeRow(p)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPrivilegeRow(p) {
    const tierPill = formatTierBadge(p.privilege_tier);
    const procsCount = parseInt(p.authorized_procedures_count || 0, 10);
    const isActive = p.status === 'active';

    return `
        <tr>
            <td class="font-mono"><strong>${escapeHtml(p.privilege_code)}</strong></td>
            <td>
                <div class="sc-staff-name"><i class="fas fa-user-md text-blue"></i> <strong>${escapeHtml(p.doctor_name)}</strong></div>
                <small class="text-muted">${escapeHtml(p.department_name || 'Clinical Staff')}</small>
            </td>
            <td class="text-center">${tierPill}</td>
            <td>${formatDate(p.effective_date)}</td>
            <td>
                <div>${formatDate(p.review_date)}</div>
                <small class="text-muted">${p.days_until_review || 0}d until re-evaluation</small>
            </td>
            <td>
                <div>${escapeHtml(p.approving_committee)}</div>
                <small class="font-mono text-muted">${escapeHtml(p.committee_resolution_no || 'N/A')}</small>
            </td>
            <td class="text-center font-mono">
                <span class="sc-proc-count-badge"><i class="fas fa-procedures"></i> ${procsCount} authorized</span>
            </td>
            <td class="text-center">
                ${isActive ? `<span class="sc-pill sc-pill-emerald">Active Grant</span>` : `<span class="sc-pill sc-pill-gray">${p.status}</span>`}
            </td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline btn-view-priv-scope" data-id="${p.id}" title="View Authorized Procedures">
                    <i class="fas fa-list-ul"></i> Procedures
                </button>
                <button class="btn btn-xs btn-outline btn-print-priv-cert" data-id="${p.id}" title="Print Institutional Privilege Certificate">
                    <i class="fas fa-print"></i> Certificate
                </button>
            </td>
        </tr>
    `;
}

// -------------------------------------------------------------
// TAB 3: REAL-TIME PROCEDURE SAFETY CHECKER
// -------------------------------------------------------------
function renderCheckerTab() {
    const chk = state.checker;
    const res = chk.result;

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${chk.employeeId == d.id ? 'selected' : ''}>${d.name} (${d.dept})</option>
    `).join('');

    return `
        <div class="sc-panel">
            <div class="sc-panel-header">
                <div>
                    <h3><i class="fas fa-check-double"></i> Real-Time Procedural Scope &amp; Safety Verification</h3>
                    <p class="text-muted">Clinical governance checkpoint for Operating Room supervisors, Endoscopy, and Bedside invasive lines.</p>
                </div>
            </div>

            <div class="sc-checker-grid">
                <!-- Inputs -->
                <div class="sc-card">
                    <h4>1. Verification Parameters</h4>
                    <div class="form-group">
                        <label>Select Attending / Operating Physician:</label>
                        <select id="chkDoctorSelect" class="form-select">
                            ${docOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Procedure Name or CPT/Tariff Code:</label>
                        <input type="text" id="chkProcedureInput" class="form-control" placeholder="e.g. Laparoscopic Cholecystectomy or Central Venous Catheter" value="${escapeHtml(chk.procedure)}">
                    </div>
                    <div class="sc-quick-procs">
                        <span class="text-muted text-sm">Quick Check Presets:</span>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Laparoscopic Cholecystectomy">Lap Chole</button>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Laparoscopic Appendectomy">Lap Appy</button>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Central Venous Catheter (CVC) Placement">CVC Line</button>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Diagnostic Lumbar Puncture">Lumbar Puncture</button>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Diagnostic Coronary Angiography">Coronary Angio</button>
                        <button type="button" class="btn btn-xs btn-outline btn-chk-preset" data-val="Brain Craniotomy">Craniotomy</button>
                    </div>
                    <button class="btn btn-primary btn-block" id="btnExecuteCheck" style="margin-top:16px;">
                        <i class="fas fa-shield-alt"></i> Verify Clinical Privilege Authorization
                    </button>
                </div>

                <!-- Result Display -->
                <div class="sc-card">
                    <h4>2. Governance Verification Decision</h4>
                    ${!res ? `
                        <div class="sc-checker-placeholder">
                            <i class="fas fa-user-shield fa-3x text-muted"></i>
                            <p>Select a physician and procedure, then click <strong>Verify Clinical Privilege Authorization</strong>.</p>
                        </div>
                    ` : renderCheckResult(res)}
                </div>
            </div>
        </div>
    `;
}

function renderCheckResult(r) {
    if (!r.is_privileged) {
        return `
            <div class="sc-decision-box rejected">
                <div class="sc-dec-header">
                    <i class="fas fa-ban fa-2x text-rose"></i>
                    <div>
                        <h4 class="text-rose">PROCEDURE NOT AUTHORIZED / PROHIBITED</h4>
                        <div class="font-mono text-muted text-sm">Decision Status: ${r.status}</div>
                    </div>
                </div>
                <div class="sc-dec-body">
                    <p><strong>Clinical Reason:</strong> ${escapeHtml(r.message)}</p>
                    <div class="sc-alert-box alert-rose">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div><strong>Governance Safety Lock:</strong> Operating Room scheduling and nursing sign-off are blocked for this procedure under this physician's credentialing record.</div>
                    </div>
                </div>
            </div>
        `;
    }

    const isDirectSup = r.supervision_level === 'Direct Supervision';
    const isProvisional = r.privilege_tier === 'Provisional';

    return `
        <div class="sc-decision-box ${isDirectSup || isProvisional ? 'provisional' : 'authorized'}">
            <div class="sc-dec-header">
                <i class="fas ${isDirectSup || isProvisional ? 'fa-exclamation-triangle text-amber' : 'fa-check-circle text-emerald'} fa-2x"></i>
                <div>
                    <h4 class="${isDirectSup || isProvisional ? 'text-amber' : 'text-emerald'}">
                        ${isDirectSup ? 'AUTHORIZED WITH DIRECT SUPERVISION REQUIRED' : 'AUTHORIZED FOR INDEPENDENT PERFORMANCE'}
                    </h4>
                    <div class="font-mono text-muted text-sm">Grant Code: ${escapeHtml(r.privilege_code)} | Privilege Tier: ${escapeHtml(r.privilege_tier)}</div>
                </div>
            </div>

            <div class="sc-dec-body">
                <div class="sc-dec-details-grid">
                    <div>
                        <span class="text-muted text-sm">Physician:</span>
                        <div><strong>${escapeHtml(r.doctor_name)}</strong></div>
                    </div>
                    <div>
                        <span class="text-muted text-sm">Department:</span>
                        <div><strong>${escapeHtml(r.department_name || 'Clinical Staff')}</strong></div>
                    </div>
                    <div>
                        <span class="text-muted text-sm">Procedure Verified:</span>
                        <div><strong>${escapeHtml(r.procedure_name)}</strong></div>
                    </div>
                    <div>
                        <span class="text-muted text-sm">Supervision Mandate:</span>
                        <div><strong class="font-mono">${escapeHtml(r.supervision_level)}</strong></div>
                    </div>
                </div>

                ${r.warnings && r.warnings.length > 0 ? `
                    <div class="sc-alert-box alert-amber" style="margin-top:14px;">
                        <i class="fas fa-bell"></i>
                        <div>
                            <strong>Clinical Governance Oversight Mandates:</strong>
                            <ul style="margin:4px 0 0 16px; padding:0;">
                                ${r.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                ` : `
                    <div class="sc-alert-box alert-emerald" style="margin-top:14px;">
                        <i class="fas fa-shield-alt"></i>
                        <div><strong>Clearance Approved:</strong> Physician is in full good standing with unrestricted independent privileges for this intervention. Valid through ${formatDate(r.review_date)}.</div>
                    </div>
                `}
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindRootEvents() {
    // Tabs
    document.querySelectorAll(".sc-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.getAttribute("data-tab");
            renderRoot();
        });
    });

    // Top actions
    document.getElementById("btnScSeedDemo")?.addEventListener("click", handleSeedDemo);
    document.getElementById("btnScCheckerNav")?.addEventListener("click", () => {
        state.activeTab = "checker";
        renderRoot();
    });
    document.getElementById("btnScNewPrivilege")?.addEventListener("click", () => openPrivilegeModal());
    document.getElementById("btnScAddPrivilegeTop")?.addEventListener("click", () => openPrivilegeModal());
    document.getElementById("btnScNewCred")?.addEventListener("click", () => openCredentialModal());

    // Credentials Filter events
    document.getElementById("credSearchInput")?.addEventListener("input", debounce((e) => {
        state.credSearch = e.target.value.trim();
        state.credPage = 1;
        refreshCredentials();
    }, 400));

    document.getElementById("credTypeSelect")?.addEventListener("change", (e) => {
        state.credTypeFilter = e.target.value;
        state.credPage = 1;
        refreshCredentials();
    });

    document.getElementById("credStatusSelect")?.addEventListener("change", (e) => {
        state.credStatusFilter = e.target.value;
        state.credPage = 1;
        refreshCredentials();
    });

    document.getElementById("credExpiringCheckbox")?.addEventListener("change", (e) => {
        state.credExpiringFilter = e.target.checked;
        state.credPage = 1;
        refreshCredentials();
    });

    document.getElementById("btnCredReset")?.addEventListener("click", () => {
        state.credSearch = "";
        state.credTypeFilter = "";
        state.credStatusFilter = "";
        state.credExpiringFilter = false;
        state.credPage = 1;
        refreshCredentials();
    });

    document.getElementById("btnCredPrev")?.addEventListener("click", () => {
        if (state.credPage > 1) {
            state.credPage--;
            refreshCredentials();
        }
    });

    document.getElementById("btnCredNext")?.addEventListener("click", () => {
        state.credPage++;
        refreshCredentials();
    });

    // Edit Credential
    document.querySelectorAll(".btn-edit-cred").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const cred = (cache.credentialsData?.records || []).find(c => c.id == id);
            if (cred) openCredentialModal(cred);
        });
    });

    // View Privilege Scope
    document.querySelectorAll(".btn-view-priv-scope").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            await openPrivilegeScopeModal(id);
        });
    });

    // Print Privilege Certificate
    document.querySelectorAll(".btn-print-priv-cert").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            await openPrintCertificateModal(id);
        });
    });

    // Checker Form
    document.getElementById("btnExecuteCheck")?.addEventListener("click", handleRunChecker);

    document.querySelectorAll(".btn-chk-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const val = btn.getAttribute("data-val");
            const input = document.getElementById("chkProcedureInput");
            if (input) input.value = val;
            handleRunChecker();
        });
    });
}

async function refreshCredentials() {
    try {
        const res = await api(`/staff-credentials?page=${state.credPage}&per_page=${state.credPerPage}&credential_type=${state.credTypeFilter}&verification_status=${state.credStatusFilter}&expiring_soon=${state.credExpiringFilter ? '1' : ''}&q=${encodeURIComponent(state.credSearch)}`);
        cache.credentialsData = res?.data || { total: 0, records: [] };
        const content = document.getElementById("scTabContent");
        if (content && state.activeTab === "credentials") {
            content.innerHTML = renderCredentialsTab();
            bindRootEvents();
        }
    } catch (err) {
        console.error("Failed to refresh credentials:", err);
    }
}

async function handleSeedDemo() {
    if (!confirm("Populate realistic hospital credentials & clinical privileges for Chief Surgeon, Cardiology, and Anesthesiology?")) return;
    try {
        await api("/staff-credentials/seed-demo", { method: "POST" });
        alert("Demo credentials & privileges seeded successfully!");
        await initStaffCredentials();
    } catch (err) {
        alert("Seed failed: " + err.message);
    }
}

async function handleRunChecker() {
    const docId = parseInt(document.getElementById("chkDoctorSelect")?.value, 10);
    const proc = document.getElementById("chkProcedureInput")?.value.trim();

    if (!docId || !proc) return alert("Please select a physician and enter a procedure name.");

    state.checker.employeeId = docId;
    state.checker.procedure = proc;

    try {
        const res = await api("/clinical-privileges/check-procedure", {
            method: "POST",
            body: { employee_id: docId, procedure: proc }
        });
        state.checker.result = res?.data || null;
        renderRoot();
    } catch (err) {
        alert("Check failed: " + err.message);
    }
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------
function openCredentialModal(cred = null) {
    const isEdit = !!cred;
    const modalId = "scCredModal";
    removeModal(modalId);

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${cred?.employee_id == d.id ? 'selected' : ''}>${d.name} (${d.dept})</option>
    `).join('');

    const modalHtml = `
        <div class="sc-modal-overlay" id="${modalId}">
            <div class="sc-modal-card">
                <div class="sc-modal-header">
                    <h4><i class="fas fa-id-card"></i> ${isEdit ? 'Edit Professional Credential' : 'Register New Professional Credential'}</h4>
                    <button class="sc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="sc-modal-body">
                    <input type="hidden" id="crId" value="${cred?.id || ''}">
                    <div class="form-group">
                        <label>Staff Member / Physician:</label>
                        <select id="crEmployeeId" class="form-select">
                            ${docOptions}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Credential Category:</label>
                            <select id="crType" class="form-select">
                                <option value="medical_license" ${cred?.credential_type === 'medical_license' ? 'selected' : ''}>Medical Board License (PRC)</option>
                                <option value="nursing_license" ${cred?.credential_type === 'nursing_license' ? 'selected' : ''}>Board of Nursing License</option>
                                <option value="specialty_board_cert" ${cred?.credential_type === 'specialty_board_cert' ? 'selected' : ''}>Specialty Board Certification</option>
                                <option value="dea_narcotics_permit" ${cred?.credential_type === 'dea_narcotics_permit' ? 'selected' : ''}>PDEA / DEA S2 Narcotics License</option>
                                <option value="subspecialty_fellowship" ${cred?.credential_type === 'subspecialty_fellowship' ? 'selected' : ''}>Subspecialty Fellowship</option>
                                <option value="bls_acls_certification" ${cred?.credential_type === 'bls_acls_certification' ? 'selected' : ''}>BLS / ACLS Certification</option>
                                <option value="malpractice_insurance" ${cred?.credential_type === 'malpractice_insurance' ? 'selected' : ''}>Malpractice Insurance Policy</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <label>Certificate / License Number:</label>
                            <input type="text" id="crCertNo" class="form-control font-mono" placeholder="e.g. PRC-0098412" value="${escapeHtml(cred?.certificate_number || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Credential Formal Title:</label>
                        <input type="text" id="crTitle" class="form-control" placeholder="e.g. Diplomate &amp; Fellow, Philippine College of Surgeons" value="${escapeHtml(cred?.credential_title || '')}">
                    </div>
                    <div class="form-group">
                        <label>Issuing Regulatory / Academic Body:</label>
                        <input type="text" id="crBody" class="form-control" placeholder="e.g. Professional Regulation Commission (PRC)" value="${escapeHtml(cred?.issuing_body || '')}">
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Issue Date:</label>
                            <input type="date" id="crIssue" class="form-control" value="${cred?.issue_date || ''}">
                        </div>
                        <div class="form-group col-6">
                            <label>Expiration Date (Leave blank if lifetime):</label>
                            <input type="date" id="crExpiry" class="form-control" value="${cred?.expiry_date || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Verification Status (PSV):</label>
                            <select id="crStatus" class="form-select">
                                <option value="verified" ${cred?.verification_status === 'verified' ? 'selected' : ''}>Verified (Primary Source Verified)</option>
                                <option value="pending_verification" ${cred?.verification_status === 'pending_verification' ? 'selected' : ''}>Pending Verification</option>
                                <option value="expired" ${cred?.verification_status === 'expired' ? 'selected' : ''}>Expired</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <label>Verification Registry URL:</label>
                            <input type="text" id="crPsvUrl" class="form-control" placeholder="https://online.prc.gov.ph/verification" value="${escapeHtml(cred?.primary_source_verification_url || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes / Credentialing Committee Remarks:</label>
                        <textarea id="crNotes" class="form-control" rows="2">${escapeHtml(cred?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="sc-modal-footer">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                    <button class="btn btn-primary" id="btnSaveCredSubmit"><i class="fas fa-save"></i> Save Credential</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("btnSaveCredSubmit")?.addEventListener("click", async () => {
        const title = document.getElementById("crTitle")?.value.trim();
        const certNo = document.getElementById("crCertNo")?.value.trim();
        if (!title || !certNo) return alert("Please enter credential title and certificate number.");

        const payload = {
            id: document.getElementById("crId")?.value || undefined,
            employee_id: parseInt(document.getElementById("crEmployeeId")?.value, 10),
            credential_type: document.getElementById("crType")?.value,
            certificate_number: certNo,
            credential_title: title,
            issuing_body: document.getElementById("crBody")?.value.trim() || 'Regulatory Commission',
            issue_date: document.getElementById("crIssue")?.value || undefined,
            expiry_date: document.getElementById("crExpiry")?.value || null,
            verification_status: document.getElementById("crStatus")?.value,
            primary_source_verification_url: document.getElementById("crPsvUrl")?.value.trim() || null,
            notes: document.getElementById("crNotes")?.value.trim() || null
        };

        try {
            await api("/staff-credentials", { method: "POST", body: payload });
            alert("Credential record saved successfully!");
            document.getElementById(modalId)?.remove();
            await initStaffCredentials();
        } catch (err) {
            alert("Failed: " + err.message);
        }
    });
}

function openPrivilegeModal(priv = null) {
    const isEdit = !!priv;
    const modalId = "scPrivModal";
    removeModal(modalId);

    const docOptions = cache.doctorsList.map(d => `
        <option value="${d.id}" ${priv?.employee_id == d.id ? 'selected' : ''}>${d.name} (${d.dept})</option>
    `).join('');

    const modalHtml = `
        <div class="sc-modal-overlay" id="${modalId}">
            <div class="sc-modal-card">
                <div class="sc-modal-header">
                    <h4><i class="fas fa-award"></i> ${isEdit ? 'Update Clinical Privileges Grant' : 'Grant Medical Staff Clinical Privileges'}</h4>
                    <button class="sc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                </div>
                <div class="sc-modal-body">
                    <input type="hidden" id="pvId" value="${priv?.id || ''}">
                    <div class="form-group">
                        <label>Select Physician:</label>
                        <select id="pvEmployeeId" class="form-select">
                            ${docOptions}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Hospital Privilege Tier:</label>
                            <select id="pvTier" class="form-select">
                                <option value="Full" ${priv?.privilege_tier === 'Full' ? 'selected' : ''}>Full Independent Privileges</option>
                                <option value="Provisional" ${priv?.privilege_tier === 'Provisional' ? 'selected' : ''}>Provisional (Proctored / Supervised)</option>
                                <option value="Consulting" ${priv?.privilege_tier === 'Consulting' ? 'selected' : ''}>Consulting / Non-Admitting</option>
                                <option value="Temporary" ${priv?.privilege_tier === 'Temporary' ? 'selected' : ''}>Temporary Locum Tenens</option>
                                <option value="Restricted" ${priv?.privilege_tier === 'Restricted' ? 'selected' : ''}>Restricted Scope</option>
                            </select>
                        </div>
                        <div class="form-group col-6">
                            <label>Status:</label>
                            <select id="pvStatus" class="form-select">
                                <option value="active" ${priv?.status === 'active' ? 'selected' : ''}>Active Grant</option>
                                <option value="under_review" ${priv?.status === 'under_review' ? 'selected' : ''}>Under Committee Review</option>
                                <option value="suspended" ${priv?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Effective Date:</label>
                            <input type="date" id="pvEffective" class="form-control" value="${priv?.effective_date || ''}">
                        </div>
                        <div class="form-group col-6">
                            <label>Biennial Review Date:</label>
                            <input type="date" id="pvReview" class="form-control" value="${priv?.review_date || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-6">
                            <label>Approving Committee:</label>
                            <input type="text" id="pvCommittee" class="form-control" value="${escapeHtml(priv?.approving_committee || 'Hospital Credentials & Privileging Committee')}">
                        </div>
                        <div class="form-group col-6">
                            <label>Committee Resolution #:</label>
                            <input type="text" id="pvResolution" class="form-control font-mono" placeholder="e.g. CPC-RES-2026-04" value="${escapeHtml(priv?.committee_resolution_no || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Scope of Practice Remarks:</label>
                        <textarea id="pvNotes" class="form-control" rows="2">${escapeHtml(priv?.notes || 'Authorized clinical privileges following credentialing committee review.')}</textarea>
                    </div>
                </div>
                <div class="sc-modal-footer">
                    <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                    <button class="btn btn-primary" id="btnSavePrivSubmit"><i class="fas fa-check-circle"></i> Grant Privileges</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.getElementById("btnSavePrivSubmit")?.addEventListener("click", async () => {
        const payload = {
            id: document.getElementById("pvId")?.value || undefined,
            employee_id: parseInt(document.getElementById("pvEmployeeId")?.value, 10),
            privilege_tier: document.getElementById("pvTier")?.value,
            status: document.getElementById("pvStatus")?.value,
            effective_date: document.getElementById("pvEffective")?.value || undefined,
            review_date: document.getElementById("pvReview")?.value || undefined,
            approving_committee: document.getElementById("pvCommittee")?.value.trim(),
            committee_resolution_no: document.getElementById("pvResolution")?.value.trim() || undefined,
            notes: document.getElementById("pvNotes")?.value.trim() || null
        };

        try {
            await api("/clinical-privileges", { method: "POST", body: payload });
            alert("Clinical privileges grant issued successfully!");
            document.getElementById(modalId)?.remove();
            await initStaffCredentials();
        } catch (err) {
            alert("Failed: " + err.message);
        }
    });
}

async function openPrivilegeScopeModal(id) {
    try {
        const res = await api(`/clinical-privileges/detail?id=${id}`);
        const p = res?.data;
        if (!p) return;

        const modalId = "scScopeModal";
        removeModal(modalId);

        const procs = p.procedures || [];

        const modalHtml = `
            <div class="sc-modal-overlay" id="${modalId}">
                <div class="sc-modal-card" style="max-width: 780px;">
                    <div class="sc-modal-header">
                        <h4><i class="fas fa-list-ul"></i> Authorized Procedural Scope: ${escapeHtml(p.doctor_name)}</h4>
                        <button class="sc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="sc-modal-body">
                        <div class="sc-scope-meta-bar">
                            <div><strong>Grant:</strong> <span class="font-mono">${escapeHtml(p.privilege_code)}</span></div>
                            <div><strong>Tier:</strong> ${formatTierBadge(p.privilege_tier)}</div>
                            <div><strong>Review Date:</strong> ${formatDate(p.review_date)}</div>
                        </div>

                        <h5 style="margin: 16px 0 8px 0;"><i class="fas fa-procedures"></i> Authorized Clinical Procedures (${procs.length})</h5>
                        
                        <div class="sc-table-wrapper">
                            <table class="sc-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Procedure Name</th>
                                        <th>Code</th>
                                        <th class="text-center">Supervision Level</th>
                                        <th class="text-center">Proctoring Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${procs.length === 0 ? `
                                        <tr><td colspan="5" class="sc-empty-row">No authorized procedures assigned to this grant yet.</td></tr>
                                    ` : procs.map(pr => `
                                        <tr>
                                            <td><span class="sc-cat-pill">${escapeHtml(pr.procedure_category)}</span></td>
                                            <td><strong>${escapeHtml(pr.procedure_name)}</strong></td>
                                            <td class="font-mono">${escapeHtml(pr.procedure_code || 'N/A')}</td>
                                            <td class="text-center font-mono">
                                                <span class="sc-sup-badge ${pr.supervision_level === 'Independent' ? 'sup-indep' : 'sup-direct'}">
                                                    ${escapeHtml(pr.supervision_level)}
                                                </span>
                                            </td>
                                            <td class="text-center font-mono text-sm">
                                                ${pr.required_proctored_cases > 0 
                                                    ? `${pr.completed_proctored_cases} / ${pr.required_proctored_cases} cases` 
                                                    : '<span class="text-muted">N/A (Independent)</span>'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="sc-modal-footer">
                        <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
    } catch (err) {
        alert("Error loading scope: " + err.message);
    }
}

async function openPrintCertificateModal(id) {
    try {
        const res = await api(`/clinical-privileges/detail?id=${id}`);
        const p = res?.data;
        if (!p) return;

        const modalId = "scCertModal";
        removeModal(modalId);

        const procs = p.procedures || [];

        const modalHtml = `
            <div class="sc-modal-overlay" id="${modalId}">
                <div class="sc-modal-card sc-print-modal" style="max-width: 820px;">
                    <div class="sc-modal-header no-print">
                        <h4><i class="fas fa-print"></i> Hospital Clinical Privileges Delineation Certificate</h4>
                        <button class="sc-modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="sc-modal-body" id="printableCertContent">
                        <div class="sc-cert-border">
                            <div class="sc-cert-header">
                                <div class="sc-cert-logo">INTELLIX HOSPITAL MEDICAL REVENUE &amp; GOVERNANCE CENTER</div>
                                <div class="sc-cert-sub">Institutional Credentials &amp; Medical Staff Privileging Committee</div>
                                <h2 class="sc-cert-title">CERTIFICATE OF CLINICAL PRIVILEGES</h2>
                                <div class="font-mono text-sm">Resolution No: ${escapeHtml(p.committee_resolution_no || 'CPC-RES-2026')} | Grant Code: ${escapeHtml(p.privilege_code)}</div>
                            </div>

                            <hr class="sc-cert-divider">

                            <div class="sc-cert-statement">
                                This is to certify that upon thorough review of credentials, primary source verification, specialty board certifications, and demonstrated clinical competence,
                            </div>

                            <div class="sc-cert-name">${escapeHtml(p.doctor_name)}</div>
                            <div class="sc-cert-dept">Department of ${escapeHtml(p.department_name || 'Medical Services')}</div>

                            <div class="sc-cert-tier-box">
                                HAS BEEN GRANTED <strong>${p.privilege_tier.toUpperCase()} CLINICAL PRIVILEGES</strong>
                                <div class="text-sm font-normal">Effective Date: ${formatDate(p.effective_date)} &mdash; Biennial Review Date: ${formatDate(p.review_date)}</div>
                            </div>

                            <h4 style="margin: 16px 0 6px 0; font-size: 13px; text-transform: uppercase;">Delineated Procedural Scope:</h4>
                            <div class="sc-cert-proc-list">
                                ${procs.map(pr => `
                                    <div class="sc-cert-proc-item font-mono text-xs">
                                        &bull; <strong>${escapeHtml(pr.procedure_name)}</strong> [${escapeHtml(pr.supervision_level)}] (${escapeHtml(pr.procedure_category)})
                                    </div>
                                `).join('')}
                            </div>

                            <div class="sc-cert-signatures">
                                <div class="sc-sig-block">
                                    <div class="sc-sig-line"></div>
                                    <strong>${escapeHtml(p.approving_chairperson || 'Chief Medical Officer')}</strong>
                                    <div class="text-xs">Chairman, Credentials Committee</div>
                                </div>
                                <div class="sc-sig-block">
                                    <div class="sc-sig-line"></div>
                                    <strong>Hospital President &amp; CEO</strong>
                                    <div class="text-xs">Medical Center Administration</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="sc-modal-footer no-print">
                        <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Close</button>
                        <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Institutional Certificate</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
    } catch (err) {
        alert("Failed to render certificate: " + err.message);
    }
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function removeModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dStr) {
    if (!dStr) return "N/A";
    const d = new Date(dStr + "T00:00:00");
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCredentialTypeBadge(type) {
    switch (type) {
        case "medical_license": return `<span class="sc-cat-pill cat-blue"><i class="fas fa-user-md"></i> Medical License (PRC)</span>`;
        case "nursing_license": return `<span class="sc-cat-pill cat-teal"><i class="fas fa-user-nurse"></i> Nursing License</span>`;
        case "specialty_board_cert": return `<span class="sc-cat-pill cat-purple"><i class="fas fa-medal"></i> Specialty Board</span>`;
        case "dea_narcotics_permit": return `<span class="sc-cat-pill cat-amber"><i class="fas fa-prescription-bottle-alt"></i> PDEA S2 Narcotics</span>`;
        case "subspecialty_fellowship": return `<span class="sc-cat-pill cat-indigo"><i class="fas fa-award"></i> Fellowship</span>`;
        case "bls_acls_certification": return `<span class="sc-cat-pill cat-rose"><i class="fas fa-heartbeat"></i> ACLS / BLS</span>`;
        default: return `<span class="sc-cat-pill cat-gray">${type}</span>`;
    }
}

function formatTierBadge(tier) {
    switch (tier) {
        case "Full": return `<span class="sc-tier-pill tier-full"><i class="fas fa-check-circle"></i> Full Independent</span>`;
        case "Provisional": return `<span class="sc-tier-pill tier-provisional"><i class="fas fa-user-clock"></i> Provisional</span>`;
        case "Consulting": return `<span class="sc-tier-pill tier-consulting"><i class="fas fa-comments"></i> Consulting</span>`;
        case "Temporary": return `<span class="sc-tier-pill tier-temporary"><i class="fas fa-clock"></i> Temporary</span>`;
        case "Restricted": return `<span class="sc-tier-pill tier-restricted"><i class="fas fa-ban"></i> Restricted</span>`;
        default: return `<span class="sc-tier-pill">${tier}</span>`;
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function ensureCss() {
    if (document.getElementById("staffCredStyles")) return;
    const style = document.createElement("style");
    style.id = "staffCredStyles";
    style.textContent = `
        .sc-root { font-family: Inter, system-ui, -apple-system, sans-serif; color: #1e293b; background: #f8fafc; min-height: 100vh; padding: 24px; }
        .sc-container { max-width: 1400px; margin: 0 auto; }
        .sc-loading { text-align: center; padding: 60px; font-size: 16px; color: #64748b; }
        .sc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .sc-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .sc-header h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .sc-sub { color: #64748b; font-size: 14px; margin: 0; }
        .sc-badge-tag { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
        .sc-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* KPI Grid */
        .sc-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .sc-kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
        .sc-kpi-card.highlight { border-color: #10b981; background: #f0fdf4; }
        .sc-kpi-card.warning { border-color: #f59e0b; background: #fffbeb; }
        .sc-kpi-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
        .sc-kpi-val { font-size: 24px; font-weight: 700; font-family: monospace; color: #0f172a; }
        .sc-kpi-sub { font-size: 12px; color: #94a3b8; }

        /* Tab Nav */
        .sc-nav-tabs { display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
        .sc-tab-btn { background: none; border: none; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .sc-tab-btn:hover { color: #2563eb; }
        .sc-tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; }

        /* Panels */
        .sc-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
        .sc-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .sc-panel-header h3 { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; }

        /* Toolbar */
        .sc-toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .sc-search-box { position: relative; flex: 1; min-width: 280px; }
        .sc-search-box i { position: absolute; left: 12px; top: 11px; color: #94a3b8; }
        .sc-search-box input { width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        .sc-filter-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .sc-filter-group select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background: #fff; }
        .sc-checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; }

        /* Tables */
        .sc-table-wrapper { overflow-x: auto; }
        .sc-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .sc-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .sc-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .sc-table tbody tr:hover { background: #f8fafc; }
        .sc-empty-row { text-align: center; padding: 40px !important; color: #94a3b8; font-size: 14px; }

        /* Pills */
        .sc-pill { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .sc-pill-emerald { background: #dcfce7; color: #15803d; }
        .sc-pill-amber { background: #fef3c7; color: #b45309; }
        .sc-pill-rose { background: #ffe4e6; color: #be123c; }
        .sc-pill-purple { background: #f3e8ff; color: #7e22ce; }
        .sc-pill-gray { background: #f1f5f9; color: #64748b; }

        .sc-cat-pill { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .cat-blue { background: #eff6ff; color: #1e40af; }
        .cat-teal { background: #ccfbf1; color: #0f766e; }
        .cat-purple { background: #f3e8ff; color: #7e22ce; }
        .cat-amber { background: #fef3c7; color: #b45309; }
        .cat-indigo { background: #e0e7ff; color: #4338ca; }
        .cat-rose { background: #ffe4e6; color: #be123c; }
        .cat-gray { background: #f1f5f9; color: #475569; }

        .sc-tier-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .tier-full { background: #dcfce7; color: #166534; }
        .tier-provisional { background: #fef3c7; color: #92400e; }
        .tier-consulting { background: #e0e7ff; color: #3730a3; }
        .tier-temporary { background: #f3e8ff; color: #6b21a8; }
        .tier-restricted { background: #fee2e2; color: #991b1b; }

        .sc-proc-count-badge { background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
        .sc-sup-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .sup-indep { background: #dcfce7; color: #166534; }
        .sup-direct { background: #fef3c7; color: #92400e; }

        /* Checker Grid */
        .sc-checker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media(max-width: 900px) { .sc-checker-grid { grid-template-columns: 1fr; } }
        .sc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .sc-card h4 { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .sc-quick-procs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
        .sc-checker-placeholder { text-align: center; padding: 50px 20px; color: #94a3b8; }
        .sc-decision-box { border-radius: 8px; padding: 18px; border: 1px solid #e2e8f0; }
        .sc-decision-box.authorized { background: #f0fdf4; border-color: #86efac; }
        .sc-decision-box.provisional { background: #fffbeb; border-color: #fde68a; }
        .sc-decision-box.rejected { background: #fef2f2; border-color: #fca5a5; }
        .sc-dec-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 12px; }
        .sc-dec-header h4 { margin: 0 0 2px 0; font-size: 16px; }
        .sc-dec-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }

        .sc-alert-box { display: flex; gap: 10px; padding: 10px 12px; border-radius: 6px; font-size: 12.5px; line-height: 1.4; }
        .alert-rose { background: #ffe4e6; color: #9f1239; }
        .alert-amber { background: #fef3c7; color: #92400e; }
        .alert-emerald { background: #dcfce7; color: #166534; }

        /* Modal */
        .sc-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .sc-modal-card { background: #ffffff; width: 100%; max-width: 640px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
        .sc-modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .sc-modal-header h4 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
        .sc-modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; }
        .sc-modal-body { padding: 20px; overflow-y: auto; }
        .sc-modal-footer { padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }

        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }
        .form-control, .form-select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .form-row { display: flex; gap: 12px; }
        .col-6 { flex: 1; }

        /* Scope bar */
        .sc-scope-meta-bar { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 13px; }

        /* Certificate Print Styles */
        .sc-cert-border { border: 4px double #1e293b; padding: 30px; background: #fff; color: #0f172a; text-align: center; }
        .sc-cert-logo { font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #334155; }
        .sc-cert-sub { font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 2px; }
        .sc-cert-title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 16px 0 6px 0; letter-spacing: 0.5px; }
        .sc-cert-divider { border: none; border-top: 1px solid #cbd5e1; margin: 16px 0; }
        .sc-cert-statement { font-size: 13px; color: #475569; max-width: 620px; margin: 0 auto; line-height: 1.5; font-style: italic; }
        .sc-cert-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 2px 0; }
        .sc-cert-dept { font-size: 14px; color: #2563eb; font-weight: 600; margin-bottom: 16px; }
        .sc-cert-tier-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; font-size: 14px; color: #1e40af; display: inline-block; }
        .sc-cert-proc-list { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 18px; max-height: 180px; overflow-y: auto; margin: 10px 0; }
        .sc-cert-proc-item { padding: 2px 0; }
        .sc-cert-signatures { display: flex; justify-content: space-around; margin-top: 40px; }
        .sc-sig-block { width: 35%; text-align: center; }
        .sc-sig-line { border-bottom: 1px solid #000; height: 35px; margin-bottom: 4px; }

        @media print {
            body * { visibility: hidden; }
            #printableCertContent, #printableCertContent * { visibility: visible; }
            #printableCertContent { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
        }

        /* Utility */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-weight-bold { font-weight: 700; }
        .text-muted { color: #64748b; }
        .text-sm { font-size: 12px; }
        .text-xs { font-size: 11px; }
        .text-indigo { color: #4338ca; }
        .text-blue { color: #2563eb; }
        .text-amber { color: #d97706; }
        .text-emerald { color: #059669; }
        .text-purple { color: #7e22ce; }
        .text-rose { color: #e11d48; }
        .btn-block { width: 100%; }
        .btn-xs { padding: 2px 6px; font-size: 11px; }
    `;
    document.head.appendChild(style);
}
