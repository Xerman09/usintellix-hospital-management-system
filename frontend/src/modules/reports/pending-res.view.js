export function PendingOrdersReportView() {
    return `
        <div class="pending-orders-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%; text-align: center;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 15px; font-weight: normal; margin-top: 0;">Pending Orders</h2>

            <form id="pendForm" style="display: inline-flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <select id="pendFacility" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 180px; background-color: white;">
                        <option value="all">-- All Facilities --</option>
                    </select>
                    
                    <label style="color: #4a5568; font-size: 13px; margin-left: 10px;">From:</label>
                    <input type="date" id="pendDateFrom" value="${new Date().toISOString().split('T')[0]}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                    
                    <label style="color: #4a5568; font-size: 13px;">To:</label>
                    <input type="date" id="pendDateTo" value="${new Date().toISOString().split('T')[0]}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                </div>
                
                <div style="display: flex; gap: 0; margin-top: 5px;">
                    <button type="button" id="pendRefreshBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    
                    <button type="button" id="pendExportBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-right: none; border-radius: 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        Export to CSV
                    </button>
                    
                    <button type="button" id="pendPrintBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print
                    </button>
                </div>
            </form>

            <div id="pendTableContainer" style="text-align: left;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">Patient</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">ID</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">Ordered</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">From</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">Provider</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">Priority</th>
                            <th style="padding: 10px 8px; color: #1a202c; font-weight: bold; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="pendTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
