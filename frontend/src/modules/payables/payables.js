import {
    fetchPayablesSummary, fetchOpenBills, fetchPayableSuppliers, fetchPayments, fetchPayment, recordPayment, voidPayment,
    fetchAging, fetchLedger
} from "./payables.service.js?v=1";
import { formatMoney, formatDate, escapeHtml } from "../supplier-prices/supplier-price-form.js?v=3";
import { showToast } from "../../core/toast.js";
import { todayISO, systemNow, toDateInput } from "../../core/timezone.js";

const METHOD_LABELS = { check: "Check", bank_transfer: "Bank transfer", cash: "Cash", other: "Other" };
const BUCKETS = [
    ["current", "Current"],
    ["d1_30", "1–30 days"],
    ["d31_60", "31–60 days"],
    ["d61_90", "61–90 days"],
    ["d90_plus", "Over 90 days"]
];

let activeTab = "bills";
let bills = [];
let payments = [];
let suppliers = [];
let selectedBills = new Set();
let billSupplier = "";
let agingAsOf = "";
let agingOpen = new Set();
let ledgerState = { supplierId: "", from: "", to: "" };

// Payment form
let payBills = [];   // open bills of the chosen supplier
let amounts = {};    // invoice id -> amount typed

const $ = (id) => document.getElementById(id);

