import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchAppointments() {
    const facilityId = document.getElementById("aptFacility")?.value || "";
    const dateFrom = document.getElementById("aptBeginDate")?.value || "";
    const dateTo = document.getElementById("aptEndDate")?.value || "";
    
    // Multi-select for provider
    const providerSelect = document.getElementById("aptProvider");
    let providerIds = [];
    if (providerSelect) {
        for (let i = 0; i < providerSelect.options.length; i++) {
            if (providerSelect.options[i].selected) {
                providerIds.push(providerSelect.options[i].value);
            }
        }
    }
    const providerId = providerIds.join(',');

    const status = document.getElementById("aptStatus")?.value || "";
    const category = document.getElementById("aptCategory")?.value || "";

    const tbody = document.getElementById("aptTableBody");
    const tableContainer = document.getElementById("aptTableContainer");
    const instructionText = document.getElementById("aptInstructionText");
    const actionButtons = document.getElementById("aptActionButtons");
    const submitBtn = document.getElementById("aptSubmitBtn");

    if (!tbody || !tableContainer) return;
    
    // UI state transitions
    if (instructionText) instructionText.style.display = "none";
    tableContainer.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
    if (submitBtn) {
        submitBtn.style.borderRadius = "4px 0 0 4px";
    }

    tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            provider_id: providerId,
            status: status,
            category: category
        });

        const result = await api(`/reports/visits/appointments?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Appointments Report", "appointments_report", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("aptTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let totalAppointments = 0;
    let totalCanceled = 0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No appointments found.</td></tr>`;
    } else {
        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            tr.innerHTML = `
                <td style="padding: 8px; color: #2d3748;">${item.provider}</td>
                <td style="padding: 8px; color: #2d3748;">${item.time}</td>
                <td style="padding: 8px; color: #2d3748;">${item.patient}</td>
                <td style="padding: 8px; color: #2d3748;">${item.id}</td>
                <td style="padding: 8px; color: #2d3748;">${item.home}</td>
                <td style="padding: 8px; color: #2d3748;">${item.cell}</td>
                <td style="padding: 8px; color: #2d3748;">${item.type}</td>
                <td style="padding: 8px; color: #2d3748;">${item.status}</td>
            `;
            tbody.appendChild(tr);
            
            totalAppointments++;
            if (item.status && item.status.toLowerCase().includes('cancel')) {
                totalCanceled++;
            }
        });
    }

    const totalCountEl = document.getElementById("aptTotalCount");
    const totalCanceledEl = document.getElementById("aptTotalCanceled");
    
    if (totalCountEl) totalCountEl.textContent = totalAppointments;
    if (totalCanceledEl) totalCanceledEl.textContent = totalCanceled;
}

export function initAppointmentsReport() {
    const submitBtn = document.getElementById("aptSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchAppointments);
    }
}
