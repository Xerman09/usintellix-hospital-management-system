import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "list", // "list" | "detail" | "admissions"
    selectedFolioId: null,
    statusFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    activeTab: "all_charges" // "all_charges" | "accommodation" | "doctor_fees" | "operating_theater" | "laboratory" | "radiology" | "pharmacy" | "supplies_misc" | "payments"
};

let cache = {
    foliosData: null,
    currentFolio: null,
    admissionsList: null
};

export function InpatientBillingView() {
    return `<div class="ib-root" id="inpatientBillingRoot"><div class="ib-loading">Loading Inpatient Master Folio & Cashiering…</div></div>`;
}

export async function initInpatientBilling() {
    ensureCss();
    await loadCurrentView();
}

async function loadCurrentView(quiet = false) {
    const root = document.getElementById("inpatientBillingRoot");
    if (!root) return;

    try {
        if (state.view === "list") {
            const params = new URLSearchParams();
            if (state.statusFilter && state.statusFilter !== "all") params.append("status", state.statusFilter);
            if (state.searchQuery) params.append("q", state.searchQuery);
            params.append("page", state.page);
            params.append("per_page", state.perPage);

            const res = await api(`/inpatient-billing/folios?${params.toString()}`);
            if (res?.success) {
                cache.foliosData = res.data;
                renderListView(root);
            } else {
                if (!quiet) root.innerHTML = `<div class="ib-error">${esc(res?.message || "Failed to load master folios")}</div>`;
            }
        } else if (state.view === "detail" && state.selectedFolioId) {
            const res = await api(`/inpatient-billing/folios/detail?id=${state.selectedFolioId}`);
            if (res?.success) {
                cache.currentFolio = res.data;
                renderDetailView(root);
            } else {
                if (!quiet) root.innerHTML = `<div class="ib-error">${esc(res?.message || "Failed to load statement of account")}</div>`;
            }
        } else if (state.view === "admissions") {
            const res = await api(`/inpatient-billing/admissions`);
            if (res?.success) {
                cache.admissionsList = res.data;
                renderAdmissionsView(root);
            } else {
                if (!quiet) root.innerHTML = `<div class="ib-error">${esc(res?.message || "Failed to load active admissions")}</div>`;
            }
        }
    } catch (err) {
        console.error("Error loading inpatient billing view:", err);
        if (!quiet) root.innerHTML = `<div class="ib-error">Connection or server error: ${esc(err.message)}</div>`;
    }
}

