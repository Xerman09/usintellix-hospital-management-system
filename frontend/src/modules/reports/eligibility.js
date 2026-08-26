import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

let x12PartnersLoaded = false;

async function fetchEligibility() {
    const dateFrom = document.getElementById("elgBeginDate")?.value || "";
    const dateTo = document.getElementById("elgEndDate")?.value || "";
    const facilityId = document.getElementById("elgFacility")?.value || "";
    const providerId = document.getElementById("elgProvider")?.value || "";
    const x12PartnerId = document.getElementById("elgX12Partner")?.value || "";

    const tbody = document.getElementById("elgTableBody");
    const tableContainer = document.getElementById("elgTableContainer");
    const instructionText = document.getElementById("elgInstructionText");

    if (!tbody || !tableContainer) return;
    
    if (instructionText) instructionText.style.display = "none";
    tableContainer.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            facility_id: facilityId,
            provider_id: providerId,
            x12_partner_id: x12PartnerId
        });

        const result = await api(`/reports/visits/eligibility?${params.toString()}`);

        if (result.success) {
            if (!x12PartnersLoaded && result.data.x12_partners) {
                populateX12Partners(result.data.x12_partners);
                x12PartnersLoaded = true;
            }
            renderTable(result.data.results);
            logReportRun("Eligibility 270 Inquiry Batch", "eligibility", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function populateX12Partners(partners) {
    const select = document.getElementById("elgX12Partner");
    if (!select) return;
    
    // Keep the first option
    const firstOption = select.options[0];
    select.innerHTML = "";
    select.appendChild(firstOption);
    
    partners.forEach(partner => {
        const option = document.createElement("option");
        option.value = partner.id;
        option.textContent = partner.name;
        select.appendChild(option);
    });
}

function renderTable(data) {
    const tbody = document.getElementById("elgTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No records found.</td></tr>`;
    } else {
        data.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            tr.innerHTML = `
                <td style="padding: 8px; color: #2d3748;">${item.facility_name || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.facility_npi || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.insurance_comp || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.appt_date || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.policy_no || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.patient_name || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.dob || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.gender || ''}</td>
                <td style="padding: 8px; color: #2d3748;">${item.ssn || ''}</td>
                <td style="padding: 8px; color: #e53e3e; text-align: center; font-weight: bold; cursor: pointer;">x</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

export function initEligibilityReport() {
    const refreshBtn = document.getElementById("elgRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchEligibility);
    }
    
    // Initial fetch to load X12 partners without showing table data until refresh is clicked
    const params = new URLSearchParams({
        date_from: document.getElementById("elgBeginDate")?.value || "",
        date_to: document.getElementById("elgEndDate")?.value || ""
    });
    
    api(`/reports/visits/eligibility?${params.toString()}`).then(result => {
        if (result.success && result.data.x12_partners) {
            populateX12Partners(result.data.x12_partners);
            x12PartnersLoaded = true;
        }
    }).catch(console.error);
}
