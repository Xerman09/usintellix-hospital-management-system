import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "checkout", // "checkout" | "ledger" | "shift"
    patientSearch: "",
    selectedPatient: null,
    selectedFolio: null,
    billSource: "inpatient_folio", // "inpatient_folio" | "ambulatory_encounter" | "pharmacy" | "general_deposit"
    grossAmount: 0.00,
    discountAmount: 0.00,
    discountType: "",
    netAmount: 0.00,
    taxType: "vat_exempt",
    taxIdNumber: "",
    businessName: "",
    businessAddress: "",
    terminalId: "POS-TERM-01",
    tenders: [
        {
            id: 1,
            payment_method: "cash",
            amount_applied: 0.00,
            amount_tendered: 0.00,
            card_brand: "Visa",
            card_last_four: "",
            terminal_reference: "",
            terminal_device: "BDO POS Terminal 01",
            check_number: "",
            check_bank: "",
            check_date: new Date().toISOString().slice(0, 10),
            guarantor_name: "",
            loa_reference: "",
            online_transfer_ref: "",
            notes: ""
        }
    ],
    // Ledger filters
    ledgerPage: 1,
    ledgerPerPage: 15,
    ledgerStatus: "all",
    ledgerMethod: "all",
    ledgerSearch: "",
    // Shift report
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftTerminal: ""
};

let cache = {
    patients: [],
    billableFolios: [],
    transactionsData: null,
    shiftSummary: null,
    lastReceipt: null
};

export function SplitCashieringView() {
    return `<div class="sc-root" id="splitCashieringRoot"><div class="sc-loading">Loading Split-Tender Cashiering…</div></div>`;
}

export async function initSplitCashiering(initialOptions = {}) {
    ensureCss();
    if (initialOptions.folio) {
        state.selectedFolio = initialOptions.folio;
        state.billSource = "inpatient_folio";
        state.netAmount = Number(initialOptions.folio.balance_due || initialOptions.folio.net_amount || 0);
        state.grossAmount = state.netAmount;
        if (state.tenders[0]) {
            state.tenders[0].amount_applied = state.netAmount;
            state.tenders[0].amount_tendered = state.netAmount;
        }
    }
    await loadData();
}

async function loadData() {
    const root = document.getElementById("splitCashieringRoot");
    if (!root) return;

    try {
        if (state.view === "checkout") {
            const [folRes, patRes] = await Promise.all([
                api("/cashier/billable-entities").catch(() => null),
                api("/patients?limit=50").catch(() => null)
            ]);

            cache.billableFolios = folRes?.data?.folios || [];
            cache.patients = patRes?.data?.data || patRes?.data || [];
            renderCheckoutView(root);
        } else if (state.view === "ledger") {
            const params = new URLSearchParams({
                page: state.ledgerPage,
                per_page: state.ledgerPerPage,
                status: state.ledgerStatus,
                payment_method: state.ledgerMethod,
                q: state.ledgerSearch
            });
            const res = await api(`/cashier/transactions?${params.toString()}`);
            if (res?.success) {
                cache.transactionsData = res.data;
                renderLedgerView(root);
            } else {
                root.innerHTML = `<div class="sc-error">${esc(res?.message || "Failed to load transactions")}</div>`;
            }
        } else if (state.view === "shift") {
            const params = new URLSearchParams({
                date: state.shiftDate,
                terminal_id: state.shiftTerminal
            });
            const res = await api(`/cashier/shift-summary?${params.toString()}`);
            if (res?.success) {
                cache.shiftSummary = res.data;
                renderShiftView(root);
            } else {
                root.innerHTML = `<div class="sc-error">${esc(res?.message || "Failed to load shift balancing report")}</div>`;
            }
        }
    } catch (e) {
        console.error("Split cashiering load error:", e);
        root.innerHTML = `<div class="sc-error">Error connecting to cashiering server: ${esc(e.message)}</div>`;
    }
}

