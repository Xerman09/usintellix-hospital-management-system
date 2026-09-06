export function ReceiptsSummaryView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="rs-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Receipts Summary</h2>

            <form id="rsForm">
                <div style="display: flex; gap: 24px; align-items: flex-end; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 4px;">Report by</label>
                        <select id="rsReportBy" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px; min-width: 160px;">
                            <option value="payer">Payer</option>
                            <option value="method">Method</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 4px;">Facility</label>
                        <select id="rsFacility" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px; min-width: 160px;">
                            <option value="">-- All Facilities --</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 24px; align-items: flex-end; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 4px;">Provider Provider:</label>
                        <select id="rsProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px; min-width: 160px;">
                            <option value="">-- All Providers --</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 4px;">Procedure/Service</label>
                        <input type="text" id="rsProcedure" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px; min-width: 160px;">
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 16px;">
                    <select id="rsDateType" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                        <option value="payment">Payment Date</option>
                        <option value="encounter">Encounter Date</option>
                    </select>

                    <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" id="rsDetails">
                        Details
                    </label>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">From:</label>
                        <input type="date" id="rsDateFrom" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">To:</label>
                        <input type="date" id="rsDateTo" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>
                </div>

                <div style="display: flex; gap: 0;">
                    <button type="button" id="rsSubmitBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                    <button type="button" id="rsPrintBtn" style="display: none; padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print
                    </button>
                    <button type="button" id="rsCsvBtn" style="display: none; padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"></path></svg>
                        CSV Export
                    </button>
                </div>
            </form>

            <p id="rsInstructionText" style="margin-top: 16px; color: #2d3748; font-size: 13px;">
                Please input search criteria above, and click Submit to view results.
            </p>

            <div id="rsResultsArea" style="display: none;">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Method</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Reference</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Date</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Invoice</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Patient</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Policy</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">DOS</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left; white-space: nowrap;">Procedure</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: right; white-space: nowrap;">Adjustments</th>
                                <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: right; white-space: nowrap;">Payments</th>
                            </tr>
                        </thead>
                        <tbody id="rsTableBody"></tbody>
                        <tfoot>
                            <tr style="background-color: #bee3f8; border-top: 2px solid #2d3748;">
                                <td colspan="8" style="padding: 8px; font-weight: bold; color: #2c5282;">Grand Total</td>
                                <td style="padding: 8px; font-weight: bold; color: #2c5282; text-align: right;" id="rsGrandAdjustments">0.00</td>
                                <td style="padding: 8px; font-weight: bold; color: #2c5282; text-align: right;" id="rsGrandPayments">0.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}
