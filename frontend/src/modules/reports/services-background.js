import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchBackgroundServices() {
    const tbody = document.getElementById("bgTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading...</td></tr>`;
    
    try {
        // Since there is no database table for background services in the current schema,
        // we will mock the expected result based on the requested format.
        setTimeout(() => {
            const mockData = [
                { name: "MedEx Messaging Service", active: "No", auto: "Not Applicable", interval: "Not Applicable", busy: "No", lastRun: "2017-05-09 17:39:10", nextRun: "Not Applicable", action: "" },
                { name: "phiMail Direct Messaging Service", active: "No", auto: "Not Applicable", interval: "Not Applicable", busy: "No", lastRun: "Never", nextRun: "Not Applicable", action: "View Log" },
                { name: "SFTP Claims to X12 Partner Service", active: "No", auto: "Not Applicable", interval: "Not Applicable", busy: "No", lastRun: "2021-01-18 11:24:10", nextRun: "Not Applicable", action: "" },
                { name: "Automated UUID Creation Service", active: "Yes", auto: "Yes", interval: "240", busy: "No", lastRun: "2026-08-26 04:22:37", nextRun: "2026-08-26 08:22:37", action: "" },
                { name: "Weno Log Sync", active: "No", auto: "Not Applicable", interval: "Not Applicable", busy: "No", lastRun: "2021-01-18 11:25:10", nextRun: "Not Applicable", action: "" },
                { name: "Email Service", active: "Yes", auto: "Yes", interval: "2", busy: "No", lastRun: "2026-08-26 06:34:41", nextRun: "2026-08-26 06:36:41", action: "" }
            ];

            tbody.innerHTML = "";
            mockData.forEach(item => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #e2e8f0";
                
                tr.innerHTML = `
                    <td style="padding: 8px 10px; color: #2d3748; text-align: right;">${item.name}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.active}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.auto}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.interval}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.busy}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.lastRun}</td>
                    <td style="padding: 8px 10px; color: #2d3748; text-align: center;">${item.nextRun}</td>
                    <td style="padding: 8px 10px; color: #3182ce; text-align: center; cursor: pointer;">
                        ${item.action ? `<a style="text-decoration: none; color: #3182ce;" href="javascript:void(0)" onclick="alert('Viewing log is not implemented in this demo.')">${item.action}</a>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            logReportRun("Background Services", "services_background", {});
        }, 500);

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #e53e3e;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

export function initServicesBackgroundReport() {
    const refreshBtn = document.getElementById("bgRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", fetchBackgroundServices);
    }
    
    // Auto fetch on load
    fetchBackgroundServices();
}
