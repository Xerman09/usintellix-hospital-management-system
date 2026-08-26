import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchServices() {
    const type = document.getElementById("srvType")?.value || "all";
    const includeUncategorized = document.getElementById("srvIncludeUncategorized")?.checked || false;

    const tbody = document.getElementById("srvTableBody");
    const tableContainer = document.getElementById("srvTableContainer");
    const submitBtn = document.getElementById("srvSubmitBtn");
    const printBtn = document.getElementById("srvPrintBtn");

    if (!tbody || !tableContainer) return;
    
    tableContainer.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            type: type,
            include_uncategorized: includeUncategorized
        });

        const result = await api(`/reports/visits/services?${params.toString()}`);

        if (result.success) {
            const data = result.data;
            
            submitBtn.style.borderRadius = "4px 0 0 4px";
            printBtn.style.display = "flex";

            tbody.innerHTML = "";
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No services found for selected criteria.</td></tr>`;
            } else {
                data.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #e2e8f0";

                    tr.innerHTML = `
                        <td style="padding: 8px; color: #2d3748;">${item.category || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.code_type || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.code || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.modifier || ''}</td>
                        <td style="padding: 8px; color: #2d3748;"></td>
                        <td style="padding: 8px; color: #2d3748;">${item.description || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.related_code || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.fee_standard ? '$' + item.fee_standard : ''}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            logReportRun("Services by Category", "services", { type, include_uncategorized: includeUncategorized });
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #e53e3e;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #e53e3e;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

export function initServicesReport() {
    const submitBtn = document.getElementById("srvSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchServices);
    }
}
