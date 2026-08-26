import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function loadFacilities() {
    const select = document.getElementById("pendFacility");
    if (!select) return;

    try {
        const result = await api(`/reports/procedures/pending`);
        if (result.success && result.data.facilities) {
            result.data.facilities.forEach(f => {
                const option = document.createElement("option");
                option.value = f.id;
                option.textContent = f.name;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Failed to load facilities", err);
    }
}

async function fetchPendingOrders() {
    const facilityId = document.getElementById("pendFacility")?.value || "all";
    const dateFrom = document.getElementById("pendDateFrom")?.value || "";
    const dateTo = document.getElementById("pendDateTo")?.value || "";

    const tbody = document.getElementById("pendTableBody");

    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams();
        if (facilityId !== "all") params.append('facility_id', facilityId);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        const result = await api(`/reports/procedures/pending?${params.toString()}`);

        if (result.success) {
            const data = result.data.results || [];
            
            tbody.innerHTML = "";
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No pending orders found.</td></tr>`;
            } else {
                data.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #e2e8f0";

                    tr.innerHTML = `
                        <td style="padding: 8px; color: #2d3748;">${item.patient || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.id || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.ordered || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.from || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.provider || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.priority || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.status || ''}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            logReportRun("Pending Orders", "pending_res", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #e53e3e;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #e53e3e;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

export function initPendingOrdersReport() {
    loadFacilities();
    
    const refreshBtn = document.getElementById("pendRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchPendingOrders);
    }
    
    // Auto fetch on load
    fetchPendingOrders();
}