export async function initPayables() {
    document.querySelectorAll("[data-ap-tab]").forEach((btn) => btn.addEventListener("click", () => {
        activeTab = btn.dataset.apTab;
        document.querySelectorAll("[data-ap-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        renderTab();
    }));
    document.querySelectorAll("[data-ap-back]").forEach((btn) => btn.addEventListener("click", showMain));
    $("apPayBtn").addEventListener("click", () => openPaymentForm());

    setupPaymentForm();
    await loadAll();
}

/* ---------------------------------------------------------------
 * Overview
 * ------------------------------------------------------------- */

async function loadAll() {
    $("apTabBody").innerHTML = `<div class="ap-empty">Loading...</div>`;

    const [summary, billResult, paymentResult, supplierResult] = await Promise.all([
        fetchPayablesSummary(), fetchOpenBills(), fetchPayments(), fetchPayableSuppliers()
    ]);

    if (!summary?.success || !billResult?.success) {
        const message = (!summary?.success ? summary : billResult)?.message;
        $("apTabBody").innerHTML = `
            <div class="ap-empty"><strong>Couldn't load accounts payable.</strong>
                <span class="ap-sub">${escapeHtml(message || "The server didn't respond.")}</span>
                <button type="button" class="ap-btn small" id="apRetry" style="margin-top:10px;">Try Again</button></div>`;
        $("apRetry").addEventListener("click", loadAll);
        return;
    }

    const s = summary.data;
    $("apStatPayable").textContent = formatMoney(s.total_payable);
    $("apStatPayableSub").textContent = `Total payable · ${s.open_count} invoice${s.open_count === 1 ? "" : "s"}`;
    $("apStatOverdue").textContent = formatMoney(s.overdue_amount);
    $("apStatOverdueSub").textContent = `Overdue · ${s.overdue_count} invoice${s.overdue_count === 1 ? "" : "s"}`;
    $("apStatWeek").textContent = formatMoney(s.due_week_amount);
    $("apStatWeekSub").textContent = `Due in the next 7 days · ${s.due_week_count}`;
    $("apStatPaid").textContent = formatMoney(s.paid_this_month);

    bills = billResult.data || [];
    payments = paymentResult?.success ? paymentResult.data || [] : [];
    suppliers = supplierResult?.success ? supplierResult.data || [] : [];
    selectedBills = new Set([...selectedBills].filter((id) => bills.some((b) => b.id === id)));

    renderTab();
}

function renderTab() {
    ({ bills: renderBills, payments: renderPayments, aging: renderAging, ledger: renderLedger })[activeTab]();
}

function showPanel(name) {
    $("apMainPanel").hidden = name !== "main";
    $("apPayPanel").hidden = name !== "pay";
    $("apDetailPanel").hidden = name !== "detail";
    document.querySelector(".ap-page").scrollIntoView({ block: "start" });
}

async function showMain() {
    showPanel("main");
    await loadAll();
}

function supplierOptions(selected, placeholder, list = suppliers) {
    return `<option value="">${placeholder}</option>` + list.map((s) =>
        `<option value="${s.id}" ${String(selected) === String(s.id) ? "selected" : ""}>${escapeHtml(s.name)}${s.balance > 0 ? ` — owes ${formatMoney(s.balance)}` : ""}</option>`).join("");
}

function dueBadge(bill) {
    if (!bill.due_date) return "";
    if (bill.is_overdue) return `<span class="ap-badge overdue">${bill.days_past_due} day${bill.days_past_due === 1 ? "" : "s"} overdue</span>`;
    if (bill.days_until_due === 0) return `<span class="ap-badge soon">Due today</span>`;
    if (bill.days_until_due <= 7) return `<span class="ap-badge soon">Due in ${bill.days_until_due} day${bill.days_until_due === 1 ? "" : "s"}</span>`;
    return `<span class="ap-sub">in ${bill.days_until_due} days</span>`;
}

/* ---- Open bills ---- */

function renderBills() {
    const list = bills.filter((b) => !billSupplier || String(b.supplier_id) === String(billSupplier));
    const chosen = bills.filter((b) => selectedBills.has(b.id));
    const chosenSupplier = chosen[0]?.supplier_id;
    const total = list.reduce((sum, b) => sum + b.balance, 0);

    $("apTabBody").innerHTML = `
        <div class="ap-filters">
            <select id="apBillSupplier" aria-label="Supplier">${supplierOptions(billSupplier, "All suppliers", suppliers.filter((s) => s.balance > 0))}</select>
            <span class="ap-count">${list.length} open invoice${list.length === 1 ? "" : "s"} · ${formatMoney(total)}</span>
        </div>
        ${chosen.length ? `
        <div class="ap-selbar">
            <span><strong>${chosen.length}</strong> selected from ${escapeHtml(chosen[0].supplier_name)} · ${formatMoney(chosen.reduce((sum, b) => sum + b.balance, 0))}</span>
            <span class="ap-actions">
                <button type="button" class="ap-btn small" id="apClearSel">Clear</button>
                <button type="button" class="ap-btn small primary" id="apPaySel">Pay Selected</button>
            </span>
        </div>` : ""}
        ${!list.length ? `<div class="ap-empty">${bills.length ? "Nothing owed to this supplier." : "Nothing owed. Supplier invoices appear here once they're approved for payment."}</div>` : `
        <div class="ap-table-wrap">
            <table class="ap-table">
                <thead><tr><th style="width:30px;"></th><th>AP No.</th><th>Supplier</th><th>Invoice Date</th><th>Due</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th></th></tr></thead>
                <tbody>${list.map((b) => `
                    <tr>
                        <td><input type="checkbox" data-ap-select="${b.id}" ${selectedBills.has(b.id) ? "checked" : ""}
                            ${chosenSupplier && chosenSupplier !== b.supplier_id ? "disabled title=\"Pay one supplier at a time\"" : ""} aria-label="Select ${escapeHtml(b.ap_number)}"></td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(b.ap_number)}</strong><span class="ap-sub">Inv. ${escapeHtml(b.supplier_invoice_no)} · ${escapeHtml(b.po_number)}</span></td>
                        <td>${escapeHtml(b.supplier_name)}${b.payment_terms ? `<span class="ap-sub">${escapeHtml(b.payment_terms)}</span>` : ""}</td>
                        <td style="white-space:nowrap;">${formatDate(b.invoice_date)}</td>
                        <td style="white-space:nowrap;">${b.due_date ? formatDate(b.due_date) : "—"}<span class="ap-sub">${dueBadge(b)}</span></td>
                        <td class="num">${formatMoney(b.total)}</td>
                        <td class="num">${b.amount_paid ? formatMoney(b.amount_paid) : "—"}${b.payment_status === "partially_paid" ? `<span class="ap-sub"><span class="ap-badge partially_paid">Partial</span></span>` : ""}</td>
                        <td class="num"><strong>${formatMoney(b.balance)}</strong></td>
                        <td><button type="button" class="ap-btn small" data-ap-pay-one="${b.id}">Pay</button></td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`}`;

    $("apBillSupplier").addEventListener("change", (event) => {
        billSupplier = event.target.value;
        renderBills();
    });

    $("apTabBody").querySelectorAll("[data-ap-select]").forEach((box) => box.addEventListener("change", () => {
        const id = Number(box.dataset.apSelect);
        if (box.checked) selectedBills.add(id); else selectedBills.delete(id);
        renderBills();
    }));

    $("apTabBody").querySelectorAll("[data-ap-pay-one]").forEach((btn) => btn.addEventListener("click", () => {
        const bill = bills.find((b) => b.id === Number(btn.dataset.apPayOne));
        openPaymentForm(bill.supplier_id, [bill.id]);
    }));

    $("apClearSel")?.addEventListener("click", () => { selectedBills.clear(); renderBills(); });
    $("apPaySel")?.addEventListener("click", () => openPaymentForm(chosenSupplier, [...selectedBills]));
}

/* ---- Payments ---- */

function renderPayments() {
    $("apTabBody").innerHTML = !payments.length
        ? `<div class="ap-empty">No payments recorded yet.</div>`
        : `
        <div class="ap-filters"><input type="text" id="apPaySearch" placeholder="Search PV no., supplier, check / reference no., AP no...."><span class="ap-count" id="apPayCount"></span></div>
        <div id="apPayList"></div>`;

    if (!payments.length) return;

    const draw = () => {
        const term = $("apPaySearch").value.trim().toLowerCase();
        const list = payments.filter((p) => !term || [p.pv_number, p.supplier_name, p.reference_no, p.invoice_numbers]
            .some((v) => (v || "").toLowerCase().includes(term)));
        $("apPayCount").textContent = `${list.length} payment${list.length === 1 ? "" : "s"}`;

        $("apPayList").innerHTML = `
            <div class="ap-table-wrap">
                <table class="ap-table">
                    <thead><tr><th>PV No.</th><th>Date</th><th>Supplier</th><th>Paid By</th><th>Invoices</th><th class="num">Applied</th><th class="num">EWT</th><th class="num">Paid</th><th>Status</th></tr></thead>
                    <tbody>${list.map((p) => `
                        <tr class="ap-row ${p.status === "voided" ? "is-voided" : ""}" data-ap-payment="${p.id}">
                            <td style="white-space:nowrap;"><strong>${escapeHtml(p.pv_number)}</strong></td>
                            <td style="white-space:nowrap;">${formatDate(p.payment_date)}</td>
                            <td>${escapeHtml(p.supplier_name)}</td>
                            <td>${escapeHtml(p.method_label)}${p.reference_no ? `<span class="ap-sub">${escapeHtml(p.reference_no)}</span>` : ""}</td>
                            <td>${escapeHtml(p.invoice_numbers || "—")}</td>
                            <td class="num">${formatMoney(p.total_applied)}</td>
                            <td class="num">${p.ewt_amount ? formatMoney(p.ewt_amount) : "—"}</td>
                            <td class="num"><strong>${formatMoney(p.amount_paid)}</strong></td>
                            <td><span class="ap-badge ${p.status}">${p.status === "voided" ? "Voided" : "Posted"}</span></td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>`;

        $("apPayList").querySelectorAll("[data-ap-payment]").forEach((row) => row.addEventListener("click", () => openPayment(Number(row.dataset.apPayment))));
    };

    $("apPaySearch").addEventListener("input", draw);
    draw();
}

/* ---- Aging ---- */

async function renderAging() {
    agingAsOf = agingAsOf || todayISO();
    $("apTabBody").innerHTML = `
        <div class="ap-filters">
            <label>As of <input type="date" id="apAgingAsOf" value="${agingAsOf}"></label>
            <button type="button" class="ap-btn small" id="apAgingPrint">Print</button>
            <span class="ap-count">Balances by how far past their due date they are</span>
        </div>
        <div id="apAgingBody"><div class="ap-empty">Loading...</div></div>`;

    $("apAgingAsOf").addEventListener("change", (event) => {
        agingAsOf = event.target.value || todayISO();
        renderAging();
    });

    const result = await fetchAging(agingAsOf);

    if (!result?.success) {
        $("apAgingBody").innerHTML = `<div class="ap-empty">${escapeHtml(result?.message || "Couldn't load the aging report.")}</div>`;
        return;
    }

    const aging = result.data;
    $("apAgingPrint").addEventListener("click", () => printAging(aging));

    if (!aging.suppliers.length) {
        $("apAgingBody").innerHTML = `<div class="ap-empty">Nothing was owed to suppliers as of ${formatDate(aging.as_of)}.</div>`;
        return;
    }

    $("apAgingBody").innerHTML = `
        <div class="ap-table-wrap">
            <table class="ap-table">
                <thead><tr><th>Supplier</th>${BUCKETS.map(([, label]) => `<th class="num">${label}</th>`).join("")}<th class="num">Total</th></tr></thead>
                <tbody>${aging.suppliers.map((s) => `
                    <tr class="ap-row" data-ap-aging="${s.supplier_id}">
                        <td><strong>${agingOpen.has(s.supplier_id) ? "&#9662;" : "&#9656;"} ${escapeHtml(s.supplier_name)}</strong><span class="ap-sub">${s.invoices.length} invoice${s.invoices.length === 1 ? "" : "s"}</span></td>
                        ${BUCKETS.map(([key]) => `<td class="num">${s[key] ? formatMoney(s[key]) : "—"}</td>`).join("")}
                        <td class="num"><strong>${formatMoney(s.total)}</strong></td>
                    </tr>
                    ${agingOpen.has(s.supplier_id) ? s.invoices.map((i) => `
                    <tr class="ap-sub">
                        <td style="padding-left:28px;">${escapeHtml(i.ap_number)} · Inv. ${escapeHtml(i.supplier_invoice_no)}<span class="ap-sub">due ${formatDate(i.due_date)}${i.days_past_due ? ` · ${i.days_past_due} days past due` : ""}</span></td>
                        ${BUCKETS.map(([key]) => `<td class="num">${i.bucket === key ? formatMoney(i.balance) : ""}</td>`).join("")}
                        <td class="num">${formatMoney(i.balance)}</td>
                    </tr>`).join("") : ""}`).join("")}
                </tbody>
                <tfoot><tr><td>Total</td>${BUCKETS.map(([key]) => `<td class="num">${formatMoney(aging.totals[key])}</td>`).join("")}<td class="num">${formatMoney(aging.totals.total)}</td></tr></tfoot>
            </table>
        </div>
        <p class="ap-sub" style="margin-top:8px;">Click a supplier to see its invoices. Payments dated after ${formatDate(aging.as_of)} aren't counted.</p>`;

    $("apAgingBody").querySelectorAll("[data-ap-aging]").forEach((row) => row.addEventListener("click", () => {
        const id = Number(row.dataset.apAging);
        if (agingOpen.has(id)) agingOpen.delete(id); else agingOpen.add(id);
        renderAging();
    }));
}

/* ---- Supplier ledger ---- */

async function renderLedger() {
    $("apTabBody").innerHTML = `
        <div class="ap-filters">
            <select id="apLedgerSupplier" aria-label="Supplier">${supplierOptions(ledgerState.supplierId, "Choose a supplier...")}</select>
            <label>From <input type="date" id="apLedgerFrom" value="${ledgerState.from}"></label>
            <label>To <input type="date" id="apLedgerTo" value="${ledgerState.to}"></label>
            <button type="button" class="ap-btn small" id="apLedgerPrint" ${ledgerState.supplierId ? "" : "disabled"}>Print</button>
        </div>
        <div id="apLedgerBody"></div>`;

    const reload = () => {
        ledgerState = { supplierId: $("apLedgerSupplier").value, from: $("apLedgerFrom").value, to: $("apLedgerTo").value };
        renderLedger();
    };
    ["apLedgerSupplier", "apLedgerFrom", "apLedgerTo"].forEach((id) => $(id).addEventListener("change", reload));

    if (!ledgerState.supplierId) {
        $("apLedgerBody").innerHTML = `<div class="ap-empty">${suppliers.length
            ? "Choose a supplier to see its invoices, payments and running balance."
            : "No supplier has approved invoices or payments yet."}</div>`;
        return;
    }

    $("apLedgerBody").innerHTML = `<div class="ap-empty">Loading...</div>`;
    const result = await fetchLedger(ledgerState.supplierId, ledgerState.from, ledgerState.to);

    if (!result?.success) {
        $("apLedgerBody").innerHTML = `<div class="ap-empty">${escapeHtml(result?.message || "Couldn't load the ledger.")}</div>`;
        return;
    }

    const ledger = result.data;
    $("apLedgerPrint").addEventListener("click", () => printLedger(ledger));

    $("apLedgerBody").innerHTML = `
        <div class="ap-table-wrap">
            <table class="ap-table">
                <thead><tr><th>Date</th><th>Reference</th><th>Details</th><th class="num">Billed</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead>
                <tbody>
                    <tr class="ap-sub"><td colspan="5"><strong>Opening balance</strong>${ledger.from ? ` as of ${formatDate(ledger.from)}` : ""}</td><td class="num"><strong>${formatMoney(ledger.opening_balance)}</strong></td></tr>
                    ${ledger.entries.map((e) => `
                    <tr>
                        <td style="white-space:nowrap;">${formatDate(e.date)}</td>
                        <td style="white-space:nowrap;"><strong>${escapeHtml(e.reference)}</strong></td>
                        <td>${escapeHtml(e.description)}${e.due_date ? `<span class="ap-sub">due ${formatDate(e.due_date)}</span>` : ""}${e.ewt ? `<span class="ap-sub">incl. ${formatMoney(e.ewt)} tax withheld</span>` : ""}</td>
                        <td class="num">${e.charge ? formatMoney(e.charge) : ""}</td>
                        <td class="num">${e.payment ? formatMoney(e.payment) : ""}</td>
                        <td class="num">${formatMoney(e.balance)}</td>
                    </tr>`).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No invoices or payments in this period.</td></tr>`}
                </tbody>
                <tfoot><tr><td colspan="3">Closing balance</td><td class="num">${formatMoney(ledger.total_charges)}</td><td class="num">${formatMoney(ledger.total_payments)}</td><td class="num">${formatMoney(ledger.closing_balance)}</td></tr></tfoot>
            </table>
        </div>`;
}

/* ---------------------------------------------------------------
 * Record a payment
 * ------------------------------------------------------------- */

function setupPaymentForm() {
    $("ap_method").addEventListener("change", applyMethod);
    $("ap_supplier_id").addEventListener("change", async () => {
        await loadSupplierBills(Number($("ap_supplier_id").value) || null, []);
    });
    $("ap_ewt_rate").addEventListener("change", renderAllocations);

    $("apPayAll").addEventListener("click", () => {
        payBills.forEach((b) => { amounts[b.id] = b.balance.toFixed(2); });
        renderAllocations();
    });

    $("apAllocations").addEventListener("input", (event) => {
        const id = event.target.dataset.apAmount;
        if (!id) return;
        amounts[id] = event.target.value;
        $(`err-ap_alloc_${id}`).textContent = "";
        refreshAllocationTotals();
    });

    $("apAllocations").addEventListener("click", (event) => {
        const full = event.target.closest("[data-ap-full]");
        if (!full) return;
        const bill = payBills.find((b) => b.id === Number(full.dataset.apFull));
        amounts[bill.id] = bill.balance.toFixed(2);
        renderAllocations();
    });

    $("apPayForm").addEventListener("submit", (event) => {
        event.preventDefault();
        savePayment();
    });
}

async function openPaymentForm(supplierId = null, invoiceIds = []) {
    clearPayErrors();
    $("apPayForm").reset();
    $("ap_payment_date").value = todayISO();
    $("ap_payment_date").max = todayISO();
    $("ap_method").value = "check";
    applyMethod();

    const withBalance = suppliers.filter((s) => s.balance > 0);
    $("ap_supplier_id").innerHTML = supplierOptions(supplierId || "", "-- Choose the supplier --", withBalance);

    await loadSupplierBills(supplierId, invoiceIds);
    showPanel("pay");
}

async function loadSupplierBills(supplierId, invoiceIds) {
    amounts = {};
    payBills = [];

    if (supplierId) {
        const result = await fetchOpenBills(supplierId);
        payBills = result?.success ? result.data || [] : [];
        // Bills picked on the list start at their full balance.
        payBills.filter((b) => invoiceIds.includes(b.id)).forEach((b) => { amounts[b.id] = b.balance.toFixed(2); });
    }

    renderAllocations();
}

function applyMethod() {
    const method = $("ap_method").value;
    const needsRef = method === "check" || method === "bank_transfer";
    $("apRefLabel").innerHTML = `${method === "check" ? "Check No." : method === "bank_transfer" ? "Transfer Reference No." : "Reference / OR No."}${needsRef ? `<span class="req">*</span>` : ""}`;
    $("apCheckDateField").hidden = method !== "check";
}

/** EWT on the VAT-exclusive share of what's applied (same rule as the server). */
function ewtFor(bill, amount) {
    const rate = Number($("ap_ewt_rate").value) || 0;
    if (!rate || !(amount > 0) || !(bill.total > 0)) return 0;
    const base = round(amount * (bill.total - bill.vat_amount) / bill.total, 2);
    return round(base * rate / 100, 2);
}

function renderAllocations() {
    if (!$("ap_supplier_id").value) {
        $("apAllocations").innerHTML = `<div class="ap-empty">Choose the supplier being paid.</div>`;
        refreshAllocationTotals();
        return;
    }

    if (!payBills.length) {
        $("apAllocations").innerHTML = `<div class="ap-empty">Nothing is owed to this supplier.</div>`;
        refreshAllocationTotals();
        return;
    }

    $("apAllocations").innerHTML = `
        <div class="ap-table-wrap">
            <table class="ap-table ap-alloc">
                <thead><tr><th>Invoice</th><th>Due</th><th class="num">Balance</th><th class="num">Amount to Apply</th><th class="num">EWT</th></tr></thead>
                <tbody>${payBills.map((b) => `
                    <tr>
                        <td><strong>${escapeHtml(b.ap_number)}</strong><span class="ap-sub">Inv. ${escapeHtml(b.supplier_invoice_no)} · ${escapeHtml(b.po_number)} · ${formatMoney(b.total)}</span></td>
                        <td style="white-space:nowrap;">${b.due_date ? formatDate(b.due_date) : "—"}<span class="ap-sub">${dueBadge(b)}</span></td>
                        <td class="num">${formatMoney(b.balance)}</td>
                        <td class="num">
                            <input type="number" min="0" step="0.01" data-ap-amount="${b.id}" value="${escapeHtml(amounts[b.id] || "")}" placeholder="0.00" aria-label="Amount applied to ${escapeHtml(b.ap_number)}">
                            <button type="button" class="ap-btn link" data-ap-full="${b.id}" style="display:block;margin:3px 0 0 auto;">Full</button>
                            <span class="form-error" id="err-ap_alloc_${b.id}"></span>
                        </td>
                        <td class="num" data-ap-ewt="${b.id}">—</td>
                    </tr>`).join("")}
                </tbody>
            </table>
        </div>`;

    refreshAllocationTotals();
}

function refreshAllocationTotals() {
    let applied = 0;
    let ewt = 0;

    payBills.forEach((b) => {
        const amount = Number(amounts[b.id]) || 0;
        const tax = ewtFor(b, amount);
        applied += amount;
        ewt += tax;
        const cell = document.querySelector(`[data-ap-ewt="${b.id}"]`);
        if (cell) cell.textContent = tax ? formatMoney(tax) : "—";
    });

    $("apTotApplied").textContent = formatMoney(round(applied, 2));
    $("apTotEwt").textContent = ewt ? `− ${formatMoney(round(ewt, 2))}` : formatMoney(0);
    $("apTotCash").textContent = formatMoney(round(applied - ewt, 2));
}

async function savePayment() {
    clearPayErrors();

    const allocations = payBills
        .filter((b) => amounts[b.id] !== undefined && amounts[b.id] !== "")
        .map((b) => ({ supplier_invoice_id: b.id, amount: amounts[b.id] }));

    let problems = 0;

    if (!$("ap_supplier_id").value) { $("err-ap_supplier_id").textContent = "Choose the supplier being paid."; problems++; }

    allocations.forEach((a) => {
        const bill = payBills.find((b) => b.id === a.supplier_invoice_id);
        const amount = Number(a.amount);
        if (!(amount >= 0)) { $(`err-ap_alloc_${bill.id}`).textContent = "Enter an amount."; problems++; }
        else if (amount > bill.balance + 0.005) { $(`err-ap_alloc_${bill.id}`).textContent = `More than the balance of ${formatMoney(bill.balance)}.`; problems++; }
    });

    if (!allocations.some((a) => Number(a.amount) > 0)) {
        $("err-ap_allocations").textContent = "Enter how much is paid on at least one invoice.";
        problems++;
    }

    if (["check", "bank_transfer"].includes($("ap_method").value) && !$("ap_reference_no").value.trim()) {
        $("err-ap_reference_no").textContent = $("ap_method").value === "check" ? "Enter the check number." : "Enter the transfer reference number.";
        problems++;
    }

    if (problems) {
        showPayAlert("Please fix the highlighted fields.");
        return;
    }

    const supplier = suppliers.find((s) => String(s.id) === $("ap_supplier_id").value);
    const paidBills = allocations.filter((a) => Number(a.amount) > 0);
    const applied = paidBills.reduce((sum, a) => sum + Number(a.amount), 0);
    const ewt = paidBills.reduce((sum, a) => sum + ewtFor(payBills.find((b) => b.id === a.supplier_invoice_id), Number(a.amount)), 0);

    const confirmed = await openDialog({
        title: "Record this payment?",
        body: `
            <dl class="ap-dialog-summary">
                <dt>Supplier</dt><dd>${escapeHtml(supplier?.name || "")}</dd>
                <dt>Date</dt><dd>${formatDate($("ap_payment_date").value)}</dd>
                <dt>Paid by</dt><dd>${escapeHtml(METHOD_LABELS[$("ap_method").value])}${$("ap_reference_no").value.trim() ? ` ${escapeHtml($("ap_reference_no").value.trim())}` : ""}</dd>
                <dt>Invoices</dt><dd>${paidBills.length}</dd>
                <dt>Applied</dt><dd>${formatMoney(round(applied, 2))}</dd>
                ${ewt ? `<dt>Tax withheld</dt><dd>${formatMoney(round(ewt, 2))}</dd>` : ""}
                <dt>Amount paid</dt><dd>${formatMoney(round(applied - ewt, 2))}</dd>
            </dl>
            <p>The invoices' balances go down right away. A payment can't be edited afterwards, only voided.</p>`,
        okLabel: "Record Payment",
        onConfirm: async () => ({ success: true })
    });

    if (!confirmed) return;

    $("apPaySave").disabled = true;
    const result = await recordPayment({
        supplier_id: $("ap_supplier_id").value,
        payment_date: $("ap_payment_date").value,
        method: $("ap_method").value,
        reference_no: $("ap_reference_no").value.trim(),
        check_date: $("ap_check_date").value,
        paid_from: $("ap_paid_from").value.trim(),
        ewt_rate: $("ap_ewt_rate").value,
        notes: $("ap_notes").value.trim(),
        allocations
    });
    $("apPaySave").disabled = false;

    if (!result?.success) {
        const errors = result?.errors && typeof result.errors === "object" ? result.errors : null;

        if (errors) {
            Object.entries(errors).forEach(([name, message]) => {
                const m = name.match(/^allocations\.(\d+)\.amount$/);
                const el = m ? $(`err-ap_alloc_${allocations[Number(m[1])]?.supplier_invoice_id}`) : $(`err-ap_${name}`);
                if (el) el.textContent = message;
            });
            showPayAlert("Nothing was saved. Please fix the highlighted fields.");
        } else {
            showPayAlert(result?.message || "Failed to record the payment.");
        }
        return;
    }

    showToast(result.message, "success");
    selectedBills.clear();
    await openPayment(result.data.id);
}

function clearPayErrors() {
    $("apPayAlert").innerHTML = "";
    document.querySelectorAll("#apPayForm .form-error").forEach((el) => { el.textContent = ""; });
}

function showPayAlert(message) {
    $("apPayAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    $("apPayAlert").scrollIntoView({ block: "nearest" });
}

/* ---------------------------------------------------------------
 * Payment detail
 * ------------------------------------------------------------- */

async function openPayment(id) {
    const result = await fetchPayment(id);

    if (!result?.success) {
        showToast(result?.message || "Couldn't open the payment.", "error");
        return;
    }

    const p = result.data;
    const voided = p.status === "voided";

    $("apDetail").innerHTML = `
        <div class="ap-banner ${voided ? "voided" : ""}">
            <div>
                <strong>${escapeHtml(p.pv_number)} &mdash; ${voided ? "voided" : `${formatMoney(p.amount_paid)} paid to ${escapeHtml(p.supplier_name)}`}</strong>
                <span>${voided
                    ? `${formatDate(String(p.voided_at).slice(0, 10))}${p.voided_by_name ? ` by ${escapeHtml(p.voided_by_name)}` : ""}: &ldquo;${escapeHtml(p.void_reason || "")}&rdquo;. Its amounts are back on the invoices.`
                    : `${formatDate(p.payment_date)} · ${escapeHtml(p.method_label)}${p.reference_no ? ` ${escapeHtml(p.reference_no)}` : ""}`}</span>
            </div>
            <div class="ap-actions">
                <button type="button" class="ap-btn" id="apPrintPv">Print Voucher</button>
                ${voided ? "" : `<button type="button" class="ap-btn danger" id="apVoidPv">Void</button>`}
            </div>
        </div>

        <div class="ap-card">
            <dl class="ap-info">${[
                ["Payment Voucher", `<strong>${escapeHtml(p.pv_number)}</strong>`],
                ["Supplier", `${escapeHtml(p.supplier_name)}${p.supplier_tin ? `<span class="ap-sub">TIN ${escapeHtml(p.supplier_tin)}</span>` : ""}`],
                ["Payment Date", formatDate(p.payment_date)],
                ["Paid By", `${escapeHtml(p.method_label)}${p.reference_no ? `<span class="ap-sub">${escapeHtml(p.reference_no)}</span>` : ""}`],
                ...(p.check_date ? [["Check Date", formatDate(p.check_date)]] : []),
                ["Paid From", escapeHtml(p.paid_from || "—")],
                ["Withholding Tax", p.ewt_rate ? `${p.ewt_rate}%` : "None"],
                ["Recorded By", escapeHtml(p.created_by_name || "—")],
                ["Notes", escapeHtml(p.notes || "—")]
            ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        </div>

        <div class="ap-card">
            <div class="ap-card-title">Invoices Paid</div>
            <div class="ap-table-wrap">
                <table class="ap-table">
                    <thead><tr><th>Invoice</th><th>Due</th><th class="num">Invoice Total</th><th class="num">Applied</th><th class="num">EWT</th><th class="num">Paid</th><th class="num">Balance Now</th></tr></thead>
                    <tbody>${p.allocations.map((a) => `
                        <tr>
                            <td><strong>${escapeHtml(a.ap_number)}</strong><span class="ap-sub">Inv. ${escapeHtml(a.supplier_invoice_no)} · ${escapeHtml(a.po_number)}</span></td>
                            <td>${a.due_date ? formatDate(a.due_date) : "—"}</td>
                            <td class="num">${formatMoney(a.invoice_total)}</td>
                            <td class="num">${formatMoney(a.amount_applied)}</td>
                            <td class="num">${a.ewt_amount ? formatMoney(a.ewt_amount) : "—"}${a.ewt_amount ? `<span class="ap-sub">${a.ewt_rate}% of ${formatMoney(a.ewt_base)}</span>` : ""}</td>
                            <td class="num">${formatMoney(a.cash)}</td>
                            <td class="num">${formatMoney(a.invoice_balance)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>
            <div class="ap-totals" style="margin-top:14px;">
                <span class="label">Applied to invoices</span><span class="val">${formatMoney(p.total_applied)}</span>
                <span class="label">Less: tax withheld (EWT)</span><span class="val">${p.ewt_amount ? `− ${formatMoney(p.ewt_amount)}` : formatMoney(0)}</span>
                <span class="label grand">Amount Paid</span><span class="val grand">${formatMoney(p.amount_paid)}</span>
            </div>
        </div>`;

    $("apPrintPv").addEventListener("click", () => printVoucher(p));
    $("apVoidPv")?.addEventListener("click", async () => {
        const done = await openDialog({
            title: `Void ${p.pv_number}?`,
            body: `
                <dl class="ap-dialog-summary">
                    <dt>Supplier</dt><dd>${escapeHtml(p.supplier_name)}</dd>
                    <dt>Paid</dt><dd>${formatMoney(p.amount_paid)} on ${formatDate(p.payment_date)}</dd>
                    <dt>Invoices</dt><dd>${escapeHtml(p.invoice_numbers || "")}</dd>
                </dl>
                <p>Use this when the payment didn't go through or was entered wrongly (e.g. a cancelled or bounced check). The amounts go back on the invoices' balances. The voucher stays on file, marked voided.</p>`,
            withText: true,
            label: "Reason",
            placeholder: "e.g. Check cancelled, wrong amount entered",
            required: true,
            requiredMessage: "Say why this payment is being voided.",
            okLabel: "Void Payment",
            okClass: "danger solid",
            onConfirm: (text) => voidPayment(p.id, text)
        });

        if (done) await openPayment(p.id);
    });

    showPanel("detail");
}

/** In-app confirm dialog. onConfirm(text) returns an API-style result; failures keep it open. */
function openDialog({ title, body, label = "", placeholder = "", required = false, requiredMessage = "", okLabel = "Confirm", okClass = "primary", withText = false, onConfirm }) {
    return new Promise((resolve) => {
        const overlay = $("apDialogOverlay");
        const finish = (value) => {
            overlay.classList.remove("open");
            $("apDialogOk").onclick = null;
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (event) => { if (event.key === "Escape") finish(false); };

        $("apDialogTitle").textContent = title;
        $("apDialogBody").innerHTML = body;
        $("apDialogAlert").innerHTML = "";
        $("apDialogField").hidden = !withText;
        $("apDialogLabel").innerHTML = `${escapeHtml(label)}${required ? `<span style="color:#dc2626;">*</span>` : ""}`;
        $("apDialogText").value = "";
        $("apDialogText").placeholder = placeholder;
        $("err-ap_dialog").textContent = "";
        $("apDialogOk").textContent = okLabel;
        $("apDialogOk").className = `ap-btn ${okClass}`;

        $("apDialogOk").onclick = async () => {
            const text = $("apDialogText").value.trim();
            $("err-ap_dialog").textContent = "";

            if (withText && required && !text) {
                $("err-ap_dialog").textContent = requiredMessage;
                $("apDialogText").focus();
                return;
            }

            $("apDialogOk").disabled = true;
            const result = await onConfirm(text);
            $("apDialogOk").disabled = false;

            if (!result?.success) {
                const fieldError = result?.errors && Object.values(result.errors)[0];
                if (fieldError) $("err-ap_dialog").textContent = fieldError;
                $("apDialogAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result?.message || "Something went wrong.")}</div>`;
                return;
            }

            if (result.message) showToast(result.message, "success");
            finish(true);
        };

        $("apDialogClose").onclick = () => finish(false);
        $("apDialogCancel").onclick = () => finish(false);
        overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        (withText ? $("apDialogText") : $("apDialogOk")).focus();
    });
}

/* ---------------------------------------------------------------
 * Printouts
 * ------------------------------------------------------------- */

const PRINT_STYLE = `
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; margin: 0; padding: 24px; }
    .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 14px; }
    .org { font-size: 18px; font-weight: 700; }
    .muted { color: #4b5563; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #d1d5db; margin-bottom: 14px; }
    .meta div { padding: 8px 10px; border-right: 1px solid #d1d5db; }
    .meta div:last-child { border-right: none; }
    .meta span { display: block; font-size: 10px; text-transform: uppercase; color: #4b5563; letter-spacing: .4px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; padding: 6px; border: 1px solid #d1d5db; }
    table.items td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; }
    table.items tfoot td { font-weight: 700; background: #f9fafb; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; margin-top: 10px; width: 300px; border-collapse: collapse; }
    .totals td { padding: 4px 6px; }
    .totals .grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
    .void { color: #b91c1c; font-weight: 700; font-size: 14px; letter-spacing: 1px; }
    .signs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 56px; }
    .signs div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; color: #4b5563; }
    @media print { body { padding: 0; } }`;

function openPrint(title, html) {
    const win = window.open("", "_blank", "width=900,height=1000");

    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLE}</style></head>
<body>${html}<script>window.addEventListener("load", function () { window.focus(); window.print(); });<\/script></body></html>`);
    win.document.close();
}

function printHead(buyer, title, rows) {
    return `
<div class="head">
    <div><div class="org">${escapeHtml(buyer?.name || "")}</div><div class="muted">${escapeHtml(buyer?.address || "")}</div></div>
    <div class="title"><h1>${title}</h1>${rows}</div>
</div>`;
}

function printVoucher(p) {
    openPrint(`${p.pv_number} - Payment Voucher`, `
${printHead(p.buyer, "PAYMENT VOUCHER", `<div><strong>${escapeHtml(p.pv_number)}</strong></div><div class="muted">${formatDate(p.payment_date)}</div>
    ${p.status === "voided" ? `<div class="void">VOIDED</div><div class="muted">${escapeHtml(p.void_reason || "")}</div>` : ""}`)}
<div class="meta">
    <div><span>Payee</span>${escapeHtml(p.supplier_name)}${p.supplier_tin ? `<br>TIN ${escapeHtml(p.supplier_tin)}` : ""}</div>
    <div><span>Paid By</span>${escapeHtml(p.method_label)}${p.reference_no ? `<br>${escapeHtml(p.reference_no)}` : ""}${p.check_date ? `<br>dated ${formatDate(p.check_date)}` : ""}</div>
    <div><span>Paid From</span>${escapeHtml(p.paid_from || "—")}</div>
    <div><span>Withholding Tax</span>${p.ewt_rate ? `${p.ewt_rate}% EWT` : "None"}</div>
</div>
<table class="items">
    <thead><tr><th>AP No.</th><th>Supplier Invoice</th><th>PO</th><th class="num">Invoice Total</th><th class="num">Applied</th><th class="num">EWT</th><th class="num">Paid</th></tr></thead>
    <tbody>${p.allocations.map((a) => `
        <tr><td>${escapeHtml(a.ap_number)}</td><td>${escapeHtml(a.supplier_invoice_no)}<br><span class="muted">${formatDate(a.invoice_date)}</span></td><td>${escapeHtml(a.po_number)}</td>
            <td class="num">${formatMoney(a.invoice_total)}</td><td class="num">${formatMoney(a.amount_applied)}</td>
            <td class="num">${a.ewt_amount ? formatMoney(a.ewt_amount) : ""}</td><td class="num">${formatMoney(a.cash)}</td></tr>`).join("")}
    </tbody>
</table>
<table class="totals">
    <tr><td>Applied to invoices</td><td class="num">${formatMoney(p.total_applied)}</td></tr>
    <tr><td>Less: tax withheld</td><td class="num">(${formatMoney(p.ewt_amount)})</td></tr>
    <tr class="grand"><td>AMOUNT PAID</td><td class="num">${formatMoney(p.amount_paid)}</td></tr>
</table>
${p.notes ? `<p><strong>Notes:</strong> ${escapeHtml(p.notes)}</p>` : ""}
<div class="signs">
    <div>${p.created_by_name ? `<strong>${escapeHtml(p.created_by_name)}</strong><br>` : ""}Prepared by</div>
    <div>Checked by</div>
    <div>Approved by</div>
    <div>Received by (supplier) / Date</div>
</div>`);
}

function printAging(aging) {
    openPrint(`AP Aging ${aging.as_of}`, `
${printHead({}, "ACCOUNTS PAYABLE AGING", `<div class="muted">As of ${formatDate(aging.as_of)}</div>`)}
<table class="items">
    <thead><tr><th>Supplier</th>${BUCKETS.map(([, label]) => `<th class="num">${label}</th>`).join("")}<th class="num">Total</th></tr></thead>
    <tbody>${aging.suppliers.map((s) => `
        <tr><td><strong>${escapeHtml(s.supplier_name)}</strong></td>${BUCKETS.map(([key]) => `<td class="num">${s[key] ? formatMoney(s[key]) : ""}</td>`).join("")}<td class="num"><strong>${formatMoney(s.total)}</strong></td></tr>
        ${s.invoices.map((i) => `<tr><td class="muted" style="padding-left:18px;">${escapeHtml(i.ap_number)} · ${escapeHtml(i.supplier_invoice_no)} · due ${formatDate(i.due_date)}</td>
            ${BUCKETS.map(([key]) => `<td class="num muted">${i.bucket === key ? formatMoney(i.balance) : ""}</td>`).join("")}<td></td></tr>`).join("")}`).join("")}
    </tbody>
    <tfoot><tr><td>TOTAL</td>${BUCKETS.map(([key]) => `<td class="num">${formatMoney(aging.totals[key])}</td>`).join("")}<td class="num">${formatMoney(aging.totals.total)}</td></tr></tfoot>
</table>`);
}

function printLedger(ledger) {
    const period = [ledger.from ? `from ${formatDate(ledger.from)}` : null, ledger.to ? `to ${formatDate(ledger.to)}` : null].filter(Boolean).join(" ") || `as of ${formatDate(toDateInput(systemNow()))}`;

    openPrint(`Ledger - ${ledger.supplier.name}`, `
${printHead({}, "SUPPLIER LEDGER", `<div><strong>${escapeHtml(ledger.supplier.name)}</strong></div><div class="muted">${escapeHtml(period)}</div>`)}
<table class="items">
    <thead><tr><th>Date</th><th>Reference</th><th>Details</th><th class="num">Billed</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead>
    <tbody>
        <tr><td colspan="5"><strong>Opening balance</strong></td><td class="num"><strong>${formatMoney(ledger.opening_balance)}</strong></td></tr>
        ${ledger.entries.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${escapeHtml(e.reference)}</td><td>${escapeHtml(e.description)}${e.due_date ? ` · due ${formatDate(e.due_date)}` : ""}${e.ewt ? ` (incl. ${formatMoney(e.ewt)} EWT)` : ""}</td>
            <td class="num">${e.charge ? formatMoney(e.charge) : ""}</td><td class="num">${e.payment ? formatMoney(e.payment) : ""}</td><td class="num">${formatMoney(e.balance)}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><td colspan="3">Closing balance</td><td class="num">${formatMoney(ledger.total_charges)}</td><td class="num">${formatMoney(ledger.total_payments)}</td><td class="num">${formatMoney(ledger.closing_balance)}</td></tr></tfoot>
</table>`);
}

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(Number(value) * factor) / factor;
}
