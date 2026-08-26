import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function loadDiagnoses() {
    const select = document.getElementById("synDiagnosis");
    if (!select) return;

    try {
        const result = await api(`/reports/visits/syndromic-surveillance`);
        if (result.success && result.data.diagnoses) {
            select.innerHTML = '';
            result.data.diagnoses.forEach(d => {
                const option = document.createElement("option");
                option.value = d.code;
                option.textContent = d.description || d.code;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Failed to load diagnoses", err);
    }
}

async function fetchSyndromicSurveillance() {
    const diagnosisSelect = document.getElementById("synDiagnosis");
    const selectedOptions = Array.from(diagnosisSelect?.selectedOptions || []).map(opt => opt.value);
    
    const dateFrom = document.getElementById("synDateFrom")?.value || "";
    const dateTo = document.getElementById("synDateTo")?.value || "";

    const tbody = document.getElementById("synTableBody");
    const tableContainer = document.getElementById("synTableContainer");
    const instructionText = document.getElementById("synInstructionText");
    const refreshBtn = document.getElementById("synRefreshBtn");
    const printBtn = document.getElementById("synPrintBtn");
    const hl7Btn = document.getElementById("synHl7Btn");
    const footer = document.getElementById("synFooter");

    if (!tbody || !tableContainer) return;
    
    if (instructionText) instructionText.style.display = "none";
    tableContainer.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams();
        if (selectedOptions.length > 0) {
            // Backend currently mocks single/IN behavior. We can pass the first one or join them if backend handles it
            params.append('diagnosis', selectedOptions[0]);
        }
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        const result = await api(`/reports/visits/syndromic-surveillance?${params.toString()}`);

        if (result.success) {
            const data = result.data.results || [];
            
            refreshBtn.style.borderRadius = "4px 0 0 4px";
            printBtn.style.display = "flex";
            hl7Btn.style.display = "flex";

            tbody.innerHTML = "";
            footer.textContent = `Total Number of Issues : ${data.length}`;
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No issues found.</td></tr>`;
            } else {
                data.forEach(item => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #e2e8f0";

                    tr.innerHTML = `
                        <td style="padding: 8px; color: #2d3748;">${item.patient_id || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.patient_name || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.diagnosis || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.issue_id || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.issue_title || ''}</td>
                        <td style="padding: 8px; color: #2d3748;">${item.issue_date || ''}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            logReportRun("Syndromic Surveillance - Non Reported Issues", "syndromic_surveillance", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #e53e3e;">Failed to load data.</td></tr>`;
            footer.textContent = `Total Number of Issues : 0`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #e53e3e;">Error fetching report.</td></tr>`;
        footer.textContent = `Total Number of Issues : 0`;
        console.error(err);
    }
}

export function initSyndromicSurveillanceReport() {
    loadDiagnoses();
    
    const refreshBtn = document.getElementById("synRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchSyndromicSurveillance);
    }
}
