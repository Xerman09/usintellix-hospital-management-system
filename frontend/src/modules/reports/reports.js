import { getUser } from "../../core/session.js";
import { fetchHealthSummary } from "../health-records/health-records.service.js";
import { fetchProfile } from "../profile/profile.service.js";
import { generateCcdDetailedReportHtml } from "../patients/patients-list.js";

export function initReports() {
    const btnDownloadSummary = document.getElementById("btnDownloadSummary");
    const btnViewSummary = document.getElementById("btnViewSummary");
    const btnCustomizedHistory = document.getElementById("btnCustomizedHistory");
    const btnDownloadDocs = document.getElementById("btnDownloadDocs");
    const btnHelp = document.getElementById("btnHelp");

    if (btnDownloadSummary) {
        btnDownloadSummary.addEventListener("click", async () => {
            const originalText = btnDownloadSummary.innerHTML;
            btnDownloadSummary.innerHTML = "Downloading...";
            btnDownloadSummary.disabled = true;
            await generateSummary('download');
            btnDownloadSummary.innerHTML = originalText;
            btnDownloadSummary.disabled = false;
        });
    }
    
    if (btnViewSummary) {
        btnViewSummary.addEventListener("click", () => generateSummary('view'));
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

async function generateSummary(action) {
    const user = getUser();
    if (!user || !user.id) return;
    
    let reportWindow = null;
    if (action === 'view') {
        // 1. Open synchronously BEFORE fetching for view
        reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
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
    }
    
    // 3. Perform the asynchronous fetches
    const [healthResult, profileResult] = await Promise.all([
        fetchHealthSummary(user.id),
        fetchProfile()
    ]);
    
    // 4. Handle Errors
    if (!healthResult.success || !profileResult.success) {
        if (action === 'view' && reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(`<h2 style="font-family: sans-serif; color: #d92d20; padding: 40px; text-align: center;">Failed to load data.</h2>`);
            reportWindow.document.close();
        } else {
            alert("Failed to load data.");
        }
        return;
    }
    
    // 5. Generate the final HTML using the admin CCR template
    const fullPatientData = profileResult.data || user;
    const html = generateCcdDetailedReportHtml(fullPatientData, healthResult.data || {});
    
    if (action === 'view' && reportWindow) {
        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();
    } else if (action === 'download') {
        // Download as HTML file
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = (user.first_name || 'Patient') + '_' + (user.last_name || '');
        
        a.href = url;
        a.download = `Summary_Of_Care_${safeName}_${dateStr}.html`.replace(/[^a-zA-Z0-9_.-]/g, '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
