import { searchInvoices, postEobPayment } from "./eob-posting.service.js";
import { showToast } from "../../core/toast.js";

const TYPE_LABELS = { unassigned: "Open", cleared: "Closed" };

export async function initEobPosting() {
    document.querySelectorAll("[data-eob-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.getAttribute("data-eob-tab")));
    });

    document.getElementById("eobPayDate").value = todayIso();

    document.getElementById("eobSearchBtn").addEventListener("click", runSearch);
}

function switchTab(tab) {
    document.querySelectorAll("[data-eob-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-eob-tab") === tab);
    });

    document.querySelectorAll("[data-eob-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-eob-panel") === tab);
    });
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

async function runSearch() {
    document.getElementById("eobAlert").innerHTML = "";

    const resultsWrap = document.getElementById("eobResultsWrap");
    const tbody = document.getElementById("eobResultsBody");

    resultsWrap.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="8" class="eob-empty-state">Searching...</td></tr>`;

    const result = await searchInvoices({
        name: document.getElementById("eobName").value.trim(),
        chart_id: document.getElementById("eobChartId").value.trim(),
        encounter: document.getElementById("eobEncounter").value,
        service_date_from: document.getElementById("eobServiceFrom").value,
        service_date_to: document.getElementById("eobServiceTo").value,
        type: document.getElementById("eobType").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="eob-empty-state">Failed to search invoices.</td></tr>`;
        return;
    }

    renderResults(result.data || []);
}

function renderResults(rows) {
    const tbody = document.getElementById("eobResultsBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="eob-empty-state">No invoices match your search.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.patient_name)}</td>
            <td>${escapeHtml(row.patient_no || "")}</td>
            <td>${row.encounter_id} -- ${escapeHtml(formatDate(row.date_of_service))}</td>
            <td>${escapeHtml(formatDate(row.date_of_service))}</td>
            <td class="eob-money">$${formatCurrency(row.total_charges)}</td>
            <td class="eob-money">$${formatCurrency(row.balance_due)}</td>
            <td>${TYPE_LABELS[row.bill_status] || row.bill_status}</td>
            <td><button type="button" class="eob-post-btn" data-post-encounter="${row.encounter_id}">Post</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-post-encounter]").forEach((btn) => {
        btn.addEventListener("click", () => postToInvoice(Number(btn.getAttribute("data-post-encounter"))));
    });
}

async function postToInvoice(encounterId) {
    document.getElementById("eobAlert").innerHTML = "";

    const amount = parseFloat(document.getElementById("eobAmount").value) || 0;
    const payDate = document.getElementById("eobPayDate").value;

    if (amount <= 0) {
        showAlert("eobAlert", "Enter an amount greater than zero in Post Item before posting.", "error");
        return;
    }

    if (!payDate) {
        showAlert("eobAlert", "Pay Date is required in Post Item before posting.", "error");
        return;
    }

    const result = await postEobPayment({
        encounter_id: encounterId,
        payer: document.getElementById("eobPayer").value,
        source: document.getElementById("eobSource").value.trim(),
        pay_date: payDate,
        deposit_date: document.getElementById("eobDepositDate").value,
        amount,
        pt_debt: document.getElementById("eobPtDebt").checked
    });

    if (!result.success) {
        showAlert("eobAlert", result.message || "Failed to post the payment.", "error");
        return;
    }

    showToast("Payment posted successfully.", "success");
    await runSearch();
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
