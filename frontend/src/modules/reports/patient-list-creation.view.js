export function PatientListCreationView() {
    const today = new Date().toISOString().split('T')[0] + ' 13:00:20';
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] + ' 13:00:20';

    return `
        <style>
            :root[data-theme="dark"] .patient-list-creation-wrapper h2 { color: var(--text-primary) !important; }
            :root[data-theme="dark"] .patient-list-creation-wrapper label,
            :root[data-theme="dark"] .patient-list-creation-wrapper p,
            :root[data-theme="dark"] .patient-list-creation-wrapper span { color: var(--text-muted) !important; }
            :root[data-theme="dark"] .patient-list-creation-wrapper input,
            :root[data-theme="dark"] .patient-list-creation-wrapper select {
                background-color: var(--bg-surface-alt) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            :root[data-theme="dark"] .patient-list-creation-wrapper button {
                background-color: var(--bg-surface-alt) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            :root[data-theme="dark"] .patient-list-creation-wrapper > div[style*="overflow-x"] {
                background: var(--bg-surface) !important;
                border-color: var(--border-color) !important;
            }
            :root[data-theme="dark"] .patient-list-creation-wrapper table thead tr {
                background-color: var(--bg-surface-alt) !important;
                color: var(--text-muted) !important;
                border-bottom-color: var(--border-color) !important;
            }
            :root[data-theme="dark"] .patient-list-creation-wrapper table td {
                color: var(--text-primary) !important;
            }
        </style>
        <div class="patient-list-creation-wrapper" style="padding: 20px;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 24px; font-weight: 500;">Report - Patient List Creation</h2>
            
            <form id="plcReportForm" style="display: flex; gap: 40px; align-items: flex-start; max-width: 1200px;">
                <!-- Left Column -->
                <div style="flex: 1; display: grid; grid-template-columns: 80px 1fr 50px 1fr; gap: 15px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">From:</label>
                    <input type="text" id="plcDateFrom" value="${firstDayOfYear}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px; text-align: center;">To:</label>
                    <input type="text" id="plcDateTo" value="${today}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">

                    <label style="color: #4a5568; font-size: 14px;">Patient ID:</label>
                    <input type="text" id="plcPatientId" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px; text-align: center; white-space: nowrap; margin-left: -15px;">Age Range:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="number" id="plcAgeMin" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 60px; box-sizing: border-box; color: #2d3748;">
                        <span style="color: #a0aec0;">—</span>
                        <input type="number" id="plcAgeMax" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 60px; box-sizing: border-box; color: #2d3748;">
                    </div>

                    <label style="color: #4a5568; font-size: 14px;">Provider:</label>
                    <select id="plcProvider" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="All">All</option>
                    </select>
                </div>

                <!-- Middle Column -->
                <div style="flex: 1; display: grid; grid-template-columns: 80px 1fr 60px 1fr; gap: 15px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">Option:</label>
                    <select id="plcOption" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="Demographics">Demographics</option>
                    </select>
                    
                    <div style="grid-column: 3 / 5;"></div>

                    <label style="color: #4a5568; font-size: 14px;">Gender:</label>
                    <select id="plcGender" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="Unassigned">Unassigned</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>

                    <label style="color: #4a5568; font-size: 14px; text-align: center;">Ethnicity:</label>
                    <select id="plcEthnicity" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="Unassigned">Unassigned</option>
                        <option value="Hispanic or Latino">Hispanic or Latino</option>
                        <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                    </select>
                </div>

                <!-- Right Column (Divider and Button) -->
                <div style="display: flex; gap: 24px; align-items: center; height: 120px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 100%;"></div>
                    <button type="submit" style="padding: 8px 24px; background-color: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; height: fit-content; transition: background-color 0.2s;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                </div>
            </form>

            <p style="color: #4a5568; font-size: 14px; margin-top: 20px; margin-bottom: 30px;">Please input search criteria above, and click Submit to view results.</p>

            <div style="overflow-x: auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0; color: #4a5568; background-color: #f7fafc;">
                            <th style="padding: 12px 16px; font-weight: 600;">Patient ID</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Name</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Sex</th>
                            <th style="padding: 12px 16px; font-weight: 600;">DOB</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Age</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Ethnicity</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Provider</th>
                            <th style="padding: 12px 16px; font-weight: 600;">Created At</th>
                        </tr>
                    </thead>
                    <tbody id="plcReportTableBody">
                        <tr>
                            <td colspan="8" style="padding: 40px; text-align: center; color: #718096; font-style: italic;">No results to display.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
