import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchEncounters() {
    const facilityId = document.getElementById("encFacility")?.value || "";
    const providerId = document.getElementById("encProvider")?.value || "";
    const dateFrom = document.getElementById("encBeginDate")?.value || "";
    const dateTo = document.getElementById("encEndDate")?.value || "";

    const tbody = document.getElementById("encTableBody");
    const tableContainer = document.getElementById("encTableContainer");
    const instructionText = document.getElementById("encInstructionText");
    const actionButtons = document.getElementById("encActionButtons");
    const submitBtn = document.getElementById("encSubmitBtn");

    if (!tbody || !tableContainer) return;
    
    if (instructionText) instructionText.style.display = "none";
    tableContainer.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
    if (submitBtn) {
        submitBtn.style.borderRadius = "4px 0 0 4px";
    }

    tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            provider_id: providerId
        });

        const result = await api(`/reports/visits/encounters?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Encounters Report", "encounters_report", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("encTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No encounters found.</td></tr>`;
    } else {
        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            tr.innerHTML = `
                <td style="padding: 8px; color: #2d3748;">${item.provider}</td>
                <td style="padding: 8px; color: #2d3748;">${item.encounters}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

export function initEncountersReport() {
    const submitBtn = document.getElementById("encSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchEncounters);
    }
}
