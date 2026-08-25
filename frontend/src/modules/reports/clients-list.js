import { api } from "../../core/api.js?v=5";
import { fetchProviders } from "../providers/providers.service.js";

let currentReportData = [];

export async function initClientsList() {
    const providerSelect = document.getElementById("reportProviderFilter");
    const submitBtn = document.getElementById("reportSubmitBtn");
    const csvBtn = document.getElementById("reportCsvBtn");
    const printBtn = document.getElementById("reportPrintBtn");

    try {
        const result = await fetchProviders();
        if (result.success && result.data) {
            result.data.forEach(provider => {
                const option = document.createElement("option");
                option.value = provider.id;
                const nameParts = [provider.first_name, provider.last_name].filter(Boolean);
                const fullName = nameParts.length > 0 ? nameParts.join(" ") : `Provider #${provider.id}`;
                option.textContent = fullName;
                providerSelect.appendChild(option);
            });
        }
    } catch (e) {
        console.error("Failed to fetch providers:", e);
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            const providerId = providerSelect.value;
            const dateFrom = document.getElementById("reportDateFrom").value;
            const dateTo = document.getElementById("reportDateTo").value;
            
            submitBtn.disabled = true;
            submitBtn.textContent = "Loading...";

            try {
                let url = "/reports/patient-list";
                const params = new URLSearchParams();
                if (providerId) params.append("provider_id", providerId);
                if (dateFrom) params.append("date_from", dateFrom);
                if (dateTo) params.append("date_to", dateTo);
                
                const qs = params.toString();
                if (qs) {
                    url += "?" + qs;
                }

                const response = await api(url);
                if (response.success) {
                    currentReportData = response.data || [];
                    renderReportTable();
                } else {
                    alert(response.message || "Failed to fetch report data.");
                }
            } catch (e) {
                console.error(e);
                alert("An error occurred while fetching the report.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit";
            }
        });
    }

    if (csvBtn) {
        csvBtn.addEventListener("click", () => {
            if (currentReportData.length === 0) {
                alert("No data to export.");
                return;
            }
            exportToCsv(currentReportData);
        });
    }

    if (printBtn) {
        printBtn.addEventListener("click", () => {
            if (currentReportData.length === 0) {
                alert("No data to print.");
                return;
            }
            printReport();
        });
    }

    // Restore table if data was previously fetched and we navigated back
    if (currentReportData && currentReportData.length > 0) {
        renderReportTable();
    }
}

function renderReportTable() {
    const resultsArea = document.getElementById("reportResultsArea");
    const tbody = document.getElementById("reportTableBody");
    const totalCount = document.getElementById("reportTotalCount");

    if (!resultsArea || !tbody || !totalCount) return;

    resultsArea.style.display = "block";
    tbody.innerHTML = "";

    if (currentReportData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-muted);">No patients found for the selected criteria.</td></tr>`;
        totalCount.textContent = "Total Number of Patients: 0";
        return;
    }

    currentReportData.forEach(row => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border-color)";
        
        tr.innerHTML = `
            <td style="padding: 10px;">${escapeHtml(row.last_visit ? row.last_visit.split(' ')[0] : '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</td>
            <td style="padding: 10px;">${escapeHtml(row.patient_no || row.id)}</td>
            <td style="padding: 10px;">${escapeHtml(row.address_line || '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.city || '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.state || '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.zip_code || '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.home_phone || '')}</td>
            <td style="padding: 10px;">${escapeHtml(row.work_phone || '')}</td>
        `;
        tbody.appendChild(tr);
    });

    totalCount.textContent = `Total Number of Patients: ${currentReportData.length}`;
}

function exportToCsv(data) {
    const headers = ["Last Visit", "Patient", "ID", "Street", "City", "State", "Zip", "Home Phone", "Work Phone"];
    const csvRows = [];
    csvRows.push(headers.join(","));

    data.forEach(row => {
        const values = [
            row.last_visit ? row.last_visit.split(' ')[0] : '',
            `"${row.last_name}, ${row.first_name}"`,
            row.patient_no || row.id,
            `"${row.address_line || ''}"`,
            `"${row.city || ''}"`,
            `"${row.state || ''}"`,
            row.zip_code || '',
            row.home_phone || '',
            row.work_phone || ''
        ];
        csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "patient_list_report.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function printReport() {
    const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to print the report.");
        return;
    }

    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid #000;">
                    <th style="padding: 8px;">Last Visit</th>
                    <th style="padding: 8px;">Patient</th>
                    <th style="padding: 8px;">ID</th>
                    <th style="padding: 8px;">Street</th>
                    <th style="padding: 8px;">City</th>
                    <th style="padding: 8px;">State</th>
                    <th style="padding: 8px;">Zip</th>
                    <th style="padding: 8px;">Home Phone</th>
                    <th style="padding: 8px;">Work Phone</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentReportData.forEach(row => {
        tableHtml += `
            <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding: 8px;">${escapeHtml(row.last_visit ? row.last_visit.split(' ')[0] : '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</td>
                <td style="padding: 8px;">${escapeHtml(row.patient_no || row.id)}</td>
                <td style="padding: 8px;">${escapeHtml(row.address_line || '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.city || '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.state || '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.zip_code || '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.home_phone || '')}</td>
                <td style="padding: 8px;">${escapeHtml(row.work_phone || '')}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
        <div style="margin-top: 20px; font-weight: bold; text-align: right;">
            Total Number of Patients: ${currentReportData.length}
        </div>
    `;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Patient List Report</title>
            <style>
                body { font-family: sans-serif; padding: 20px; color: #333; }
                h1 { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <h1>Patient List Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            ${tableHtml}
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
