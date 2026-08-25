export function ReferralsReportView() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    return `
        <div class="referrals-report-wrapper" style="padding: 20px;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 24px; font-weight: 500;">Report - Referrals</h2>
            
            <form id="refReportForm" style="display: flex; gap: 40px; align-items: flex-start; max-width: 1000px; margin-bottom: 20px;">
                <div style="flex: 1; display: flex; gap: 15px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">Facility:</label>
                    <select id="refFacility" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; color: #2d3748; background-color: white; width: 180px;">
                        <option value="All">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 14px; margin-left: 10px;">From:</label>
                    <input type="text" id="refDateFrom" value="${firstDayOfYear}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 140px; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px; margin-left: 10px;">To:</label>
                    <input type="text" id="refDateTo" value="${today}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 140px; color: #2d3748;">
                </div>

                <div style="display: flex; gap: 24px; align-items: center; height: 100%;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 40px;"></div>
                    <div style="display: flex; background: #e2e8f0; border-radius: 4px; border: 1px solid #cbd5e0; overflow: hidden; height: fit-content;">
                        <button type="submit" style="padding: 8px 16px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="refPrintBtn" style="padding: 8px 16px; background: transparent; border: none; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                    </div>
                </div>
            </form>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                    <thead style="background-color: #e2e8f0; border-bottom: 1px solid #cbd5e0;">
                        <tr>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">Refer To</th>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">Refer Date</th>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">Reply Date</th>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">Patient</th>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">ID</th>
                            <th style="padding: 12px 16px; font-weight: bold; color: #4a5568;">Reason</th>
                        </tr>
                    </thead>
                    <tbody id="refResultsTableBody">
                        <tr>
                            <td colspan="6" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">
                                Please select filters and click Submit to view referrals.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
