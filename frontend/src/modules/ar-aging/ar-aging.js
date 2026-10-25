import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    bucketFilter: "all",
    payerFilter: "all",
    statusFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedAccountId: null
};

let cache = {
    matrixData: null,
    accountsData: null
};

export function ArAgingView() {
    return `<div class="ar-root" id="arAgingRoot"><div class="ar-loading">Loading Accounts Receivable (AR) Aging Engine…</div></div>`;
}

export async function initArAging() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("arAgingRoot");
    if (!root) return;

    try {
        const params = new URLSearchParams({
            page: state.page,
            per_page: state.perPage,
            bucket: state.bucketFilter,
            payer_category: state.payerFilter,
            collection_status: state.statusFilter,
            q: state.searchQuery
        });

        const [matRes, accRes] = await Promise.all([
            api("/ar-aging/matrix").catch(() => null),
            api(`/ar-aging/accounts?${params.toString()}`).catch(() => null)
        ]);

        cache.matrixData = matRes?.data || { matrix: [], bucket_totals: {}, bucket_percentages: {}, grand_totals: {} };
        cache.accountsData = accRes?.data || { data: [], total: 0 };

        renderView(root);
    } catch (e) {
        console.error("AR aging loading error:", e);
        root.innerHTML = `<div class="ar-error">Error connecting to AR Aging service: ${esc(e.message)}</div>`;
    }
}

