export function ServicesBackgroundView() {
    return `
        <div class="services-background-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #f7fafc; min-height: 100%; text-align: left;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Background Services</h2>

            <div style="margin-bottom: 15px;">
                <button type="button" id="bgRefreshBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    Refresh
                </button>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: white; border: 1px solid #cbd5e0;">
                    <thead style="background-color: #e2e8f0;">
                        <tr>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: left; border-bottom: 1px solid #cbd5e0;">Service Name</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Active</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Automatic</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Interval (minutes)</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Currently Busy</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Last Run Started At</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;">Next Scheduled Run</th>
                            <th style="padding: 10px; color: #2d3748; font-weight: bold; text-align: center; border-bottom: 1px solid #cbd5e0;"></th>
                        </tr>
                    </thead>
                    <tbody id="bgTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
