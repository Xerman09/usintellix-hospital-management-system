import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { logReportRun } from "./report-history.js";

let currentReportData = [];

export async function initFrontReceiptsReport() {
    await Promise.all([loadFacilities(), loadProviders()]);

    const submitBtn = document.getElementById("frSubmitBtn");
    const printBtn = document.getElementById("frPrintBtn");
    const csvBtn = document.getElementById("frCsvBtn");

    if (submitBtn) {
        submitBtn.addEventListener("click", fetchFrontReceipts);
    }

    if (printBtn) {
        printBtn.addEventListener("click", printReport);
    }

    if (csvBtn) {
        csvBtn.addEventListener("click", exportToCsv);
    }
}

async function loadFacilities() {
    const select = document.getElementById("frFacility");
    if (!select) return;

    const result = await fetchFacilities();

    if (result.success) {
        result.data.forEach((facility) => {
            const option = document.createElement("option");
            option.value = facility.id;
            option.textContent = facility.name;
            select.appendChild(option);
        });
    }
}

async function loadProviders() {
    const select = document.getElementById("frProvider");
    if (!select) return;

    const result = await fetchProviders();

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");
            option.value = provider.id;
            option.textContent = `${provider.last_name}, ${provider.first_name}`;
            select.appendChild(option);
        });
    }
}

async function fetchFrontReceipts() {
    const facilityId = document.getElementById("frFacility")?.value || "";
    const providerId = document.getElementById("frProvider")?.value || "";
    const dateFrom = document.getElementById("frDateFrom")?.value || "";
    const dateTo = document.getElementById("frDateTo")?.value || "";

    const instructionText = document.getElementById("frInstructionText");
    const resultsArea = document.getElementById("frResultsArea");
    const printBtn = document.getElementById("frPrintBtn");
    const csvBtn = document.getElementById("frCsvBtn");
    const tbody = document.getElementById("frTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";
    if (printBtn) printBtn.style.display = "flex";
    if (csvBtn) csvBtn.style.display = "flex";

    tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            provider_id: providerId,
            date_from: dateFrom,
            date_to: dateTo
        });

        const result = await api(`/reports/financial/front-receipts?${params.toString()}`);

        if (result.success) {
            currentReportData = result.data || [];
            renderTable(currentReportData);
            logReportRun("Front Office Receipts", "front_office_receipts", { facility_id: facilityId, provider_id: providerId, date_from: dateFrom, date_to: dateTo });
        } else {
            currentReportData = [];
            tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        currentReportData = [];
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("frTableBody");
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No receipts found for the selected criteria.</td></tr>`;
        updateTotals(0, 0, 0);
        return;
    }

    let totalToday = 0;
    let totalPrevious = 0;
    let totalGrand = 0;

    tbody.innerHTML = data.map((row) => {
        const today = Number(row.today_amount || 0);
        const previous = Number(row.previous_amount || 0);
        const total = Number(row.payment_amount || 0);

        totalToday += today;
        totalPrevious += previous;
        totalGrand += total;

        return `
            <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 8px; color: #2d3748;">${escapeHtml(row.time || "")}</td>
                <td style="padding: 8px; color: #2d3748;">${escapeHtml(row.patient_name || "")}</td>
                <td style="padding: 8px; color: #2d3748;">${escapeHtml(row.patient_no || "")}</td>
                <td style="padding: 8px; color: #2d3748;">${escapeHtml(row.method || "")}</td>
                <td style="padding: 8px; color: #2d3748;">${escapeHtml(row.source || "")}</td>
                <td style="padding: 8px; color: #2d3748; text-align: right;">${today.toFixed(2)}</td>
                <td style="padding: 8px; color: #2d3748; text-align: right;">${previous.toFixed(2)}</td>
                <td style="padding: 8px; color: #2d3748; text-align: right;">${total.toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    updateTotals(totalToday, totalPrevious, totalGrand);
}

function updateTotals(today, previous, grand) {
    document.getElementById("frTotalToday").textContent = Number(today).toFixed(2);
    document.getElementById("frTotalPrevious").textContent = Number(previous).toFixed(2);
    document.getElementById("frTotalGrand").textContent = Number(grand).toFixed(2);
}

function exportToCsv() {
    if (currentReportData.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = ["Time", "Patient", "ID", "Method", "Source", "Today", "Previous", "Total"];
    const rows = [headers];

    let totalToday = 0;
    let totalPrevious = 0;
    let totalGrand = 0;

    currentReportData.forEach((row) => {
        const today = Number(row.today_amount || 0);
        const previous = Number(row.previous_amount || 0);
        const total = Number(row.payment_amount || 0);

        totalToday += today;
        totalPrevious += previous;
        totalGrand += total;

        rows.push([
            row.time || "",
            row.patient_name || "",
            row.patient_no || "",
            row.method || "",
            row.source || "",
            today.toFixed(2),
            previous.toFixed(2),
            total.toFixed(2)
        ]);
    });

    rows.push(["Totals", "", "", "", "", totalToday.toFixed(2), totalPrevious.toFixed(2), totalGrand.toFixed(2)]);

    const csvString = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "front_office_receipts_report.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function printReport() {
    const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to print the report.");
        return;
    }

    const dateFrom = document.getElementById("frDateFrom")?.value || "";
    const dateTo = document.getElementById("frDateTo")?.value || "";
    const tableHtml = document.querySelector(".fr-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Front Office Receipts Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>Report - Front Office Receipts</h1>
            <p>Report Date ${dateFrom} - ${dateTo}</p>
            ${tableHtml}
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
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
