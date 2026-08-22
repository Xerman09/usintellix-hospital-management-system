import { getUser } from "../../core/session.js";
import { fetchHealthSummary } from "../health-records/health-records.service.js";

export function initReports() {
    const btnDownloadSummary = document.getElementById("btnDownloadSummary");
    const btnViewSummary = document.getElementById("btnViewSummary");
    const btnCustomizedHistory = document.getElementById("btnCustomizedHistory");
    const btnDownloadDocs = document.getElementById("btnDownloadDocs");
    const btnHelp = document.getElementById("btnHelp");

    if (btnDownloadSummary) {
        btnDownloadSummary.addEventListener("click", () => generateSummary(true));
    }
    
    if (btnViewSummary) {
        btnViewSummary.addEventListener("click", () => generateSummary(false));
    }

    if (btnCustomizedHistory) {
        btnCustomizedHistory.addEventListener("click", () => alert("Customized Medical History Report functionality coming soon."));
    }

    if (btnDownloadDocs) {
        btnDownloadDocs.addEventListener("click", () => alert("Download Medical Record Documents functionality coming soon."));
    }

    if (btnHelp) {
        btnHelp.addEventListener("click", () => alert("Please contact support for assistance with medical reports."));
    }
}

async function generateSummary(shouldPrint) {
    const user = getUser();
    if (!user || !user.id) return;
    
    // 1. Open synchronously BEFORE fetching
    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to view the report.");
        return;
    }

    // 2. Write a loading state immediately
    reportWindow.document.open();
    reportWindow.document.write(`
        <!DOCTYPE html><html><head><title>Loading Report...</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; color: #555;">
            <h2>Generating Summary of Care...</h2><p>Please wait.</p>
        </body></html>
    `);
    
    // 3. Perform the asynchronous fetch
    const result = await fetchHealthSummary(user.id);
    
    // 4. Handle Errors
    if (!result.success) {
        reportWindow.document.open();
        reportWindow.document.write(`<h2 style="font-family: sans-serif; color: #d92d20; padding: 40px; text-align: center;">Failed to load data.</h2>`);
        reportWindow.document.close();
        return;
    }
    
    // 5. Generate and overwrite the final HTML
    const data = result.data || {};
    const name = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Summary of Care - ${name}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { border-bottom: 2px solid #0f172a; padding-bottom: 10px; color: #0f172a; }
                h2 { color: #1e293b; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 18px; }
                .header-info { margin-bottom: 30px; }
                .header-info p { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 14px; }
                th { background-color: #f8fafc; font-weight: bold; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <button onclick="window.print()" class="no-print" style="margin-bottom: 20px; padding: 8px 16px; cursor: pointer;">Print / Save as PDF</button>
            
            <h1>Continuity of Care Record (CCR)</h1>
            <div class="header-info">
                <p><strong>Patient Name:</strong> ${name}</p>
                <p><strong>Patient No:</strong> ${user.patient_no || 'N/A'}</p>
                <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h2>Active Problems</h2>
            ${renderTable(data.problems, ['date', 'problem'], 'No active problems recorded.')}
            
            <h2>Medications</h2>
            ${renderTable(data.medications, ['date', 'medication'], 'No active medications recorded.')}
            
            <h2>Allergies</h2>
            <p>See full profile for allergy details.</p>
            
            ${shouldPrint ? `<script>window.onload = function() { window.print(); }</script>` : ''}
        </body>
        </html>
    `;
    
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
}

function renderTable(items, columns, emptyMsg) {
    if (!items || !items.length) {
        return `<p style="color: #64748b; font-style: italic;">${emptyMsg}</p>`;
    }
    
    return `
        <table>
            <thead>
                <tr>${columns.map(c => `<th>${c.charAt(0).toUpperCase() + c.slice(1)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>${columns.map(c => `<td>${item[c] || '-'}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
