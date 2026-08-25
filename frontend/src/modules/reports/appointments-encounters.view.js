export function AppointmentsEncountersReportView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="appt-encounters-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Appointments and Encounters</h2>

            <form id="aeForm" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 60px 180px 40px 180px; gap: 12px; align-items: center;">
                    
                    <label style="color: #4a5568; font-size: 12px;">Facility:</label>
                    <select id="aeFacility" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">DOS:</label>
                    <input type="date" id="aeBeginDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                    
                    <div style="grid-column: 2 / 3; display: flex; align-items: center; margin-top: 5px;">
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="aeDetails"> Details
                        </label>
                    </div>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px; grid-column: 3 / 4; grid-row: 1;">To:</label>
                    <input type="date" id="aeEndDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%; grid-column: 4 / 5; grid-row: 1;">
                </div>

                <div style="display: flex; gap: 20px; align-items: center; margin-left: 20px; padding-top: 20px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 50px;"></div>
                    
                    <div>
                        <div style="display: flex; gap: 0;">
                            <button type="button" id="aeSubmitBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Submit
                            </button>
                            
                            <div id="aeActionButtons" style="display: none; align-items: center;">
                                <button type="button" class="aeActionBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div id="aeInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Please input search criteria above, and click Submit to view results.
            </div>

            <div id="aeTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 20%;">Practitioner</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Date/Appt</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 15%;">Patient</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 5%;">ID</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Chart</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Encounter</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Charges</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Copays</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Billed</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; width: 10%;">Error</th>
                        </tr>
                    </thead>
                    <tbody id="aeTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
