import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "worklist", // "worklist" | "metrics" | "dictionary"
    statusFilter: "all",
    categoryFilter: "all",
    priorityFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedDenialId: null
};

let cache = {
    denialsData: null,
    metrics: null,
    dictionary: null,
    currentDenial: null
};

export function ClaimDenialsView() {
    return `<div class="cd-root" id="claimDenialsRoot"><div class="cd-loading">Loading Claim Denial Management &amp; Appeals…</div></div>`;
}

export async function initClaimDenials() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("claimDenialsRoot");
    if (!root) return;

    try {
        if (state.view === "worklist") {
            const params = new URLSearchParams({
                page: state.page,
                per_page: state.perPage,
                status: state.statusFilter,
                denial_category: state.categoryFilter,
                priority: state.priorityFilter,
                q: state.searchQuery
            });

            const [denRes, metRes] = await Promise.all([
                api(`/claim-denials?${params.toString()}`).catch(() => null),
                api("/claim-denials/metrics").catch(() => null)
            ]);

            cache.denialsData = denRes?.data || { items: [], total: 0 };
            cache.metrics = metRes?.data || {};

            renderWorklistView(root);
        } else if (state.view === "metrics") {
            const metRes = await api("/claim-denials/metrics").catch(() => null);
            cache.metrics = metRes?.data || {};
            renderMetricsView(root);
        } else if (state.view === "dictionary") {
            const dictRes = await api("/claim-denials/carc-dictionary").catch(() => null);
            cache.dictionary = dictRes?.data || [];
            renderDictionaryView(root);
        }
    } catch (e) {
        console.error("Claim denials loading error:", e);
        root.innerHTML = `<div class="cd-error">Error connecting to claim denials server: ${esc(e.message)}</div>`;
    }
}

