export function ChartActivityReportView() {
    return `
        <div class="chart-activity-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 id="chaTitle" style="font-size: 20px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Report - Chart Location Activity</h2>

            <form id="chaForm" style="display: flex; gap: 20px; align-items: center; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="color: #4a5568; font-size: 12px; width: 45px; line-height: 1.2;">Patient<br>ID:</label>
                    <input type="text" id="chaPatientId" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100px;">
                </div>
                
                <div style="width: 1px; background-color: #cbd5e0; height: 35px; margin-left: 5px; margin-right: 5px;"></div>
                
                <div style="display: flex; gap: 0;">
                    <button type="button" id="chaSubmitBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                    
                    <button type="button" id="chaPrintBtn" style="display: none; padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print
                    </button>
                </div>
            </form>

            <div id="chaInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Please input search criteria above, and click Submit to view results.
            </div>

            <div id="chaTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 200px;">Time</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Destination</th>
                        </tr>
                    </thead>
                    <tbody id="chaTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
