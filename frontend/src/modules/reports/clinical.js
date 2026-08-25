import { api } from "../../core/api.js";

async function submitCrReport(event) {
    if (event) {
        event.preventDefault();
    }

    const dateFrom = document.getElementById("crDateFrom").value;
    const dateTo = document.getElementById("crDateTo").value;
    const patientId = document.getElementById("crPatientId").value;
    const ageMin = document.getElementById("crAgeMin").value;
    const ageMax = document.getElementById("crAgeMax").value;
    const gender = document.getElementById("crGender").value;
    const race = document.getElementById("crRace").value;
    const ethnicity = document.getElementById("crEthnicity").value;

    const container = document.getElementById("crResultsContainer");
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: #718096; font-style: italic; border: 1px solid #e2e8f0;">Loading data...</div>`;

    try {
        const queryParams = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            patient_id: patientId,
            age_min: ageMin,
            age_max: ageMax,
            gender: gender,
            race: race,
            ethnicity: ethnicity
        });

        const result = await api(`/reports/clinical?${queryParams.toString()}`);
        
        if (result.success) {
            renderCrReportTable(result.data);
        } else {
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: red; border: 1px solid #e2e8f0;">Failed to load report: ${result.message}</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: red; border: 1px solid #e2e8f0;">An error occurred while fetching the report.</div>`;
        console.error("Clinical Report Error:", error);
    }
}

function renderCrReportTable(data) {
    const container = document.getElementById("crResultsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: #718096; font-style: italic; border: 1px solid #e2e8f0;">No records found matching the given criteria.</div>`;
        return;
    }

    data.forEach(item => {
        const patientName = item.patient_name || 'Unknown Patient';
        const raceIcon = (!item.race || item.race === 'Unassigned') ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #2d3748; background: white; border-radius: 50%;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2"></line><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" stroke-width="2"></line></svg>' : item.race;
        const ethIcon = (!item.ethnicity || item.ethnicity === 'Unassigned') ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #2d3748; background: white; border-radius: 50%;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2"></line><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" stroke-width="2"></line></svg>' : item.ethnicity;
        
        const block = document.createElement("div");
        block.style.borderBottom = "1px solid #cbd5e0";
        
        block.innerHTML = `
            <div class="cr-accordion-header" style="background-color: #cbd5e0; padding: 6px 12px; font-weight: bold; color: #1a202c; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #a0aec0;">
                <span>Summary of ${patientName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b6cb0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="accordion-icon"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </div>
            <div class="cr-accordion-body" style="display: block;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="background-color: #9ae6b4; color: #1a202c;">
                            <th style="padding: 6px 12px; font-weight: bold;">Patient Name</th>
                            <th style="padding: 6px 12px; font-weight: bold;">PID</th>
                            <th style="padding: 6px 12px; font-weight: bold;">Age</th>
                            <th style="padding: 6px 12px; font-weight: bold;">Gender</th>
                            <th style="padding: 6px 12px; font-weight: bold;">Race</th>
                            <th style="padding: 6px 12px; font-weight: bold;">Ethnicity</th>
                            <th style="padding: 6px 12px; font-weight: bold;">Provider</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background-color: white;">
                            <td style="padding: 6px 12px; color: #2b6cb0;">${patientName}</td>
                            <td style="padding: 6px 12px; color: #4a5568;">${item.pid || ''}</td>
                            <td style="padding: 6px 12px; color: #4a5568;">${item.age !== null ? item.age : ''}</td>
                            <td style="padding: 6px 12px; color: #4a5568; text-transform: capitalize;">${item.gender || ''}</td>
                            <td style="padding: 6px 12px; color: #4a5568;">${raceIcon}</td>
                            <td style="padding: 6px 12px; color: #4a5568;">${ethIcon}</td>
                            <td style="padding: 6px 12px; color: #4a5568;">${item.provider || ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        const header = block.querySelector('.cr-accordion-header');
        const body = block.querySelector('.cr-accordion-body');
        const icon = block.querySelector('.accordion-icon');
        
        header.addEventListener('click', () => {
            if (body.style.display === 'none') {
                body.style.display = 'block';
                icon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
            } else {
                body.style.display = 'none';
                icon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
            }
        });

        container.appendChild(block);
    });
}

function printCrReport() {
    window.print();
}

export function initClinicalReport() {
    const form = document.getElementById("crReportForm");
    if (form) {
        form.addEventListener("submit", submitCrReport);
    }

    const printBtn = document.getElementById("crPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", printCrReport);
    }
}
