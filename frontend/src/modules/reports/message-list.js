import { api } from "../../core/api.js";

async function submitMlReport(event) {
    if (event) {
        event.preventDefault();
    }

    const dateFrom = document.getElementById("mlDateFrom").value;
    const dateTo = document.getElementById("mlDateTo").value;

    const tbody = document.getElementById("mlReportTableBody");
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #718096; font-style: italic;">Loading data...</td></tr>`;

    try {
        const queryParams = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo
        });

        const result = await api(`/reports/message-list?${queryParams.toString()}`);
        
        if (result.success) {
            renderMlReportTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: red;">Failed to load report: ${result.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: red;">An error occurred while fetching the report.</td></tr>`;
        console.error("Message List Report Error:", error);
    }
}

function renderMlReportTable(data) {
    const tbody = document.getElementById("mlReportTableBody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #718096; font-style: italic;">No messages found matching the given date range.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.style.color = "#4a5568";
        
        tr.innerHTML = `
            <td style="padding: 10px 16px;">${item.date || ''}</td>
            <td style="padding: 10px 16px;">${item.user || ''}</td>
            <td style="padding: 10px 16px;">${item.patient || ''}</td>
            <td style="padding: 10px 16px;">${item.pid || ''}</td>
            <td style="padding: 10px 16px;">${item.dob || ''}</td>
            <td style="padding: 10px 16px;">${item.type || ''}</td>
            <td style="padding: 10px 16px;">${item.status || ''}</td>
            <td style="padding: 10px 16px;">${item.updated_by || ''}</td>
            <td style="padding: 10px 16px;">${item.last_update || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function printMlReport() {
    window.print();
}

function exportMlToCSV() {
    const tbody = document.getElementById("mlReportTableBody");
    if (!tbody || tbody.querySelectorAll("tr").length === 0 || tbody.innerHTML.includes("No messages")) {
        alert("No data available to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,User,Patient,PID,DOB,Type,Status,Updated By,Last Update\n";

    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
        const rowData = [];
        const cols = row.querySelectorAll("td");
        cols.forEach(col => {
            let data = col.textContent.trim();
            // Escape double quotes and wrap in quotes if contains comma
            if (data.includes(',') || data.includes('"')) {
                data = '"' + data.replace(/"/g, '""') + '"';
            }
            rowData.push(data);
        });
        csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "message_list_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function initMessageListReport() {
    const form = document.getElementById("mlReportForm");
    if (form) {
        form.addEventListener("submit", submitMlReport);
    }

    const printBtn = document.getElementById("mlPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", printMlReport);
    }

    const exportBtn = document.getElementById("mlExportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportMlToCSV);
    }
}
