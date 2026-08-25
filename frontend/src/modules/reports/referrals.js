import { api } from "../../core/api.js";

async function submitRefReport(event) {
    if (event) {
        event.preventDefault();
    }

    const facility = document.getElementById("refFacility")?.value || "";
    const dateFrom = document.getElementById("refDateFrom")?.value || "";
    const dateTo = document.getElementById("refDateTo")?.value || "";

    const tbody = document.getElementById("refResultsTableBody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>';

    try {
        const queryParams = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            facility_id: facility
        });

        const result = await api(`/reports/referrals?${queryParams.toString()}`);
        
        if (result.success) {
            renderReferralsTable(result.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: red;">Failed to load report: ' + result.message + '</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: red;">An error occurred while fetching the report.</td></tr>';
        console.error("Referrals Report Error:", error);
    }
}

function renderReferralsTable(data) {
    const tbody = document.getElementById("refResultsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">No records found matching the given criteria.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.style.backgroundColor = "white";
        
        // This is safe because I'm not escaping backticks
        tr.innerHTML = `
            <td style="padding: 12px 16px; color: #2d3748;">${item.refer_to || ''}</td>
            <td style="padding: 12px 16px; color: #4a5568;">${item.refer_date || ''}</td>
            <td style="padding: 12px 16px; color: #4a5568;">${item.reply_date || ''}</td>
            <td style="padding: 12px 16px; color: #2b6cb0;">${item.patient_name || ''}</td>
            <td style="padding: 12px 16px; color: #4a5568;">${item.pid || ''}</td>
            <td style="padding: 12px 16px; color: #4a5568;">${item.reason || ''}</td>
        `;

        tbody.appendChild(tr);
    });
}

function printRefReport() {
    window.print();
}

export function initReferralsReport() {
    const form = document.getElementById("refReportForm");
    if (form) {
        form.addEventListener("submit", submitRefReport);
    }

    const printBtn = document.getElementById("refPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", printRefReport);
    }
}
