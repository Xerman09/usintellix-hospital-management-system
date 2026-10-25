import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "pipeline", // "pipeline" | "candidates"
    statusFilter: "all",
    categoryFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedRequestId: null
};

let cache = {
    requestsData: null,
    metrics: null,
    candidatesData: null,
    currentDetail: null
};

export function RefundAuthorizationView() {
    return `<div class="ra-root" id="refundAuthRoot"><div class="ra-loading">Loading Refund Authorization Pipeline…</div></div>`;
}

export async function initRefundAuthorization() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("refundAuthRoot");
    if (!root) return;

    try {
        if (state.view === "pipeline") {
            const params = new URLSearchParams({
                page: state.page,
                per_page: state.perPage,
                status: state.statusFilter,
                category: state.categoryFilter,
                q: state.searchQuery
            });

            const [reqRes, metRes] = await Promise.all([
                api(`/refund-requests?${params.toString()}`).catch(() => null),
                api("/refund-requests/summary").catch(() => null)
            ]);

            cache.requestsData = reqRes?.data || { data: [], total: 0 };
            cache.metrics = metRes?.data || {};

            renderPipelineView(root);
        } else if (state.view === "candidates") {
            const candRes = await api("/refund-requests/candidates").catch(() => null);
            cache.candidatesData = candRes?.data || { deposit_candidates: [], patients: [] };
            renderCandidatesView(root);
        }
    } catch (e) {
        console.error("Refund authorization loading error:", e);
        root.innerHTML = `<div class="ra-error">Error connecting to refund service: ${esc(e.message)}</div>`;
    }
}