// -------------------------------------------------------------
// RENDER: LIST VIEW
// -------------------------------------------------------------
function renderListView(root) {
    const data = cache.foliosData || { items: [], total: 0 };
    const items = data.items || [];
    
    // Quick calculations for stats
    let openCount = 0;
    let forClearanceCount = 0;
    let closedCount = 0;
    let totalOutstanding = 0;
    let totalPaid = 0;

    items.forEach(f => {
        if (f.status === "open" || f.status === "interim") openCount++;
        else if (f.status === "for_billing_clearance") forClearanceCount++;
        else if (f.status === "closed") closedCount++;
        totalOutstanding += Number(f.balance_due || 0);
        totalPaid += Number(f.paid_amount || 0);
    });

    root.innerHTML = `
        <div class="ib-container">
            <!-- Header Bar -->
            <div class="ib-header">
                <div>
                    <h1 class="ib-title">Inpatient Billing &amp; Master Folio</h1>
                    <p class="ib-subtitle">Consolidated Inpatient Accounts, Departmental Charges, Cashiering &amp; Discharge Clearance</p>
                </div>
                <div class="ib-header-actions">
                    <button class="ib-btn ib-btn-secondary" id="ibBtnViewAdmissions">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Inpatient ADT Registry
                    </button>
                    <button class="ib-btn ib-btn-primary" id="ibBtnRefreshList">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh List
                    </button>
                </div>
            </div>

            <!-- Stats Ribbon -->
            <div class="ib-stats-grid">
                <div class="ib-stat-card">
                    <div class="ib-stat-label">Active Folios</div>
                    <div class="ib-stat-val text-blue">${openCount + forClearanceCount}</div>
                    <div class="ib-stat-sub">${openCount} Accruing · ${forClearanceCount} For Clearance</div>
                </div>
                <div class="ib-stat-card">
                    <div class="ib-stat-label">Pending Billing Clearance</div>
                    <div class="ib-stat-val ${forClearanceCount > 0 ? 'text-amber' : 'text-gray'}">${forClearanceCount}</div>
                    <div class="ib-stat-sub">Discharge clearance requested</div>
                </div>
                <div class="ib-stat-card">
                    <div class="ib-stat-label">Total Outstanding Balance</div>
                    <div class="ib-stat-val text-rose">${cur(totalOutstanding)}</div>
                    <div class="ib-stat-sub">Uncollected patient share</div>
                </div>
                <div class="ib-stat-card">
                    <div class="ib-stat-label">Payments Collected</div>
                    <div class="ib-stat-val text-emerald">${cur(totalPaid)}</div>
                    <div class="ib-stat-sub">Official cashier receipts</div>
                </div>
            </div>

            <!-- Filter & Search Bar -->
            <div class="ib-filter-bar">
                <div class="ib-search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="ibSearchInput" placeholder="Search folio #, admission #, patient name, MRN..." value="${esc(state.searchQuery)}">
                    ${state.searchQuery ? `<button class="ib-clear-btn" id="ibClearSearch">&times;</button>` : ""}
                </div>

                <div class="ib-filter-tabs">
                    <button class="ib-tab-btn ${state.statusFilter === 'all' ? 'active' : ''}" data-status="all">All Folios</button>
                    <button class="ib-tab-btn ${state.statusFilter === 'open' ? 'active' : ''}" data-status="open">Open (Accruing)</button>
                    <button class="ib-tab-btn ${state.statusFilter === 'for_billing_clearance' ? 'active' : ''}" data-status="for_billing_clearance">For Clearance</button>
                    <button class="ib-tab-btn ${state.statusFilter === 'closed' ? 'active' : ''}" data-status="closed">Closed / Cleared</button>
                </div>
            </div>

            <!-- Master Folios Table -->
            <div class="ib-table-card">
                <table class="ib-table">
                    <thead>
                        <tr>
                            <th>Folio Number</th>
                            <th>Patient / MRN</th>
                            <th>Admission &amp; Bed</th>
                            <th>Length of Stay</th>
                            <th class="text-right">Gross Charges</th>
                            <th class="text-right">Discount &amp; Ins.</th>
                            <th class="text-right">Net Payable</th>
                            <th class="text-right">Paid</th>
                            <th class="text-right">Balance Due</th>
                            <th>Clearance Status</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="11" class="ib-no-data">
                                    <div class="ib-empty-state">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                        <h4>No Inpatient Folios Found</h4>
                                        <p>Click "Inpatient ADT Registry" to generate or open a master folio for admitted patients.</p>
                                    </div>
                                </td>
                            </tr>
                        ` : items.map(f => {
                            const balance = Number(f.balance_due || 0);
                            const isZeroBalance = balance <= 0.05;
                            const isCleared = f.billing_cleared == 1 || f.status === 'closed';

                            let statusBadge = '';
                            if (isCleared) {
                                statusBadge = `<span class="ib-badge ib-badge-success">✓ Cleared &amp; Closed</span>`;
                            } else if (f.status === 'for_billing_clearance') {
                                statusBadge = `<span class="ib-badge ib-badge-warning">⚡ For Billing Clearance</span>`;
                            } else {
                                statusBadge = `<span class="ib-badge ib-badge-info">Active / Accruing</span>`;
                            }

                            return `
                                <tr>
                                    <td>
                                        <strong class="ib-folio-num text-blue">${esc(f.folio_number)}</strong>
                                        <div class="ib-meta-sub">Created ${esc(f.opened_at ? f.opened_at.slice(0, 10) : '')}</div>
                                    </td>
                                    <td>
                                        <strong>${esc(f.patient_name || 'Patient #' + f.patient_id)}</strong>
                                        <div class="ib-meta-sub">${esc(f.patient_mrn || f.patient_no || 'MRN-N/A')}</div>
                                    </td>
                                    <td>
                                        <div>${esc(f.admission_number || 'ADM-' + f.admission_id)}</div>
                                        <div class="ib-meta-sub">${esc(f.ward_name || 'General')} · Bed ${esc(f.bed_number || 'N/A')}</div>
                                    </td>
                                    <td>
                                        <strong>${Number(f.bed_days || 0).toFixed(1)} Days</strong>
                                        <div class="ib-meta-sub">${esc(f.daily_rate ? cur(f.daily_rate) + '/day' : 'Daily Rate')}</div>
                                    </td>
                                    <td class="text-right">${cur(f.gross_amount)}</td>
                                    <td class="text-right text-muted">${cur(Number(f.discount_amount || 0) + Number(f.insurance_covered_amount || 0))}</td>
                                    <td class="text-right font-semibold">${cur(f.net_amount)}</td>
                                    <td class="text-right text-emerald font-semibold">${cur(f.paid_amount)}</td>
                                    <td class="text-right">
                                        <span class="ib-balance-pill ${isZeroBalance ? 'cleared' : 'owing'}">
                                            ${cur(balance)}
                                        </span>
                                    </td>
                                    <td>${statusBadge}</td>
                                    <td class="text-center">
                                        <div class="ib-action-group">
                                            <button class="ib-action-btn ib-btn-primary ibBtnOpenFolio" data-id="${f.id}" title="Open Statement of Account">
                                                Statement of Account
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    bindListEvents(root);
}

// -------------------------------------------------------------
// RENDER: STATEMENT OF ACCOUNT (DETAIL VIEW)
// -------------------------------------------------------------
function renderDetailView(root) {
    const f = cache.currentFolio;
    if (!f) return;

    const balance = Number(f.balance_due || 0);
    const isZeroBalance = balance <= 0.05;
    const isCleared = f.billing_cleared == 1 || f.status === 'closed';

    const categories = f.categories || {};
    const payments = f.payments || [];
    const lineItems = f.line_items || [];

    root.innerHTML = `
        <div class="ib-container">
            <!-- Breadcrumb Navigation -->
            <div class="ib-nav-row">
                <button class="ib-btn ib-btn-secondary" id="ibBtnBackToList">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Back to Folios
                </button>
                <div class="ib-folio-header-title">
                    <span class="ib-tag-folio">${esc(f.folio_number)}</span>
                    <h2>Statement of Account (Master Folio)</h2>
                </div>
                <div class="ib-nav-actions">
                    <button class="ib-btn ib-btn-secondary" id="ibBtnSyncCharges" title="Auto-aggregate room days, labs, radiology, pharmacy, OR">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Re-Sync Cross-Module Charges
                    </button>
                    <button class="ib-btn ib-btn-secondary" id="ibBtnPrintSOA">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Master SOA
                    </button>
                    ${!isCleared ? `
                        <button class="ib-btn ib-btn-clearance" id="ibBtnClearance">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Issue Billing Clearance
                        </button>
                    ` : `
                        <span class="ib-badge ib-badge-success-large">✓ BILLING CLEARED &amp; DISCHARGED</span>
                    `}
                </div>
            </div>

            <!-- Patient & Admission Master Card -->
            <div class="ib-patient-card">
                <div class="ib-patient-grid">
                    <div>
                        <div class="ib-meta-label">Patient Name</div>
                        <div class="ib-patient-name">${esc(f.patient_name)}</div>
                        <div class="ib-meta-sub">MRN: ${esc(f.patient_no || 'PAT-' + f.patient_id)} · Sex/Age: ${esc(f.sex || 'N/A')}</div>
                    </div>
                    <div>
                        <div class="ib-meta-label">Admission Information</div>
                        <div class="ib-meta-val">Admission #${esc(f.admission_number || f.admission_id)}</div>
                        <div class="ib-meta-sub">Admitted: ${esc(f.admission_date || 'N/A')}</div>
                    </div>
                    <div>
                        <div class="ib-meta-label">Ward &amp; Accommodation</div>
                        <div class="ib-meta-val">${esc(f.ward_name || 'Ward')} · Room ${esc(f.room_number || 'N/A')} · Bed ${esc(f.bed_number || 'N/A')}</div>
                        <div class="ib-meta-sub">Length of Stay: <strong>${Number(f.bed_days || 0).toFixed(1)} Days</strong> (${cur(f.daily_rate)}/day)</div>
                    </div>
                    <div>
                        <div class="ib-meta-label">Attending Physician</div>
                        <div class="ib-meta-val">${esc(f.admission_doctor || f.attending_physician || 'Dr. Assigned')}</div>
                        <div class="ib-meta-sub">Diagnosis: ${esc(f.admitting_diagnosis || 'Under Evaluation')}</div>
                    </div>
                </div>

                ${f.billing_cleared == 1 ? `
                    <div class="ib-clearance-banner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <div>
                            <strong>Discharge Billing Clearance Certified:</strong> Cleared by <em>${esc(f.billing_cleared_by || 'Cashier Desk')}</em> on ${esc(f.billing_cleared_at || 'Recently')}.
                            ${f.notes ? `<div class="ib-banner-notes">Notes: ${esc(f.notes)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Real-Time Financial Balance Summary Box -->
            <div class="ib-balance-card">
                <div class="ib-financial-kpis">
                    <div class="ib-kpi">
                        <span class="ib-kpi-label">Gross Charges</span>
                        <span class="ib-kpi-val">${cur(f.gross_amount)}</span>
                        <span class="ib-kpi-sub">Total across 7 categories</span>
                    </div>
                    <div class="ib-kpi">
                        <span class="ib-kpi-label">Discounts</span>
                        <span class="ib-kpi-val text-muted">- ${cur(f.discount_amount)}</span>
                        <span class="ib-kpi-sub">${esc(f.discount_type || 'Standard / None')}</span>
                    </div>
                    <div class="ib-kpi">
                        <span class="ib-kpi-label">PhilHealth / HMO</span>
                        <span class="ib-kpi-val text-blue">- ${cur(f.insurance_covered_amount)}</span>
                        <span class="ib-kpi-sub">Coverage deduction</span>
                    </div>
                    <div class="ib-kpi">
                        <span class="ib-kpi-label">Net Payable</span>
                        <span class="ib-kpi-val font-semibold">${cur(f.net_amount)}</span>
                        <span class="ib-kpi-sub">Adjusted patient bill</span>
                    </div>
                    <div class="ib-kpi">
                        <span class="ib-kpi-label">Cashier Payments</span>
                        <span class="ib-kpi-val text-emerald font-semibold">${cur(f.paid_amount)}</span>
                        <span class="ib-kpi-sub">${payments.length} receipt(s) issued</span>
                    </div>
                    <div class="ib-kpi ib-kpi-balance ${isZeroBalance ? 'zero' : 'owing'}">
                        <span class="ib-kpi-label">REAL-TIME BALANCE DUE</span>
                        <span class="ib-kpi-val balance-text">${cur(balance)}</span>
                        <span class="ib-kpi-sub">${isZeroBalance ? '✓ Ready for Discharge Clearance' : '⚠ Outstanding Settlement Needed'}</span>
                    </div>
                </div>

                <!-- Action Controls inside Financial Banner -->
                <div class="ib-financial-actions">
                    <button class="ib-btn ib-btn-secondary" id="ibBtnAddCharge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        + Add Charge Item
                    </button>
                    <button class="ib-btn ib-btn-secondary" id="ibBtnApplyDiscount">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        Apply Discount &amp; Insurance
                    </button>
                    <button class="ib-btn ib-btn-payment" id="ibBtnRecordPayment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        💰 Record Cashier Payment / Deposit
                    </button>
                    <button class="ib-btn ib-btn-secondary" id="ibBtnSeedDemo" title="Inject realistic sample clinical charges across OR, Lab, Rad, e-MAR for demonstration">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        Demo: Populate Multi-Dept Charges
                    </button>
                </div>
            </div>

            <!-- Charge Categories Breakdown Tabs / Accordion -->
            <div class="ib-details-card">
                <div class="ib-category-tabs">
                    <button class="ib-cat-tab ${state.activeTab === 'all_charges' ? 'active' : ''}" data-cat="all_charges">
                        All Charges (${lineItems.length})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'accommodation' ? 'active' : ''}" data-cat="accommodation">
                        🛏️ Accommodation (${cur(f.total_accommodation)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'doctor_fees' ? 'active' : ''}" data-cat="doctor_fees">
                        🩺 Doctor Fees (${cur(f.total_doctor_fees)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'operating_theater' ? 'active' : ''}" data-cat="operating_theater">
                        🏥 Operating Theater (${cur(f.total_operating_theater)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'laboratory' ? 'active' : ''}" data-cat="laboratory">
                        🧪 Laboratory (${cur(f.total_laboratory)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'radiology' ? 'active' : ''}" data-cat="radiology">
                        🩻 Radiology (${cur(f.total_radiology)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'pharmacy' ? 'active' : ''}" data-cat="pharmacy">
                        💊 Pharmacy &amp; e-MAR (${cur(f.total_pharmacy)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'supplies_misc' ? 'active' : ''}" data-cat="supplies_misc">
                        📦 Supplies &amp; Misc (${cur(f.total_supplies_misc)})
                    </button>
                    <button class="ib-cat-tab ${state.activeTab === 'payments' ? 'active' : ''}" data-cat="payments">
                        🧾 Cashier Ledger (${payments.length})
                    </button>
                </div>

                <!-- Tab Content: Items Table or Payments Ledger -->
                <div class="ib-tab-body">
                    ${state.activeTab === 'payments' ? renderPaymentsLedger(payments, f) : renderLineItemsTable(lineItems, state.activeTab, categories)}
                </div>
            </div>
        </div>

        <!-- MODAL CONTAINERS -->
        <div id="ibModalContainer"></div>
    `;

    bindDetailEvents(root, f);
}

// -------------------------------------------------------------
// RENDER: LINE ITEMS TABLE
// -------------------------------------------------------------
function renderLineItemsTable(lineItems, activeFilter, categories) {
    let filtered = lineItems;
    if (activeFilter !== 'all_charges') {
        filtered = lineItems.filter(item => item.charge_category === activeFilter);
    }

    if (filtered.length === 0) {
        return `
            <div class="ib-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <h4>No Charges In This Category</h4>
                <p>Click "Re-Sync Cross-Module Charges" or "+ Add Charge Item" to append billable services.</p>
            </div>
        `;
    }

    return `
        <table class="ib-table ib-table-compact">
            <thead>
                <tr>
                    <th>Service Date</th>
                    <th>Category</th>
                    <th>Item Code &amp; Description</th>
                    <th>Performer / Source</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Gross</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Net Amount</th>
                    <th>Status</th>
                    <th class="text-center">Action</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(item => {
                    const isVoided = item.status === 'voided';
                    return `
                        <tr class="${isVoided ? 'ib-row-voided' : ''}">
                            <td>${esc(item.service_date)}</td>
                            <td>
                                <span class="ib-cat-tag ${esc(item.charge_category)}">${formatCatName(item.charge_category)}</span>
                            </td>
                            <td>
                                <strong>${esc(item.item_description)}</strong>
                                ${item.item_code ? `<span class="ib-code-pill">${esc(item.item_code)}</span>` : ''}
                                ${item.notes ? `<div class="ib-meta-sub">${esc(item.notes)}</div>` : ''}
                            </td>
                            <td>
                                <div class="ib-meta-sub">${esc(item.performer_name || item.source_table || 'Hospital System')}</div>
                            </td>
                            <td class="text-right">${Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 2)}</td>
                            <td class="text-right">${cur(item.unit_price)}</td>
                            <td class="text-right">${cur(item.gross_amount)}</td>
                            <td class="text-right text-muted">${cur(item.discount_amount)}</td>
                            <td class="text-right font-semibold">${cur(item.net_amount)}</td>
                            <td>
                                <span class="ib-status-tag ${item.status}">
                                    ${isVoided ? 'VOIDED' : 'BILLED'}
                                </span>
                            </td>
                            <td class="text-center">
                                ${!isVoided ? `
                                    <button class="ib-icon-btn ibBtnVoidItem" data-id="${item.id}" title="Void this charge">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                ` : `<span class="text-muted text-xs">Voided</span>`}
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

// -------------------------------------------------------------
// RENDER: PAYMENTS & OFFICIAL RECEIPTS LEDGER
// -------------------------------------------------------------
function renderPaymentsLedger(payments, folio) {
    if (payments.length === 0) {
        return `
            <div class="ib-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <h4>No Cashier Payments Recorded Yet</h4>
                <p>Click "Record Cashier Payment / Deposit" above to accept patient or insurance settlement and generate Official Receipt (OR).</p>
            </div>
        `;
    }

    return `
        <div class="ib-receipts-container">
            <table class="ib-table">
                <thead>
                    <tr>
                        <th>Receipt Number (OR)</th>
                        <th>Payment Date &amp; Time</th>
                        <th>Payment Method</th>
                        <th>Payer Type</th>
                        <th>Reference / Transaction #</th>
                        <th>Cashier / Collector</th>
                        <th class="text-right">Amount Paid</th>
                        <th>Status</th>
                        <th class="text-center">Print Receipt</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td>
                                <strong class="text-blue">${esc(p.receipt_number)}</strong>
                            </td>
                            <td>${esc(p.payment_date || p.created_at)}</td>
                            <td>
                                <span class="ib-badge ib-badge-info">${esc(formatMethodName(p.payment_method))}</span>
                            </td>
                            <td>${esc(p.payer_type === 'insurance' ? 'HMO / Insurance Carrier' : 'Patient / Relative')}</td>
                            <td>${esc(p.reference_no || 'N/A')}</td>
                            <td>${esc(p.cashier_name || 'Cashier Counter')}</td>
                            <td class="text-right font-bold text-emerald">${cur(p.amount)}</td>
                            <td><span class="ib-badge ib-badge-success">Settled</span></td>
                            <td class="text-center">
                                <button class="ib-btn ib-btn-secondary ib-btn-xs ibBtnPrintReceipt" data-receipt="${esc(p.receipt_number)}" data-amount="${p.amount}" data-method="${esc(p.payment_method)}" data-date="${esc(p.payment_date)}" data-ref="${esc(p.reference_no || '')}">
                                    🖨️ Receipt
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// -------------------------------------------------------------
// RENDER: ADMISSIONS DIRECTORY (TO CREATE / OPEN FOLIO)
// -------------------------------------------------------------
function renderAdmissionsView(root) {
    const admissions = cache.admissionsList || [];

    root.innerHTML = `
        <div class="ib-container">
            <div class="ib-header">
                <div>
                    <h1 class="ib-title">Inpatient ADT Registry</h1>
                    <p class="ib-subtitle">Admitted Patients, Ward Placements &amp; Direct Master Folio Access</p>
                </div>
                <div class="ib-header-actions">
                    <button class="ib-btn ib-btn-secondary" id="ibBtnBackToFoliosFromAdm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to Folios
                    </button>
                </div>
            </div>

            <div class="ib-table-card">
                <table class="ib-table">
                    <thead>
                        <tr>
                            <th>Admission #</th>
                            <th>Patient Name &amp; MRN</th>
                            <th>Ward, Room &amp; Bed</th>
                            <th>Admission Date</th>
                            <th>Attending Physician</th>
                            <th>Admitting Diagnosis</th>
                            <th>Status</th>
                            <th>Folio Status</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${admissions.length === 0 ? `
                            <tr><td colspan="9" class="ib-no-data">No active inpatient admissions found.</td></tr>
                        ` : admissions.map(a => `
                            <tr>
                                <td><strong>${esc(a.admission_number)}</strong></td>
                                <td>
                                    <strong>${esc(a.patient_name)}</strong>
                                    <div class="ib-meta-sub">${esc(a.patient_mrn || 'PAT-' + a.patient_id)}</div>
                                </td>
                                <td>${esc(a.ward_name || 'Ward')} · Room ${esc(a.room_number || '')} · Bed ${esc(a.bed_number || '')}</td>
                                <td>${esc(a.admission_date)}</td>
                                <td>${esc(a.attending_physician || 'Unassigned')}</td>
                                <td>${esc(a.admitting_diagnosis || 'General Admission')}</td>
                                <td><span class="ib-badge ib-badge-info">${esc(a.status)}</span></td>
                                <td>
                                    ${a.folio_id ? `
                                        <span class="ib-badge ib-badge-success">${esc(a.folio_number)}</span>
                                        <div class="ib-meta-sub">Bal: ${cur(a.balance_due)}</div>
                                    ` : `<span class="ib-badge ib-badge-warning">No Folio Yet</span>`}
                                </td>
                                <td class="text-center">
                                    <button class="ib-btn ib-btn-primary ib-btn-sm ibBtnOpenAdmissionFolio" data-admission-id="${a.id}">
                                        ${a.folio_id ? 'Open Folio' : '+ Generate Folio'}
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    root.querySelector("#ibBtnBackToFoliosFromAdm")?.addEventListener("click", () => {
        state.view = "list";
        loadCurrentView();
    });

    root.querySelectorAll(".ibBtnOpenAdmissionFolio").forEach(btn => {
        btn.addEventListener("click", async () => {
            const admId = btn.getAttribute("data-admission-id");
            btn.disabled = true;
            btn.textContent = "Opening...";
            try {
                const res = await api(`/inpatient-billing/folios/for-admission?admission_id=${admId}`);
                if (res?.success) {
                    state.selectedFolioId = res.data.id;
                    state.view = "detail";
                    loadCurrentView();
                } else {
                    showToast(res?.message || "Failed to open folio", "error");
                    btn.disabled = false;
                    btn.textContent = "Open Folio";
                }
            } catch (e) {
                showToast(e.message, "error");
                btn.disabled = false;
                btn.textContent = "Open Folio";
            }
        });
    });
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindListEvents(root) {
    root.querySelector("#ibBtnRefreshList")?.addEventListener("click", () => loadCurrentView());
    root.querySelector("#ibBtnViewAdmissions")?.addEventListener("click", () => {
        state.view = "admissions";
        loadCurrentView();
    });

    const searchInput = root.querySelector("#ibSearchInput");
    let searchTimeout = null;
    searchInput?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadCurrentView();
        }, 350);
    });

    root.querySelector("#ibClearSearch")?.addEventListener("click", () => {
        state.searchQuery = "";
        state.page = 1;
        loadCurrentView();
    });

    root.querySelectorAll(".ib-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.statusFilter = btn.getAttribute("data-status");
            state.page = 1;
            loadCurrentView();
        });
    });

    root.querySelectorAll(".ibBtnOpenFolio").forEach(btn => {
        btn.addEventListener("click", () => {
            state.selectedFolioId = btn.getAttribute("data-id");
            state.view = "detail";
            loadCurrentView();
        });
    });
}

function bindDetailEvents(root, folio) {
    root.querySelector("#ibBtnBackToList")?.addEventListener("click", () => {
        state.view = "list";
        loadCurrentView();
    });

    // Category Tabs
    root.querySelectorAll(".ib-cat-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            state.activeTab = tab.getAttribute("data-cat");
            renderDetailView(root);
        });
    });

    // Re-sync charges
    root.querySelector("#ibBtnSyncCharges")?.addEventListener("click", async () => {
        const btn = root.querySelector("#ibBtnSyncCharges");
        btn.disabled = true;
        btn.innerHTML = `Syncing...`;
        try {
            const res = await api("/inpatient-billing/folios/sync", {
                method: "POST",
                body: JSON.stringify({ folio_id: folio.id })
            });
            if (res?.success) {
                showToast("Folio synchronized with latest bed days and clinical charges!", "success");
                cache.currentFolio = res.data;
                renderDetailView(root);
            } else {
                showToast(res?.message || "Sync failed", "error");
                btn.disabled = false;
                btn.textContent = "Re-Sync Cross-Module Charges";
            }
        } catch (e) {
            showToast(e.message, "error");
            btn.disabled = false;
            btn.textContent = "Re-Sync Cross-Module Charges";
        }
    });

    // Demo Seed Charges
    root.querySelector("#ibBtnSeedDemo")?.addEventListener("click", async () => {
        if (!confirm("This will populate realistic clinical charges across OR, Lab, Radiology, and e-MAR for this admission. Proceed?")) return;
        const btn = root.querySelector("#ibBtnSeedDemo");
        btn.disabled = true;
        btn.textContent = "Populating charges...";
        try {
            const res = await api("/inpatient-billing/folios/seed-clinical-charges", {
                method: "POST",
                body: JSON.stringify({ admission_id: folio.admission_id })
            });
            if (res?.success) {
                showToast("Realistic departmental charges injected and consolidated into master folio!", "success");
                cache.currentFolio = res.data;
                renderDetailView(root);
            } else {
                showToast(res?.message || "Failed to seed charges", "error");
                btn.disabled = false;
                btn.textContent = "Demo: Populate Multi-Dept Charges";
            }
        } catch (e) {
            showToast(e.message, "error");
            btn.disabled = false;
            btn.textContent = "Demo: Populate Multi-Dept Charges";
        }
    });

    // Add Charge Item Modal
    root.querySelector("#ibBtnAddCharge")?.addEventListener("click", () => {
        openAddChargeModal(folio);
    });

    // Apply Discount & Insurance Modal
    root.querySelector("#ibBtnApplyDiscount")?.addEventListener("click", () => {
        openDiscountModal(folio);
    });

    // Record Payment Modal
    root.querySelector("#ibBtnRecordPayment")?.addEventListener("click", () => {
        openPaymentModal(folio);
    });

    // Issue Billing Clearance
    root.querySelector("#ibBtnClearance")?.addEventListener("click", () => {
        openClearanceModal(folio);
    });

    // Print Statement of Account
    root.querySelector("#ibBtnPrintSOA")?.addEventListener("click", () => {
        openPrintSoaModal(folio);
    });

    // Void Item Buttons
    root.querySelectorAll(".ibBtnVoidItem").forEach(btn => {
        btn.addEventListener("click", async () => {
            const itemId = btn.getAttribute("data-id");
            const reason = prompt("Please provide reason for voiding this charge item:");
            if (reason === null) return;
            if (!reason.trim()) {
                showToast("Void reason is required.", "warning");
                return;
            }

            try {
                const res = await api("/inpatient-billing/folios/line-items/void", {
                    method: "POST",
                    body: JSON.stringify({ item_id: itemId, reason: reason.trim() })
                });
                if (res?.success) {
                    showToast("Line item voided and financials updated.", "success");
                    cache.currentFolio = res.data;
                    renderDetailView(root);
                } else {
                    showToast(res?.message || "Failed to void item", "error");
                }
            } catch (e) {
                showToast(e.message, "error");
            }
        });
    });

    // Print Individual Receipt Buttons
    root.querySelectorAll(".ibBtnPrintReceipt").forEach(btn => {
        btn.addEventListener("click", () => {
            const rec = {
                receipt_number: btn.getAttribute("data-receipt"),
                amount: btn.getAttribute("data-amount"),
                payment_method: btn.getAttribute("data-method"),
                payment_date: btn.getAttribute("data-date"),
                reference_no: btn.getAttribute("data-ref")
            };
            openReceiptPrintModal(rec, folio);
        });
    });
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------

function openAddChargeModal(folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal">
                <div class="ib-modal-header">
                    <h3>+ Add Charge Item to Folio</h3>
                    <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                </div>
                <div class="ib-modal-body">
                    <div class="ib-form-group">
                        <label>Charge Category</label>
                        <select id="ibAddCat" class="ib-input">
                            <option value="supplies_misc">Medical Supplies, Consumables &amp; Equipment</option>
                            <option value="doctor_fees">Attending / Specialist Professional Fee</option>
                            <option value="accommodation">Accommodation &amp; Room Service Adjustment</option>
                            <option value="operating_theater">Operating Theater &amp; Anesthesia Supply</option>
                            <option value="laboratory">Laboratory / Diagnostic Test</option>
                            <option value="radiology">Radiology / Imaging Study</option>
                            <option value="pharmacy">Pharmacy &amp; Prescription</option>
                        </select>
                    </div>

                    <div class="ib-form-group">
                        <label>Quick Presets</label>
                        <div class="ib-preset-chips">
                            <button type="button" class="ib-chip" data-desc="Continuous Oxygen Therapy (15L/min cylinder)" data-price="850.00" data-code="O2-CYL">Oxygen Therapy ($850)</button>
                            <button type="button" class="ib-chip" data-desc="Special Inpatient Nursing Care (12-hr shift)" data-price="2500.00" data-code="NURSE-SP">Special Nursing ($2,500)</button>
                            <button type="button" class="ib-chip" data-desc="Sterile IV Cannula &amp; Tubing Set" data-price="350.00" data-code="IV-TUBING">IV Tubing Set ($350)</button>
                            <button type="button" class="ib-chip" data-desc="Multiparameter Cardiac Telemetry Monitor (24h)" data-price="1800.00" data-code="MONITOR-24">Cardiac Monitor ($1,800)</button>
                            <button type="button" class="ib-chip" data-desc="Emergency Ambulance Transfer Service" data-price="3500.00" data-code="AMB-TRANS">Ambulance Service ($3,500)</button>
                        </div>
                    </div>

                    <div class="ib-form-group">
                        <label>Item Description <span class="text-rose">*</span></label>
                        <input type="text" id="ibAddDesc" class="ib-input" placeholder="e.g. Sterile Dressing Pack, Special Nurse Consult" required>
                    </div>

                    <div class="ib-form-row">
                        <div class="ib-form-group">
                            <label>Item Code</label>
                            <input type="text" id="ibAddCode" class="ib-input" placeholder="MISC">
                        </div>
                        <div class="ib-form-group">
                            <label>Service Date</label>
                            <input type="date" id="ibAddDate" class="ib-input" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>

                    <div class="ib-form-row">
                        <div class="ib-form-group">
                            <label>Quantity</label>
                            <input type="number" id="ibAddQty" class="ib-input" value="1" min="1" step="1">
                        </div>
                        <div class="ib-form-group">
                            <label>Unit Price ($)</label>
                            <input type="number" id="ibAddPrice" class="ib-input" value="0.00" min="0" step="0.01">
                        </div>
                    </div>

                    <div class="ib-form-group">
                        <label>Performer / Dept / Notes</label>
                        <input type="text" id="ibAddPerformer" class="ib-input" placeholder="Staff nurse name, department or notes">
                    </div>
                </div>
                <div class="ib-modal-footer">
                    <button class="ib-btn ib-btn-secondary" id="ibCancelModal">Cancel</button>
                    <button class="ib-btn ib-btn-primary" id="ibSubmitAddCharge">Add Charge to Folio</button>
                </div>
            </div>
        </div>
    `;

    // Presets click
    modalContainer.querySelectorAll(".ib-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            modalContainer.querySelector("#ibAddDesc").value = chip.getAttribute("data-desc");
            modalContainer.querySelector("#ibAddPrice").value = chip.getAttribute("data-price");
            modalContainer.querySelector("#ibAddCode").value = chip.getAttribute("data-code");
        });
    });

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#ibCancelModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnLaunchSplitTender")?.addEventListener("click", () => {
        closeModal();
        window.location.hash = "#/split-cashiering";
    });

    modalContainer.querySelector("#ibSubmitAddCharge")?.addEventListener("click", async () => {
        const desc = modalContainer.querySelector("#ibAddDesc").value.trim();
        const price = parseFloat(modalContainer.querySelector("#ibAddPrice").value) || 0;
        const qty = parseFloat(modalContainer.querySelector("#ibAddQty").value) || 1;
        const cat = modalContainer.querySelector("#ibAddCat").value;
        const code = modalContainer.querySelector("#ibAddCode").value.trim() || 'MISC';
        const sDate = modalContainer.querySelector("#ibAddDate").value;
        const performer = modalContainer.querySelector("#ibAddPerformer").value.trim();

        if (!desc) {
            showToast("Item description is required.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#ibSubmitAddCharge");
        submitBtn.disabled = true;
        submitBtn.textContent = "Adding...";

        try {
            const res = await api("/inpatient-billing/folios/line-items", {
                method: "POST",
                body: JSON.stringify({
                    folio_id: folio.id,
                    charge_category: cat,
                    item_description: desc,
                    item_code: code,
                    service_date: sDate,
                    quantity: qty,
                    unit_price: price,
                    performer_name: performer
                })
            });

            if (res?.success) {
                showToast("Line item added successfully!", "success");
                closeModal();
                cache.currentFolio = res.data;
                const root = document.getElementById("inpatientBillingRoot");
                if (root) renderDetailView(root);
            } else {
                showToast(res?.message || "Failed to add charge", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Add Charge to Folio";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Add Charge to Folio";
        }
    });
}

function openDiscountModal(folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    const gross = Number(folio.gross_amount || 0);
    const senior20 = (gross * 0.20).toFixed(2);

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal">
                <div class="ib-modal-header">
                    <h3>Apply Discount &amp; Insurance Coverage</h3>
                    <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                </div>
                <div class="ib-modal-body">
                    <div class="ib-form-group">
                        <label>Discount Type</label>
                        <select id="ibDiscType" class="ib-input">
                            <option value="">None / Custom</option>
                            <option value="Senior Citizen (20%)">Senior Citizen (20% Statutory Discount)</option>
                            <option value="Person With Disability (20%)">PWD (20% Statutory Discount)</option>
                            <option value="Employee / Dependent (15%)">Hospital Employee / Dependent (15%)</option>
                            <option value="Charity / Social Service">Medical Social Service / Charity Waiver</option>
                        </select>
                    </div>

                    <div class="ib-form-group">
                        <label>Discount Amount ($)</label>
                        <input type="number" id="ibDiscAmount" class="ib-input" value="${folio.discount_amount || 0}" min="0" step="0.01">
                        <div class="ib-meta-sub">Calculated Senior 20% on gross: <strong>$${senior20}</strong></div>
                    </div>

                    <div class="ib-form-group">
                        <label>PhilHealth / HMO Insurance Coverage Amount ($)</label>
                        <input type="number" id="ibInsAmount" class="ib-input" value="${folio.insurance_covered_amount || 0}" min="0" step="0.01">
                        <div class="ib-meta-sub">Direct reduction deducted from gross charges before patient copay</div>
                    </div>

                    <div class="ib-form-group">
                        <label>Approval Notes / Reference ID</label>
                        <input type="text" id="ibDiscNotes" class="ib-input" placeholder="OSCA ID #, PWD ID #, or HMO LOA Approval Code" value="${esc(folio.discount_type || '')}">
                    </div>
                </div>
                <div class="ib-modal-footer">
                    <button class="ib-btn ib-btn-secondary" id="ibCancelModal">Cancel</button>
                    <button class="ib-btn ib-btn-primary" id="ibSubmitDiscount">Apply to Master Folio</button>
                </div>
            </div>
        </div>
    `;

    const discTypeSelect = modalContainer.querySelector("#ibDiscType");
    discTypeSelect?.addEventListener("change", () => {
        const val = discTypeSelect.value;
        if (val.includes("20%")) {
            modalContainer.querySelector("#ibDiscAmount").value = senior20;
        } else if (val.includes("15%")) {
            modalContainer.querySelector("#ibDiscAmount").value = (gross * 0.15).toFixed(2);
        }
    });

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#ibCancelModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnLaunchSplitTender")?.addEventListener("click", () => {
        closeModal();
        window.location.hash = "#/split-cashiering";
    });

    modalContainer.querySelector("#ibSubmitDiscount")?.addEventListener("click", async () => {
        const discType = discTypeSelect.value || modalContainer.querySelector("#ibDiscNotes").value;
        const discAmt = parseFloat(modalContainer.querySelector("#ibDiscAmount").value) || 0;
        const insAmt = parseFloat(modalContainer.querySelector("#ibInsAmount").value) || 0;
        const notes = modalContainer.querySelector("#ibDiscNotes").value.trim();

        const submitBtn = modalContainer.querySelector("#ibSubmitDiscount");
        submitBtn.disabled = true;
        submitBtn.textContent = "Applying...";

        try {
            const res = await api("/inpatient-billing/folios/discount-insurance", {
                method: "POST",
                body: JSON.stringify({
                    folio_id: folio.id,
                    discount_type: discType,
                    discount_amount: discAmt,
                    insurance_covered_amount: insAmt,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Discounts & Insurance coverage applied!", "success");
                closeModal();
                cache.currentFolio = res.data;
                const root = document.getElementById("inpatientBillingRoot");
                if (root) renderDetailView(root);
            } else {
                showToast(res?.message || "Failed to apply discount", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Apply to Master Folio";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Apply to Master Folio";
        }
    });
}

function openPaymentModal(folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    const balance = Number(folio.balance_due || 0);

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal">
                <div class="ib-modal-header">
                    <h3>💰 Cashier Collection &amp; Official Receipt</h3>
                    <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                </div>
                <div class="ib-modal-body">
                    <div class="ib-receipt-preview-banner">
                        <div>
                            <div class="ib-meta-label">Patient Name</div>
                            <strong>${esc(folio.patient_name)}</strong> (${esc(folio.patient_no || 'MRN-N/A')})
                        </div>
                        <div class="text-right">
                            <div class="ib-meta-label">Outstanding Balance</div>
                            <strong class="text-rose font-lg">${cur(balance)}</strong>
                        </div>
                    </div>

                    <div class="ib-form-group">
                        <label>Payment Amount ($) <span class="text-rose">*</span></label>
                        <input type="number" id="ibPayAmount" class="ib-input font-bold" value="${balance > 0 ? balance.toFixed(2) : '0.00'}" min="0.01" step="0.01" required>
                        <div class="ib-meta-sub">
                            <button type="button" class="ib-link-btn" id="ibBtnPayFull">Settle Full Balance (${cur(balance)})</button>
                        </div>
                    </div>

                    <div class="ib-form-row">
                        <div class="ib-form-group">
                            <label>Payment Method</label>
                            <select id="ibPayMethod" class="ib-input">
                                <option value="cash">Cash (Counter Tender)</option>
                                <option value="credit_card">Credit Card (POS Terminal)</option>
                                <option value="debit_card">Debit Card</option>
                                <option value="gcash_maya">GCash / Maya / QRPh</option>
                                <option value="bank_transfer">Bank Wire / Online Transfer</option>
                                <option value="check">Manager's Check / Cheque</option>
                                <option value="insurance_claim">Direct Insurance / HMO Settlement</option>
                            </select>
                        </div>
                        <div class="ib-form-group">
                            <label>Payer Type</label>
                            <select id="ibPayPayerType" class="ib-input">
                                <option value="patient">Patient / Immediate Relative</option>
                                <option value="insurance">Insurance Carrier / Corporate HMO</option>
                            </select>
                        </div>
                    </div>

                    <div class="ib-form-group">
                        <label>Reference No. / Approval Code</label>
                        <input type="text" id="ibPayRef" class="ib-input" placeholder="POS Auth Code, Check #, or GCash Reference">
                    </div>

                    <div class="ib-form-group">
                        <label>Cashier Notes</label>
                        <input type="text" id="ibPayNotes" class="ib-input" placeholder="e.g. Deposit for surgery, Partial settlement">
                    </div>
                </div>
                <div class="ib-modal-footer">
                    <button class="ib-btn ib-btn-secondary" id="ibBtnLaunchSplitTender" style="margin-right: auto; background: #e0f2fe; color: #0369a1; border-color: #bae6fd;" title="Open Split-Tender POS to pay with Cash + Card + HMO Guarantee">
                        ⚡ Multi-Tender Split POS
                    </button>
                    <button class="ib-btn ib-btn-secondary" id="ibCancelModal">Cancel</button>
                    <button class="ib-btn ib-btn-payment" id="ibSubmitPayment">
                        Issue Official Receipt &amp; Settle
                    </button>
                </div>
            </div>
        </div>
    `;

    modalContainer.querySelector("#ibBtnPayFull")?.addEventListener("click", () => {
        modalContainer.querySelector("#ibPayAmount").value = balance.toFixed(2);
    });

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#ibCancelModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnLaunchSplitTender")?.addEventListener("click", () => {
        closeModal();
        window.location.hash = "#/split-cashiering";
    });

    modalContainer.querySelector("#ibSubmitPayment")?.addEventListener("click", async () => {
        const amount = parseFloat(modalContainer.querySelector("#ibPayAmount").value) || 0;
        const method = modalContainer.querySelector("#ibPayMethod").value;
        const payerType = modalContainer.querySelector("#ibPayPayerType").value;
        const refNo = modalContainer.querySelector("#ibPayRef").value.trim();
        const notes = modalContainer.querySelector("#ibPayNotes").value.trim();

        if (amount <= 0) {
            showToast("Payment amount must be greater than zero.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#ibSubmitPayment");
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing payment...";

        try {
            const res = await api("/inpatient-billing/folios/payments", {
                method: "POST",
                body: JSON.stringify({
                    folio_id: folio.id,
                    amount: amount,
                    payment_method: method,
                    payer_type: payerType,
                    reference_no: refNo,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Payment recorded successfully! Official Receipt generated.", "success");
                closeModal();
                cache.currentFolio = res.data;
                const root = document.getElementById("inpatientBillingRoot");
                if (root) renderDetailView(root);
            } else {
                showToast(res?.message || "Payment recording failed", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Issue Official Receipt & Settle";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Issue Official Receipt & Settle";
        }
    });
}

function openClearanceModal(folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    const balance = Number(folio.balance_due || 0);
    const isZeroBalance = balance <= 0.05;

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal">
                <div class="ib-modal-header">
                    <h3>✓ Issue Inpatient Billing Clearance</h3>
                    <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                </div>
                <div class="ib-modal-body">
                    <div class="ib-clearance-check-card ${isZeroBalance ? 'cleared' : 'owing'}">
                        <h4>Account Settlement Status</h4>
                        <div class="ib-balance-display">
                            Current Balance: <strong>${cur(balance)}</strong>
                        </div>
                        <p>
                            ${isZeroBalance 
                                ? 'All charges have been completely settled. The patient is financially cleared for clinical discharge.' 
                                : 'WARNING: There is an outstanding balance of ' + cur(balance) + '. Billing clearance requires full settlement or an authorized promissory guarantee note.'}
                        </p>
                    </div>

                    <div class="ib-form-group">
                        <label>Cleared By (Billing Officer / Cashier) <span class="text-rose">*</span></label>
                        <input type="text" id="ibClearedBy" class="ib-input" value="Billing Officer" required>
                    </div>

                    <div class="ib-form-group">
                        <label>Financial Clearance Remarks / Guarantee Note ${!isZeroBalance ? '<span class="text-rose">*</span>' : ''}</label>
                        <textarea id="ibClearanceNotes" class="ib-input" rows="3" placeholder="${isZeroBalance ? 'Optional remarks for medical records...' : 'Required: Explain authorized financial guarantor, HMO pending check, or approved promissory plan...'}"></textarea>
                    </div>
                </div>
                <div class="ib-modal-footer">
                    <button class="ib-btn ib-btn-secondary" id="ibCancelModal">Cancel</button>
                    <button class="ib-btn ib-btn-clearance" id="ibSubmitClearance">
                        Certify Discharge Clearance
                    </button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#ibCancelModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnLaunchSplitTender")?.addEventListener("click", () => {
        closeModal();
        window.location.hash = "#/split-cashiering";
    });

    modalContainer.querySelector("#ibSubmitClearance")?.addEventListener("click", async () => {
        const clearedBy = modalContainer.querySelector("#ibClearedBy").value.trim();
        const notes = modalContainer.querySelector("#ibClearanceNotes").value.trim();

        if (!clearedBy) {
            showToast("Billing officer name is required.", "warning");
            return;
        }

        if (!isZeroBalance && !notes) {
            showToast("Guarantee note is required to clear an account with an outstanding balance.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#ibSubmitClearance");
        submitBtn.disabled = true;
        submitBtn.textContent = "Certifying clearance...";

        try {
            const res = await api("/inpatient-billing/folios/clearance", {
                method: "POST",
                body: JSON.stringify({
                    folio_id: folio.id,
                    cleared_by: clearedBy,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Inpatient Billing Clearance Certified! Admission set to Pending Discharge.", "success");
                closeModal();
                cache.currentFolio = res.data;
                const root = document.getElementById("inpatientBillingRoot");
                if (root) renderDetailView(root);
            } else {
                showToast(res?.message || "Failed to issue clearance", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Certify Discharge Clearance";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Certify Discharge Clearance";
        }
    });
}

function openPrintSoaModal(folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    const lineItems = folio.line_items || [];
    const categories = folio.categories || {};
    const payments = folio.payments || [];
    const balance = Number(folio.balance_due || 0);

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal ib-modal-lg">
                <div class="ib-modal-header no-print">
                    <h3>🖨️ Official Statement of Account (Print Preview)</h3>
                    <div>
                        <button class="ib-btn ib-btn-primary" id="ibBtnTriggerPrint">
                            Print Document
                        </button>
                        <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                    </div>
                </div>
                <div class="ib-modal-body ib-printable-soa" id="ibPrintableArea">
                    <div class="soa-header">
                        <div class="soa-brand">
                            <h2>USINTELLIX MEDICAL CENTER</h2>
                            <p>Tertiary Medical Hospital &amp; Surgical Center · 100 Hospital Blvd · Phone: (555) 019-2834</p>
                            <h3>INPATIENT MASTER STATEMENT OF ACCOUNT</h3>
                        </div>
                    </div>

                    <div class="soa-meta-grid">
                        <div>
                            <strong>Folio Number:</strong> ${esc(folio.folio_number)}<br>
                            <strong>Admission #:</strong> ${esc(folio.admission_number || folio.admission_id)}<br>
                            <strong>Patient Name:</strong> ${esc(folio.patient_name)}<br>
                            <strong>MRN:</strong> ${esc(folio.patient_no || 'PAT-' + folio.patient_id)}
                        </div>
                        <div>
                            <strong>Admitted Date:</strong> ${esc(folio.admission_date || 'N/A')}<br>
                            <strong>Discharge Date:</strong> ${esc(folio.discharge_date || 'In Progress (Active)')}<br>
                            <strong>Length of Stay:</strong> ${Number(folio.bed_days || 0).toFixed(1)} Bed Days<br>
                            <strong>Ward &amp; Bed:</strong> ${esc(folio.ward_name || '')} - Bed ${esc(folio.bed_number || '')}
                        </div>
                        <div>
                            <strong>Attending Physician:</strong> ${esc(folio.admission_doctor || 'Dr. On Duty')}<br>
                            <strong>Admitting Diagnosis:</strong> ${esc(folio.admitting_diagnosis || 'General')}<br>
                            <strong>SOA Date:</strong> ${new Date().toLocaleDateString()}<br>
                            <strong>Clearance Status:</strong> ${folio.billing_cleared == 1 ? 'CLEARED' : 'UNSETTLED'}
                        </div>
                    </div>

                    <hr class="soa-divider">

                    <table class="soa-table">
                        <thead>
                            <tr>
                                <th>Category / Description</th>
                                <th>Service Date</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Unit Price</th>
                                <th class="text-right">Net Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(categories).map(catKey => {
                                const cat = categories[catKey];
                                if (!cat.items || cat.items.length === 0) return '';
                                return `
                                    <tr class="soa-cat-head">
                                        <td colspan="4"><strong>${esc(cat.title)}</strong></td>
                                        <td class="text-right"><strong>${cur(cat.subtotal)}</strong></td>
                                    </tr>
                                    ${cat.items.map(it => `
                                        <tr class="soa-cat-item">
                                            <td style="padding-left: 20px;">${esc(it.item_description)}</td>
                                            <td>${esc(it.service_date)}</td>
                                            <td class="text-right">${Number(it.quantity).toFixed(it.quantity % 1 === 0 ? 0 : 2)}</td>
                                            <td class="text-right">${cur(it.unit_price)}</td>
                                            <td class="text-right">${cur(it.net_amount)}</td>
                                        </tr>
                                    `).join('')}
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="soa-summary-box">
                        <div class="soa-calc-row">
                            <span>Total Gross Hospital Charges:</span>
                            <span>${cur(folio.gross_amount)}</span>
                        </div>
                        <div class="soa-calc-row">
                            <span>Less: Statutory Senior / PWD Discounts:</span>
                            <span>- ${cur(folio.discount_amount)}</span>
                        </div>
                        <div class="soa-calc-row">
                            <span>Less: PhilHealth / HMO Insurance Coverage:</span>
                            <span>- ${cur(folio.insurance_covered_amount)}</span>
                        </div>
                        <div class="soa-calc-row font-bold">
                            <span>Adjusted Net Hospital Bill:</span>
                            <span>${cur(folio.net_amount)}</span>
                        </div>
                        <div class="soa-calc-row text-emerald font-bold">
                            <span>Less: Total Cashier Payments &amp; Deposits:</span>
                            <span>- ${cur(folio.paid_amount)}</span>
                        </div>
                        <div class="soa-calc-row font-lg soa-final-balance">
                            <span>NET BALANCE DUE:</span>
                            <span>${cur(balance)}</span>
                        </div>
                    </div>

                    ${payments.length > 0 ? `
                        <div class="soa-payments-section">
                            <h4>Acknowledged Cashier Receipts</h4>
                            <table class="soa-table soa-receipts-table">
                                <thead>
                                    <tr>
                                        <th>Receipt (OR)</th>
                                        <th>Date</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th class="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${payments.map(p => `
                                        <tr>
                                            <td>${esc(p.receipt_number)}</td>
                                            <td>${esc(p.payment_date || p.created_at)}</td>
                                            <td>${esc(p.payment_method)}</td>
                                            <td>${esc(p.reference_no || 'N/A')}</td>
                                            <td class="text-right">${cur(p.amount)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div class="soa-signatures">
                        <div>
                            <div class="soa-sig-line"></div>
                            <p>Prepared By: Billing Clerk</p>
                        </div>
                        <div>
                            <div class="soa-sig-line"></div>
                            <p>Verified By: Chief Cashier</p>
                        </div>
                        <div>
                            <div class="soa-sig-line"></div>
                            <p>Conforme: Patient / Authorized Representative</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnTriggerPrint")?.addEventListener("click", () => {
        const printContent = document.getElementById("ibPrintableArea")?.innerHTML;
        const win = window.open("", "_blank");
        win.document.write(`
            <html>
                <head>
                    <title>Statement of Account - ${esc(folio.folio_number)}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; }
                        h2, h3, h4 { margin: 4px 0; }
                        .soa-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
                        .soa-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.5; }
                        .soa-divider { border: 0; border-top: 1px solid #cbd5e1; margin: 12px 0; }
                        .soa-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
                        .soa-table th { background: #f1f5f9; padding: 6px 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                        .soa-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
                        .soa-cat-head td { background: #f8fafc; font-weight: bold; border-top: 1px solid #cbd5e1; }
                        .soa-summary-box { max-width: 420px; margin-left: auto; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 24px; }
                        .soa-calc-row { display: flex; justify-content: space-between; padding: 3px 0; }
                        .soa-final-balance { font-weight: bold; font-size: 16px; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
                        .soa-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; text-align: center; margin-top: 40px; font-size: 12px; }
                        .soa-sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 6px; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 300);
    });
}

function openReceiptPrintModal(receipt, folio) {
    const modalContainer = document.getElementById("ibModalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="ib-modal-backdrop">
            <div class="ib-modal" style="max-width: 480px;">
                <div class="ib-modal-header no-print">
                    <h3>Official Receipt Preview</h3>
                    <div>
                        <button class="ib-btn ib-btn-primary" id="ibBtnPrintSingleReceipt">Print Receipt</button>
                        <button class="ib-modal-close" id="ibCloseModal">&times;</button>
                    </div>
                </div>
                <div class="ib-modal-body" id="ibReceiptPrintArea" style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; font-family: monospace;">
                    <div style="text-align: center; border-bottom: 1px dashed #64748b; padding-bottom: 10px; margin-bottom: 12px;">
                        <h3 style="margin: 0; font-size: 16px;">USINTELLIX MEDICAL CENTER</h3>
                        <p style="margin: 2px 0; font-size: 11px;">100 Hospital Blvd · Main Cashier Desk</p>
                        <h4 style="margin: 8px 0 0; font-size: 14px; letter-spacing: 1px;">OFFICIAL RECEIPT</h4>
                        <div style="font-size: 14px; font-weight: bold; color: #2563eb;">${esc(receipt.receipt_number)}</div>
                    </div>
                    <div style="font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
                        <div><strong>Date/Time:</strong> ${esc(receipt.payment_date || new Date().toLocaleString())}</div>
                        <div><strong>Folio #:</strong> ${esc(folio.folio_number)}</div>
                        <div><strong>Patient:</strong> ${esc(folio.patient_name)}</div>
                        <div><strong>MRN:</strong> ${esc(folio.patient_no || 'PAT-' + folio.patient_id)}</div>
                        <div><strong>Payment Method:</strong> ${esc(receipt.payment_method.toUpperCase())}</div>
                        ${receipt.reference_no ? `<div><strong>Ref/Auth #:</strong> ${esc(receipt.reference_no)}</div>` : ''}
                    </div>
                    <div style="border-top: 1px dashed #64748b; border-bottom: 1px dashed #64748b; padding: 10px 0; margin-bottom: 16px; font-size: 14px; display: flex; justify-content: space-between; font-weight: bold;">
                        <span>AMOUNT RECEIVED:</span>
                        <span style="font-size: 16px;">${cur(receipt.amount)}</span>
                    </div>
                    <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 20px;">
                        <div>Thank you for your payment.</div>
                        <div>This serves as your official hospital acknowledgment receipt.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#ibCloseModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#ibBtnPrintSingleReceipt")?.addEventListener("click", () => {
        const content = document.getElementById("ibReceiptPrintArea")?.innerHTML;
        const win = window.open("", "_blank");
        win.document.write(`<html><head><title>Receipt - ${esc(receipt.receipt_number)}</title></head><body style="font-family: monospace; padding: 20px;">${content}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 300);
    });
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function formatCatName(cat) {
    const map = {
        'accommodation': '🛏️ Accommodation',
        'doctor_fees': '🩺 Doctor Fees',
        'operating_theater': '🏥 OR / Surgical',
        'laboratory': '🧪 Laboratory',
        'radiology': '🩻 Radiology',
        'pharmacy': '💊 Pharmacy / e-MAR',
        'supplies_misc': '📦 Supplies / Misc'
    };
    return map[cat] || cat;
}

function formatMethodName(m) {
    const map = {
        'cash': 'Cash',
        'credit_card': 'Credit Card',
        'debit_card': 'Debit Card',
        'gcash_maya': 'GCash / Maya',
        'bank_transfer': 'Bank Wire',
        'check': 'Manager Check',
        'insurance_claim': 'HMO / Insurance'
    };
    return map[m] || m;
}

// -------------------------------------------------------------
// CSS INJECTION
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("inpatientBillingStyles")) return;
    const style = document.createElement("style");
    style.id = "inpatientBillingStyles";
    style.textContent = `
        .ib-root {
            width: 100%;
            min-height: 100vh;
            background: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            padding: 20px 24px 60px;
            box-sizing: border-box;
        }

        .ib-container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .ib-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .ib-title {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.5px;
        }

        .ib-subtitle {
            font-size: 13px;
            color: #64748b;
            margin: 4px 0 0;
        }

        .ib-header-actions {
            display: flex;
            gap: 10px;
        }

        /* Buttons */
        .ib-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .ib-btn svg {
            width: 16px;
            height: 16px;
        }

        .ib-btn-primary {
            background: #2563eb;
            color: #fff;
            border-color: #1d4ed8;
        }

        .ib-btn-primary:hover {
            background: #1d4ed8;
        }

        .ib-btn-secondary {
            background: #fff;
            color: #334155;
            border-color: #cbd5e1;
        }

        .ib-btn-secondary:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
        }

        .ib-btn-payment {
            background: #059669;
            color: #fff;
            border-color: #047857;
        }

        .ib-btn-payment:hover {
            background: #047857;
        }

        .ib-btn-clearance {
            background: #0284c7;
            color: #fff;
            border-color: #0369a1;
        }

        .ib-btn-clearance:hover {
            background: #0369a1;
        }

        .ib-btn-sm { padding: 5px 10px; font-size: 12px; }
        .ib-btn-xs { padding: 3px 8px; font-size: 11px; }

        /* Stats Grid */
        .ib-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
            margin-bottom: 20px;
        }

        .ib-stat-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .ib-stat-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ib-stat-val {
            font-size: 24px;
            font-weight: 700;
            margin: 6px 0 2px;
        }

        .ib-stat-sub {
            font-size: 12px;
            color: #94a3b8;
        }

        /* Filter Bar */
        .ib-filter-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .ib-search-box {
            position: relative;
            flex: 1;
            min-width: 280px;
            max-width: 460px;
        }

        .ib-search-box svg {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: #94a3b8;
        }

        .ib-search-box input {
            width: 100%;
            padding: 8px 32px 8px 34px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }

        .ib-clear-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 18px;
            cursor: pointer;
        }

        .ib-filter-tabs {
            display: flex;
            background: #e2e8f0;
            border-radius: 6px;
            padding: 3px;
            gap: 2px;
        }

        .ib-tab-btn {
            padding: 6px 12px;
            font-size: 12.5px;
            font-weight: 600;
            border: none;
            background: none;
            color: #475569;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s;
        }

        .ib-tab-btn.active {
            background: #fff;
            color: #0f172a;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        /* Tables & Cards */
        .ib-table-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .ib-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
        }

        .ib-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 12px;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .ib-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .ib-table tbody tr:hover {
            background: #f8fafc;
        }

        .ib-table-compact td { padding: 8px 12px; }

        .ib-row-voided {
            background: #fff1f2 !important;
            opacity: 0.75;
            text-decoration: line-through;
        }

        /* Detail View Elements */
        .ib-nav-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .ib-folio-header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ib-folio-header-title h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
        }

        .ib-tag-folio {
            background: #dbeafe;
            color: #1e40af;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 14px;
            letter-spacing: 0.5px;
        }

        .ib-nav-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .ib-patient-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .ib-patient-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
        }

        .ib-patient-name {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
        }

        .ib-meta-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .ib-meta-val {
            font-size: 13.5px;
            font-weight: 600;
            color: #1e293b;
        }

        .ib-meta-sub {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
        }

        .ib-clearance-banner {
            margin-top: 14px;
            padding: 10px 14px;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #065f46;
            font-size: 13px;
        }

        .ib-clearance-banner svg {
            width: 20px;
            height: 20px;
            color: #059669;
            flex-shrink: 0;
        }

        /* Financial Balance Banner */
        .ib-balance-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .ib-financial-kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
        }

        .ib-kpi {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
        }

        .ib-kpi-label {
            font-size: 11.5px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .ib-kpi-val {
            font-size: 20px;
            font-weight: 700;
            margin: 4px 0 2px;
            color: #0f172a;
        }

        .ib-kpi-sub {
            font-size: 11px;
            color: #94a3b8;
        }

        .ib-kpi-balance.owing {
            background: #fff1f2;
            border-color: #fecdd3;
        }

        .ib-kpi-balance.owing .balance-text {
            color: #e11d48;
        }

        .ib-kpi-balance.zero {
            background: #ecfdf5;
            border-color: #a7f3d0;
        }

        .ib-kpi-balance.zero .balance-text {
            color: #059669;
        }

        .ib-financial-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
        }

        /* Category Breakdown Tabs */
        .ib-details-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .ib-category-tabs {
            display: flex;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            overflow-x: auto;
        }

        .ib-cat-tab {
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s;
        }

        .ib-cat-tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
            background: #fff;
        }

        .ib-tab-body {
            padding: 0;
        }

        /* Badges & Pills */
        .ib-badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 11.5px;
            font-weight: 600;
            border-radius: 4px;
        }

        .ib-badge-info { background: #dbeafe; color: #1e40af; }
        .ib-badge-warning { background: #fef3c7; color: #92400e; }
        .ib-badge-success { background: #d1fae5; color: #065f46; }
        .ib-badge-success-large {
            background: #d1fae5;
            color: #065f46;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
        }

        .ib-balance-pill {
            display: inline-block;
            padding: 4px 10px;
            font-weight: 700;
            font-size: 13px;
            border-radius: 6px;
        }

        .ib-balance-pill.cleared {
            background: #d1fae5;
            color: #065f46;
        }

        .ib-balance-pill.owing {
            background: #ffe4e6;
            color: #be123c;
        }

        .ib-cat-tag {
            display: inline-block;
            padding: 2px 7px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 4px;
            background: #f1f5f9;
            color: #475569;
        }

        .ib-code-pill {
            display: inline-block;
            background: #e2e8f0;
            color: #334155;
            padding: 1px 5px;
            font-size: 10.5px;
            font-family: monospace;
            border-radius: 3px;
            margin-left: 4px;
        }

        .ib-status-tag {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .ib-status-tag.billed { color: #059669; }
        .ib-status-tag.voided { color: #e11d48; }

        /* Modals */
        .ib-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }

        .ib-modal {
            background: #fff;
            border-radius: 10px;
            width: 100%;
            max-width: 580px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
            overflow: hidden;
        }

        .ib-modal-lg { max-width: 900px; }

        .ib-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ib-modal-header h3 {
            margin: 0;
            font-size: 17px;
            font-weight: 700;
        }

        .ib-modal-close {
            background: none;
            border: none;
            font-size: 22px;
            color: #94a3b8;
            cursor: pointer;
        }

        .ib-modal-body {
            padding: 20px;
            overflow-y: auto;
        }

        .ib-modal-footer {
            padding: 14px 20px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .ib-form-group {
            margin-bottom: 14px;
        }

        .ib-form-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
        }

        .ib-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .ib-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }

        .ib-preset-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 4px;
        }

        .ib-chip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 4px 10px;
            font-size: 11.5px;
            cursor: pointer;
            color: #334155;
            transition: all 0.15s;
        }

        .ib-chip:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
        }

        .ib-receipt-preview-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 14px;
        }

        .ib-clearance-check-card {
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .ib-clearance-check-card.cleared {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
        }

        .ib-clearance-check-card.owing {
            background: #fff1f2;
            border: 1px solid #fecdd3;
            color: #9f1239;
        }

        .ib-clearance-check-card h4 { margin: 0 0 6px; font-size: 15px; }

        .ib-empty-state {
            padding: 40px 20px;
            text-align: center;
            color: #64748b;
        }

        .ib-empty-state svg {
            width: 48px;
            height: 48px;
            margin-bottom: 12px;
            color: #94a3b8;
        }

        .ib-empty-state h4 {
            margin: 0 0 4px;
            font-size: 16px;
            color: #1e293b;
        }

        .ib-empty-state p {
            margin: 0;
            font-size: 13px;
        }

        .ib-icon-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #94a3b8;
            padding: 4px;
            border-radius: 4px;
        }

        .ib-icon-btn:hover {
            color: #ef4444;
            background: #fee2e2;
        }

        .ib-icon-btn svg { width: 15px; height: 15px; }

        .ib-link-btn {
            background: none;
            border: none;
            color: #2563eb;
            cursor: pointer;
            padding: 0;
            font-size: 12px;
            text-decoration: underline;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-blue { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-amber { color: #d97706; }
        .text-muted { color: #64748b; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-lg { font-size: 18px; }

        /* Printable Area */
        .ib-printable-soa {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
        }

        .soa-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
        .soa-brand h2 { margin: 0; font-size: 18px; color: #0f172a; }
        .soa-brand p { margin: 3px 0 8px; font-size: 11px; color: #64748b; }
        .soa-brand h3 { margin: 0; font-size: 15px; color: #2563eb; letter-spacing: 0.5px; }
        .soa-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 12px; line-height: 1.6; }
        .soa-divider { border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0; }
        .soa-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        .soa-table th { background: #f8fafc; padding: 6px 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
        .soa-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
        .soa-cat-head td { background: #f8fafc; font-weight: bold; border-top: 1px solid #cbd5e1; }
        .soa-summary-box { max-width: 420px; margin-left: auto; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 12.5px; margin-bottom: 20px; background: #f8fafc; }
        .soa-calc-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .soa-final-balance { font-weight: bold; font-size: 15px; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; color: #e11d48; }
        .soa-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; text-align: center; margin-top: 36px; font-size: 11px; }
        .soa-sig-line { border-bottom: 1px solid #475569; height: 36px; margin-bottom: 6px; }
    `;
    document.head.appendChild(style);
}
