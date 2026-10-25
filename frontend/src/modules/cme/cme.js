/**
 * Continuing Medical Education (CME / CPD) Credit Ledger & Renewal Compliance Module
 * Schema: hr_cme_records, hr_cme_quota_targets
 */

import { api } from "../../core/api.js?v=10";

let state = {
    activeTab: "compliance", // 'compliance' | 'records' | 'profile'
    employeeIdFilter: "",
    departmentIdFilter: "",
    activityTypeFilter: "",
    categoryTypeFilter: "",
    verificationStatusFilter: "",
    searchQuery: "",
    page: 1,
    perPage: 25,
    selectedStaffId: 102, // Dr. Elena Rostova
    selectedProfile: null,
    editingRecord: null
};

let cache = {
    overviewData: null,
    recordsData: null,
    metadata: { staff: [], activity_types: {}, categories: [] }
};

export function CMEView() {
    return `<div class="cme-root" id="cmeRoot">
        <div style="padding: 40px; text-align: center; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0284c7;"></i>
            <div style="margin-top: 12px; font-weight: 600;">Loading Continuing Medical Education (CME / CPD) Ledger...</div>
        </div>
    </div>`;
}

export async function initCME() {
    ensureCss();
    await loadInitialData();
}

async function loadInitialData() {
    const root = document.getElementById("cmeRoot");
    if (!root) return;

    try {
        const [metaRes, overviewRes, recordsRes] = await Promise.all([
            api(`/cme/metadata`).catch(() => null),
            api(`/cme/compliance-overview`).catch(() => null),
            api(`/cme/records?employee_id=${state.employeeIdFilter}&activity_type=${state.activityTypeFilter}&category_type=${state.categoryTypeFilter}&verification_status=${state.verificationStatusFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null)
        ]);

        cache.metadata = metaRes?.data || { staff: [], activity_types: {}, categories: [] };
        cache.overviewData = overviewRes?.data || { metrics: {}, targets: [] };
        cache.recordsData = recordsRes?.data || { total: 0, records: [], metrics: {} };

        // Pre-load default staff profile
        if (state.selectedStaffId) {
            await loadStaffProfile(state.selectedStaffId);
        }

        renderModule();
    } catch (err) {
        console.error("Failed to load CME module data:", err);
        root.innerHTML = `<div class="dr-alert dr-alert-danger">Failed to load CME Credit Ledger: ${err.message || err}</div>`;
    }
}

async function loadStaffProfile(employeeId) {
    try {
        const res = await api(`/cme/profile?employee_id=${employeeId}`);
        state.selectedProfile = res?.data || null;
    } catch (err) {
        console.error("Failed to load staff CME profile:", err);
    }
}

function renderModule() {
    const root = document.getElementById("cmeRoot");
    if (!root) return;

    const m = cache.overviewData?.metrics || {};
    const totalEarned = parseFloat(m.total_earned_credits || 0).toFixed(1);
    const totalRequired = parseFloat(m.total_required_credits || 0).toFixed(1);
    const overallRate = parseFloat(m.overall_compliance_rate || 0).toFixed(1);
    const trackedCount = parseInt(m.total_tracked_staff || 0, 10);
    const compliantCount = parseInt(m.compliant_count || 0, 10);
    const behindCount = parseInt(m.behind_schedule_count || 0, 10);

    root.innerHTML = `
        <div class="cme-container">
            <!-- Header -->
            <div class="cme-header">
                <div>
                    <div class="cme-title-row">
                        <span class="cme-title-icon">
                            <i class="fas fa-graduation-cap"></i>
                        </span>
                        <div>
                            <h1 class="cme-title">Continuing Medical Education (CME / CPD) Credit Ledger</h1>
                            <p class="cme-subtitle">Institutional tracking of physician &amp; nursing symposiums, workshops, accredited credit units, certificate repository &amp; license renewal progress.</p>
                        </div>
                    </div>
                </div>
                <div class="cme-header-actions">
                    <button class="cme-btn cme-btn-primary" id="cmeBtnLogActivity">
                        <i class="fas fa-plus-circle"></i> Log CME / CPD Activity
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="cme-kpi-grid">
                <div class="cme-kpi-card cme-kpi-blue">
                    <div class="cme-kpi-content">
                        <div class="cme-kpi-label">Institutional Earned Credits</div>
                        <div class="cme-kpi-val">${totalEarned} <span class="cme-kpi-sub">/ ${totalRequired}</span></div>
                        <div class="cme-kpi-desc">Category 1, 2, Ethics &amp; Safety Credits</div>
                    </div>
                    <div class="cme-kpi-icon"><i class="fas fa-award"></i></div>
                </div>

                <div class="cme-kpi-card cme-kpi-emerald">
                    <div class="cme-kpi-content">
                        <div class="cme-kpi-label">Overall Compliance Rate</div>
                        <div class="cme-kpi-val">${overallRate}%</div>
                        <div class="cme-kpi-desc">${compliantCount} of ${trackedCount} staff meeting license quotas</div>
                    </div>
                    <div class="cme-kpi-icon"><i class="fas fa-check-circle"></i></div>
                </div>

                <div class="cme-kpi-card cme-kpi-purple">
                    <div class="cme-kpi-content">
                        <div class="cme-kpi-label">Tracked Clinical Staff</div>
                        <div class="cme-kpi-val">${trackedCount} <span class="cme-kpi-sub">Clinicians</span></div>
                        <div class="cme-kpi-desc">Attending Physicians, Fellows &amp; Nurses</div>
                    </div>
                    <div class="cme-kpi-icon"><i class="fas fa-user-md"></i></div>
                </div>

                <div class="cme-kpi-card cme-kpi-amber">
                    <div class="cme-kpi-content">
                        <div class="cme-kpi-label">Renewal Attention Needed</div>
                        <div class="cme-kpi-val">${behindCount} <span class="cme-kpi-sub">Clinicians</span></div>
                        <div class="cme-kpi-desc">Below 50% cycle credit threshold</div>
                    </div>
                    <div class="cme-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
                </div>
            </div>

            <!-- Workspace Tabs -->
            <div class="cme-tabs">
                <button class="cme-tab-btn ${state.activeTab === 'compliance' ? 'active' : ''}" data-tab="compliance">
                    <i class="fas fa-tasks"></i> License Renewal Progress Tracker &amp; Quotas
                </button>
                <button class="cme-tab-btn ${state.activeTab === 'records' ? 'active' : ''}" data-tab="records">
                    <i class="fas fa-list-alt"></i> CME / CPD Activity Records Ledger
                </button>
                <button class="cme-tab-btn ${state.activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
                    <i class="fas fa-id-card-alt"></i> Staff CME Transcript &amp; Certificate Vault
                </button>
            </div>

            <!-- Tab 1: Compliance Progress Tracker -->
            <div id="cmeTabCompliance" class="cme-panel ${state.activeTab === 'compliance' ? 'active' : ''}">
                ${renderCompliancePanel()}
            </div>

            <!-- Tab 2: Activity Records Ledger -->
            <div id="cmeTabRecords" class="cme-panel ${state.activeTab === 'records' ? 'active' : ''}">
                ${renderRecordsPanel()}
            </div>

            <!-- Tab 3: Staff Profile & Certificate Vault -->
            <div id="cmeTabProfile" class="cme-panel ${state.activeTab === 'profile' ? 'active' : ''}">
                ${renderProfilePanel()}
            </div>
        </div>

        <!-- Log Activity Modal -->
        <div id="cmeModalForm" class="cme-modal-backdrop" style="display: none;">
            <div class="cme-modal-box cme-modal-lg">
                <div class="cme-modal-header">
                    <h3 id="cmeModalTitle"><i class="fas fa-graduation-cap"></i> Document CME / CPD Training Activity</h3>
                    <button class="cme-modal-close" id="cmeBtnCloseFormModal">&times;</button>
                </div>
                <form id="cmeFormActivity" class="cme-form">
                    <input type="hidden" id="cmeFormId" value="">

                    <div class="cme-form-row">
                        <div class="cme-form-group">
                            <label>Staff Member / Clinician <span class="cme-req">*</span></label>
                            <select id="cmeFormStaff" class="cme-select" required>
                                <option value="">Select Doctor or Nurse...</option>
                                ${cache.metadata.staff.map(s => `
                                    <option value="${s.id}">
                                        ${escapeHtml(s.full_name)} (${escapeHtml(s.specialty || s.department_name || 'Staff')})
                                    </option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="cme-form-group">
                            <label>Activity Category / Credit Type <span class="cme-req">*</span></label>
                            <select id="cmeFormCategory" class="cme-select" required>
                                ${cache.metadata.categories.map(c => `
                                    <option value="${c}">${c}</option>
                                `).join("")}
                            </select>
                        </div>
                    </div>

                    <div class="cme-form-group">
                        <label>Activity / Symposium Title <span class="cme-req">*</span></label>
                        <input type="text" id="cmeFormTitle" class="cme-input" required placeholder="e.g. Annual Clinical Congress of the American College of Surgeons">
                    </div>

                    <div class="cme-form-row">
                        <div class="cme-form-group">
                            <label>Activity Format / Type <span class="cme-req">*</span></label>
                            <select id="cmeFormType" class="cme-select" required>
                                ${Object.entries(cache.metadata.activity_types).map(([k, v]) => `
                                    <option value="${k}">${v}</option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="cme-form-group">
                            <label>Accrediting Body / Provider <span class="cme-req">*</span></label>
                            <input type="text" id="cmeFormAccreditor" class="cme-input" required placeholder="e.g. ACCME / American Heart Association / AMA">
                        </div>
                    </div>

                    <div class="cme-form-row">
                        <div class="cme-form-group">
                            <label>Date Completed <span class="cme-req">*</span></label>
                            <input type="date" id="cmeFormDate" class="cme-input" required value="${new Date().toISOString().substring(0, 10)}">
                        </div>
                        <div class="cme-form-group">
                            <label>CME / CPD Credit Units <span class="cme-req">*</span></label>
                            <input type="number" id="cmeFormUnits" class="cme-input" required step="0.25" min="0.25" value="5.00">
                        </div>
                        <div class="cme-form-group">
                            <label>Cycle Year</label>
                            <input type="number" id="cmeFormYear" class="cme-input" value="2026">
                        </div>
                    </div>

                    <div class="cme-form-row">
                        <div class="cme-form-group">
                            <label>Venue / Location / Platform:</label>
                            <input type="text" id="cmeFormVenue" class="cme-input" placeholder="e.g. Chicago McCormick Place / Online Virtual">
                        </div>
                        <div class="cme-form-group">
                            <label>Certificate / Roll Number:</label>
                            <input type="text" id="cmeFormCertNo" class="cme-input" placeholder="e.g. ACCME-CERT-2026-891">
                        </div>
                    </div>

                    <div class="cme-form-row">
                        <div class="cme-form-group">
                            <label>Uploaded Certificate File Name:</label>
                            <input type="text" id="cmeFormCertFile" class="cme-input" placeholder="e.g. cme_certificate_john_doe.pdf">
                        </div>
                        <div class="cme-form-group">
                            <label>Verification Status:</label>
                            <select id="cmeFormStatus" class="cme-select">
                                <option value="verified">Verified &amp; Approved</option>
                                <option value="pending_verification">Pending HR Verification</option>
                            </select>
                        </div>
                    </div>

                    <div class="cme-form-group">
                        <label>Notes / Learning Objectives Covered:</label>
                        <textarea id="cmeFormNotes" class="cme-input" rows="2" placeholder="Key clinical competencies, procedural updates, or patient safety takeaways..."></textarea>
                    </div>

                    <div class="cme-modal-actions">
                        <button type="button" class="cme-btn cme-btn-outline" id="cmeBtnCancelForm">Cancel</button>
                        <button type="submit" class="cme-btn cme-btn-primary" id="cmeBtnSaveActivity">
                            <i class="fas fa-save"></i> Save CME Activity Record
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Official Printable CME Transcript Modal -->
        <div id="cmeModalTranscript" class="cme-modal-backdrop" style="display: none;">
            <div class="cme-modal-box cme-modal-lg">
                <div class="cme-modal-header">
                    <h3><i class="fas fa-print"></i> Continuing Medical Education Official Transcript</h3>
                    <div>
                        <button class="cme-btn cme-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Download / Print Transcript</button>
                        <button class="cme-modal-close" id="cmeBtnCloseTranscriptModal">&times;</button>
                    </div>
                </div>
                <div class="cme-printable-content" id="cmePrintableTranscriptContent"></div>
            </div>
        </div>
    `;

    attachEventHandlers();
}

/**
 * Render License Renewal Progress Tracker Panel
 */
function renderCompliancePanel() {
    const targets = cache.overviewData?.targets || [];

    return `
        <div class="cme-track-grid">
            ${targets.length === 0 ? `
                <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #64748b; background: #ffffff; border-radius: 10px;">
                    No staff license renewal quota records found for the active cycle year.
                </div>
            ` : targets.map(t => {
                const pct = parseFloat(t.progress_percent || 0);
                const isCompliant = pct >= 100 || t.compliance_status === 'compliant';
                const isBehind = t.compliance_status === 'behind_schedule' || pct < 50;
                const barColor = isCompliant ? '#10b981' : isBehind ? '#f59e0b' : '#0284c7';
                const days = parseInt(t.days_until_renewal || 0, 10);

                return `
                    <div class="cme-card">
                        <div class="cme-card-header">
                            <div class="cme-card-staff">
                                <div class="cme-card-avatar"><i class="fas fa-user-md"></i></div>
                                <div>
                                    <div class="cme-card-name">${escapeHtml(t.staff_name)}</div>
                                    <div class="cme-card-dept">${escapeHtml(t.specialty || t.department_name || 'Clinical Staff')}</div>
                                </div>
                            </div>
                            <div>${formatComplianceBadge(t.compliance_status)}</div>
                        </div>

                        <div class="cme-license-title">
                            <i class="fas fa-certificate"></i> ${escapeHtml(t.license_type)}
                        </div>

                        <!-- Progress Bar Block -->
                        <div class="cme-prog-block">
                            <div class="cme-prog-header">
                                <span class="cme-prog-label">Renewal Credit Progress</span>
                                <span class="cme-prog-pct" style="color: ${barColor}; font-weight: 800;">${pct}%</span>
                            </div>
                            <div class="cme-prog-track">
                                <div class="cme-prog-fill" style="width: ${Math.min(100, pct)}%; background: ${barColor};"></div>
                            </div>
                            <div class="cme-prog-footer">
                                <span>Earned: <strong>${parseFloat(t.earned_units).toFixed(1)}</strong> / ${parseFloat(t.required_units).toFixed(1)} Credits</span>
                                <span>${t.remaining_units > 0 ? `<strong style="color: #d97706;">${parseFloat(t.remaining_units).toFixed(1)}</strong> credits left` : '<span style="color: #10b981;">Quota Met ✓</span>'}</span>
                            </div>
                        </div>

                        <!-- Card Footer -->
                        <div class="cme-card-footer">
                            <div class="cme-due-badge ${days < 45 ? 'cme-due-crit' : ''}">
                                <i class="fas fa-clock"></i> Renewal Due: <strong>${t.renewal_due_date}</strong> (${days} days)
                            </div>
                            <button class="cme-btn cme-btn-xs cme-btn-outline cme-btn-view-staff-cme" data-id="${t.employee_id}" title="View CME Transcript">
                                <i class="fas fa-search-plus"></i> View Transcript
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

/**
 * Render Activity Records Ledger Panel
 */
function renderRecordsPanel() {
    const records = cache.recordsData?.records || [];

    return `
        <!-- Filter Toolbar -->
        <div class="cme-filter-bar">
            <div class="cme-filter-group">
                <label>Format:</label>
                <select id="cmeFilterType" class="cme-select">
                    <option value="">All Formats</option>
                    ${Object.entries(cache.metadata.activity_types).map(([k, v]) => `
                        <option value="${k}" ${state.activityTypeFilter === k ? 'selected' : ''}>${v}</option>
                    `).join("")}
                </select>
            </div>

            <div class="cme-filter-group">
                <label>Category:</label>
                <select id="cmeFilterCat" class="cme-select">
                    <option value="">All Categories</option>
                    ${cache.metadata.categories.map(c => `
                        <option value="${c}" ${state.categoryTypeFilter === c ? 'selected' : ''}>${c}</option>
                    `).join("")}
                </select>
            </div>

            <div class="cme-filter-group">
                <label>Status:</label>
                <select id="cmeFilterStatus" class="cme-select">
                    <option value="" ${state.verificationStatusFilter === '' ? 'selected' : ''}>All Statuses</option>
                    <option value="verified" ${state.verificationStatusFilter === 'verified' ? 'selected' : ''}>Verified</option>
                    <option value="pending_verification" ${state.verificationStatusFilter === 'pending_verification' ? 'selected' : ''}>Pending Verification</option>
                </select>
            </div>

            <div class="cme-search-box">
                <i class="fas fa-search cme-search-icon"></i>
                <input type="text" id="cmeSearchInput" class="cme-input cme-search-input" placeholder="Search symposium, accreditor, or staff name..." value="${escapeHtml(state.searchQuery)}">
            </div>
        </div>

        <!-- Table -->
        <div class="cme-table-container">
            <table class="cme-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Activity / Symposium Title</th>
                        <th>Clinician &amp; Department</th>
                        <th>Format</th>
                        <th>Accrediting Body</th>
                        <th>Date</th>
                        <th style="text-align: right;">Credits</th>
                        <th>Category</th>
                        <th>Certificate #</th>
                        <th style="text-align: center;">Status</th>
                        <th style="text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.length === 0 ? `
                        <tr>
                            <td colspan="11" style="text-align: center; color: #64748b; padding: 40px;">
                                No CME / CPD activity records found matching the filter criteria.
                            </td>
                        </tr>
                    ` : records.map(r => `
                        <tr>
                            <td><span class="cme-code-badge">${escapeHtml(r.record_code)}</span></td>
                            <td>
                                <div style="font-weight: 700; color: #0f172a; max-width: 280px; line-height: 1.3;">
                                    ${escapeHtml(r.activity_title)}
                                </div>
                                ${r.venue ? `<div style="font-size: 0.6875rem; color: #64748b;"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(r.venue)}</div>` : ''}
                            </td>
                            <td>
                                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(r.staff_name)}</div>
                                <div style="font-size: 0.6875rem; color: #64748b;">${escapeHtml(r.specialty || r.department_name || 'Staff')}</div>
                            </td>
                            <td>${formatActivityTypeBadge(r.activity_type)}</td>
                            <td><span style="font-size: 0.75rem; font-weight: 600; color: #334155;">${escapeHtml(r.accrediting_body)}</span></td>
                            <td style="white-space: nowrap; font-size: 0.75rem;">${r.activity_date}</td>
                            <td style="text-align: right; font-weight: 800; color: #0284c7; font-size: 0.875rem;">
                                ${parseFloat(r.credit_units).toFixed(2)}
                            </td>
                            <td><span class="cme-badge-cat">${escapeHtml(r.category_type)}</span></td>
                            <td>
                                ${r.certificate_number ? `<code style="font-size: 0.75rem;">${escapeHtml(r.certificate_number)}</code>` : '<span style="color: #94a3b8;">-</span>'}
                                ${r.certificate_file_name ? `<div style="font-size: 0.6875rem; color: #0284c7;"><i class="fas fa-paperclip"></i> ${escapeHtml(r.certificate_file_name)}</div>` : ''}
                            </td>
                            <td style="text-align: center;">${formatVerificationBadge(r.verification_status)}</td>
                            <td style="text-align: center;">
                                <div class="cme-actions" style="justify-content: center;">
                                    <button class="cme-btn cme-btn-xs cme-btn-outline cme-btn-edit-rec" data-id="${r.id}" title="Edit Activity">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="cme-btn cme-btn-xs cme-btn-outline cme-btn-del-rec" data-id="${r.id}" title="Delete Record" style="color: #dc2626;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render Individual Staff CME Profile & Transcript Panel
 */
function renderProfilePanel() {
    const prof = state.selectedProfile;
    const employee = prof?.employee || {};
    const quota = prof?.quota || {};
    const breakdown = prof?.breakdown || {};
    const activities = prof?.activities || [];

    const pct = parseFloat(quota.progress_percent || 0);
    const barColor = pct >= 100 ? '#10b981' : pct < 50 ? '#f59e0b' : '#0284c7';

    return `
        <div class="cme-prof-container">
            <!-- Staff Selector Header -->
            <div class="cme-prof-header">
                <div>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 800;">
                        <i class="fas fa-user-graduate"></i> Clinician Continuing Education Transcript &amp; Certificate Vault
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: #64748b;">
                        Review accredited course credits, verifiable certificate attachments, and license renewal readiness.
                    </p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="font-size: 0.8125rem; font-weight: 600;">Select Clinician:</label>
                    <select id="cmeProfStaffSelect" class="cme-select" style="min-width: 240px;">
                        ${cache.metadata.staff.map(s => `
                            <option value="${s.id}" ${state.selectedStaffId == s.id ? 'selected' : ''}>
                                ${escapeHtml(s.full_name)} (${escapeHtml(s.specialty || s.department_name || 'Staff')})
                            </option>
                        `).join("")}
                    </select>
                    <button class="cme-btn cme-btn-primary" id="cmeBtnPrintTranscript">
                        <i class="fas fa-print"></i> Official Transcript
                    </button>
                </div>
            </div>

            ${!prof ? `
                <div style="padding: 40px; text-align: center; color: #64748b;">Loading clinician transcript...</div>
            ` : `
                <!-- Profile Header Card -->
                <div class="cme-prof-card">
                    <div class="cme-prof-info">
                        <div class="cme-prof-avatar"><i class="fas fa-user-md"></i></div>
                        <div>
                            <div class="cme-prof-name">${escapeHtml(employee.full_name)}</div>
                            <div class="cme-prof-meta">
                                <span><strong>Role:</strong> ${escapeHtml(employee.specialty || 'Attending Physician')}</span> &bull;
                                <span><strong>Department:</strong> ${escapeHtml(employee.department_name || 'Clinical Care')}</span> &bull;
                                <span><strong>License Target:</strong> ${escapeHtml(quota.license_type || 'State Medical Board')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="cme-prof-prog-box">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 6px;">
                            <span>Cycle Progress (Year ${quota.target_year || 2026})</span>
                            <span style="font-weight: 800; color: ${barColor};">${pct}%</span>
                        </div>
                        <div class="cme-prog-track">
                            <div class="cme-prog-fill" style="width: ${Math.min(100, pct)}%; background: ${barColor};"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-top: 4px;">
                            <span>Earned: <strong>${parseFloat(quota.earned_units || 0).toFixed(1)}</strong> / ${parseFloat(quota.required_units || 0).toFixed(1)} Units</span>
                            <span>Due Date: <strong>${quota.renewal_due_date}</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Category Breakdown Grid -->
                <div class="cme-cat-grid">
                    <div class="cme-cat-card">
                        <div class="cme-cat-title"><i class="fas fa-chalkboard-teacher"></i> Category 1 (Formal CME)</div>
                        <div class="cme-cat-val">${parseFloat(breakdown.cat1_units || 0).toFixed(1)} <span class="cme-cat-sub">Credits</span></div>
                        <div class="cme-cat-desc">Conferences &amp; Accredited Workshops</div>
                    </div>

                    <div class="cme-cat-card">
                        <div class="cme-cat-title"><i class="fas fa-book-reader"></i> Category 2 (Self-Directed)</div>
                        <div class="cme-cat-val">${parseFloat(breakdown.cat2_units || 0).toFixed(1)} <span class="cme-cat-sub">Credits</span></div>
                        <div class="cme-cat-desc">Hospital Grand Rounds &amp; Literature Study</div>
                    </div>

                    <div class="cme-cat-card">
                        <div class="cme-cat-title"><i class="fas fa-shield-alt"></i> Ethics &amp; Patient Safety</div>
                        <div class="cme-cat-val">${parseFloat(breakdown.ethics_units || 0).toFixed(1)} <span class="cme-cat-sub">Credits</span></div>
                        <div class="cme-cat-desc">Mandatory Jurisprudence &amp; Bioethics</div>
                    </div>

                    <div class="cme-cat-card">
                        <div class="cme-cat-title"><i class="fas fa-biohazard"></i> Infection &amp; Prescribing</div>
                        <div class="cme-cat-val">${(parseFloat(breakdown.infection_units || 0) + parseFloat(breakdown.pharma_units || 0)).toFixed(1)} <span class="cme-cat-sub">Credits</span></div>
                        <div class="cme-cat-desc">IPC &amp; Controlled Substances Training</div>
                    </div>
                </div>

                <!-- Activities Ledger Table -->
                <div class="cme-table-container" style="margin-top: 16px;">
                    <div style="padding: 14px 18px; font-weight: 700; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-certificate"></i> Verified Activities &amp; Certificates Archive (${activities.length} entries)</span>
                    </div>
                    <table class="cme-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Activity Title</th>
                                <th>Format</th>
                                <th>Accrediting Body</th>
                                <th>Date</th>
                                <th style="text-align: right;">Credit Units</th>
                                <th>Category</th>
                                <th>Certificate No.</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activities.length === 0 ? `
                                <tr>
                                    <td colspan="9" style="text-align: center; color: #64748b; padding: 30px;">
                                        No CME activities documented yet for this clinician in the 2026 cycle.
                                    </td>
                                </tr>
                            ` : activities.map(a => `
                                <tr>
                                    <td><span class="cme-code-badge">${escapeHtml(a.record_code)}</span></td>
                                    <td>
                                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(a.activity_title)}</div>
                                        ${a.certificate_file_name ? `<div style="font-size: 0.6875rem; color: #0284c7;"><i class="fas fa-file-pdf"></i> ${escapeHtml(a.certificate_file_name)}</div>` : ''}
                                    </td>
                                    <td>${formatActivityTypeBadge(a.activity_type)}</td>
                                    <td>${escapeHtml(a.accrediting_body)}</td>
                                    <td style="white-space: nowrap;">${a.activity_date}</td>
                                    <td style="text-align: right; font-weight: 800; color: #0284c7;">${parseFloat(a.credit_units).toFixed(2)}</td>
                                    <td><span class="cme-badge-cat">${escapeHtml(a.category_type)}</span></td>
                                    <td><code>${escapeHtml(a.certificate_number || 'N/A')}</code></td>
                                    <td>${formatVerificationBadge(a.verification_status)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

/**
 * Open Official Printable CME Transcript Modal
 */
function openTranscriptModal() {
    const modal = document.getElementById("cmeModalTranscript");
    const container = document.getElementById("cmePrintableTranscriptContent");
    if (!modal || !container || !state.selectedProfile) return;

    const prof = state.selectedProfile;
    const employee = prof.employee || {};
    const quota = prof.quota || {};
    const breakdown = prof.breakdown || {};
    const activities = prof.activities || [];

    const pct = parseFloat(quota.progress_percent || 0);

    container.innerHTML = `
        <div class="cme-sheet">
            <div class="cme-sheet-header">
                <div class="cme-sh-brand">
                    <div class="cme-sh-logo"><i class="fas fa-hospital"></i></div>
                    <div>
                        <div class="cme-sh-title">USINTELLIX HEALTHCARE SYSTEM</div>
                        <div class="cme-sh-sub">CONTINUING MEDICAL EDUCATION (CME / CPD) VERIFIED TRANSCRIPT</div>
                    </div>
                </div>
                <div class="cme-sh-meta">
                    <div><strong>Accreditation Body:</strong> ACCME / AMA PRA</div>
                    <div><strong>Document ID:</strong> CME-TR-${employee.id}-2026</div>
                    <div><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <!-- Clinician Details Block -->
            <div class="cme-emp-grid">
                <div>
                    <div><span class="cme-lbl">Clinician Name:</span> <strong>${escapeHtml(employee.full_name)}</strong></div>
                    <div><span class="cme-lbl">Employee / License ID:</span> <code>EMP-${employee.id}</code></div>
                    <div><span class="cme-lbl">Specialty / Role:</span> ${escapeHtml(employee.specialty || 'Medical Staff')}</div>
                </div>
                <div>
                    <div><span class="cme-lbl">Department:</span> ${escapeHtml(employee.department_name || 'Clinical Services')}</div>
                    <div><span class="cme-lbl">Renewal Target:</span> <strong>${escapeHtml(quota.license_type)}</strong></div>
                    <div><span class="cme-lbl">Renewal Deadline:</span> ${quota.renewal_due_date}</div>
                </div>
                <div>
                    <div><span class="cme-lbl">Required Credits:</span> ${parseFloat(quota.required_units).toFixed(1)} Credits</div>
                    <div><span class="cme-lbl">Earned Verified:</span> <strong>${parseFloat(quota.earned_units).toFixed(1)} Credits</strong></div>
                    <div><span class="cme-lbl">Compliance Status:</span> <strong>${quota.compliance_status.toUpperCase()} (${pct}%)</strong></div>
                </div>
            </div>

            <!-- Category Summary Table -->
            <div style="font-weight: 700; font-size: 0.8125rem; margin-bottom: 6px;">I. CREDIT ACCREDITATION CATEGORY BREAKDOWN</div>
            <table class="cme-print-table" style="margin-bottom: 16px;">
                <thead>
                    <tr>
                        <th>Accredited CME / CPD Classification</th>
                        <th style="text-align: center;">Target Minimum</th>
                        <th style="text-align: right;">Credits Verified</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Category 1 (Formal Accredited Conferences &amp; Workshops)</strong></td>
                        <td style="text-align: center;">15.0 Credits</td>
                        <td style="text-align: right; font-weight: 700;">${parseFloat(breakdown.cat1_units || 0).toFixed(2)}</td>
                        <td style="text-align: center;">Verified ✓</td>
                    </tr>
                    <tr>
                        <td><strong>Category 2 (Institutional Grand Rounds &amp; Self-Directed Study)</strong></td>
                        <td style="text-align: center;">5.0 Credits</td>
                        <td style="text-align: right; font-weight: 700;">${parseFloat(breakdown.cat2_units || 0).toFixed(2)}</td>
                        <td style="text-align: center;">Verified ✓</td>
                    </tr>
                    <tr>
                        <td><strong>Mandatory Healthcare Ethics, Jurisprudence &amp; Patient Safety</strong></td>
                        <td style="text-align: center;">3.0 Credits</td>
                        <td style="text-align: right; font-weight: 700;">${parseFloat(breakdown.ethics_units || 0).toFixed(2)}</td>
                        <td style="text-align: center;">Verified ✓</td>
                    </tr>
                    <tr>
                        <td><strong>Infection Prevention, Antimicrobial Stewardship &amp; Prescribing</strong></td>
                        <td style="text-align: center;">2.0 Credits</td>
                        <td style="text-align: right; font-weight: 700;">${(parseFloat(breakdown.infection_units || 0) + parseFloat(breakdown.pharma_units || 0)).toFixed(2)}</td>
                        <td style="text-align: center;">Verified ✓</td>
                    </tr>
                    <tr style="background: #f8fafc; font-weight: 800;">
                        <td>TOTAL VERIFIED CREDITS ACCUMULATED</td>
                        <td style="text-align: center;">${parseFloat(quota.required_units).toFixed(1)} Credits</td>
                        <td style="text-align: right; color: #0284c7; font-size: 0.9375rem;">${parseFloat(quota.earned_units).toFixed(2)} Credits</td>
                        <td style="text-align: center; color: #166534;">${pct >= 100 ? 'QUOTA MET ✓' : 'ON TRACK'}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Itemized Activities Table -->
            <div style="font-weight: 700; font-size: 0.8125rem; margin-bottom: 6px;">II. ITEMIZED AUDITED TRAINING ACTIVITIES &amp; CERTIFICATE REGISTRY</div>
            <table class="cme-print-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Activity Title &amp; Venue</th>
                        <th>Accreditor</th>
                        <th>Date</th>
                        <th style="text-align: right;">Credits</th>
                        <th>Category</th>
                        <th>Certificate #</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(a => `
                        <tr>
                            <td><strong>${escapeHtml(a.record_code)}</strong></td>
                            <td>${escapeHtml(a.activity_title)}</td>
                            <td>${escapeHtml(a.accrediting_body)}</td>
                            <td>${a.activity_date}</td>
                            <td style="text-align: right; font-weight: 700;">${parseFloat(a.credit_units).toFixed(2)}</td>
                            <td>${escapeHtml(a.category_type)}</td>
                            <td><code>${escapeHtml(a.certificate_number || 'N/A')}</code></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <!-- Signatures -->
            <div class="cme-signatures">
                <div class="cme-sig">
                    <div class="cme-sig-line"></div>
                    <div>Director of Medical Education (CME Committee Chair)</div>
                </div>
                <div class="cme-sig">
                    <div class="cme-sig-line"></div>
                    <div>Hospital Credentialing &amp; Privileges Committee</div>
                </div>
                <div class="cme-sig">
                    <div class="cme-sig-line"></div>
                    <div>Chief Medical Officer (CMO)</div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function formatComplianceBadge(status) {
    switch (status) {
        case "compliant":
            return `<span class="cme-badge cme-b-comp"><i class="fas fa-check-circle"></i> Compliant</span>`;
        case "on_track":
            return `<span class="cme-badge cme-b-track"><i class="fas fa-clock"></i> On Track</span>`;
        case "behind_schedule":
            return `<span class="cme-badge cme-b-behind"><i class="fas fa-exclamation-circle"></i> Behind Schedule</span>`;
        case "critical_renewal_risk":
            return `<span class="cme-badge cme-b-crit"><i class="fas fa-exclamation-triangle"></i> Critical Risk</span>`;
        default:
            return `<span class="cme-badge">${status}</span>`;
    }
}

function formatActivityTypeBadge(type) {
    switch (type) {
        case "conference":
            return `<span class="cme-badge cme-b-conf"><i class="fas fa-users"></i> Conference</span>`;
        case "symposium":
            return `<span class="cme-badge cme-b-symp"><i class="fas fa-chalkboard-teacher"></i> Symposium</span>`;
        case "workshop":
            return `<span class="cme-badge cme-b-work"><i class="fas fa-tools"></i> Workshop</span>`;
        case "webinar":
            return `<span class="cme-badge cme-b-web"><i class="fas fa-laptop"></i> Webinar</span>`;
        case "institutional_grand_rounds":
            return `<span class="cme-badge cme-b-rounds"><i class="fas fa-hospital"></i> Grand Rounds</span>`;
        default:
            return `<span class="cme-badge">${type}</span>`;
    }
}

function formatVerificationBadge(status) {
    switch (status) {
        case "verified":
            return `<span class="cme-badge cme-b-comp"><i class="fas fa-check-double"></i> Verified</span>`;
        case "pending_verification":
            return `<span class="cme-badge cme-b-behind"><i class="fas fa-hourglass-half"></i> Pending</span>`;
        default:
            return `<span class="cme-badge">${status}</span>`;
    }
}

function attachEventHandlers() {
    // Tab switching
    document.querySelectorAll(".cme-tab-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            state.activeTab = btn.dataset.tab;
            renderModule();
        });
    });

    // Filters
    document.getElementById("cmeFilterType")?.addEventListener("change", async (e) => {
        state.activityTypeFilter = e.target.value;
        await loadInitialData();
    });

    document.getElementById("cmeFilterCat")?.addEventListener("change", async (e) => {
        state.categoryTypeFilter = e.target.value;
        await loadInitialData();
    });

    document.getElementById("cmeFilterStatus")?.addEventListener("change", async (e) => {
        state.verificationStatusFilter = e.target.value;
        await loadInitialData();
    });

    document.getElementById("cmeSearchInput")?.addEventListener("input", async (e) => {
        state.searchQuery = e.target.value;
        await loadInitialData();
    });

    // View specific staff transcript from tracker card
    document.querySelectorAll(".cme-btn-view-staff-cme").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            state.selectedStaffId = id;
            await loadStaffProfile(id);
            state.activeTab = "profile";
            renderModule();
        });
    });

    // Staff Select in Profile tab
    document.getElementById("cmeProfStaffSelect")?.addEventListener("change", async (e) => {
        const id = parseInt(e.target.value, 10);
        state.selectedStaffId = id;
        await loadStaffProfile(id);
        renderModule();
    });

    // Print Transcript Modal
    document.getElementById("cmeBtnPrintTranscript")?.addEventListener("click", openTranscriptModal);
    document.getElementById("cmeBtnCloseTranscriptModal")?.addEventListener("click", () => {
        const m = document.getElementById("cmeModalTranscript");
        if (m) m.style.display = "none";
    });

    // Form Modal open / close
    document.getElementById("cmeBtnLogActivity")?.addEventListener("click", () => openActivityModal());
    document.getElementById("cmeBtnCloseFormModal")?.addEventListener("click", closeActivityModal);
    document.getElementById("cmeBtnCancelForm")?.addEventListener("click", closeActivityModal);

    // Form Submit
    document.getElementById("cmeFormActivity")?.addEventListener("submit", handleActivitySubmit);

    // Edit button click
    document.querySelectorAll(".cme-btn-edit-rec").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id, 10);
            const rec = (cache.recordsData?.records || []).find(r => r.id == id);
            if (rec) openActivityModal(rec);
        });
    });

    // Delete button click
    document.querySelectorAll(".cme-btn-del-rec").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id, 10);
            if (!confirm(`Are you sure you want to delete CME activity record #${id}? This will adjust the staff member's renewal quota progress.`)) return;

            try {
                await api(`/cme/records/delete`, { method: "POST", body: { id } });
                await loadInitialData();
                if (state.selectedStaffId) await loadStaffProfile(state.selectedStaffId);
                renderModule();
            } catch (err) {
                alert("Delete failed: " + (err.message || err));
            }
        });
    });
}

