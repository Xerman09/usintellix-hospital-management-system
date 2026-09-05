export function SalesByItemView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="sbi-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Sales by Item</h2>

            <form id="sbiForm">
                <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Facility:</label>
                        <select id="sbiFacility" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                            <option value="">-- All Facilities --</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">From:</label>
                        <input type="date" id="sbiDateFrom" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">To:</label>
                        <input type="date" id="sbiDateTo" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <div style="width: 1px; background-color: #cbd5e0; height: 30px; margin: 0 5px;"></div>

                    <div style="display: flex; gap: 0;">
                        <button type="button" id="sbiSubmitBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="sbiPrintBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                        <button type="button" id="sbiCsvBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"></path></svg>
                            CSV Export
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Provider:</label>
                        <select id="sbiProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px; min-width: 180px;">
                            <option value="">-- All Providers --</option>
                        </select>
                    </div>

                    <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" id="sbiDetails">
                        Details
                    </label>
                </div>
            </form>

            <div style="text-align: right; margin: 20px 0 10px; color: #2c5282; font-weight: bold; font-size: 14px;">
                Report Date <span id="sbiRangeFrom">${formattedDate}</span> - <span id="sbiRangeTo">${formattedDate}</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                        <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Category</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Item</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: right;">Qty</th>
                        <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody id="sbiTableBody"></tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #2d3748;">
                        <td colspan="2" style="padding: 8px; font-weight: bold; color: #1a202c;">Grand Total</td>
                        <td style="padding: 8px; font-weight: bold; color: #1a202c; text-align: right;" id="sbiGrandQty">0</td>
                        <td style="padding: 8px; font-weight: bold; color: #1a202c; text-align: right;" id="sbiGrandAmount">0.00</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