// -------------------------------------------------------------
// RENDER: PIPELINE VIEW
// -------------------------------------------------------------
function renderPipelineView(root) {
    const data = cache.requestsData || { data: [], total: 0 };
    const items = data.data || [];
    const m = cache.metrics || {};

    root.innerHTML = `
        <div class="ra-container">
            <!-- Header Bar -->
            <div class="ra-header">
                <div>
                    <h1 class="ra-title">Refund Authorization Pipeline</h1>
                    <p class="ra-subtitle">Hospital Overpayment &amp; Credit Balance Workflow: Biller Request &rarr; Finance Approval &rarr; Payment Voucher &rarr; Disbursement</p>
                </div>
                <div class="ra-header-actions">
                    <button class="ra-btn ra-btn-secondary" id="raBtnSwitchCandidates">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        Credit Balance Candidates
                    </button>
                    <button class="ra-btn ra-btn-secondary" id="raBtnRefresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    <button class="ra-btn ra-btn-primary" id="raBtnOpenCreate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        + Submit Refund Request
                    </button>
                </div>
            </div>

            <!-- Financial Pipeline KPI Cards -->
            <div class="ra-metrics-grid">
                <div class="ra-kpi-card pending">
                    <div class="ra-kpi-header">
                        <span class="ra-kpi-label">Stage 1: Pending Approval</span>
                        <span class="ra-kpi-badge pending">${m.count_pending_approval || 0}</span>
                    </div>
                    <div class="ra-kpi-val">${cur(m.amount_pending_approval)}</div>
                    <div class="ra-kpi-sub">Awaiting Finance Manager Review</div>
                </div>

                <div class="ra-kpi-card approved">
                    <div class="ra-kpi-header">
                        <span class="ra-kpi-label">Stage 2: Approved</span>
                        <span class="ra-kpi-badge approved">${m.count_approved || 0}</span>
                    </div>
                    <div class="ra-kpi-val">${cur(m.amount_approved)}</div>
                    <div class="ra-kpi-sub">Ready for Payment Voucher Issuance</div>
                </div>

                <div class="ra-kpi-card voucher">
                    <div class="ra-kpi-header">
                        <span class="ra-kpi-label">Stage 3: Vouchers Issued</span>
                        <span class="ra-kpi-badge voucher">${m.count_voucher_issued || 0}</span>
                    </div>
                    <div class="ra-kpi-val">${cur(m.amount_voucher_issued)}</div>
                    <div class="ra-kpi-sub">Ready for Cashier Disbursement</div>
                </div>

                <div class="ra-kpi-card disbursed">
                    <div class="ra-kpi-header">
                        <span class="ra-kpi-label">Stage 4: Disbursed &amp; Settled</span>
                        <span class="ra-kpi-badge disbursed">${m.count_disbursed || 0}</span>
                    </div>
                    <div class="ra-kpi-val">${cur(m.amount_disbursed)}</div>
                    <div class="ra-kpi-sub">Funds Released to Patients</div>
                </div>
            </div>

            <!-- Status Tabs & Filter Bar -->
            <div class="ra-controls-card">
                <div class="ra-tabs-row">
                    <button class="ra-tab-btn ${state.statusFilter === 'all' ? 'active' : ''}" data-status="all">
                        All Requests (${m.total_requests || 0})
                    </button>
                    <button class="ra-tab-btn ${state.statusFilter === 'pending_approval' ? 'active' : ''}" data-status="pending_approval">
                        ⏳ Pending Approval (${m.count_pending_approval || 0})
                    </button>
                    <button class="ra-tab-btn ${state.statusFilter === 'approved' ? 'active' : ''}" data-status="approved">
                        ✓ Approved (${m.count_approved || 0})
                    </button>
                    <button class="ra-tab-btn ${state.statusFilter === 'voucher_issued' ? 'active' : ''}" data-status="voucher_issued">
                        💳 Vouchers Issued (${m.count_voucher_issued || 0})
                    </button>
                    <button class="ra-tab-btn ${state.statusFilter === 'disbursed' ? 'active' : ''}" data-status="disbursed">
                        💵 Disbursed (${m.count_disbursed || 0})
                    </button>
                    <button class="ra-tab-btn ${state.statusFilter === 'rejected' ? 'active' : ''}" data-status="rejected">
                        ✕ Rejected (${m.count_rejected || 0})
                    </button>
                </div>

                <div class="ra-filters-row">
                    <div class="ra-search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="raSearchInput" class="ra-input" placeholder="Search Request #, Voucher #, Patient name or MRN..." value="${esc(state.searchQuery)}">
                    </div>

                    <select id="raCategoryFilter" class="ra-select">
                        <option value="all" ${state.categoryFilter === 'all' ? 'selected' : ''}>All Refund Categories</option>
                        <option value="overpayment" ${state.categoryFilter === 'overpayment' ? 'selected' : ''}>Overpayment</option>
                        <option value="retroactive_insurance_adjustment" ${state.categoryFilter === 'retroactive_insurance_adjustment' ? 'selected' : ''}>Retroactive Insurance Adj.</option>
                        <option value="deposit_credit_balance" ${state.categoryFilter === 'deposit_credit_balance' ? 'selected' : ''}>Deposit Credit Balance</option>
                        <option value="duplicate_payment" ${state.categoryFilter === 'duplicate_payment' ? 'selected' : ''}>Duplicate Payment</option>
                        <option value="cancelled_procedure_service" ${state.categoryFilter === 'cancelled_procedure_service' ? 'selected' : ''}>Cancelled Procedure</option>
                        <option value="billing_charge_adjustment" ${state.categoryFilter === 'billing_charge_adjustment' ? 'selected' : ''}>Charge Adjustment</option>
                        <option value="pharmacy_return" ${state.categoryFilter === 'pharmacy_return' ? 'selected' : ''}>Pharmacy Return</option>
                    </select>
                </div>
            </div>

            <!-- Table of Requests -->
            <div class="ra-table-card">
                ${items.length === 0 ? `
                    <div class="ra-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        <h3>No Refund Requests Found</h3>
                        <p>No refund authorization requests match the current filters. Click "+ Submit Refund Request" to create a new approval request.</p>
                    </div>
                ` : `
                    <div class="ra-table-responsive">
                        <table class="ra-table">
                            <thead>
                                <tr>
                                    <th>Request Number</th>
                                    <th>Patient &amp; MRN</th>
                                    <th>Category &amp; Reason</th>
                                    <th>Payee</th>
                                    <th class="text-right">Requested</th>
                                    <th class="text-right">Approved / Disbursed</th>
                                    <th>Status &amp; Stage</th>
                                    <th>Voucher Number</th>
                                    <th>Date</th>
                                    <th class="text-center">Pipeline Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(r => {
                                    const stClass = {
                                        pending_approval: "status-pending",
                                        approved: "status-approved",
                                        voucher_issued: "status-voucher",
                                        disbursed: "status-disbursed",
                                        rejected: "status-rejected",
                                        voided: "status-voided"
                                    }[r.status] || "status-pending";

                                    const stLabel = {
                                        pending_approval: "Pending Approval",
                                        approved: "Approved",
                                        voucher_issued: "Voucher Issued",
                                        disbursed: "Disbursed",
                                        rejected: "Rejected",
                                        voided: "Voided"
                                    }[r.status] || r.status;

                                    return `
                                        <tr>
                                            <td>
                                                <a href="javascript:void(0)" class="ra-req-link raBtnViewDetail" data-id="${r.id}">
                                                    <strong>${esc(r.request_number)}</strong>
                                                </a>
                                            </td>
                                            <td>
                                                <div class="ra-pat-name">${esc(r.patient_name || 'Patient #' + r.patient_id)}</div>
                                                <div class="ra-pat-mrn">MRN: ${esc(r.patient_no || 'N/A')}</div>
                                            </td>
                                            <td>
                                                <span class="ra-tag-cat">${formatCategory(r.refund_reason_category)}</span>
                                                <div class="ra-table-desc" title="${esc(r.refund_reason_description)}">
                                                    ${esc(r.refund_reason_description)}
                                                </div>
                                            </td>
                                            <td>
                                                <div><strong>${esc(r.payee_name || r.patient_name)}</strong></div>
                                                <div class="ra-pat-mrn">Rel: ${esc(r.payee_relationship || 'self')}</div>
                                            </td>
                                            <td class="text-right font-semibold">
                                                ${cur(r.requested_amount)}
                                            </td>
                                            <td class="text-right font-semibold text-emerald">
                                                ${r.status === 'disbursed'
                                                    ? cur(r.disbursed_amount)
                                                    : (r.approved_amount ? cur(r.approved_amount) : '<span class="text-muted">—</span>')}
                                            </td>
                                            <td>
                                                <span class="ra-status-badge ${stClass}">
                                                    ${stLabel}
                                                </span>
                                            </td>
                                            <td>
                                                ${r.voucher_number ? `
                                                    <span class="ra-voucher-tag">${esc(r.voucher_number)}</span>
                                                    <div class="ra-table-sub">${esc(r.disbursement_method || 'check')}</div>
                                                ` : `<span class="text-muted">—</span>`}
                                            </td>
                                            <td class="ra-date-cell">
                                                ${esc(r.requested_at ? r.requested_at.substring(0, 10) : '')}
                                            </td>
                                            <td class="text-center">
                                                <div class="ra-action-group">
                                                    ${r.status === 'pending_approval' ? `
                                                        <button class="ra-btn-action ra-btn-review raBtnReview" data-id="${r.id}" title="Review &amp; Approve/Reject as Finance Manager">
                                                            ⚖ Review
                                                        </button>
                                                    ` : ''}

                                                    ${r.status === 'approved' ? `
                                                        <button class="ra-btn-action ra-btn-voucher raBtnIssueVoucher" data-id="${r.id}" title="Issue Official Payment Voucher">
                                                            💳 Voucher
                                                        </button>
                                                    ` : ''}

                                                    ${r.status === 'voucher_issued' ? `
                                                        <button class="ra-btn-action ra-btn-disburse raBtnDisburse" data-id="${r.id}" title="Disburse Funds &amp; Obtain Recipient Sign-off">
                                                            💵 Disburse
                                                        </button>
                                                    ` : ''}

                                                    <button class="ra-btn-action ra-btn-detail raBtnViewDetail" data-id="${r.id}" title="View Full Details &amp; Audit Trail">
                                                        👁 Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    ${data.total_pages > 1 ? `
                        <div class="ra-pagination">
                            <span>Showing page ${data.page} of ${data.total_pages} (${data.total} requests)</span>
                            <div class="ra-page-controls">
                                <button class="ra-btn ra-btn-secondary" id="raBtnPrevPage" ${data.page <= 1 ? 'disabled' : ''}>Previous</button>
                                <button class="ra-btn ra-btn-secondary" id="raBtnNextPage" ${data.page >= data.total_pages ? 'disabled' : ''}>Next</button>
                            </div>
                        </div>
                    ` : ''}
                `}
            </div>
        </div>

        <!-- MODAL CONTAINERS -->
        <div id="raModalContainer"></div>
    `;

    bindPipelineEvents(root);
}

// -------------------------------------------------------------
// RENDER: CANDIDATES VIEW
// -------------------------------------------------------------
function renderCandidatesView(root) {
    const cands = cache.candidatesData || { deposit_candidates: [], patients: [] };
    const deposits = cands.deposit_candidates || [];

    root.innerHTML = `
        <div class="ra-container">
            <!-- Header Bar -->
            <div class="ra-header">
                <div>
                    <h1 class="ra-title">Credit Balance &amp; Deposit Refund Candidates</h1>
                    <p class="ra-subtitle">Patients with remaining advance deposits or credit balances eligible for refund authorization</p>
                </div>
                <div class="ra-header-actions">
                    <button class="ra-btn ra-btn-secondary" id="raBtnBackToPipeline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to Pipeline
                    </button>
                    <button class="ra-btn ra-btn-primary" id="raBtnOpenCreate">
                        + Submit Refund Request
                    </button>
                </div>
            </div>

            <!-- Table of Deposit Candidates -->
            <div class="ra-table-card">
                <div class="ra-card-subhead">
                    <h3>Eligible Advance Deposits with Unused Balance</h3>
                    <p>Admitted or discharged patients holding active deposits with unutilized credit balance.</p>
                </div>

                ${deposits.length === 0 ? `
                    <div class="ra-empty-state">
                        <h4>No Deposit Credit Balances Found</h4>
                        <p>All active advance deposits are fully drawn down against master folios.</p>
                    </div>
                ` : `
                    <div class="ra-table-responsive">
                        <table class="ra-table">
                            <thead>
                                <tr>
                                    <th>Deposit Number</th>
                                    <th>Patient &amp; MRN</th>
                                    <th>Deposit Category</th>
                                    <th>Original Receipt (OR)</th>
                                    <th class="text-right">Available Credit Balance</th>
                                    <th class="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${deposits.map(d => `
                                    <tr>
                                        <td><strong>${esc(d.deposit_number)}</strong></td>
                                        <td>
                                            <div class="ra-pat-name">${esc(d.patient_name)}</div>
                                            <div class="ra-pat-mrn">MRN: ${esc(d.patient_no)}</div>
                                        </td>
                                        <td><span class="ra-tag-cat">${esc(d.deposit_type)}</span></td>
                                        <td>${esc(d.receipt_number || 'N/A')}</td>
                                        <td class="text-right font-semibold text-emerald">${cur(d.credit_amount)}</td>
                                        <td class="text-center">
                                            <button class="ra-btn ra-btn-primary raBtnInitiateForDeposit"
                                                data-patient-id="${d.patient_id}"
                                                data-patient-name="${esc(d.patient_name)}"
                                                data-deposit-id="${d.deposit_id}"
                                                data-receipt-no="${esc(d.receipt_number)}"
                                                data-credit="${d.credit_amount}">
                                                ⚡ Request Refund
                                            </button>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>

        <div id="raModalContainer"></div>
    `;

    bindCandidatesEvents(root);
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindPipelineEvents(root) {
    root.querySelector("#raBtnRefresh")?.addEventListener("click", () => loadData());

    root.querySelector("#raBtnSwitchCandidates")?.addEventListener("click", () => {
        state.view = "candidates";
        loadData();
    });

    root.querySelector("#raBtnOpenCreate")?.addEventListener("click", () => {
        openCreateModal();
    });

    // Tab Filters
    root.querySelectorAll(".ra-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.statusFilter = btn.getAttribute("data-status");
            state.page = 1;
            loadData();
        });
    });

    // Search
    let searchTimeout;
    root.querySelector("#raSearchInput")?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadData();
        }, 350);
    });

    // Category Filter
    root.querySelector("#raCategoryFilter")?.addEventListener("change", (e) => {
        state.categoryFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    // Pagination
    root.querySelector("#raBtnPrevPage")?.addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            loadData();
        }
    });
    root.querySelector("#raBtnNextPage")?.addEventListener("click", () => {
        state.page++;
        loadData();
    });

    // Action buttons in table
    root.querySelectorAll(".raBtnReview").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openReviewModal(id);
        });
    });

    root.querySelectorAll(".raBtnIssueVoucher").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openVoucherModal(id);
        });
    });

    root.querySelectorAll(".raBtnDisburse").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openDisburseModal(id);
        });
    });

    root.querySelectorAll(".raBtnViewDetail").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openDetailModal(id);
        });
    });
}

function bindCandidatesEvents(root) {
    root.querySelector("#raBtnBackToPipeline")?.addEventListener("click", () => {
        state.view = "pipeline";
        loadData();
    });

    root.querySelector("#raBtnOpenCreate")?.addEventListener("click", () => {
        openCreateModal();
    });

    root.querySelectorAll(".raBtnInitiateForDeposit").forEach(btn => {
        btn.addEventListener("click", () => {
            const patientId = btn.getAttribute("data-patient-id");
            const patientName = btn.getAttribute("data-patient-name");
            const depositId = btn.getAttribute("data-deposit-id");
            const receiptNo = btn.getAttribute("data-receipt-no");
            const credit = parseFloat(btn.getAttribute("data-credit") || "0");

            openCreateModal({
                patientId,
                patientName,
                depositId,
                receiptNo,
                creditAmount: credit,
                category: "deposit_credit_balance",
                description: `Refund of unused advance deposit balance upon discharge.`
            });
        });
    });
}

// -------------------------------------------------------------
// MODALS & DIALOGS
// -------------------------------------------------------------

// 1. Submit Refund Request Modal (Stage 1)
async function openCreateModal(prefill = {}) {
    const container = document.getElementById("raModalContainer");
    if (!container) return;

    let candidatePatients = [];
    try {
        const cRes = await api("/refund-requests/candidates");
        candidatePatients = cRes?.data?.patients || [];
    } catch (e) {
        // Fallback
    }

    container.innerHTML = `
        <div class="ra-modal-backdrop" id="raCreateBackdrop">
            <div class="ra-modal-box">
                <div class="ra-modal-header">
                    <div class="ra-modal-title">
                        <h3>Submit Refund Authorization Request</h3>
                        <p>Stage 1: Biller / Cashier initiates formal refund authorization</p>
                    </div>
                    <button class="ra-modal-close" id="raBtnCloseCreate">&times;</button>
                </div>
                <form id="raFormCreate" class="ra-form">
                    <div class="ra-form-grid">
                        <div class="ra-field full">
                            <label>Select Patient <span class="text-danger">*</span></label>
                            ${prefill.patientId ? `
                                <input type="hidden" name="patient_id" value="${prefill.patientId}">
                                <input type="text" class="ra-input" value="${esc(prefill.patientName)} (ID: ${prefill.patientId})" readonly>
                            ` : `
                                <select name="patient_id" class="ra-select" required id="raCreatePatientSelect">
                                    <option value="">-- Choose Patient --</option>
                                    ${candidatePatients.map(p => `
                                        <option value="${p.id}">${esc(p.patient_name)} (${esc(p.patient_no || 'MRN-' + p.id)})</option>
                                    `).join("")}
                                </select>
                            `}
                        </div>

                        <div class="ra-field">
                            <label>Refund Category <span class="text-danger">*</span></label>
                            <select name="refund_reason_category" class="ra-select" required>
                                <option value="overpayment" ${prefill.category === 'overpayment' ? 'selected' : ''}>Patient Overpayment</option>
                                <option value="deposit_credit_balance" ${prefill.category === 'deposit_credit_balance' ? 'selected' : ''}>Unused Advance Deposit Balance</option>
                                <option value="retroactive_insurance_adjustment" ${prefill.category === 'retroactive_insurance_adjustment' ? 'selected' : ''}>Retroactive Insurance / PhilHealth Adjustment</option>
                                <option value="duplicate_payment" ${prefill.category === 'duplicate_payment' ? 'selected' : ''}>Duplicate Payment Recorded</option>
                                <option value="cancelled_procedure_service" ${prefill.category === 'cancelled_procedure_service' ? 'selected' : ''}>Cancelled Surgery / Procedure</option>
                                <option value="billing_charge_adjustment" ${prefill.category === 'billing_charge_adjustment' ? 'selected' : ''}>Disputed Charge Correction</option>
                                <option value="pharmacy_return" ${prefill.category === 'pharmacy_return' ? 'selected' : ''}>Approved Pharmacy Return</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div class="ra-field">
                            <label>Proposed Disbursement Method <span class="text-danger">*</span></label>
                            <select name="proposed_payment_method" class="ra-select" required>
                                <option value="check">Check (Commercial Bank Check)</option>
                                <option value="cash">Petty Cash / Counter Cash</option>
                                <option value="bank_transfer">Electronic Bank Transfer</option>
                                <option value="credit_card_reversal">Credit Card Reversal</option>
                                <option value="online_wallet">Online Wallet (GCash/Maya)</option>
                            </select>
                        </div>

                        <div class="ra-field">
                            <label>Account Credit Balance ($)</label>
                            <input type="number" step="0.01" min="0" name="total_credit_balance" class="ra-input" value="${prefill.creditAmount || '0.00'}">
                        </div>

                        <div class="ra-field">
                            <label>Requested Refund Amount ($) <span class="text-danger">*</span></label>
                            <input type="number" step="0.01" min="0.01" name="requested_amount" class="ra-input font-semibold" value="${prefill.creditAmount || ''}" required placeholder="0.00">
                        </div>

                        <div class="ra-field">
                            <label>Payee Full Name <span class="text-danger">*</span></label>
                            <input type="text" name="payee_name" class="ra-input" value="${esc(prefill.patientName || '')}" required placeholder="Patient or authorized relative name">
                        </div>

                        <div class="ra-field">
                            <label>Payee Relationship</label>
                            <select name="payee_relationship" class="ra-select">
                                <option value="self">Self (Patient)</option>
                                <option value="spouse">Spouse</option>
                                <option value="parent">Parent / Legal Guardian</option>
                                <option value="child">Son / Daughter</option>
                                <option value="insurance_company">Insurance Payer</option>
                                <option value="other">Authorized Representative</option>
                            </select>
                        </div>

                        <div class="ra-field full">
                            <label>Original Receipt / Deposit Ref (Optional)</label>
                            <input type="text" name="original_receipt_number" class="ra-input" value="${esc(prefill.receiptNo || '')}" placeholder="e.g. OR-2026-00012 or DEP-2026-00004">
                        </div>

                        <div class="ra-field full">
                            <label>Detailed Refund Reason &amp; Clinical/Billing Context <span class="text-danger">*</span></label>
                            <textarea name="refund_reason_description" class="ra-textarea" rows="2" required placeholder="Explain why the credit balance occurred...">${esc(prefill.description || '')}</textarea>
                        </div>

                        <div class="ra-field full">
                            <label>Biller Justification &amp; Notes</label>
                            <textarea name="justification" class="ra-textarea" rows="2" placeholder="Audit justification for Finance Manager..."></textarea>
                        </div>
                    </div>

                    ${prefill.depositId ? `<input type="hidden" name="deposit_id" value="${prefill.depositId}">` : ''}

                    <div class="ra-modal-footer">
                        <button type="button" class="ra-btn ra-btn-secondary" id="raBtnCancelCreate">Cancel</button>
                        <button type="submit" class="ra-btn ra-btn-primary" id="raBtnSubmitCreate">
                            Submit for Finance Approval &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#raBtnCloseCreate")?.addEventListener("click", close);
    container.querySelector("#raBtnCancelCreate")?.addEventListener("click", close);

    const form = container.querySelector("#raFormCreate");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#raBtnSubmitCreate");
        btn.disabled = true;
        btn.innerText = "Submitting...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/refund-requests", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Refund authorization request submitted successfully!", "success");
                close();
                state.view = "pipeline";
                await loadData();
            } else {
                showToast(res?.message || "Failed to submit refund request", "error");
                btn.disabled = false;
                btn.innerText = "Submit for Finance Approval →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Submit for Finance Approval →";
        }
    });
}

