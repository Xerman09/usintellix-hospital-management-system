export function IncidentLogView() {
    return `
        <div class="incident-log-wrapper" style="padding: 24px; font-family: Inter, Segoe UI, sans-serif; min-height: 100%;">
            <!-- Header Title and Actions -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">JCAHO / Patient Safety</span>
                        <span style="color: #64748b; font-size: 13px;">Sentinel Event & Adverse Incident Tracker</span>
                    </div>
                    <h1 style="font-size: 24px; font-weight: 700; margin: 6px 0 2px; color: #0f172a;" class="il-title">Incident & Adverse Event / Near-Miss Log</h1>
                    <p style="margin: 0; font-size: 13px; color: #64748b;" class="il-subtitle">Hospital-wide safety reporting supporting anonymous reporting under JCAHO "Just Culture" principles.</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;" class="no-print">
                    <button type="button" id="ilPrintBtn" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Log
                    </button>
                    <button type="button" id="ilNewIncidentBtn" style="display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(37,99,235,0.3); transition: background 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        + Report Incident / Near-Miss
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;" class="no-print">
                <div class="il-kpi-card" style="background: #ffffff; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Incidents</div>
                    <div id="ilKpiTotal" style="font-size: 28px; font-weight: 700; color: #0f172a; margin-top: 4px;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">All logged safety events</div>
                </div>
                <div class="il-kpi-card" style="background: #ffffff; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-size: 12px; font-weight: 600; color: #b91c1c; text-transform: uppercase;">Medication Errors</div>
                    <div id="ilKpiMedErrors" style="font-size: 28px; font-weight: 700; color: #dc2626; margin-top: 4px;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Prescribing, dosing, dispensing</div>
                </div>
                <div class="il-kpi-card" style="background: #ffffff; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase;">Slips & Falls</div>
                    <div id="ilKpiFalls" style="font-size: 28px; font-weight: 700; color: #d97706; margin-top: 4px;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Patient ambulation events</div>
                </div>
                <div class="il-kpi-card" style="background: #ffffff; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-size: 12px; font-weight: 600; color: #047857; text-transform: uppercase;">Near-Misses Caught</div>
                    <div id="ilKpiNearMisses" style="font-size: 28px; font-weight: 700; color: #059669; margin-top: 4px;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Interception prior to harm</div>
                </div>
                <div class="il-kpi-card" style="background: #ffffff; padding: 18px 20px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase;">Open / In Review</div>
                    <div id="ilKpiOpen" style="font-size: 28px; font-weight: 700; color: #2563eb; margin-top: 4px;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Active RCA & investigations</div>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="il-filters-box no-print" style="background: #ffffff; padding: 16px 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <form id="ilFilterForm" style="display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end;">
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">From Date</label>
                        <input type="date" id="ilDateFrom" class="il-input" style="padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">To Date</label>
                        <input type="date" id="ilDateTo" class="il-input" style="padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Department</label>
                        <select id="ilDeptFilter" class="il-input" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a; min-width: 170px;">
                            <option value="">All Departments</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Event Type</label>
                        <select id="ilTypeFilter" class="il-input" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a; min-width: 160px;">
                            <option value="">All Event Types</option>
                            <option value="Medication Error">Medication Error</option>
                            <option value="Slip / Fall">Slip / Fall</option>
                            <option value="Equipment Malfunction">Equipment Malfunction</option>
                            <option value="Near-Miss">Near-Miss</option>
                            <option value="Adverse Drug Reaction">Adverse Drug Reaction</option>
                            <option value="Documentation / Communication">Documentation / Communication</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Severity</label>
                        <select id="ilSeverityFilter" class="il-input" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a;">
                            <option value="">All Severities</option>
                            <option value="Near-Miss (No Harm)">Near-Miss (No Harm)</option>
                            <option value="Minor (Monitored)">Minor (Monitored)</option>
                            <option value="Moderate (Medical Intervention)">Moderate (Medical Intervention)</option>
                            <option value="Severe / Sentinel Event">Severe / Sentinel Event</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Status</label>
                        <select id="ilStatusFilter" class="il-input" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a;">
                            <option value="">All Statuses</option>
                            <option value="Reported">Reported</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Root Cause Analysis">Root Cause Analysis</option>
                            <option value="Corrective Action Planned">Corrective Action Planned</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div style="flex-grow: 1; min-width: 180px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Search Keyword</label>
                        <input type="text" id="ilSearchInput" placeholder="Incident #, summary, patient..." class="il-input" style="padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #0f172a; width: 100%;">
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" id="ilApplyFilterBtn" style="padding: 7px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Filter
                        </button>
                        <button type="button" id="ilResetFilterBtn" style="padding: 7px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            <!-- Incident Data Table Card -->
            <div class="il-table-card" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;" class="il-table-header">
                    <span style="font-weight: 700; font-size: 14px; color: #0f172a;" id="ilResultsCount">Loading incidents...</span>
                    <span style="font-size: 12px; color: #64748b;">Confidential Peer Review & Quality Assurance Document</span>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;" class="il-table">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Incident #</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Date & Time</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Department & Location</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Event Type</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Severity</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Reporter</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Patient Involved</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Status</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #475569; text-align: center;" class="no-print">Action</th>
                            </tr>
                        </thead>
                        <tbody id="ilTableBody">
                            <tr>
                                <td colspan="9" style="padding: 40px; text-align: center; color: #64748b; font-style: italic;">Loading incidents log...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- MODAL 1: Report Incident Form -->
            <div id="ilReportModal" class="il-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 9999; overflow-y: auto; padding: 24px 16px; align-items: center; justify-content: center;">
                <div class="il-modal-content" style="background: #ffffff; border-radius: 12px; max-width: 680px; width: 100%; margin: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1;">
                    <div style="background: #0f172a; color: white; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Report Patient Safety Incident / Near-Miss</h3>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Confidential reporting under JCAHO Just Culture policy</div>
                        </div>
                        <button type="button" id="ilCloseReportModal" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px;">&times;</button>
                    </div>
                    <form id="ilNewIncidentForm" style="padding: 24px;">
                        <!-- Anonymous Banner & Checkbox -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; font-size: 13px; color: #1e293b;">
                                <input type="checkbox" id="ilIsAnonymous" value="1" style="width: 17px; height: 17px; accent-color: #2563eb;">
                                <span>Report Anonymously</span>
                                <span style="background: #e2e8f0; color: #475569; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Confidential</span>
                            </label>
                            <p style="margin: 6px 0 0 27px; font-size: 12px; color: #64748b;">
                                Anonymous reporting protects reporter identity. No username or employee ID will be recorded on this event.
                            </p>
                        </div>

                        <!-- Reporter Info (Shown when not anonymous) -->
                        <div id="ilReporterInfoSection" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Reporter Full Name</label>
                                <input type="text" id="ilReporterName" placeholder="e.g. Sarah Jenkins, RN" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Staff Role / Title</label>
                                <input type="text" id="ilReporterRole" placeholder="e.g. Charge Nurse, Pharmacist" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                        </div>

                        <!-- Date, Department, Location -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Date & Time of Incident <span style="color:red;">*</span></label>
                                <input type="datetime-local" id="ilIncidentDate" required class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Department <span style="color:red;">*</span></label>
                                <select id="ilIncidentDept" required class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                    <option value="">-- Select Department --</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Exact Location / Room / Bed</label>
                            <input type="text" id="ilLocationDetails" placeholder="e.g. Room 304B, Trauma Bay 2, Dispensing Hood #1" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>

                        <!-- Type & Severity -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Event Classification <span style="color:red;">*</span></label>
                                <select id="ilEventType" required class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                    <option value="Medication Error">Medication Error</option>
                                    <option value="Slip / Fall">Slip / Fall</option>
                                    <option value="Equipment Malfunction">Equipment Malfunction</option>
                                    <option value="Near-Miss">Near-Miss</option>
                                    <option value="Adverse Drug Reaction">Adverse Drug Reaction</option>
                                    <option value="Documentation / Communication">Documentation / Communication</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Severity Level <span style="color:red;">*</span></label>
                                <select id="ilSeverityLevel" required class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                    <option value="Near-Miss (No Harm)">Near-Miss (No Harm)</option>
                                    <option value="Minor (Monitored)">Minor (Monitored)</option>
                                    <option value="Moderate (Medical Intervention)">Moderate (Medical Intervention)</option>
                                    <option value="Severe / Sentinel Event">Severe / Sentinel Event</option>
                                </select>
                            </div>
                        </div>

                        <!-- Optional Linked Patient -->
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Patient Name (Optional)</label>
                                <input type="text" id="ilPatientName" placeholder="Patient involved (leave blank if environmental/equipment)" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Patient MRN</label>
                                <input type="text" id="ilPatientMrn" placeholder="MRN-XXXXX" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                        </div>

                        <!-- Incident Summary -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Incident Headline / Short Summary <span style="color:red;">*</span></label>
                            <input type="text" id="ilSummary" required placeholder="Brief title of what occurred (e.g. Heparin dosing near miss)" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>

                        <!-- Narrative & Immediate Action -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Detailed Description of Event <span style="color:red;">*</span></label>
                            <textarea id="ilDescription" required rows="3" placeholder="Provide factual description: what happened, timeline, circumstances..." class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Immediate Action Taken <span style="color:red;">*</span></label>
                            <textarea id="ilImmediateAction" required rows="2" placeholder="First aid, physician notification, equipment quarantined, medication held..." class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                        </div>

                        <div style="margin-bottom: 24px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Suspected Contributing Factors (Optional)</label>
                            <input type="text" id="ilContributingFactors" placeholder="e.g. Look-alike packaging, alert fatigue, staffing shortage, wet floor" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>

                        <!-- Form Action Buttons -->
                        <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 18px;">
                            <button type="button" id="ilCancelReportBtn" style="padding: 9px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                Cancel
                            </button>
                            <button type="submit" id="ilSubmitReportBtn" style="padding: 9px 24px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL 2: View / Investigate & RCA Modal -->
            <div id="ilDetailModal" class="il-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 9999; overflow-y: auto; padding: 24px 16px; align-items: center; justify-content: center;">
                <div class="il-modal-content" style="background: #ffffff; border-radius: 12px; max-width: 760px; width: 100%; margin: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1;">
                    <div style="background: #1e293b; color: white; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span id="ilDetailNumber" style="font-size: 18px; font-weight: 700; color: #38bdf8;">INC-XXXX</span>
                                <span id="ilDetailStatusBadge" style="font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Status</span>
                            </div>
                            <div id="ilDetailDateDept" style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Date | Department</div>
                        </div>
                        <button type="button" id="ilCloseDetailModal" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px;">&times;</button>
                    </div>

                    <div style="padding: 24px; max-height: 75vh; overflow-y: auto;">
                        <!-- Summary and Narrative Card -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;" class="il-detail-section">
                            <h4 id="ilDetailSummary" style="margin: 0 0 10px; font-size: 16px; color: #0f172a; font-weight: 700;">Summary Headline</h4>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 12px; color: #475569; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                                <div><strong>Severity:</strong> <span id="ilDetailSeverity">--</span></div>
                                <div><strong>Event Type:</strong> <span id="ilDetailType">--</span></div>
                                <div><strong>Location:</strong> <span id="ilDetailLocation">--</span></div>
                                <div><strong>Reporter:</strong> <span id="ilDetailReporter">--</span></div>
                                <div><strong>Patient:</strong> <span id="ilDetailPatient">--</span></div>
                            </div>

                            <div style="margin-bottom: 10px;">
                                <strong style="font-size: 12px; color: #334155; display: block; margin-bottom: 2px;">Event Description:</strong>
                                <p id="ilDetailDescription" style="font-size: 13px; color: #1e293b; margin: 0; line-height: 1.5; white-space: pre-wrap;">--</p>
                            </div>

                            <div style="margin-bottom: 10px;">
                                <strong style="font-size: 12px; color: #334155; display: block; margin-bottom: 2px;">Immediate Action Taken:</strong>
                                <p id="ilDetailImmediateAction" style="font-size: 13px; color: #1e293b; margin: 0; line-height: 1.5; white-space: pre-wrap;">--</p>
                            </div>

                            <div id="ilDetailFactorsContainer" style="margin-top: 8px;">
                                <strong style="font-size: 12px; color: #334155;">Contributing Factors:</strong>
                                <span id="ilDetailContributingFactors" style="font-size: 13px; color: #475569;">None specified</span>
                            </div>
                        </div>

                        <!-- Quality & Risk Management Form -->
                        <form id="ilInvestigationForm">
                            <input type="hidden" id="ilDetailIncidentId" value="">
                            
                            <div style="border-left: 4px solid #2563eb; padding-left: 14px; margin-bottom: 18px;">
                                <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;" class="il-section-title">Quality Assurance & Root Cause Analysis (RCA)</h4>
                                <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">Enter investigation findings, corrective actions, and update incident resolution status.</p>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Investigation Status</label>
                                    <select id="ilUpdateStatus" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                        <option value="Reported">Reported</option>
                                        <option value="Under Investigation">Under Investigation</option>
                                        <option value="Root Cause Analysis">Root Cause Analysis</option>
                                        <option value="Corrective Action Planned">Corrective Action Planned</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Lead Investigator / Safety Officer</label>
                                    <input type="text" id="ilUpdateInvestigator" placeholder="e.g. Dr. Robert Hayes (Quality Director)" class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                </div>
                            </div>

                            <div style="margin-bottom: 16px;">
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Root Cause Analysis (RCA) Findings</label>
                                <textarea id="ilUpdateRCA" rows="3" placeholder="Identify systemic root causes (process failure, look-alike labeling, technology glitch)..." class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                            </div>

                            <div style="margin-bottom: 16px;">
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Corrective & Preventive Actions (CAPA)</label>
                                <textarea id="ilUpdateCAPA" rows="2" placeholder="Policy update, re-training, equipment replacement, two-person verification protocol..." class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                            </div>

                            <div style="margin-bottom: 24px;">
                                <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #334155;">Resolution Notes & Close-Out Summary</label>
                                <textarea id="ilUpdateResolution" rows="2" placeholder="Committee sign-off notes, closure justification, follow-up audit dates..." class="il-input" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                            </div>

                            <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #e2e8f0; padding-top: 18px;">
                                <button type="button" id="ilCloseDetailBtn" style="padding: 9px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    Close
                                </button>
                                <button type="submit" id="ilSaveInvestigationBtn" style="padding: 9px 24px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    Save Investigation & RCA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Scoped Styles (Dark Mode & Print) -->
            <style>
                @media print {
                    .no-print, .il-filters-box, .il-modal-backdrop, .top-navbar, .sidebar { display: none !important; }
                    body, html { background: white !important; color: black !important; }
                    .incident-log-wrapper { padding: 0 !important; }
                    .il-table-card { border: none !important; box-shadow: none !important; }
                    .il-table th, .il-table td { border-bottom: 1px solid #000 !important; color: #000 !important; font-size: 11px !important; }
                }

                :root[data-theme="dark"] .incident-log-wrapper {
                    background-color: transparent !important;
                    color: #f1f5f9 !important;
                }
                :root[data-theme="dark"] .il-title { color: #f1f5f9 !important; }
                :root[data-theme="dark"] .il-subtitle { color: #94a3b8 !important; }
                :root[data-theme="dark"] .il-kpi-card {
                    background: #1e293b !important;
                    border-color: #334155 !important;
                }
                :root[data-theme="dark"] #ilKpiTotal { color: #f1f5f9 !important; }
                :root[data-theme="dark"] .il-filters-box {
                    background: #1e293b !important;
                    border-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-input {
                    background: #0f172a !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }
                :root[data-theme="dark"] .il-table-card {
                    background: #1e293b !important;
                    border-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-table-header {
                    border-bottom-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-table-header span {
                    color: #f1f5f9 !important;
                }
                :root[data-theme="dark"] .il-table thead tr {
                    background: #0f172a !important;
                    border-bottom-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-table th {
                    color: #cbd5e1 !important;
                }
                :root[data-theme="dark"] .il-table td {
                    color: #e2e8f0 !important;
                    border-bottom-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-modal-content {
                    background: #1e293b !important;
                    border-color: #334155 !important;
                    color: #f1f5f9 !important;
                }
                :root[data-theme="dark"] .il-detail-section {
                    background: #0f172a !important;
                    border-color: #334155 !important;
                }
                :root[data-theme="dark"] .il-section-title,
                :root[data-theme="dark"] #ilDetailSummary {
                    color: #f1f5f9 !important;
                }
            </style>
        </div>
    `;
}