function renderView(root) {
    const m = cache.matrixData || {};
    const gt = m.grand_totals || {};
    const matrix = m.matrix || [];
    const bTotals = m.bucket_totals || {};
    const bPcts = m.bucket_percentages || {};
    const accounts = cache.accountsData?.data || [];
    const totalAccounts = cache.accountsData?.total || 0;
    const totalPages = cache.accountsData?.total_pages || 1;

    root.innerHTML = `
        <div class="ar-container">
            <!-- Header Bar -->
            <div class="ar-header">
                <div>
                    <h1 class="ar-title">Accounts Receivable (AR) Aging Engine</h1>
                    <p class="ar-subtitle">Executive Hospital Aging Portfolio: 0–30, 31–60, 61–90, 91–120, &gt;120 Days segregated by Payer Class</p>
                </div>
                <div class="ar-header-actions">
                    <button class="ar-btn ar-btn-secondary" id="arBtnSyncFolios" title="Sync newly accrued Inpatient Folios into AR">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        Sync Master Folios
                    </button>
                    <button class="ar-btn ar-btn-secondary" id="arBtnPrintReport" title="Print AR Aging Report">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Aging Report
                    </button>
                    <button class="ar-btn ar-btn-secondary" id="arBtnRefresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    <button class="ar-btn ar-btn-primary" id="arBtnSeedDemo" title="Populate realistic hospital AR test accounts across all aging intervals">
                        ⚡ Seed Realistic AR Demo
                    </button>
                </div>
            </div>

            <!-- Executive KPI Ribbon -->
            <div class="ar-kpi-ribbon">
                <div class="ar-kpi-card">
                    <div class="ar-kpi-label">Total Outstanding AR</div>
                    <div class="ar-kpi-val text-primary">${cur(gt.total_ar)}</div>
                    <div class="ar-kpi-sub">${gt.total_accounts || 0} active accounts in collection</div>
                </div>

                <div class="ar-kpi-card">
                    <div class="ar-kpi-label">Average Days in AR (ADAR)</div>
                    <div class="ar-kpi-val ${gt.avg_days_in_ar > 60 ? 'text-warning' : 'text-emerald'}">${gt.avg_days_in_ar || 0} days</div>
                    <div class="ar-kpi-sub">Benchmark: &lt;50 days (HFMA Standard)</div>
                </div>

                <div class="ar-kpi-card">
                    <div class="ar-kpi-label">Clean / Current AR (0–30 Days)</div>
                    <div class="ar-kpi-val text-emerald">${cur(bTotals['0-30']?.balance)}</div>
                    <div class="ar-kpi-sub">${bPcts['0-30'] || 0}% of total portfolio</div>
                </div>

                <div class="ar-kpi-card ${gt.delinquent_pct_over_90 > 25 ? 'alert' : ''}">
                    <div class="ar-kpi-label">Critical Delinquent AR (&gt;90 Days)</div>
                    <div class="ar-kpi-val text-danger">${cur(gt.delinquent_balance_over_90)}</div>
                    <div class="ar-kpi-sub">${gt.delinquent_pct_over_90 || 0}% of AR (High bad-debt risk)</div>
                </div>
            </div>

            <!-- Cross-Tabulated AR Aging Matrix Table -->
            <div class="ar-matrix-card">
                <div class="ar-matrix-header">
                    <div>
                        <h3>Accounts Receivable Aging Matrix (Payer Class &times; Aging Interval)</h3>
                        <p>Click any cell to filter the detailed collection drilldown worklist below</p>
                    </div>
                    <div class="ar-matrix-legend">
                        <span class="ar-dot current"></span> 0–30d Normal
                        <span class="ar-dot aging"></span> 31–60d Aging
                        <span class="ar-dot atrisk"></span> 61–90d At Risk
                        <span class="ar-dot delinquent"></span> 91–120d Delinquent
                        <span class="ar-dot severe"></span> &gt;120d Severe
                    </div>
                </div>

                <div class="ar-table-responsive">
                    <table class="ar-matrix-table">
                        <thead>
                            <tr>
                                <th class="ar-col-payer">Payer Category</th>
                                <th class="text-right ar-col-bucket">Current (0–30d)</th>
                                <th class="text-right ar-col-bucket">31–60 Days</th>
                                <th class="text-right ar-col-bucket">61–90 Days</th>
                                <th class="text-right ar-col-bucket">91–120 Days</th>
                                <th class="text-right ar-col-bucket">&gt; 120 Days</th>
                                <th class="text-right ar-col-total">Total AR Balance</th>
                                <th class="text-right ar-col-pct">% of AR</th>
                                <th class="text-right ar-col-days">Avg Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matrix.map(row => `
                                <tr>
                                    <td class="ar-payer-cell">
                                        <strong>${esc(row.payer_label)}</strong>
                                        <div class="ar-payer-sub">${row.total_accounts} accounts</div>
                                    </td>
                                    ${renderMatrixCell(row.payer_category, '0-30', row.buckets['0-30'])}
                                    ${renderMatrixCell(row.payer_category, '31-60', row.buckets['31-60'])}
                                    ${renderMatrixCell(row.payer_category, '61-90', row.buckets['61-90'])}
                                    ${renderMatrixCell(row.payer_category, '91-120', row.buckets['91-120'])}
                                    ${renderMatrixCell(row.payer_category, '120+', row.buckets['120+'])}
                                    <td class="text-right font-bold ar-cell-total arCellClick" data-payer="${row.payer_category}" data-bucket="all">
                                        ${cur(row.total_balance)}
                                    </td>
                                    <td class="text-right font-semibold text-muted">
                                        ${row.pct_of_total_ar}%
                                    </td>
                                    <td class="text-right font-semibold ${row.avg_days_in_ar > 60 ? 'text-warning' : ''}">
                                        ${row.avg_days_in_ar} d
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                        <tfoot>
                            <tr class="ar-footer-row">
                                <th>TOTAL RECEIVABLES</th>
                                <th class="text-right arCellClick" data-payer="all" data-bucket="0-30">
                                    <div>${cur(bTotals['0-30']?.balance)}</div>
                                    <div class="ar-foot-sub">${bPcts['0-30'] || 0}%</div>
                                </th>
                                <th class="text-right arCellClick" data-payer="all" data-bucket="31-60">
                                    <div>${cur(bTotals['31-60']?.balance)}</div>
                                    <div class="ar-foot-sub">${bPcts['31-60'] || 0}%</div>
                                </th>
                                <th class="text-right arCellClick" data-payer="all" data-bucket="61-90">
                                    <div>${cur(bTotals['61-90']?.balance)}</div>
                                    <div class="ar-foot-sub">${bPcts['61-90'] || 0}%</div>
                                </th>
                                <th class="text-right arCellClick" data-payer="all" data-bucket="91-120">
                                    <div>${cur(bTotals['91-120']?.balance)}</div>
                                    <div class="ar-foot-sub">${bPcts['91-120'] || 0}%</div>
                                </th>
                                <th class="text-right arCellClick" data-payer="all" data-bucket="120+">
                                    <div>${cur(bTotals['120+']?.balance)}</div>
                                    <div class="ar-foot-sub">${bPcts['120+'] || 0}%</div>
                                </th>
                                <th class="text-right font-bold text-primary text-lg arCellClick" data-payer="all" data-bucket="all">
                                    ${cur(gt.total_ar)}
                                </th>
                                <th class="text-right font-bold">100.0%</th>
                                <th class="text-right font-bold">${gt.avg_days_in_ar || 0} d</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Visual Distribution Bar -->
            <div class="ar-distrib-card">
                <div class="ar-distrib-section">
                    <span class="ar-distrib-title">Aging Interval Distribution:</span>
                    <div class="ar-bar-stacked">
                        <div class="ar-bar-slice c030" style="width: ${bPcts['0-30'] || 0}%;" title="0–30 Days: ${cur(bTotals['0-30']?.balance)} (${bPcts['0-30']}%)"></div>
                        <div class="ar-bar-slice c3160" style="width: ${bPcts['31-60'] || 0}%;" title="31–60 Days: ${cur(bTotals['31-60']?.balance)} (${bPcts['31-60']}%)"></div>
                        <div class="ar-bar-slice c6190" style="width: ${bPcts['61-90'] || 0}%;" title="61–90 Days: ${cur(bTotals['61-90']?.balance)} (${bPcts['61-90']}%)"></div>
                        <div class="ar-bar-slice c91120" style="width: ${bPcts['91-120'] || 0}%;" title="91–120 Days: ${cur(bTotals['91-120']?.balance)} (${bPcts['91-120']}%)"></div>
                        <div class="ar-bar-slice c120p" style="width: ${bPcts['120+'] || 0}%;" title=">120 Days: ${cur(bTotals['120+']?.balance)} (${bPcts['120+']}%)"></div>
                    </div>
                </div>
            </div>

            <!-- AR Drilldown Worklist & Interactive Filter Controls -->
            <div class="ar-worklist-card">
                <div class="ar-worklist-header">
                    <div>
                        <h3>AR Accounts Drilldown &amp; Collection Worklist</h3>
                        <p>Showing ${accounts.length} of ${totalAccounts} accounts &bull; Filtered by Bucket: <strong>${esc(state.bucketFilter.toUpperCase())}</strong>, Payer: <strong>${esc(state.payerFilter.toUpperCase())}</strong></p>
                    </div>
                    <div class="ar-worklist-actions">
                        ${state.bucketFilter !== 'all' || state.payerFilter !== 'all' || state.statusFilter !== 'all' || state.searchQuery ? `
                            <button class="ar-btn ar-btn-secondary" id="arBtnResetFilters">✕ Reset Filters</button>
                        ` : ''}
                    </div>
                </div>

                <div class="ar-filters-bar">
                    <!-- Quick Bucket Buttons -->
                    <div class="ar-bucket-buttons">
                        <button class="ar-bucket-btn ${state.bucketFilter === 'all' ? 'active' : ''}" data-bucket="all">All Buckets</button>
                        <button class="ar-bucket-btn ${state.bucketFilter === '0-30' ? 'active' : ''}" data-bucket="0-30">0–30 Days</button>
                        <button class="ar-bucket-btn ${state.bucketFilter === '31-60' ? 'active' : ''}" data-bucket="31-60">31–60 Days</button>
                        <button class="ar-bucket-btn ${state.bucketFilter === '61-90' ? 'active' : ''}" data-bucket="61-90">61–90 Days</button>
                        <button class="ar-bucket-btn ${state.bucketFilter === '91-120' ? 'active' : ''}" data-bucket="91-120">91–120 Days</button>
                        <button class="ar-bucket-btn ${state.bucketFilter === '120+' ? 'active' : ''}" data-bucket="120+">&gt; 120 Days</button>
                    </div>

                    <div class="ar-dropdowns-row">
                        <div class="ar-search-wrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" id="arSearchInput" class="ar-input" placeholder="Search Patient, MRN, Account #, Invoice #..." value="${esc(state.searchQuery)}">
                        </div>

                        <select id="arPayerFilter" class="ar-select">
                            <option value="all" ${state.payerFilter === 'all' ? 'selected' : ''}>All Payer Categories</option>
                            <option value="self_pay" ${state.payerFilter === 'self_pay' ? 'selected' : ''}>Self-Pay (Patient)</option>
                            <option value="commercial_hmo" ${state.payerFilter === 'commercial_hmo' ? 'selected' : ''}>Commercial HMO / Private</option>
                            <option value="government" ${state.payerFilter === 'government' ? 'selected' : ''}>Government (Medicare / PhilHealth)</option>
                        </select>

                        <select id="arStatusFilter" class="ar-select">
                            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All Collection Statuses</option>
                            <option value="current" ${state.statusFilter === 'current' ? 'selected' : ''}>Current / In Good Standing</option>
                            <option value="first_notice_sent" ${state.statusFilter === 'first_notice_sent' ? 'selected' : ''}>1st Notice Sent</option>
                            <option value="second_notice_sent" ${state.statusFilter === 'second_notice_sent' ? 'selected' : ''}>2nd Notice Sent</option>
                            <option value="final_demand_sent" ${state.statusFilter === 'final_demand_sent' ? 'selected' : ''}>Final Demand Notice</option>
                            <option value="under_appeal" ${state.statusFilter === 'under_appeal' ? 'selected' : ''}>Under Claim Appeal</option>
                            <option value="in_payment_plan" ${state.statusFilter === 'in_payment_plan' ? 'selected' : ''}>Active Payment Plan</option>
                            <option value="promise_to_pay" ${state.statusFilter === 'promise_to_pay' ? 'selected' : ''}>Promise to Pay</option>
                            <option value="referred_to_collections" ${state.statusFilter === 'referred_to_collections' ? 'selected' : ''}>Referred to Agency</option>
                        </select>
                    </div>
                </div>

                <!-- Table of Accounts -->
                ${accounts.length === 0 ? `
                    <div class="ar-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                        <h3>No AR Accounts Match Selected Filters</h3>
                        <p>Try clearing filters or click "Seed Realistic AR Demo" to populate authentic sample cases.</p>
                    </div>
                ` : `
                    <div class="ar-table-responsive">
                        <table class="ar-table">
                            <thead>
                                <tr>
                                    <th>Account #</th>
                                    <th>Patient &amp; MRN</th>
                                    <th>Payer Category &amp; Plan</th>
                                    <th>Service Date</th>
                                    <th class="text-center">Days Aged</th>
                                    <th>Aging Bucket</th>
                                    <th class="text-right">Total Charges</th>
                                    <th class="text-right">Paid / Adj</th>
                                    <th class="text-right">Current AR Balance</th>
                                    <th>Collection Status</th>
                                    <th class="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accounts.map(a => {
                                    const bClass = {
                                        '0-30': 'bucket-0-30',
                                        '31-60': 'bucket-31-60',
                                        '61-90': 'bucket-61-90',
                                        '91-120': 'bucket-91-120',
                                        '120+': 'bucket-120p'
                                    }[a.aging_bucket] || 'bucket-0-30';

                                    const stClass = {
                                        current: 'status-current',
                                        first_notice_sent: 'status-notice1',
                                        second_notice_sent: 'status-notice2',
                                        final_demand_sent: 'status-demand',
                                        under_appeal: 'status-appeal',
                                        in_payment_plan: 'status-plan',
                                        promise_to_pay: 'status-promise',
                                        referred_to_collections: 'status-agency'
                                    }[a.collection_status] || 'status-current';

                                    const stLabel = formatStatus(a.collection_status);

                                    return `
                                        <tr>
                                            <td>
                                                <a href="javascript:void(0)" class="ar-acct-link arBtnViewDetail" data-id="${a.id}">
                                                    <strong>${esc(a.account_number)}</strong>
                                                </a>
                                                ${a.invoice_number ? `<div class="ar-sub-meta">${esc(a.invoice_number)}</div>` : ''}
                                            </td>
                                            <td>
                                                <div class="ar-pat-name">${esc(a.patient_name || 'Patient #' + a.patient_id)}</div>
                                                <div class="ar-sub-meta">MRN: ${esc(a.patient_no || 'N/A')}</div>
                                            </td>
                                            <td>
                                                <span class="ar-payer-tag ${a.payer_category}">${formatPayerBadge(a.payer_category)}</span>
                                                <div class="ar-payer-plan" title="${esc(a.payer_name)}">${esc(a.payer_name)}</div>
                                            </td>
                                            <td class="ar-sub-meta">
                                                ${esc(a.service_date)}
                                            </td>
                                            <td class="text-center font-bold">
                                                <span class="ar-days-pill ${a.days_aged > 90 ? 'severe' : (a.days_aged > 60 ? 'warning' : '')}">
                                                    ${a.days_aged} d
                                                </span>
                                            </td>
                                            <td>
                                                <span class="ar-bucket-badge ${bClass}">
                                                    ${esc(a.aging_bucket)}
                                                </span>
                                            </td>
                                            <td class="text-right text-muted">
                                                ${cur(a.total_charges)}
                                            </td>
                                            <td class="text-right text-muted">
                                                ${cur((parseFloat(a.insurance_paid) || 0) + (parseFloat(a.patient_paid) || 0))}
                                            </td>
                                            <td class="text-right font-bold text-lg text-primary">
                                                ${cur(a.current_balance)}
                                            </td>
                                            <td>
                                                <span class="ar-status-badge ${stClass}">
                                                    ${stLabel}
                                                </span>
                                                ${a.promise_amount ? `
                                                    <div class="ar-promise-sub">PTP: ${cur(a.promise_amount)} by ${esc(a.promise_date || '')}</div>
                                                ` : ''}
                                            </td>
                                            <td class="text-center">
                                                <div class="ar-action-group">
                                                    <button class="ar-btn-action ar-btn-followup arBtnFollowup" data-id="${a.id}" title="Log Collection Action / Promise to Pay">
                                                        📞 Follow-up
                                                    </button>
                                                    <button class="ar-btn-action ar-btn-detail arBtnViewDetail" data-id="${a.id}" title="View Notes &amp; Ledger">
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
                    ${totalPages > 1 ? `
                        <div class="ar-pagination">
                            <span>Showing page ${state.page} of ${totalPages} (${totalAccounts} accounts)</span>
                            <div class="ar-page-controls">
                                <button class="ar-btn ar-btn-secondary" id="arBtnPrevPage" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
                                <button class="ar-btn ar-btn-secondary" id="arBtnNextPage" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
                            </div>
                        </div>
                    ` : ''}
                `}
            </div>
        </div>

        <!-- MODAL CONTAINERS -->
        <div id="arModalContainer"></div>
    `;

    bindEvents(root);
}

function renderMatrixCell(payer, bucket, data) {
    const bal = data?.balance || 0;
    const cnt = data?.count || 0;
    const isZero = bal <= 0;

    return `
        <td class="text-right ar-matrix-cell ${isZero ? 'zero' : 'clickable'} arCellClick" data-payer="${payer}" data-bucket="${bucket}">
            <div class="ar-cell-val font-semibold ${isZero ? 'text-muted' : ''}">${isZero ? '—' : cur(bal)}</div>
            ${!isZero ? `<div class="ar-cell-sub">${cnt} acct${cnt === 1 ? '' : 's'}</div>` : ''}
        </td>
    `;
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindEvents(root) {
    root.querySelector("#arBtnRefresh")?.addEventListener("click", () => loadData());

    root.querySelector("#arBtnResetFilters")?.addEventListener("click", () => {
        state.bucketFilter = "all";
        state.payerFilter = "all";
        state.statusFilter = "all";
        state.searchQuery = "";
        state.page = 1;
        loadData();
    });

    root.querySelector("#arBtnPrintReport")?.addEventListener("click", () => {
        printAgingReport();
    });

    // Seed Demo
    root.querySelector("#arBtnSeedDemo")?.addEventListener("click", async () => {
        const btn = root.querySelector("#arBtnSeedDemo");
        btn.disabled = true;
        btn.innerText = "Seeding Demo Data...";
        try {
            const res = await api("/ar-aging/seed-demo", { method: "POST" });
            if (res && res.success) {
                showToast(res.message || "Realistic AR portfolio seeded successfully!", "success");
                await loadData();
            } else {
                showToast(res?.message || "Failed to seed demo data", "error");
            }
        } catch (e) {
            showToast(e.message || "Error seeding demo", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "⚡ Seed Realistic AR Demo";
        }
    });

    // Sync Folios
    root.querySelector("#arBtnSyncFolios")?.addEventListener("click", async () => {
        const btn = root.querySelector("#arBtnSyncFolios");
        btn.disabled = true;
        btn.innerText = "Syncing...";
        try {
            const res = await api("/ar-aging/sync", { method: "POST" });
            if (res && res.success) {
                showToast(res.message || "Master folios synchronized into AR Ledger!", "success");
                await loadData();
            } else {
                showToast(res?.message || "Sync failed", "error");
            }
        } catch (e) {
            showToast(e.message || "Sync error", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "Sync Master Folios";
        }
    });

    // Interactive Matrix Cell Click Filters
    root.querySelectorAll(".arCellClick").forEach(cell => {
        cell.addEventListener("click", () => {
            const p = cell.getAttribute("data-payer");
            const b = cell.getAttribute("data-bucket");
            if (p) state.payerFilter = p;
            if (b) state.bucketFilter = b;
            state.page = 1;
            loadData();
        });
    });

    // Bucket Buttons
    root.querySelectorAll(".ar-bucket-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.bucketFilter = btn.getAttribute("data-bucket");
            state.page = 1;
            loadData();
        });
    });

    // Dropdowns
    root.querySelector("#arPayerFilter")?.addEventListener("change", (e) => {
        state.payerFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    root.querySelector("#arStatusFilter")?.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    // Search
    let searchTimeout;
    root.querySelector("#arSearchInput")?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadData();
        }, 350);
    });

    // Pagination
    root.querySelector("#arBtnPrevPage")?.addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            loadData();
        }
    });
    root.querySelector("#arBtnNextPage")?.addEventListener("click", () => {
        state.page++;
        loadData();
    });

    // Action buttons in table
    root.querySelectorAll(".arBtnFollowup").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openFollowupModal(id);
        });
    });

    root.querySelectorAll(".arBtnViewDetail").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openDetailModal(id);
        });
    });
}

