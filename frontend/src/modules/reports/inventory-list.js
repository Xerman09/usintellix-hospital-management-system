import { fetchDrugInventory, fetchDrugInventoryOptions } from "../drug-inventory/drug-inventory.service.js";

let allRows = [];

export async function initInventoryListReport() {
    await loadOptions();

    document.getElementById("ilFacilityFilter").addEventListener("change", loadInventory);
    document.getElementById("ilWarehouseFilter").addEventListener("change", loadInventory);
    document.getElementById("ilProductTypeFilter").addEventListener("change", loadInventory);
    document.getElementById("ilDaysFilter").addEventListener("change", loadInventory);
    document.getElementById("ilShowInactive").addEventListener("change", loadInventory);
    document.getElementById("ilViewMode").addEventListener("change", render);
    document.getElementById("ilRefreshBtn").addEventListener("click", loadInventory);
    document.getElementById("ilExportCsvBtn").addEventListener("click", exportToCsv);
    document.getElementById("ilPrintBtn").addEventListener("click", printReport);

    await loadInventory();
}

async function loadOptions() {
    const result = await fetchDrugInventoryOptions();
    const options = result.success ? result.data : { warehouses: [], facilities: [], product_types: [] };

    const facilityFilter = document.getElementById("ilFacilityFilter");
    const warehouseFilter = document.getElementById("ilWarehouseFilter");
    const productTypeFilter = document.getElementById("ilProductTypeFilter");

    options.facilities.forEach((f) => facilityFilter.appendChild(new Option(f.name, f.id)));
    options.warehouses.forEach((w) => warehouseFilter.appendChild(new Option(w.name, w.id)));
    options.product_types.forEach((t) => productTypeFilter.appendChild(new Option(t, t)));
}

async function loadInventory() {
    const tbody = document.getElementById("ilTableBody");
    tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">Loading...</td></tr>`;

    const result = await fetchDrugInventory({
        facility_id: document.getElementById("ilFacilityFilter").value,
        warehouse_id: document.getElementById("ilWarehouseFilter").value,
        product_type: document.getElementById("ilProductTypeFilter").value,
        days: document.getElementById("ilDaysFilter").value,
        show_inactive: document.getElementById("ilShowInactive").checked
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">Failed to load inventory.</td></tr>`;
        allRows = [];
        return;
    }

    allRows = result.data || [];
    render();
}

function render() {
    const isSummary = document.getElementById("ilViewMode").value === "summary";
    renderHead(isSummary);

    if (isSummary) {
        renderSummary();
    } else {
        renderDetail();
    }
}

function renderHead(isSummary) {
    const thead = document.getElementById("ilTableHead");

    thead.innerHTML = isSummary
        ? `<tr><th>Name</th><th>NDC</th><th>Form</th><th>Unit</th><th style="text-align: right;">Total QOH</th><th style="text-align: right;">Lots</th></tr>`
        : `<tr><th>Name</th><th>NDC</th><th>Form</th><th>Size</th><th>Unit</th><th>Lot</th><th>Facility</th><th>Warehouse</th><th>QOH</th><th>Expires</th></tr>`;
}

function renderSummary() {
    const tbody = document.getElementById("ilTableBody");

    if (!allRows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="il-empty-state">No inventory records match.</td></tr>`;
        document.getElementById("ilFooterInfo").textContent = "";
        return;
    }

    const byDrug = new Map();

    allRows.forEach((row) => {
        if (!byDrug.has(row.drug_id)) {
            byDrug.set(row.drug_id, {
                name: row.name, ndc: row.ndc, form: row.form, unit: row.unit,
                totalQty: 0, lots: 0
            });
        }

        const group = byDrug.get(row.drug_id);
        group.totalQty += Number(row.quantity_on_hand || 0);
        group.lots += 1;
    });

    const groups = [...byDrug.values()].sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = groups.map((g) => `
        <tr>
            <td class="il-drug-name">${escapeHtml(g.name)}</td>
            <td>${escapeHtml(g.ndc || "-")}</td>
            <td>${escapeHtml(g.form || "-")}</td>
            <td>${escapeHtml(g.unit || "-")}</td>
            <td style="text-align: right;">${formatQuantity(g.totalQty)}</td>
            <td style="text-align: right;">${g.lots}</td>
        </tr>
    `).join("");

    document.getElementById("ilFooterInfo").textContent = `Showing ${groups.length} drug${groups.length === 1 ? "" : "s"} across ${allRows.length} lot${allRows.length === 1 ? "" : "s"}`;
}

function renderDetail() {
    const tbody = document.getElementById("ilTableBody");

    if (!allRows.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="il-empty-state">No inventory records match.</td></tr>`;
        document.getElementById("ilFooterInfo").textContent = "";
        return;
    }

    const today = new Date().toISOString().slice(0, 10);

    tbody.innerHTML = allRows.map((row) => {
        const expired = row.expires_date && row.expires_date.slice(0, 10) < today;

        return `
            <tr>
                <td class="il-drug-name">${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.ndc || "-")}</td>
                <td>${escapeHtml(row.form || "-")}</td>
                <td>${row.size != null ? row.size : "-"}</td>
                <td>${escapeHtml(row.unit || "-")}</td>
                <td>${escapeHtml(row.lot_number)}</td>
                <td>${escapeHtml(row.facility_name || "N/A")}</td>
                <td>${escapeHtml(row.warehouse_name)}</td>
                <td>${formatQuantity(row.quantity_on_hand)}</td>
                <td class="${expired ? "il-expired" : ""}">${row.expires_date ? formatDate(row.expires_date) : "-"}</td>
            </tr>
        `;
    }).join("");

    document.getElementById("ilFooterInfo").textContent = `Showing ${allRows.length} record${allRows.length === 1 ? "" : "s"}`;
}

function exportToCsv() {
    if (!allRows.length) {
        alert("No data to export.");
        return;
    }

    const isSummary = document.getElementById("ilViewMode").value === "summary";
    const rows = [];

    if (isSummary) {
        rows.push(["Name", "NDC", "Form", "Unit", "Total QOH", "Lots"]);

        const byDrug = new Map();
        allRows.forEach((row) => {
            if (!byDrug.has(row.drug_id)) {
                byDrug.set(row.drug_id, { name: row.name, ndc: row.ndc, form: row.form, unit: row.unit, totalQty: 0, lots: 0 });
            }
            const group = byDrug.get(row.drug_id);
            group.totalQty += Number(row.quantity_on_hand || 0);
            group.lots += 1;
        });

        [...byDrug.values()].sort((a, b) => a.name.localeCompare(b.name)).forEach((g) => {
            rows.push([g.name, g.ndc || "", g.form || "", g.unit || "", g.totalQty, g.lots]);
        });
    } else {
        rows.push(["Name", "NDC", "Form", "Size", "Unit", "Lot", "Facility", "Warehouse", "QOH", "Expires"]);

        allRows.forEach((row) => {
            rows.push([
                row.name, row.ndc || "", row.form || "", row.size ?? "", row.unit || "",
                row.lot_number, row.facility_name || "", row.warehouse_name, row.quantity_on_hand, row.expires_date || ""
            ]);
        });
    }

    const csvString = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "inventory_list.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function printReport() {
    const reportWindow = window.open("", "_blank", "width=1100,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to print the report.");
        return;
    }

    const tableHtml = document.getElementById("ilTable")?.outerHTML || "";

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inventory List</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
                h1 { margin-bottom: 5px; font-size: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #e2e8f0; padding: 8px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #edf2f7; }
            </style>
        </head>
        <body>
            <h1>Inventory List</h1>
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

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, "");
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
