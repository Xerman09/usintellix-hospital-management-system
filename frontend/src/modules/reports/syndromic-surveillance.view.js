export function SyndromicSurveillanceReportView() {
    return `
        <div class="syndromic-surveillance-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Report - Syndromic Surveillance - Non Reported Issues</h2>

            <form id="synForm" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="color: #4a5568; font-size: 11px; width: 50px;">Diagnosis:</label>
                    <select id="synDiagnosis" multiple size="3" style="padding: 2px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 60px; height: 50px; background-color: white;">
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 8px; margin-top: 15px;">
                    <label style="color: #4a5568; font-size: 11px;">From:</label>
                    <input type="date" id="synDateFrom" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 15px;">
                    <label style="color: #4a5568; font-size: 11px;">To:</label>
                    <input type="date" id="synDateTo" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                </div>
                
                <div style="width: 1px; background-color: #cbd5e0; height: 35px; margin-left: 5px; margin-right: 5px; margin-top: 8px;"></div>
                
                <div style="display: flex; gap: 0; margin-top: 10px;">
                    <button type="button" id="synRefreshBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    
                    <button type="button" id="synPrintBtn" style="display: none; padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print
                    </button>

                    <button type="button" id="synHl7Btn" style="display: none; padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        Get HL7
                    </button>
                </div>
            </form>

            <div id="synInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Click Refresh to view all results, or please input search criteria above to view specific results.<br>
                (This report currently only works for ICD9 codes.)
            </div>

            <div id="synTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Patient ID</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Patient Name</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Diagnosis</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Issue ID</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Issue Title</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Issue Date</th>
                        </tr>
                    </thead>
                    <tbody id="synTableBody">
                    </tbody>
                </table>
                <div id="synFooter" style="background-color: #86efac; padding: 6px 8px; font-weight: bold; color: #1a202c; font-size: 13px; border-bottom: 1px solid #cbd5e0;">
                    Total Number of Issues : 0
                </div>
            </div>
        </div>
    `;
}