// -------------------------------------------------------------
// RENDER: WORKLIST VIEW
// -------------------------------------------------------------
function renderWorklistView(root) {
    const data = cache.denialsData || { items: [], total: 0 };
    const items = data.items || [];
    const m = cache.metrics || {};

    root.innerHTML = `
        <div class="cd-container">
            <!-- Header Bar -->
            <div class="cd-header">
                <div>
                    <h1 class="cd-title">Claim Denial Management &amp; Appeals</h1>
                    <p class="cd-subtitle">Systematic CARC/RARC Denial Worklist, Timely Filing Deadlines &amp; Formal Appeal Letters</p>
                </div>
                <div class="cd-nav-actions">
                    <button class="cd-btn cd-btn-secondary" id="cdBtnViewDictionary">📖 CARC/RARC Guide</button>
                    <button class="cd-btn cd-btn-secondary" id="cdBtnViewMetrics">📊 Recovery Analytics</button>
                    <button class="cd-btn cd-btn-secondary" id="cdBtnSeedDemo" title="Populate realistic claim denials for demonstration">⚡ Demo Samples</button>
                    <button class="cd-btn cd-btn-primary" id="cdBtnNewDenial">+ Record Claim Denial</button>
                </div>
            </div>

            <!-- Executive KPI Ribbon -->
            <div class="cd-stats-grid">
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Total Denied Revenue</div>
                    <div class="cd-stat-val text-rose">${cur(m.total_denied_amount)}</div>
                    <div class="cd-stat-sub">${m.total_denials || 0} claims disputed</div>
                </div>
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Appeals Overturn Win Rate</div>
                    <div class="cd-stat-val text-emerald">${m.overturn_rate_pct || 0}%</div>
                    <div class="cd-stat-sub">${cur(m.total_recovered_amount)} recovered</div>
                </div>
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Active Worklist</div>
                    <div class="cd-stat-val text-blue">${m.active_denials_count || 0}</div>
                    <div class="cd-stat-sub">${m.appeals_in_progress_count || 0} appeals in progress</div>
                </div>
                <div class="cd-stat-card ${Number(m.urgent_deadlines_count) > 0 ? 'card-urgent' : ''}">
                    <div class="cd-stat-label">Urgent Deadlines (&lt;30 Days)</div>
                    <div class="cd-stat-val ${Number(m.urgent_deadlines_count) > 0 ? 'text-amber font-bold' : 'text-gray'}">${m.urgent_deadlines_count || 0}</div>
                    <div class="cd-stat-sub">Timely filing expiration risk</div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div class="cd-filter-bar">
                <div class="cd-search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="cdSearchInput" placeholder="Search claim #, denial #, patient name, MRN, payer, CARC code..." value="${esc(state.searchQuery)}">
                    ${state.searchQuery ? `<button class="cd-clear-btn" id="cdClearSearch">&times;</button>` : ''}
                </div>

                <div class="cd-filter-group">
                    <select id="cdCategoryFilter" class="cd-input cd-input-sm">
                        <option value="all" ${state.categoryFilter === 'all' ? 'selected' : ''}>All Denial Categories</option>
                        <option value="prior_auth_missing" ${state.categoryFilter === 'prior_auth_missing' ? 'selected' : ''}>Missing Prior Auth (CO-197)</option>
                        <option value="medical_necessity" ${state.categoryFilter === 'medical_necessity' ? 'selected' : ''}>Medical Necessity (CO-50)</option>
                        <option value="timely_filing" ${state.categoryFilter === 'timely_filing' ? 'selected' : ''}>Timely Filing Expired (CO-29)</option>
                        <option value="coding_billing_error" ${state.categoryFilter === 'coding_billing_error' ? 'selected' : ''}>Coding / Billing Error (CO-16)</option>
                        <option value="eligibility_coverage" ${state.categoryFilter === 'eligibility_coverage' ? 'selected' : ''}>Eligibility / COB (CO-22)</option>
                        <option value="fee_schedule_contractual" ${state.categoryFilter === 'fee_schedule_contractual' ? 'selected' : ''}>Fee Schedule (CO-45)</option>
                    </select>

                    <select id="cdPriorityFilter" class="cd-input cd-input-sm">
                        <option value="all" ${state.priorityFilter === 'all' ? 'selected' : ''}>All Priorities</option>
                        <option value="urgent" ${state.priorityFilter === 'urgent' ? 'selected' : ''}>Urgent</option>
                        <option value="high" ${state.priorityFilter === 'high' ? 'selected' : ''}>High</option>
                        <option value="medium" ${state.priorityFilter === 'medium' ? 'selected' : ''}>Medium</option>
                    </select>
                </div>
            </div>

            <!-- Status Tabs -->
            <div class="cd-status-tabs">
                <button class="cd-status-btn ${state.statusFilter === 'all' ? 'active' : ''}" data-status="all">All Claims</button>
                <button class="cd-status-btn ${state.statusFilter === 'pending_review' ? 'active' : ''}" data-status="pending_review">Pending Review</button>
                <button class="cd-status-btn ${state.statusFilter === 'appeal_submitted' ? 'active' : ''}" data-status="appeal_submitted">Appeal Submitted</button>
                <button class="cd-status-btn ${state.statusFilter === 'overturned_won' ? 'active' : ''}" data-status="overturned_won">✓ Overturned / Won</button>
                <button class="cd-status-btn ${state.statusFilter === 'upheld_lost' ? 'active' : ''}" data-status="upheld_lost">Upheld / Lost</button>
                <button class="cd-status-btn ${state.statusFilter === 'written_off' ? 'active' : ''}" data-status="written_off">Written Off</button>
            </div>

            <!-- Denials Table Card -->
            <div class="cd-table-card">
                <table class="cd-table">
                    <thead>
                        <tr>
                            <th>Denial / Claim #</th>
                            <th>Patient / MRN</th>
                            <th>Payer / Insurance</th>
                            <th>CARC &amp; Category</th>
                            <th class="text-right">Denied Amount</th>
                            <th>Filing Deadline</th>
                            <th>Status &amp; Appeal Level</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="8" class="cd-no-data">
                                    <div class="cd-empty-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        <h4>No Claim Denials Found</h4>
                                        <p>Click "+ Record Claim Denial" or "⚡ Demo Samples" to populate sample denied claims.</p>
                                    </div>
                                </td>
                            </tr>
                        ` : items.map(d => {
                            const daysLeft = parseInt(d.days_until_deadline, 10);
                            let deadlineBadge = '';
                            if (d.status === 'overturned_won' || d.status === 'written_off') {
                                deadlineBadge = `<span class="cd-badge cd-badge-neutral">Resolved</span>`;
                            } else if (isNaN(daysLeft)) {
                                deadlineBadge = `<span class="cd-badge cd-badge-neutral">N/A</span>`;
                            } else if (daysLeft < 0) {
                                deadlineBadge = `<span class="cd-badge cd-badge-danger">EXPIRED (${Math.abs(daysLeft)}d ago)</span>`;
                            } else if (daysLeft <= 30) {
                                deadlineBadge = `<span class="cd-badge cd-badge-danger animate-pulse">⚡ ${daysLeft} days left</span>`;
                            } else if (daysLeft <= 60) {
                                deadlineBadge = `<span class="cd-badge cd-badge-warning">${daysLeft} days left</span>`;
                            } else {
                                deadlineBadge = `<span class="cd-badge cd-badge-info">${daysLeft} days</span>`;
                            }

                            let statusBadge = '';
                            if (d.status === 'overturned_won') {
                                statusBadge = `<span class="cd-badge cd-badge-success">✓ Won (${cur(d.recovered_amount)})</span>`;
                            } else if (d.status === 'appeal_submitted') {
                                statusBadge = `<span class="cd-badge cd-badge-info">Appeal Sent (${formatAppealLevel(d.appeal_level)})</span>`;
                            } else if (d.status === 'written_off') {
                                statusBadge = `<span class="cd-badge cd-badge-neutral">Written Off</span>`;
                            } else if (d.status === 'upheld_lost') {
                                statusBadge = `<span class="cd-badge cd-badge-danger">Appeal Upheld</span>`;
                            } else {
                                statusBadge = `<span class="cd-badge cd-badge-warning">Pending Review</span>`;
                            }

                            return `
                                <tr>
                                    <td>
                                        <strong class="text-blue">${esc(d.denial_number)}</strong>
                                        <div class="cd-meta-sub">Claim: <strong>${esc(d.claim_number)}</strong></div>
                                        <div class="cd-meta-sub">DOS: ${esc(d.service_date)}</div>
                                    </td>
                                    <td>
                                        <strong>${esc(d.patient_name)}</strong>
                                        <div class="cd-meta-sub">${esc(d.patient_no || 'MRN-N/A')} · DOB: ${esc(d.birthdate || 'N/A')}</div>
                                    </td>
                                    <td>
                                        <strong>${esc(d.payer_name)}</strong>
                                        ${d.payer_id ? `<div class="cd-meta-sub">ID: ${esc(d.payer_id)}</div>` : ''}
                                        ${d.remittance_eob_number ? `<div class="cd-meta-sub">EOB: ${esc(d.remittance_eob_number)}</div>` : ''}
                                    </td>
                                    <td>
                                        <div class="cd-carc-pill" title="${esc(d.carc_description)}">
                                            <strong>${esc(d.carc_code)}</strong>
                                        </div>
                                        <div class="cd-meta-sub">${esc(formatCategory(d.denial_category))}</div>
                                    </td>
                                    <td class="text-right font-bold text-rose" style="font-size: 14px;">
                                        ${cur(d.denied_amount)}
                                        ${Number(d.recovered_amount) > 0 ? `<div class="cd-meta-sub text-emerald">Won: ${cur(d.recovered_amount)}</div>` : ''}
                                    </td>
                                    <td>
                                        <div>${esc(d.timely_filing_deadline || 'N/A')}</div>
                                        <div>${deadlineBadge}</div>
                                    </td>
                                    <td>
                                        <div>${statusBadge}</div>
                                        ${d.appeal_count > 0 ? `<div class="cd-meta-sub">${d.appeal_count} appeal packet(s)</div>` : ''}
                                    </td>
                                    <td class="text-center">
                                        <div class="cd-action-group">
                                            <button class="cd-btn cd-btn-primary cd-btn-xs cdBtnWorkAppeal" data-id="${d.id}" title="Generate Formal Appeal Letter &amp; Work Denial">
                                                ⚡ Appeal
                                            </button>
                                            <button class="cd-btn cd-btn-secondary cd-btn-xs cdBtnViewDetail" data-id="${d.id}" title="View Details">
                                                Detail
                                            </button>
                                            ${d.status === 'appeal_submitted' ? `
                                                <button class="cd-btn cd-btn-success cd-btn-xs cdBtnRecordOutcome" data-id="${d.id}" title="Record Payer Adjudication Outcome">
                                                    Outcome
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="cdModalContainer"></div>
    `;

    bindWorklistEvents(root);
}

// -------------------------------------------------------------
// RENDER: RECOVERY METRICS & ROOT CAUSE VIEW
// -------------------------------------------------------------
function renderMetricsView(root) {
    const m = cache.metrics || {};
    const byCategory = m.by_category || [];
    const byCarc = m.by_carc || [];

    root.innerHTML = `
        <div class="cd-container">
            <div class="cd-header">
                <div>
                    <h1 class="cd-title">Denial Analytics &amp; Recovery Intelligence</h1>
                    <p class="cd-subtitle">Root-Cause Categorization, Overturn Success Rates &amp; Revenue Cycle Recovery</p>
                </div>
                <div class="cd-nav-actions">
                    <button class="cd-btn cd-btn-secondary" id="cdBtnBackToWorklist">
                        ← Back to Denial Worklist
                    </button>
                </div>
            </div>

            <!-- High Level KPI Cards -->
            <div class="cd-stats-grid">
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Total Denied Revenue</div>
                    <div class="cd-stat-val text-rose">${cur(m.total_denied_amount)}</div>
                    <div class="cd-stat-sub">Disputed across ${m.total_denials || 0} claims</div>
                </div>
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Total Overturned / Recovered</div>
                    <div class="cd-stat-val text-emerald">${cur(m.total_recovered_amount)}</div>
                    <div class="cd-stat-sub">${m.overturned_count || 0} claims successfully won</div>
                </div>
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Overturn Win Rate</div>
                    <div class="cd-stat-val text-blue font-bold">${m.overturn_rate_pct || 0}%</div>
                    <div class="cd-stat-sub">Based on resolved appeals</div>
                </div>
                <div class="cd-stat-card">
                    <div class="cd-stat-label">Written Off Losses</div>
                    <div class="cd-stat-val text-gray">${cur(m.total_written_off_amount)}</div>
                    <div class="cd-stat-sub">${m.written_off_count || 0} contractual / bad debt</div>
                </div>
            </div>

            <div class="cd-analytics-grid">
                <!-- Breakdown by Denial Category -->
                <div class="cd-panel">
                    <div class="cd-panel-header">
                        <h3>Denials by Root Cause Category</h3>
                    </div>
                    <div class="cd-panel-body">
                        <table class="cd-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th class="text-right">Claims</th>
                                    <th class="text-right">Denied Amount</th>
                                    <th class="text-right">Recovered</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${byCategory.map(c => `
                                    <tr>
                                        <td><strong>${esc(formatCategory(c.denial_category))}</strong></td>
                                        <td class="text-right">${c.count}</td>
                                        <td class="text-right text-rose font-bold">${cur(c.total_denied)}</td>
                                        <td class="text-right text-emerald font-bold">${cur(c.total_recovered)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Breakdown by CARC Code -->
                <div class="cd-panel">
                    <div class="cd-panel-header">
                        <h3>Top CARC Denial Reason Codes</h3>
                    </div>
                    <div class="cd-panel-body">
                        <table class="cd-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Reason Description</th>
                                    <th class="text-right">Claims</th>
                                    <th class="text-right">Denied Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${byCarc.map(c => `
                                    <tr>
                                        <td><span class="cd-carc-pill"><strong>${esc(c.carc_code)}</strong></span></td>
                                        <td><div class="cd-meta-sub">${esc(c.carc_description)}</div></td>
                                        <td class="text-right">${c.count}</td>
                                        <td class="text-right text-rose font-bold">${cur(c.total_denied)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    root.querySelector("#cdBtnBackToWorklist")?.addEventListener("click", () => {
        state.view = "worklist";
        loadData();
    });
}

// -------------------------------------------------------------
// RENDER: CARC / RARC DICTIONARY VIEW
// -------------------------------------------------------------
function renderDictionaryView(root) {
    const list = cache.dictionary || [];

    root.innerHTML = `
        <div class="cd-container">
            <div class="cd-header">
                <div>
                    <h1 class="cd-title">CARC &amp; RARC Standard Dictionary</h1>
                    <p class="cd-subtitle">Claim Adjustment Reason Codes &amp; Recommended Clinical Appeal Strategies</p>
                </div>
                <div class="cd-nav-actions">
                    <button class="cd-btn cd-btn-secondary" id="cdBtnBackToWorklistFromDict">
                        ← Back to Denial Worklist
                    </button>
                </div>
            </div>

            <div class="cd-table-card">
                <table class="cd-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Category</th>
                            <th>Official Reason Title &amp; Description</th>
                            <th>Recommended Clinical Appeal Strategy</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map(c => `
                            <tr>
                                <td><span class="cd-carc-pill"><strong>${esc(c.code)}</strong></span></td>
                                <td><span class="cd-badge cd-badge-secondary">${esc(formatCategory(c.category))}</span></td>
                                <td>
                                    <strong>${esc(c.title)}</strong>
                                    <div class="cd-meta-sub">${esc(c.description)}</div>
                                </td>
                                <td>
                                    <div class="cd-strategy-box">
                                        💡 ${esc(c.recommended_appeal_strategy)}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    root.querySelector("#cdBtnBackToWorklistFromDict")?.addEventListener("click", () => {
        state.view = "worklist";
        loadData();
    });
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindWorklistEvents(root) {
    root.querySelector("#cdBtnViewMetrics")?.addEventListener("click", () => {
        state.view = "metrics";
        loadData();
    });
    root.querySelector("#cdBtnViewDictionary")?.addEventListener("click", () => {
        state.view = "dictionary";
        loadData();
    });

    // Demo samples
    root.querySelector("#cdBtnSeedDemo")?.addEventListener("click", async () => {
        const btn = root.querySelector("#cdBtnSeedDemo");
        btn.disabled = true;
        btn.textContent = "Populating...";
        try {
            const res = await api("/claim-denials/seed-samples", { method: "POST" });
            if (res?.success) {
                showToast("Sample claim denials populated!", "success");
                loadData();
            } else {
                showToast(res?.message || "Failed to seed denials", "error");
                btn.disabled = false;
                btn.textContent = "⚡ Demo Samples";
            }
        } catch (e) {
            showToast(e.message, "error");
            btn.disabled = false;
            btn.textContent = "⚡ Demo Samples";
        }
    });

    // New Denial Modal
    root.querySelector("#cdBtnNewDenial")?.addEventListener("click", () => {
        openNewDenialModal();
    });

    // Search
    const searchInput = root.querySelector("#cdSearchInput");
    let searchTimeout = null;
    searchInput?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadData();
        }, 350);
    });

    root.querySelector("#cdClearSearch")?.addEventListener("click", () => {
        state.searchQuery = "";
        state.page = 1;
        loadData();
    });

    root.querySelector("#cdCategoryFilter")?.addEventListener("change", (e) => {
        state.categoryFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    root.querySelector("#cdPriorityFilter")?.addEventListener("change", (e) => {
        state.priorityFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    // Status tabs
    root.querySelectorAll(".cd-status-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.statusFilter = btn.getAttribute("data-status");
            state.page = 1;
            loadData();
        });
    });

    // Action buttons
    root.querySelectorAll(".cdBtnWorkAppeal").forEach(btn => {
        btn.addEventListener("click", () => {
            const denialId = btn.getAttribute("data-id");
            openAppealLetterGeneratorModal(denialId);
        });
    });

    root.querySelectorAll(".cdBtnViewDetail").forEach(btn => {
        btn.addEventListener("click", () => {
            const denialId = btn.getAttribute("data-id");
            openDenialDetailModal(denialId);
        });
    });

    root.querySelectorAll(".cdBtnRecordOutcome").forEach(btn => {
        btn.addEventListener("click", () => {
            const denialId = btn.getAttribute("data-id");
            openRecordOutcomeModal(denialId);
        });
    });
}

// -------------------------------------------------------------
// MODALS: APPEAL LETTER GENERATOR & DENIAL DETAIL
// -------------------------------------------------------------

async function openAppealLetterGeneratorModal(denialId) {
    const modalContainer = document.getElementById("cdModalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="cd-modal-backdrop">
            <div class="cd-modal cd-modal-lg">
                <div class="cd-modal-header">
                    <h3>⚡ Formal Insurance Appeal Letter Generator</h3>
                    <button class="cd-modal-close" id="cdCloseModal">&times;</button>
                </div>
                <div class="cd-modal-body" id="cdLetterModalContent">
                    <div style="padding: 30px; text-align: center; color: #64748b;">Generating formal appeal letter with clinical proof arguments…</div>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#cdCloseModal")?.addEventListener("click", closeModal);

    try {
        const res = await api("/claim-denials/generate-appeal-letter", {
            method: "POST",
            body: JSON.stringify({
                denial_id: parseInt(denialId, 10),
                appeal_level: "level_1_reconsideration"
            })
        });

        if (!res?.success) {
            modalContainer.querySelector("#cdLetterModalContent").innerHTML = `<div class="cd-error">${esc(res?.message || "Failed to generate letter")}</div>`;
            return;
        }

        const data = res.data;
        const denial = data.denial;

        modalContainer.querySelector("#cdLetterModalContent").innerHTML = `
            <div class="cd-appeal-builder-grid">
                <!-- Left Controls: Parameters & Evidence Checklist -->
                <div class="cd-appeal-params">
                    <div class="cd-form-group">
                        <label>Appeal Level</label>
                        <select id="cdAppealLevel" class="cd-input">
                            <option value="level_1_reconsideration" selected>Level 1: Reconsideration &amp; Clinical Review</option>
                            <option value="level_2_formal_appeal">Level 2: Formal Grievance &amp; Appeals Committee</option>
                            <option value="level_3_external_review">Level 3: Independent External Medical Review</option>
                        </select>
                    </div>

                    <div class="cd-form-group">
                        <label>Submission Method</label>
                        <select id="cdSubmissionMethod" class="cd-input">
                            <option value="portal_upload" selected>Payer Electronic Portal Upload</option>
                            <option value="certified_mail">Certified USPS Priority Mail (Return Receipt)</option>
                            <option value="fax">Direct Secure Appeal Fax</option>
                            <option value="clearinghouse_edi">Clearinghouse EDI Dispute Transmission</option>
                        </select>
                    </div>

                    <div class="cd-form-group">
                        <label>Tracking Confirmation / Portal Trace #</label>
                        <input type="text" id="cdTrackingRef" class="cd-input" placeholder="e.g. PORTAL-CONF-992144">
                    </div>

                    <div class="cd-form-group">
                        <label>Appellant Contact Person &amp; Extension</label>
                        <input type="text" id="cdContactPerson" class="cd-input" value="Hospital Revenue Cycle Appeals Officer">
                    </div>

                    <hr class="cd-divider">

                    <label class="font-bold">Attached Clinical Documentation Checklist</label>
                    <div class="cd-attachments-checklist">
                        ${data.attachments.map((att, idx) => `
                            <label class="cd-checkbox-label">
                                <input type="checkbox" class="cdAttCheckbox" value="${esc(att)}" checked>
                                <span>${esc(att)}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="cd-form-group" style="margin-top: 14px;">
                        <label>Additional Physician Notes / Remarks</label>
                        <textarea id="cdCustomRemarks" class="cd-input" rows="2" placeholder="Optional notes to append to appeal..."></textarea>
                    </div>
                </div>

                <!-- Right Preview: Structured Formal Letter -->
                <div class="cd-letter-preview-pane">
                    <div class="cd-letter-pane-header">
                        <h4>Formal Appeal Document Preview</h4>
                        <button class="cd-btn cd-btn-secondary cd-btn-xs" id="cdBtnPrintPreview">🖨️ Print Letter</button>
                    </div>
                    <textarea id="cdLetterBodyText" class="cd-letter-textarea" rows="22">${esc(data.letter_body)}</textarea>
                </div>
            </div>

            <div class="cd-modal-footer">
                <button class="cd-btn cd-btn-secondary" id="cdCancelAppeal">Cancel</button>
                <button class="cd-btn cd-btn-primary cd-btn-lg" id="cdBtnSubmitAppealPackage">
                    🚀 Submit Formal Appeal Package &amp; Advance Status
                </button>
            </div>
        `;

        modalContainer.querySelector("#cdCancelAppeal")?.addEventListener("click", closeModal);

        // Level change updates letter
        modalContainer.querySelector("#cdAppealLevel")?.addEventListener("change", async (e) => {
            const newLevel = e.target.value;
            const updateRes = await api("/claim-denials/generate-appeal-letter", {
                method: "POST",
                body: JSON.stringify({
                    denial_id: parseInt(denialId, 10),
                    appeal_level: newLevel,
                    contact_person: modalContainer.querySelector("#cdContactPerson")?.value,
                    custom_arguments: modalContainer.querySelector("#cdCustomRemarks")?.value
                })
            });
            if (updateRes?.success) {
                modalContainer.querySelector("#cdLetterBodyText").value = updateRes.data.letter_body;
            }
        });

        // Print preview
        modalContainer.querySelector("#cdBtnPrintPreview")?.addEventListener("click", () => {
            const letterText = modalContainer.querySelector("#cdLetterBodyText")?.value;
            printFormattedLetter(letterText, denial);
        });

        // Submit formal appeal
        modalContainer.querySelector("#cdBtnSubmitAppealPackage")?.addEventListener("click", async () => {
            const letterBody = modalContainer.querySelector("#cdLetterBodyText")?.value.trim();
            const appealLevel = modalContainer.querySelector("#cdAppealLevel")?.value;
            const method = modalContainer.querySelector("#cdSubmissionMethod")?.value;
            const trackingNo = modalContainer.querySelector("#cdTrackingRef")?.value.trim();
            const contactPerson = modalContainer.querySelector("#cdContactPerson")?.value.trim();

            const checkedAtts = [];
            modalContainer.querySelectorAll(".cdAttCheckbox:checked").forEach(cb => checkedAtts.push(cb.value));

            const submitBtn = modalContainer.querySelector("#cdBtnSubmitAppealPackage");
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting Appeal Package...";

            try {
                const subRes = await api("/claim-denials/appeals", {
                    method: "POST",
                    body: JSON.stringify({
                        denial_id: parseInt(denialId, 10),
                        appeal_level: appealLevel,
                        submission_method: method,
                        tracking_confirmation_number: trackingNo,
                        appellant_contact_person: contactPerson,
                        appeal_reason_summary: `Formal ${formatAppealLevel(appealLevel)} disputing adverse determination with attached clinical documentation.`,
                        appeal_letter_body: letterBody,
                        attached_clinical_documents: checkedAtts
                    })
                });

                if (subRes?.success) {
                    showToast("Formal appeal packet successfully recorded and status set to Appeal Submitted!", "success");
                    closeModal();
                    loadData();
                } else {
                    showToast(subRes?.message || "Failed to submit appeal", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = "🚀 Submit Formal Appeal Package & Advance Status";
                }
            } catch (err) {
                showToast(err.message, "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "🚀 Submit Formal Appeal Package & Advance Status";
            }
        });

    } catch (err) {
        modalContainer.querySelector("#cdLetterModalContent").innerHTML = `<div class="cd-error">${esc(err.message)}</div>`;
    }
}

// -------------------------------------------------------------
// MODALS: RECORD OUTCOME & NEW DENIAL
// -------------------------------------------------------------

async function openRecordOutcomeModal(denialId) {
    const modalContainer = document.getElementById("cdModalContainer");
    if (!modalContainer) return;

    const res = await api(`/claim-denials/detail?id=${denialId}`).catch(() => null);
    if (!res?.success) {
        showToast("Failed to load denial details", "error");
        return;
    }

    const denial = res.data;
    const latestAppeal = denial.appeals && denial.appeals.length > 0 ? denial.appeals[denial.appeals.length - 1] : null;

    if (!latestAppeal) {
        showToast("No submitted appeals found for this denial.", "warning");
        return;
    }

    modalContainer.innerHTML = `
        <div class="cd-modal-backdrop">
            <div class="cd-modal">
                <div class="cd-modal-header">
                    <h3>Record Payer Appeal Outcome</h3>
                    <button class="cd-modal-close" id="cdCloseModal">&times;</button>
                </div>
                <div class="cd-modal-body">
                    <div class="cd-receipt-banner">
                        <div>
                            <strong>${esc(denial.denial_number)}</strong> · Claim: ${esc(denial.claim_number)}
                            <div class="cd-meta-sub">${esc(denial.payer_name)} · Denied: ${cur(denial.denied_amount)}</div>
                        </div>
                        <div class="text-right">
                            <span class="cd-badge cd-badge-info">${esc(latestAppeal.appeal_number)}</span>
                        </div>
                    </div>

                    <div class="cd-form-group">
                        <label>Payer Adjudication Outcome <span class="text-rose">*</span></label>
                        <select id="cdOutcomeSelect" class="cd-input">
                            <option value="overturned">✓ Overturned / Won (Payer Approved Payment)</option>
                            <option value="upheld">Upheld / Lost (Payer Maintained Denial)</option>
                            <option value="written_off">Write-Off (Contractual Non-Covered / Bad Debt)</option>
                        </select>
                    </div>

                    <div class="cd-form-row">
                        <div class="cd-form-group" id="cdRecoveredGroup">
                            <label>Recovered Payment Amount ($)</label>
                            <input type="number" id="cdRecoveredAmount" class="cd-input font-bold text-emerald" value="${denial.denied_amount}" min="0" step="0.01">
                        </div>
                        <div class="cd-form-group">
                            <label>Response Date</label>
                            <input type="date" id="cdResponseDate" class="cd-input" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>

                    <div class="cd-form-group">
                        <label>Payer Remittance / Resolution Remarks</label>
                        <textarea id="cdOutcomeNotes" class="cd-input" rows="3" placeholder="Notes from EOB / Remittance advice regarding overturn or upheld reasons..."></textarea>
                    </div>
                </div>
                <div class="cd-modal-footer">
                    <button class="cd-btn cd-btn-secondary" id="cdCancelOutcome">Cancel</button>
                    <button class="cd-btn cd-btn-primary" id="cdSubmitOutcome">Save Adjudication Outcome</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#cdCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#cdCancelOutcome")?.addEventListener("click", closeModal);

    const outcomeSel = modalContainer.querySelector("#cdOutcomeSelect");
    outcomeSel?.addEventListener("change", () => {
        const val = outcomeSel.value;
        const recInput = modalContainer.querySelector("#cdRecoveredAmount");
        if (val === 'overturned') {
            recInput.value = denial.denied_amount;
        } else {
            recInput.value = "0.00";
        }
    });

    modalContainer.querySelector("#cdSubmitOutcome")?.addEventListener("click", async () => {
        const outcome = outcomeSel.value;
        const recovered = parseFloat(modalContainer.querySelector("#cdRecoveredAmount").value) || 0;
        const respDate = modalContainer.querySelector("#cdResponseDate").value;
        const notes = modalContainer.querySelector("#cdOutcomeNotes").value.trim();

        const submitBtn = modalContainer.querySelector("#cdSubmitOutcome");
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";

        try {
            const res = await api("/claim-denials/appeals/outcome", {
                method: "POST",
                body: JSON.stringify({
                    appeal_id: latestAppeal.id,
                    outcome: outcome,
                    recovered_amount: recovered,
                    written_off_amount: outcome === 'written_off' ? (parseFloat(denial.denied_amount) || 0) : 0,
                    payer_response_date: respDate,
                    payer_response_notes: notes
                })
            });

            if (res?.success) {
                showToast("Appeal outcome recorded successfully!", "success");
                closeModal();
                loadData();
            } else {
                showToast(res?.message || "Failed to record outcome", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Save Adjudication Outcome";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Adjudication Outcome";
        }
    });
}

function openNewDenialModal() {
    const modalContainer = document.getElementById("cdModalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="cd-modal-backdrop">
            <div class="cd-modal">
                <div class="cd-modal-header">
                    <h3>+ Record New Claim Denial</h3>
                    <button class="cd-modal-close" id="cdCloseModal">&times;</button>
                </div>
                <div class="cd-modal-body">
                    <div class="cd-form-row">
                        <div class="cd-form-group">
                            <label>Claim Control # <span class="text-rose">*</span></label>
                            <input type="text" id="cdNewClaimNo" class="cd-input" placeholder="e.g. CLM-2026-88129" required>
                        </div>
                        <div class="cd-form-group">
                            <label>Patient ID <span class="text-rose">*</span></label>
                            <input type="number" id="cdNewPatientId" class="cd-input" placeholder="Patient ID (e.g. 1)" required>
                        </div>
                    </div>

                    <div class="cd-form-row">
                        <div class="cd-form-group">
                            <label>Payer Name <span class="text-rose">*</span></label>
                            <input type="text" id="cdNewPayerName" class="cd-input" placeholder="e.g. Blue Cross, Aetna, UHC" required>
                        </div>
                        <div class="cd-form-group">
                            <label>Denied Amount ($) <span class="text-rose">*</span></label>
                            <input type="number" id="cdNewDeniedAmount" class="cd-input font-bold" min="1" step="0.01" required>
                        </div>
                    </div>

                    <div class="cd-form-row">
                        <div class="cd-form-group">
                            <label>Standard CARC Reason Code</label>
                            <select id="cdNewCarcCode" class="cd-input">
                                <option value="CO-197" data-cat="prior_auth_missing" data-desc="Precertification/authorization absent">CO-197: Missing Prior Auth</option>
                                <option value="CO-50" data-cat="medical_necessity" data-desc="Not deemed medical necessity by payer">CO-50: Medical Necessity</option>
                                <option value="CO-29" data-cat="timely_filing" data-desc="Time limit for filing has expired">CO-29: Timely Filing Expired</option>
                                <option value="CO-16" data-cat="coding_billing_error" data-desc="Lacks information or billing error">CO-16: Coding / Billing Error</option>
                                <option value="CO-97" data-cat="coding_billing_error" data-desc="Bundled procedure allowance included">CO-97: Bundled Procedure</option>
                                <option value="CO-22" data-cat="eligibility_coverage" data-desc="Coordination of benefits other payer">CO-22: Coordination of Benefits</option>
                            </select>
                        </div>
                        <div class="cd-form-group">
                            <label>Actionable Denial Category</label>
                            <select id="cdNewCategory" class="cd-input">
                                <option value="prior_auth_missing">Prior Authorization Missing</option>
                                <option value="medical_necessity">Medical Necessity</option>
                                <option value="timely_filing">Timely Filing</option>
                                <option value="coding_billing_error">Coding / Billing Error</option>
                                <option value="eligibility_coverage">Eligibility / COB</option>
                            </select>
                        </div>
                    </div>

                    <div class="cd-form-row">
                        <div class="cd-form-group">
                            <label>Service Date</label>
                            <input type="date" id="cdNewServiceDate" class="cd-input" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                        <div class="cd-form-group">
                            <label>Denial Date</label>
                            <input type="date" id="cdNewDenialDate" class="cd-input" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>

                    <div class="cd-form-group">
                        <label>Root Cause Analysis</label>
                        <textarea id="cdNewRootCause" class="cd-input" rows="2" placeholder="Describe root cause of denial..."></textarea>
                    </div>
                </div>
                <div class="cd-modal-footer">
                    <button class="cd-btn cd-btn-secondary" id="cdCancelNewDenial">Cancel</button>
                    <button class="cd-btn cd-btn-primary" id="cdSubmitNewDenial">Record Claim Denial</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#cdCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#cdCancelNewDenial")?.addEventListener("click", closeModal);

    const carcSelect = modalContainer.querySelector("#cdNewCarcCode");
    carcSelect?.addEventListener("change", () => {
        const opt = carcSelect.options[carcSelect.selectedIndex];
        const cat = opt.getAttribute("data-cat");
        if (cat) {
            modalContainer.querySelector("#cdNewCategory").value = cat;
        }
    });

    modalContainer.querySelector("#cdSubmitNewDenial")?.addEventListener("click", async () => {
        const claimNo = modalContainer.querySelector("#cdNewClaimNo").value.trim();
        const patientId = parseInt(modalContainer.querySelector("#cdNewPatientId").value, 10);
        const payerName = modalContainer.querySelector("#cdNewPayerName").value.trim();
        const deniedAmt = parseFloat(modalContainer.querySelector("#cdNewDeniedAmount").value) || 0;
        const carcCode = carcSelect.value;
        const carcDesc = carcSelect.options[carcSelect.selectedIndex].getAttribute("data-desc");
        const category = modalContainer.querySelector("#cdNewCategory").value;
        const serviceDate = modalContainer.querySelector("#cdNewServiceDate").value;
        const denialDate = modalContainer.querySelector("#cdNewDenialDate").value;
        const rootCause = modalContainer.querySelector("#cdNewRootCause").value.trim();

        if (!claimNo || !patientId || !payerName || deniedAmt <= 0) {
            showToast("Please fill all required fields correctly.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#cdSubmitNewDenial");
        submitBtn.disabled = true;
        submitBtn.textContent = "Recording...";

        try {
            const res = await api("/claim-denials", {
                method: "POST",
                body: JSON.stringify({
                    claim_number: claimNo,
                    patient_id: patientId,
                    payer_name: payerName,
                    denied_amount: deniedAmt,
                    carc_code: carcCode,
                    carc_description: carcDesc,
                    denial_category: category,
                    service_date: serviceDate,
                    denial_date: denialDate,
                    root_cause_analysis: rootCause
                })
            });

            if (res?.success) {
                showToast("Claim denial recorded successfully!", "success");
                closeModal();
                loadData();
            } else {
                showToast(res?.message || "Failed to record denial", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Record Claim Denial";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Record Claim Denial";
        }
    });
}

async function openDenialDetailModal(denialId) {
    const modalContainer = document.getElementById("cdModalContainer");
    if (!modalContainer) return;

    const res = await api(`/claim-denials/detail?id=${denialId}`).catch(() => null);
    if (!res?.success) {
        showToast("Failed to load details", "error");
        return;
    }

    const d = res.data;
    const appeals = d.appeals || [];

    modalContainer.innerHTML = `
        <div class="cd-modal-backdrop">
            <div class="cd-modal cd-modal-lg">
                <div class="cd-modal-header">
                    <h3>Claim Denial &amp; Appeals Lifecycle Detail</h3>
                    <button class="cd-modal-close" id="cdCloseModal">&times;</button>
                </div>
                <div class="cd-modal-body">
                    <div class="cd-receipt-banner">
                        <div>
                            <div class="cd-meta-label">Denial Number</div>
                            <strong style="font-size: 16px;" class="text-blue">${esc(d.denial_number)}</strong>
                            <div class="cd-meta-sub">Claim: <strong>${esc(d.claim_number)}</strong> · Date of Service: ${esc(d.service_date)}</div>
                        </div>
                        <div class="text-right">
                            <div class="cd-meta-label">Denied Amount</div>
                            <strong style="font-size: 18px;" class="text-rose">${cur(d.denied_amount)}</strong>
                            ${Number(d.recovered_amount) > 0 ? `<div class="text-emerald font-bold">Recovered: ${cur(d.recovered_amount)}</div>` : ''}
                        </div>
                    </div>

                    <div class="cd-grid-2">
                        <div>
                            <strong>Patient:</strong> ${esc(d.patient_name)} (${esc(d.patient_no || 'MRN-N/A')})<br>
                            <strong>Payer:</strong> ${esc(d.payer_name)} ${d.payer_id ? `(${esc(d.payer_id)})` : ''}<br>
                            <strong>Remittance EOB:</strong> ${esc(d.remittance_eob_number || 'N/A')}<br>
                        </div>
                        <div>
                            <strong>CARC Code:</strong> <span class="cd-carc-pill"><strong>${esc(d.carc_code)}</strong></span> ${esc(d.carc_description)}<br>
                            <strong>Category:</strong> ${esc(formatCategory(d.denial_category))}<br>
                            <strong>Timely Filing Deadline:</strong> ${esc(d.timely_filing_deadline)} (${d.days_until_deadline} days left)<br>
                        </div>
                    </div>

                    ${d.root_cause_analysis ? `
                        <div class="cd-strategy-box" style="margin-top: 12px;">
                            <strong>Root Cause Analysis:</strong> ${esc(d.root_cause_analysis)}
                        </div>
                    ` : ''}

                    <hr class="cd-divider">

                    <h4>Submitted Appeals &amp; Legal Packet History (${appeals.length})</h4>
                    ${appeals.length === 0 ? `
                        <div class="cd-empty-state">No formal appeals submitted yet. Click "⚡ Appeal" to generate appeal letter.</div>
                    ` : appeals.map(a => `
                        <div class="cd-appeal-history-card">
                            <div class="cd-receipt-banner" style="background: #f8fafc; margin-bottom: 8px;">
                                <div>
                                    <strong>${esc(a.appeal_number)}</strong> · <span class="cd-badge cd-badge-info">${esc(formatAppealLevel(a.appeal_level))}</span>
                                    <div class="cd-meta-sub">Submitted: ${esc(a.submission_date)} via ${esc(a.submission_method)} ${a.tracking_confirmation_number ? `(Trk# ${esc(a.tracking_confirmation_number)})` : ''}</div>
                                </div>
                                <div class="text-right">
                                    <span class="cd-badge ${a.status === 'overturned' ? 'cd-badge-success' : (a.status === 'upheld' ? 'cd-badge-danger' : 'cd-badge-info')}">
                                        ${esc(a.status.toUpperCase())}
                                    </span>
                                </div>
                            </div>
                            <div class="cd-meta-sub"><strong>Summary:</strong> ${esc(a.appeal_reason_summary)}</div>
                            ${a.payer_response_notes ? `
                                <div class="cd-meta-sub text-emerald" style="margin-top: 4px;">
                                    <strong>Payer Response (${esc(a.payer_response_date)}):</strong> ${esc(a.payer_response_notes)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#cdCloseModal")?.addEventListener("click", closeModal);
}

function printFormattedLetter(letterText, denial) {
    const win = window.open("", "_blank");
    win.document.write(`
        <html>
            <head>
                <title>Insurance Appeal Letter - ${esc(denial.claim_number)}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Times New Roman", serif; font-size: 13px; line-height: 1.6; color: #000; padding: 40px; }
                    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; }
                </style>
            </head>
            <body>
                <pre>${esc(letterText)}</pre>
            </body>
        </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 300);
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function formatCategory(cat) {
    const map = {
        'prior_auth_missing': 'Missing Prior Auth',
        'medical_necessity': 'Medical Necessity',
        'timely_filing': 'Timely Filing',
        'coding_billing_error': 'Coding / Billing Error',
        'eligibility_coverage': 'Eligibility / COB',
        'duplicate_claim': 'Duplicate Claim',
        'fee_schedule_contractual': 'Fee Schedule Contractual',
        'documentation_requested': 'Documentation Requested'
    };
    return map[cat] || cat;
}

function formatAppealLevel(lvl) {
    const map = {
        'level_1_reconsideration': 'Level 1: Reconsideration',
        'level_2_formal_appeal': 'Level 2: Formal Appeal',
        'level_3_external_review': 'Level 3: External Review',
        'none': 'None'
    };
    return map[lvl] || lvl;
}

// -------------------------------------------------------------
// CSS INJECTION
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("claimDenialsStyles")) return;
    const style = document.createElement("style");
    style.id = "claimDenialsStyles";
    style.textContent = `
        .cd-root {
            width: 100%;
            min-height: 100vh;
            background: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            padding: 20px 24px 60px;
            box-sizing: border-box;
        }

        .cd-container { max-width: 1400px; margin: 0 auto; }

        .cd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .cd-title { font-size: 24px; font-weight: 700; margin: 0; }
        .cd-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        .cd-nav-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* Stats Grid */
        .cd-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .cd-stat-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .cd-stat-card.card-urgent {
            border-color: #fde68a;
            background: #fffbeb;
        }

        .cd-stat-label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .cd-stat-val { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
        .cd-stat-sub { font-size: 11.5px; color: #94a3b8; }

        /* Filter Toolbar */
        .cd-filter-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }

        .cd-search-box {
            position: relative;
            flex: 1;
            min-width: 280px;
            max-width: 460px;
        }

        .cd-search-box svg {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: #94a3b8;
        }

        .cd-search-box input {
            width: 100%;
            padding: 8px 12px 8px 34px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }

        .cd-clear-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 18px;
            color: #94a3b8;
            cursor: pointer;
        }

        .cd-filter-group { display: flex; gap: 8px; flex-wrap: wrap; }

        /* Status Tabs */
        .cd-status-tabs {
            display: flex;
            gap: 4px;
            background: #e2e8f0;
            padding: 3px;
            border-radius: 6px;
            margin-bottom: 16px;
            overflow-x: auto;
        }

        .cd-status-btn {
            border: none;
            background: none;
            padding: 6px 14px;
            font-size: 12.5px;
            font-weight: 600;
            color: #475569;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s;
        }

        .cd-status-btn.active {
            background: #fff;
            color: #0f172a;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        /* Table */
        .cd-table-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .cd-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .cd-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 11.5px;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
        }

        .cd-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .cd-table tbody tr:hover { background: #f8fafc; }

        .cd-carc-pill {
            display: inline-block;
            background: #fee2e2;
            color: #991b1b;
            font-family: monospace;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11.5px;
        }

        .cd-meta-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }

        /* Badges */
        .cd-badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 4px;
        }

        .cd-badge-info { background: #dbeafe; color: #1e40af; }
        .cd-badge-warning { background: #fef3c7; color: #92400e; }
        .cd-badge-danger { background: #fee2e2; color: #991b1b; }
        .cd-badge-success { background: #d1fae5; color: #065f46; }
        .cd-badge-neutral { background: #f1f5f9; color: #475569; }

        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

        /* Buttons */
        .cd-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.15s;
        }

        .cd-btn-primary { background: #2563eb; color: #fff; border-color: #1d4ed8; }
        .cd-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .cd-btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
        .cd-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
        .cd-btn-success { background: #059669; color: #fff; border-color: #047857; }
        .cd-btn-lg { padding: 10px 20px; font-size: 14px; }
        .cd-btn-sm { padding: 5px 10px; font-size: 12px; }
        .cd-btn-xs { padding: 3px 8px; font-size: 11px; }

        .cd-action-group { display: flex; gap: 4px; justify-content: center; }

        /* Form elements */
        .cd-form-group { margin-bottom: 12px; }
        .cd-form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
        .cd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cd-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }
        .cd-input-sm { padding: 5px 10px; font-size: 12px; }
        .cd-divider { border: 0; border-top: 1px solid #e2e8f0; margin: 14px 0; }

        /* Modals */
        .cd-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
        }

        .cd-modal {
            background: #fff;
            border-radius: 10px;
            width: 100%;
            max-width: 620px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
        }

        .cd-modal-lg { max-width: 1080px; }

        .cd-modal-header {
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cd-modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
        .cd-modal-close { background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; }
        .cd-modal-body { padding: 20px; overflow-y: auto; }
        .cd-modal-footer {
            padding: 14px 20px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        /* Appeal Builder Grid */
        .cd-appeal-builder-grid {
            display: grid;
            grid-template-columns: 1fr 1.6fr;
            gap: 20px;
        }

        @media (max-width: 900px) {
            .cd-appeal-builder-grid { grid-template-columns: 1fr; }
        }

        .cd-appeal-params {
            border-right: 1px solid #e2e8f0;
            padding-right: 20px;
        }

        .cd-letter-preview-pane { display: flex; flex-direction: column; }
        .cd-letter-pane-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .cd-letter-pane-header h4 { margin: 0; font-size: 13.5px; font-weight: 700; }

        .cd-letter-textarea {
            width: 100%;
            height: 480px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Times New Roman", serif;
            font-size: 12.5px;
            line-height: 1.5;
            padding: 14px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-sizing: border-box;
            background: #fafafa;
        }

        .cd-attachments-checklist {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 6px;
        }

        .cd-checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 12px;
            cursor: pointer;
        }

        .cd-receipt-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 14px;
        }

        .cd-strategy-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 12px;
            color: #1e40af;
            line-height: 1.5;
        }

        .cd-appeal-history-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
        }

        .cd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 12.5px; line-height: 1.6; }
        .cd-analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .cd-analytics-grid { grid-template-columns: 1fr; } }
        .cd-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .cd-panel-header { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .cd-panel-header h3 { margin: 0; font-size: 14px; font-weight: 700; }
        .cd-panel-body { padding: 16px; }

        .cd-empty-box { text-align: center; padding: 40px 20px; color: #64748b; }
        .cd-empty-box svg { width: 44px; height: 44px; color: #94a3b8; margin-bottom: 10px; }
        .cd-empty-box h4 { margin: 0 0 4px; font-size: 16px; color: #1e293b; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-blue { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-amber { color: #d97706; }
        .text-gray { color: #64748b; }
        .font-bold { font-weight: 700; }
    `;
    document.head.appendChild(style);
}
