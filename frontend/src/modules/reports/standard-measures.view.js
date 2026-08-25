export function StandardMeasuresView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

    return `
        <div class="standard-measures-wrapper" style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="font-size: 22px; color: #1a365d; margin-bottom: 20px; font-weight: normal;">Report - Standard Measures - Date of Report: ${formattedDate}</h2>

            <form id="smForm" style="display: flex; gap: 40px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center;">
                    <label style="color: #4a5568; font-size: 13px;">Target Date</label>
                    <input type="text" id="smTargetDate" value="${formattedDate}" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px;">
                    
                    <label style="color: #4a5568; font-size: 13px;">Rule Set</label>
                    <select id="smRuleSet" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px;">
                        <option value="Passive Alert Rules">Passive Alert Rules</option>
                        <option value="Active Alert Rules">Active Alert Rules</option>
                    </select>

                    <label style="color: #4a5568; font-size: 13px;">Plan Set</label>
                    <select id="smPlanSet" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px;">
                        <option value="">-- Ignore --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 13px;">Provider:</label>
                    <select id="smProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px;">
                        <option value="">-- All (Cumulative) --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 13px;">Provider Relationship:</label>
                    <select id="smProviderRelationship" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; width: 250px; background-color: #e2e8f0; color: #2d3748; font-size: 13px;">
                        <option value="Primary">Primary</option>
                    </select>
                </div>

                <div style="display: flex; gap: 24px; align-items: center; padding-top: 60px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 60px;"></div>
                    <div style="display: flex; gap: 0;">
                        <button type="button" id="smPrintBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                        <button type="button" id="smStartAnotherBtn" style="padding: 8px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            Start Another Report
                        </button>
                    </div>
                </div>
            </form>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #e2e8f0; border-bottom: 2px solid #cbd5e0;">
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: left;">Title</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Total Patients</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Applicable Patients<br>(Denominator)</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Denominator<br>Exclusion</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Passed Patients<br>(Numerator)</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: center;">Failed<br>Patients</th>
                        <th style="padding: 10px 16px; font-weight: bold; color: #4a5568; text-align: right;">Performance<br>Percentage</th>
                    </tr>
                </thead>
                <tbody id="smTableBody">
                    <tr>
                        <td colspan="7" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading report data...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