// -------------------------------------------------------------
// RENDER: SPLIT-TENDER CHECKOUT VIEW
// -------------------------------------------------------------
function renderCheckoutView(root) {
    const totalApplied = state.tenders.reduce((sum, t) => sum + (parseFloat(t.amount_applied) || 0), 0);
    const totalTendered = state.tenders.reduce((sum, t) => {
        const m = t.payment_method;
        const app = parseFloat(t.amount_applied) || 0;
        const ten = parseFloat(t.amount_tendered) || app;
        return sum + (m === 'cash' ? ten : app);
    }, 0);

    const cashTenders = state.tenders.filter(t => t.payment_method === 'cash');
    const cashApplied = cashTenders.reduce((sum, t) => sum + (parseFloat(t.amount_applied) || 0), 0);
    const cashTendered = cashTenders.reduce((sum, t) => sum + (parseFloat(t.amount_tendered) || 0), 0);
    const changeDue = Math.max(0, round2(cashTendered - cashApplied));

    const remainingToPay = round2(state.netAmount - totalApplied);
    const isExact = Math.abs(remainingToPay) <= 0.05;
    const isUnderpaid = remainingToPay > 0.05;
    const isOverpaid = remainingToPay < -0.05;

    root.innerHTML = `
        <div class="sc-container">
            <!-- Top Navigation Bar -->
            <div class="sc-header">
                <div>
                    <h1 class="sc-title">Split-Tender Cashiering</h1>
                    <p class="sc-subtitle">Multi-Method Settlement (Cash + Card + HMO LOA + Check), Change Calculator &amp; Official Tax Receipts</p>
                </div>
                <div class="sc-nav-pills">
                    <button class="sc-pill-btn active" id="scNavCheckout">💳 POS Terminal</button>
                    <button class="sc-pill-btn" id="scNavLedger">📋 Receipts Ledger</button>
                    <button class="sc-pill-btn" id="scNavShift">📊 Shift Balancing / Z-Read</button>
                </div>
            </div>

            <!-- Main Checkout Layout (2 Columns) -->
            <div class="sc-pos-grid">
                <!-- Left Column: Bill Information & Account Selection -->
                <div class="sc-panel">
                    <div class="sc-panel-header">
                        <h3>1. Account &amp; Billing Details</h3>
                        <span class="sc-badge-terminal">${esc(state.terminalId)}</span>
                    </div>
                    <div class="sc-panel-body">
                        <!-- Bill Source Selector -->
                        <div class="sc-form-group">
                            <label>Payment Source / Category</label>
                            <select id="scBillSource" class="sc-input">
                                <option value="inpatient_folio" ${state.billSource === 'inpatient_folio' ? 'selected' : ''}>Inpatient Master Folio</option>
                                <option value="ambulatory_encounter" ${state.billSource === 'ambulatory_encounter' ? 'selected' : ''}>Ambulatory Visit / Clinic Fee Sheet</option>
                                <option value="pharmacy" ${state.billSource === 'pharmacy' ? 'selected' : ''}>Pharmacy Outpatient Dispense</option>
                                <option value="laboratory" ${state.billSource === 'laboratory' ? 'selected' : ''}>Diagnostic Lab Walk-in</option>
                                <option value="radiology" ${state.billSource === 'radiology' ? 'selected' : ''}>Radiology Imaging Walk-in</option>
                                <option value="general_deposit" ${state.billSource === 'general_deposit' ? 'selected' : ''}>Patient General Deposit / Prepayment</option>
                            </select>
                        </div>

                        <!-- Inpatient Folio Selection (if applicable) -->
                        <div class="sc-form-group" id="scFolioGroup">
                            <label>Select Inpatient Admission Folio</label>
                            <select id="scSelectFolio" class="sc-input">
                                <option value="">-- Choose Active Inpatient Folio --</option>
                                ${cache.billableFolios.map(f => `
                                    <option value="${f.id}" data-net="${f.balance_due}" data-patient="${f.patient_id}" data-name="${esc(f.first_name + ' ' + f.last_name)}" ${state.selectedFolio?.id == f.id ? 'selected' : ''}>
                                        ${esc(f.folio_number)} · ${esc(f.first_name + ' ' + f.last_name)} (${esc(f.patient_no)}) · Bal: ${cur(f.balance_due)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Patient Selection -->
                        <div class="sc-form-group">
                            <label>Patient Name &amp; MRN <span class="text-rose">*</span></label>
                            <select id="scSelectPatient" class="sc-input" required>
                                <option value="">-- Select Patient Record --</option>
                                ${cache.patients.map(p => `
                                    <option value="${p.id}" ${state.selectedPatient?.id == p.id ? 'selected' : ''}>
                                        ${esc(p.first_name + ' ' + p.last_name)} (${esc(p.patient_no)}) · DOB: ${esc(p.birthdate || 'N/A')}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Amounts Breakdown -->
                        <div class="sc-form-row">
                            <div class="sc-form-group">
                                <label>Gross Hospital Charges ($)</label>
                                <input type="number" id="scGrossInput" class="sc-input" value="${state.grossAmount || 0}" min="0" step="0.01">
                            </div>
                            <div class="sc-form-group">
                                <label>Discounts (Senior / PWD 20%)</label>
                                <input type="number" id="scDiscountInput" class="sc-input" value="${state.discountAmount || 0}" min="0" step="0.01">
                            </div>
                        </div>

                        <div class="sc-form-group">
                            <label>Net Amount Payable ($) <span class="text-rose">*</span></label>
                            <input type="number" id="scNetInput" class="sc-input sc-input-lg font-bold text-blue" value="${state.netAmount || 0}" min="0.01" step="0.01" required>
                            <div class="sc-meta-sub">This is the net balance that must be covered by payment tenders</div>
                        </div>

                        <hr class="sc-divider">

                        <!-- Tax & BIR Regulatory Details -->
                        <h4>Tax Exemption &amp; Official Receipt Compliance</h4>
                        <div class="sc-form-row">
                            <div class="sc-form-group">
                                <label>Tax Type</label>
                                <select id="scTaxType" class="sc-input">
                                    <option value="vat_exempt" ${state.taxType === 'vat_exempt' ? 'selected' : ''}>VAT Exempt (Medical Healthcare / Senior / PWD)</option>
                                    <option value="vatable" ${state.taxType === 'vatable' ? 'selected' : ''}>VATable Sales (12% VAT Applied)</option>
                                    <option value="zero_rated" ${state.taxType === 'zero_rated' ? 'selected' : ''}>Zero-Rated Sales (Government / Diplomats)</option>
                                </select>
                            </div>
                            <div class="sc-form-group">
                                <label>Taxpayer ID (TIN)</label>
                                <input type="text" id="scTaxIdInput" class="sc-input" placeholder="000-000-000-000" value="${esc(state.taxIdNumber)}">
                            </div>
                        </div>

                        <div class="sc-form-group">
                            <label>Corporate / Guarantor Billed To (Optional)</label>
                            <input type="text" id="scBusinessNameInput" class="sc-input" placeholder="Company or HMO Name for Official Receipt" value="${esc(state.businessName)}">
                        </div>
                    </div>
                </div>

                <!-- Right Column: Split Tender Builder & Change Computation -->
                <div class="sc-panel">
                    <div class="sc-panel-header">
                        <h3>2. Multi-Tender Payment Splits</h3>
                        <button class="sc-btn sc-btn-secondary sc-btn-sm" id="scBtnAddTender">
                            + Add Tender Split
                        </button>
                    </div>

                    <!-- Financial Balance Banner -->
                    <div class="sc-balance-banner">
                        <div class="sc-bal-item">
                            <span class="sc-bal-lbl">Net Bill</span>
                            <span class="sc-bal-val">${cur(state.netAmount)}</span>
                        </div>
                        <div class="sc-bal-item">
                            <span class="sc-bal-lbl">Tenders Applied</span>
                            <span class="sc-bal-val text-blue">${cur(totalApplied)}</span>
                        </div>
                        <div class="sc-bal-item">
                            <span class="sc-bal-lbl">Cash Tendered</span>
                            <span class="sc-bal-val text-emerald">${cur(cashTendered)}</span>
                        </div>
                        <div class="sc-bal-item highlight ${changeDue > 0 ? 'change' : ''}">
                            <span class="sc-bal-lbl">CHANGE DUE</span>
                            <span class="sc-bal-val">${cur(changeDue)}</span>
                        </div>
                    </div>

                    <!-- Tender Status Alert Pill -->
                    <div class="sc-status-pill ${isExact ? 'exact' : (isUnderpaid ? 'underpaid' : 'overpaid')}">
                        ${isExact ? `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span><strong>Payment Balanced:</strong> Total tenders match the net hospital bill ($0.00 balance).</span>
                        ` : (isUnderpaid ? `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <span><strong>Shortage:</strong> Additional <strong>${cur(remainingToPay)}</strong> required to settle bill.</span>
                        ` : `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                            <span><strong>Over-tendered:</strong> Non-cash tenders exceed bill by ${cur(Math.abs(remainingToPay))}. Adjust applied amounts.</span>
                        `)}
                    </div>

                    <!-- Split Tenders List -->
                    <div class="sc-panel-body sc-tenders-list">
                        ${state.tenders.map((tender, index) => renderTenderRow(tender, index, state.tenders.length, remainingToPay)).join('')}
                    </div>

                    <!-- Cashier Action Controls -->
                    <div class="sc-panel-footer">
                        <button class="sc-btn sc-btn-secondary" id="scBtnFillRemaining" ${remainingToPay <= 0 ? 'disabled' : ''}>
                            ⚡ Fill Remaining (${cur(Math.max(0, remainingToPay))})
                        </button>
                        <button class="sc-btn sc-btn-primary sc-btn-lg" id="scBtnProcessPayment" ${!isExact ? 'disabled' : ''}>
                            💰 Process Split Settlement &amp; Issue Receipt
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div id="scModalContainer"></div>
    `;

    bindCheckoutEvents(root, remainingToPay);
}

// -------------------------------------------------------------
// RENDER: INDIVIDUAL TENDER ROW
// -------------------------------------------------------------
function renderTenderRow(tender, index, totalRows, remaining) {
    const isCash = tender.payment_method === 'cash';
    const isCard = tender.payment_method === 'credit_card' || tender.payment_method === 'debit_card';
    const isHmo = tender.payment_method === 'insurance_guarantee_letter';
    const isCheck = tender.payment_method === 'check';
    const isDigital = tender.payment_method === 'gcash_maya' || tender.payment_method === 'bank_transfer';

    const change = isCash ? Math.max(0, round2((parseFloat(tender.amount_tendered) || 0) - (parseFloat(tender.amount_applied) || 0))) : 0;

    return `
        <div class="sc-tender-card" data-index="${index}">
            <div class="sc-tender-head">
                <div class="sc-tender-title">
                    <span class="sc-tender-num">Tender #${index + 1}</span>
                    <select class="sc-input sc-input-sm scTenderMethod" data-index="${index}">
                        <option value="cash" ${tender.payment_method === 'cash' ? 'selected' : ''}>💵 Cash (Counter Tender)</option>
                        <option value="credit_card" ${tender.payment_method === 'credit_card' ? 'selected' : ''}>💳 Credit Card (POS Terminal)</option>
                        <option value="debit_card" ${tender.payment_method === 'debit_card' ? 'selected' : ''}>💳 Debit Card</option>
                        <option value="insurance_guarantee_letter" ${tender.payment_method === 'insurance_guarantee_letter' ? 'selected' : ''}>🏢 HMO / Insurance Guarantee (LOA)</option>
                        <option value="gcash_maya" ${tender.payment_method === 'gcash_maya' ? 'selected' : ''}>📱 GCash / Maya / QRPh</option>
                        <option value="bank_transfer" ${tender.payment_method === 'bank_transfer' ? 'selected' : ''}>🏦 Bank Wire / Online Transfer</option>
                        <option value="check" ${tender.payment_method === 'check' ? 'selected' : ''}>🧾 Manager Check / Cheque</option>
                    </select>
                </div>
                ${totalRows > 1 ? `
                    <button class="sc-icon-btn scBtnRemoveTender" data-index="${index}" title="Remove tender split">
                        &times;
                    </button>
                ` : ''}
            </div>

            <div class="sc-tender-body">
                <div class="sc-form-row">
                    <div class="sc-form-group">
                        <label>Amount Applied to Bill ($) <span class="text-rose">*</span></label>
                        <input type="number" class="sc-input font-bold scTenderApplied" data-index="${index}" value="${tender.amount_applied || 0}" min="0.01" step="0.01">
                    </div>

                    ${isCash ? `
                        <div class="sc-form-group">
                            <label>Cash Tendered by Payer ($)</label>
                            <input type="number" class="sc-input scTenderTendered text-emerald font-bold" data-index="${index}" value="${tender.amount_tendered || tender.amount_applied || 0}" min="0.01" step="0.01">
                            ${change > 0 ? `<div class="sc-change-pill">Change: ${cur(change)}</div>` : ''}
                        </div>
                    ` : `
                        <div class="sc-form-group">
                            <label>Payment Channel / Device</label>
                            <input type="text" class="sc-input scTenderDevice" data-index="${index}" placeholder="${isCard ? 'BDO POS Station 01' : (isDigital ? 'GCash QR Terminal' : 'Bank Desk')}" value="${esc(tender.terminal_device || '')}">
                        </div>
                    `}
                </div>

                <!-- Conditional Method Fields -->
                ${isCard ? `
                    <div class="sc-form-row">
                        <div class="sc-form-group">
                            <label>Card Brand &amp; Last 4</label>
                            <div class="sc-split-inputs">
                                <select class="sc-input scTenderBrand" data-index="${index}">
                                    <option value="Visa" ${tender.card_brand === 'Visa' ? 'selected' : ''}>Visa</option>
                                    <option value="Mastercard" ${tender.card_brand === 'Mastercard' ? 'selected' : ''}>Mastercard</option>
                                    <option value="Amex" ${tender.card_brand === 'Amex' ? 'selected' : ''}>American Express</option>
                                    <option value="JCB" ${tender.card_brand === 'JCB' ? 'selected' : ''}>JCB</option>
                                </select>
                                <input type="text" class="sc-input scTenderLast4" data-index="${index}" maxlength="4" placeholder="Last 4" value="${esc(tender.card_last_four || '')}">
                            </div>
                        </div>
                        <div class="sc-form-group">
                            <label>POS Approval Code / Trace # <span class="text-rose">*</span></label>
                            <input type="text" class="sc-input scTenderRef" data-index="${index}" placeholder="e.g. AUTH-882910" value="${esc(tender.terminal_reference || '')}" required>
                        </div>
                    </div>
                ` : ''}

                ${isHmo ? `
                    <div class="sc-form-row">
                        <div class="sc-form-group">
                            <label>Guarantor HMO / Insurance Company <span class="text-rose">*</span></label>
                            <input type="text" class="sc-input scTenderGuarantor" data-index="${index}" placeholder="e.g. Maxicare, Intellicare, PhilHealth" value="${esc(tender.guarantor_name || '')}" required>
                        </div>
                        <div class="sc-form-group">
                            <label>LOA / Guarantee Approval Reference # <span class="text-rose">*</span></label>
                            <input type="text" class="sc-input scTenderLoa" data-index="${index}" placeholder="e.g. LOA-2026-99120" value="${esc(tender.loa_reference || '')}" required>
                        </div>
                    </div>
                ` : ''}

                ${isCheck ? `
                    <div class="sc-form-row">
                        <div class="sc-form-group">
                            <label>Check Number &amp; Bank Name</label>
                            <div class="sc-split-inputs">
                                <input type="text" class="sc-input scTenderChkNum" data-index="${index}" placeholder="Check #" value="${esc(tender.check_number || '')}">
                                <input type="text" class="sc-input scTenderChkBank" data-index="${index}" placeholder="Bank Name" value="${esc(tender.check_bank || '')}">
                            </div>
                        </div>
                        <div class="sc-form-group">
                            <label>Check Date</label>
                            <input type="date" class="sc-input scTenderChkDate" data-index="${index}" value="${esc(tender.check_date || '')}">
                        </div>
                    </div>
                ` : ''}

                ${isDigital ? `
                    <div class="sc-form-group">
                        <label>E-Wallet / Wire Reference #</label>
                        <input type="text" class="sc-input scTenderRef" data-index="${index}" placeholder="e.g. GCASH-192837482" value="${esc(tender.terminal_reference || tender.online_transfer_ref || '')}">
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// RENDER: TRANSACTIONS & RECEIPTS LEDGER
// -------------------------------------------------------------
function renderLedgerView(root) {
    const data = cache.transactionsData || { items: [], total: 0 };
    const items = data.items || [];

    root.innerHTML = `
        <div class="sc-container">
            <div class="sc-header">
                <div>
                    <h1 class="sc-title">Cashier Receipts Ledger</h1>
                    <p class="sc-subtitle">Official Receipts History, Split-Tender Breakdowns, Reprinting &amp; Transaction Audits</p>
                </div>
                <div class="sc-nav-pills">
                    <button class="sc-pill-btn" id="scNavCheckout">💳 POS Terminal</button>
                    <button class="sc-pill-btn active" id="scNavLedger">📋 Receipts Ledger</button>
                    <button class="sc-pill-btn" id="scNavShift">📊 Shift Balancing / Z-Read</button>
                </div>
            </div>

            <!-- Search and Filter Bar -->
            <div class="sc-filter-bar">
                <div class="sc-search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="scLedgerSearchInput" placeholder="Search receipt #, patient, card auth, check #, HMO LOA..." value="${esc(state.ledgerSearch)}">
                </div>
                <div class="sc-filter-group">
                    <select id="scLedgerStatusSelect" class="sc-input sc-input-sm">
                        <option value="all" ${state.ledgerStatus === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="completed" ${state.ledgerStatus === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="voided" ${state.ledgerStatus === 'voided' ? 'selected' : ''}>Voided</option>
                    </select>
                    <select id="scLedgerMethodSelect" class="sc-input sc-input-sm">
                        <option value="all" ${state.ledgerMethod === 'all' ? 'selected' : ''}>All Payment Methods</option>
                        <option value="cash" ${state.ledgerMethod === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="credit_card" ${state.ledgerMethod === 'credit_card' ? 'selected' : ''}>Credit Card</option>
                        <option value="insurance_guarantee_letter" ${state.ledgerMethod === 'insurance_guarantee_letter' ? 'selected' : ''}>HMO Guarantee (LOA)</option>
                        <option value="gcash_maya" ${state.ledgerMethod === 'gcash_maya' ? 'selected' : ''}>GCash / Maya</option>
                        <option value="check" ${state.ledgerMethod === 'check' ? 'selected' : ''}>Check</option>
                    </select>
                </div>
            </div>

            <!-- Ledger Table -->
            <div class="sc-table-card">
                <table class="sc-table">
                    <thead>
                        <tr>
                            <th>Official Receipt (OR)</th>
                            <th>Date &amp; Cashier</th>
                            <th>Patient / Payer</th>
                            <th>Source / Folio</th>
                            <th class="text-right">Net Bill</th>
                            <th class="text-right">Tendered</th>
                            <th class="text-right">Change</th>
                            <th>Split-Tender Breakdown</th>
                            <th>Status</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? `
                            <tr><td colspan="10" class="sc-no-data">No transactions match your search criteria.</td></tr>
                        ` : items.map(t => {
                            const isVoided = t.status === 'voided';
                            return `
                                <tr class="${isVoided ? 'sc-row-voided' : ''}">
                                    <td>
                                        <strong class="text-blue">${esc(t.receipt_number)}</strong>
                                        <div class="sc-meta-sub">${esc(t.transaction_number)}</div>
                                    </td>
                                    <td>
                                        <div>${esc(t.created_at ? t.created_at.slice(0, 16) : '')}</div>
                                        <div class="sc-meta-sub">${esc(t.cashier_name)} (${esc(t.terminal_id)})</div>
                                    </td>
                                    <td>
                                        <strong>${esc(t.patient_name)}</strong>
                                        <div class="sc-meta-sub">${esc(t.patient_no || 'MRN-N/A')}</div>
                                    </td>
                                    <td>
                                        ${t.folio_number ? `<span class="sc-badge sc-badge-info">${esc(t.folio_number)}</span>` : `<span class="sc-badge sc-badge-secondary">${esc(t.source_type)}</span>`}
                                    </td>
                                    <td class="text-right font-semibold">${cur(t.net_amount)}</td>
                                    <td class="text-right text-emerald font-semibold">${cur(t.total_tendered)}</td>
                                    <td class="text-right">${Number(t.change_due) > 0 ? `<span class="text-rose font-semibold">${cur(t.change_due)}</span>` : '$0.00'}</td>
                                    <td>
                                        <div class="sc-tenders-chip-list">
                                            ${(t.tenders || []).map(st => `
                                                <span class="sc-tender-chip ${st.payment_method}">
                                                    ${formatMethodName(st.payment_method)}: ${cur(st.amount_applied)}
                                                    ${st.terminal_reference ? `(Ref# ${esc(st.terminal_reference)})` : ''}
                                                    ${st.loa_reference ? `(LOA# ${esc(st.loa_reference)})` : ''}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="sc-badge ${isVoided ? 'sc-badge-danger' : 'sc-badge-success'}">
                                            ${isVoided ? 'VOIDED' : 'COMPLETED'}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <div class="sc-action-btns">
                                            <button class="sc-btn sc-btn-secondary sc-btn-xs scBtnPrintReceipt" data-id="${t.id}" title="Reprint Official Tax Receipt">
                                                🖨️ Receipt
                                            </button>
                                            ${!isVoided ? `
                                                <button class="sc-btn sc-btn-danger sc-btn-xs scBtnVoidTxn" data-id="${t.id}" title="Void transaction">
                                                    Void
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

        <div id="scModalContainer"></div>
    `;

    bindLedgerEvents(root);
}

// -------------------------------------------------------------
// RENDER: SHIFT BALANCING / Z-READ REPORT
// -------------------------------------------------------------
function renderShiftView(root) {
    const s = cache.shiftSummary || {};
    const byMethod = s.by_method || [];

    root.innerHTML = `
        <div class="sc-container">
            <div class="sc-header">
                <div>
                    <h1 class="sc-title">Cashier Shift Balancing &amp; Z-Reading</h1>
                    <p class="sc-subtitle">Daily Register Totals, Drawer Cash Reconciliation, Card Terminal Batches &amp; Tax Summary</p>
                </div>
                <div class="sc-nav-pills">
                    <button class="sc-pill-btn" id="scNavCheckout">💳 POS Terminal</button>
                    <button class="sc-pill-btn" id="scNavLedger">📋 Receipts Ledger</button>
                    <button class="sc-pill-btn active" id="scNavShift">📊 Shift Balancing / Z-Read</button>
                </div>
            </div>

            <!-- Date & Terminal Filter Bar -->
            <div class="sc-filter-bar">
                <div class="sc-shift-filter-row">
                    <div>
                        <label>Shift Date:</label>
                        <input type="date" id="scShiftDateInput" class="sc-input sc-input-sm" value="${esc(state.shiftDate)}">
                    </div>
                    <div>
                        <label>POS Station:</label>
                        <select id="scShiftTerminalSelect" class="sc-input sc-input-sm">
                            <option value="">All POS Stations</option>
                            <option value="POS-TERM-01" ${state.shiftTerminal === 'POS-TERM-01' ? 'selected' : ''}>POS-TERM-01 (Main Cashier)</option>
                            <option value="POS-TERM-02" ${state.shiftTerminal === 'POS-TERM-02' ? 'selected' : ''}>POS-TERM-02 (ER Cashier)</option>
                            <option value="POS-TERM-03" ${state.shiftTerminal === 'POS-TERM-03' ? 'selected' : ''}>POS-TERM-03 (OPD Cashier)</option>
                        </select>
                    </div>
                    <button class="sc-btn sc-btn-secondary sc-btn-sm" id="scBtnRefreshShift">
                        Refresh Report
                    </button>
                    <button class="sc-btn sc-btn-primary sc-btn-sm" id="scBtnPrintShiftReport">
                        🖨️ Print Z-Reading Report
                    </button>
                </div>
            </div>

            <!-- Summary KPI Cards -->
            <div class="sc-stats-grid">
                <div class="sc-stat-card">
                    <div class="sc-stat-label">Total Transactions</div>
                    <div class="sc-stat-val text-blue">${s.total_transactions || 0}</div>
                    <div class="sc-stat-sub">Completed receipts</div>
                </div>
                <div class="sc-stat-card">
                    <div class="sc-stat-label">Total Net Collections</div>
                    <div class="sc-stat-val text-emerald">${cur(s.total_applied)}</div>
                    <div class="sc-stat-sub">Across all payment channels</div>
                </div>
                <div class="sc-stat-card">
                    <div class="sc-stat-label">Change Dispensed</div>
                    <div class="sc-stat-val text-rose">${cur(s.total_change_dispensed)}</div>
                    <div class="sc-stat-sub">From cash drawers</div>
                </div>
                <div class="sc-stat-card">
                    <div class="sc-stat-label">VAT Exempt Healthcare</div>
                    <div class="sc-stat-val text-blue">${cur(s.total_vat_exempt)}</div>
                    <div class="sc-stat-sub">Sec. 109 Statutory Exempt</div>
                </div>
            </div>

            <!-- Tender Breakdown Table -->
            <div class="sc-table-card">
                <div class="sc-panel-header">
                    <h3>Collections by Payment Channel / Terminal</h3>
                </div>
                <table class="sc-table">
                    <thead>
                        <tr>
                            <th>Payment Channel / Tender Method</th>
                            <th class="text-right">Transaction Count</th>
                            <th class="text-right">Total Tendered Received</th>
                            <th class="text-right">Change Dispensed</th>
                            <th class="text-right">Net Credited Collections</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${byMethod.length === 0 ? `
                            <tr><td colspan="5" class="sc-no-data">No settled payments recorded on this shift date.</td></tr>
                        ` : byMethod.map(m => `
                            <tr>
                                <td>
                                    <strong>${formatMethodName(m.payment_method)}</strong>
                                </td>
                                <td class="text-right">${m.tender_count}</td>
                                <td class="text-right text-emerald font-semibold">${cur(m.total_tendered)}</td>
                                <td class="text-right text-muted">${cur(m.total_change)}</td>
                                <td class="text-right font-bold text-blue">${cur(m.total_applied)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="sc-table-total-row">
                            <td><strong>TOTAL SHIFT COLLECTIONS</strong></td>
                            <td class="text-right"><strong>${s.total_transactions || 0}</strong></td>
                            <td class="text-right text-emerald font-bold">${cur(s.total_tendered)}</td>
                            <td class="text-right text-muted font-bold">${cur(s.total_change_dispensed)}</td>
                            <td class="text-right text-blue font-bold">${cur(s.total_applied)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div id="scModalContainer"></div>
    `;

    bindShiftEvents(root);
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindCheckoutEvents(root, remaining) {
    // Navigation pills
    root.querySelector("#scNavLedger")?.addEventListener("click", () => {
        state.view = "ledger";
        loadData();
    });
    root.querySelector("#scNavShift")?.addEventListener("click", () => {
        state.view = "shift";
        loadData();
    });

    // Bill Source
    root.querySelector("#scBillSource")?.addEventListener("change", (e) => {
        state.billSource = e.target.value;
        const folioGroup = root.querySelector("#scFolioGroup");
        if (folioGroup) {
            folioGroup.style.display = state.billSource === 'inpatient_folio' ? 'block' : 'none';
        }
    });

    // Folio Selector
    root.querySelector("#scSelectFolio")?.addEventListener("change", (e) => {
        const sel = e.target;
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value) {
            const net = parseFloat(opt.getAttribute("data-net")) || 0;
            const patId = opt.getAttribute("data-patient");
            state.netAmount = net;
            state.grossAmount = net;
            state.selectedFolio = { id: opt.value, balance_due: net };
            
            // Set patient
            const patSelect = root.querySelector("#scSelectPatient");
            if (patSelect && patId) {
                patSelect.value = patId;
                state.selectedPatient = { id: patId };
            }

            // Sync tender 1
            if (state.tenders.length === 1) {
                state.tenders[0].amount_applied = net;
                state.tenders[0].amount_tendered = net;
            }
            renderCheckoutView(root);
        }
    });

    // Patient Selector
    root.querySelector("#scSelectPatient")?.addEventListener("change", (e) => {
        const patId = e.target.value;
        state.selectedPatient = cache.patients.find(p => p.id == patId) || { id: patId };
    });

    // Amounts
    root.querySelector("#scGrossInput")?.addEventListener("input", (e) => {
        state.grossAmount = parseFloat(e.target.value) || 0;
        state.netAmount = Math.max(0, round2(state.grossAmount - state.discountAmount));
        const netInput = root.querySelector("#scNetInput");
        if (netInput) netInput.value = state.netAmount;
        updateDynamicBalance(root);
    });

    root.querySelector("#scDiscountInput")?.addEventListener("input", (e) => {
        state.discountAmount = parseFloat(e.target.value) || 0;
        state.netAmount = Math.max(0, round2(state.grossAmount - state.discountAmount));
        const netInput = root.querySelector("#scNetInput");
        if (netInput) netInput.value = state.netAmount;
        updateDynamicBalance(root);
    });

    root.querySelector("#scNetInput")?.addEventListener("input", (e) => {
        state.netAmount = parseFloat(e.target.value) || 0;
        updateDynamicBalance(root);
    });

    // Tax Details
    root.querySelector("#scTaxType")?.addEventListener("change", (e) => {
        state.taxType = e.target.value;
    });
    root.querySelector("#scTaxIdInput")?.addEventListener("input", (e) => {
        state.taxIdNumber = e.target.value.trim();
    });
    root.querySelector("#scBusinessNameInput")?.addEventListener("input", (e) => {
        state.businessName = e.target.value.trim();
    });

    // Add Tender Split
    root.querySelector("#scBtnAddTender")?.addEventListener("click", () => {
        const nextMethod = state.tenders.some(t => t.payment_method === 'credit_card') ? 'insurance_guarantee_letter' : 'credit_card';
        const rem = Math.max(0, round2(state.netAmount - state.tenders.reduce((s, t) => s + (parseFloat(t.amount_applied) || 0), 0)));

        state.tenders.push({
            id: Date.now(),
            payment_method: nextMethod,
            amount_applied: rem,
            amount_tendered: rem,
            card_brand: "Visa",
            card_last_four: "",
            terminal_reference: "",
            terminal_device: "BDO POS Terminal 01",
            check_number: "",
            check_bank: "",
            check_date: new Date().toISOString().slice(0, 10),
            guarantor_name: "",
            loa_reference: "",
            notes: ""
        });
        renderCheckoutView(root);
    });

    // Fill Remaining Button
    root.querySelector("#scBtnFillRemaining")?.addEventListener("click", () => {
        const totalApp = state.tenders.reduce((s, t) => s + (parseFloat(t.amount_applied) || 0), 0);
        const rem = Math.max(0, round2(state.netAmount - totalApp));
        if (rem <= 0) return;

        state.tenders.push({
            id: Date.now(),
            payment_method: "cash",
            amount_applied: rem,
            amount_tendered: rem,
            card_brand: "Visa"
        });
        renderCheckoutView(root);
    });

    // Tender inputs handling
    root.querySelectorAll(".scTenderMethod").forEach(sel => {
        sel.addEventListener("change", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) {
                state.tenders[idx].payment_method = e.target.value;
                renderCheckoutView(root);
            }
        });
    });

    root.querySelectorAll(".scTenderApplied").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            const val = parseFloat(e.target.value) || 0;
            if (state.tenders[idx]) {
                state.tenders[idx].amount_applied = val;
                if (state.tenders[idx].payment_method !== 'cash') {
                    state.tenders[idx].amount_tendered = val;
                }
                updateDynamicBalance(root);
            }
        });
    });

    root.querySelectorAll(".scTenderTendered").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            const val = parseFloat(e.target.value) || 0;
            if (state.tenders[idx]) {
                state.tenders[idx].amount_tendered = val;
                updateDynamicBalance(root);
            }
        });
    });

    root.querySelectorAll(".scTenderBrand").forEach(sel => {
        sel.addEventListener("change", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) state.tenders[idx].card_brand = e.target.value;
        });
    });

    root.querySelectorAll(".scTenderLast4").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) state.tenders[idx].card_last_four = e.target.value;
        });
    });

    root.querySelectorAll(".scTenderRef").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) state.tenders[idx].terminal_reference = e.target.value;
        });
    });

    root.querySelectorAll(".scTenderGuarantor").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) state.tenders[idx].guarantor_name = e.target.value;
        });
    });

    root.querySelectorAll(".scTenderLoa").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"), 10);
            if (state.tenders[idx]) state.tenders[idx].loa_reference = e.target.value;
        });
    });

    root.querySelectorAll(".scBtnRemoveTender").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.getAttribute("data-index"), 10);
            if (state.tenders.length > 1) {
                state.tenders.splice(idx, 1);
                renderCheckoutView(root);
            }
        });
    });

    // Process Payment Button
    root.querySelector("#scBtnProcessPayment")?.addEventListener("click", async () => {
        await handleProcessPayment(root);
    });
}

function updateDynamicBalance(root) {
    const totalApplied = state.tenders.reduce((sum, t) => sum + (parseFloat(t.amount_applied) || 0), 0);
    const cashTenders = state.tenders.filter(t => t.payment_method === 'cash');
    const cashApplied = cashTenders.reduce((sum, t) => sum + (parseFloat(t.amount_applied) || 0), 0);
    const cashTendered = cashTenders.reduce((sum, t) => sum + (parseFloat(t.amount_tendered) || 0), 0);
    const changeDue = Math.max(0, round2(cashTendered - cashApplied));

    const remainingToPay = round2(state.netAmount - totalApplied);
    const isExact = Math.abs(remainingToPay) <= 0.05;

    // Update banner values
    const balVals = root.querySelectorAll(".sc-bal-val");
    if (balVals.length >= 4) {
        balVals[0].textContent = cur(state.netAmount);
        balVals[1].textContent = cur(totalApplied);
        balVals[2].textContent = cur(cashTendered);
        balVals[3].textContent = cur(changeDue);
    }

    // Enable/disable process button
    const procBtn = root.querySelector("#scBtnProcessPayment");
    if (procBtn) {
        procBtn.disabled = !isExact;
    }
}

async function handleProcessPayment(root) {
    const patSelect = root.querySelector("#scSelectPatient");
    const patId = patSelect ? patSelect.value : (state.selectedPatient?.id);

    if (!patId) {
        showToast("Please select a patient for this transaction.", "warning");
        return;
    }

    // Validate tenders
    for (let i = 0; i < state.tenders.length; i++) {
        const t = state.tenders[i];
        if (t.payment_method === 'credit_card' || t.payment_method === 'debit_card') {
            if (!t.terminal_reference) {
                showToast(`Tender #${i + 1}: POS Approval code is required for card payments.`, "warning");
                return;
            }
        } else if (t.payment_method === 'insurance_guarantee_letter') {
            if (!t.guarantor_name || !t.loa_reference) {
                showToast(`Tender #${i + 1}: Guarantor Name and LOA Reference are required for HMO split.`, "warning");
                return;
            }
        }
    }

    const payload = {
        patient_id: parseInt(patId, 10),
        folio_id: state.selectedFolio ? parseInt(state.selectedFolio.id, 10) : null,
        source_type: state.billSource,
        gross_amount: state.grossAmount,
        discount_amount: state.discountAmount,
        discount_type: state.discountType,
        net_amount: state.netAmount,
        tax_type: state.taxType,
        tax_id_number: state.taxIdNumber,
        business_name: state.businessName,
        terminal_id: state.terminalId,
        tenders: state.tenders
    };

    const submitBtn = root.querySelector("#scBtnProcessPayment");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Multi-Tender Settlement...";

    try {
        const res = await api("/cashier/transactions/checkout", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res?.success) {
            showToast("Transaction completed! Official Receipt generated.", "success");
            cache.lastReceipt = res.data;
            openReceiptPrintModal(res.data);
            
            // Reset checkout state
            state.grossAmount = 0.00;
            state.netAmount = 0.00;
            state.discountAmount = 0.00;
            state.selectedFolio = null;
            state.tenders = [
                {
                    id: 1,
                    payment_method: "cash",
                    amount_applied: 0.00,
                    amount_tendered: 0.00,
                    card_brand: "Visa"
                }
            ];
            await loadData();
        } else {
            showToast(res?.message || "Checkout failed", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "💰 Process Split Settlement & Issue Receipt";
        }
    } catch (e) {
        showToast(e.message, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "💰 Process Split Settlement & Issue Receipt";
    }
}

function bindLedgerEvents(root) {
    root.querySelector("#scNavCheckout")?.addEventListener("click", () => {
        state.view = "checkout";
        loadData();
    });
    root.querySelector("#scNavShift")?.addEventListener("click", () => {
        state.view = "shift";
        loadData();
    });

    const searchInput = root.querySelector("#scLedgerSearchInput");
    let searchTimeout = null;
    searchInput?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.ledgerSearch = e.target.value.trim();
            state.ledgerPage = 1;
            loadData();
        }, 350);
    });

    root.querySelector("#scLedgerStatusSelect")?.addEventListener("change", (e) => {
        state.ledgerStatus = e.target.value;
        state.ledgerPage = 1;
        loadData();
    });

    root.querySelector("#scLedgerMethodSelect")?.addEventListener("change", (e) => {
        state.ledgerMethod = e.target.value;
        state.ledgerPage = 1;
        loadData();
    });

    root.querySelectorAll(".scBtnPrintReceipt").forEach(btn => {
        btn.addEventListener("click", async () => {
            const txnId = btn.getAttribute("data-id");
            try {
                const res = await api(`/cashier/transactions/detail?id=${txnId}`);
                if (res?.success) {
                    openReceiptPrintModal(res.data);
                } else {
                    showToast(res?.message || "Failed to load receipt", "error");
                }
            } catch (e) {
                showToast(e.message, "error");
            }
        });
    });

    root.querySelectorAll(".scBtnVoidTxn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const txnId = btn.getAttribute("data-id");
            const reason = prompt("Enter mandatory audit reason for VOIDING this transaction:");
            if (reason === null) return;
            if (!reason.trim()) {
                showToast("Void reason is required.", "warning");
                return;
            }

            try {
                const res = await api("/cashier/transactions/void", {
                    method: "POST",
                    body: JSON.stringify({ transaction_id: txnId, reason: reason.trim() })
                });

                if (res?.success) {
                    showToast("Transaction voided and accounts reversed.", "success");
                    loadData();
                } else {
                    showToast(res?.message || "Void failed", "error");
                }
            } catch (e) {
                showToast(e.message, "error");
            }
        });
    });
}

function bindShiftEvents(root) {
    root.querySelector("#scNavCheckout")?.addEventListener("click", () => {
        state.view = "checkout";
        loadData();
    });
    root.querySelector("#scNavLedger")?.addEventListener("click", () => {
        state.view = "ledger";
        loadData();
    });

    root.querySelector("#scShiftDateInput")?.addEventListener("change", (e) => {
        state.shiftDate = e.target.value;
        loadData();
    });

    root.querySelector("#scShiftTerminalSelect")?.addEventListener("change", (e) => {
        state.shiftTerminal = e.target.value;
        loadData();
    });

    root.querySelector("#scBtnRefreshShift")?.addEventListener("click", () => {
        loadData();
    });

    root.querySelector("#scBtnPrintShiftReport")?.addEventListener("click", () => {
        printShiftBalancingReport(cache.shiftSummary);
    });
}

// -------------------------------------------------------------
// OFFICIAL COMPLIANT TAX RECEIPT PRINT MODAL
// -------------------------------------------------------------
function openReceiptPrintModal(txn) {
    const modalContainer = document.getElementById("scModalContainer");
    if (!modalContainer) return;

    const tenders = txn.tenders || [];

    modalContainer.innerHTML = `
        <div class="sc-modal-backdrop">
            <div class="sc-modal sc-receipt-modal">
                <div class="sc-modal-header no-print">
                    <h3>Official Compliant Tax Receipt</h3>
                    <div>
                        <button class="sc-btn sc-btn-primary" id="scBtnTriggerReceiptPrint">Print Official Receipt</button>
                        <button class="sc-modal-close" id="scCloseReceiptModal">&times;</button>
                    </div>
                </div>
                <div class="sc-modal-body" id="scPrintableReceiptArea">
                    <div class="rcpt-container">
                        <div class="rcpt-header">
                            <h2>USINTELLIX MEDICAL CENTER</h2>
                            <p>Tertiary Medical Hospital &amp; Surgical Pavilion</p>
                            <p>100 Hospital Blvd · Phone: (555) 019-2834</p>
                            <p>VAT Reg. TIN: 004-982-192-000</p>
                            <div class="rcpt-badge">OFFICIAL RECEIPT</div>
                            <div class="rcpt-num">${esc(txn.receipt_number)}</div>
                        </div>

                        <div class="rcpt-meta">
                            <div><strong>Transaction:</strong> ${esc(txn.transaction_number)}</div>
                            <div><strong>Date/Time:</strong> ${esc(txn.created_at || new Date().toLocaleString())}</div>
                            <div><strong>Cashier:</strong> ${esc(txn.cashier_name)}</div>
                            <div><strong>POS Station:</strong> ${esc(txn.terminal_id)}</div>
                        </div>

                        <div class="rcpt-divider"></div>

                        <div class="rcpt-patient">
                            <div><strong>Billed To:</strong> ${esc(txn.patient_name)}</div>
                            <div><strong>MRN:</strong> ${esc(txn.patient_no || 'PAT-' + txn.patient_id)}</div>
                            ${txn.business_name ? `<div><strong>Corporate / HMO:</strong> ${esc(txn.business_name)}</div>` : ''}
                            ${txn.tax_id_number ? `<div><strong>Taxpayer TIN:</strong> ${esc(txn.tax_id_number)}</div>` : ''}
                            ${txn.folio_number ? `<div><strong>Inpatient Folio:</strong> ${esc(txn.folio_number)}</div>` : ''}
                        </div>

                        <div class="rcpt-divider"></div>

                        <div class="rcpt-section-title">SETTLED CHARGES</div>
                        <div class="rcpt-line">
                            <span>Gross Hospital Charges:</span>
                            <span>${cur(txn.gross_amount)}</span>
                        </div>
                        ${Number(txn.discount_amount) > 0 ? `
                            <div class="rcpt-line text-muted">
                                <span>Less Statutory Discount (${esc(txn.discount_type || 'Senior/PWD')}):</span>
                                <span>- ${cur(txn.discount_amount)}</span>
                            </div>
                        ` : ''}
                        <div class="rcpt-line font-bold" style="font-size: 15px; margin: 4px 0;">
                            <span>NET AMOUNT PAYABLE:</span>
                            <span>${cur(txn.net_amount)}</span>
                        </div>

                        <div class="rcpt-divider"></div>

                        <div class="rcpt-section-title">MULTI-TENDER PAYMENT SPLIT</div>
                        ${tenders.map((t, idx) => `
                            <div class="rcpt-tender-row">
                                <div class="rcpt-line font-bold">
                                    <span>Tender #${idx + 1}: ${formatMethodName(t.payment_method)}</span>
                                    <span>${cur(t.amount_applied)}</span>
                                </div>
                                ${t.payment_method === 'cash' ? `
                                    <div class="rcpt-sub-line">
                                        Cash Handed: ${cur(t.amount_tendered)} · Change Returned: ${cur(t.change_returned)}
                                    </div>
                                ` : ''}
                                ${t.terminal_reference ? `
                                    <div class="rcpt-sub-line">
                                        Terminal Auth / Trace: ${esc(t.terminal_reference)} ${t.card_brand ? `(${esc(t.card_brand)} *${esc(t.card_last_four)})` : ''}
                                    </div>
                                ` : ''}
                                ${t.loa_reference ? `
                                    <div class="rcpt-sub-line">
                                        Guarantor: ${esc(t.guarantor_name)} · LOA#: ${esc(t.loa_reference)}
                                    </div>
                                ` : ''}
                                ${t.check_number ? `
                                    <div class="rcpt-sub-line">
                                        Check#: ${esc(t.check_number)} · Bank: ${esc(t.check_bank)} · Date: ${esc(t.check_date)}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}

                        <div class="rcpt-divider"></div>

                        <div class="rcpt-line font-bold" style="font-size: 14px;">
                            <span>TOTAL TENDER RECEIVED:</span>
                            <span>${cur(txn.total_tendered)}</span>
                        </div>
                        <div class="rcpt-line font-bold" style="font-size: 15px; color: #059669;">
                            <span>CHANGE RETURNED:</span>
                            <span>${cur(txn.change_due)}</span>
                        </div>

                        <div class="rcpt-divider"></div>

                        <!-- Regulatory Tax Breakdown (BIR Compliant) -->
                        <div class="rcpt-tax-box">
                            <div class="rcpt-tax-line"><span>VATable Sales:</span> <span>${cur(txn.vatable_sales)}</span></div>
                            <div class="rcpt-tax-line"><span>VAT-Exempt Sales:</span> <span>${cur(txn.vat_exempt_sales)}</span></div>
                            <div class="rcpt-tax-line"><span>Zero-Rated Sales:</span> <span>${cur(txn.zero_rated_sales)}</span></div>
                            <div class="rcpt-tax-line"><span>12% Value-Added Tax:</span> <span>${cur(txn.vat_amount)}</span></div>
                        </div>

                        <div class="rcpt-footer">
                            <p>Thank you for choosing USIntellix Medical Center.</p>
                            <p>This Official Receipt serves as valid legal proof of payment.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const closeModal = () => { modalContainer.innerHTML = ""; };
    modalContainer.querySelector("#scCloseReceiptModal")?.addEventListener("click", closeModal);

    modalContainer.querySelector("#scBtnTriggerReceiptPrint")?.addEventListener("click", () => {
        const content = document.getElementById("scPrintableReceiptArea")?.innerHTML;
        const win = window.open("", "_blank");
        win.document.write(`
            <html>
                <head>
                    <title>Official Receipt - ${esc(txn.receipt_number)}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 20px; color: #0f172a; }
                        .rcpt-container { max-width: 440px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 24px; }
                        .rcpt-header { text-align: center; margin-bottom: 12px; }
                        .rcpt-header h2 { margin: 0; font-size: 16px; }
                        .rcpt-header p { margin: 2px 0; font-size: 11px; color: #475569; }
                        .rcpt-badge { margin: 8px 0 2px; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
                        .rcpt-num { font-size: 15px; font-weight: bold; color: #2563eb; }
                        .rcpt-meta, .rcpt-patient { font-size: 11.5px; line-height: 1.5; }
                        .rcpt-divider { border-top: 1px dashed #94a3b8; margin: 10px 0; }
                        .rcpt-section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                        .rcpt-line { display: flex; justify-content: space-between; font-size: 12.5px; padding: 2px 0; }
                        .rcpt-sub-line { font-size: 11px; color: #64748b; padding-left: 10px; margin-bottom: 3px; }
                        .rcpt-tax-box { font-size: 11px; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-top: 8px; }
                        .rcpt-tax-line { display: flex; justify-content: space-between; padding: 1px 0; }
                        .rcpt-footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 16px; }
                        .text-muted { color: #64748b; }
                        .font-bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${content}
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

function printShiftBalancingReport(s) {
    if (!s) return;
    const byMethod = s.by_method || [];
    const win = window.open("", "_blank");
    win.document.write(`
        <html>
            <head>
                <title>Cashier Z-Reading Report - ${esc(s.shift_date)}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0f172a; }
                    h2, h3 { margin: 4px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background: #f8fafc; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .summary-card { border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; }
                </style>
            </head>
            <body>
                <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
                    <h2>USINTELLIX MEDICAL CENTER</h2>
                    <h3>CASHIER SHIFT BALANCING &amp; Z-READING AUDIT</h3>
                    <p>Shift Date: <strong>${esc(s.shift_date)}</strong> · Station: <strong>${esc(s.terminal_id)}</strong></p>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <div><strong>Total Transactions:</strong> ${s.total_transactions}</div>
                        <div><strong>Gross Hospital Bill:</strong> ${cur(s.total_gross)}</div>
                        <div><strong>Discounts Granted:</strong> ${cur(s.total_discounts)}</div>
                        <div><strong>Net Hospital Collections:</strong> ${cur(s.total_applied)}</div>
                    </div>
                    <div class="summary-card">
                        <div><strong>Total Tender Handed:</strong> ${cur(s.total_tendered)}</div>
                        <div><strong>Total Cash Change Dispensed:</strong> ${cur(s.total_change_dispensed)}</div>
                        <div><strong>VAT Exempt Healthcare:</strong> ${cur(s.total_vat_exempt)}</div>
                        <div><strong>VAT 12% Collected:</strong> ${cur(s.total_vat_collected)}</div>
                    </div>
                </div>

                <h3>Collections by Payment Channel</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Channel / Method</th>
                            <th class="text-right">Receipts</th>
                            <th class="text-right">Total Tendered</th>
                            <th class="text-right">Change Dispensed</th>
                            <th class="text-right">Net Credited</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${byMethod.map(m => `
                            <tr>
                                <td>${formatMethodName(m.payment_method)}</td>
                                <td class="text-right">${m.tender_count}</td>
                                <td class="text-right">${cur(m.total_tendered)}</td>
                                <td class="text-right">${cur(m.total_change)}</td>
                                <td class="text-right font-bold">${cur(m.total_applied)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
function round2(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
}

function formatMethodName(m) {
    const map = {
        'cash': '💵 Cash',
        'credit_card': '💳 Credit Card',
        'debit_card': '💳 Debit Card',
        'insurance_guarantee_letter': '🏢 HMO / LOA Guarantee',
        'gcash_maya': '📱 GCash / Maya',
        'bank_transfer': '🏦 Bank Wire',
        'check': '🧾 Check',
        'philhealth_deduction': '🏥 PhilHealth Deduction'
    };
    return map[m] || m;
}

// -------------------------------------------------------------
// CSS INJECTION
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("splitCashieringStyles")) return;
    const style = document.createElement("style");
    style.id = "splitCashieringStyles";
    style.textContent = `
        .sc-root {
            width: 100%;
            min-height: 100vh;
            background: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            padding: 20px 24px 60px;
            box-sizing: border-box;
        }

        .sc-container { max-width: 1400px; margin: 0 auto; }

        .sc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .sc-title { font-size: 24px; font-weight: 700; margin: 0; }
        .sc-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        .sc-nav-pills {
            display: flex;
            background: #e2e8f0;
            border-radius: 8px;
            padding: 3px;
            gap: 3px;
        }

        .sc-pill-btn {
            border: none;
            background: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .sc-pill-btn.active {
            background: #fff;
            color: #0f172a;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* 2-Column POS Grid */
        .sc-pos-grid {
            display: grid;
            grid-template-columns: 1fr 1.3fr;
            gap: 20px;
        }

        @media (max-width: 1024px) {
            .sc-pos-grid { grid-template-columns: 1fr; }
        }

        .sc-panel {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sc-panel-header {
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .sc-panel-header h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .sc-panel-body { padding: 20px; flex: 1; }
        .sc-panel-footer {
            padding: 14px 20px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .sc-badge-terminal {
            background: #dbeafe;
            color: #1e40af;
            font-family: monospace;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
        }

        /* Balance Banner */
        .sc-balance-banner {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        .sc-bal-item {
            padding: 12px 14px;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
        }

        .sc-bal-item:last-child { border-right: none; }

        .sc-bal-lbl {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
        }

        .sc-bal-val { font-size: 18px; font-weight: 700; margin-top: 3px; }

        .sc-bal-item.highlight.change {
            background: #ecfdf5;
            color: #059669;
        }

        /* Status Pill */
        .sc-status-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
        }

        .sc-status-pill svg { width: 18px; height: 18px; flex-shrink: 0; }
        .sc-status-pill.exact { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
        .sc-status-pill.underpaid { background: #fff1f2; color: #9f1239; border-color: #fecdd3; }
        .sc-status-pill.overpaid { background: #fffbeb; color: #92400e; border-color: #fde68a; }

        /* Tender Card */
        .sc-tenders-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-height: 520px;
            overflow-y: auto;
        }

        .sc-tender-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #fff;
            padding: 14px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .sc-tender-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .sc-tender-title {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .sc-tender-num {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
        }

        .sc-form-group { margin-bottom: 12px; }
        .sc-form-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
        }

        .sc-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .sc-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #fff;
        }

        .sc-input-lg { font-size: 16px; padding: 10px 14px; }
        .sc-input-sm { padding: 5px 10px; font-size: 12px; }

        .sc-split-inputs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .sc-change-pill {
            margin-top: 4px;
            font-size: 12px;
            font-weight: bold;
            color: #059669;
        }

        .sc-meta-sub { font-size: 11.5px; color: #64748b; margin-top: 3px; }
        .sc-divider { border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0; }

        /* Buttons */
        .sc-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.15s;
        }

        .sc-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .sc-btn-primary { background: #2563eb; color: #fff; border-color: #1d4ed8; }
        .sc-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .sc-btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
        .sc-btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
        .sc-btn-danger { background: #ef4444; color: #fff; border-color: #dc2626; }
        .sc-btn-lg { padding: 10px 20px; font-size: 14px; }
        .sc-btn-sm { padding: 5px 10px; font-size: 12px; }
        .sc-btn-xs { padding: 3px 8px; font-size: 11px; }

        .sc-icon-btn {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 18px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .sc-icon-btn:hover { color: #ef4444; background: #fee2e2; }

        /* Table & Ledger */
        .sc-table-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .sc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .sc-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 12px;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
        }

        .sc-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }

        .sc-table tbody tr:hover { background: #f8fafc; }

        .sc-row-voided {
            background: #fff1f2 !important;
            opacity: 0.75;
            text-decoration: line-through;
        }

        .sc-table-total-row td {
            background: #f8fafc;
            border-top: 2px solid #cbd5e1;
            font-size: 14px;
        }

        .sc-filter-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .sc-shift-filter-row {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
        }

        .sc-shift-filter-row div {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sc-search-box {
            position: relative;
            flex: 1;
            min-width: 280px;
            max-width: 440px;
        }

        .sc-search-box svg {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: #94a3b8;
        }

        .sc-search-box input {
            width: 100%;
            padding: 8px 12px 8px 34px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-sizing: border-box;
        }

        .sc-filter-group { display: flex; gap: 8px; }

        .sc-tenders-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .sc-tender-chip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: 600;
        }

        .sc-tender-chip.cash { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
        .sc-tender-chip.credit_card, .sc-tender-chip.debit_card { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
        .sc-tender-chip.insurance_guarantee_letter { background: #fef3c7; border-color: #fde68a; color: #92400e; }

        .sc-action-btns { display: flex; gap: 4px; justify-content: center; }

        .sc-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .sc-stat-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
        }

        .sc-stat-label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .sc-stat-val { font-size: 22px; font-weight: 700; margin: 4px 0 2px; }
        .sc-stat-sub { font-size: 11.5px; color: #94a3b8; }

        .sc-badge { display: inline-block; padding: 2px 7px; font-size: 11px; font-weight: 600; border-radius: 4px; }
        .sc-badge-info { background: #dbeafe; color: #1e40af; }
        .sc-badge-secondary { background: #f1f5f9; color: #475569; }
        .sc-badge-success { background: #d1fae5; color: #065f46; }
        .sc-badge-danger { background: #fee2e2; color: #991b1b; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-blue { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-muted { color: #64748b; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }

        /* Modal Styles */
        .sc-modal-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
        }

        .sc-modal {
            background: #fff;
            border-radius: 10px;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
        }

        .sc-modal-header {
            padding: 14px 18px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sc-modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; }

        .sc-modal-close {
            background: none;
            border: none;
            font-size: 22px;
            color: #94a3b8;
            cursor: pointer;
        }

        .sc-modal-body { padding: 18px; overflow-y: auto; }

        /* Official Receipt Print Preview Styling */
        .rcpt-container {
            font-family: monospace;
            background: #fff;
            border: 1px solid #e2e8f0;
            padding: 20px;
            color: #0f172a;
            font-size: 12px;
        }

        .rcpt-header { text-align: center; margin-bottom: 12px; }
        .rcpt-header h2 { margin: 0; font-size: 15px; }
        .rcpt-header p { margin: 2px 0; font-size: 11px; color: #475569; }
        .rcpt-badge { margin: 8px 0 2px; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
        .rcpt-num { font-size: 14px; font-weight: bold; color: #2563eb; }
        .rcpt-meta, .rcpt-patient { font-size: 11.5px; line-height: 1.5; }
        .rcpt-divider { border-top: 1px dashed #94a3b8; margin: 8px 0; }
        .rcpt-section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .rcpt-line { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
        .rcpt-sub-line { font-size: 11px; color: #64748b; padding-left: 10px; margin-bottom: 3px; }
        .rcpt-tax-box { font-size: 11px; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; margin-top: 8px; }
        .rcpt-tax-line { display: flex; justify-content: space-between; padding: 1px 0; }
        .rcpt-footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 14px; }
    `;
    document.head.appendChild(style);
}
