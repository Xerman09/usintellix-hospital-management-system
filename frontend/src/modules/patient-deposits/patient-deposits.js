import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "ledger", // "ledger" | "admissions"
    statusFilter: "all",
    typeFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedDepositId: null
};

let cache = {
    depositsData: null,
    metrics: null,
    admissionsList: null
};

export function PatientDepositsView() {
    return `<div class="pd-root" id="patientDepositsRoot"><div class="pd-loading">Loading Patient Advance Deposits…</div></div>`;
}

export async function initPatientDeposits() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("patientDepositsRoot");
    if (!root) return;

    try {
        if (state.view === "ledger") {
            const params = new URLSearchParams({
                page: state.page,
                per_page: state.perPage,
                status: state.statusFilter,
                deposit_type: state.typeFilter,
                q: state.searchQuery
            });

            const [depRes, metRes] = await Promise.all([
                api(`/patient-deposits?${params.toString()}`).catch(() => null),
                api("/patient-deposits/metrics").catch(() => null)
            ]);

            cache.depositsData = depRes?.data || { items: [], total: 0 };
            cache.metrics = metRes?.data || {};

            renderLedgerView(root);
        } else if (state.view === "admissions") {
            const admRes = await api("/patient-deposits/admissions").catch(() => null);
            cache.admissionsList = admRes?.data || [];
            renderAdmissionsView(root);
        }
    } catch (e) {
        console.error("Patient deposits loading error:", e);
        root.innerHTML = `<div class="pd-error">Error connecting to deposits server: ${esc(e.message)}</div>`;
    }
}

