export function EncountersReportView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="encounters-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Encounters</h2>

            <form id="encForm" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 80px 200px 60px 200px; gap: 12px; align-items: center;">
                    
                    <label style="color: #4a5568; font-size: 12px;">Facility:</label>
                    <select id="encFacility" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">Provider:</label>
                    <select id="encProvider" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px;">From:</label>
                    <input type="date" id="encBeginDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                    
                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">To:</label>
                    <input type="date" id="encEndDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">

                    <div style="grid-column: 2 / 3; display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="encDetails"> Details
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="encNew"> New
                        </label>
                    </div>

                    <div style="grid-column: 4 / 5; display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="encFormsEsigned"> Forms Esigned
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="encEncounterEsigned"> Encounter Esigned
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="encNotEsigned"> Not Esigned
                        </label>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; margin-left: 20px; padding-top: 60px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 80px;"></div>
                    
                    <div>
                        <div style="display: flex; gap: 0;">
                            <button type="button" id="encSubmitBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Submit
                            </button>
                            
                            <div id="encActionButtons" style="display: none; align-items: center;">
                                <button type="button" class="encActionBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div id="encInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Please input search criteria above, and click Submit to view results.
            </div>

            <div id="encTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; cursor: pointer; width: 50%;">Provider</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; cursor: pointer; width: 50%;">Encounters</th>
                        </tr>
                    </thead>
                    <tbody id="encTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
