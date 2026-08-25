export function DailySummaryView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="daily-summary-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Daily Summary Report</h2>

            <form id="dsForm" style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
                <label style="color: #4a5568; font-size: 13px;">Facility:</label>
                <select id="dsFacility" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    <option value="">-- All Facilities --</option>
                </select>

                <label style="color: #4a5568; font-size: 13px;">From:</label>
                <input type="date" id="dsBeginDate" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                
                <label style="color: #4a5568; font-size: 13px;">To:</label>
                <input type="date" id="dsEndDate" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">

                <label style="color: #4a5568; font-size: 13px;">Provider:</label>
                <select id="dsProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    <option value="">-- All Providers --</option>
                </select>

                <div style="width: 1px; background-color: #cbd5e0; height: 30px; margin: 0 10px;"></div>
                
                <div style="display: flex; gap: 0;">
                    <button type="button" id="dsSubmitBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                    <button type="button" id="dsResetBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        Reset
                    </button>
                </div>
            </form>

            <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px; margin-top: 30px;">
                From <span id="dsDateRangeFrom">${formattedDate}</span> To <span id="dsDateRangeTo">${formattedDate}</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Date</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Facility</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Provider</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Appointments</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">New Patients</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Visited Patients</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Total Charges</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Total Co-Pay</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: normal; text-align: left;">Balance Payment</th>
                    </tr>
                </thead>
                <tbody id="dsTableBody">
                </tbody>
                <tfoot>
                    <tr style="border-top: 1px solid #e2e8f0;" id="dsTableTotalRow">
                        <td style="padding: 8px; color: #1a202c;">Total</td>
                        <td style="padding: 8px; color: #1a202c;">-</td>
                        <td style="padding: 8px; color: #1a202c;">-</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalAppt">0</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalNewPat">0</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalVisPat">0</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalChar">0.00</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalCopay">0.00</td>
                        <td style="padding: 8px; color: #1a202c;" id="dsTotalBal">0.00</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
