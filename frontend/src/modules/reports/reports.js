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
    const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
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
    
    // 3. Perform the asynchronous fetches
    const [healthResult, profileResult] = await Promise.all([
        fetchHealthSummary(user.id),
        fetchProfile()
    ]);
    
    // 4. Handle Errors
    if (!healthResult.success || !profileResult.success) {
        reportWindow.document.open();
        reportWindow.document.write(`<h2 style="font-family: sans-serif; color: #d92d20; padding: 40px; text-align: center;">Failed to load data.</h2>`);
        reportWindow.document.close();
        return;
    }
    
    // 5. Generate and overwrite the final HTML using the admin CCR template
    const fullPatientData = profileResult.data || user;
    const html = generateCcdDetailedReportHtml(fullPatientData, healthResult.data || {});
    
    reportWindow.document.open();
    reportWindow.document.write(html);
    
    // Auto print if requested
    if (shouldPrint) {
        reportWindow.document.write(`<script>window.onload = function() { window.print(); }</script>`);
    }
    
    reportWindow.document.close();
}
