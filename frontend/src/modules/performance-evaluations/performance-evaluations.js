/**
 * Periodic Multi-Source Performance Evaluations Module
 * Schema: hr_performance_evaluations
 * 5-Tier Rubric: Clinical Competence, Bedside Manner, Documentation Accuracy, Teamwork & Ethics, Professionalism
 */

import { api } from "../../core/api.js";

let state = {
    activeTab: "evaluations", // 'evaluations' | 'rubric' | 'goals'
    departmentFilter: "",
    cycleFilter: "",
    tierFilter: "",
    evaluatorTypeFilter: "",
    yearFilter: "2026",
    searchQuery: "",
    page: 1,
    perPage: 15
};

let cache = {
    metrics: null,
    evalsData: { total: 0, records: [] },
    metadata: { staff: [], departments: [], cycles: {}, evaluator_types: {}, recommendations: {}, rubric_criteria: {} }
};

export function PerformanceEvaluationsView() {
    return `
        <div class="perf-eval-container" style="padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div id="peNotificationArea"></div>

            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Accreditation Quality Governance</span>
                        <span style="color: #64748b; font-size: 13px;">Subsystem 7: HR, Rostering &amp; Payroll</span>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Periodic Multi-Source Performance Evaluations</h1>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Joint Commission &amp; hospital accreditation appraisal ledger with 5-tier scoring rubric, qualitative strengths, and development goals.</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btnNewEvaluationModal" style="background: #0284c7; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
                        <i class="fas fa-file-signature"></i> Conduct New Evaluation
                    </button>
                </div>
            </div>

            <!-- Executive Summary Cards -->
            <div id="peKpiSection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderKpiCards()}
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; gap: 8px; flex-wrap: wrap;">
                <button class="pe-tab-btn ${state.activeTab === 'evaluations' ? 'active' : ''}" data-tab="evaluations" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'evaluations' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'evaluations' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clipboard-check"></i> Appraisal Ledger &amp; Peer Reviews
                </button>
                <button class="pe-tab-btn ${state.activeTab === 'rubric' ? 'active' : ''}" data-tab="rubric" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'rubric' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'rubric' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-pie"></i> 5-Tier Rubric Quality Analytics
                </button>
                <button class="pe-tab-btn ${state.activeTab === 'goals' ? 'active' : ''}" data-tab="goals" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'goals' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'goals' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-bullseye"></i> Clinician Development Goals &amp; Action Plans
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="peTabContent">
                ${renderActiveTabContent()}
            </div>

            <!-- Modals Container -->
            <div id="peModalContainer"></div>
        </div>
    `;
}

/**
 * Initialize Module
 */
export async function initPerformanceEvaluations() {
    await loadInitialData();
    bindEvents();
}

/**
 * Fetch Data
 */