// 2. Finance Manager Review & Approval Modal (Stage 2)
async function openReviewModal(requestId) {
    const container = document.getElementById("raModalContainer");
    if (!container) return;

    let req = null;
    try {
        const res = await api(`/refund-requests/detail?id=${requestId}`);
        req = res?.data;
    } catch (e) {
        showToast("Error loading request details", "error");
        return;
    }

    if (!req) return;

    container.innerHTML = `
        <div class="ra-modal-backdrop" id="raReviewBackdrop">
            <div class="ra-modal-box">
                <div class="ra-modal-header">
                    <div class="ra-modal-title">
                        <h3>Finance Manager Review &amp; Approval</h3>
                        <p>Stage 2: Evaluate clinical and billing justification for ${esc(req.request_number)}</p>
                    </div>
                    <button class="ra-modal-close" id="raBtnCloseReview">&times;</button>
                </div>

                <div class="ra-review-summary">
                    <div class="ra-sum-row">
                        <div>
                            <span class="ra-sum-label">Patient:</span>
                            <strong>${esc(req.patient_name)}</strong> (${esc(req.patient_no || 'ID-' + req.patient_id)})
                        </div>
                        <div>
                            <span class="ra-sum-label">Biller:</span>
                            ${esc(req.requested_by_name || 'Billing Staff')} on ${esc(req.requested_at?.substring(0, 10))}
                        </div>
                    </div>
                    <div class="ra-sum-row">
                        <div>
                            <span class="ra-sum-label">Category:</span>
                            <span class="ra-tag-cat">${formatCategory(req.refund_reason_category)}</span>
                        </div>
                        <div>
                            <span class="ra-sum-label">Requested Amount:</span>
                            <span class="font-semibold text-lg text-emerald">${cur(req.requested_amount)}</span>
                        </div>
                    </div>
                    <div class="ra-sum-row">
                        <div>
                            <span class="ra-sum-label">Payee:</span>
                            <strong>${esc(req.payee_name)}</strong> (${esc(req.payee_relationship)})
                        </div>
                        <div>
                            <span class="ra-sum-label">Proposed Method:</span>
                            ${esc(req.proposed_payment_method?.toUpperCase())}
                        </div>
                    </div>
                    <div class="ra-sum-box">
                        <strong>Reason:</strong> ${esc(req.refund_reason_description)}
                    </div>
                    ${req.justification ? `
                        <div class="ra-sum-box alt">
                            <strong>Biller Justification:</strong> ${esc(req.justification)}
                        </div>
                    ` : ''}
                </div>

                <form id="raFormReview" class="ra-form">
                    <input type="hidden" name="id" value="${req.id}">

                    <div class="ra-field full">
                        <label>Review Decision <span class="text-danger">*</span></label>
                        <div class="ra-radio-cards">
                            <label class="ra-radio-card approve">
                                <input type="radio" name="decision" value="approve" checked id="raDecApprove">
                                <div>
                                    <div class="ra-radio-title">✓ Approve Refund</div>
                                    <div class="ra-radio-desc">Authorize accounting to generate Payment Voucher</div>
                                </div>
                            </label>
                            <label class="ra-radio-card reject">
                                <input type="radio" name="decision" value="reject" id="raDecReject">
                                <div>
                                    <div class="ra-radio-title">✕ Reject Request</div>
                                    <div class="ra-radio-desc">Disapprove and return with mandatory rejection reason</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div id="raApproveFields">
                        <div class="ra-field full">
                            <label>Approved Amount ($)</label>
                            <input type="number" step="0.01" min="0.01" name="approved_amount" class="ra-input font-semibold" value="${req.requested_amount}">
                            <div class="ra-input-help">Defaults to requested amount. Can be adjusted for partial approval.</div>
                        </div>
                    </div>

                    <div id="raRejectFields" style="display: none;">
                        <div class="ra-field full">
                            <label>Rejection Reason <span class="text-danger">*</span></label>
                            <input type="text" name="rejection_reason" class="ra-input" placeholder="e.g. Inpatient folio has outstanding pharmacy charges pending...">
                        </div>
                    </div>

                    <div class="ra-field full">
                        <label>Finance Review Comments / Notes</label>
                        <textarea name="notes" class="ra-textarea" rows="2" placeholder="Approval conditions, journal ledger note..."></textarea>
                    </div>

                    <div class="ra-modal-footer">
                        <button type="button" class="ra-btn ra-btn-secondary" id="raBtnCancelReview">Cancel</button>
                        <button type="submit" class="ra-btn ra-btn-primary" id="raBtnSubmitReview">
                            Confirm Review Decision
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#raBtnCloseReview")?.addEventListener("click", close);
    container.querySelector("#raBtnCancelReview")?.addEventListener("click", close);

    const radApprove = container.querySelector("#raDecApprove");
    const radReject = container.querySelector("#raDecReject");
    const appFields = container.querySelector("#raApproveFields");
    const rejFields = container.querySelector("#raRejectFields");

    radApprove?.addEventListener("change", () => {
        appFields.style.display = "block";
        rejFields.style.display = "none";
    });
    radReject?.addEventListener("change", () => {
        appFields.style.display = "none";
        rejFields.style.display = "block";
    });

    const form = container.querySelector("#raFormReview");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#raBtnSubmitReview");
        btn.disabled = true;
        btn.innerText = "Processing...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/refund-requests/review", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Finance review saved successfully!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Failed to process review", "error");
                btn.disabled = false;
                btn.innerText = "Confirm Review Decision";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Confirm Review Decision";
        }
    });
}

// 3. Issue Payment Voucher Modal (Stage 3)
async function openVoucherModal(requestId) {
    const container = document.getElementById("raModalContainer");
    if (!container) return;

    let req = null;
    try {
        const res = await api(`/refund-requests/detail?id=${requestId}`);
        req = res?.data;
    } catch (e) {
        showToast("Error loading request details", "error");
        return;
    }

    if (!req) return;

    container.innerHTML = `
        <div class="ra-modal-backdrop" id="raVoucherBackdrop">
            <div class="ra-modal-box">
                <div class="ra-modal-header">
                    <div class="ra-modal-title">
                        <h3>Issue Payment Voucher (PV)</h3>
                        <p>Stage 3: Accounting formal payment voucher generation for ${esc(req.request_number)}</p>
                    </div>
                    <button class="ra-modal-close" id="raBtnCloseVoucher">&times;</button>
                </div>

                <div class="ra-voucher-summary">
                    <div class="ra-sum-row">
                        <div>
                            <span class="ra-sum-label">Authorized Payee:</span>
                            <strong>${esc(req.payee_name)}</strong> (${esc(req.payee_relationship)})
                        </div>
                        <div>
                            <span class="ra-sum-label">Authorized Amount:</span>
                            <span class="font-semibold text-lg text-emerald">${cur(req.approved_amount || req.requested_amount)}</span>
                        </div>
                    </div>
                </div>

                <form id="raFormVoucher" class="ra-form">
                    <input type="hidden" name="id" value="${req.id}">

                    <div class="ra-field full">
                        <label>Disbursement Payment Method <span class="text-danger">*</span></label>
                        <select name="disbursement_method" class="ra-select" id="raVoucherMethod" required>
                            <option value="check" ${req.proposed_payment_method === 'check' ? 'selected' : ''}>Commercial Check</option>
                            <option value="cash" ${req.proposed_payment_method === 'cash' ? 'selected' : ''}>Cash / Counter Vault</option>
                            <option value="bank_transfer" ${req.proposed_payment_method === 'bank_transfer' ? 'selected' : ''}>Electronic Bank Transfer</option>
                            <option value="credit_card_reversal" ${req.proposed_payment_method === 'credit_card_reversal' ? 'selected' : ''}>Credit Card Reversal</option>
                            <option value="online_wallet" ${req.proposed_payment_method === 'online_wallet' ? 'selected' : ''}>Online Wallet</option>
                        </select>
                    </div>

                    <div id="raVoucherCheckFields">
                        <div class="ra-field">
                            <label>Check Number</label>
                            <input type="text" name="check_number" class="ra-input" placeholder="e.g. CHK-771892">
                        </div>
                        <div class="ra-field">
                            <label>Bank Name</label>
                            <input type="text" name="bank_name" class="ra-input" placeholder="e.g. JPMorgan Chase / Metro Bank">
                        </div>
                    </div>

                    <div id="raVoucherTransferFields" style="display: none;">
                        <div class="ra-field">
                            <label>Bank / Routing Name</label>
                            <input type="text" name="bank_name" class="ra-input" placeholder="Recipient Bank Name">
                        </div>
                        <div class="ra-field">
                            <label>Account Number</label>
                            <input type="text" name="bank_account_number" class="ra-input" placeholder="Account Number">
                        </div>
                        <div class="ra-field full">
                            <label>Transaction / Reference #</label>
                            <input type="text" name="transaction_reference" class="ra-input" placeholder="Wire / ACH / Reference Code">
                        </div>
                    </div>

                    <div class="ra-modal-footer">
                        <button type="button" class="ra-btn ra-btn-secondary" id="raBtnCancelVoucher">Cancel</button>
                        <button type="submit" class="ra-btn ra-btn-primary" id="raBtnSubmitVoucher">
                            Generate Payment Voucher (PV-YYYY-XXXXX) &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#raBtnCloseVoucher")?.addEventListener("click", close);
    container.querySelector("#raBtnCancelVoucher")?.addEventListener("click", close);

    const methodSelect = container.querySelector("#raVoucherMethod");
    const checkFields = container.querySelector("#raVoucherCheckFields");
    const transferFields = container.querySelector("#raVoucherTransferFields");

    methodSelect?.addEventListener("change", () => {
        const val = methodSelect.value;
        if (val === "check") {
            checkFields.style.display = "grid";
            transferFields.style.display = "none";
        } else if (val === "bank_transfer" || val === "credit_card_reversal" || val === "online_wallet") {
            checkFields.style.display = "none";
            transferFields.style.display = "grid";
        } else {
            checkFields.style.display = "none";
            transferFields.style.display = "none";
        }
    });

    const form = container.querySelector("#raFormVoucher");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#raBtnSubmitVoucher");
        btn.disabled = true;
        btn.innerText = "Generating Voucher...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/refund-requests/voucher", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Payment voucher generated successfully!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Failed to generate voucher", "error");
                btn.disabled = false;
                btn.innerText = "Generate Payment Voucher →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Generate Payment Voucher →";
        }
    });
}

