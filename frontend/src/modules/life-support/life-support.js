/**
 * Life Support Clinical Certifications Tracker
 * BLS, ACLS, PALS, ATLS, NRP Expiration Countdown & Automated Recertification Reminders
 * Schema: hr_life_support_certifications, hr_life_support_requirements, hr_life_support_reminders
 */

import { api } from "../../core/api.js";

let state = {
    activeTab: "countdown", // 'countdown' | 'matrix' | 'ledger' | 'reminders'
    certTypeFilter: "",
    statusTierFilter: "",
    departmentFilter: "",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedCert: null,
    editingCertId: null
};

let cache = {
    metrics: null,
    certsData: { total: 0, records: [] },
    matrixData: { matrix: [], total_requirements: 0 },
    remindersData: { total: 0, reminders: [] },
    metadata: { staff: [], departments: [], cert_types: {}, issuing_organizations: [] }
};

export function LifeSupportView() {
    return `
        <div class="life-support-container" style="padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div id="lsNotificationArea"></div>

            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Clinical Resuscitation Governance</span>
                        <span style="color: #64748b; font-size: 13px;">Subsystem 7: HR &amp; Workforce</span>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Life Support Clinical Certifications Tracker</h1>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Automated expiration monitoring, countdown alerts, and recertification reminders for BLS, ACLS, PALS, ATLS, and NRP.</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btnRunScanner" class="btn-action" style="background: #0284c7; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
                        <i class="fas fa-satellite-dish"></i> Run Automated Expiration Scanner
                    </button>
                    <button id="btnOpenNewCertModal" class="btn-action" style="background: #10b981; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(16,185,129,0.2);">
                        <i class="fas fa-plus-circle"></i> Log Life Support Certificate
                    </button>
                </div>
            </div>

            <!-- Executive KPI Summary Cards -->
            <div id="lsKpiSection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderKpiCards()}
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; gap: 8px; flex-wrap: wrap;">
                <button class="ls-tab-btn ${state.activeTab === 'countdown' ? 'active' : ''}" data-tab="countdown" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'countdown' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'countdown' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-hourglass-half"></i> Expiration Countdown Tracker
                </button>
                <button class="ls-tab-btn ${state.activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'matrix' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'matrix' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-shield-alt"></i> Clinical Privilege &amp; Role Matrix
                </button>
                <button class="ls-tab-btn ${state.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'ledger' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'ledger' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-table"></i> All Certificates Ledger
                </button>
                <button class="ls-tab-btn ${state.activeTab === 'reminders' ? 'active' : ''}" data-tab="reminders" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'reminders' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'reminders' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-bell"></i> Recertification Reminders Log
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="lsTabContent">
                ${renderActiveTabContent()}
            </div>

            <!-- Modals Container -->
            <div id="lsModalContainer"></div>
        </div>
    `;
}

/**
 * Initialize Module
 */
export async function initLifeSupport() {
    await loadInitialData();
    bindEvents();
}

/**
 * Fetch Data
 */
