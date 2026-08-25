import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchPatientFlow() {
    const facilityId = document.getElementById("fbFacility")?.value || "";
    const providerId = document.getElementById("fbProvider")?.value || "";
    const dateFrom = document.getElementById("fbBeginDate")?.value || "";
    const dateTo = document.getElementById("fbEndDate")?.value || "";
    const status = document.getElementById("fbStatus")?.value || "";
    const category = document.getElementById("fbCategory")?.value || "";

    const tbody = document.getElementById("fbTableBody");
    const tableContainer = document.getElementById("fbTableContainer");
    const actionButtons = document.getElementById("fbActionButtons");
    const submitBtn = document.getElementById("fbSubmitBtn");

    if (!tbody || !tableContainer) return;
    
    tableContainer.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
    if (submitBtn) {
        submitBtn.style.borderRadius = "4px 0 0 4px";
    }

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            provider_id: providerId,
            status: status,
            category: category
        });

        const result = await api(`/reports/visits/patient-flow?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Patient Flow Board Report", "patient_flow_board", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("fbTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    let totalPatients = 0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No records found.</td></tr>`;
    } else {
        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            tr.innerHTML = `
                <td style="padding: 8px; color: #2d3748;">${item.provider}</td>
                <td style="padding: 8px; color: #2d3748;">${item.date}</td>
                <td style="padding: 8px; color: #2d3748;">${item.time}</td>
                <td style="padding: 8px; color: #2d3748;">${item.patient}</td>
                <td style="padding: 8px; color: #2d3748;">${item.id}</td>
                <td style="padding: 8px; color: #2d3748;">${item.type}</td>
                <td style="padding: 8px; color: #2d3748;">${item.final_status}</td>
                <td style="padding: 8px; color: #2d3748;">${item.arrive_time || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.discharge_time || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.total_time || ''}</td>
            `;
            tbody.appendChild(tr);
            totalPatients++;
        });
    }

    const totalCountEl = document.getElementById("fbTotalCount");
    if (totalCountEl) totalCountEl.textContent = totalPatients;
}

export function initFlowBoardReport() {
    const submitBtn = document.getElementById("fbSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchPatientFlow);
    }
}
