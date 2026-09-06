import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { logReportRun } from "./report-history.js";

let currentReportData = [];

export async function initReceiptsSummaryReport() {
    await Promise.all([loadFacilities(), loadProviders()]);

    const submitBtn = document.getElementById("rsSubmitBtn");
    const printBtn = document.getElementById("rsPrintBtn");
    const csvBtn = document.getElementById("rsCsvBtn");
    const detailsCheckbox = document.getElementById("rsDetails");

    if (submitBtn) {
        submitBtn.addEventListener("click", fetchReceiptsSummary);
    }

    if (printBtn) {
        printBtn.addEventListener("click", printReport);
    }

    if (csvBtn) {
        csvBtn.addEventListener("click", exportToCsv);
    }

    if (detailsCheckbox) {
        detailsCheckbox.addEventListener("change", () => renderTable(currentReportData));
    }
}

async function loadFacilities() {
    const select = document.getElementById("rsFacility");
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
    const select = document.getElementById("rsProvider");
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

async function fetchReceiptsSummary() {
    const reportBy = document.getElementById("rsReportBy")?.value || "payer";
    const facilityId = document.getElementById("rsFacility")?.value || "";
    const providerId = document.getElementById("rsProvider")?.value || "";
    const procedureCode = document.getElementById("rsProcedure")?.value.trim() || "";
    const dateType = document.getElementById("rsDateType")?.value || "payment";
    const dateFrom = document.getElementById("rsDateFrom")?.value || "";
    const dateTo = document.getElementById("rsDateTo")?.value || "";

    const instructionText = document.getElementById("rsInstructionText");
    const resultsArea = document.getElementById("rsResultsArea");
    const printBtn = document.getElementById("rsPrintBtn");
    const csvBtn = document.getElementById("rsCsvBtn");
    const tbody = document.getElementById("rsTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";
    if (printBtn) printBtn.style.display = "flex";
    if (csvBtn) csvBtn.style.display = "flex";

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            report_by: reportBy,
            facility_id: facilityId,
            provider_id: providerId,
            procedure_code: procedureCode,
            date_type: dateType,
            date_from: dateFrom,
            date_to: dateTo
        });

        const result = await api(`/reports/financial/receipts-summary?${params.toString()}`);

        if (result.success) {
            currentReportData = result.data || [];
            renderTable(currentReportData);
            logReportRun("Receipts Summary", "receipts_summary", { report_by: reportBy, facility_id: facilityId, provider_id: providerId, date_from: dateFrom, date_to: dateTo });
        } else {
            currentReportData = [];
            tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        currentReportData = [];
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function groupByLabel(data) {
    const groups = [];
    const byLabel = new Map();

    data.forEach((row) => {
        const label = row.group_label || "Unassigned";

        if (!byLabel.has(label)) {
            const group = { label, lines: [], adjustments: 0, payments: 0 };
            byLabel.set(label, group);
            groups.push(group);
        }

        const group = byLabel.get(label);
        const adjustments = Number(row.adjustment_amount || 0);
        const payments = Number(row.payment_amount || 0);

        group.lines.push({
            method: row.method || "",
            reference: row.reference || "",
            date: row.payment_date || "",
            invoice: row.invoice || "",
            patient: row.patient_name || "",
            policy: row.policy_number || "",
            dos: row.date_of_service ? String(row.date_of_service).slice(0, 10) : "",
            procedure: row.procedure_codes || "",
            adjustments,
            payments
        });

        group.adjustments += adjustments;
        group.payments += payments;
    });

    return groups;
}

function renderTable(data) {
    const tbody = document.getElementById("rsTableBody");
    if (!tbody) return;

    const showDetails = document.getElementById("rsDetails")?.checked;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No receipts found for the selected criteria.</td></tr>`;
        updateGrandTotal(0, 0);
        return;
    }

    const groups = groupByLabel(data);
    let grandAdjustments = 0;
    let grandPayments = 0;
    let rowsHtml = "";

    groups.forEach((group) => {
        if (showDetails) {
            group.lines.forEach((line, index) => {
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.method)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.reference)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.date)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.invoice)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.patient)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.policy)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.dos)}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(line.procedure)}</td>
                        <td style="padding: 8px; color: #2d3748; text-align: right;">${line.adjustments.toFixed(2)}</td>
                        <td style="padding: 8px; color: #2d3748; text-align: right;">${line.payments.toFixed(2)}</td>
                    </tr>
                `;
            });

            rowsHtml += `
                <tr style="background-color: #fde8e8;">
                    <td colspan="8" style="padding: 8px; font-weight: bold; color: #742a2a;">Total for ${escapeHtml(group.label)}</td>
                    <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.adjustments.toFixed(2)}</td>
                    <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.payments.toFixed(2)}</td>
                </tr>
            `;
        } else {
            rowsHtml += `
                <tr style="background-color: #fde8e8;">
                    <td colspan="8" style="padding: 8px; font-weight: bold; color: #742a2a;">${escapeHtml(group.label)}</td>
                    <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.adjustments.toFixed(2)}</td>
                    <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.payments.toFixed(2)}</td>
                </tr>
            `;
        }

        grandAdjustments += group.adjustments;
        grandPayments += group.payments;
    });

    tbody.innerHTML = rowsHtml;
    updateGrandTotal(grandAdjustments, grandPayments);
}

function updateGrandTotal(adjustments, payments) {
    document.getElementById("rsGrandAdjustments").textContent = Number(adjustments).toFixed(2);
    document.getElementById("rsGrandPayments").textContent = Number(payments).toFixed(2);
}

function exportToCsv() {
    if (currentReportData.length === 0) {
        alert("No data to export.");
        return;
    }

    const showDetails = document.getElementById("rsDetails")?.checked;
    const groups = groupByLabel(currentReportData);
    const headers = ["Method", "Reference", "Date", "Invoice", "Patient", "Policy", "DOS", "Procedure", "Adjustments", "Payments"];
    const rows = [headers];

    groups.forEach((group) => {
        if (showDetails) {
            group.lines.forEach((line) => {
                rows.push([
                    line.method, line.reference, line.date, line.invoice, line.patient,
                    line.policy, line.dos, line.procedure, line.adjustments.toFixed(2), line.payments.toFixed(2)
                ]);
            });
        }

        rows.push([group.label, "", "", "", "", "", "", "", group.adjustments.toFixed(2), group.payments.toFixed(2)]);
    });

    const grandAdjustments = groups.reduce((sum, g) => sum + g.adjustments, 0);
    const grandPayments = groups.reduce((sum, g) => sum + g.payments, 0);
    rows.push(["Grand Total", "", "", "", "", "", "", "", grandAdjustments.toFixed(2), grandPayments.toFixed(2)]);

    const csvString = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "receipts_summary_report.csv");
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

    const dateFrom = document.getElementById("rsDateFrom")?.value || "";
    const dateTo = document.getElementById("rsDateTo")?.value || "";
    const tableHtml = document.querySelector(".rs-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipts Summary Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>Report - Receipts Summary</h1>
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
