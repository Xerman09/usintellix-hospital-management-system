export function AmcMeasuresView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

    return `
        <div class="amc-measures-wrapper" style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 id="amcTitle" style="font-size: 22px; color: #1a365d; margin-bottom: 20px; font-weight: normal;">Report - Automated Measure Calculations (AMC) - Date of Report:</h2>

            <form id="amcForm" style="display: flex; gap: 40px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center;">
                    <label style="color: #4a5568; font-size: 13px;">Begin Date:</label>
                    <input type="text" id="amcBeginDate" value="" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #f7fafc; color: #2d3748; font-size: 13px;">
                    
                    <label style="color: #4a5568; font-size: 13px;">End Date</label>
                    <input type="text" id="amcEndDate" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #f7fafc; color: #2d3748; font-size: 13px;">
                    
                    <label style="color: #4a5568; font-size: 13px;">Rule Set</label>
                    <select id="amcRuleSet" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #f7fafc; color: #2d3748; font-size: 13px;">
                        <option value="Automated Measure Calculations (AMC) - 2015">Automated Measure Calculations (AMC) - 2015</option>
                    </select>

                    <label style="color: #4a5568; font-size: 13px;">Provider:</label>
                    <select id="amcProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #f7fafc; color: #2d3748; font-size: 13px;">
                        <option value="">-- All (Cumulative) --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 13px;">Provider Relationship:</label>
                    <select id="amcProviderRelationship" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #f7fafc; color: #2d3748; font-size: 13px;">
                        <option value="Encounter">Encounter</option>
                    </select>

                    <label id="amcNumberLabsLabel" style="color: #4a5568; font-size: 13px; display: none;">Number labs:<br>(Non-electronic)</label>
                    <input type="text" id="amcNumberLabs" value="0" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px; display: none;">
                </div>

                <div style="display: flex; gap: 24px; align-items: center; padding-top: 60px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 60px;"></div>
                    
                    <div id="amcInitialButtons" style="display: flex; gap: 0;">
                        <button type="button" id="amcSubmitBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="amcPrintBtnInitial" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                    </div>

                    <div id="amcResultButtons" style="display: none; gap: 0;">
                        <button type="button" id="amcDetailedReportBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            AMC Detailed Report
                        </button>
                        <button type="button" id="amcPrintBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                        <button type="button" id="amcStartAnotherBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            Start Another Report
                        </button>
                    </div>
                </div>
            </form>

            <div id="amcMessage" style="font-size: 13px; color: #4a5568; margin-bottom: 20px;">
                Please input search criteria above, and click Submit to start report.
            </div>

            <table id="amcTable" style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; display: none;">
                <thead>
                    <tr style="background-color: #e2e8f0; border-bottom: 2px solid #cbd5e0;">
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: left;">Title</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Total Patients</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Denominator</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Numerator</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Failed</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Performance Percentage</th>
                    </tr>
                </thead>
                <tbody id="amcTableBody">
                </tbody>
            </table>
        </div>
    `;
}
