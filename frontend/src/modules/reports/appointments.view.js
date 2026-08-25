export function AppointmentsReportView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="appointments-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Appointments</h2>

            <form id="aptForm" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 80px 200px 60px 250px; gap: 12px; align-items: center;">
                    
                    <label style="color: #4a5568; font-size: 12px;">Facility:</label>
                    <select id="aptFacility" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">Provider:</label>
                    <select id="aptProvider" multiple size="4" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all" selected>-- All --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px;">From:</label>
                    <input type="date" id="aptBeginDate" value="${formattedDate}" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                    
                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">To:</label>
                    <input type="date" id="aptEndDate" value="${formattedDate}" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">

                    <label style="color: #4a5568; font-size: 12px;">Status:</label>
                    <select id="aptStatus" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">All</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">Category:</label>
                    <select id="aptCategory" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">All</option>
                    </select>
                    
                    <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkShowAvailable"> Show Available Times
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkShowReminders"> Show Reminders
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkWithoutProvider"> Without Provider
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkWithoutFacility"> Without Facility
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkShowDay"> Show Day of Week
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkWithCanceled"> With Canceled Appointments
                        </label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" id="chkShowAddress"> Show Patient Address
                        </label>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; margin-left: 20px; padding-top: 60px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 100px;"></div>
                    
                    <div>
                        <div style="font-size: 12px; color: #4a5568; margin-bottom: 8px;">Most column headers can be clicked to change sort order</div>
                        <div style="display: flex; gap: 0;">
                            <button type="button" id="aptSubmitBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Submit
                            </button>
                            
                            <div id="aptActionButtons" style="display: none; align-items: center;">
                                <button type="button" class="aptActionBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Print
                                </button>
                                <button type="button" class="aptActionBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    &rarr; Superbills
                                </button>
                                <button type="button" class="aptActionBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    &rarr; Address Labels
                                </button>
                                <button type="button" class="aptActionBtn" id="aptExportBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                    &rarr; Export to CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div id="aptInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Please input search criteria above, and click Submit to view results.
            </div>

            <div id="aptTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #ebf8ff; border-top: 1px solid #bee3f8; border-bottom: 1px solid #bee3f8;">
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Provider</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Time</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Patient</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">ID</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Home</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Cell</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Type</th>
                            <th style="padding: 8px; color: #1a365d; font-weight: bold; text-align: left; cursor: pointer;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="aptTableBody">
                    </tbody>
                </table>
                <div style="display: flex; gap: 100px; padding: 12px 8px; font-size: 12px; color: #2d3748; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0;">
                    <div>Total number of appointments: <span id="aptTotalCount">0</span></div>
                    <div>Total number of canceled appointments: <span id="aptTotalCanceled">0</span></div>
                </div>
            </div>
        </div>
    `;
}
