import { api } from "../../core/api.js";
import { fetchFacilities } from "../facilities/facilities.service.js";

async function loadRxFacilities() {
    try {
        const result = await fetchFacilities();
        if (result.success) {
            const select = document.getElementById("rxFacility");
            if (select) {
                result.data.forEach(facility => {
                    const option = document.createElement("option");
                    option.value = facility.id;
                    option.textContent = facility.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load facilities for RX report", e);
    }
}

async function submitRxReport(event) {
    if (event) {
        event.preventDefault();
    }

    const facilityId = document.getElementById("rxFacility").value;
    const dateFrom = document.getElementById("rxDateFrom").value;
    const dateTo = document.getElementById("rxDateTo").value;
    const patientId = document.getElementById("rxPatientId").value;
    const drug = document.getElementById("rxDrug").value;
    const lot = document.getElementById("rxLot").value;

    const tbody = document.getElementById("rxReportTableBody");
    tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 20px;">Loading data...</td></tr>`;

    try {
        const queryParams = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            patient_id: patientId,
            drug: drug,
            lot: lot
        });

        const result = await api(`/reports/rx?${queryParams.toString()}`);
        
        if (result.success) {
            renderRxReportTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">Failed to load report: ${result.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 20px; color: red;">An error occurred while fetching the report.</td></tr>`;
        console.error("RX Report Error:", error);
    }
}

function renderRxReportTable(data) {
    const tbody = document.getElementById("rxReportTableBody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 20px;">No prescriptions or dispensations found matching the given filters.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td>${item.patient_name || ''}</td>
            <td>${item.patient_id || ''}</td>
            <td>${item.rx_id || ''}</td>
            <td>${item.drug_name || ''}</td>
            <td>${item.ndc || ''}</td>
            <td>${item.units || ''}</td>
            <td>${item.refills || ''}</td>
            <td>${item.instructed || ''}</td>
            <td>${item.reactions || ''}</td>
            <td>${item.dispensed || ''}</td>
            <td>${item.qty || ''}</td>
            <td>${item.manufacturer || ''}</td>
            <td>${item.lot || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function printRxReport() {
    window.print();
}

export function initRxReport() {
    loadRxFacilities();
    
    const form = document.getElementById("rxReportForm");
    if (form) {
        form.addEventListener("submit", submitRxReport);
    }
    
    const printBtn = document.getElementById("rxPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", printRxReport);
    }
}
