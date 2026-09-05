import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { logReportRun } from "./report-history.js";

let currentReportData = [];

export async function initSalesByItemReport() {
    await Promise.all([loadFacilities(), loadProviders()]);

    const submitBtn = document.getElementById("sbiSubmitBtn");
    const printBtn = document.getElementById("sbiPrintBtn");
    const csvBtn = document.getElementById("sbiCsvBtn");
    const detailsCheckbox = document.getElementById("sbiDetails");

    if (submitBtn) {
        submitBtn.addEventListener("click", fetchSalesByItem);
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

    // Load with today's date range as soon as the report opens, same as
    // the other financial/visit reports default to an immediate result
    // instead of an empty form.
    await fetchSalesByItem();
}

async function loadFacilities() {
    const select = document.getElementById("sbiFacility");
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
    const select = document.getElementById("sbiProvider");
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

async function fetchSalesByItem() {
    const facilityId = document.getElementById("sbiFacility")?.value || "";
    const dateFrom = document.getElementById("sbiDateFrom")?.value || "";
    const dateTo = document.getElementById("sbiDateTo")?.value || "";
    const providerId = document.getElementById("sbiProvider")?.value || "";

    document.getElementById("sbiRangeFrom").textContent = dateFrom;
    document.getElementById("sbiRangeTo").textContent = dateTo;

    const tbody = document.getElementById("sbiTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            provider_id: providerId
        });

        const result = await api(`/reports/financial/sales-by-item?${params.toString()}`);

        if (result.success) {
            currentReportData = result.data || [];
            renderTable(currentReportData);
            logReportRun("Sales by Item", "sales_by_item", { facility_id: facilityId, date_from: dateFrom, date_to: dateTo, provider_id: providerId });
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

function groupByCategory(data) {
    const groups = [];
    const byCategory = new Map();

    data.forEach((row) => {
        if (!byCategory.has(row.category)) {
            const group = { category: row.category, items: [], qty: 0, amount: 0 };
            byCategory.set(row.category, group);
            groups.push(group);
        }

        const group = byCategory.get(row.category);
        const qty = Number(row.qty || 0);
        const amount = Number(row.amount || 0);

        group.items.push({ item: row.item, qty, amount });
        group.qty += qty;
        group.amount += amount;
    });

    return groups;
}

function renderTable(data) {
    const tbody = document.getElementById("sbiTableBody");
    if (!tbody) return;

    const showDetails = document.getElementById("sbiDetails")?.checked;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No sales found for the selected criteria.</td></tr>`;
        updateGrandTotal(0, 0);
        return;
    }

    const groups = groupByCategory(data);
    let grandQty = 0;
    let grandAmount = 0;
    let rowsHtml = "";

    groups.forEach((group) => {
        if (showDetails) {
            group.items.forEach((item, index) => {
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px; color: #2d3748;">${index === 0 ? escapeHtml(group.category) : ""}</td>
                        <td style="padding: 8px; color: #2d3748;">${escapeHtml(item.item)}</td>
                        <td style="padding: 8px; color: #2d3748; text-align: right;">${item.qty}</td>
                        <td style="padding: 8px; color: #2d3748; text-align: right;">${item.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            rowsHtml += `
                <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 8px; color: #2d3748;">${escapeHtml(group.category)}</td>
                    <td style="padding: 8px; color: #2d3748;"></td>
                    <td style="padding: 8px; color: #2d3748; text-align: right;"></td>
                    <td style="padding: 8px; color: #2d3748; text-align: right;"></td>
                </tr>
            `;
        }

        rowsHtml += `
            <tr style="background-color: #fde8e8;">
                <td style="padding: 8px;"></td>
                <td style="padding: 8px; font-weight: bold; color: #742a2a;">Total for category</td>
                <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.qty}</td>
                <td style="padding: 8px; font-weight: bold; color: #742a2a; text-align: right;">${group.amount.toFixed(2)}</td>
            </tr>
        `;

        grandQty += group.qty;
        grandAmount += group.amount;
    });

    tbody.innerHTML = rowsHtml;
    updateGrandTotal(grandQty, grandAmount);
}

function updateGrandTotal(qty, amount) {
    document.getElementById("sbiGrandQty").textContent = qty;
    document.getElementById("sbiGrandAmount").textContent = Number(amount).toFixed(2);
}

function exportToCsv() {
    if (currentReportData.length === 0) {
        alert("No data to export.");
        return;
    }

    const groups = groupByCategory(currentReportData);
    const rows = [["Category", "Item", "Qty", "Amount"]];

    groups.forEach((group) => {
        group.items.forEach((item, index) => {
            rows.push([index === 0 ? group.category : "", item.item, item.qty, item.amount.toFixed(2)]);
        });
        rows.push(["", "Total for category", group.qty, group.amount.toFixed(2)]);
    });

    const grandQty = groups.reduce((sum, g) => sum + g.qty, 0);
    const grandAmount = groups.reduce((sum, g) => sum + g.amount, 0);
    rows.push(["", "Grand Total", grandQty, grandAmount.toFixed(2)]);

    const csvString = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "sales_by_item_report.csv");
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

    const dateFrom = document.getElementById("sbiRangeFrom")?.textContent || "";
    const dateTo = document.getElementById("sbiRangeTo")?.textContent || "";
    const tableHtml = document.querySelector(".sbi-report-wrapper table")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales by Item Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>Report - Sales by Item</h1>
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
