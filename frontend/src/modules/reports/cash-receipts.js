import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { logReportRun } from "./report-history.js";

let currentReportData = [];

export async function initCashReceiptsReport() {
    await Promise.all([loadFacilities(), loadProviders()]);

    const submitBtn = document.getElementById("crSubmitBtn");
    const printBtn = document.getElementById("crPrintBtn");
    const csvBtn = document.getElementById("crCsvBtn");
    const detailsCheckbox = document.getElementById("crDetails");
    const proceduresCheckbox = document.getElementById("crProcedures");

    if (submitBtn) {
        submitBtn.addEventListener("click", fetchCashReceipts);
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

    if (proceduresCheckbox) {
        proceduresCheckbox.addEventListener("change", () => {
            toggleProcedureColumn(proceduresCheckbox.checked);
            renderTable(currentReportData);
        });
    }

    await fetchCashReceipts();
}

async function loadFacilities() {
    const select = document.getElementById("crFacility");
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
    const select = document.getElementById("crProvider");
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

function toggleProcedureColumn(show) {
    document.getElementById("crProcedureHeader").hidden = !show;
    document.getElementById("crProcedureFootCell").hidden = !show;
}

async function fetchCashReceipts() {
    const facilityId = document.getElementById("crFacility")?.value || "";
    const providerId = document.getElementById("crProvider")?.value || "";
    const dateType = document.getElementById("crDateType")?.value || "payment";
    const dateFrom = document.getElementById("crDateFrom")?.value || "";
    const dateTo = document.getElementById("crDateTo")?.value || "";
    const procedureCode = document.getElementById("crProcedure")?.value.trim() || "";
    const diagnosisCode = document.getElementById("crDiagnosis")?.value.trim() || "";

    document.getElementById("crRangeFrom").textContent = dateFrom;
    document.getElementById("crRangeTo").textContent = dateTo;

    const tbody = document.getElementById("crTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            provider_id: providerId,
            date_type: dateType,
            date_from: dateFrom,
            date_to: dateTo,
            procedure_code: procedureCode,
            diagnosis_code: diagnosisCode
        });

        const result = await api(`/reports/financial/cash-receipts?${params.toString()}`);

        if (result.success) {
            currentReportData = result.data || [];
            renderTable(currentReportData);
            logReportRun("Cash Receipts by Provider", "cash_receipts_by_provider", { facility_id: facilityId, provider_id: providerId, date_from: dateFrom, date_to: dateTo });
        } else {
            currentReportData = [];
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        currentReportData = [];
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function groupByProvider(data) {
    const groups = [];
    const byProvider = new Map();

    data.forEach((row) => {
        const name = `${row.provider_last_name}, ${row.provider_first_name}`.replace(/,\s*$/, "");

        if (!byProvider.has(name)) {
            const group = { name, payments: [], total: 0 };
            byProvider.set(name, group);
            groups.push(group);
        }

        const group = byProvider.get(name);
        const amount = Number(row.payment_amount || 0);

        group.payments.push({
            date: row.payment_date,
            amount,
            procedure: row.procedure_codes || ""
        });
        group.total += amount;
    });

    return groups;
}

function renderTable(data) {
    const tbody = document.getElementById("crTableBody");
    if (!tbody) return;

    const showDetails = document.getElementById("crDetails")?.checked;
    const showProcedures = document.getElementById("crProcedures")?.checked;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No cash receipts found for the selected criteria.</td></tr>`;
        updateGrandTotal(0);
        return;
    }

    const groups = groupByProvider(data);
    let grandTotal = 0;
    let rowsHtml = "";

    groups.forEach((group) => {
        if (showDetails) {
            group.payments.forEach((payment, index) => {
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px; color: #2d3748;">${index === 0 ? escapeHtml(group.name) : ""}</td>
                        ${showProcedures ? `<td style="padding: 8px; color: #2d3748;">${escapeHtml(payment.procedure)}</td>` : ""}
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(payment.date)}</td>
                        <td style="padding: 8px; color: #2d3748; text-align: right;">${payment.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            rowsHtml += `
                <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 8px; color: #2d3748;">${escapeHtml(group.name)}</td>
                    ${showProcedures ? `<td style="padding: 8px; color: #2d3748;"></td>` : ""}
                    <td style="padding: 8px; color: #2d3748;"></td>
                    <td style="padding: 8px; color: #2d3748; text-align: right;"></td>
                </tr>
            `;
        }

        rowsHtml += `
            <tr style="background-color: #e9e5f7;">
                <td style="padding: 8px; font-weight: bold; color: #44337a;">Totals for ${escapeHtml(group.name)}</td>
                ${showProcedures ? `<td style="padding: 8px;"></td>` : ""}
                <td style="padding: 8px;"></td>
                <td style="padding: 8px; font-weight: bold; color: #44337a; text-align: right;">${group.total.toFixed(2)}</td>
            </tr>
        `;

        grandTotal += group.total;
    });

    tbody.innerHTML = rowsHtml;
    updateGrandTotal(grandTotal);
}

function updateGrandTotal(amount) {
    document.getElementById("crGrandTotal").textContent = Number(amount).toFixed(2);
}

function exportToCsv() {
    if (currentReportData.length === 0) {
        alert("No data to export.");
        return;
    }

    const showProcedures = document.getElementById("crProcedures")?.checked;
    const groups = groupByProvider(currentReportData);
    const headers = showProcedures
        ? ["Practitioner", "Procedure", "Date", "Received"]
        : ["Practitioner", "Date", "Received"];
    const rows = [headers];

    groups.forEach((group) => {
        group.payments.forEach((payment, index) => {
            const row = [index === 0 ? group.name : "", payment.date, payment.amount.toFixed(2)];
            if (showProcedures) {
                row.splice(1, 0, payment.procedure);
            }
            rows.push(row);
        });

        const totalRow = ["Totals for " + group.name, "", group.total.toFixed(2)];
        if (showProcedures) {
            totalRow.splice(1, 0, "");
        }
        rows.push(totalRow);
    });

    const grandTotal = groups.reduce((sum, g) => sum + g.total, 0);
    const grandRow = ["Grand Totals", "", grandTotal.toFixed(2)];
    if (showProcedures) {
        grandRow.splice(1, 0, "");
    }
    rows.push(grandRow);

    const csvString = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "cash_receipts_by_provider_report.csv");
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

    const dateFrom = document.getElementById("crRangeFrom")?.textContent || "";
    const dateTo = document.getElementById("crRangeTo")?.textContent || "";
    const tableHtml = document.querySelector(".cr-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cash Receipts by Provider Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>Report - Cash Receipts by Provider</h1>
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
