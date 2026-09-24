export function SecurityIncidentsView() {
    return `
    <div class="sec-inc-container">
        <style>
            .sec-inc-container {
                padding: 24px;
                background: #f8fafc;
                min-height: calc(100vh - 100px);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #1e293b;
            }

            /* Header */
            .sec-inc-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 16px;
                background: #ffffff;
                padding: 20px 24px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }

            .sec-inc-title-area {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .sec-inc-title-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .sec-inc-title {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .sec-inc-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .sec-inc-badge-red {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }

            .sec-inc-badge-green {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .sec-inc-badge-amber {
                background: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
            }

            .sec-inc-badge-blue {
                background: #dbeafe;
                color: #1d4ed8;
                border: 1px solid #bfdbfe;
            }

            .sec-inc-subtitle {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }

            .sec-inc-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            /* Buttons */
            .sec-inc-btn-primary {
                background: #dc2626;
                color: #ffffff;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.15s ease;
                box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
            }

            .sec-inc-btn-primary:hover {
                background: #b91c1c;
            }

            .sec-inc-btn-secondary {
                background: #ffffff;
                color: #334155;
                border: 1px solid #cbd5e1;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.15s ease;
            }

            .sec-inc-btn-secondary:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }

            .sec-inc-btn-sm {
                padding: 4px 10px;
                font-size: 12px;
                border-radius: 5px;
            }

            /* KPI Cards */
            .sec-inc-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .sec-inc-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                overflow: hidden;
            }

            .sec-inc-kpi-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
            }

            .kpi-total::before { background: #3b82f6; }
            .kpi-active::before { background: #f59e0b; }
            .kpi-breaches::before { background: #ef4444; }
            .kpi-countdown::before { background: #8b5cf6; }
            .kpi-individuals::before { background: #059669; }

            .sec-inc-kpi-label {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                margin-bottom: 6px;
            }

            .sec-inc-kpi-val {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1;
            }

            .sec-inc-kpi-sub {
                font-size: 11.5px;
                color: #94a3b8;
                margin-top: 6px;
            }

            /* Filter Bar */
            .sec-inc-filter-bar {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 14px 18px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
            }

            .sec-inc-filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                flex: 1;
            }

            .sec-inc-search {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                min-width: 240px;
                outline: none;
            }

            .sec-inc-search:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
            }

            .sec-inc-select {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                background: #ffffff;
                outline: none;
                cursor: pointer;
            }

            /* Table */
            .sec-inc-table-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                overflow: hidden;
            }

            .sec-inc-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .sec-inc-table th {
                background: #f8fafc;
                border-bottom: 2px solid #e2e8f0;
                padding: 12px 14px;
                text-align: left;
                font-weight: 700;
                color: #475569;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .sec-inc-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }

            .sec-inc-table tr:hover td {
                background: #fafafa;
            }

            .sec-inc-table .incident-num {
                font-family: Consolas, Monaco, monospace;
                font-weight: 700;
                color: #0f172a;
            }

            .countdown-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
            }

            .countdown-normal {
                background: #e0f2fe;
                color: #0369a1;
            }

            .countdown-warning {
                background: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
                animation: pulseWarning 2s infinite;
            }

            .countdown-overdue {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
                font-weight: 800;
            }

            .countdown-settled {
                background: #dcfce7;
                color: #15803d;
            }

            @keyframes pulseWarning {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            /* Modal Styles */
            .sec-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.65);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                padding: 20px;
                box-sizing: border-box;
                backdrop-filter: blur(2px);
            }

            .sec-modal {
                background: #ffffff;
                border-radius: 12px;
                max-width: 850px;
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }

            .sec-modal-header {
                padding: 18px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #f8fafc;
            }

            .sec-modal-title {
                font-size: 17px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sec-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #64748b;
                line-height: 1;
                padding: 4px;
            }

            .sec-modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .sec-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 10px;
            }

            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            .form-group {
                margin-bottom: 16px;
            }

            .form-group.full-width {
                grid-column: 1 / -1;
            }

            .form-label {
                display: block;
                font-size: 12px;
                font-weight: 700;
                color: #334155;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .form-input, .form-textarea, .form-select {
                width: 100%;
                box-sizing: border-box;
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                color: #0f172a;
                outline: none;
            }

            .form-textarea {
                min-height: 80px;
                resize: vertical;
                font-family: inherit;
            }

            .form-input:focus, .form-textarea:focus, .form-select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
            }

            /* 4-Factor Assessment Cards */
            .risk-factor-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 14px 16px;
                margin-bottom: 14px;
            }

            .risk-factor-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .risk-factor-name {
                font-size: 13.5px;
                font-weight: 700;
                color: #0f172a;
            }

            .risk-meter-box {
                background: #f1f5f9;
                border-radius: 8px;
                padding: 16px;
                margin: 18px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border: 1px solid #e2e8f0;
            }

            /* Print Letter Styling */
            @media print {
                body * {
                    visibility: hidden;
                }
                #breachLetterPrintArea, #breachLetterPrintArea * {
                    visibility: visible;
                }
                #breachLetterPrintArea {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 40px;
                    background: white;
                    color: black;
                }
            }

            /* Dark theme support */
            :root[data-theme="dark"] .sec-inc-container {
                background: #0f172a;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .sec-inc-header,
            :root[data-theme="dark"] .sec-inc-kpi-card,
            :root[data-theme="dark"] .sec-inc-filter-bar,
            :root[data-theme="dark"] .sec-inc-table-card,
            :root[data-theme="dark"] .sec-modal {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .sec-inc-title,
            :root[data-theme="dark"] .sec-inc-kpi-val,
            :root[data-theme="dark"] .sec-modal-title,
            :root[data-theme="dark"] .form-label,
            :root[data-theme="dark"] .risk-factor-name {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sec-inc-table th,
            :root[data-theme="dark"] .sec-modal-header,
            :root[data-theme="dark"] .sec-modal-footer,
            :root[data-theme="dark"] .risk-factor-card,
            :root[data-theme="dark"] .risk-meter-box {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .sec-inc-table td {
                border-color: #334155;
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .sec-inc-table tr:hover td {
                background: #243044;
            }
            :root[data-theme="dark"] .form-input,
            :root[data-theme="dark"] .form-textarea,
            :root[data-theme="dark"] .form-select,
            :root[data-theme="dark"] .sec-inc-search {
                background: #0f172a;
                border-color: #334155;
                color: #e2e8f0;
            }
        </style>

        <!-- Header -->
        <div class="sec-inc-header">
            <div class="sec-inc-title-area">
                <div class="sec-inc-title-row">
                    <h1 class="sec-inc-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        HIPAA Security Incidents &amp; Breach Assessment
                    </h1>
                    <span class="sec-inc-badge sec-inc-badge-red">45 CFR §§ 164.400 – 164.414</span>
                    <span class="sec-inc-badge sec-inc-badge-blue">§ 164.308(a)(6)</span>
                </div>
                <p class="sec-inc-subtitle">
                    Official incident management, statutory 4-factor risk assessment, individual 60-day notification tracking, and HHS OCR reporting log.
                </p>
            </div>
            <div class="sec-inc-header-actions">
                <button type="button" class="sec-inc-btn-secondary" id="btnExportIncidentCsv">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Export CSV</span>
                </button>
                <button type="button" class="sec-inc-btn-primary" id="btnNewIncident">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Record New Incident</span>
                </button>
            </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="sec-inc-kpi-grid">
            <div class="sec-inc-kpi-card kpi-total">
                <div class="sec-inc-kpi-label">Total Incidents Recorded</div>
                <div class="sec-inc-kpi-val" id="kpiTotalIncidents">—</div>
                <div class="sec-inc-kpi-sub">All logged events</div>
            </div>
            <div class="sec-inc-kpi-card kpi-active">
                <div class="sec-inc-kpi-label">Active Investigations</div>
                <div class="sec-inc-kpi-val" id="kpiActiveInvestigations" style="color: #d97706;">—</div>
                <div class="sec-inc-kpi-sub">Reported or Under Assessment</div>
            </div>
            <div class="sec-inc-kpi-card kpi-breaches">
                <div class="sec-inc-kpi-label">Reportable Breaches</div>
                <div class="sec-inc-kpi-val" id="kpiReportableBreaches" style="color: #dc2626;">—</div>
                <div class="sec-inc-kpi-sub" id="kpiMajorBreachesSub">0 major (&ge;500)</div>
            </div>
            <div class="sec-inc-kpi-card kpi-countdown">
                <div class="sec-inc-kpi-label">60-Day Deadlines Impending</div>
                <div class="sec-inc-kpi-val" id="kpiImpendingDeadlines" style="color: #7c3aed;">—</div>
                <div class="sec-inc-kpi-sub" id="kpiOverdueSub" style="color: #dc2626; font-weight: 700;">0 Overdue</div>
            </div>
            <div class="sec-inc-kpi-card kpi-individuals">
                <div class="sec-inc-kpi-label">Affected Individuals</div>
                <div class="sec-inc-kpi-val" id="kpiAffectedIndividuals">—</div>
                <div class="sec-inc-kpi-sub">Total patients impacted</div>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="sec-inc-filter-bar">
            <div class="sec-inc-filter-group">
                <input type="text" class="sec-inc-search" id="inputIncidentSearch" placeholder="Search incident #, title, narrative...">
                <select class="sec-inc-select" id="selectFilterStatus">
                    <option value="">All Lifecycle Statuses</option>
                    <option value="reported">Reported</option>
                    <option value="under_assessment">Under Assessment</option>
                    <option value="remediation_in_progress">Remediation in Progress</option>
                    <option value="notified">Notified</option>
                    <option value="closed">Closed</option>
                </select>
                <select class="sec-inc-select" id="selectFilterDetermination">
                    <option value="">All Breach Determinations</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="not_a_breach_low_risk">Not a Breach (Low Risk)</option>
                    <option value="reportable_breach_ocr_annual">Reportable Breach (&lt;500 - Annual OCR)</option>
                    <option value="reportable_breach_ocr_immediate">Reportable Breach (&ge;500 - Immediate OCR)</option>
                </select>
                <select class="sec-inc-select" id="selectFilterType">
                    <option value="">All Incident Types</option>
                    <option value="unauthorized_access_snooping">Unauthorized Access / Snooping</option>
                    <option value="lost_stolen_device_media">Lost / Stolen Device or Media</option>
                    <option value="misdirected_communication_fax_email">Misdirected Email/Fax</option>
                    <option value="hacking_it_incident_ransomware">Hacking / Ransomware</option>
                    <option value="improper_disposal">Improper Disposal</option>
                    <option value="credential_compromise">Credential Compromise</option>
                    <option value="other">Other Incident</option>
                </select>
            </div>
            <div>
                <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm" id="btnRefreshIncidents">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        <!-- Master Incident Ledger -->
        <div class="sec-inc-table-card">
            <table class="sec-inc-table" id="incidentsTable">
                <thead>
                    <tr>
                        <th>Incident #</th>
                        <th>Dates (Discovery / Occurred)</th>
                        <th>Type &amp; Location</th>
                        <th>Affected</th>
                        <th>4-Factor Risk Score</th>
                        <th>Determination</th>
                        <th>60-Day Notice Clock</th>
                        <th>Status</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="incidentsTableBody">
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 32px; color: #94a3b8;">
                            Loading security incidents...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- MODAL: Intake & Edit Incident -->
        <div class="sec-modal-overlay" id="modalIncidentIntake">
            <div class="sec-modal">
                <div class="sec-modal-header">
                    <h3 class="sec-modal-title" id="intakeModalTitle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Record Security Incident (§ 164.308(a)(6))
                    </h3>
                    <button type="button" class="sec-modal-close" id="btnCloseIntakeModal">&times;</button>
                </div>
                <div class="sec-modal-body">
                    <form id="formIncidentIntake">
                        <input type="hidden" id="editIncidentId" value="">
                        
                        <div class="form-group full-width">
                            <label class="form-label">Incident Title *</label>
                            <input type="text" class="form-input" id="inputIncTitle" placeholder="e.g. Inadvertent email of patient lab report to wrong recipient" required>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Date Discovered * (Starts 60-Day Clock)</label>
                                <input type="date" class="form-input" id="inputIncDiscoveryDate" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date Incident Occurred</label>
                                <input type="date" class="form-input" id="inputIncOccurredDate">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Incident Type *</label>
                                <select class="form-select" id="selectIncType" required>
                                    <option value="unauthorized_access_snooping">Unauthorized Access / Snooping</option>
                                    <option value="lost_stolen_device_media">Lost / Stolen Device or Media</option>
                                    <option value="misdirected_communication_fax_email">Misdirected Communication (Email/Fax)</option>
                                    <option value="hacking_it_incident_ransomware">Hacking / Ransomware / IT Incident</option>
                                    <option value="improper_disposal">Improper Disposal of Media</option>
                                    <option value="credential_compromise">Credential Leakage / Account Takeover</option>
                                    <option value="other">Other Security Incident</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Location of Breach</label>
                                <select class="form-select" id="selectIncLocation">
                                    <option value="EHR Application">EHR Application Database</option>
                                    <option value="Email">Email Communication</option>
                                    <option value="Laptop/Device">Laptop / Mobile Device</option>
                                    <option value="Network Server">Network File Server</option>
                                    <option value="Paper Records">Paper Records / Physical</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Estimated Individuals Affected *</label>
                                <input type="number" class="form-input" id="inputIncAffectedCount" value="1" min="1" required>
                                <small style="font-size: 11px; color: #64748b;">If &ge;500, triggers immediate OCR &amp; media notification.</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PHI Categories Involved</label>
                                <input type="text" class="form-input" id="inputIncPhiTypes" placeholder="e.g. Demographics, Clinical Notes, SSN, Diagnoses" value="Demographics, Clinical Records">
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Incident Narrative Description *</label>
                            <textarea class="form-textarea" id="textareaIncDescription" placeholder="Document what occurred, how the issue was discovered, root cause, and initial containment actions taken..." required></textarea>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Corrective Actions &amp; Technical Mitigations</label>
                            <textarea class="form-textarea" id="textareaIncCorrective" placeholder="Document immediate mitigation, credential revocation, sanctions applied, or policy updates..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="sec-modal-footer">
                    <button type="button" class="sec-inc-btn-secondary" id="btnCancelIntake">Cancel</button>
                    <button type="button" class="sec-inc-btn-primary" id="btnSaveIncident">
                        <span>Save Incident Record</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: 4-Factor Risk Assessment (§ 164.402) -->
        <div class="sec-modal-overlay" id="modalRiskAssessment">
            <div class="sec-modal">
                <div class="sec-modal-header">
                    <h3 class="sec-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Statutory 4-Factor Risk Assessment (45 CFR § 164.402)
                    </h3>
                    <button type="button" class="sec-modal-close" id="btnCloseAssessModal">&times;</button>
                </div>
                <div class="sec-modal-body">
                    <input type="hidden" id="assessIncidentId" value="">
                    <p style="font-size: 13px; color: #475569; margin-top: 0;">
                        Under 45 CFR § 164.402, an unauthorized disclosure of PHI is presumed to be a breach <em>unless</em> the covered entity demonstrates that there is a low probability the PHI was compromised based on these four statutory factors:
                    </p>

                    <!-- Factor 1 -->
                    <div class="risk-factor-card">
                        <div class="risk-factor-header">
                            <span class="risk-factor-name">1. Nature &amp; Extent of the PHI Involved</span>
                            <select class="sec-inc-select factor-score-select" id="scoreFactor1" style="font-weight: 700;">
                                <option value="1">1 - Minimal / Low Sensitivity</option>
                                <option value="2">2 - Low-Moderate Sensitivity</option>
                                <option value="3" selected>3 - Moderate (General Clinical)</option>
                                <option value="4">4 - High (SSN / Financial / Sensitive)</option>
                                <option value="5">5 - Severe (Mental Health / Substance / Full ID)</option>
                            </select>
                        </div>
                        <textarea class="form-textarea" id="rationaleFactor1" placeholder="Describe types of identifiers involved and the likelihood of re-identification..."></textarea>
                    </div>

                    <!-- Factor 2 -->
                    <div class="risk-factor-card">
                        <div class="risk-factor-header">
                            <span class="risk-factor-name">2. Unauthorized Person Who Used / Received PHI</span>
                            <select class="sec-inc-select factor-score-select" id="scoreFactor2" style="font-weight: 700;">
                                <option value="1">1 - Low (Internal Workforce / Covered Entity)</option>
                                <option value="2">2 - Low-Mod (Known Business Associate)</option>
                                <option value="3" selected>3 - Moderate (Trusted External Entity)</option>
                                <option value="4">4 - High (Untrusted / Unknown Recipient)</option>
                                <option value="5">5 - Severe (Public / Malicious Actor)</option>
                            </select>
                        </div>
                        <textarea class="form-textarea" id="rationaleFactor2" placeholder="Describe who received or viewed the PHI, and their legal obligation to protect confidentiality..."></textarea>
                    </div>

                    <!-- Factor 3 -->
                    <div class="risk-factor-card">
                        <div class="risk-factor-header">
                            <span class="risk-factor-name">3. Whether PHI Was Actually Acquired or Viewed</span>
                            <select class="sec-inc-select factor-score-select" id="scoreFactor3" style="font-weight: 700;">
                                <option value="1">1 - Forensically Proven Not Accessed</option>
                                <option value="2">2 - Low Likelihood (Unopened email / immediately returned)</option>
                                <option value="3" selected>3 - Suspected Viewing (File opened)</option>
                                <option value="4">4 - Confirmed Viewed by Unauthorized Party</option>
                                <option value="5">5 - Confirmed Exfiltrated / Copied / Distributed</option>
                            </select>
                        </div>
                        <textarea class="form-textarea" id="rationaleFactor3" placeholder="Describe technical evidence, server logs, or recipient confirmation of viewing or exfiltration..."></textarea>
                    </div>

                    <!-- Factor 4 -->
                    <div class="risk-factor-card">
                        <div class="risk-factor-header">
                            <span class="risk-factor-name">4. Extent to Which the Risk Has Been Mitigated</span>
                            <select class="sec-inc-select factor-score-select" id="scoreFactor4" style="font-weight: 700;">
                                <option value="1">1 - Comprehensive Immediate Destruction Certified</option>
                                <option value="2">2 - Satisfactory Assurances of Deletion</option>
                                <option value="3" selected>3 - Partial Mitigation (Device remote wiped later)</option>
                                <option value="4">4 - Minimal Mitigation Feasible</option>
                                <option value="5">5 - No Mitigation (Data permanently exposed)</option>
                            </select>
                        </div>
                        <textarea class="form-textarea" id="rationaleFactor4" placeholder="Document immediate containment actions, signed certifications of deletion, or confidentiality agreements..."></textarea>
                    </div>

                    <!-- Dynamic Score Calculation Box -->
                    <div class="risk-meter-box">
                        <div>
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b;">Composite Risk Score</div>
                            <div style="font-size: 24px; font-weight: 800; color: #0f172a;" id="displayCompositeScore">3.0 / 5.0</div>
                        </div>
                        <div id="displayRecommendationBadge">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Determination -->
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Official Breach Finding *</label>
                            <select class="form-select" id="selectBreachDetermination" style="font-weight: 700;">
                                <option value="not_a_breach_low_risk">✓ Not a Breach (Low Risk Demonstrated)</option>
                                <option value="reportable_breach_ocr_annual">🔴 Reportable Breach (&lt;500 - Annual OCR Log)</option>
                                <option value="reportable_breach_ocr_immediate">🚨 Major Breach (&ge;500 - Immediate 60-Day OCR)</option>
                                <option value="reportable_breach_patient_only">⚠️ Reportable to Patient Only</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Investigating Compliance Officer *</label>
                            <input type="text" class="form-input" id="inputInvestigatingOfficer" value="Dr. Compliance Officer">
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Official Determination Rationale *</label>
                        <textarea class="form-textarea" id="textareaDeterminationRationale" placeholder="State the final legal justification for whether this incident constitutes a reportable HIPAA breach..."></textarea>
                    </div>
                </div>
                <div class="sec-modal-footer">
                    <button type="button" class="sec-inc-btn-secondary" id="btnCancelAssess">Cancel</button>
                    <button type="button" class="sec-inc-btn-primary" id="btnSubmitAssessment" style="background: #2563eb;">
                        <span>Save &amp; Finalize Assessment</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Patient Notifications & Statutory Letter Generator (§ 164.404) -->
        <div class="sec-modal-overlay" id="modalPatientLetter">
            <div class="sec-modal" style="max-width: 900px;">
                <div class="sec-modal-header">
                    <h3 class="sec-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        Individual Breach Notifications &amp; Statutory Letters (§ 164.404)
                    </h3>
                    <button type="button" class="sec-modal-close" id="btnCloseLetterModal">&times;</button>
                </div>
                <div class="sec-modal-body">
                    <input type="hidden" id="letterIncidentId" value="">
                    
                    <!-- Linked Patients Section -->
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <strong style="font-size: 14px;">Impacted Patients Linked to this Incident</strong>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" id="inputAddPatientId" placeholder="Patient ID #" class="sec-inc-search" style="width: 140px; min-width: auto; padding: 4px 8px; font-size: 12px;">
                                <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm" id="btnLinkPatient">Link Patient</button>
                            </div>
                        </div>
                        <table class="sec-inc-table" style="font-size: 12px;">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>MRN</th>
                                    <th>Delivery Status</th>
                                    <th>Dispatch Method</th>
                                    <th>Tracking #</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="linkedPatientsTableBody">
                                <tr>
                                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">
                                        No specific patients linked yet.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Print Letter Preview Area -->
                    <div id="breachLetterContainer" style="display: none; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #ffffff;">
                        <div id="breachLetterPrintArea">
                            <!-- Filled dynamically -->
                        </div>
                    </div>
                </div>
                <div class="sec-modal-footer">
                    <button type="button" class="sec-inc-btn-secondary" id="btnPrintBreachLetter" style="display: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Print Statutory Letter</span>
                    </button>
                    <button type="button" class="sec-inc-btn-secondary" id="btnCloseLetter">Close</button>
                </div>
            </div>
        </div>

        <!-- MODAL: HHS OCR Portal Filing Package (§ 164.408) -->
        <div class="sec-modal-overlay" id="modalOcrPackage">
            <div class="sec-modal" style="max-width: 800px;">
                <div class="sec-modal-header">
                    <h3 class="sec-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        HHS OCR Portal Filing Package (45 CFR § 164.408)
                    </h3>
                    <button type="button" class="sec-modal-close" id="btnCloseOcrModal">&times;</button>
                </div>
                <div class="sec-modal-body">
                    <p style="font-size: 13px; color: #475569; margin-top: 0;">
                        This standardized package complies with the <strong>HHS.gov OCR Breach Portal</strong> reporting specifications.
                    </p>
                    <div style="background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;" id="ocrJsonDisplay">
                        <!-- Populated dynamically -->
                    </div>
                </div>
                <div class="sec-modal-footer">
                    <button type="button" class="sec-inc-btn-secondary" id="btnCopyOcrJson">Copy JSON</button>
                    <button type="button" class="sec-inc-btn-primary" id="btnDownloadOcrJson" style="background: #7c3aed;">Download Package</button>
                </div>
            </div>
        </div>

    </div>
    `;
}
