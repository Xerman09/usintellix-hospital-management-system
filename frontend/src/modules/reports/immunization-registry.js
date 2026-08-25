import { api } from "../../core/api.js";

async function loadCvxCodes() {
    const select = document.getElementById("immCvxCode");
    if (!select) return;

    try {
        const result = await api("/reports/immunization-registry/cvx-codes");
        if (result.success && result.data) {
            select.innerHTML = "";
            result.data.forEach(code => {
                const option = document.createElement("option");
                option.value = code.id;
                // Display as CVX:1, CVX:10, etc (strip leading zeros for display)
                option.textContent = `CVX:${parseInt(code.cvx_code, 10)}`;
                option.title = code.description || code.cvx_code;
                select.appendChild(option);
            });
            // If no CVX codes from DB, show a placeholder
            if (result.data.length === 0) {
                select.innerHTML = '<option value="">No CVX codes</option>';
            }
        }
    } catch (err) {
        console.error("Failed to load CVX codes:", err);
        if (select) select.innerHTML = '<option value="">Error loading codes</option>';
    }
}

async function submitImmReport(event) {
    if (event) event.preventDefault();

    const select = document.getElementById("immCvxCode");
    const visDateFrom = document.getElementById("immVisDateFrom")?.value || "";
    const visDateTo = document.getElementById("immVisDateTo")?.value || "";

    // Get selected CVX code IDs (multi-select)
    const selectedIds = select
        ? Array.from(select.selectedOptions).map(o => o.value).filter(v => v)
        : [];

    const tbody = document.getElementById("immRegistryTableBody");
    const banner = document.getElementById("immCountBanner");
    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = `
        <tr><td colspan="5" style="padding: 0;">
            <div id="immCountBanner" style="background-color: #9ae6b4; padding: 8px 16px; font-weight: bold; color: #1a202c; font-size: 13px;">
                Loading...
            </div>
        </td></tr>
    `;

    try {
        const queryParams = new URLSearchParams();
        if (visDateFrom) queryParams.set("vis_date_from", visDateFrom);
        if (visDateTo) queryParams.set("vis_date_to", visDateTo);
        // Pass first selected cvx code id (or all as comma-separated for extensibility)
        if (selectedIds.length > 0) queryParams.set("cvx_code_id", selectedIds[0]);

        const result = await api(`/reports/immunization-registry?${queryParams.toString()}`);

        if (result.success) {
            renderImmTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: red;">Failed to load report: ${result.message || 'Unknown error'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: red;">An error occurred while fetching the report.</td></tr>`;
        console.error("Immunization Registry Error:", error);
    }
}

function renderImmTable(data) {
    const tbody = document.getElementById("immRegistryTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const count = data ? data.length : 0;

    // Always show the green count banner first
    const bannerRow = document.createElement("tr");
    bannerRow.innerHTML = `
        <td colspan="5" style="padding: 0;">
            <div id="immCountBanner" style="background-color: #9ae6b4; padding: 8px 16px; font-weight: bold; color: #1a202c; font-size: 13px;">
                Total Number of Immunizations : ${count}
            </div>
        </td>
    `;
    tbody.appendChild(bannerRow);

    if (!data || count === 0) return;

    data.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.style.backgroundColor = idx % 2 === 0 ? "white" : "#f7fafc";
        tr.innerHTML = `
            <td style="padding: 10px 16px; color: #4a5568;">${item.pid || ''}</td>
            <td style="padding: 10px 16px; color: #2b6cb0;">${item.patient_name || ''}</td>
            <td style="padding: 10px 16px; color: #4a5568;">${item.immunization_code || ''}</td>
            <td style="padding: 10px 16px; color: #4a5568;">${item.immunization_title || ''}</td>
            <td style="padding: 10px 16px; color: #4a5568;">${item.immunization_date || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportImmCsv() {
    const rows = [["Patient ID", "Patient Name", "Immunization Code", "Immunization Title", "Immunization Date"]];
    const tbody = document.getElementById("immRegistryTableBody");
    if (!tbody) return;

    const dataRows = tbody.querySelectorAll("tr:not(:first-child)");
    dataRows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 5) {
            rows.push([
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
            ]);
        }
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "immunization_registry.csv";
    a.click();
    URL.revokeObjectURL(url);
}

export function initImmunizationRegistry() {
    const form = document.getElementById("immRegForm");
    if (form) {
        form.addEventListener("submit", submitImmReport);
    }

    const printBtn = document.getElementById("immPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => window.print());
    }

    const exportBtn = document.getElementById("immExportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportImmCsv);
    }

    const hl7Btn = document.getElementById("immHl7Btn");
    if (hl7Btn) {
        hl7Btn.addEventListener("click", () => {
            alert("HL7 export is not yet implemented.");
        });
    }

    // Load CVX codes into the multi-select, then auto-submit to show initial count
    loadCvxCodes().then(() => {
        submitImmReport(null);
    });
}
