import { fetchPaymentProcessing } from "./payment-processing.service.js";
import { logReportRun } from "./report-history.js";

const SERVICE_LABELS = {
    check: "Check Payment",
    cash: "Cash",
    credit_card: "Credit Card",
    eft: "EFT / Direct Deposit",
    other: "Other"
};

export async function initPaymentProcessingReport() {
    document.getElementById("ppSubmitBtn")?.addEventListener("click", fetchReport);
}

async function fetchReport() {
    const service = document.getElementById("ppService")?.value || "";
    const patient = document.getElementById("ppPatient")?.value.trim() || "";
    const dateFrom = (document.getElementById("ppDateFrom")?.value || "").slice(0, 10);
    const dateTo = (document.getElementById("ppDateTo")?.value || "").slice(0, 10);
    const ticket = document.getElementById("ppTicket")?.value.trim() || "";
    const transactionId = document.getElementById("ppTransactionId")?.value.trim() || "";

    const instructionText = document.getElementById("ppInstructionText");
    const resultsArea = document.getElementById("ppResultsArea");
    const tbody = document.getElementById("ppTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="6" class="pp-empty-state">Loading data...</td></tr>`;

    const result = await fetchPaymentProcessing({
        service,
        patient,
        date_from: dateFrom,
        date_to: dateTo,
        ticket,
        transaction_id: transactionId
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="pp-empty-state">Failed to load data.</td></tr>`;
        return;
    }

    renderTable(result.data || []);
    logReportRun("Payment Processing", "payment_processing", {
        service, patient, date_from: dateFrom, date_to: dateTo, ticket, transaction_id: transactionId
    });
}

function renderTable(rows) {
    const tbody = document.getElementById("ppTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="pp-empty-state">No processed payments found for the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${formatDate(row.payment_date)}</td>
            <td>${escapeHtml(SERVICE_LABELS[row.service] || row.service || "-")}</td>
            <td>${escapeHtml(row.patient || "-")}</td>
            <td>${escapeHtml(String(row.ticket))}</td>
            <td>${escapeHtml(row.transaction_id || "-")}</td>
            <td style="text-align: right;">${Number(row.amount || 0).toFixed(2)}</td>
        </tr>
    `).join("");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
