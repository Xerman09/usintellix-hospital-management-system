import { api } from "../../core/api.js";
import { fetchProviders } from "../providers/providers.service.js";

async function loadPlcProviders() {
    try {
        const result = await fetchProviders();
        if (result.success) {
            const select = document.getElementById("plcProvider");
            if (select) {
                result.data.forEach(provider => {
                    const option = document.createElement("option");
                    option.value = provider.id;
                    option.textContent = provider.first_name + ' ' + provider.last_name;
                    select.appendChild(option);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load providers for Patient List Creation report", e);
    }
}

async function submitPlcReport(event) {
    if (event) {
        event.preventDefault();
    }

    const dateFrom = document.getElementById("plcDateFrom").value;
    const dateTo = document.getElementById("plcDateTo").value;
    const patientId = document.getElementById("plcPatientId").value;
    const ageMin = document.getElementById("plcAgeMin").value;
    const ageMax = document.getElementById("plcAgeMax").value;
    const providerId = document.getElementById("plcProvider").value;
    const option = document.getElementById("plcOption").value;
    const gender = document.getElementById("plcGender").value;
    const ethnicity = document.getElementById("plcEthnicity").value;

    const tbody = document.getElementById("plcReportTableBody");
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const queryParams = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            patient_id: patientId,
            age_min: ageMin,
            age_max: ageMax,
            provider_id: providerId,
            option: option,
            gender: gender,
            ethnicity: ethnicity
        });

        const result = await api(`/reports/patient-list-creation?${queryParams.toString()}`);
        
        if (result.success) {
            renderPlcReportTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: red;">Failed to load report: ${result.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: red;">An error occurred while fetching the report.</td></tr>`;
        console.error("Patient List Creation Report Error:", error);
    }
}

function renderPlcReportTable(data) {
    const tbody = document.getElementById("plcReportTableBody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #718096; font-style: italic;">No patients found matching the given filters.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.style.color = "#4a5568";
        
        tr.innerHTML = `
            <td style="padding: 12px 16px;">${item.patient_no || ''}</td>
            <td style="padding: 12px 16px; font-weight: 500; color: #2b6cb0;">${item.last_name || ''}, ${item.first_name || ''}</td>
            <td style="padding: 12px 16px; text-transform: capitalize;">${item.sex || ''}</td>
            <td style="padding: 12px 16px;">${item.birthdate || ''}</td>
            <td style="padding: 12px 16px;">${item.age !== null ? item.age : ''}</td>
            <td style="padding: 12px 16px;">${item.ethnicity || ''}</td>
            <td style="padding: 12px 16px;">${item.provider_name || 'Unassigned'}</td>
            <td style="padding: 12px 16px;">${item.created_at || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

export function initPatientListCreationReport() {
    loadPlcProviders();
    
    const form = document.getElementById("plcReportForm");
    if (form) {
        form.addEventListener("submit", submitPlcReport);
    }
}
