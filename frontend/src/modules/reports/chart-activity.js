import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchChartActivity() {
    const patientId = document.getElementById("chaPatientId")?.value || "";
    
    const tbody = document.getElementById("chaTableBody");
    const tableContainer = document.getElementById("chaTableContainer");
    const instructionText = document.getElementById("chaInstructionText");
    const title = document.getElementById("chaTitle");
    const submitBtn = document.getElementById("chaSubmitBtn");
    const printBtn = document.getElementById("chaPrintBtn");

    if (!patientId) {
        if (instructionText) {
            instructionText.style.color = "#e53e3e";
            instructionText.textContent = "Please enter a valid Patient ID first.";
        }
        return;
    }

    if (!tbody || !tableContainer) return;
    
    if (instructionText) instructionText.style.display = "none";
    tableContainer.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            patient_id: patientId
        });

        const result = await api(`/reports/visits/chart-activity?${params.toString()}`);

        if (result.success) {
            const patientName = result.data.patient_name;
            const data = result.data.results;
            
            if (patientName) {
                title.textContent = `Report - Chart Location Activity for ${patientName} (${patientId})`;
            }
            
            // Adjust buttons visually to match active state
            submitBtn.style.borderRadius = "4px 0 0 4px";
            printBtn.style.display = "flex";

            tbody.innerHTML = "";
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No chart activity found for this patient.</td></tr>`;
            } else {
                data.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #e2e8f0";

                    tr.innerHTML = `
                        <td style="padding: 8px; color: #2d3748;">${item.time || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.destination || ''}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            logReportRun("Chart Location Activity", "chart_activity", { patient_id: patientId });
        } else {
            tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

export function initChartActivityReport() {
    const submitBtn = document.getElementById("chaSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchChartActivity);
    }
}