async function loadInitialData() {
    try {
        const [metaRes, metricsRes, evalsRes] = await Promise.all([
            api('/performance-evaluations/metadata').catch(() => null),
            api(`/performance-evaluations/metrics?year=${state.yearFilter}`).catch(() => null),
            api(`/performance-evaluations?year=${state.yearFilter}&department_id=${state.departmentFilter}&evaluation_cycle=${state.cycleFilter}&performance_tier=${state.tierFilter}&evaluator_type=${state.evaluatorTypeFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null)
        ]);

        if (metaRes?.data) cache.metadata = metaRes.data;
        if (metricsRes?.data) cache.metrics = metricsRes.data;
        if (evalsRes?.data) cache.evalsData = evalsRes.data;

        renderApp();
    } catch (err) {
        showToast('Error loading performance evaluations: ' + err.message, 'error');
    }
}

function renderApp() {
    const kpiEl = document.getElementById('peKpiSection');
    if (kpiEl) kpiEl.innerHTML = renderKpiCards();

    const contentEl = document.getElementById('peTabContent');
    if (contentEl) contentEl.innerHTML = renderActiveTabContent();

    updateTabButtons();
}

function updateTabButtons() {
    document.querySelectorAll('.pe-tab-btn').forEach(btn => {
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
        total_evaluations: 0,
        avg_composite_score: 0,
        high_performer_rate: 0,
        rubric_averages: {},
        tier_distribution: {}
    };

    const avg = parseFloat(m.avg_composite_score || 0).toFixed(2);
    const rub = m.rubric_averages || {};

    return `
        <!-- Card 1: Total Appraisals -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #0284c7;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Appraisals Completed</span>
                <span style="font-size: 18px; color: #0284c7;"><i class="fas fa-user-check"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${m.total_evaluations}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                Evaluated in cycle year <strong>${state.yearFilter}</strong>
            </div>
        </div>

        <!-- Card 2: Composite Hospital Score -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Composite Quality Index</span>
                <span style="font-size: 18px; color: #10b981;"><i class="fas fa-star"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #047857;">${avg} <span style="font-size: 16px; font-weight: 500; color: #64748b;">/ 5.00</span></div>
            <div style="font-size: 12px; color: #059669; margin-top: 4px;">
                ${renderStarRating(avg)} (${m.high_performer_rate}% top tiers)
            </div>
        </div>

        <!-- Card 3: Clinical Competence -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Clinical Competence</span>
                <span style="font-size: 18px; color: #8b5cf6;"><i class="fas fa-stethoscope"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #6d28d9;">${parseFloat(rub.clinical_competence || 0).toFixed(2)}</div>
            <div style="font-size: 12px; color: #5b21b6; margin-top: 4px;">
                Adherence to clinical protocols &amp; safety
            </div>
        </div>

        <!-- Card 4: Bedside Manner & Empathy -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Bedside &amp; Patient Care</span>
                <span style="font-size: 18px; color: #f59e0b;"><i class="fas fa-heart"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #d97706;">${parseFloat(rub.bedside_manner || 0).toFixed(2)}</div>
            <div style="font-size: 12px; color: #b45309; margin-top: 4px;">
                Patient communication &amp; compassion
            </div>
        </div>
    `;
}

/**
 * Render Active Tab
 */
function renderActiveTabContent() {
    switch (state.activeTab) {
        case 'evaluations':
            return renderEvaluationsTab();
        case 'rubric':
            return renderRubricTab();
        case 'goals':
            return renderGoalsTab();
        default:
            return renderEvaluationsTab();
    }
}

/**
 * TAB 1: Evaluation Ledger Table
 */
function renderEvaluationsTab() {
    const records = cache.evalsData?.records || [];
    const depts = cache.metadata?.departments || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 200px;">
                <input type="text" id="peSearchInput" placeholder="Search clinician name, title, evaluator..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 140px;">
                <select id="peDeptFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Departments</option>
                    ${depts.map(d => `<option value="${d.id}" ${state.departmentFilter == d.id ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
                </select>
            </div>
            <div style="min-width: 140px;">
                <select id="peTierFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Performance Tiers</option>
                    <option value="exceptional" ${state.tierFilter === 'exceptional' ? 'selected' : ''}>Exceptional (&ge; 4.50)</option>
                    <option value="exceeds_expectations" ${state.tierFilter === 'exceeds_expectations' ? 'selected' : ''}>Exceeds Expectations (3.50-4.49)</option>
                    <option value="meets_expectations" ${state.tierFilter === 'meets_expectations' ? 'selected' : ''}>Meets Expectations (2.80-3.49)</option>
                    <option value="needs_development" ${state.tierFilter === 'needs_development' ? 'selected' : ''}>Needs Development (2.00-2.79)</option>
                    <option value="unsatisfactory" ${state.tierFilter === 'unsatisfactory' ? 'selected' : ''}>Unsatisfactory (&lt; 2.00)</option>
                </select>
            </div>
            <div style="min-width: 140px;">
                <select id="peCycleFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Cycles</option>
                    <option value="annual" ${state.cycleFilter === 'annual' ? 'selected' : ''}>Annual Appraisal</option>
                    <option value="semi_annual" ${state.cycleFilter === 'semi_annual' ? 'selected' : ''}>Semi-Annual</option>
                    <option value="recredentialing_peer_review" ${state.cycleFilter === 'recredentialing_peer_review' ? 'selected' : ''}>Recredentialing Peer Review</option>
                    <option value="probationary" ${state.cycleFilter === 'probationary' ? 'selected' : ''}>Probationary</option>
                </select>
            </div>
            <button id="btnResetFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- Ledger Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    Employee Appraisals (${cache.evalsData?.total || 0} Documented)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600;">
                            <th style="padding: 12px 16px;">Code</th>
                            <th style="padding: 12px 16px;">Clinician / Staff Member</th>
                            <th style="padding: 12px 16px;">Role &amp; Department</th>
                            <th style="padding: 12px 16px;">Cycle</th>
                            <th style="padding: 12px 16px; text-align: center;">5-Tier Rubric Scores</th>
                            <th style="padding: 12px 16px; text-align: center;">Composite Score</th>
                            <th style="padding: 12px 16px;">Performance Tier</th>
                            <th style="padding: 12px 16px;">Evaluator &amp; Recommendation</th>
                            <th style="padding: 12px 16px; text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="9" style="padding: 36px; text-align: center; color: #94a3b8;">No performance evaluation records found.</td>
                            </tr>
                        ` : records.map(e => {
                            const tierBadge = getTierBadge(e.performance_tier);
                            return `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 16px; font-family: monospace; font-weight: 600; color: #0f172a;">${e.evaluation_code}</td>
                                    <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">${escapeHtml(e.employee_name)}</td>
                                    <td style="padding: 12px 16px; color: #475569;">
                                        <div>${escapeHtml(e.job_title)}</div>
                                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(e.department_name)}</div>
                                    </td>
                                    <td style="padding: 12px 16px; text-transform: capitalize; font-size: 12px; color: #64748b;">
                                        ${formatCycleName(e.evaluation_cycle)}
                                    </td>
                                    <!-- 5-Tier Rubric Pill Breakdown -->
                                    <td style="padding: 12px 16px; text-align: center;">
                                        <div style="display: inline-flex; gap: 4px; font-size: 11px; font-weight: 700;">
                                            <span title="Clinical Competence: ${e.score_clinical_competence}" style="background: #ede9fe; color: #6d28d9; padding: 2px 5px; border-radius: 4px;">C: ${e.score_clinical_competence}</span>
                                            <span title="Bedside Manner: ${e.score_bedside_manner}" style="background: #fef3c7; color: #b45309; padding: 2px 5px; border-radius: 4px;">B: ${e.score_bedside_manner}</span>
                                            <span title="Documentation: ${e.score_documentation_accuracy}" style="background: #e0f2fe; color: #0369a1; padding: 2px 5px; border-radius: 4px;">D: ${e.score_documentation_accuracy}</span>
                                            <span title="Teamwork: ${e.score_teamwork_ethics}" style="background: #dcfce7; color: #15803d; padding: 2px 5px; border-radius: 4px;">T: ${e.score_teamwork_ethics}</span>
                                            <span title="Ethics & Compliance: ${e.score_professionalism_compliance}" style="background: #fce7f3; color: #be185d; padding: 2px 5px; border-radius: 4px;">E: ${e.score_professionalism_compliance}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center;">
                                        <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${e.overall_score}</span>
                                        <span style="font-size: 11px; color: #64748b;"> / 5.0</span>
                                    </td>
                                    <td style="padding: 12px 16px;">
                                        <span style="background: ${tierBadge.bg}; color: ${tierBadge.color}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                            <i class="${tierBadge.icon}"></i> ${tierBadge.label}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px; font-size: 12px;">
                                        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(e.evaluator_name)}</div>
                                        <div style="color: #0284c7; font-size: 11px;">${formatRecommendationLabel(e.evaluator_recommendation)}</div>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right;">
                                        <button class="btnViewReport" data-id="${e.id}" title="View Appraisal Report" style="padding: 5px 8px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-file-alt"></i>
                                        </button>
                                        <button class="btnEditEval" data-id="${e.id}" title="Edit" style="padding: 5px 8px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btnDeleteEval" data-id="${e.id}" title="Delete" style="padding: 5px 8px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 4px; cursor: pointer;">
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
 * TAB 2: 5-Tier Rubric Analytics
 */
function renderRubricTab() {
    const rub = cache.metrics?.rubric_averages || {};
    const tiers = cache.metrics?.tier_distribution || {};

    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Left: Rubric Category Scores -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">5-Tier Accreditation Rubric Performance</h3>
                <p style="font-size: 13px; color: #64748b; margin: 0 0 20px 0;">Average institutional score achieved across key clinical and professional evaluation domains.</p>

                ${renderRubricProgressBar('1. Clinical Competence & Procedural Acumen', rub.clinical_competence || 0, '#8b5cf6', 'Diagnostic precision, crisis management, clinical protocol compliance.')}
                ${renderRubricProgressBar('2. Bedside Manner & Patient Communication', rub.bedside_manner || 0, '#f59e0b', 'Patient empathy, clear explanations, informed consent, active listening.')}
                ${renderRubricProgressBar('3. Documentation Accuracy & Timeliness', rub.documentation_accuracy || 0, '#0284c7', 'SOAP note completeness, electronic sign-off timeliness, CPOE accuracy.')}
                ${renderRubricProgressBar('4. Teamwork & Interprofessional Collaboration', rub.teamwork_ethics || 0, '#10b981', 'Multidisciplinary rounds, closed-loop communication, collegial respect.')}
                ${renderRubricProgressBar('5. Professionalism, Ethics & Compliance', rub.professionalism_compliance || 0, '#ec4899', 'Hospital policy adherence, CME participation, punctuality, code of conduct.')}
            </div>

            <!-- Right: Performance Tier Breakdown -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Clinical Performance Tier Distribution</h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 20px 0;">Breakdown of clinicians classified according to composite accreditation scores.</p>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
                            <span style="font-weight: 700; color: #065f46;"><i class="fas fa-crown" style="color: #10b981; margin-right: 6px;"></i> Exceptional / Role Model (&ge; 4.50)</span>
                            <span style="font-size: 16px; font-weight: 800; color: #047857;">${tiers.exceptional || 0} Staff</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
                            <span style="font-weight: 700; color: #1e40af;"><i class="fas fa-medal" style="color: #3b82f6; margin-right: 6px;"></i> Exceeds Expectations (3.50 - 4.49)</span>
                            <span style="font-size: 16px; font-weight: 800; color: #1d4ed8;">${tiers.exceeds_expectations || 0} Staff</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <span style="font-weight: 700; color: #334155;"><i class="fas fa-check-circle" style="color: #64748b; margin-right: 6px;"></i> Meets Expectations (2.80 - 3.49)</span>
                            <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${tiers.meets_expectations || 0} Staff</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
                            <span style="font-weight: 700; color: #92400e;"><i class="fas fa-exclamation-circle" style="color: #f59e0b; margin-right: 6px;"></i> Needs Development (2.00 - 2.79)</span>
                            <span style="font-size: 16px; font-weight: 800; color: #b45309;">${tiers.needs_development || 0} Staff</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                            <span style="font-weight: 700; color: #991b1b;"><i class="fas fa-times-circle" style="color: #ef4444; margin-right: 6px;"></i> Unsatisfactory (&lt; 2.00) (PIP)</span>
                            <span style="font-size: 16px; font-weight: 800; color: #dc2626;">${tiers.unsatisfactory || 0} Staff</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b;">
                    <i class="fas fa-info-circle" style="color: #0284c7;"></i> Annual evaluation reports are submitted to the Hospital Credentials Committee for triennial clinical privilege renewal and Joint Commission audit compliance.
                </div>
            </div>
        </div>
    `;
}

function renderRubricProgressBar(title, score, color, desc) {
    const s = parseFloat(score || 0).toFixed(2);
    const pct = Math.min(100, Math.max(0, (s / 5.0) * 100));

    return `
        <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 13px; color: #1e293b;">${title}</span>
                <span style="font-weight: 800; font-size: 14px; color: ${color};">${s} <span style="font-size: 11px; color: #64748b;">/ 5.0</span></span>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${desc}</div>
            <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
        </div>
    `;
}

/**
 * TAB 3: Goals & Action Plans
 */
function renderGoalsTab() {
    const records = cache.evalsData?.records || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Clinician Strengths &amp; Actionable Development Goals</h3>
                <p style="font-size: 13px; color: #64748b; margin: 0;">Multi-source documented growth goals and improvement milestones agreed upon during clinical appraisals.</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 18px;">
                ${records.map(e => `
                    <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; background: #fafafa;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                            <div>
                                <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${escapeHtml(e.employee_name)}</h4>
                                <div style="font-size: 12px; color: #0284c7; font-weight: 600;">${escapeHtml(e.job_title)} &bull; ${escapeHtml(e.department_name)}</div>
                            </div>
                            <span style="font-size: 14px; font-weight: 800; color: #0f172a; background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                                Score: ${e.overall_score}
                            </span>
                        </div>

                        <!-- Core Strengths -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 4px;">
                                <i class="fas fa-check-circle"></i> Key Clinical Strengths
                            </div>
                            <div style="font-size: 12px; color: #334155; line-height: 1.5; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                ${escapeHtml(e.key_strengths || 'Consistent clinical performance throughout the review period.')}
                            </div>
                        </div>

                        <!-- Growth Goals -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">
                                <i class="fas fa-bullseye"></i> Professional Development Goals
                            </div>
                            <div style="font-size: 12px; color: #334155; line-height: 1.5; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                ${escapeHtml(e.development_goals || 'Continue active participation in department conferences.')}
                            </div>
                        </div>

                        <!-- Action Plan -->
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: #7c2d12; text-transform: uppercase; margin-bottom: 4px;">
                                <i class="fas fa-tasks"></i> Action Plan &amp; Milestones
                            </div>
                            <div style="font-size: 12px; color: #334155; line-height: 1.5; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                ${escapeHtml(e.action_plan || 'Formal mid-year check-in with clinical supervisor.')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Event Bindings
 */
function bindEvents() {
    const container = document.querySelector('.perf-eval-container');
    if (!container) return;

    container.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.pe-tab-btn');
        if (tabBtn) {
            state.activeTab = tabBtn.getAttribute('data-tab');
            renderApp();
            return;
        }

        if (e.target.closest('#btnNewEvaluationModal')) {
            openEvaluationFormModal();
            return;
        }

        const btnView = e.target.closest('.btnViewReport');
        if (btnView) {
            const id = parseInt(btnView.getAttribute('data-id'), 10);
            openReportModal(id);
            return;
        }

        const btnEdit = e.target.closest('.btnEditEval');
        if (btnEdit) {
            const id = parseInt(btnEdit.getAttribute('data-id'), 10);
            openEvaluationFormModal(id);
            return;
        }

        const btnDel = e.target.closest('.btnDeleteEval');
        if (btnDel) {
            const id = parseInt(btnDel.getAttribute('data-id'), 10);
            if (confirm("Are you sure you want to permanently delete this performance evaluation?")) {
                await deleteEvaluation(id);
            }
            return;
        }

        if (e.target.closest('#btnResetFilters')) {
            state.searchQuery = "";
            state.departmentFilter = "";
            state.cycleFilter = "";
            state.tierFilter = "";
            await loadInitialData();
            return;
        }
    });

    container.addEventListener('change', async (e) => {
        if (e.target.id === 'peDeptFilter') {
            state.departmentFilter = e.target.value;
            await loadInitialData();
        } else if (e.target.id === 'peTierFilter') {
            state.tierFilter = e.target.value;
            await loadInitialData();
        } else if (e.target.id === 'peCycleFilter') {
            state.cycleFilter = e.target.value;
            await loadInitialData();
        }
    });

    container.addEventListener('keydown', async (e) => {
        if (e.target.id === 'peSearchInput' && e.key === 'Enter') {
            state.searchQuery = e.target.value.trim();
            await loadInitialData();
        }
    });
}

/**
 * Delete Evaluation
 */
async function deleteEvaluation(id) {
    try {
        await api('/performance-evaluations/delete', 'POST', { id });
        showToast("Performance evaluation deleted.", "success");
        await loadInitialData();
    } catch (err) {
        showToast("Error deleting evaluation: " + err.message, "error");
    }
}

/**
 * MODAL: Conduct / Edit Performance Evaluation
 */
async function openEvaluationFormModal(id = null) {
    let evalRec = null;
    if (id) {
        try {
            const res = await api(`/performance-evaluations/${id}`);
            evalRec = res?.data?.evaluation;
        } catch (e) {
            showToast("Failed to load evaluation: " + e.message, "error");
            return;
        }
    }

    const modalBox = document.getElementById('peModalContainer');
    if (!modalBox) return;

    const staffList = cache.metadata?.staff || [];
    const depts = cache.metadata?.departments || [];

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 760px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
                        ${evalRec ? 'Edit Performance Evaluation' : 'Conduct Multi-Source Performance Evaluation'}
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="peForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${evalRec?.id || ''}" />

                    <!-- Clinician Select -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Clinician / Staff Member Evaluated *</label>
                        <select name="employee_id" id="formEmpSelect" required style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="">Select Employee...</option>
                            ${staffList.map(s => `
                                <option value="${s.id}" data-name="${s.full_name}" data-dept="${s.department_name || ''}" ${evalRec?.employee_id == s.id ? 'selected' : ''}>
                                    ${escapeHtml(s.full_name)} (${s.department_name || 'Staff'})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Job Title / Position</label>
                            <input type="text" name="job_title" id="formJobTitle" value="${escapeHtml(evalRec?.job_title || '')}" placeholder="e.g. Attending Emergency Physician" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Department Name</label>
                            <input type="text" name="department_name" id="formDeptName" value="${escapeHtml(evalRec?.department_name || '')}" placeholder="e.g. Emergency Department" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Evaluation Cycle & Year -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Appraisal Cycle *</label>
                            <select name="evaluation_cycle" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="annual" ${evalRec?.evaluation_cycle === 'annual' ? 'selected' : ''}>Annual Appraisal</option>
                                <option value="semi_annual" ${evalRec?.evaluation_cycle === 'semi_annual' ? 'selected' : ''}>Semi-Annual Review</option>
                                <option value="recredentialing_peer_review" ${evalRec?.evaluation_cycle === 'recredentialing_peer_review' ? 'selected' : ''}>Recredentialing Peer Review</option>
                                <option value="probationary" ${evalRec?.evaluation_cycle === 'probationary' ? 'selected' : ''}>Probationary Review</option>
                                <option value="quarterly" ${evalRec?.evaluation_cycle === 'quarterly' ? 'selected' : ''}>Quarterly Review</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Cycle Year</label>
                            <input type="number" name="evaluation_year" value="${evalRec?.evaluation_year || 2026}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Evaluator Type</label>
                            <select name="evaluator_type" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="supervisor" ${evalRec?.evaluator_type === 'supervisor' ? 'selected' : ''}>Direct Supervisor / Head</option>
                                <option value="peer" ${evalRec?.evaluator_type === 'peer' ? 'selected' : ''}>Peer Review (Attending)</option>
                                <option value="department_chair" ${evalRec?.evaluator_type === 'department_chair' ? 'selected' : ''}>Department Chairperson</option>
                                <option value="self" ${evalRec?.evaluator_type === 'self' ? 'selected' : ''}>Self-Appraisal</option>
                            </select>
                        </div>
                    </div>

                    <!-- Evaluator Details -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Evaluator Name *</label>
                            <input type="text" name="evaluator_name" required value="${escapeHtml(evalRec?.evaluator_name || 'Dr. Arthur Sterling, MD')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Evaluator Title *</label>
                            <input type="text" name="evaluator_title" required value="${escapeHtml(evalRec?.evaluator_title || 'Chief Medical Officer')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- 5-Tier Rubric Scoring Inputs -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">5-Tier Accreditation Scoring Rubric (1.00 - 5.00)</h4>
                            <div id="liveCompositeBadge" style="background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 800;">
                                Composite Score: ${evalRec?.overall_score || '3.00'}
                            </div>
                        </div>

                        ${renderRubricScoreInput('score_clinical_competence', '1. Clinical Competence & Procedural Acumen', evalRec?.score_clinical_competence || 4.50, 'Diagnostic accuracy, clinical guidelines, procedural skill, crisis response.')}
                        ${renderRubricScoreInput('score_bedside_manner', '2. Bedside Manner & Patient Communication', evalRec?.score_bedside_manner || 4.20, 'Patient compassion, informed consent, clear communication, active listening.')}
                        ${renderRubricScoreInput('score_documentation_accuracy', '3. Documentation Accuracy & Timeliness', evalRec?.score_documentation_accuracy || 4.00, 'SOAP notes, electronic order turnaround, CPOE accuracy, HIPAA compliance.')}
                        ${renderRubricScoreInput('score_teamwork_ethics', '4. Teamwork & Interprofessional Collaboration', evalRec?.score_teamwork_ethics || 4.50, 'Multidisciplinary rounds, respectful interactions, shift handoffs.')}
                        ${renderRubricScoreInput('score_professionalism_compliance', '5. Professionalism, Ethics & Compliance', evalRec?.score_professionalism_compliance || 4.60, 'Punctuality, CME attendance, bylaws adherence, ethical conduct.')}
                    </div>

                    <!-- Qualitative Text Areas -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Key Clinical Strengths &amp; Achievements</label>
                        <textarea name="key_strengths" rows="3" placeholder="Highlight specific clinical achievements, quality initiatives, or patient outcomes..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(evalRec?.key_strengths || '')}</textarea>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Areas for Development &amp; Improvement</label>
                        <textarea name="areas_for_development" rows="2" placeholder="Identify areas requiring growth, workflow refinement, or documentation timeliness..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(evalRec?.areas_for_development || '')}</textarea>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Professional Development Goals (Next Appraisal Period)</label>
                        <textarea name="development_goals" rows="2" placeholder="SMART targets, subspecialty fellowship, certifications, or leadership roles..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(evalRec?.development_goals || '')}</textarea>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Action Plan &amp; Specific Milestones</label>
                        <textarea name="action_plan" rows="2" placeholder="Agreed supervision schedules, simulation lab dates, or audit checks..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(evalRec?.action_plan || '')}</textarea>
                    </div>

                    <!-- Evaluator Recommendation -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Evaluator Recommendation</label>
                            <select name="evaluator_recommendation" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600;">
                                <option value="recredential_full_privileges" ${evalRec?.evaluator_recommendation === 'recredential_full_privileges' ? 'selected' : ''}>Recredential Full Privileges</option>
                                <option value="eligible_for_merit_promotion" ${evalRec?.evaluator_recommendation === 'eligible_for_merit_promotion' ? 'selected' : ''}>Eligible for Merit Promotion / Bonus</option>
                                <option value="regularize_employment" ${evalRec?.evaluator_recommendation === 'regularize_employment' ? 'selected' : ''}>Regularize Employment</option>
                                <option value="continue_current_tier" ${evalRec?.evaluator_recommendation === 'continue_current_tier' ? 'selected' : ''}>Continue Current Tier</option>
                                <option value="targeted_clinical_supervision" ${evalRec?.evaluator_recommendation === 'targeted_clinical_supervision' ? 'selected' : ''}>Targeted Clinical Supervision</option>
                                <option value="performance_improvement_plan" ${evalRec?.evaluator_recommendation === 'performance_improvement_plan' ? 'selected' : ''}>Performance Improvement Plan (PIP)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Recommendation Notes</label>
                            <input type="text" name="recommendation_notes" value="${escapeHtml(evalRec?.recommendation_notes || '')}" placeholder="Optional governance remarks..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Form Buttons -->
                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnCancelModal" style="padding: 10px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 10px 20px; background: #0284c7; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Save Performance Evaluation</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Live update composite score badge
    function updateLiveScore() {
        const c = parseFloat(document.querySelector('input[name="score_clinical_competence"]').value || 3);
        const b = parseFloat(document.querySelector('input[name="score_bedside_manner"]').value || 3);
        const d = parseFloat(document.querySelector('input[name="score_documentation_accuracy"]').value || 3);
        const t = parseFloat(document.querySelector('input[name="score_teamwork_ethics"]').value || 3);
        const e = parseFloat(document.querySelector('input[name="score_professionalism_compliance"]').value || 3);

        const avg = ((c + b + d + t + e) / 5.0).toFixed(2);
        const badge = document.getElementById('liveCompositeBadge');
        if (badge) {
            badge.innerText = `Composite Score: ${avg} / 5.00`;
            badge.style.background = avg >= 4.50 ? '#10b981' : (avg >= 3.50 ? '#0284c7' : (avg >= 2.80 ? '#64748b' : '#ef4444'));
        }
    }

    modalBox.querySelectorAll('.rubric-score-input').forEach(input => {
        input.addEventListener('input', updateLiveScore);
    });

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    // Form submit
    document.getElementById('peForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());

        if (!data.employee_name && data.employee_id) {
            const sel = document.getElementById('formEmpSelect');
            const opt = sel.options[sel.selectedIndex];
            data.employee_name = opt ? opt.getAttribute('data-name') : '';
        }

        try {
            const endpoint = data.id ? '/performance-evaluations/update' : '/performance-evaluations';
            await api(endpoint, 'POST', data);
            showToast("Performance evaluation recorded successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to save evaluation: " + err.message, "error");
        }
    });
}

function renderRubricScoreInput(fieldName, label, val, desc) {
    return `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 14px; background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 13px; color: #1e293b;">${label}</div>
                <div style="font-size: 11px; color: #64748b;">${desc}</div>
            </div>
            <div style="width: 100px;">
                <input type="number" step="0.1" min="1.0" max="5.0" name="${fieldName}" class="rubric-score-input" required value="${val}" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-weight: 800; text-align: center;" />
            </div>
        </div>
    `;
}

/**
 * MODAL: View Full Appraisal Report
 */
async function openReportModal(id) {
    let report = null;
    try {
        const res = await api(`/performance-evaluations/${id}`);
        report = res?.data;
    } catch (e) {
        showToast("Error loading appraisal report: " + e.message, "error");
        return;
    }

    const evalRec = report?.evaluation;
    const modalBox = document.getElementById('peModalContainer');
    if (!modalBox || !evalRec) return;

    const tierBadge = getTierBadge(evalRec.performance_tier);

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 780px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #ffffff; border-top-left-radius: 14px; border-top-right-radius: 14px;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; color: #38bdf8; font-weight: 700; letter-spacing: 0.5px;">Accreditation Audit Record</div>
                        <h3 style="font-size: 18px; font-weight: 800; margin: 2px 0 0 0;">Employee Performance Appraisal Report</h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="printArea" style="padding: 28px; font-family: -apple-system, sans-serif; color: #1e293b;">
                    <!-- Clinician Info Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
                        <div>
                            <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${escapeHtml(evalRec.employee_name)}</div>
                            <div style="font-size: 14px; color: #0284c7; font-weight: 600;">${escapeHtml(evalRec.job_title)}</div>
                            <div style="font-size: 13px; color: #64748b;">${escapeHtml(evalRec.department_name)} &bull; Evaluation Code: ${evalRec.evaluation_code}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #64748b;">Appraisal Cycle</div>
                            <div style="font-weight: 700; font-size: 14px;">${formatCycleName(evalRec.evaluation_cycle)} (${evalRec.evaluation_year})</div>
                            <span style="background: ${tierBadge.bg}; color: ${tierBadge.color}; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-top: 6px;">
                                <i class="${tierBadge.icon}"></i> ${tierBadge.label}
                            </span>
                        </div>
                    </div>

                    <!-- 5-Tier Rubric Table -->
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                            1. 5-Tier Accreditation Scoring Rubric
                        </h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1; text-align: left; color: #475569;">
                                    <th style="padding: 8px 12px;">Evaluation Domain</th>
                                    <th style="padding: 8px 12px;">Standard Evaluation Criteria</th>
                                    <th style="padding: 8px 12px; text-align: right;">Score (1-5)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px 12px; font-weight: 700;">Clinical Competence</td>
                                    <td style="padding: 8px 12px; color: #64748b;">Diagnostic acumen, surgical/bedside procedural skill, clinical protocol compliance, crisis leadership.</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #6d28d9; font-size: 14px;">${evalRec.score_clinical_competence}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px 12px; font-weight: 700;">Bedside Manner</td>
                                    <td style="padding: 8px 12px; color: #64748b;">Patient empathy, compassionate communication, informed consent, family conference clarity.</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #b45309; font-size: 14px;">${evalRec.score_bedside_manner}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px 12px; font-weight: 700;">Documentation Accuracy</td>
                                    <td style="padding: 8px 12px; color: #64748b;">SOAP notes completeness, electronic discharge sign-off timeliness, CPOE order precision, HIPAA.</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #0369a1; font-size: 14px;">${evalRec.score_documentation_accuracy}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 8px 12px; font-weight: 700;">Teamwork &amp; Ethics</td>
                                    <td style="padding: 8px 12px; color: #64748b;">Interprofessional rounds collaboration, code blue coordination, shift handover clarity, mutual respect.</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #15803d; font-size: 14px;">${evalRec.score_teamwork_ethics}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #cbd5e1;">
                                    <td style="padding: 8px 12px; font-weight: 700;">Professionalism &amp; Compliance</td>
                                    <td style="padding: 8px 12px; color: #64748b;">Hospital bylaws adherence, mandatory CME/CPD participation, code of conduct, punctuality.</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #be185d; font-size: 14px;">${evalRec.score_professionalism_compliance}</td>
                                </tr>
                                <tr style="background: #f8fafc; font-weight: 800;">
                                    <td colspan="2" style="padding: 10px 12px; text-align: right; text-transform: uppercase;">Composite Quality Index:</td>
                                    <td style="padding: 10px 12px; text-align: right; font-size: 16px; color: #0f172a;">${evalRec.overall_score} / 5.00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Qualitative Appraisals -->
                    <div style="margin-bottom: 20px;">
                        <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                            2. Qualitative Assessment
                        </h4>
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 12px; color: #166534;">Key Strengths &amp; Clinical Achievements:</strong>
                            <div style="font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-top: 4px;">${escapeHtml(evalRec.key_strengths || 'None recorded.')}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 12px; color: #92400e;">Areas for Development:</strong>
                            <div style="font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-top: 4px;">${escapeHtml(evalRec.areas_for_development || 'None recorded.')}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 12px; color: #0369a1;">Professional Development Goals:</strong>
                            <div style="font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-top: 4px;">${escapeHtml(evalRec.development_goals || 'None recorded.')}</div>
                        </div>
                    </div>

                    <!-- Recommendation & Sign-Off -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 12px;">
                        <div><strong>Evaluator Recommendation:</strong> ${formatRecommendationLabel(evalRec.evaluator_recommendation)}</div>
                        ${evalRec.recommendation_notes ? `<div><strong>Notes:</strong> ${escapeHtml(evalRec.recommendation_notes)}</div>` : ''}
                        ${evalRec.employee_comments ? `<div style="margin-top: 6px;"><strong>Clinician Reflection:</strong> <em>"${escapeHtml(evalRec.employee_comments)}"</em></div>` : ''}
                    </div>

                    <!-- Sign-off signatures -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
                        <div>
                            <div style="border-bottom: 1px solid #0f172a; height: 35px;"></div>
                            <div style="font-weight: 700; font-size: 12px; margin-top: 4px;">${escapeHtml(evalRec.evaluator_name)}</div>
                            <div style="font-size: 11px; color: #64748b;">${escapeHtml(evalRec.evaluator_title)} (Evaluator)</div>
                        </div>
                        <div>
                            <div style="border-bottom: 1px solid #0f172a; height: 35px;"></div>
                            <div style="font-weight: 700; font-size: 12px; margin-top: 4px;">${escapeHtml(evalRec.employee_name)}</div>
                            <div style="font-size: 11px; color: #64748b;">Evaluated Staff Member &bull; Date: ${evalRec.employee_acknowledged_at || 'Acknowledged'}</div>
                        </div>
                    </div>
                </div>

                <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="btnPrintReport" style="padding: 9px 18px; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-print"></i> Print Appraisal Report
                    </button>
                    <button id="btnCancelModal" style="padding: 9px 16px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    document.getElementById('btnPrintReport').addEventListener('click', () => {
        window.print();
    });
}

function closeModal() {
    const modalBox = document.getElementById('peModalContainer');
    if (modalBox) modalBox.innerHTML = '';
}

/**
 * Format Helpers
 */
function getTierBadge(tier) {
    switch (tier) {
        case 'exceptional':
            return { bg: '#ecfdf5', color: '#047857', icon: 'fas fa-crown', label: 'Exceptional' };
        case 'exceeds_expectations':
            return { bg: '#eff6ff', color: '#1d4ed8', icon: 'fas fa-medal', label: 'Exceeds Expectations' };
        case 'meets_expectations':
            return { bg: '#f8fafc', color: '#334155', icon: 'fas fa-check-circle', label: 'Meets Expectations' };
        case 'needs_development':
            return { bg: '#fffbeb', color: '#b45309', icon: 'fas fa-exclamation-circle', label: 'Needs Development' };
        case 'unsatisfactory':
            return { bg: '#fef2f2', color: '#dc2626', icon: 'fas fa-times-circle', label: 'Unsatisfactory (PIP)' };
        default:
            return { bg: '#f1f5f9', color: '#475569', icon: 'fas fa-circle', label: tier };
    }
}

function formatCycleName(cycle) {
    switch (cycle) {
        case 'annual': return 'Annual Appraisal';
        case 'semi_annual': return 'Semi-Annual Review';
        case 'probationary': return 'Probationary Review';
        case 'recredentialing_peer_review': return 'Recredentialing Peer Review';
        case 'quarterly': return 'Quarterly Review';
        default: return cycle;
    }
}

function formatRecommendationLabel(rec) {
    switch (rec) {
        case 'recredential_full_privileges': return 'Recredential Full Privileges';
        case 'eligible_for_merit_promotion': return 'Eligible for Merit Promotion / Bonus';
        case 'regularize_employment': return 'Regularize Employment';
        case 'continue_current_tier': return 'Continue Current Tier';
        case 'targeted_clinical_supervision': return 'Targeted Clinical Supervision';
        case 'performance_improvement_plan': return 'Performance Improvement Plan (PIP)';
        default: return rec;
    }
}

function renderStarRating(score) {
    const s = parseFloat(score);
    const full = Math.floor(s);
    const half = (s - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    let stars = '';
    for (let i = 0; i < full; i++) stars += '<i class="fas fa-star" style="color: #f59e0b;"></i>';
    if (half) stars += '<i class="fas fa-star-half-alt" style="color: #f59e0b;"></i>';
    for (let i = 0; i < empty; i++) stars += '<i class="far fa-star" style="color: #cbd5e1;"></i>';
    return stars;
}

function showToast(msg, type = "info") {
    const el = document.getElementById('peNotificationArea');
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
