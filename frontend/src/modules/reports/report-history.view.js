export function ReportHistoryView() {
    const now = new Date();
    const endDate = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);
    // Default begin date: Year To Date (Jan 1 of current year)
    const beginDate = now.getFullYear() + '-01-01 00:00:00';

    return `
        <div class="report-history-wrapper" style="padding: 20px;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: 500;">Report History/Results</h2>

            <form id="rhForm" style="display: flex; gap: 40px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 90px 1fr; gap: 12px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">Begin Date:</label>
                    <input type="text" id="rhDateFrom" value="${beginDate}" style="padding: 8px 12px; border: 1px solid #cbd5e0; border-radius: 4px; width: 200px; color: #2d3748; font-size: 13px;">
                    
                    <label style="color: #4a5568; font-size: 14px;">End Date:</label>
                    <input type="text" id="rhDateTo" value="${endDate}" style="padding: 8px 12px; border: 1px solid #cbd5e0; border-radius: 4px; width: 200px; color: #2d3748; font-size: 13px;">
                </div>

                <div style="display: flex; gap: 24px; align-items: center; padding-top: 4px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 60px;"></div>
                    <div style="display: flex; gap: 8px;">
                        <button type="submit" style="padding: 8px 18px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            Search
                        </button>
                        <button type="button" id="rhRefreshBtn" style="padding: 8px 18px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-3.42"></path></svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </form>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #e2e8f0; border-bottom: 2px solid #cbd5e0;">
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: left;">Title</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: left;">Date</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: left;">Status</th>
                    </tr>
                </thead>
                <tbody id="rhTableBody">
                    <tr>
                        <td colspan="3" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Click Search to view report history.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
