export function MessageListView() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    return `
        <div class="message-list-wrapper" style="padding: 20px;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 24px; font-weight: 500;">Report - Message List</h2>
            
            <form id="mlReportForm" style="display: flex; gap: 40px; align-items: center; max-width: 1200px; margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">From:</label>
                    <input type="date" id="mlDateFrom" value="${firstDayOfYear}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; color: #2d3748; width: 140px;">
                    
                    <label style="color: #4a5568; font-size: 14px; margin-left: 10px;">To:</label>
                    <input type="date" id="mlDateTo" value="${today}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; color: #2d3748; width: 140px;">
                </div>

                <div style="flex-grow: 1;"></div>

                <div style="display: flex; gap: 24px; align-items: center; height: 40px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 100%;"></div>
                    
                    <div style="display: flex; background: #e2e8f0; border-radius: 4px; border: 1px solid #cbd5e0; overflow: hidden;">
                        <button type="submit" style="padding: 8px 16px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: background-color 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="mlExportBtn" style="padding: 8px 16px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: background-color 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            Export to CSV
                        </button>
                        <button type="button" id="mlPrintBtn" style="padding: 8px 16px; background: transparent; border: none; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: background-color 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                    </div>
                </div>
            </form>

            <div style="overflow-x: auto; background: white; border: 1px solid #e2e8f0; border-top: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #cbd5e0; color: #4a5568; background-color: #e2e8f0;">
                            <th style="padding: 10px 16px; font-weight: 600;">Date</th>
                            <th style="padding: 10px 16px; font-weight: 600;">User</th>
                            <th style="padding: 10px 16px; font-weight: 600;">Patient</th>
                            <th style="padding: 10px 16px; font-weight: 600;">PID</th>
                            <th style="padding: 10px 16px; font-weight: 600;">DOB</th>
                            <th style="padding: 10px 16px; font-weight: 600;">Type</th>
                            <th style="padding: 10px 16px; font-weight: 600;">Status</th>
                            <th style="padding: 10px 16px; font-weight: 600;">Updated By</th>
                            <th style="padding: 10px 16px; font-weight: 600;">Last Update</th>
                        </tr>
                    </thead>
                    <tbody id="mlReportTableBody">
                        <tr>
                            <td colspan="9" style="padding: 40px; text-align: center; color: #718096; font-style: italic;">No results to display. Click Submit to search.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