async function loadInitialData() {
    try {
        const [metaRes, metricsRes, certsRes, matrixRes, remRes] = await Promise.all([
            api('/life-support/metadata').catch(() => null),
            api('/life-support/metrics').catch(() => null),
            api(`/life-support/certifications?cert_type=${state.certTypeFilter}&status_tier=${state.statusTierFilter}&department_name=${encodeURIComponent(state.departmentFilter)}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api('/life-support/matrix').catch(() => null),
            api('/life-support/reminders?page=1&per_page=15').catch(() => null)
        ]);

        if (metaRes?.data) cache.metadata = metaRes.data;
        if (metricsRes?.data) cache.metrics = metricsRes.data;
        if (certsRes?.data) cache.certsData = certsRes.data;
        if (matrixRes?.data) cache.matrixData = matrixRes.data;
        if (remRes?.data) cache.remindersData = remRes.data;

        renderApp();
    } catch (err) {
        showToast('Error loading life support certification data: ' + err.message, 'error');
    }
}

function renderApp() {
    const kpiEl = document.getElementById('lsKpiSection');
    if (kpiEl) kpiEl.innerHTML = renderKpiCards();

    const contentEl = document.getElementById('lsTabContent');
    if (contentEl) contentEl.innerHTML = renderActiveTabContent();

    updateTabButtons();
}

function updateTabButtons() {
    document.querySelectorAll('.ls-tab-btn').forEach(btn => {
        const t = btn.getAttribute('data-tab');
        const isActive = t === state.activeTab;
        btn.style.color = isActive ? '#0284c7' : '#64748b';
        btn.style.borderBottom = `3px solid ${isActive ? '#0284c7' : 'transparent'}`;
    });
}

/**
 * Render Executive KPI Cards
 */
function renderKpiCards() {
    const m = cache.metrics || {
        total_certs: 0,
        active_compliant: 0,
        expiring_soon: 0,
        critical_7_day: 0,
        expired_count: 0,
        compliance_rate: 100,
        type_breakdown: {}
    };

    return `
        <!-- Card 1: Total & Compliance -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #0284c7;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Life Support Compliance</span>
                <span style="font-size: 18px; color: #0284c7;"><i class="fas fa-heartbeat"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${m.compliance_rate}%</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                <strong>${m.active_compliant}</strong> compliant of <strong>${m.total_certs}</strong> active credentials
            </div>
        </div>

        <!-- Card 2: Expiring in 60 Days / 30 Days -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Expiring Soon (&le; 60d)</span>
                <span style="font-size: 18px; color: #f59e0b;"><i class="fas fa-clock"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #d97706;">${m.expiring_soon}</div>
            <div style="font-size: 12px; color: #b45309; margin-top: 4px;">
                Formal recertification reminders active
            </div>
        </div>

        <!-- Card 3: Critical (7-Day Risk) -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #ef4444;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Critical Expiration (&le; 7d)</span>
                <span style="font-size: 18px; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #dc2626;">${m.critical_7_day}</div>
            <div style="font-size: 12px; color: #991b1b; margin-top: 4px;">
                Imminent resuscitation privilege hold risk
            </div>
        </div>

        <!-- Card 4: Expired / Grace Period -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #7c3aed;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Expired / In Grace</span>
                <span style="font-size: 18px; color: #7c3aed;"><i class="fas fa-ban"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #6d28d9;">${m.expired_count}</div>
            <div style="font-size: 12px; color: #5b21b6; margin-top: 4px;">
                Active clinical reassignments / restrictions
            </div>
        </div>
    `;
}

/**
 * Render Tab Content
 */
function renderActiveTabContent() {
    switch (state.activeTab) {
        case 'countdown':
            return renderCountdownTab();
        case 'matrix':
            return renderMatrixTab();
        case 'ledger':
            return renderLedgerTab();
        case 'reminders':
            return renderRemindersTab();
        default:
            return renderCountdownTab();
    }
}

/**
 * TAB 1: Visual Expiration Countdown Cards
 */
function renderCountdownTab() {
    const records = cache.certsData?.records || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 200px;">
                <input type="text" id="cdSearchInput" placeholder="Search staff, role, certificate #..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 150px;">
                <select id="cdCertTypeFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Certifications (BLS, ACLS...)</option>
                    <option value="BLS" ${state.certTypeFilter === 'BLS' ? 'selected' : ''}>BLS (Basic Life Support)</option>
                    <option value="ACLS" ${state.certTypeFilter === 'ACLS' ? 'selected' : ''}>ACLS (Advanced Cardiac)</option>
                    <option value="PALS" ${state.certTypeFilter === 'PALS' ? 'selected' : ''}>PALS (Pediatric Advanced)</option>
                    <option value="ATLS" ${state.certTypeFilter === 'ATLS' ? 'selected' : ''}>ATLS (Trauma Life Support)</option>
                    <option value="NRP" ${state.certTypeFilter === 'NRP' ? 'selected' : ''}>NRP (Neonatal Resuscitation)</option>
                </select>
            </div>
            <div style="min-width: 160px;">
                <select id="cdTierFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Expiration Tiers</option>
                    <option value="critical" ${state.statusTierFilter === 'critical' ? 'selected' : ''}>Critical (&le; 7 Days)</option>
                    <option value="expiring_soon" ${state.statusTierFilter === 'expiring_soon' ? 'selected' : ''}>Expiring Soon (&le; 60 Days)</option>
                    <option value="expired" ${state.statusTierFilter === 'expired' ? 'selected' : ''}>Expired / In Grace</option>
                    <option value="active" ${state.statusTierFilter === 'active' ? 'selected' : ''}>Active &amp; Compliant (&gt; 60 Days)</option>
                </select>
            </div>
            <button id="btnResetFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
            ${records.length === 0 ? `
                <div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: #64748b; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <i class="fas fa-certificate" style="font-size: 36px; margin-bottom: 12px; color: #94a3b8;"></i>
                    <p style="font-size: 15px; margin: 0;">No life support certifications found matching your filter criteria.</p>
                </div>
            ` : records.map(c => renderCountdownCard(c)).join('')}
        </div>
    `;
}

function renderCountdownCard(c) {
    const days = parseInt(c.days_remaining, 10);
    const badge = getCertTypeBadge(c.cert_type);
    const urgency = getUrgencyStyle(c.urgency_badge, days);
    const pct = Math.min(100, Math.max(0, parseFloat(c.lifecycle_pct || 0)));

    return `
        <div style="background: #ffffff; border: 1px solid ${urgency.borderColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; flex-direction: column;">
            <!-- Card Header -->
            <div style="padding: 14px 18px; background: ${urgency.headerBg}; border-bottom: 1px solid ${urgency.borderColor}; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: ${badge.bg}; color: ${badge.color}; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="${badge.icon}"></i> ${c.cert_type}
                    </span>
                    <span style="font-size: 12px; font-family: monospace; color: #475569; font-weight: 600;">${c.certification_code}</span>
                </div>
                <div>
                    <span style="background: ${urgency.badgeBg}; color: ${urgency.badgeColor}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="${urgency.badgeIcon}"></i> ${c.alert_label}
                    </span>
                </div>
            </div>

            <!-- Card Body -->
            <div style="padding: 18px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${escapeHtml(c.staff_name)}</h3>
                    <div style="font-size: 12px; color: #0284c7; font-weight: 600; margin-bottom: 6px;">${escapeHtml(c.staff_role)}</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
                        <i class="fas fa-hospital-alt"></i> ${escapeHtml(c.department_name || 'Hospital Staff')}
                    </div>

                    <!-- Details Table -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="color: #64748b;">Certificate No:</span>
                            <strong style="color: #0f172a; font-family: monospace;">${escapeHtml(c.certificate_number)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="color: #64748b;">Issuing Organization:</span>
                            <span style="color: #334155; text-align: right; font-weight: 500;">${escapeHtml(c.issuing_organization)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="color: #64748b;">Issue Date:</span>
                            <span style="color: #334155;">${c.issue_date}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Expiration Date:</span>
                            <strong style="color: ${urgency.badgeColor};">${c.expiry_date}</strong>
                        </div>
                    </div>

                    <!-- Progress Lifecycle -->
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 4px;">
                            <span>Validity Term: ${c.validity_years} Years</span>
                            <span>${pct}% elapsed</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${urgency.barColor}; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </div>

                <!-- Action Toolbar -->
                <div style="display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 14px; flex-wrap: wrap;">
                    <button class="btnSendReminder" data-id="${c.id}" style="flex: 1; min-width: 130px; padding: 7px 12px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas fa-paper-plane"></i> Send Reminder
                    </button>
                    <button class="btnViewTranscript" data-id="${c.id}" style="padding: 7px 12px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-id-card"></i> eCard
                    </button>
                    <button class="btnEditCert" data-id="${c.id}" style="padding: 7px 10px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btnDeleteCert" data-id="${c.id}" style="padding: 7px 10px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * TAB 2: Clinical Privilege & Department Role Matrix
 */
function renderMatrixTab() {
    const departments = cache.matrixData?.matrix || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Mandatory Clinical Role Requirements Matrix</h2>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">Verification of mandatory life support certifications required before roster assignment to Code Blue and resuscitation teams.</p>
                </div>
                <div style="display: flex; gap: 10px; font-size: 12px;">
                    <span style="display: inline-flex; align-items: center; gap: 5px; color: #166534;"><i class="fas fa-check-circle" style="color: #16a34a;"></i> 100% Compliant</span>
                    <span style="display: inline-flex; align-items: center; gap: 5px; color: #991b1b;"><i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i> Privileging Gap / Expired</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${departments.map(dept => `
                    <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                        <div style="background: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; font-size: 15px; color: #0f172a;">
                                <i class="fas fa-clinic-medical" style="color: #0284c7; margin-right: 8px;"></i> ${escapeHtml(dept.department_name)}
                            </span>
                            <span style="font-size: 12px; color: #64748b;">${dept.roles.length} Clinical Roles Defined</span>
                        </div>
                        <div style="padding: 16px;">
                            ${dept.roles.map(r => `
                                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; last-child:border-none;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                                        <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${escapeHtml(r.clinical_role)}</div>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Required:</span>
                                            ${r.required_certs.map(rc => `
                                                <span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
                                                    ${rc.cert_type}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                    <!-- Enrolled Staff Under this Role -->
                                    <div style="background: #f8fafc; border-radius: 8px; padding: 10px; font-size: 12px;">
                                        ${r.staff_members.length === 0 ? `
                                            <div style="color: #94a3b8; font-style: italic;">No active clinician records mapped to this role.</div>
                                        ` : r.staff_members.map(s => `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                                                <div>
                                                    <strong style="color: #0f172a;">${escapeHtml(s.name)}</strong>
                                                    <span style="color: #64748b; margin-left: 8px;">(${escapeHtml(s.role)})</span>
                                                </div>
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    ${r.required_certs.map(rc => {
                                                        const userCert = s.certs[rc.cert_type];
                                                        if (!userCert) {
                                                            return `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;"><i class="fas fa-times"></i> Missing ${rc.cert_type}</span>`;
                                                        } else if (!userCert.is_valid) {
                                                            return `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;"><i class="fas fa-exclamation-triangle"></i> Expired ${rc.cert_type}</span>`;
                                                        } else {
                                                            return `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;"><i class="fas fa-check"></i> ${rc.cert_type} Valid (${userCert.days_remaining}d)</span>`;
                                                        }
                                                    }).join('')}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * TAB 3: Comprehensive Ledger Table
 */
function renderLedgerTab() {
    const records = cache.certsData?.records || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    All Life Support Certifications Ledger (${cache.certsData?.total || 0} Registered)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600;">
                            <th style="padding: 12px 16px;">Code</th>
                            <th style="padding: 12px 16px;">Clinician Name</th>
                            <th style="padding: 12px 16px;">Role &amp; Department</th>
                            <th style="padding: 12px 16px;">Cert Type</th>
                            <th style="padding: 12px 16px;">Certificate #</th>
                            <th style="padding: 12px 16px;">Issue Date</th>
                            <th style="padding: 12px 16px;">Expiration Date</th>
                            <th style="padding: 12px 16px;">Days Left</th>
                            <th style="padding: 12px 16px;">Status</th>
                            <th style="padding: 12px 16px; text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="10" style="padding: 30px; text-align: center; color: #94a3b8;">No records found.</td>
                            </tr>
                        ` : records.map(c => {
                            const badge = getCertTypeBadge(c.cert_type);
                            const urgency = getUrgencyStyle(c.urgency_badge, c.days_remaining);
                            return `
                                <tr style="border-bottom: 1px solid #f1f5f9; hover: background #f8fafc;">
                                    <td style="padding: 12px 16px; font-family: monospace; font-weight: 600; color: #0f172a;">${c.certification_code}</td>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">${escapeHtml(c.staff_name)}</td>
                                    <td style="padding: 12px 16px; color: #475569;">
                                        <div>${escapeHtml(c.staff_role)}</div>
                                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(c.department_name)}</div>
                                    </td>
                                    <td style="padding: 12px 16px;">
                                        <span style="background: ${badge.bg}; color: ${badge.color}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                                            ${c.cert_type}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px; font-family: monospace; font-size: 12px;">${escapeHtml(c.certificate_number)}</td>
                                    <td style="padding: 12px 16px; color: #64748b;">${c.issue_date}</td>
                                    <td style="padding: 12px 16px; font-weight: 600; color: ${urgency.badgeColor};">${c.expiry_date}</td>
                                    <td style="padding: 12px 16px;">
                                        <span style="background: ${urgency.badgeBg}; color: ${urgency.badgeColor}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">
                                            ${c.alert_label}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px;">
                                        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${c.verification_status === 'verified' ? '#16a34a' : '#d97706'};">
                                            <i class="fas fa-check-circle"></i> ${c.verification_status}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right;">
                                        <button class="btnSendReminder" data-id="${c.id}" title="Send Recertification Reminder" style="padding: 5px 8px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-paper-plane"></i>
                                        </button>
                                        <button class="btnViewTranscript" data-id="${c.id}" title="View eCard" style="padding: 5px 8px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-id-card"></i>
                                        </button>
                                        <button class="btnEditCert" data-id="${c.id}" title="Edit" style="padding: 5px 8px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btnDeleteCert" data-id="${c.id}" title="Delete" style="padding: 5px 8px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 4px; cursor: pointer;">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * TAB 4: Recertification Reminders Audit Log
 */
function renderRemindersTab() {
    const reminders = cache.remindersData?.reminders || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Automated Recertification Reminders Log</h2>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">Audit record of 90-day, 60-day, 30-day, 7-day, and expiration alert notices dispatched to clinicians and department supervisors.</p>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600;">
                            <th style="padding: 12px 16px;">Dispatched Date</th>
                            <th style="padding: 12px 16px;">Clinician Name</th>
                            <th style="padding: 12px 16px;">Cert Type</th>
                            <th style="padding: 12px 16px;">Tier Alert</th>
                            <th style="padding: 12px 16px;">Channel</th>
                            <th style="padding: 12px 16px;">Message Title</th>
                            <th style="padding: 12px 16px;">Status</th>
                            <th style="padding: 12px 16px; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reminders.length === 0 ? `
                            <tr>
                                <td colspan="8" style="padding: 30px; text-align: center; color: #94a3b8;">No reminders dispatched yet. Run the automated scanner to evaluate expiring credentials.</td>
                            </tr>
                        ` : reminders.map(r => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">${r.dispatched_at}</td>
                                <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">${escapeHtml(r.staff_name)}</td>
                                <td style="padding: 12px 16px;">
                                    <span style="background: #e2e8f0; color: #1e293b; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                                        ${r.cert_type}
                                    </span>
                                </td>
                                <td style="padding: 12px 16px;">
                                    ${formatReminderTierBadge(r.reminder_tier)}
                                </td>
                                <td style="padding: 12px 16px; font-size: 12px; color: #475569;">
                                    <i class="fas fa-${r.notification_channel === 'email' ? 'envelope' : (r.notification_channel === 'clinical_director_alert' ? 'exclamation-circle' : 'bell')}"></i>
                                    ${r.notification_channel}
                                </td>
                                <td style="padding: 12px 16px; font-size: 12px; color: #1e293b; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(r.message_title)}
                                </td>
                                <td style="padding: 12px 16px;">
                                    <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; background: ${r.status === 'acknowledged' ? '#dcfce7' : '#f1f5f9'}; color: ${r.status === 'acknowledged' ? '#166534' : '#475569'};">
                                        ${r.status}
                                    </span>
                                </td>
                                <td style="padding: 12px 16px; text-align: right;">
                                    ${r.status !== 'acknowledged' ? `
                                        <button class="btnAckReminder" data-id="${r.id}" style="padding: 5px 10px; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
                                            Acknowledge
                                        </button>
                                    ` : `
                                        <span style="font-size: 11px; color: #16a34a;"><i class="fas fa-check"></i> Noted</span>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Event Bindings
 */
function bindEvents() {
    const container = document.querySelector('.life-support-container');
    if (!container) return;

    // Tab buttons
    container.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.ls-tab-btn');
        if (tabBtn) {
            state.activeTab = tabBtn.getAttribute('data-tab');
            renderApp();
            return;
        }

        // Run automated scanner
        if (e.target.closest('#btnRunScanner')) {
            await triggerAutomatedScanner();
            return;
        }

        // Open new cert modal
        if (e.target.closest('#btnOpenNewCertModal')) {
            openCertFormModal();
            return;
        }

        // Edit cert
        const btnEdit = e.target.closest('.btnEditCert');
        if (btnEdit) {
            const id = parseInt(btnEdit.getAttribute('data-id'), 10);
            openCertFormModal(id);
            return;
        }

        // Delete cert
        const btnDel = e.target.closest('.btnDeleteCert');
        if (btnDel) {
            const id = parseInt(btnDel.getAttribute('data-id'), 10);
            if (confirm("Are you sure you want to permanently delete this life support certification record?")) {
                await deleteCertification(id);
            }
            return;
        }

        // Send manual reminder
        const btnRem = e.target.closest('.btnSendReminder');
        if (btnRem) {
            const id = parseInt(btnRem.getAttribute('data-id'), 10);
            openManualReminderModal(id);
            return;
        }

        // View transcript / eCard
        const btnTranscript = e.target.closest('.btnViewTranscript');
        if (btnTranscript) {
            const id = parseInt(btnTranscript.getAttribute('data-id'), 10);
            openTranscriptModal(id);
            return;
        }

        // Acknowledge reminder
        const btnAck = e.target.closest('.btnAckReminder');
        if (btnAck) {
            const id = parseInt(btnAck.getAttribute('data-id'), 10);
            await acknowledgeReminder(id);
            return;
        }

        // Reset filters
        if (e.target.closest('#btnResetFilters')) {
            state.searchQuery = "";
            state.certTypeFilter = "";
            state.statusTierFilter = "";
            state.departmentFilter = "";
            await loadInitialData();
            return;
        }
    });

    // Inputs on change/input
    container.addEventListener('change', async (e) => {
        if (e.target.id === 'cdCertTypeFilter') {
            state.certTypeFilter = e.target.value;
            await loadInitialData();
        } else if (e.target.id === 'cdTierFilter') {
            state.statusTierFilter = e.target.value;
            await loadInitialData();
        }
    });

    container.addEventListener('keydown', async (e) => {
        if (e.target.id === 'cdSearchInput' && e.key === 'Enter') {
            state.searchQuery = e.target.value.trim();
            await loadInitialData();
        }
    });
}

/**
 * Trigger Automated Expiration Scanner
 */
async function triggerAutomatedScanner() {
    const btn = document.getElementById('btnRunScanner');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Scanning Certifications...`;
    }

    try {
        const res = await api('/life-support/scan-expirations', 'POST');
        if (res?.data) {
            showToast(res.message || "Automated scan finished successfully.", "success");
            await loadInitialData();
        }
    } catch (err) {
        showToast("Scanner failed: " + err.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-satellite-dish"></i> Run Automated Expiration Scanner`;
        }
    }
}

/**
 * Delete Certification
 */
async function deleteCertification(id) {
    try {
        await api('/life-support/certifications/delete', 'POST', { id });
        showToast("Life support certification deleted successfully.", "success");
        await loadInitialData();
    } catch (err) {
        showToast("Failed to delete record: " + err.message, "error");
    }
}

/**
 * Acknowledge Reminder
 */
async function acknowledgeReminder(id) {
    try {
        await api('/life-support/reminders/acknowledge', 'POST', { id });
        showToast("Reminder acknowledged.", "success");
        const remRes = await api('/life-support/reminders?page=1&per_page=15');
        if (remRes?.data) cache.remindersData = remRes.data;
        renderApp();
    } catch (err) {
        showToast("Error acknowledging reminder: " + err.message, "error");
    }
}

/**
 * MODAL: Add / Edit Certification
 */
async function openCertFormModal(id = null) {
    let cert = null;
    if (id) {
        try {
            const res = await api(`/life-support/certifications/${id}`);
            cert = res?.data?.certification;
        } catch (e) {
            showToast("Failed to load certificate detail: " + e.message, "error");
            return;
        }
    }

    const modalBox = document.getElementById('lsModalContainer');
    if (!modalBox) return;

    const staffList = cache.metadata?.staff || [];
    const depts = cache.metadata?.departments || [];

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
                        ${cert ? 'Edit Life Support Certificate' : 'Log Life Support Clinical Certificate'}
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>
                <form id="lsCertForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${cert?.id || ''}" />

                    <!-- Clinician Select -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Clinician / Employee *</label>
                        <select name="employee_id" id="formEmployeeSelect" required style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="">Select Hospital Clinician...</option>
                            ${staffList.map(s => `
                                <option value="${s.id}" data-name="${s.full_name}" data-dept="${s.department_name || ''}" ${cert?.employee_id == s.id ? 'selected' : ''}>
                                    ${escapeHtml(s.full_name)} (${s.department_name || 'Staff'})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Staff Clinical Role</label>
                            <input type="text" name="staff_role" id="formStaffRole" value="${escapeHtml(cert?.staff_role || '')}" placeholder="e.g. Attending Emergency Physician" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Department Name</label>
                            <input type="text" name="department_name" id="formDeptName" value="${escapeHtml(cert?.department_name || '')}" placeholder="e.g. Emergency Department" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Cert Type & Issuing Org -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Certification Type *</label>
                            <select name="cert_type" id="formCertType" required style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
                                <option value="BLS" ${cert?.cert_type === 'BLS' ? 'selected' : ''}>BLS - Basic Life Support</option>
                                <option value="ACLS" ${cert?.cert_type === 'ACLS' ? 'selected' : ''}>ACLS - Advanced Cardiac</option>
                                <option value="PALS" ${cert?.cert_type === 'PALS' ? 'selected' : ''}>PALS - Pediatric Advanced</option>
                                <option value="ATLS" ${cert?.cert_type === 'ATLS' ? 'selected' : ''}>ATLS - Trauma Life Support</option>
                                <option value="NRP" ${cert?.cert_type === 'NRP' ? 'selected' : ''}>NRP - Neonatal Resuscitation</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Issuing Organization</label>
                            <input type="text" name="issuing_organization" value="${escapeHtml(cert?.issuing_organization || 'American Heart Association (AHA)')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Certificate Number & eCard -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Certificate Number *</label>
                            <input type="text" name="certificate_number" required value="${escapeHtml(cert?.certificate_number || '')}" placeholder="e.g. AHA-ACL-991048" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">eCard Verification Code</label>
                            <input type="text" name="ecard_code" value="${escapeHtml(cert?.ecard_code || '')}" placeholder="e.g. EC-ACL-2025-VANCE" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                        </div>
                    </div>

                    <!-- Issue Date & Expiry Date -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Issue Date *</label>
                            <input type="date" name="issue_date" id="formIssueDate" required value="${cert?.issue_date || new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Validity Years</label>
                            <input type="number" name="validity_years" id="formValidityYears" min="1" max="10" value="${cert?.validity_years || 2}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Expiration Date</label>
                            <input type="date" name="expiry_date" id="formExpiryDate" value="${cert?.expiry_date || ''}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Instructor & Training Site -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Instructor Name</label>
                            <input type="text" name="instructor_name" value="${escapeHtml(cert?.instructor_name || '')}" placeholder="Certified AHA/ACS Instructor" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Training Site / Simulation Center</label>
                            <input type="text" name="training_site" value="${escapeHtml(cert?.training_site || 'Hospital Simulation & Resuscitation Center')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Notes -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Notes / Verification Details</label>
                        <textarea name="notes" rows="2" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(cert?.notes || '')}</textarea>
                    </div>

                    <!-- Form Buttons -->
                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnCancelModal" style="padding: 10px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 10px 20px; background: #0284c7; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Save Life Support Certificate</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Hook auto-fill on clinician change
    const empSelect = document.getElementById('formEmployeeSelect');
    if (empSelect) {
        empSelect.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.value) {
                const deptName = opt.getAttribute('data-dept');
                if (deptName) {
                    const deptInput = document.getElementById('formDeptName');
                    if (deptInput && !deptInput.value) deptInput.value = deptName;
                }
            }
        });
    }

    // Hook auto-calc expiry on cert type or issue date change
    const certTypeSel = document.getElementById('formCertType');
    const validityInput = document.getElementById('formValidityYears');
    const issueDateInput = document.getElementById('formIssueDate');
    const expiryInput = document.getElementById('formExpiryDate');

    function updateCalculatedExpiry() {
        const type = certTypeSel.value;
        const yrs = (type === 'ATLS') ? 4 : 2;
        if (!validityInput.value || certTypeSel.value !== cert?.cert_type) {
            validityInput.value = yrs;
        }
        if (issueDateInput.value) {
            const d = new Date(issueDateInput.value);
            d.setFullYear(d.getFullYear() + parseInt(validityInput.value, 10));
            expiryInput.value = d.toISOString().split('T')[0];
        }
    }

    certTypeSel.addEventListener('change', updateCalculatedExpiry);
    issueDateInput.addEventListener('change', updateCalculatedExpiry);
    validityInput.addEventListener('change', updateCalculatedExpiry);

    // Close buttons
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    // Submit handler
    document.getElementById('lsCertForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());

        // Derive staff name if not set
        if (!data.staff_name && data.employee_id) {
            const opt = empSelect.options[empSelect.selectedIndex];
            data.staff_name = opt ? opt.getAttribute('data-name') : '';
        }

        try {
            const endpoint = data.id ? '/life-support/certifications/update' : '/life-support/certifications';
            await api(endpoint, 'POST', data);
            showToast("Life support certification saved successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to save: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Manual On-Demand Reminder
 */
async function openManualReminderModal(id) {
    let cert = null;
    try {
        const res = await api(`/life-support/certifications/${id}`);
        cert = res?.data?.certification;
    } catch (e) {
        showToast("Error retrieving certification: " + e.message, "error");
        return;
    }

    const modalBox = document.getElementById('lsModalContainer');
    if (!modalBox || !cert) return;

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">
                        <i class="fas fa-paper-plane" style="color: #0284c7; margin-right: 6px;"></i> Send Recertification Reminder
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>
                <form id="lsReminderForm" style="padding: 24px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                        <div><strong>Recipient:</strong> ${escapeHtml(cert.staff_name)} (${escapeHtml(cert.staff_role)})</div>
                        <div><strong>Certification:</strong> ${cert.cert_type} (#${escapeHtml(cert.certificate_number)})</div>
                        <div><strong>Expiration:</strong> ${cert.expiry_date} (${cert.days_remaining} days left)</div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Notification Channel</label>
                        <select name="notification_channel" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="in_app">In-App Dashboard Alert &amp; Clinician Portal</option>
                            <option value="email">Official Medical Staff Email</option>
                            <option value="clinical_director_alert">Escalate to Clinical Director / Roster Supervisor</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Custom Director Note (Optional)</label>
                        <textarea name="custom_notes" rows="3" placeholder="Add specific scheduling instructions or hands-on simulation station test dates..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnCancelModal" style="padding: 9px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 9px 18px; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Dispatch Reminder</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    document.getElementById('lsReminderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        try {
            await api(`/life-support/remind`, 'POST', { id, ...payload });
            showToast("Recertification reminder dispatched successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to dispatch: " + err.message, "error");
        }
    });
}

/**
 * MODAL: eCard / Wallet Verification Card
 */
async function openTranscriptModal(id) {
    let detail = null;
    try {
        const res = await api(`/life-support/certifications/${id}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading eCard: " + e.message, "error");
        return;
    }

    const cert = detail?.certification;
    const modalBox = document.getElementById('lsModalContainer');
    if (!modalBox || !cert) return;

    const badge = getCertTypeBadge(cert.cert_type);

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden;">
                <div style="padding: 16px 20px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-id-badge" style="color: #38bdf8;"></i>
                        <span style="font-weight: 700; font-size: 14px;">Official Clinical Resuscitation eCard Verification</span>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="printArea" style="padding: 24px; font-family: -apple-system, sans-serif;">
                    <!-- Visual Wallet eCard -->
                    <div style="border: 2px solid ${badge.bg}; border-radius: 12px; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
                            <div>
                                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Hospital Clinical Governance</div>
                                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${cert.issuing_organization}</div>
                            </div>
                            <span style="background: ${badge.bg}; color: ${badge.color}; font-size: 16px; font-weight: 900; padding: 6px 14px; border-radius: 8px;">
                                ${cert.cert_type}
                            </span>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Clinician Name</div>
                            <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${escapeHtml(cert.staff_name)}</div>
                            <div style="font-size: 13px; color: #0284c7; font-weight: 600;">${escapeHtml(cert.staff_role)}</div>
                            <div style="font-size: 12px; color: #64748b;">${escapeHtml(cert.department_name)}</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; margin-bottom: 16px;">
                            <div>
                                <span style="color: #64748b; display: block;">Certificate Number:</span>
                                <strong style="font-family: monospace; font-size: 13px;">${escapeHtml(cert.certificate_number)}</strong>
                            </div>
                            <div>
                                <span style="color: #64748b; display: block;">eCard Online Code:</span>
                                <strong style="font-family: monospace; font-size: 13px;">${escapeHtml(cert.ecard_code || 'N/A')}</strong>
                            </div>
                            <div>
                                <span style="color: #64748b; display: block;">Issue Date:</span>
                                <strong>${cert.issue_date}</strong>
                            </div>
                            <div>
                                <span style="color: #64748b; display: block;">Valid Through:</span>
                                <strong style="color: #dc2626;">${cert.expiry_date}</strong>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b;">
                            <div>
                                <div>Training Center: ${escapeHtml(cert.training_site || 'Hospital Center')}</div>
                                <div>Instructor: ${escapeHtml(cert.instructor_name || 'Authorized Lead')}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #16a34a; font-weight: 700;"><i class="fas fa-shield-check"></i> PRIMARY SOURCE VERIFIED</div>
                                <div style="font-size: 10px;">Medical Staff Office</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="btnPrintCard" style="padding: 9px 18px; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-print"></i> Print eCard
                    </button>
                    <button id="btnCancelModal" style="padding: 9px 16px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    document.getElementById('btnPrintCard').addEventListener('click', () => {
        window.print();
    });
}

function closeModal() {
    const modalBox = document.getElementById('lsModalContainer');
    if (modalBox) modalBox.innerHTML = '';
}

/**
 * Helpers
 */
function getCertTypeBadge(type) {
    switch (type) {
        case 'BLS':
            return { bg: '#e0f2fe', color: '#0369a1', icon: 'fas fa-heartbeat' };
        case 'ACLS':
            return { bg: '#fee2e2', color: '#b91c1c', icon: 'fas fa-wave-square' };
        case 'PALS':
            return { bg: '#f3e8ff', color: '#7e22ce', icon: 'fas fa-child' };
        case 'ATLS':
            return { bg: '#fef3c7', color: '#b45309', icon: 'fas fa-shield-alt' };
        case 'NRP':
            return { bg: '#dcfce7', color: '#15803d', icon: 'fas fa-baby' };
        default:
            return { bg: '#f1f5f9', color: '#475569', icon: 'fas fa-certificate' };
    }
}

function getUrgencyStyle(urgencyBadge, days) {
    switch (urgencyBadge) {
        case 'critical':
            return {
                borderColor: '#fca5a5',
                headerBg: '#fef2f2',
                badgeBg: '#fee2e2',
                badgeColor: '#dc2626',
                badgeIcon: 'fas fa-exclamation-triangle',
                barColor: '#dc2626'
            };
        case 'urgent':
            return {
                borderColor: '#fed7aa',
                headerBg: '#fffbeb',
                badgeBg: '#ffedd5',
                badgeColor: '#c2410c',
                badgeIcon: 'fas fa-clock',
                barColor: '#ea580c'
            };
        case 'expiring_soon':
            return {
                borderColor: '#fde68a',
                headerBg: '#fffdf5',
                badgeBg: '#fef3c7',
                badgeColor: '#d97706',
                badgeIcon: 'fas fa-info-circle',
                barColor: '#f59e0b'
            };
        case 'grace_period':
            return {
                borderColor: '#ddd6fe',
                headerBg: '#f5f3ff',
                badgeBg: '#ede9fe',
                badgeColor: '#6d28d9',
                badgeIcon: 'fas fa-history',
                barColor: '#7c3aed'
            };
        case 'expired':
            return {
                borderColor: '#cbd5e1',
                headerBg: '#f8fafc',
                badgeBg: '#fee2e2',
                badgeColor: '#991b1b',
                badgeIcon: 'fas fa-ban',
                barColor: '#991b1b'
            };
        default:
            return {
                borderColor: '#e2e8f0',
                headerBg: '#f8fafc',
                badgeBg: '#dcfce7',
                badgeColor: '#166534',
                badgeIcon: 'fas fa-check-circle',
                barColor: '#10b981'
            };
    }
}

function formatReminderTierBadge(tier) {
    switch (tier) {
        case '7_day_critical':
            return `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">CRITICAL 7-DAY</span>`;
        case '30_day_urgent':
            return `<span style="background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">URGENT 30-DAY</span>`;
        case '60_day_notice':
            return `<span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">60-DAY ADVISORY</span>`;
        case '90_day_notice':
            return `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">90-DAY NOTICE</span>`;
        case 'expired_lapse':
            return `<span style="background: #7f1d1d; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">EXPIRED LAPSE</span>`;
        default:
            return `<span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${tier}</span>`;
    }
}

function showToast(msg, type = "info") {
    const el = document.getElementById('lsNotificationArea');
    if (!el) return;

    const bg = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#0284c7');
    el.innerHTML = `
        <div style="background: ${bg}; color: #ffffff; padding: 12px 18px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <span>${escapeHtml(msg)}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #ffffff; font-size: 16px; cursor: pointer;">&times;</button>
        </div>
    `;

    setTimeout(() => {
        if (el && el.firstElementChild) el.firstElementChild.remove();
    }, 5000);
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