// -------------------------------------------------------------
// RENDER: DEPOSITS LEDGER VIEW
// -------------------------------------------------------------
function renderLedgerView(root) {
    const data = cache.depositsData || { items: [], total: 0 };
    const items = data.items || [];
    const m = cache.metrics || {};

    root.innerHTML = `
        <div class="pd-container">
            <!-- Header Bar -->
            <div class="pd-header">
                <div>
                    <h1 class="pd-title">Patient Advance Deposits &amp; Drawdowns</h1>
                    <p class="pd-subtitle">Admission Deposits, Automated Drawdown Deductions against Folios &amp; Unused Balance Refunds</p>
                </div>
                <div class="pd-nav-actions">
                    <button class="pd-btn pd-btn-secondary" id="pdBtnNavAdmissions">
                        🛏️ Admitted Patients Directory
                    </button>
                    <button class="pd-btn pd-btn-primary" id="pdBtnNewDeposit">
                        + Record Advance Deposit
                    </button>
                </div>
            </div>

            <!-- Executive KPI Ribbon -->
            <div class="pd-stats-grid">
                <div class="pd-stat-card">
                    <div class="pd-stat-label">Active Escrow Balance</div>
                    <div class="pd-stat-val text-emerald font-bold">${cur(m.total_remaining_balance)}</div>
                    <div class="pd-stat-sub">${m.active_deposits_count || 0} active/unexhausted deposits</div>
                </div>
                <div class="pd-stat-card">
                    <div class="pd-stat-label">Total Deposits Collected</div>
                    <div class="pd-stat-val text-blue">${cur(m.total_initial_deposits)}</div>
                    <div class="pd-stat-sub">${m.total_deposits_count || 0} deposit transactions</div>
                </div>
                <div class="pd-stat-card">
                    <div class="pd-stat-label">Total Drawn Down to Folios</div>
                    <div class="pd-stat-val text-blue">${cur(m.total_drawn_down)}</div>
                    <div class="pd-stat-sub">Interim &amp; discharge deductions</div>
                </div>
                <div class="pd-stat-card">
                    <div class="pd-stat-label">Unused Balance Refunded</div>
                    <div class="pd-stat-val text-muted">${cur(m.total_refunded)}</div>
                    <div class="pd-stat-sub">${m.refunded_count || 0} discharge refund vouchers</div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div class="pd-filter-bar">
                <div class="pd-search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="pdSearchInput" placeholder="Search deposit #, receipt #, patient name, MRN, admission #..." value="${esc(state.searchQuery)}">
                    ${state.searchQuery ? `<button class="pd-clear-btn" id="pdClearSearch">&times;</button>` : ''}
                </div>

                <div class="pd-filter-group">
                    <select id="pdTypeFilter" class="pd-input pd-input-sm">
                        <option value="all" ${state.typeFilter === 'all' ? 'selected' : ''}>All Deposit Types</option>
                        <option value="inpatient_admission" ${state.typeFilter === 'inpatient_admission' ? 'selected' : ''}>Inpatient Admission</option>
                        <option value="elective_surgery" ${state.typeFilter === 'elective_surgery' ? 'selected' : ''}>Elective Surgery</option>
                        <option value="maternity_package" ${state.typeFilter === 'maternity_package' ? 'selected' : ''}>Maternity Package</option>
                        <option value="icu_reservation" ${state.typeFilter === 'icu_reservation' ? 'selected' : ''}>ICU Reservation</option>
                        <option value="general_prepayment" ${state.typeFilter === 'general_prepayment' ? 'selected' : ''}>General Prepayment</option>
                    </select>

                    <select id="pdStatusFilter" class="pd-input pd-input-sm">
                        <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>Active (Undrawn)</option>
                        <option value="partially_utilized" ${state.statusFilter === 'partially_utilized' ? 'selected' : ''}>Partially Utilized</option>
                        <option value="exhausted" ${state.statusFilter === 'exhausted' ? 'selected' : ''}>Exhausted</option>
                        <option value="refunded" ${state.statusFilter === 'refunded' ? 'selected' : ''}>Refunded</option>
                    </select>
                </div>
            </div>

            <!-- Deposits Table -->
            <div class="pd-table-card">
                <table class="pd-table">
                    <thead>
                        <tr>
                            <th>Deposit # &amp; Receipt</th>
                            <th>Patient / MRN</th>
                            <th>Admission &amp; Folio</th>
                            <th>Type &amp; Method</th>
                            <th class="text-right">Starting Deposit</th>
                            <th class="text-right">Drawn Down</th>
                            <th class="text-right">Refunded</th>
                            <th class="text-right">Remaining Balance</th>
                            <th>Status</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="10" class="pd-no-data">
                                    <div class="pd-empty-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                        <h4>No Advance Deposits Found</h4>
                                        <p>Click "+ Record Advance Deposit" or select an admitted patient to record an upfront deposit.</p>
                                    </div>
                                </td>
                            </tr>
                        ` : items.map(d => {
                            const remBal = parseFloat(d.remaining_balance) || 0;
                            const hasActiveBalance = remBal > 0.05;

                            let statusBadge = '';
                            if (d.status === 'active') {
                                statusBadge = `<span class="pd-badge pd-badge-success">Active</span>`;
                            } else if (d.status === 'partially_utilized') {
                                statusBadge = `<span class="pd-badge pd-badge-warning">Partially Drawn</span>`;
                            } else if (d.status === 'exhausted') {
                                statusBadge = `<span class="pd-badge pd-badge-neutral">Exhausted</span>`;
                            } else if (d.status === 'refunded') {
                                statusBadge = `<span class="pd-badge pd-badge-info">Refunded</span>`;
                            } else {
                                statusBadge = `<span class="pd-badge pd-badge-danger">Voided</span>`;
                            }

                            return `
                                <tr>
                                    <td>
                                        <strong class="text-blue">${esc(d.deposit_number)}</strong>
                                        <div class="pd-meta-sub">OR: <strong>${esc(d.receipt_number)}</strong></div>
                                        <div class="pd-meta-sub">${esc(d.deposit_date ? d.deposit_date.slice(0, 10) : '')}</div>
                                    </td>
                                    <td>
                                        <strong>${esc(d.patient_name)}</strong>
                                        <div class="pd-meta-sub">${esc(d.patient_no || 'MRN-N/A')}</div>
                                    </td>
                                    <td>
                                        <div>${d.admission_number ? esc(d.admission_number) : '<span class="text-muted">Direct</span>'}</div>
                                        ${d.folio_number ? `<div class="pd-meta-sub">Folio: <strong class="text-blue">${esc(d.folio_number)}</strong></div>` : ''}
                                        ${Number(d.folio_current_balance) > 0 ? `<div class="pd-meta-sub text-rose">Folio Bal: ${cur(d.folio_current_balance)}</div>` : ''}
                                    </td>
                                    <td>
                                        <div><span class="pd-badge pd-badge-secondary">${esc(formatDepositType(d.deposit_type))}</span></div>
                                        <div class="pd-meta-sub">${esc(d.payment_method.toUpperCase())} ${d.reference_no ? `(${esc(d.reference_no)})` : ''}</div>
                                    </td>
                                    <td class="text-right font-semibold">${cur(d.initial_deposit_amount)}</td>
                                    <td class="text-right text-blue">${cur(d.total_drawn_down)}</td>
                                    <td class="text-right text-muted">${cur(d.total_refunded)}</td>
                                    <td class="text-right font-bold ${hasActiveBalance ? 'text-emerald font-lg' : 'text-gray'}">
                                        ${cur(d.remaining_balance)}
                                    </td>
                                    <td>${statusBadge}</td>
                                    <td class="text-center">
                                        <div class="pd-action-group">
                                            ${hasActiveBalance ? `
                                                <button class="pd-btn pd-btn-primary pd-btn-xs pdBtnDrawdown" data-id="${d.id}" title="Apply Drawdown Deduction against Folio">
                                                    ⚡ Drawdown
                                                </button>
                                                <button class="pd-btn pd-btn-secondary pd-btn-xs pdBtnRefund" data-id="${d.id}" title="Disburse Unused Balance Refund Voucher">
                                                    💵 Refund
                                                </button>
                                            ` : ''}
                                            <button class="pd-btn pd-btn-secondary pd-btn-xs pdBtnViewDetail" data-id="${d.id}" title="View Details, Drawdowns &amp; Refunds">
                                                Detail
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="pdModalContainer"></div>
    `;

    bindLedgerEvents(root);
}

// -------------------------------------------------------------
// RENDER: ADMITTED PATIENTS DIRECTORY (QUICK INTAKE & DRAWDOWN)
// -------------------------------------------------------------
function renderAdmissionsView(root) {
    const list = cache.admissionsList || [];

    root.innerHTML = `
        <div class="pd-container">
            <div class="pd-header">
                <div>
                    <h1 class="pd-title">Admitted Patients Deposit Registry</h1>
                    <p class="pd-subtitle">Inpatient Ward Bed Placements, Advance Deposit Coverage &amp; Folio Settlement</p>
                </div>
                <div class="pd-nav-actions">
                    <button class="pd-btn pd-btn-secondary" id="pdBtnBackToLedger">
                        ← Back to Deposits Ledger
                    </button>
                </div>
            </div>

            <div class="pd-table-card">
                <table class="pd-table">
                    <thead>
                        <tr>
                            <th>Admission # &amp; Date</th>
                            <th>Patient / MRN</th>
                            <th>Ward, Room &amp; Bed</th>
                            <th>Attending Physician &amp; Diagnosis</th>
                            <th class="text-right">Folio Balance Due</th>
                            <th class="text-right">Active Deposit Balance</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.length === 0 ? `
                            <tr><td colspan="7" class="pd-no-data">No active inpatient admissions found.</td></tr>
                        ` : list.map(a => {
                            const depBal = parseFloat(a.active_deposit_balance) || 0;
                            const folBal = parseFloat(a.balance_due) || 0;

                            return `
                                <tr>
                                    <td>
                                        <strong class="text-blue">${esc(a.admission_number)}</strong>
                                        <div class="pd-meta-sub">${esc(a.admission_date)}</div>
                                    </td>
                                    <td>
                                        <strong>${esc(a.patient_name)}</strong>
                                        <div class="pd-meta-sub">${esc(a.patient_no || 'MRN-N/A')}</div>
                                    </td>
                                    <td>
                                        ${esc(a.ward_name || 'Ward')} · Bed ${esc(a.bed_number || 'N/A')}
                                    </td>
                                    <td>
                                        <div>${esc(a.attending_physician || 'Attending Physician')}</div>
                                        <div class="pd-meta-sub">${esc(a.admitting_diagnosis || 'General')}</div>
                                    </td>
                                    <td class="text-right font-bold ${folBal > 0 ? 'text-rose' : 'text-gray'}">
                                        ${cur(folBal)}
                                    </td>
                                    <td class="text-right font-bold ${depBal > 0 ? 'text-emerald' : 'text-gray'}">
                                        ${cur(depBal)}
                                    </td>
                                    <td class="text-center">
                                        <div class="pd-action-group">
                                            <button class="pd-btn pd-btn-primary pd-btn-xs pdBtnIntakeDeposit" data-adm="${a.admission_id}" data-pat="${a.patient_id}" data-fol="${a.folio_id || ''}" data-name="${esc(a.patient_name)}" title="Record Upfront Advance Deposit">
                                                + Deposit
                                            </button>
                                            ${depBal > 0 && folBal > 0 ? `
                                                <button class="pd-btn pd-btn-success pd-btn-xs pdBtnQuickDrawdown" data-adm="${a.admission_id}" data-fol="${a.folio_id}" title="Apply Deposit to Folio Balance">
                                                    ⚡ Apply to Folio
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

        <div id="pdModalContainer"></div>
    `;

    root.querySelector("#pdBtnBackToLedger")?.addEventListener("click", () => {
        state.view = "ledger";
        loadData();
    });

    root.querySelectorAll(".pdBtnIntakeDeposit").forEach(btn => {
        btn.addEventListener("click", () => {
            const admId = btn.getAttribute("data-adm");
            const patId = btn.getAttribute("data-pat");
            const folId = btn.getAttribute("data-fol");
            openNewDepositModal({ admission_id: admId, patient_id: patId, folio_id: folId });
        });
    });

    root.querySelectorAll(".pdBtnQuickDrawdown").forEach(btn => {
        btn.addEventListener("click", async () => {
            const admId = btn.getAttribute("data-adm");
            const folId = btn.getAttribute("data-fol");
            // Find active deposit for this admission
            const res = await api(`/patient-deposits?admission_id=${admId}&status=active`).catch(() => null);
            const dep = res?.data?.items?.[0];
            if (dep) {
                openDrawdownModal(dep.id, folId);
            } else {
                showToast("No active deposit found for this admission.", "warning");
            }
        });
    });
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindLedgerEvents(root) {
    root.querySelector("#pdBtnNavAdmissions")?.addEventListener("click", () => {
        state.view = "admissions";
        loadData();
    });

    root.querySelector("#pdBtnNewDeposit")?.addEventListener("click", () => {
        openNewDepositModal();
    });

    const searchInput = root.querySelector("#pdSearchInput");
    let searchTimeout = null;
    searchInput?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadData();
        }, 350);
    });

    root.querySelector("#pdClearSearch")?.addEventListener("click", () => {
        state.searchQuery = "";
        state.page = 1;
        loadData();
    });

    root.querySelector("#pdTypeFilter")?.addEventListener("change", (e) => {
        state.typeFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    root.querySelector("#pdStatusFilter")?.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    root.querySelectorAll(".pdBtnDrawdown").forEach(btn => {
        btn.addEventListener("click", () => {
            const depositId = btn.getAttribute("data-id");
            openDrawdownModal(depositId);
        });
    });

    root.querySelectorAll(".pdBtnRefund").forEach(btn => {
        btn.addEventListener("click", () => {
            const depositId = btn.getAttribute("data-id");
            openRefundModal(depositId);
        });
    });

    root.querySelectorAll(".pdBtnViewDetail").forEach(btn => {
        btn.addEventListener("click", () => {
            const depositId = btn.getAttribute("data-id");
            openDepositDetailModal(depositId);
        });
    });
}

// -------------------------------------------------------------
// MODALS: RECORD DEPOSIT, DRAWDOWN, REFUND, DETAIL
// -------------------------------------------------------------

function openNewDepositModal(prefill = {}) {
    const modalContainer = document.getElementById("pdModalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
        <div class="pd-modal-backdrop">
            <div class="pd-modal">
                <div class="pd-modal-header">
                    <h3>+ Record Advance Patient Deposit</h3>
                    <button class="pd-modal-close" id="pdCloseModal">&times;</button>
                </div>
                <div class="pd-modal-body">
                    <div class="pd-form-row">
                        <div class="pd-form-group">
                            <label>Patient ID <span class="text-rose">*</span></label>
                            <input type="number" id="pdNewPatId" class="pd-input" placeholder="Patient ID (e.g. 1)" value="${prefill.patient_id || ''}" required>
                        </div>
                        <div class="pd-form-group">
                            <label>Admission ID (Optional)</label>
                            <input type="number" id="pdNewAdmId" class="pd-input" placeholder="Admission ID" value="${prefill.admission_id || ''}">
                        </div>
                    </div>

                    <div class="pd-form-row">
                        <div class="pd-form-group">
                            <label>Advance Deposit Amount ($) <span class="text-rose">*</span></label>
                            <input type="number" id="pdNewAmount" class="pd-input font-bold sc-input-lg" placeholder="e.g. 1500.00" min="1" step="0.01" required>
                        </div>
                        <div class="pd-form-group">
                            <label>Deposit Type</label>
                            <select id="pdNewType" class="pd-input">
                                <option value="inpatient_admission" selected>Inpatient Admission Escrow</option>
                                <option value="elective_surgery">Elective Surgery Down Payment</option>
                                <option value="maternity_package">Maternity Delivery Package</option>
                                <option value="icu_reservation">ICU Room Reservation</option>
                                <option value="general_prepayment">General Prepayment / Account Credit</option>
                            </select>
                        </div>
                    </div>

                    <div class="pd-form-row">
                        <div class="pd-form-group">
                            <label>Payment Method</label>
                            <select id="pdNewMethod" class="pd-input">
                                <option value="cash" selected>💵 Cash (Counter Tender)</option>
                                <option value="credit_card">💳 Credit Card (POS Terminal)</option>
                                <option value="debit_card">💳 Debit Card</option>
                                <option value="gcash_maya">📱 GCash / Maya / QRPh</option>
                                <option value="bank_transfer">🏦 Bank Wire / Transfer</option>
                                <option value="check">🧾 Manager's Check</option>
                            </select>
                        </div>
                        <div class="pd-form-group">
                            <label>Reference No. / Approval Code</label>
                            <input type="text" id="pdNewRef" class="pd-input" placeholder="POS Auth Code, Check #, or Wire Ref">
                        </div>
                    </div>

                    <div class="pd-form-group">
                        <label>Cashier Notes / Remarks</label>
                        <textarea id="pdNewNotes" class="pd-input" rows="2" placeholder="e.g. Upfront surgery deposit, OR reservation..."></textarea>
                    </div>
                </div>
                <div class="pd-modal-footer">
                    <button class="pd-btn pd-btn-secondary" id="pdCancelNew">Cancel</button>
                    <button class="pd-btn pd-btn-primary" id="pdSubmitNew">Accept Deposit &amp; Issue Receipt</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#pdCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#pdCancelNew")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#pdSubmitNew")?.addEventListener("click", async () => {
        const patId = parseInt(modalContainer.querySelector("#pdNewPatId").value, 10);
        const admId = parseInt(modalContainer.querySelector("#pdNewAdmId").value, 10) || null;
        const amount = parseFloat(modalContainer.querySelector("#pdNewAmount").value) || 0;
        const type = modalContainer.querySelector("#pdNewType").value;
        const method = modalContainer.querySelector("#pdNewMethod").value;
        const refNo = modalContainer.querySelector("#pdNewRef").value.trim();
        const notes = modalContainer.querySelector("#pdNewNotes").value.trim();

        if (!patId || amount <= 0) {
            showToast("Patient ID and valid deposit amount are required.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#pdSubmitNew");
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing...";

        try {
            const res = await api("/patient-deposits", {
                method: "POST",
                body: JSON.stringify({
                    patient_id: patId,
                    admission_id: admId,
                    amount: amount,
                    deposit_type: type,
                    payment_method: method,
                    reference_no: refNo,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Advance deposit recorded! Official Receipt issued.", "success");
                closeModal();
                loadData();
            } else {
                showToast(res?.message || "Failed to record deposit", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Accept Deposit & Issue Receipt";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Accept Deposit & Issue Receipt";
        }
    });
}

async function openDrawdownModal(depositId, prefillFolioId = null) {
    const modalContainer = document.getElementById("pdModalContainer");
    if (!modalContainer) return;

    const res = await api(`/patient-deposits/detail?id=${depositId}`).catch(() => null);
    if (!res?.success) {
        showToast("Failed to load deposit details", "error");
        return;
    }

    const d = res.data;
    const remaining = parseFloat(d.remaining_balance) || 0;
    const targetFolioId = prefillFolioId || d.folio_id;
    const folioBalance = parseFloat(d.folio_current_balance) || 0;
    const suggestedDrawn = Math.min(remaining, folioBalance > 0 ? folioBalance : remaining);

    modalContainer.innerHTML = `
        <div class="pd-modal-backdrop">
            <div class="pd-modal">
                <div class="pd-modal-header">
                    <h3>⚡ Apply Deposit Drawdown to Folio</h3>
                    <button class="pd-modal-close" id="pdCloseModal">&times;</button>
                </div>
                <div class="pd-modal-body">
                    <div class="pd-receipt-banner">
                        <div>
                            <div class="pd-meta-label">Deposit #</div>
                            <strong class="text-blue">${esc(d.deposit_number)}</strong>
                            <div class="pd-meta-sub">${esc(d.patient_name)} (${esc(d.patient_no)})</div>
                        </div>
                        <div class="text-right">
                            <div class="pd-meta-label">Active Deposit Balance</div>
                            <strong class="text-emerald font-lg">${cur(remaining)}</strong>
                        </div>
                    </div>

                    <div class="pd-form-group">
                        <label>Target Inpatient Folio ID <span class="text-rose">*</span></label>
                        <input type="number" id="pdDrwFolioId" class="pd-input" value="${targetFolioId || ''}" placeholder="Folio ID" required>
                        ${d.folio_number ? `<div class="pd-meta-sub">Linked Folio: <strong>${esc(d.folio_number)}</strong> · Current Due: <strong class="text-rose">${cur(folioBalance)}</strong></div>` : ''}
                    </div>

                    <div class="pd-form-group">
                        <label>Drawdown Deduction Amount ($) <span class="text-rose">*</span></label>
                        <input type="number" id="pdDrwAmount" class="pd-input font-bold" value="${suggestedDrawn.toFixed(2)}" min="0.01" max="${remaining.toFixed(2)}" step="0.01" required>
                        <div class="pd-meta-sub">Max deductible against deposit: <strong>${cur(remaining)}</strong></div>
                    </div>

                    <div class="pd-form-group">
                        <label>Deduction Type</label>
                        <select id="pdDrwType" class="pd-input">
                            <option value="interim_billing_deduction" selected>Interim Billing Statement Deduction</option>
                            <option value="discharge_final_settlement">Final Discharge Settlement Clearance</option>
                            <option value="manual_deduction">Manual Accounting Adjustment</option>
                        </select>
                    </div>

                    <div class="pd-form-group">
                        <label>Audit Notes</label>
                        <input type="text" id="pdDrwNotes" class="pd-input" placeholder="e.g. Applied against room & surgery charges">
                    </div>
                </div>
                <div class="pd-modal-footer">
                    <button class="pd-btn pd-btn-secondary" id="pdCancelDrw">Cancel</button>
                    <button class="pd-btn pd-btn-primary" id="pdSubmitDrw">Confirm Drawdown &amp; Deduct</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#pdCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#pdCancelDrw")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#pdSubmitDrw")?.addEventListener("click", async () => {
        const folId = parseInt(modalContainer.querySelector("#pdDrwFolioId").value, 10);
        const amount = parseFloat(modalContainer.querySelector("#pdDrwAmount").value) || 0;
        const type = modalContainer.querySelector("#pdDrwType").value;
        const notes = modalContainer.querySelector("#pdDrwNotes").value.trim();

        if (!folId || amount <= 0) {
            showToast("Valid Folio ID and drawdown amount are required.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#pdSubmitDrw");
        submitBtn.disabled = true;
        submitBtn.textContent = "Applying...";

        try {
            const res = await api("/patient-deposits/drawdown", {
                method: "POST",
                body: JSON.stringify({
                    deposit_id: depositId,
                    folio_id: folId,
                    amount_drawn: amount,
                    drawdown_type: type,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Deposit drawdown successfully applied to folio!", "success");
                closeModal();
                loadData();
            } else {
                showToast(res?.message || "Drawdown failed", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Confirm Drawdown & Deduct";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirm Drawdown & Deduct";
        }
    });
}

async function openRefundModal(depositId) {
    const modalContainer = document.getElementById("pdModalContainer");
    if (!modalContainer) return;

    const res = await api(`/patient-deposits/detail?id=${depositId}`).catch(() => null);
    if (!res?.success) {
        showToast("Failed to load deposit details", "error");
        return;
    }

    const d = res.data;
    const remaining = parseFloat(d.remaining_balance) || 0;

    modalContainer.innerHTML = `
        <div class="pd-modal-backdrop">
            <div class="pd-modal">
                <div class="pd-modal-header">
                    <h3>💵 Disburse Unused Deposit Balance Refund</h3>
                    <button class="pd-modal-close" id="pdCloseModal">&times;</button>
                </div>
                <div class="pd-modal-body">
                    <div class="pd-receipt-banner">
                        <div>
                            <div class="pd-meta-label">Deposit #</div>
                            <strong class="text-blue">${esc(d.deposit_number)}</strong>
                            <div class="pd-meta-sub">${esc(d.patient_name)} (${esc(d.patient_no)})</div>
                        </div>
                        <div class="text-right">
                            <div class="pd-meta-label">Unused Deposit Balance</div>
                            <strong class="text-emerald font-lg">${cur(remaining)}</strong>
                        </div>
                    </div>

                    <div class="pd-form-group">
                        <label>Refund Amount ($) <span class="text-rose">*</span></label>
                        <input type="number" id="pdRefAmount" class="pd-input font-bold" value="${remaining.toFixed(2)}" min="0.01" max="${remaining.toFixed(2)}" step="0.01" required>
                    </div>

                    <div class="pd-form-row">
                        <div class="pd-form-group">
                            <label>Disbursal Method</label>
                            <select id="pdRefMethod" class="pd-input">
                                <option value="cash" selected>💵 Cash Disbursement</option>
                                <option value="card_reversal">💳 Card Transaction Reversal / Void</option>
                                <option value="check">🧾 Hospital Refund Check</option>
                                <option value="bank_transfer">🏦 Bank Wire / EFT</option>
                                <option value="gcash_maya">📱 GCash / Maya Transfer</option>
                            </select>
                        </div>
                        <div class="pd-form-group">
                            <label>Refund Reason</label>
                            <select id="pdRefReason" class="pd-input">
                                <option value="unused_discharge_balance" selected>Unused Balance at Discharge</option>
                                <option value="admission_cancelled">Admission / Surgery Cancelled</option>
                                <option value="overpayment_correction">Accounting Overpayment Correction</option>
                                <option value="insurance_retroactive_takeover">Insurance Retroactive Coverage</option>
                            </select>
                        </div>
                    </div>

                    <div class="pd-form-group">
                        <label>Recipient Name (Patient / Authorized Guardian) <span class="text-rose">*</span></label>
                        <input type="text" id="pdRefRecipient" class="pd-input" value="${esc(d.patient_name)}" required>
                    </div>

                    <div class="pd-form-group">
                        <label>Voucher Notes / Check Reference</label>
                        <input type="text" id="pdRefNotes" class="pd-input" placeholder="e.g. Check #, Authorization code, or clearance note">
                    </div>
                </div>
                <div class="pd-modal-footer">
                    <button class="pd-btn pd-btn-secondary" id="pdCancelRef">Cancel</button>
                    <button class="pd-btn pd-btn-primary" id="pdSubmitRef">Disburse Refund &amp; Print Voucher</button>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#pdCloseModal")?.addEventListener("click", closeModal);
    modalContainer.querySelector("#pdCancelRef")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#pdSubmitRef")?.addEventListener("click", async () => {
        const amount = parseFloat(modalContainer.querySelector("#pdRefAmount").value) || 0;
        const method = modalContainer.querySelector("#pdRefMethod").value;
        const reason = modalContainer.querySelector("#pdRefReason").value;
        const recipient = modalContainer.querySelector("#pdRefRecipient").value.trim();
        const notes = modalContainer.querySelector("#pdRefNotes").value.trim();

        if (amount <= 0 || !recipient) {
            showToast("Valid refund amount and recipient name are required.", "warning");
            return;
        }

        const submitBtn = modalContainer.querySelector("#pdSubmitRef");
        submitBtn.disabled = true;
        submitBtn.textContent = "Disbursing...";

        try {
            const res = await api("/patient-deposits/refund", {
                method: "POST",
                body: JSON.stringify({
                    deposit_id: depositId,
                    refund_amount: amount,
                    refund_method: method,
                    refund_reason: reason,
                    recipient_name: recipient,
                    notes: notes
                })
            });

            if (res?.success) {
                showToast("Refund voucher disbursed successfully!", "success");
                closeModal();
                loadData();
            } else {
                showToast(res?.message || "Refund failed", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = "Disburse Refund & Print Voucher";
            }
        } catch (e) {
            showToast(e.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Disburse Refund & Print Voucher";
        }
    });
}

async function openDepositDetailModal(depositId) {
    const modalContainer = document.getElementById("pdModalContainer");
    if (!modalContainer) return;

    const res = await api(`/patient-deposits/detail?id=${depositId}`).catch(() => null);
    if (!res?.success) {
        showToast("Failed to load details", "error");
        return;
    }

    const d = res.data;
    const drawdowns = d.drawdowns || [];
    const refunds = d.refunds || [];

    modalContainer.innerHTML = `
        <div class="pd-modal-backdrop">
            <div class="pd-modal cd-modal-lg">
                <div class="pd-modal-header">
                    <h3>Deposit Ledger &amp; Drawdowns Audit</h3>
                    <button class="pd-modal-close" id="pdCloseModal">&times;</button>
                </div>
                <div class="pd-modal-body">
                    <div class="pd-receipt-banner">
                        <div>
                            <strong style="font-size: 16px;" class="text-blue">${esc(d.deposit_number)}</strong>
                            <div class="pd-meta-sub">Official Receipt: <strong>${esc(d.receipt_number)}</strong> · Date: ${esc(d.deposit_date ? d.deposit_date.slice(0, 16) : '')}</div>
                            <div class="pd-meta-sub">Cashier: ${esc(d.cashier_name)}</div>
                        </div>
                        <div class="text-right">
                            <div class="pd-meta-label">Remaining Balance</div>
                            <strong style="font-size: 20px;" class="${parseFloat(d.remaining_balance) > 0 ? 'text-emerald' : 'text-gray'}">${cur(d.remaining_balance)}</strong>
                            <div class="pd-meta-sub">Initial: ${cur(d.initial_deposit_amount)}</div>
                        </div>
                    </div>

                    <div class="cd-grid-2">
                        <div>
                            <strong>Patient:</strong> ${esc(d.patient_name)} (${esc(d.patient_no || 'MRN-N/A')})<br>
                            <strong>Deposit Type:</strong> ${esc(formatDepositType(d.deposit_type))}<br>
                            <strong>Payment Method:</strong> ${esc(d.payment_method.toUpperCase())} ${d.reference_no ? `(Ref# ${esc(d.reference_no)})` : ''}<br>
                        </div>
                        <div>
                            <strong>Admission #:</strong> ${d.admission_number ? esc(d.admission_number) : 'N/A'}<br>
                            <strong>Linked Folio:</strong> ${d.folio_number ? esc(d.folio_number) : 'N/A'}<br>
                            <strong>Status:</strong> ${esc(d.status.toUpperCase())}<br>
                        </div>
                    </div>

                    <hr class="cd-divider">

                    <h4>Drawdown Deductions against Folios (${drawdowns.length})</h4>
                    ${drawdowns.length === 0 ? `
                        <div class="cd-empty-state">No drawdowns recorded against this deposit yet.</div>
                    ` : `
                        <table class="pd-table">
                            <thead>
                                <tr>
                                    <th>Voucher #</th>
                                    <th>Date</th>
                                    <th>Folio</th>
                                    <th class="text-right">Previous Bal</th>
                                    <th class="text-right">Amount Drawn</th>
                                    <th class="text-right">New Bal</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${drawdowns.map(drw => `
                                    <tr>
                                        <td><strong>${esc(drw.drawdown_number)}</strong></td>
                                        <td>${esc(drw.drawdown_date ? drw.drawdown_date.slice(0, 16) : '')}</td>
                                        <td><span class="pd-badge pd-badge-info">${esc(drw.folio_number || 'Folio #' + drw.folio_id)}</span></td>
                                        <td class="text-right">${cur(drw.previous_deposit_balance)}</td>
                                        <td class="text-right font-bold text-blue">${cur(drw.amount_drawn)}</td>
                                        <td class="text-right">${cur(drw.new_deposit_balance)}</td>
                                        <td>${esc(drw.notes || '')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}

                    <hr class="cd-divider">

                    <h4>Discharge Refunds Disbursed (${refunds.length})</h4>
                    ${refunds.length === 0 ? `
                        <div class="cd-empty-state">No refunds disbursed.</div>
                    ` : `
                        <table class="pd-table">
                            <thead>
                                <tr>
                                    <th>Refund Voucher #</th>
                                    <th>Date</th>
                                    <th>Method</th>
                                    <th>Recipient</th>
                                    <th class="text-right">Refund Amount</th>
                                    <th>Reason / Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${refunds.map(rf => `
                                    <tr>
                                        <td><strong>${esc(rf.refund_number)}</strong></td>
                                        <td>${esc(rf.refund_date ? rf.refund_date.slice(0, 16) : '')}</td>
                                        <td><span class="pd-badge pd-badge-secondary">${esc(rf.refund_method.toUpperCase())}</span></td>
                                        <td><strong>${esc(rf.recipient_name)}</strong></td>
                                        <td class="text-right font-bold text-rose">${cur(rf.refund_amount)}</td>
                                        <td>${esc(rf.refund_reason)} ${rf.notes ? `(${esc(rf.notes)})` : ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#pdCloseModal")?.addEventListener("click", closeModal);
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function formatDepositType(t) {
    const map = {
        'inpatient_admission': 'Inpatient Admission',
        'elective_surgery': 'Elective Surgery',
        'maternity_package': 'Maternity Delivery',
        'icu_reservation': 'ICU Reservation',
        'general_prepayment': 'General Prepayment'
    };
    return map[t] || t;
}

// -------------------------------------------------------------
// CSS INJECTION
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("patientDepositsStyles")) return;
    const style = document.createElement("style");
    style.id = "patientDepositsStyles";
    style.textContent = `
        .pd-root {
            width: 100%;
            min-height: 100vh;
            background: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            padding: 20px 24px 60px;
            box-sizing: border-box;
        }

        .pd-container { max-width: 1400px; margin: 0 auto; }

        .pd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .pd-title { font-size: 24px; font-weight: 700; margin: 0; }
        .pd-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        .pd-nav-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* Stats Grid */
        .pd-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .pd-stat-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .pd-stat-label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .pd-stat-val { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
        .pd-stat-sub { font-size: 11.5px; color: #94a3b8; }

        /* Filter Toolbar */
        .pd-filter-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .pd-search-box {
            position: relative;
            flex: 1;
            min-width: 280px;
            max-width: 460px;
        }

        .pd-search-box svg {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: #94a3b8;
        }

        .pd-search-box input {
            width: 100%;
            padding: 8px 12px 8px 34px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }

        .pd-clear-btn {
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

        .pd-filter-group { display: flex; gap: 8px; flex-wrap: wrap; }

        /* Table */
        .pd-table-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .pd-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .pd-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 11.5px;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
        }

        .pd-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .pd-table tbody tr:hover { background: #f8fafc; }

        .pd-meta-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }

        /* Badges */
        .pd-badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 4px;
        }

        .pd-badge-info { background: #dbeafe; color: #1e40af; }
        .pd-badge-warning { background: #fef3c7; color: #92400e; }
        .pd-badge-danger { background: #fee2e2; color: #991b1b; }
        .pd-badge-success { background: #d1fae5; color: #065f46; }
        .pd-badge-secondary { background: #f1f5f9; color: #475569; }
        .pd-badge-neutral { background: #e2e8f0; color: #475569; }

        /* Buttons */
        .pd-btn {
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

        .pd-btn-primary { background: #2563eb; color: #fff; border-color: #1d4ed8; }
        .pd-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .pd-btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
        .pd-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
        .pd-btn-success { background: #059669; color: #fff; border-color: #047857; }
        .pd-btn-xs { padding: 3px 8px; font-size: 11px; }

        .pd-action-group { display: flex; gap: 4px; justify-content: center; }

        /* Form elements */
        .pd-form-group { margin-bottom: 12px; }
        .pd-form-group label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
        .pd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pd-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }
        .pd-input-sm { padding: 5px 10px; font-size: 12px; }

        /* Modals */
        .pd-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
        }

        .pd-modal {
            background: #fff;
            border-radius: 10px;
            width: 100%;
            max-width: 580px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
        }

        .pd-modal-header {
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .pd-modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
        .pd-modal-close { background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; }
        .pd-modal-body { padding: 20px; overflow-y: auto; }
        .pd-modal-footer {
            padding: 14px 20px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .pd-receipt-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 14px;
        }

        .pd-empty-box { text-align: center; padding: 40px 20px; color: #64748b; }
        .pd-empty-box svg { width: 44px; height: 44px; color: #94a3b8; margin-bottom: 10px; }
        .pd-empty-box h4 { margin: 0 0 4px; font-size: 16px; color: #1e293b; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-blue { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-gray { color: #64748b; }
        .font-bold { font-weight: 700; }
        .font-lg { font-size: 16px; }
    `;
    document.head.appendChild(style);
}