// -------------------------------------------------------------
// MODALS & DIALOGS
// -------------------------------------------------------------

// 1. Log Collection Follow-up Action / Promise to Pay
async function openFollowupModal(accountId) {
    const container = document.getElementById("arModalContainer");
    if (!container) return;

    let acct = null;
    try {
        const res = await api(`/ar-aging/detail?id=${accountId}`);
        acct = res?.data;
    } catch (e) {
        showToast("Error loading account", "error");
        return;
    }

    if (!acct) return;

    container.innerHTML = `
        <div class="ar-modal-backdrop" id="arFollowupBackdrop">
            <div class="ar-modal-box">
                <div class="ar-modal-header">
                    <div class="ar-modal-title">
                        <h3>Log Collection Action &bull; ${esc(acct.account_number)}</h3>
                        <p>Patient: <strong>${esc(acct.patient_name)}</strong> (MRN: ${esc(acct.patient_no || 'N/A')}) &bull; Balance: <strong class="text-primary">${cur(acct.current_balance)}</strong></p>
                    </div>
                    <button class="ar-modal-close" id="arBtnCloseFollowup">&times;</button>
                </div>

                <form id="arFormFollowup" class="ar-form">
                    <input type="hidden" name="account_id" value="${acct.id}">

                    <div class="ar-form-grid">
                        <div class="ar-field">
                            <label>Contact Action Type <span class="text-danger">*</span></label>
                            <select name="contact_type" class="ar-select" required>
                                <option value="phone_call">Phone Call (Outbound)</option>
                                <option value="letter_sent">Formal Billing Notice Sent</option>
                                <option value="email">Email Notification</option>
                                <option value="payer_portal">Payer Web Portal Inquiry</option>
                                <option value="settlement_negotiation">Settlement / Discount Negotiation</option>
                                <option value="in_person">In-Person Cashier Discussion</option>
                                <option value="internal_review">Internal Financial Review</option>
                            </select>
                        </div>

                        <div class="ar-field">
                            <label>Contacted Party <span class="text-danger">*</span></label>
                            <input type="text" name="contacted_party" class="ar-input" value="${esc(acct.payer_category === 'self_pay' ? acct.patient_name : acct.payer_name)}" required>
                        </div>

                        <div class="ar-field">
                            <label>Action Outcome</label>
                            <select name="action_outcome" class="ar-select" id="arActionOutcome">
                                <option value="Left Voicemail / Message">Left Voicemail / Message</option>
                                <option value="Spoke with Patient">Spoke with Patient</option>
                                <option value="Promise to Pay Obtained">Promise to Pay Obtained</option>
                                <option value="Claim Pending Adjudication">Claim Pending Adjudication (Payer)</option>
                                <option value="Appeal Letter Submitted">Appeal Letter Submitted</option>
                                <option value="Payment Plan Established">Payment Plan Established</option>
                                <option value="Requested Itemized Statement">Requested Itemized Statement</option>
                                <option value="Unreachable / Bad Phone">Unreachable / Bad Phone</option>
                            </select>
                        </div>

                        <div class="ar-field">
                            <label>Update Collection Status</label>
                            <select name="collection_status" class="ar-select">
                                <option value="current" ${acct.collection_status === 'current' ? 'selected' : ''}>Current</option>
                                <option value="first_notice_sent" ${acct.collection_status === 'first_notice_sent' ? 'selected' : ''}>1st Notice Sent</option>
                                <option value="second_notice_sent" ${acct.collection_status === 'second_notice_sent' ? 'selected' : ''}>2nd Notice Sent</option>
                                <option value="final_demand_sent" ${acct.collection_status === 'final_demand_sent' ? 'selected' : ''}>Final Demand Sent</option>
                                <option value="under_appeal" ${acct.collection_status === 'under_appeal' ? 'selected' : ''}>Under Appeal</option>
                                <option value="in_payment_plan" ${acct.collection_status === 'in_payment_plan' ? 'selected' : ''}>In Payment Plan</option>
                                <option value="promise_to_pay" ${acct.collection_status === 'promise_to_pay' ? 'selected' : ''}>Promise to Pay</option>
                                <option value="referred_to_collections" ${acct.collection_status === 'referred_to_collections' ? 'selected' : ''}>Referred to Agency</option>
                            </select>
                        </div>

                        <div class="ar-field">
                            <label>Promise-to-Pay Amount ($)</label>
                            <input type="number" step="0.01" min="0" name="promise_amount" class="ar-input" placeholder="0.00" value="${acct.promise_amount || ''}">
                        </div>

                        <div class="ar-field">
                            <label>Promise-to-Pay Date</label>
                            <input type="date" name="promise_date" class="ar-input" value="${esc(acct.promise_date || '')}">
                        </div>

                        <div class="ar-field full">
                            <label>Next Follow-up Date</label>
                            <input type="date" name="next_follow_up_date" class="ar-input" value="${esc(acct.next_follow_up_date || '')}">
                        </div>

                        <div class="ar-field full">
                            <label>Detailed Collection Notes <span class="text-danger">*</span></label>
                            <textarea name="notes" class="ar-textarea" rows="3" required placeholder="Log details of conversation, claim check, or patient repayment arrangement..."></textarea>
                        </div>
                    </div>

                    <div class="ar-modal-footer">
                        <button type="button" class="ar-btn ar-btn-secondary" id="arBtnCancelFollowup">Cancel</button>
                        <button type="submit" class="ar-btn ar-btn-primary" id="arBtnSubmitFollowup">
                            Save Collection Action &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#arBtnCloseFollowup")?.addEventListener("click", close);
    container.querySelector("#arBtnCancelFollowup")?.addEventListener("click", close);

    const form = container.querySelector("#arFormFollowup");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#arBtnSubmitFollowup");
        btn.disabled = true;
        btn.innerText = "Saving...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/ar-aging/action", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Collection action saved successfully!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Failed to save action", "error");
                btn.disabled = false;
                btn.innerText = "Save Collection Action →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Save Collection Action →";
        }
    });
}

// 2. Account Detail & Collection Notes History Modal
async function openDetailModal(accountId) {
    const container = document.getElementById("arModalContainer");
    if (!container) return;

    let acct = null;
    try {
        const res = await api(`/ar-aging/detail?id=${accountId}`);
        acct = res?.data;
    } catch (e) {
        showToast("Error loading account details", "error");
        return;
    }

    if (!acct) return;

    const notes = acct.collection_notes || [];

    container.innerHTML = `
        <div class="ar-modal-backdrop" id="arDetailBackdrop">
            <div class="ar-modal-box ar-modal-lg">
                <div class="ar-modal-header">
                    <div class="ar-modal-title">
                        <h3>AR Account Details &bull; ${esc(acct.account_number)}</h3>
                        <p>Patient: <strong>${esc(acct.patient_name)}</strong> (MRN: ${esc(acct.patient_no || 'N/A')}) &bull; Days in AR: <strong class="text-danger">${acct.days_aged} days</strong> (${esc(acct.aging_bucket)})</p>
                    </div>
                    <button class="ar-modal-close" id="arBtnCloseDetail">&times;</button>
                </div>

                <div class="ar-detail-grid">
                    <!-- Left: Financial & Payer Ledger -->
                    <div class="ar-detail-pane">
                        <h4>Account &amp; Financial Ledger</h4>
                        <table class="ar-detail-table">
                            <tr>
                                <td>Payer Category</td>
                                <td><span class="ar-payer-tag ${acct.payer_category}">${formatPayerBadge(acct.payer_category)}</span></td>
                            </tr>
                            <tr>
                                <td>Payer / Guarantor</td>
                                <td><strong>${esc(acct.payer_name)}</strong></td>
                            </tr>
                            <tr>
                                <td>Date of Service</td>
                                <td>${esc(acct.service_date)}</td>
                            </tr>
                            ${acct.discharge_date ? `
                                <tr>
                                    <td>Discharge Date</td>
                                    <td>${esc(acct.discharge_date)}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td>Gross Total Charges</td>
                                <td>${cur(acct.total_charges)}</td>
                            </tr>
                            <tr>
                                <td>Insurance Payments</td>
                                <td class="text-emerald font-semibold">- ${cur(acct.insurance_paid)}</td>
                            </tr>
                            <tr>
                                <td>Patient Payments</td>
                                <td class="text-emerald font-semibold">- ${cur(acct.patient_paid)}</td>
                            </tr>
                            <tr>
                                <td>Discounts / Adjustments</td>
                                <td>- ${cur((parseFloat(acct.patient_discount) || 0) + (parseFloat(acct.insurance_adjusted) || 0))}</td>
                            </tr>
                            <tr class="ar-row-highlight">
                                <td><strong>OUTSTANDING AR BALANCE</strong></td>
                                <td class="font-bold text-lg text-primary">${cur(acct.current_balance)}</td>
                            </tr>
                            <tr>
                                <td>Collection Status</td>
                                <td><span class="ar-status-badge status-${acct.collection_status}">${formatStatus(acct.collection_status)}</span></td>
                            </tr>
                            ${acct.promise_amount ? `
                                <tr>
                                    <td>Promise to Pay</td>
                                    <td><strong>${cur(acct.promise_amount)}</strong> due by ${esc(acct.promise_date || '')}</td>
                                </tr>
                            ` : ''}
                            ${acct.next_follow_up_date ? `
                                <tr>
                                    <td>Next Follow-up</td>
                                    <td>${esc(acct.next_follow_up_date)}</td>
                                </tr>
                            ` : ''}
                        </table>

                        ${acct.folio_number ? `
                            <div class="ar-folio-link-box">
                                <span>Linked Inpatient Folio:</span>
                                <strong>${esc(acct.folio_number)}</strong>
                                <a href="#/inpatient-billing" class="ar-btn-small">Open Statement of Account &rarr;</a>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right: Collection Contact Notes Timeline -->
                    <div class="ar-detail-pane">
                        <h4>Collection Contact History (${notes.length} logs)</h4>
                        ${notes.length === 0 ? `
                            <div class="ar-empty-notes">
                                <p>No follow-up actions recorded yet for this account.</p>
                                <button class="ar-btn ar-btn-primary arBtnLogNewNote" data-id="${acct.id}">+ Log First Follow-up</button>
                            </div>
                        ` : `
                            <div class="ar-notes-timeline">
                                ${notes.map(n => `
                                    <div class="ar-note-card">
                                        <div class="ar-note-top">
                                            <strong>${esc(formatContactType(n.contact_type))}</strong>
                                            <span>${esc(n.created_at)}</span>
                                        </div>
                                        <div class="ar-note-party">Party: <em>${esc(n.contacted_party)}</em> &bull; Collector: ${esc(n.created_by_name)}</div>
                                        ${n.action_outcome ? `<div class="ar-note-outcome">Outcome: <strong>${esc(n.action_outcome)}</strong></div>` : ''}
                                        <div class="ar-note-body">${esc(n.notes)}</div>
                                        ${n.next_follow_up_date ? `<div class="ar-note-next">Next Follow-up: ${esc(n.next_follow_up_date)}</div>` : ''}
                                    </div>
                                `).join("")}
                            </div>
                        `}
                    </div>
                </div>

                <div class="ar-modal-footer">
                    <button type="button" class="ar-btn ar-btn-secondary" id="arBtnCloseDetailFooter">Close</button>
                    <button type="button" class="ar-btn ar-btn-secondary" id="arBtnPrintStatement">
                        🖨 Print Dunning Statement
                    </button>
                    <button type="button" class="ar-btn ar-btn-primary" id="arBtnOpenFollowupFromDetail">
                        📞 Log Collection Action &rarr;
                    </button>
                </div>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#arBtnCloseDetail")?.addEventListener("click", close);
    container.querySelector("#arBtnCloseDetailFooter")?.addEventListener("click", close);

    container.querySelector("#arBtnPrintStatement")?.addEventListener("click", () => {
        printDunningStatement(acct);
    });

    container.querySelector("#arBtnOpenFollowupFromDetail")?.addEventListener("click", () => {
        openFollowupModal(acct.id);
    });
    container.querySelector(".arBtnLogNewNote")?.addEventListener("click", () => {
        openFollowupModal(acct.id);
    });
}

function printAgingReport() {
    const m = cache.matrixData || {};
    const gt = m.grand_totals || {};
    const matrix = m.matrix || [];
    const bTotals = m.bucket_totals || {};

    const w = window.open("", "_blank", "width=1000,height=800");
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hospital Accounts Receivable Aging Report</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
                .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
                .kpi-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; text-align: center; }
                .kpi-box .val { font-size: 20px; font-weight: bold; color: #0f172a; }
                .kpi-box .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px 12px; }
                th { background: #f8fafc; font-weight: 600; text-align: left; }
                .text-right { text-align: right; }
                .footer-row { background: #f1f5f9; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HOSPITAL ACCOUNTS RECEIVABLE (AR) AGING REPORT</h1>
                <p>USIntellix Healthcare System &bull; Finance &amp; Revenue Cycle Management</p>
                <p>Report Run: ${new Date().toLocaleString()}</p>
            </div>

            <div class="kpi-row">
                <div class="kpi-box">
                    <div class="label">Total AR Balance</div>
                    <div class="val">${cur(gt.total_ar)}</div>
                </div>
                <div class="kpi-box">
                    <div class="label">Average Days in AR</div>
                    <div class="val">${gt.avg_days_in_ar || 0} Days</div>
                </div>
                <div class="kpi-box">
                    <div class="label">Current AR (0-30d)</div>
                    <div class="val">${cur(bTotals['0-30']?.balance)}</div>
                </div>
                <div class="kpi-box">
                    <div class="label">Delinquent AR (&gt;90d)</div>
                    <div class="val" style="color: #dc2626;">${cur(gt.delinquent_balance_over_90)} (${gt.delinquent_pct_over_90}%)</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Payer Category</th>
                        <th class="text-right">Current (0–30d)</th>
                        <th class="text-right">31–60 Days</th>
                        <th class="text-right">61–90 Days</th>
                        <th class="text-right">91–120 Days</th>
                        <th class="text-right">&gt; 120 Days</th>
                        <th class="text-right">Total Balance</th>
                        <th class="text-right">% of AR</th>
                    </tr>
                </thead>
                <tbody>
                    ${matrix.map(r => `
                        <tr>
                            <td><strong>${esc(r.payer_label)}</strong></td>
                            <td class="text-right">${cur(r.buckets['0-30']?.balance)}</td>
                            <td class="text-right">${cur(r.buckets['31-60']?.balance)}</td>
                            <td class="text-right">${cur(r.buckets['61-90']?.balance)}</td>
                            <td class="text-right">${cur(r.buckets['91-120']?.balance)}</td>
                            <td class="text-right">${cur(r.buckets['120+']?.balance)}</td>
                            <td class="text-right font-bold">${cur(r.total_balance)}</td>
                            <td class="text-right">${r.pct_of_total_ar}%</td>
                        </tr>
                    `).join("")}
                </tbody>
                <tfoot>
                    <tr class="footer-row">
                        <th>TOTAL AR</th>
                        <th class="text-right">${cur(bTotals['0-30']?.balance)}</th>
                        <th class="text-right">${cur(bTotals['31-60']?.balance)}</th>
                        <th class="text-right">${cur(bTotals['61-90']?.balance)}</th>
                        <th class="text-right">${cur(bTotals['91-120']?.balance)}</th>
                        <th class="text-right">${cur(bTotals['120+']?.balance)}</th>
                        <th class="text-right">${cur(gt.total_ar)}</th>
                        <th class="text-right">100.0%</th>
                    </tr>
                </tfoot>
            </table>
            <script>window.print();</script>
        </body>
        </html>
    `);
    w.document.close();
}

function printDunningStatement(acct) {
    const w = window.open("", "_blank", "width=800,height=700");
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient Billing Notice - ${esc(acct.account_number)}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
                .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
                .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; }
                .box label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px; }
                .amount-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
                .amount-box .val { font-size: 32px; font-weight: bold; color: #991b1b; }
                .body-text { line-height: 1.6; font-size: 14px; margin-bottom: 25px; }
                .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>OFFICIAL HOSPITAL BILLING &amp; COLLECTION STATEMENT</h1>
                <p>USIntellix Healthcare System &bull; Patient Financial Services Desk</p>
                <p>Date: ${new Date().toLocaleDateString()} &bull; Account: <strong>${esc(acct.account_number)}</strong></p>
            </div>

            <div class="grid">
                <div class="box">
                    <label>Patient &amp; Guarantor</label>
                    <div><strong>${esc(acct.patient_name)}</strong></div>
                    <div>MRN: ${esc(acct.patient_no || 'N/A')}</div>
                </div>
                <div class="box">
                    <label>Billing Summary</label>
                    <div>Service Date: ${esc(acct.service_date)}</div>
                    <div>Payer Plan: ${esc(acct.payer_name)}</div>
                    <div>Age of Account: <strong>${acct.days_aged} days</strong> (${esc(acct.aging_bucket)})</div>
                </div>
            </div>

            <div class="amount-box">
                <label>TOTAL BALANCE OUTSTANDING &amp; DUE</label>
                <div class="val">${cur(acct.current_balance)}</div>
                <div>Status: ${esc(formatStatus(acct.collection_status))}</div>
            </div>

            <div class="body-text">
                <p>Dear <strong>${esc(acct.patient_name)}</strong>,</p>
                <p>Our records indicate that the balance of <strong>${cur(acct.current_balance)}</strong> for hospital services rendered on ${esc(acct.service_date)} remains unpaid and is currently <strong>${acct.days_aged} days past due</strong>.</p>
                <p>Please submit your payment today to keep your hospital account in good standing. We offer convenient payment options including online credit card payment, installment repayment plans, and cashier desk settlement.</p>
                <p>If you have already mailed your payment or believe your insurance provider has settled this amount, please contact Patient Financial Services immediately.</p>
            </div>

            <div class="footer">
                <p>USIntellix Healthcare Billing &bull; Cashiering &amp; Payment Inquiries: (800) 555-CARE &bull; support@usintellix.com</p>
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
function formatPayerBadge(cat) {
    const map = {
        self_pay: "Self-Pay",
        commercial_hmo: "Commercial HMO",
        government: "Government"
    };
    return map[cat] || cat;
}

function formatStatus(st) {
    const map = {
        current: "Current",
        first_notice_sent: "1st Notice Sent",
        second_notice_sent: "2nd Notice Sent",
        final_demand_sent: "Final Demand",
        under_appeal: "Under Appeal",
        in_payment_plan: "Payment Plan",
        promise_to_pay: "Promise to Pay",
        referred_to_collections: "Referred to Agency",
        bad_debt_write_off: "Written Off",
        settled: "Settled / Cleared"
    };
    return map[st] || st;
}

function formatContactType(t) {
    const map = {
        phone_call: "Phone Call",
        letter_sent: "Letter Sent",
        email: "Email Sent",
        payer_portal: "Payer Portal",
        settlement_negotiation: "Settlement Negotiation",
        in_person: "In-Person Discussion",
        internal_review: "Internal Review"
    };
    return map[t] || t;
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("arModuleStyles")) return;
    const style = document.createElement("style");
    style.id = "arModuleStyles";
    style.textContent = `
        .ar-root { padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; }
        .ar-loading { padding: 40px; text-align: center; color: #64748b; font-size: 16px; }
        .ar-error { padding: 20px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; }

        .ar-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .ar-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .ar-subtitle { color: #64748b; margin: 4px 0 0; font-size: 14px; }
        .ar-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        .ar-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .ar-btn svg { width: 16px; height: 16px; }
        .ar-btn-primary { background: #2563eb; color: #fff; }
        .ar-btn-primary:hover { background: #1d4ed8; }
        .ar-btn-secondary { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
        .ar-btn-secondary:hover { background: #f8fafc; }

        /* KPI Ribbon */
        .ar-kpi-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .ar-kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .ar-kpi-card.alert { border-left: 4px solid #ef4444; background: #fffdfd; }
        .ar-kpi-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .ar-kpi-val { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .ar-kpi-sub { font-size: 12px; color: #64748b; }

        /* Matrix Card */
        .ar-matrix-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
        .ar-matrix-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; }
        .ar-matrix-header h3 { margin: 0; font-size: 16px; color: #0f172a; }
        .ar-matrix-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
        .ar-matrix-legend { font-size: 11px; display: flex; gap: 12px; align-items: center; color: #64748b; }
        .ar-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
        .ar-dot.current { background: #10b981; }
        .ar-dot.aging { background: #3b82f6; }
        .ar-dot.atrisk { background: #f59e0b; }
        .ar-dot.delinquent { background: #f97316; }
        .ar-dot.severe { background: #ef4444; }

        .ar-table-responsive { overflow-x: auto; }
        .ar-matrix-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .ar-matrix-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
        .ar-matrix-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .ar-payer-cell strong { font-size: 13px; color: #0f172a; }
        .ar-payer-sub { font-size: 11px; color: #64748b; }

        .ar-matrix-cell { cursor: pointer; transition: background 0.15s; }
        .ar-matrix-cell.clickable:hover { background: #eff6ff; }
        .ar-cell-val { font-size: 13px; }
        .ar-cell-sub { font-size: 10px; color: #64748b; }
        .ar-cell-total { background: #f8fafc; cursor: pointer; }
        .ar-cell-total:hover { background: #f1f5f9; }

        .ar-footer-row th { background: #f1f5f9; border-top: 2px solid #cbd5e1; padding: 14px; cursor: pointer; }
        .ar-foot-sub { font-size: 11px; color: #64748b; font-weight: normal; }

        /* Distribution Bar Card */
        .ar-distrib-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .ar-distrib-section { display: flex; align-items: center; gap: 16px; }
        .ar-distrib-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; white-space: nowrap; }
        .ar-bar-stacked { flex: 1; height: 14px; border-radius: 999px; display: flex; overflow: hidden; background: #e2e8f0; }
        .ar-bar-slice.c030 { background: #10b981; }
        .ar-bar-slice.c3160 { background: #3b82f6; }
        .ar-bar-slice.c6190 { background: #f59e0b; }
        .ar-bar-slice.c91120 { background: #f97316; }
        .ar-bar-slice.c120p { background: #ef4444; }

        /* Worklist Card */
        .ar-worklist-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
        .ar-worklist-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px; }
        .ar-worklist-header h3 { margin: 0; font-size: 16px; color: #0f172a; }
        .ar-worklist-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }

        .ar-filters-bar { padding: 14px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px; }
        .ar-bucket-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
        .ar-bucket-btn { background: #fff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; }
        .ar-bucket-btn:hover { background: #f1f5f9; }
        .ar-bucket-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }

        .ar-dropdowns-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .ar-search-wrap { position: relative; flex: 1; min-width: 260px; }
        .ar-search-wrap svg { position: absolute; left: 10px; top: 10px; width: 16px; height: 16px; color: #94a3b8; }
        .ar-search-wrap .ar-input { padding-left: 34px; width: 100%; box-sizing: border-box; }

        .ar-input, .ar-select, .ar-textarea { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #1e293b; background: #fff; outline: none; }
        .ar-input:focus, .ar-select:focus, .ar-textarea:focus { border-color: #3b82f6; ring: 2px rgba(59,130,246,0.1); }

        /* Worklist Table */
        .ar-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .ar-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .ar-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .ar-table tr:hover { background: #f8fafc; }

        .ar-acct-link { color: #2563eb; text-decoration: none; font-size: 13px; }
        .ar-acct-link:hover { text-decoration: underline; }
        .ar-pat-name { font-weight: 600; color: #0f172a; }
        .ar-sub-meta { font-size: 11px; color: #64748b; }

        .ar-payer-tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .ar-payer-tag.self_pay { background: #fef3c7; color: #92400e; }
        .ar-payer-tag.commercial_hmo { background: #dbeafe; color: #1e40af; }
        .ar-payer-tag.government { background: #ede9fe; color: #5b21b6; }
        .ar-payer-plan { font-size: 11px; color: #475569; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .ar-days-pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; }
        .ar-days-pill.warning { background: #fef3c7; color: #b45309; }
        .ar-days-pill.severe { background: #fee2e2; color: #991b1b; }

        .ar-bucket-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .bucket-0-30 { background: #d1fae5; color: #065f46; }
        .bucket-31-60 { background: #dbeafe; color: #1e40af; }
        .bucket-61-90 { background: #fef3c7; color: #92400e; }
        .bucket-91-120 { background: #ffedd5; color: #9a3412; }
        .bucket-120p { background: #fee2e2; color: #991b1b; }

        .ar-status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .status-current { background: #f1f5f9; color: #475569; }
        .status-notice1 { background: #dbeafe; color: #1e40af; }
        .status-notice2 { background: #fef3c7; color: #92400e; }
        .status-demand { background: #fee2e2; color: #991b1b; }
        .status-appeal { background: #ede9fe; color: #6d28d9; }
        .status-plan { background: #ecfdf5; color: #065f46; }
        .status-promise { background: #f0fdf4; color: #166534; font-weight: 700; }
        .status-agency { background: #475569; color: #fff; }
        .ar-promise-sub { font-size: 10px; color: #166534; font-weight: 600; margin-top: 2px; }

        .ar-action-group { display: flex; gap: 6px; justify-content: center; }
        .ar-btn-action { border: 1px solid #cbd5e1; background: #fff; padding: 5px 9px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .ar-btn-followup { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
        .ar-btn-followup:hover { background: #dbeafe; }
        .ar-btn-detail:hover { background: #f1f5f9; }

        .ar-empty-state { text-align: center; padding: 48px 24px; color: #64748b; }
        .ar-empty-state svg { width: 44px; height: 44px; color: #cbd5e1; margin-bottom: 12px; }
        .ar-empty-state h3 { color: #0f172a; margin: 0 0 6px; }

        .ar-pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
        .ar-page-controls { display: flex; gap: 8px; }

        /* Modal Styles */
        .ar-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; box-sizing: border-box; }
        .ar-modal-box { background: #fff; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
        .ar-modal-lg { max-width: 880px; }
        .ar-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
        .ar-modal-title h3 { margin: 0; font-size: 18px; color: #0f172a; }
        .ar-modal-title p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        .ar-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
        .ar-modal-close:hover { color: #0f172a; }

        .ar-form { padding: 20px 24px; }
        .ar-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ar-field { display: flex; flex-direction: column; gap: 6px; }
        .ar-field.full { grid-column: 1 / -1; }
        .ar-field label { font-size: 12px; font-weight: 600; color: #334155; }

        .ar-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 12px 12px; }

        /* Detail Modal */
        .ar-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px 24px; }
        .ar-detail-pane h4 { margin: 0 0 12px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
        .ar-detail-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ar-detail-table td { padding: 7px 0; border-bottom: 1px solid #f8fafc; }
        .ar-detail-table td:first-child { color: #64748b; width: 45%; }
        .ar-row-highlight { background: #f8fafc; }
        .ar-row-highlight td { padding: 10px 6px; }

        .ar-folio-link-box { margin-top: 16px; padding: 10px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
        .ar-btn-small { color: #1d4ed8; text-decoration: none; font-weight: 600; }

        .ar-notes-timeline { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
        .ar-note-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 12px; }
        .ar-note-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .ar-note-top span { font-size: 10px; color: #94a3b8; }
        .ar-note-party { font-size: 11px; color: #64748b; margin-bottom: 4px; }
        .ar-note-outcome { color: #1e40af; font-size: 11px; margin-bottom: 4px; }
        .ar-note-body { color: #334155; margin-bottom: 4px; }
        .ar-note-next { font-size: 10px; color: #059669; font-weight: 600; }

        .ar-empty-notes { text-align: center; padding: 30px; color: #64748b; font-size: 12px; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .text-primary { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-warning { color: #d97706; }
        .text-danger { color: #dc2626; }
        .text-muted { color: #94a3b8; }
        .text-lg { font-size: 16px; }
    `;
    document.head.appendChild(style);
}
