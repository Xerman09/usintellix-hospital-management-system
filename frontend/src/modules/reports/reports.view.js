import { getUser } from "../../core/session.js";

export function ReportsView() {
    return `
<style>
.reports-page {
    width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
    color: #0f172a;
}

.reports-header-bar {
    background-color: #0f172a;
    color: white;
    padding: 16px 24px;
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 24px;
    border-radius: 8px;
}

.reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 0 16px;
}

.report-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 32px 16px 16px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
    min-height: 220px;
}

.report-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.report-icon {
    width: 64px;
    height: 64px;
    color: #0f172a;
    margin-bottom: 24px;
}

.report-btn {
    width: 100%;
    background-color: #22c55e;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.report-btn:hover {
    background-color: #16a34a;
}
</style>

<div class="reports-page">
    <div class="reports-header-bar">
        Medical Reports
    </div>
    
    <div class="reports-grid">
        <!-- View Summary of Care -->
        <div class="report-card">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <button class="report-btn" id="btnViewSummary">View Summary of Care</button>
        </div>
        
        <!-- Download Summary of Care -->
        <div class="report-card">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <button class="report-btn" id="btnDownloadSummary">Download Summary of Care</button>
        </div>
        
        <!-- Customized Medical History Report -->
        <div class="report-card">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            <button class="report-btn" id="btnCustomizedHistory">Customized Medical History Report</button>
        </div>
        
        <!-- Download Medical Record Documents -->
        <div class="report-card">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12v4"/><path d="M14 12v4"/><path d="M10 16h4"/></svg>
            <button class="report-btn" id="btnDownloadDocs">Download Medical Record Documents</button>
        </div>
        
        <!-- Help -->
        <div class="report-card">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <button class="report-btn" id="btnHelp" style="background-color: #3b82f6;">Help</button>
        </div>
    </div>
    
    <div id="customizedReportContainer" style="display: none; padding: 0 16px;">
        <button id="btnBackToReports" style="margin-bottom: 20px; background: none; border: none; color: #2563eb; cursor: pointer; font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Reports
        </button>
        
        <div class="prof-card-modern">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
                Customized Medical History Report
            </h2>
            
            <div style="display: flex; gap: 16px; margin-bottom: 24px; font-size: 14px; font-weight: 500; color: #0f172a;">
                Patient Report 
                <a href="#" id="customCheckAll" style="color: #2563eb; text-decoration: none;">Check All</a> | 
                <a href="#" id="customClearAll" style="color: #2563eb; text-decoration: none;">Clear All</a>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; font-size: 13px;">
                <div>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Demographics" checked> Demographics</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="History"> History</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Insurance"> Insurance</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Billing" checked> Billing</label>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Allergies" checked> Allergies</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Medications" checked> Medications</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Immunizations"> Immunizations</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Medical Problems"> Medical Problems</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Patient Notes"> Patient Notes</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Transactions"> Transactions</label>
                    <label style="display: block; margin-bottom: 8px;"><input type="checkbox" class="cat-cb" value="Communications"> Communications</label>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <!-- Issues Column -->
                <div>
                    <h3 style="font-size: 14px; margin-bottom: 16px; color: #0f172a;">Issues:</h3>
                    <div id="customIssuesList">
                        <!-- Populated by JS -->
                    </div>
                </div>
                <!-- Encounters & Forms Column -->
                <div>
                    <h3 style="font-size: 14px; margin-bottom: 16px; color: #0f172a;">Encounters & Forms:</h3>
                    <div id="customEncountersList">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;">
                <button id="btnCustomGenerate" style="background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 4px; font-weight: 500; cursor: pointer;">Generate Report</button>
                <button id="btnCustomDownload" style="background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 4px; font-weight: 500; cursor: pointer;">Download PDF</button>
            </div>
        </div>
    </div>
</div>
<style>
.prof-card-modern {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #e2e8f0;
    padding: 24px;
}
.custom-section-header {
    font-weight: bold;
    font-size: 13px;
    margin-top: 16px;
    margin-bottom: 8px;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
}
.custom-item-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0;
    border-bottom: 1px solid #f1f5f9;
}
.custom-item-row label {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
    `;
}
