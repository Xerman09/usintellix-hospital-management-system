import { fetchPatientLedger } from "./billing.service.js";

export function initBilling() {
    const form = document.getElementById("billingSummaryForm");
    if (!form) return;

    // Set default dates
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);

    const toInput = document.getElementById("billing_to");
    const fromInput = document.getElementById("billing_from");

    if (toInput) toInput.value = today.toISOString().split("T")[0];
    if (fromInput) fromInput.value = lastYear.toISOString().split("T")[0];

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadLedger();
    });

    loadLedger();
}

async function loadLedger() {
    const results = document.getElementById("billingResults");

    if (!results) return;

    const from = document.getElementById("billing_from").value;
    const to = document.getElementById("billing_to").value;

    results.innerHTML = `<div class="table-empty">Loading...</div>`;

    try {
        const result = await fetchPatientLedger({ from, to });

        if (!result.success) {
            results.innerHTML = `<div class="table-empty">${escapeHtml(result.message || "Unable to load billing records.")}</div>`;
            return;
        }

        renderLedger(results, result.data);
    } catch (error) {
        console.error("Failed to load billing ledger", error);
        results.innerHTML = `<div class="table-empty">Unable to reach the server. Please try again.</div>`;
    }
}

function renderLedger(container, data) {
    const { rows, totals } = data;

    const summary = `
        <div class="billing-summary">
            <div class="billing-summary-item">
                <span class="billing-summary-label">Total Charges</span>
                <span class="billing-summary-value">${formatMoney(totals.charge)}</span>
            </div>
            <div class="billing-summary-item">
                <span class="billing-summary-label">Total Payments</span>
                <span class="billing-summary-value">${formatMoney(totals.payment)}</span>
            </div>
            <div class="billing-summary-item">
                <span class="billing-summary-label">Adjustments</span>
                <span class="billing-summary-value">${formatMoney(totals.adjustment)}</span>
            </div>
            <div class="billing-summary-item billing-summary-balance">
                <span class="billing-summary-label">Balance Due</span>
                <span class="billing-summary-value">${formatMoney(totals.balance)}</span>
            </div>
        </div>
    `;

    if (!rows.length) {
        container.innerHTML = summary + `<div class="table-empty">No billing records found for the selected date range.</div>`;
        return;
    }

    const tableRows = rows.map((row) => `
        <tr>
            <td>${formatDate(row.billed_date)}</td>
            <td>${escapeHtml(row.description || row.code || "-")}</td>
            <td>${row.charge ? formatMoney(row.charge) : "-"}</td>
            <td>${row.payment ? formatMoney(row.payment) : "-"}</td>
            <td>${row.adjustment ? formatMoney(row.adjustment) : "-"}</td>
            <td>${formatMoney(row.balance)}</td>
        </tr>
    `).join("");

    container.innerHTML = summary + `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr><th>Date</th><th>Description</th><th>Charge</th><th>Payment</th><th>Adjustment</th><th>Balance</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

function formatMoney(value) {
    return (Number(value) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
