export function AlertsLogView() {
    return `
        <div class="alerts-log-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Alerts Log</h2>

            <form id="alForm" style="display: flex; gap: 40px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: center;">
                    <label style="color: #4a5568; font-size: 13px;">Begin Date:</label>
                    <input type="text" id="alBeginDate" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; color: #2d3748; font-size: 13px;">
                    
                    <label style="color: #4a5568; font-size: 13px;">End Date:</label>
                    <input type="text" id="alEndDate" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; color: #2d3748; font-size: 13px;">
                </div>

                <div style="display: flex; gap: 24px; align-items: center; padding-top: 20px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 40px;"></div>
                    
                    <div style="display: flex; gap: 0;">
                        <button type="button" id="alSearchBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px;">
                            Search
                        </button>
                        <button type="button" id="alDownloadBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px;">
                            Download
                        </button>
                    </div>
                </div>
            </form>

            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1a202c; margin-bottom: 20px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
                Rule has user provided feedback, select icon to show feedback
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px;">
                <thead>
                    <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">Date</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">Patient ID</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">User ID</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">Facility ID</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">Category</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">All Alerts</th>
                        <th style="padding: 12px; font-weight: bold; color: #1a202c; text-align: left;">New Alerts</th>
                    </tr>
                </thead>
                <tbody id="alTableBody">
                    <tr>
                        <td colspan="7" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading alerts...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
