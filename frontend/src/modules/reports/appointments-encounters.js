import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchAppointmentsEncounters() {
    const facilityId = document.getElementById("aeFacility")?.value || "";
    const dateFrom = document.getElementById("aeBeginDate")?.value || "";
    const dateTo = document.getElementById("aeEndDate")?.value || "";
    const details = document.getElementById("aeDetails")?.checked ? 1 : 0;

    const tbody = document.getElementById("aeTableBody");
    const tableContainer = document.getElementById("aeTableContainer");
    const instructionText = document.getElementById("aeInstructionText");
    const actionButtons = document.getElementById("aeActionButtons");
    const submitBtn = document.getElementById("aeSubmitBtn");

    if (!tbody || !tableContainer) return;
    
    if (instructionText) instructionText.style.display = "none";
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
            details: details
        });

        const result = await api(`/reports/visits/appointments-encounters?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Appointments and Encounters", "appointments_encounters", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("aeTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No records found.</td></tr>`;
    } else {
        let grandTotal = 0;

        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.backgroundColor = "#9ae6b4"; // Light green for totals row as per screenshot
            tr.style.fontWeight = "bold";

            tr.innerHTML = `
                <td style="padding: 8px; color: #1a202c;">Totals for ${item.provider}</td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px; color: #1a202c;">${item.encounters_count}</td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
                <td style="padding: 8px;"></td>
            `;
            tbody.appendChild(tr);
            
            grandTotal += parseInt(item.encounters_count, 10);
        });

        // Add Grand Totals row
        const grandRow = document.createElement("tr");
        grandRow.style.backgroundColor = "#9ae6b4"; 
        grandRow.style.fontWeight = "bold";
        grandRow.style.borderTop = "2px solid #fff";
        grandRow.innerHTML = `
            <td style="padding: 8px; color: #1a202c;">Grand Totals</td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px; color: #1a202c;">${grandTotal}</td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
            <td style="padding: 8px;"></td>
        `;
        tbody.appendChild(grandRow);
    }
}

export function initAppointmentsEncountersReport() {
    const submitBtn = document.getElementById("aeSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchAppointmentsEncounters);
    }
}
