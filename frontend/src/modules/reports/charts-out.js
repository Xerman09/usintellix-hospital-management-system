import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

export async function initChartsOutReport() {
    const content = document.getElementById("choContent");
    if (!content) return;

    try {
        const result = await api(`/reports/visits/charts-out`);

        if (result.success) {
            const data = result.data;
            
            if (!data || data.length === 0) {
                content.textContent = "There are no charts checked out.";
            } else {
                // Future implementation if charts out data exists
                let html = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Patient Name</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Time Out</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                data.forEach(item => {
                    html += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px; color: #2d3748;">${item.patient_name || ''}</td>
                            <td style="padding: 8px; color: #2d3748;">${item.time_out || ''}</td>
                        </tr>
                    `;
                });
                
                html += `</tbody></table>`;
                content.innerHTML = html;
            }
            
            logReportRun("Charts Checked Out", "charts_out");
        } else {
            content.style.color = "#e53e3e";
            content.textContent = "Failed to load data.";
        }
    } catch (err) {
        content.style.color = "#e53e3e";
        content.textContent = "Error fetching report.";
        console.error(err);
    }
}