// 4. Disburse & Release Funds Modal (Stage 4)
async function openDisburseModal(requestId) {
    const container = document.getElementById("raModalContainer");
    if (!container) return;

    let req = null;
    try {
        const res = await api(`/refund-requests/detail?id=${requestId}`);
        req = res?.data;
    } catch (e) {
        showToast("Error loading request details", "error");
        return;
    }

    if (!req) return;

    const amount = req.approved_amount || req.requested_amount;

    container.innerHTML = `
        <div class="ra-modal-backdrop" id="raDisburseBackdrop">
            <div class="ra-modal-box">
                <div class="ra-modal-header">
                    <div class="ra-modal-title">
                        <h3>Disburse Refund &amp; Sign-off</h3>
                        <p>Stage 4: Treasury / Cashier release of funds under Voucher ${esc(req.voucher_number || 'Pending')}</p>
                    </div>
                    <button class="ra-modal-close" id="raBtnCloseDisburse">&times;</button>
                </div>

                <div class="ra-disburse-hero">
                    <span class="ra-disburse-hero-label">Total Cash / Check Released</span>
                    <span class="ra-disburse-hero-val">${cur(amount)}</span>
                    <span class="ra-disburse-hero-sub">Voucher ${esc(req.voucher_number || 'N/A')} &bull; Payee: ${esc(req.payee_name)}</span>
                </div>

                <form id="raFormDisburse" class="ra-form">
                    <input type="hidden" name="id" value="${req.id}">
                    <input type="hidden" name="disbursed_amount" value="${amount}">

                    <div class="ra-field">
                        <label>Payee Government ID Type <span class="text-danger">*</span></label>
                        <select name="payee_id_type" class="ra-select" required>
                            <option value="Driver License">Driver's License</option>
                            <option value="Passport">Passport</option>
                            <option value="National ID">National ID / PhilSys</option>
                            <option value="Hospital ID">Hospital Patient Card</option>
                            <option value="Social Security">Social Security / UMID</option>
                            <option value="Other">Other Verified ID</option>
                        </select>
                    </div>

                    <div class="ra-field">
                        <label>ID Document Number <span class="text-danger">*</span></label>
                        <input type="text" name="payee_id_number" class="ra-input" required placeholder="e.g. D02-19-992819">
                    </div>

                    <div class="ra-field full">
                        <label>Cashier Release Notes / Recipient Acknowledgement</label>
                        <textarea name="disbursement_notes" class="ra-textarea" rows="2" placeholder="e.g. Check handed to patient in person; signature verified."></textarea>
                    </div>

                    <div class="ra-modal-footer">
                        <button type="button" class="ra-btn ra-btn-secondary" id="raBtnCancelDisburse">Cancel</button>
                        <button type="submit" class="ra-btn ra-btn-primary" id="raBtnSubmitDisburse">
                            Confirm Disbursement &amp; Post to Ledger &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#raBtnCloseDisburse")?.addEventListener("click", close);
    container.querySelector("#raBtnCancelDisburse")?.addEventListener("click", close);

    const form = container.querySelector("#raFormDisburse");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#raBtnSubmitDisburse");
        btn.disabled = true;
        btn.innerText = "Releasing Funds...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/refund-requests/disburse", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Refund disbursed and posted to patient ledger!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Failed to disburse refund", "error");
                btn.disabled = false;
                btn.innerText = "Confirm Disbursement & Post to Ledger →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Confirm Disbursement & Post to Ledger →";
        }
    });
}

// 5. Full Detail & Audit Trail Modal
async function openDetailModal(requestId) {
    const container = document.getElementById("raModalContainer");
    if (!container) return;

    let req = null;
    try {
        const res = await api(`/refund-requests/detail?id=${requestId}`);
        req = res?.data;
    } catch (e) {
        showToast("Error loading request details", "error");
        return;
    }

    if (!req) return;

    const trail = req.audit_trail || [];

    // Stepper active states
    const isStep1 = true;
    const isStep2 = ['approved', 'voucher_issued', 'disbursed'].includes(req.status);
    const isStep3 = ['voucher_issued', 'disbursed'].includes(req.status);
    const isStep4 = req.status === 'disbursed';
    const isRejected = req.status === 'rejected';

    container.innerHTML = `
        <div class="ra-modal-backdrop" id="raDetailBackdrop">
            <div class="ra-modal-box ra-modal-lg">
                <div class="ra-modal-header">
                    <div class="ra-modal-title">
                        <h3>Refund Authorization #${esc(req.request_number)}</h3>
                        <p>Complete lifecycle audit trail and payment voucher details</p>
                    </div>
                    <button class="ra-modal-close" id="raBtnCloseDetail">&times;</button>
                </div>

                <!-- 4-Stage Visual Progress Stepper -->
                <div class="ra-stepper">
                    <div class="ra-step ${isStep1 ? 'active' : ''}">
                        <div class="ra-step-num">1</div>
                        <div class="ra-step-label">Biller Request</div>
                        <div class="ra-step-meta">${esc(req.requested_by_name || 'Staff')}</div>
                    </div>
                    <div class="ra-step-line ${isStep2 ? 'done' : ''}"></div>
                    <div class="ra-step ${isStep2 ? 'active' : (isRejected ? 'rejected' : '')}">
                        <div class="ra-step-num">${isRejected ? '✕' : '2'}</div>
                        <div class="ra-step-label">Finance Approval</div>
                        <div class="ra-step-meta">${esc(req.reviewed_by_name || 'Pending')}</div>
                    </div>
                    <div class="ra-step-line ${isStep3 ? 'done' : ''}"></div>
                    <div class="ra-step ${isStep3 ? 'active' : ''}">
                        <div class="ra-step-num">3</div>
                        <div class="ra-step-label">Payment Voucher</div>
                        <div class="ra-step-meta">${esc(req.voucher_number || 'Awaiting')}</div>
                    </div>
                    <div class="ra-step-line ${isStep4 ? 'done' : ''}"></div>
                    <div class="ra-step ${isStep4 ? 'active' : ''}">
                        <div class="ra-step-num">4</div>
                        <div class="ra-step-label">Disbursement</div>
                        <div class="ra-step-meta">${req.disbursed_at ? 'Released' : 'Pending'}</div>
                    </div>
                </div>

                <!-- Detail Tabs / Info -->
                <div class="ra-detail-grid">
                    <div class="ra-detail-pane">
                        <h4>Financial Breakdown</h4>
                        <table class="ra-detail-table">
                            <tr>
                                <td>Patient</td>
                                <td><strong>${esc(req.patient_name)}</strong> (MRN: ${esc(req.patient_no || 'N/A')})</td>
                            </tr>
                            <tr>
                                <td>Payee / Beneficiary</td>
                                <td><strong>${esc(req.payee_name)}</strong> (${esc(req.payee_relationship)})</td>
                            </tr>
                            <tr>
                                <td>Refund Reason Category</td>
                                <td><span class="ra-tag-cat">${formatCategory(req.refund_reason_category)}</span></td>
                            </tr>
                            <tr>
                                <td>Account Credit Balance</td>
                                <td>${cur(req.total_credit_balance)}</td>
                            </tr>
                            <tr>
                                <td>Requested Amount</td>
                                <td class="font-semibold">${cur(req.requested_amount)}</td>
                            </tr>
                            <tr>
                                <td>Approved Amount</td>
                                <td class="font-semibold text-emerald">${req.approved_amount ? cur(req.approved_amount) : 'Pending Review'}</td>
                            </tr>
                            <tr>
                                <td>Disbursed Amount</td>
                                <td class="font-semibold text-emerald">${req.disbursed_amount ? cur(req.disbursed_amount) : 'Not Released Yet'}</td>
                            </tr>
                            <tr>
                                <td>Payment Voucher</td>
                                <td>${req.voucher_number ? `<strong>${esc(req.voucher_number)}</strong>` : '—'}</td>
                            </tr>
                            <tr>
                                <td>Disbursement Method</td>
                                <td>${esc(req.disbursement_method || req.proposed_payment_method || '—')}</td>
                            </tr>
                            ${req.check_number ? `
                                <tr>
                                    <td>Check Number</td>
                                    <td>${esc(req.check_number)} (${esc(req.bank_name || 'N/A')})</td>
                                </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div class="ra-detail-pane">
                        <h4>Audit Trail &amp; Sign-offs (${trail.length} entries)</h4>
                        <div class="ra-timeline">
                            ${trail.map(t => `
                                <div class="ra-timeline-item">
                                    <div class="ra-timeline-dot ${t.action.toLowerCase()}"></div>
                                    <div class="ra-timeline-content">
                                        <div class="ra-timeline-header">
                                            <strong>${esc(t.action)}</strong>
                                            <span>${esc(t.performed_at)}</span>
                                        </div>
                                        <div class="ra-timeline-user">By: ${esc(t.performed_by_name || 'System')}</div>
                                        ${t.comments ? `<div class="ra-timeline-comm">${esc(t.comments)}</div>` : ''}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <div class="ra-modal-footer">
                    <button type="button" class="ra-btn ra-btn-secondary" id="raBtnCloseDetailFooter">Close</button>
                    ${req.status === 'voucher_issued' || req.status === 'disbursed' ? `
                        <button type="button" class="ra-btn ra-btn-primary" id="raBtnPrintVoucher">
                            🖨 Print Payment Voucher Slip
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#raBtnCloseDetail")?.addEventListener("click", close);
    container.querySelector("#raBtnCloseDetailFooter")?.addEventListener("click", close);

    container.querySelector("#raBtnPrintVoucher")?.addEventListener("click", () => {
        printVoucherSlip(req);
    });
}

function printVoucherSlip(req) {
    const w = window.open("", "_blank", "width=800,height=700");
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Voucher - ${esc(req.voucher_number || req.request_number)}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
                .box label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px; }
                .amount-box { background: #f8fafc; border: 2px solid #0f172a; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0; }
                .amount-box .val { font-size: 26px; font-weight: bold; color: #059669; }
                .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 50px; text-align: center; }
                .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; font-weight: bold; }
                .sig-title { font-size: 11px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HOSPITAL OFFICIAL PAYMENT VOUCHER</h1>
                <p>USIntellix Healthcare Health System &bull; Treasury &amp; Accounts Payable</p>
                <p><strong>VOUCHER NUMBER: ${esc(req.voucher_number || 'PV-PENDING')}</strong> &bull; Date: ${esc(req.voucher_issued_at || new Date().toISOString().substring(0, 10))}</p>
            </div>

            <div class="grid">
                <div class="box">
                    <label>Payee Details</label>
                    <div><strong>${esc(req.payee_name)}</strong></div>
                    <div>Relationship: ${esc(req.payee_relationship)}</div>
                    <div>Patient: ${esc(req.patient_name)} (MRN: ${esc(req.patient_no || 'N/A')})</div>
                </div>
                <div class="box">
                    <label>Disbursement Details</label>
                    <div>Method: <strong>${esc((req.disbursement_method || req.proposed_payment_method || 'check').toUpperCase())}</strong></div>
                    ${req.check_number ? `<div>Check #: ${esc(req.check_number)}</div><div>Bank: ${esc(req.bank_name || 'N/A')}</div>` : ''}
                    <div>Request #: ${esc(req.request_number)}</div>
                </div>
            </div>

            <div class="amount-box">
                <label>NET REFUND AMOUNT AUTHORIZED</label>
                <div class="val">${cur(req.approved_amount || req.requested_amount)}</div>
                <div>Category: ${esc(formatCategory(req.refund_reason_category))}</div>
            </div>

            <div class="box">
                <label>Reason / Justification</label>
                <div>${esc(req.refund_reason_description)}</div>
                ${req.approval_notes ? `<div><em>Finance Notes: ${esc(req.approval_notes)}</em></div>` : ''}
            </div>

            <div class="signatures">
                <div>
                    <div style="height: 40px;"></div>
                    <div class="sig-line">${esc(req.requested_by_name || 'Billing Clerk')}</div>
                    <div class="sig-title">Prepared By (Biller)</div>
                </div>
                <div>
                    <div style="height: 40px;"></div>
                    <div class="sig-line">${esc(req.reviewed_by_name || 'Finance Manager')}</div>
                    <div class="sig-title">Approved By (Finance)</div>
                </div>
                <div>
                    <div style="height: 40px;"></div>
                    <div class="sig-line">${esc(req.payee_name)}</div>
                    <div class="sig-title">Payee Signature / Received</div>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    w.document.close();
}

// -------------------------------------------------------------
// HELPER FORMATTERS
// -------------------------------------------------------------
function formatCategory(cat) {
    const map = {
        overpayment: "Overpayment",
        retroactive_insurance_adjustment: "Insurance Adjustment",
        deposit_credit_balance: "Deposit Balance",
        duplicate_payment: "Duplicate Payment",
        cancelled_procedure_service: "Cancelled Procedure",
        billing_charge_adjustment: "Charge Adjustment",
        pharmacy_return: "Pharmacy Return",
        other: "Other"
    };
    return map[cat] || cat;
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("raModuleStyles")) return;
    const style = document.createElement("style");
    style.id = "raModuleStyles";
    style.textContent = `
        .ra-root { padding: 24px; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; }
        .ra-loading { padding: 40px; text-align: center; color: #64748b; font-size: 16px; }
        .ra-error { padding: 20px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; }

        .ra-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .ra-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .ra-subtitle { color: #64748b; margin: 4px 0 0; font-size: 14px; }
        .ra-header-actions { display: flex; gap: 10px; align-items: center; }

        .ra-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .ra-btn svg { width: 16px; height: 16px; }
        .ra-btn-primary { background: #2563eb; color: #fff; }
        .ra-btn-primary:hover { background: #1d4ed8; }
        .ra-btn-secondary { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
        .ra-btn-secondary:hover { background: #f8fafc; }

        /* KPI Grid */
        .ra-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .ra-kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .ra-kpi-card.pending { border-left: 4px solid #f59e0b; }
        .ra-kpi-card.approved { border-left: 4px solid #3b82f6; }
        .ra-kpi-card.voucher { border-left: 4px solid #8b5cf6; }
        .ra-kpi-card.disbursed { border-left: 4px solid #10b981; }

        .ra-kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ra-kpi-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; }
        .ra-kpi-badge { font-size: 11px; padding: 2px 7px; border-radius: 999px; font-weight: 700; }
        .ra-kpi-badge.pending { background: #fef3c7; color: #b45309; }
        .ra-kpi-badge.approved { background: #dbeafe; color: #1e40af; }
        .ra-kpi-badge.voucher { background: #ede9fe; color: #6d28d9; }
        .ra-kpi-badge.disbursed { background: #d1fae5; color: #065f46; }
        .ra-kpi-val { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .ra-kpi-sub { font-size: 12px; color: #64748b; }

        /* Controls Card */
        .ra-controls-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .ra-tabs-row { display: flex; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 12px; overflow-x: auto; }
        .ra-tab-btn { background: none; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; white-space: nowrap; }
        .ra-tab-btn:hover { background: #f8fafc; color: #0f172a; }
        .ra-tab-btn.active { background: #f1f5f9; color: #0f172a; font-weight: 700; }

        .ra-filters-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .ra-search-wrap { position: relative; flex: 1; min-width: 260px; }
        .ra-search-wrap svg { position: absolute; left: 10px; top: 10px; width: 16px; height: 16px; color: #94a3b8; }
        .ra-search-wrap .ra-input { padding-left: 34px; width: 100%; box-sizing: border-box; }

        .ra-input, .ra-select, .ra-textarea { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #1e293b; background: #fff; outline: none; }
        .ra-input:focus, .ra-select:focus, .ra-textarea:focus { border-color: #3b82f6; ring: 2px rgba(59,130,246,0.1); }

        /* Table Card */
        .ra-table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .ra-table-responsive { overflow-x: auto; }
        .ra-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .ra-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .ra-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .ra-table tr:hover { background: #f8fafc; }

        .ra-req-link { color: #2563eb; text-decoration: none; font-size: 13px; }
        .ra-req-link:hover { text-decoration: underline; }
        .ra-pat-name { font-weight: 600; color: #0f172a; }
        .ra-pat-mrn { font-size: 11px; color: #64748b; }
        .ra-tag-cat { display: inline-block; padding: 2px 6px; background: #f1f5f9; color: #475569; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 2px; }
        .ra-table-desc { font-size: 11px; color: #64748b; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ra-table-sub { font-size: 11px; color: #64748b; }
        .ra-voucher-tag { font-family: monospace; font-size: 12px; font-weight: 700; color: #6d28d9; background: #f5f3ff; padding: 2px 6px; border-radius: 4px; }

        .ra-status-badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-pending { background: #fef3c7; color: #b45309; }
        .status-approved { background: #dbeafe; color: #1e40af; }
        .status-voucher { background: #ede9fe; color: #6d28d9; }
        .status-disbursed { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .status-voided { background: #f1f5f9; color: #64748b; }

        .ra-action-group { display: flex; gap: 6px; justify-content: center; }
        .ra-btn-action { border: 1px solid #cbd5e1; background: #fff; padding: 5px 9px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .ra-btn-review { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
        .ra-btn-review:hover { background: #dbeafe; }
        .ra-btn-voucher { border-color: #8b5cf6; color: #6d28d9; background: #f5f3ff; }
        .ra-btn-voucher:hover { background: #ede9fe; }
        .ra-btn-disburse { border-color: #10b981; color: #065f46; background: #ecfdf5; }
        .ra-btn-disburse:hover { background: #d1fae5; }
        .ra-btn-detail:hover { background: #f1f5f9; }

        .ra-empty-state { text-align: center; padding: 48px 24px; color: #64748b; }
        .ra-empty-state svg { width: 44px; height: 44px; color: #cbd5e1; margin-bottom: 12px; }
        .ra-empty-state h3, .ra-empty-state h4 { color: #0f172a; margin: 0 0 6px; }

        .ra-pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
        .ra-page-controls { display: flex; gap: 8px; }

        /* Candidate Card Subhead */
        .ra-card-subhead { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
        .ra-card-subhead h3 { margin: 0 0 4px; font-size: 16px; color: #0f172a; }
        .ra-card-subhead p { margin: 0; font-size: 13px; color: #64748b; }

        /* Modal Styles */
        .ra-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; box-sizing: border-box; }
        .ra-modal-box { background: #fff; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
        .ra-modal-lg { max-width: 860px; }
        .ra-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
        .ra-modal-title h3 { margin: 0; font-size: 18px; color: #0f172a; }
        .ra-modal-title p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        .ra-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
        .ra-modal-close:hover { color: #0f172a; }

        .ra-form { padding: 20px 24px; }
        .ra-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ra-field { display: flex; flex-direction: column; gap: 6px; }
        .ra-field.full { grid-column: 1 / -1; }
        .ra-field label { font-size: 12px; font-weight: 600; color: #334155; }
        .ra-input-help { font-size: 11px; color: #64748b; }

        .ra-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

        /* Review Summary Box */
        .ra-review-summary, .ra-voucher-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 16px 24px 0; }
        .ra-sum-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .ra-sum-label { color: #64748b; margin-right: 6px; }
        .ra-sum-box { margin-top: 8px; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #334155; }
        .ra-sum-box.alt { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }

        .ra-radio-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ra-radio-card { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; }
        .ra-radio-card:has(input:checked) { border-color: #2563eb; background: #f8fafc; }
        .ra-radio-title { font-weight: 600; font-size: 13px; color: #0f172a; }
        .ra-radio-desc { font-size: 11px; color: #64748b; }

        .ra-disburse-hero { text-align: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin: 16px 24px 0; }
        .ra-disburse-hero-label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #065f46; margin-bottom: 4px; }
        .ra-disburse-hero-val { font-size: 32px; font-weight: 800; color: #047857; display: block; }
        .ra-disburse-hero-sub { font-size: 12px; color: #065f46; }

        /* Visual Stepper */
        .ra-stepper { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
        .ra-step { text-align: center; flex: 1; position: relative; }
        .ra-step-num { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; color: #64748b; font-weight: 700; line-height: 32px; margin: 0 auto 6px; font-size: 13px; }
        .ra-step.active .ra-step-num { background: #2563eb; color: #fff; }
        .ra-step.rejected .ra-step-num { background: #ef4444; color: #fff; }
        .ra-step-label { font-size: 12px; font-weight: 600; color: #0f172a; }
        .ra-step-meta { font-size: 10px; color: #64748b; }
        .ra-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 4px 20px; }
        .ra-step-line.done { background: #2563eb; }

        .ra-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px 24px; }
        .ra-detail-pane h4 { margin: 0 0 12px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
        .ra-detail-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ra-detail-table td { padding: 6px 0; border-bottom: 1px solid #f8fafc; }
        .ra-detail-table td:first-child { color: #64748b; width: 45%; }

        .ra-timeline { display: flex; flex-direction: column; gap: 12px; }
        .ra-timeline-item { display: flex; gap: 12px; }
        .ra-timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; margin-top: 5px; flex-shrink: 0; }
        .ra-timeline-dot.submitted { background: #f59e0b; }
        .ra-timeline-dot.approved { background: #3b82f6; }
        .ra-timeline-dot.voucher_issued { background: #8b5cf6; }
        .ra-timeline-dot.disbursed { background: #10b981; }
        .ra-timeline-dot.rejected { background: #ef4444; }
        .ra-timeline-content { flex: 1; font-size: 12px; }
        .ra-timeline-header { display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; }
        .ra-timeline-header span { font-weight: normal; font-size: 10px; color: #94a3b8; }
        .ra-timeline-user { font-size: 11px; color: #64748b; }
        .ra-timeline-comm { margin-top: 4px; padding: 4px 8px; background: #f8fafc; border-radius: 4px; color: #334155; font-size: 11px; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .text-emerald { color: #059669; }
        .text-danger { color: #dc2626; }
        .text-muted { color: #94a3b8; }
        .text-lg { font-size: 16px; }
    `;
    document.head.appendChild(style);
}