function openActivityModal(rec = null) {
    const modal = document.getElementById("cmeModalForm");
    if (!modal) return;

    document.getElementById("cmeFormId").value = rec ? rec.id : "";
    document.getElementById("cmeModalTitle").innerHTML = rec ?
        `<i class="fas fa-edit"></i> Edit CME Activity #${escapeHtml(rec.record_code)}` :
        `<i class="fas fa-graduation-cap"></i> Document CME / CPD Training Activity`;

    if (rec) {
        document.getElementById("cmeFormStaff").value = rec.employee_id;
        document.getElementById("cmeFormCategory").value = rec.category_type;
        document.getElementById("cmeFormTitle").value = rec.activity_title;
        document.getElementById("cmeFormType").value = rec.activity_type;
        document.getElementById("cmeFormAccreditor").value = rec.accrediting_body;
        document.getElementById("cmeFormDate").value = rec.activity_date;
        document.getElementById("cmeFormUnits").value = rec.credit_units;
        document.getElementById("cmeFormYear").value = rec.target_cycle_year || 2026;
        document.getElementById("cmeFormVenue").value = rec.venue || "";
        document.getElementById("cmeFormCertNo").value = rec.certificate_number || "";
        document.getElementById("cmeFormCertFile").value = rec.certificate_file_name || "";
        document.getElementById("cmeFormStatus").value = rec.verification_status;
        document.getElementById("cmeFormNotes").value = rec.notes || "";
    } else {
        document.getElementById("cmeFormActivity").reset();
        document.getElementById("cmeFormUnits").value = "5.00";
        document.getElementById("cmeFormDate").value = new Date().toISOString().substring(0, 10);
        document.getElementById("cmeFormYear").value = "2026";
        if (state.selectedStaffId) {
            document.getElementById("cmeFormStaff").value = state.selectedStaffId;
        }
    }

    modal.style.display = "flex";
}

