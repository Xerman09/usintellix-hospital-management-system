import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { fetchInsurances } from "../insurances/insurances.service.js";
import { showToast } from "../../core/toast.js";
import { logReportRun } from "./report-history.js";
import { DISPLAY_COLUMNS } from "./collections.view.js";

let currentRows = [];
let currentAgingLabels = [];
const selectedEncounterIds = new Set();

export async function initCollectionsReport() {
    await Promise.all([loadFacilities(), loadProviders(), loadPayors()]);

    document.getElementById("colSubmitBtn")?.addEventListener("click", fetchCollections);
    document.getElementById("colPrintBtn")?.addEventListener("click", printReport);
    document.getElementById("colSelectAllBtn")?.addEventListener("click", selectAllRows);
    document.getElementById("colClearAllBtn")?.addEventListener("click", clearAllRows);
    document.getElementById("colExportCsvBtn")?.addEventListener("click", exportSelectedToCsv);

    document.getElementById("colExportCollectionsBtn")?.addEventListener("click", () => {
        if (selectedEncounterIds.size === 0) {
            showToast("Select at least one row first.", "error");
            return;
        }
        showToast("Sending accounts to a collections agency isn't wired up yet -- there's no collections-tracking feature in this system.", "error");
    });

    document.getElementById("colClearDebtBtn")?.addEventListener("click", () => {
        if (selectedEncounterIds.size === 0) {
            showToast("Select at least one row first.", "error");
            return;
        }
        showToast("Writing off insurance debt isn't wired up yet -- there's no ledger-adjustment feature for this in the system.", "error");
    });

    document.querySelectorAll(".col-toggle").forEach((checkbox) => {
        checkbox.addEventListener("change", () => renderTable());
    });
}

