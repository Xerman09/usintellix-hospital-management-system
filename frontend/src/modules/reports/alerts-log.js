import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchAlertsLog() {
    const dateFrom = document.getElementById("alBeginDate")?.value || "";
    const dateTo = document.getElementById("alEndDate")?.value || "";

    const tbody = document.getElementById("alTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading alerts...</td></tr>`;

    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo
        });

        const result = await api(`/reports/alerts-log?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Alerts Log", "alerts_log", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("alTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">No alerts found.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";

        const allAlertsHtml = item.all_alerts ? item.all_alerts.replace(/\n/g, "<br>") : "";
        const newAlertsHtml = item.new_alerts ? item.new_alerts.replace(/\n/g, "<br>") : "";
        
        tr.innerHTML = `
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${item.date}</td>
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${item.patient_id}</td>
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${item.user_id}</td>
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${item.facility_id}</td>
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${item.category}</td>
            <td style="padding: 12px; color: #2c5282; vertical-align: top;">${allAlertsHtml}</td>
            <td style="padding: 12px; color: #2d3748; vertical-align: top;">${newAlertsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function downloadCSV() {
    const table = document.getElementById("alTableBody");
    if (!table || table.children.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Patient ID,User ID,Facility ID,Category,All Alerts,New Alerts\r\n";
    
    Array.from(table.rows).forEach(row => {
        if (row.cells.length === 7) {
            const rowData = Array.from(row.cells).map(cell => {
                let text = cell.innerText.replace(/"/g, '""');
                return `"${text}"`;
            });
            csvContent += rowData.join(",") + "\r\n";
        }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "alerts_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function initAlertsLog() {
    const searchBtn = document.getElementById("alSearchBtn");
    if (searchBtn) {
        searchBtn.addEventListener("click", fetchAlertsLog);
    }
    
    const downloadBtn = document.getElementById("alDownloadBtn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", downloadCSV);
    }

    // Initial fetch
    fetchAlertsLog();
}