function closeActivityModal() {
    const modal = document.getElementById("cmeModalForm");
    if (modal) modal.style.display = "none";
}

async function handleActivitySubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("cmeBtnSaveActivity");
    if (btn) btn.disabled = true;

    try {
        const id = document.getElementById("cmeFormId").value;
        const payload = {
            id: id || undefined,
            employee_id: document.getElementById("cmeFormStaff").value,
            category_type: document.getElementById("cmeFormCategory").value,
            activity_title: document.getElementById("cmeFormTitle").value,
            activity_type: document.getElementById("cmeFormType").value,
            accrediting_body: document.getElementById("cmeFormAccreditor").value,
            activity_date: document.getElementById("cmeFormDate").value,
            credit_units: document.getElementById("cmeFormUnits").value,
            target_cycle_year: document.getElementById("cmeFormYear").value,
            venue: document.getElementById("cmeFormVenue").value || undefined,
            certificate_number: document.getElementById("cmeFormCertNo").value || undefined,
            certificate_file_name: document.getElementById("cmeFormCertFile").value || undefined,
            verification_status: document.getElementById("cmeFormStatus").value,
            notes: document.getElementById("cmeFormNotes").value || undefined
        };

        const endpoint = id ? `/cme/records/update` : `/cme/records`;
        const res = await api(endpoint, { method: "POST", body: payload });

        alert(res.data?.message || "CME activity record saved successfully!");
        closeActivityModal();

        await loadInitialData();
        if (payload.employee_id) {
            state.selectedStaffId = parseInt(payload.employee_id, 10);
            await loadStaffProfile(state.selectedStaffId);
        }
        renderModule();
    } catch (err) {
        alert("Save failed: " + (err.message || err));
    } finally {
        if (btn) btn.disabled = false;
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function ensureCss() {
    if (document.getElementById("cmeStyles")) return;

    const style = document.createElement("style");
    style.id = "cmeStyles";
    style.textContent = `
        .cme-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            color: #0f172a;
        }

        .cme-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .cme-title-row { display: flex; align-items: center; gap: 14px; }
        .cme-title-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 46px; height: 46px; border-radius: 12px;
            background: rgba(2, 132, 199, 0.12); color: #0284c7; font-size: 24px;
        }
        .cme-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .cme-subtitle { margin: 4px 0 0 0; font-size: 0.875rem; color: #64748b; }
        .cme-header-actions { display: flex; gap: 10px; }

        /* Buttons */
        .cme-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 16px; font-size: 0.875rem; font-weight: 600;
            border-radius: 6px; border: none; cursor: pointer; transition: all 0.15s ease;
        }
        .cme-btn-primary { background: #0284c7; color: #ffffff; }
        .cme-btn-primary:hover { background: #0369a1; }
        .cme-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
        .cme-btn-outline:hover { background: #f8fafc; }
        .cme-btn-xs { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; }

        /* KPI Grid */
        .cme-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }
        .cme-kpi-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); border-left: 4px solid #cbd5e1;
        }
        .cme-kpi-blue { border-left-color: #0284c7; }
        .cme-kpi-emerald { border-left-color: #10b981; }
        .cme-kpi-purple { border-left-color: #8b5cf6; }
        .cme-kpi-amber { border-left-color: #f59e0b; }
        .cme-kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .cme-kpi-val { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 4px 0; }
        .cme-kpi-sub { font-size: 0.875rem; font-weight: 500; color: #64748b; }
        .cme-kpi-desc { font-size: 0.75rem; color: #94a3b8; }
        .cme-kpi-icon { font-size: 24px; opacity: 0.3; }

        /* Tabs */
        .cme-tabs {
            display: flex; gap: 8px; margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;
        }
        .cme-tab-btn {
            background: transparent; border: none; padding: 10px 16px;
            font-size: 0.9375rem; font-weight: 600; color: #64748b;
            border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
            transition: all 0.15s ease;
        }
        .cme-tab-btn:hover { background: #f1f5f9; color: #0f172a; }
        .cme-tab-btn.active { background: #0284c7; color: #ffffff; }

        .cme-panel { display: none; }
        .cme-panel.active { display: block; }

        /* Tracker Grid */
        .cme-track-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 18px;
        }
        .cme-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
            padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            display: flex; flex-direction: column; gap: 14px;
        }
        .cme-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .cme-card-staff { display: flex; align-items: center; gap: 10px; }
        .cme-card-avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: #e0f2fe; color: #0284c7;
            display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .cme-card-name { font-weight: 800; font-size: 1rem; color: #0f172a; }
        .cme-card-dept { font-size: 0.75rem; color: #64748b; }
        .cme-license-title { font-size: 0.8125rem; font-weight: 600; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 6px; }

        /* Progress Bar */
        .cme-prog-block { display: flex; flex-direction: column; gap: 6px; }
        .cme-prog-header { display: flex; justify-content: space-between; font-size: 0.8125rem; }
        .cme-prog-label { color: #64748b; font-weight: 600; }
        .cme-prog-track { width: 100%; height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
        .cme-prog-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
        .cme-prog-footer { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; }

        .cme-card-footer {
            display: flex; justify-content: space-between; align-items: center;
            border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 4px;
        }
        .cme-due-badge { font-size: 0.75rem; color: #475569; display: flex; align-items: center; gap: 6px; }
        .cme-due-crit { color: #dc2626; font-weight: 700; }

        /* Badges */
        .cme-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.6875rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
        .cme-b-comp { background: #dcfce7; color: #166534; }
        .cme-b-track { background: #e0f2fe; color: #0369a1; }
        .cme-b-behind { background: #fef3c7; color: #92400e; }
        .cme-b-crit { background: #fee2e2; color: #991b1b; }
        .cme-b-conf { background: #e0e7ff; color: #4338ca; }
        .cme-b-symp { background: #f3e8ff; color: #7e22ce; }
        .cme-b-work { background: #fef3c7; color: #b45309; }
        .cme-b-web { background: #f0fdf4; color: #15803d; }
        .cme-b-rounds { background: #f1f5f9; color: #334155; }
        .cme-badge-cat { font-size: 0.6875rem; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; }
        .cme-code-badge { font-family: monospace; font-weight: 700; color: #0284c7; background: rgba(2, 132, 199, 0.08); padding: 2px 6px; border-radius: 4px; }

        /* Filter Bar */
        .cme-filter-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 12px 18px; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .cme-filter-group { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .cme-select, .cme-input {
            padding: 6px 10px; font-size: 0.8125rem; border: 1px solid #cbd5e1;
            border-radius: 6px; background: #ffffff; color: #0f172a;
        }
        .cme-search-box { position: relative; min-width: 280px; }
        .cme-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; }
        .cme-search-input { width: 100%; padding-left: 30px; box-sizing: border-box; }

        /* Tables */
        .cme-table-container {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .cme-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .cme-table th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .cme-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .cme-table tr:hover td { background: #fafafa; }
        .cme-actions { display: flex; gap: 6px; }

        /* Profile & Vault */
        .cme-prof-container { display: flex; flex-direction: column; gap: 16px; }
        .cme-prof-header {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
            flex-wrap: wrap; gap: 12px;
        }
        .cme-prof-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
            padding: 20px; display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-wrap: wrap; gap: 16px;
        }
        .cme-prof-info { display: flex; align-items: center; gap: 14px; }
        .cme-prof-avatar {
            width: 48px; height: 48px; border-radius: 50%;
            background: #e0f2fe; color: #0284c7;
            display: flex; align-items: center; justify-content: center; font-size: 22px;
        }
        .cme-prof-name { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
        .cme-prof-meta { font-size: 0.8125rem; color: #64748b; margin-top: 2px; }
        .cme-prof-prog-box { min-width: 300px; }

        .cme-cat-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;
        }
        .cme-cat-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .cme-cat-title { font-size: 0.75rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px; }
        .cme-cat-val { font-size: 1.375rem; font-weight: 800; color: #0f172a; margin: 4px 0; }
        .cme-cat-sub { font-size: 0.75rem; color: #64748b; font-weight: 500; }
        .cme-cat-desc { font-size: 0.6875rem; color: #94a3b8; }

        /* Modal */
        .cme-modal-backdrop {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.65); display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(2px);
        }
        .cme-modal-box {
            background: #ffffff; border-radius: 12px; width: 100%; max-width: 600px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; max-height: 90vh;
            display: flex; flex-direction: column;
        }
        .cme-modal-lg { max-width: 850px; }
        .cme-modal-header {
            padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }
        .cme-modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .cme-modal-close { background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

        .cme-form { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .cme-form-row { display: flex; gap: 14px; }
        .cme-form-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .cme-form-group label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .cme-req { color: #dc2626; }
        .cme-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

        /* Printable Transcript */
        .cme-printable-content { padding: 24px; overflow-y: auto; background: #f8fafc; }
        .cme-sheet {
            background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
            padding: 28px; color: #000000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .cme-sheet-header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px;
        }
        .cme-sh-brand { display: flex; align-items: center; gap: 12px; }
        .cme-sh-logo { font-size: 32px; color: #0284c7; }
        .cme-sh-title { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.01em; }
        .cme-sh-sub { font-size: 0.75rem; font-weight: 700; color: #475569; letter-spacing: 0.5px; }
        .cme-sh-meta { font-size: 0.8125rem; text-align: right; }

        .cme-emp-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
            padding: 12px 16px; margin-bottom: 18px; font-size: 0.8125rem;
        }
        .cme-lbl { color: #64748b; font-size: 0.75rem; }

        .cme-print-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .cme-print-table th, .cme-print-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        .cme-print-table th { background: #f1f5f9; font-weight: 700; }

        .cme-signatures { display: flex; justify-content: space-around; margin-top: 36px; }
        .cme-sig { text-align: center; font-size: 0.75rem; font-weight: 600; width: 220px; }
        .cme-sig-line { border-bottom: 1px solid #000000; margin-bottom: 6px; }

        @media print {
            body * { visibility: hidden; }
            #cmeModalTranscript, #cmeModalTranscript * { visibility: visible; }
            #cmeModalTranscript { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
            .cme-modal-header { display: none; }
            .cme-sheet { border: none; box-shadow: none; padding: 0; }
        }
    `;

    document.head.appendChild(style);
}