async function loadFacilities() {
    const select = document.getElementById("colFacility");
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
    const select = document.getElementById("colProvider");
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

async function loadPayors() {
    const select = document.getElementById("colPayor");
    if (!select) return;

    const result = await fetchInsurances();

    if (result.success) {
        result.data.forEach((insurance) => {
            const option = document.createElement("option");
            option.value = insurance.id;
            option.textContent = insurance.name;
            select.appendChild(option);
        });
    }
}

async function fetchCollections() {
    const dateFrom = document.getElementById("colDateFrom")?.value || "";
    const dateTo = document.getElementById("colDateTo")?.value || "";
    const status = document.getElementById("colStatus")?.value || "open";
    const facilityId = document.getElementById("colFacility")?.value || "";
    const payorId = document.getElementById("colPayor")?.value || "";
    const ageBy = document.getElementById("colAgeBy")?.value || "service";
    const providerId = document.getElementById("colProvider")?.value || "";
    const agingColumns = document.getElementById("colAgingColumns")?.value || "3";
    const daysPerCol = document.getElementById("colDaysPerCol")?.value || "30";
    const patientsWithDebt = document.getElementById("colPatientsWithDebt")?.checked ? "1" : "";

    const instructionText = document.getElementById("colInstructionText");
    const resultsArea = document.getElementById("colResultsArea");
    const printBtn = document.getElementById("colPrintBtn");
    const tbody = document.getElementById("colTableBody");

    if (!tbody || !resultsArea) return;

    if (instructionText) instructionText.style.display = "none";
    resultsArea.style.display = "block";
    if (printBtn) printBtn.style.display = "flex";

    tbody.innerHTML = `<tr><td style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            status,
            facility_id: facilityId,
            payor_id: payorId,
            age_by: ageBy,
            provider_id: providerId,
            aging_columns: agingColumns,
            days_per_col: daysPerCol,
            patients_with_debt: patientsWithDebt
        });

        const result = await api(`/reports/financial/collections?${params.toString()}`);

        if (result.success) {
            currentRows = result.data.rows || [];
            currentAgingLabels = result.data.columns || [];
            selectedEncounterIds.clear();
            renderTable();
            logReportRun("Collections", "collections", { date_from: dateFrom, date_to: dateTo, status });
        } else {
            currentRows = [];
            currentAgingLabels = [];
            tbody.innerHTML = `<tr><td style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        currentRows = [];
        currentAgingLabels = [];
        tbody.innerHTML = `<tr><td style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function getVisibleColumns() {
    return DISPLAY_COLUMNS.filter((col) => document.querySelector(`.col-toggle[data-col="${col.key}"]`)?.checked);
}

function renderTable() {
    const thead = document.getElementById("colTableHead");
    const tbody = document.getElementById("colTableBody");
    const tfoot = document.getElementById("colTableFoot");
    if (!thead || !tbody || !tfoot) return;

    const visibleColumns = getVisibleColumns();
    const totalCols = 1 + visibleColumns.length + 5 + currentAgingLabels.length + 2 + 1;

    thead.innerHTML = `
        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
            <th style="padding: 8px; text-align: left; white-space: nowrap;">Name</th>
            ${visibleColumns.map((col) => `<th style="padding: 8px; text-align: left; white-space: nowrap;">${escapeHtml(col.label)}</th>`).join("")}
            <th style="padding: 8px; text-align: left; white-space: nowrap;">Invoice</th>
            <th style="padding: 8px; text-align: left; white-space: nowrap;">Svc Date</th>
            <th style="padding: 8px; text-align: right; white-space: nowrap;">Charge</th>
            <th style="padding: 8px; text-align: right; white-space: nowrap;">Adjust</th>
            <th style="padding: 8px; text-align: right; white-space: nowrap;">Paid</th>
            ${currentAgingLabels.map((label) => `<th style="padding: 8px; text-align: right; white-space: nowrap;">${escapeHtml(label)}</th>`).join("")}
            <th style="padding: 8px; text-align: right; white-space: nowrap;">Aging Days</th>
            <th style="padding: 8px; text-align: right; white-space: nowrap;">Prv</th>
            <th style="padding: 8px; text-align: center; white-space: nowrap;">Sel</th>
        </tr>
    `;

    if (currentRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalCols}" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No open invoices found for the selected criteria.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    let totalCharge = 0;
    let totalAdjust = 0;
    let totalPaid = 0;
    const totalAging = new Array(currentAgingLabels.length).fill(0);

    tbody.innerHTML = currentRows.map((row, index) => {
        const rowBg = index % 2 === 0 ? "#eef2ff" : "#fdf2f8";
        const checked = selectedEncounterIds.has(row.encounter_id) ? "checked" : "";

        totalCharge += Number(row.charge || 0);
        totalAdjust += Number(row.adjust || 0);
        totalPaid += Number(row.paid || 0);
        (row.aging || []).forEach((amount, i) => { totalAging[i] += Number(amount || 0); });

        const columnCells = visibleColumns.map((col) => `<td style="padding: 8px;">${escapeHtml(formatCell(row, col.key))}</td>`).join("");
        const agingCells = (row.aging || []).map((amount) => `<td style="padding: 8px; text-align: right;">${Number(amount || 0) > 0 ? Number(amount).toFixed(2) : ""}</td>`).join("");

        return `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 8px;">${escapeHtml(row.name)}</td>
                ${columnCells}
                <td style="padding: 8px;"><a href="#" style="color: #2c5282;">${escapeHtml(row.invoice)}</a></td>
                <td style="padding: 8px;">${escapeHtml(row.svc_date)}</td>
                <td style="padding: 8px; text-align: right;">${Number(row.charge || 0).toFixed(2)}</td>
                <td style="padding: 8px; text-align: right;">${Number(row.adjust || 0) > 0 ? Number(row.adjust).toFixed(2) : ""}</td>
                <td style="padding: 8px; text-align: right;">${Number(row.paid || 0) > 0 ? Number(row.paid).toFixed(2) : ""}</td>
                ${agingCells}
                <td style="padding: 8px; text-align: right;">${row.aging_days}</td>
                <td style="padding: 8px; text-align: right;">${row.prv}</td>
                <td style="padding: 8px; text-align: center;"><input type="checkbox" class="col-row-select" data-encounter-id="${row.encounter_id}" ${checked}></td>
            </tr>
        `;
    }).join("");

    tfoot.innerHTML = `
        <tr style="border-top: 2px solid #2d3748;">
            <td colspan="${1 + visibleColumns.length + 2}" style="padding: 8px; font-weight: bold;">Report Totals:</td>
            <td style="padding: 8px; font-weight: bold; text-align: right;">${totalCharge.toFixed(2)}</td>
            <td style="padding: 8px; font-weight: bold; text-align: right;">${totalAdjust.toFixed(2)}</td>
            <td style="padding: 8px; font-weight: bold; text-align: right;">${totalPaid.toFixed(2)}</td>
            ${totalAging.map((amount) => `<td style="padding: 8px; font-weight: bold; text-align: right;">${amount.toFixed(2)}</td>`).join("")}
            <td colspan="3" style="padding: 8px;"></td>
        </tr>
    `;

    tbody.querySelectorAll(".col-row-select").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const encounterId = Number(event.target.getAttribute("data-encounter-id"));
            if (event.target.checked) {
                selectedEncounterIds.add(encounterId);
            } else {
                selectedEncounterIds.delete(encounterId);
            }
        });
    });
}

function formatCell(row, key) {
    switch (key) {
        case "ssn": return "";
        case "dob": return row.dob || "";
        case "id": return row.patient_no || "";
        case "policy": return row.policy_number || "";
        case "phone": return row.phone || "";
        case "city": return row.city || "";
        case "primary_ins": return row.primary_ins || "";
        case "referrer": return row.referrer || "";
        case "act_date": return row.act_date || "";
        case "inactive_days": return row.inactive_days ?? "";
        case "errors": return "";
        case "group_number": return row.group_number || "";
        default: return "";
    }
}

function selectAllRows() {
    currentRows.forEach((row) => selectedEncounterIds.add(row.encounter_id));
    renderTable();
}

function clearAllRows() {
    selectedEncounterIds.clear();
    renderTable();
}

function exportSelectedToCsv() {
    const includeZeroBalances = document.getElementById("colExportZeroBalances")?.checked;
    const individualInvoices = document.getElementById("colExportIndividualInvoices")?.checked ?? true;

    let rowsToExport = currentRows.filter((row) => selectedEncounterIds.has(row.encounter_id));

    if (rowsToExport.length === 0) {
        showToast("Select at least one row first.", "error");
        return;
    }

    if (!includeZeroBalances) {
        rowsToExport = rowsToExport.filter((row) => Number(row.balance || 0) !== 0);
    }

    if (rowsToExport.length === 0) {
        showToast("Nothing to export -- every selected row has a zero balance and \"Export Zero Balances\" is unchecked.", "error");
        return;
    }

    const visibleColumns = getVisibleColumns();
    const headers = ["Name", ...visibleColumns.map((c) => c.label), "Invoice", "Svc Date", "Charge", "Adjust", "Paid", ...currentAgingLabels, "Aging Days"];
    const csvRows = [headers];

    if (individualInvoices) {
        rowsToExport.forEach((row) => {
            csvRows.push([
                row.name,
                ...visibleColumns.map((c) => formatCell(row, c.key)),
                row.invoice,
                row.svc_date,
                Number(row.charge || 0).toFixed(2),
                Number(row.adjust || 0).toFixed(2),
                Number(row.paid || 0).toFixed(2),
                ...(row.aging || []).map((a) => Number(a || 0).toFixed(2)),
                row.aging_days
            ]);
        });
    } else {
        // One row per patient: sum every selected invoice belonging to them.
        const byPatient = new Map();

        rowsToExport.forEach((row) => {
            if (!byPatient.has(row.patient_id)) {
                byPatient.set(row.patient_id, {
                    ...row,
                    charge: 0,
                    adjust: 0,
                    paid: 0,
                    aging: new Array(currentAgingLabels.length).fill(0),
                    invoice: "",
                    svc_date: "",
                    aging_days: ""
                });
            }

            const acc = byPatient.get(row.patient_id);
            acc.charge += Number(row.charge || 0);
            acc.adjust += Number(row.adjust || 0);
            acc.paid += Number(row.paid || 0);
            (row.aging || []).forEach((amount, i) => { acc.aging[i] += Number(amount || 0); });
        });

        byPatient.forEach((row) => {
            csvRows.push([
                row.name,
                ...visibleColumns.map((c) => formatCell(row, c.key)),
                row.invoice,
                row.svc_date,
                row.charge.toFixed(2),
                row.adjust.toFixed(2),
                row.paid.toFixed(2),
                ...row.aging.map((a) => a.toFixed(2)),
                row.aging_days
            ]);
        });
    }

    const csvString = csvRows
        .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "collections_report.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function printReport() {
    const reportWindow = window.open("", "_blank", "width=1200,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to print the report.");
        return;
    }

    const tableHtml = document.querySelector(".col-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Collections Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>Report - Collections</h1>
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
