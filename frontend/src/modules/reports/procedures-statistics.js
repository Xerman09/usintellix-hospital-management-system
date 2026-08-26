import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function loadFacilities() {
    const select = document.getElementById("statFacility");
    if (!select) return;

    try {
        // Reusing pending orders route for facilities or standard facility load
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

async function fetchStatisticsReport() {
    const facilityId = document.getElementById("statFacility")?.value || "all";
    const dateFrom = document.getElementById("statDateFrom")?.value || "";
    const dateTo = document.getElementById("statDateTo")?.value || "";
    const sex = document.getElementById("statSex")?.value || "all";
    const dest = document.querySelector('input[name="statDestination"]:checked')?.value || "screen";

    const tbody = document.getElementById("statTableBody");
    const container = document.getElementById("statTableContainer");

    if (!tbody || !container) return;
    
    if (dest !== 'screen') {
        alert("This output method is not implemented in this demo.");
        return;
    }

    container.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        // Since we don't have procedure tables, mock the data
        setTimeout(() => {
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No procedure results found for the selected criteria.</td></tr>`;
            logReportRun("Procedure Statistics Report", "procedures_statistics", { date_from: dateFrom, date_to: dateTo, sex });
        }, 500);

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #e53e3e;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

export function initProcedureStatisticsReport() {
    loadFacilities();
    
    const submitBtn = document.getElementById("statSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchStatisticsReport);
    }
}
