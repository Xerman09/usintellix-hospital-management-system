export class WorkforceGovernanceView {
    static render() {
        return `
        <div class="workforce-gov-container">
            <style>
                .workforce-gov-container {
                    padding: 24px;
                    background: #f8fafc;
                    min-height: calc(100vh - 70px);
                    box-sizing: border-box;
                    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
                }

                .wg-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .wg-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .wg-icon-badge {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #4f46e5, #6366f1);
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
                    flex-shrink: 0;
                }

                .wg-header h1 {
                    font-size: 22px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 4px 0;
                }

                .wg-header p {
                    font-size: 13px;
                    color: #64748b;
                    margin: 0;
                }

                .wg-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .wg-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    border: 1px solid transparent;
                    text-decoration: none;
                }

                .wg-btn-primary {
                    background: #4f46e5;
                    color: #ffffff;
                }
                .wg-btn-primary:hover {
                    background: #4338ca;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
                }

                .wg-btn-danger {
                    background: #dc2626;
                    color: #ffffff;
                }
                .wg-btn-danger:hover {
                    background: #b91c1c;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                }

                .wg-btn-outline {
                    background: #ffffff;
                    border-color: #cbd5e1;
                    color: #334155;
                }
                .wg-btn-outline:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                }

                /* KPI Metrics Cards */
                .wg-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .wg-kpi-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                    position: relative;
                    overflow: hidden;
                }

                .wg-kpi-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }

                .wg-kpi-value {
                    font-size: 26px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }

                .wg-kpi-sub {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                }

                /* Tabs */
                .wg-tabs-wrap {
                    display: flex;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    margin-bottom: 20px;
                    gap: 24px;
                }

                .wg-tab-btn {
                    padding: 12px 4px;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    position: relative;
                    transition: color 0.15s ease;
                }

                .wg-tab-btn:hover {
                    color: #1e293b;
                }

                .wg-tab-btn.active {
                    color: #4f46e5;
                }

                .wg-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #4f46e5;
                    border-radius: 2px 2px 0 0;
                }

                .wg-tab-content {
                    display: none;
                }

                .wg-tab-content.active {
                    display: block;
                }

                /* Controls Bar */
                .wg-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }

                .wg-filter-pills {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .wg-pill {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    border: 1px solid #cbd5e1;
                    background: #ffffff;
                    color: #475569;
                    transition: all 0.15s ease;
                }

                .wg-pill.active {
                    background: #4f46e5;
                    color: #ffffff;
                    border-color: #4f46e5;
                }

                .wg-search-input {
                    padding: 7px 12px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 13px;
                    min-width: 240px;
                    outline: none;
                }
                .wg-search-input:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }

                /* Tables */
                .wg-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                    overflow: hidden;
                }

                .wg-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    text-align: left;
                }

                .wg-table th {
                    background: #f8fafc;
                    padding: 12px 16px;
                    font-weight: 600;
                    color: #475569;
                    border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }

                .wg-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #1e293b;
                    vertical-align: middle;
                }

                .wg-table tr:hover td {
                    background: #f8fafc;
                }

                /* Badges */
                .badge-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 3px 9px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                }

                .badge-compliant {
                    background: #dcfce7;
                    color: #15803d;
                }
                .badge-approaching {
                    background: #fef3c7;
                    color: #b45309;
                }
                .badge-overdue {
                    background: #fee2e2;
                    color: #b91c1c;
                }
                .badge-exempt {
                    background: #e2e8f0;
                    color: #475569;
                }

                .badge-sev-minor {
                    background: #e0f2fe;
                    color: #0369a1;
                }
                .badge-sev-moderate {
                    background: #fef3c7;
                    color: #b45309;
                }
                .badge-sev-serious {
                    background: #fed7aa;
                    color: #c2410c;
                }
                .badge-sev-critical {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .wg-code {
                    font-family: monospace;
                    font-weight: 700;
                    background: #f1f5f9;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #334155;
                }

                /* Modal Overlays */
                .wg-modal-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 1050;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    box-sizing: border-box;
                }

                .wg-modal-overlay.open {
                    display: flex;
                }

                .wg-modal-box {
                    background: #ffffff;
                    border-radius: 14px;
                    max-width: 650px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    padding: 24px;
                    box-sizing: border-box;
                }

                .wg-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 18px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .wg-modal-header h3 {
                    margin: 0 0 4px 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .wg-modal-header p {
                    margin: 0;
                    font-size: 12px;
                    color: #64748b;
                }

                .wg-modal-close {
                    background: transparent;
                    border: none;
                    font-size: 22px;
                    color: #94a3b8;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0 4px;
                }
                .wg-modal-close:hover {
                    color: #0f172a;
                }

                .wg-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .wg-form-group.full {
                    grid-column: span 2;
                }

                .wg-form-group label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 6px;
                }

                .wg-form-input, .wg-form-select, .wg-form-textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 9px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #0f172a;
                    outline: none;
                    background: #ffffff;
                }
                .wg-form-input:focus, .wg-form-select:focus, .wg-form-textarea:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }

                .wg-form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                .wg-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 16px;
                }

                /* Printable Dossier / Certificate Box */
                .wg-printable-box {
                    background: #ffffff;
                    border: 2px solid #0f172a;
                    border-radius: 8px;
                    padding: 24px;
                    margin-bottom: 16px;
                    position: relative;
                }
            </style>

            <!-- Header -->
            <div class="wg-header">
                <div class="wg-title-wrap">
                    <div class="wg-icon-badge">
                        <i class="fa-solid fa-user-graduate"></i>
                    </div>
                    <div>
                        <h1>Workforce HIPAA Training &amp; Disciplinary Sanctions Console</h1>
                        <p>Statutory Compliance Mandates: <strong>45 CFR § 164.308(a)(5)</strong> (Security Awareness &amp; Training) &amp; <strong>45 CFR § 164.308(a)(1)(ii)(C)</strong> (Sanction Policy)</p>
                    </div>
                </div>
                <div class="wg-header-actions">
                    <button type="button" class="wg-btn wg-btn-primary" id="btnOpenRecordTrainingModal">
                        <i class="fa-solid fa-award"></i>
                        <span>Record Training Event</span>
                    </button>
                    <button type="button" class="wg-btn wg-btn-danger" id="btnOpenLogSanctionModal">
                        <i class="fa-solid fa-gavel"></i>
                        <span>Log Disciplinary Sanction</span>
                    </button>
                    <a href="./api/workforce/export/trainings-csv" class="wg-btn wg-btn-outline" id="btnExportTrainingsCsv" target="_blank" download>
                        <i class="fa-solid fa-file-csv"></i>
                        <span>Trainings CSV</span>
                    </a>
                    <a href="./api/workforce/export/sanctions-csv" class="wg-btn wg-btn-outline" id="btnExportSanctionsCsv" target="_blank" download>
                        <i class="fa-solid fa-file-csv"></i>
                        <span>Sanctions CSV</span>
                    </a>
                </div>
            </div>

            <!-- 6 KPI Metric Cards -->
            <div class="wg-kpi-grid">
                <div class="wg-kpi-card" style="border-left: 4px solid #6366f1;">
                    <div class="wg-kpi-label">Active Workforce</div>
                    <div class="wg-kpi-value" id="kpiTotalWorkforce">--</div>
                    <div class="wg-kpi-sub">Total staff accounts</div>
                </div>

                <div class="wg-kpi-card" style="border-left: 4px solid #10b981;">
                    <div class="wg-kpi-label">Training Compliance Rate</div>
                    <div class="wg-kpi-value" id="kpiComplianceRate">--%</div>
                    <div class="wg-kpi-sub" id="kpiCompliantStaff">-- compliant members</div>
                </div>

                <div class="wg-kpi-card" style="border-left: 4px solid #ef4444;">
                    <div class="wg-kpi-label">Overdue Training</div>
                    <div class="wg-kpi-value" style="color: #dc2626;" id="kpiOverdueCount">--</div>
                    <div class="wg-kpi-sub">>365d or >30d new hire</div>
                </div>

                <div class="wg-kpi-card" style="border-left: 4px solid #f59e0b;">
                    <div class="wg-kpi-label">Approaching Due (&le;30d)</div>
                    <div class="wg-kpi-value" style="color: #d97706;" id="kpiApproachingCount">--</div>
                    <div class="wg-kpi-sub">Refresher renewal window</div>
                </div>

                <div class="wg-kpi-card" style="border-left: 4px solid #8b5cf6;">
                    <div class="wg-kpi-label">Disciplinary Sanctions</div>
                    <div class="wg-kpi-value" id="kpiTotalSanctions">--</div>
                    <div class="wg-kpi-sub" id="kpiActiveSanctions">-- active / under investigation</div>
                </div>

                <div class="wg-kpi-card" style="border-left: 4px solid #b91c1c;">
                    <div class="wg-kpi-label">Severe Disciplinary Actions</div>
                    <div class="wg-kpi-value" style="color: #991b1b;" id="kpiSevereSanctions">--</div>
                    <div class="wg-kpi-sub">Suspensions &amp; Terminations</div>
                </div>
            </div>

            <!-- Dual Tab Navigation -->
            <div class="wg-tabs-wrap">
                <button type="button" class="wg-tab-btn active" id="tabBtnTrainings" data-tab="trainings">
                    <i class="fa-solid fa-clipboard-check"></i> Workforce Training Compliance Ledger (§ 164.308(a)(5))
                </button>
                <button type="button" class="wg-tab-btn" id="tabBtnSanctions" data-tab="sanctions">
                    <i class="fa-solid fa-shield-halved"></i> Disciplinary Sanctions Log (§ 164.308(a)(1)(ii)(C))
                </button>
            </div>

            <!-- Tab 1: Workforce Training Compliance Ledger -->
            <div class="wg-tab-content active" id="tabContentTrainings">
                <div class="wg-controls">
                    <div class="wg-filter-pills" id="trainingFilterPills">
                        <button type="button" class="wg-pill active" data-filter="all">All Workforce</button>
                        <button type="button" class="wg-pill" data-filter="compliant">Compliant</button>
                        <button type="button" class="wg-pill" data-filter="approaching_due">Approaching Due (&le;30d)</button>
                        <button type="button" class="wg-pill" data-filter="overdue">Overdue</button>
                    </div>
                    <div>
                        <input type="text" class="wg-search-input" id="trainingSearchInput" placeholder="Search staff name, username, employee no...">
                    </div>
                </div>

                <div class="wg-card">
                    <table class="wg-table" id="tableWorkforceTrainings">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Role &amp; Department</th>
                                <th>Hire Date</th>
                                <th>Initial Training</th>
                                <th>Last Refresher</th>
                                <th>Next Due Date</th>
                                <th>Compliance Status</th>
                                <th>Score / Cert Ref</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyWorkforceTrainings">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 32px; color: #64748b;">
                                    <i class="fa-solid fa-spinner fa-spin"></i> Loading workforce training registry...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab 2: Disciplinary Sanctions Log -->
            <div class="wg-tab-content" id="tabContentSanctions">
                <div class="wg-controls">
                    <div class="wg-filter-pills" id="sanctionFilterPills">
                        <button type="button" class="wg-pill active" data-filter="all">All Sanctions</button>
                        <button type="button" class="wg-pill" data-filter="sanction_imposed">Sanction Imposed</button>
                        <button type="button" class="wg-pill" data-filter="under_investigation">Under Investigation</button>
                        <button type="button" class="wg-pill" data-filter="remediation_active">Remediation Active</button>
                        <button type="button" class="wg-pill" data-filter="closed_remediated">Closed / Remediated</button>
                    </div>
                    <div>
                        <input type="text" class="wg-search-input" id="sanctionSearchInput" placeholder="Search sanction code, staff name, officer...">
                    </div>
                </div>

                <div class="wg-card">
                    <table class="wg-table" id="tableSanctions">
                        <thead>
                            <tr>
                                <th>Sanction Code</th>
                                <th>Workforce Member</th>
                                <th>Violation Category</th>
                                <th>Severity</th>
                                <th>Disciplinary Action</th>
                                <th>Effective Date</th>
                                <th>Sanctioning Officer</th>
                                <th>Status</th>
                                <th style="text-align: right;">Audit Actions</th>
                            </tr>
                        </thead>
                        <tbody id="tbodySanctions">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 32px; color: #64748b;">
                                    <i class="fa-solid fa-spinner fa-spin"></i> Loading disciplinary sanctions log...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal 1: Record Training Event -->
            <div class="wg-modal-overlay" id="modalRecordTrainingOverlay">
                <div class="wg-modal-box">
                    <div class="wg-modal-header">
                        <div>
                            <h3>Record HIPAA Security &amp; Privacy Training</h3>
                            <p>Enforce mandatory initial 30-day training &amp; annual refresher certification per 45 CFR § 164.308(a)(5).</p>
                        </div>
                        <button type="button" class="wg-modal-close" id="btnCloseRecordTrainingModal">&times;</button>
                    </div>

                    <form id="formRecordTraining">
                        <div class="wg-form-grid">
                            <div class="wg-form-group full">
                                <label for="trainingEmployeeId">Workforce Member *</label>
                                <select id="trainingEmployeeId" class="wg-form-select" required>
                                    <option value="">Select staff member...</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="trainingType">Training Type *</label>
                                <select id="trainingType" class="wg-form-select" required>
                                    <option value="annual_refresher">Annual Security Awareness Refresher</option>
                                    <option value="initial_orientation">Initial Orientation (Within 30 Days of Hire)</option>
                                    <option value="remedial_post_incident">Remedial Post-Incident Retraining</option>
                                    <option value="specialized_role_based">Specialized Role-Based PHI Handling</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="trainingCompletionDate">Completion Date *</label>
                                <input type="date" id="trainingCompletionDate" class="wg-form-input" required>
                            </div>

                            <div class="wg-form-group full">
                                <label for="trainingCurriculum">Curriculum / Module Title *</label>
                                <input type="text" id="trainingCurriculum" class="wg-form-input" value="HIPAA Security & Privacy Omnibus Omnibus Baseline 2026" required>
                            </div>

                            <div class="wg-form-group">
                                <label for="trainingScore">Assessment Score (%) *</label>
                                <input type="number" id="trainingScore" class="wg-form-input" min="0" max="100" step="0.5" value="95" required>
                            </div>

                            <div class="wg-form-group">
                                <label for="trainingDeliveryMethod">Delivery Method *</label>
                                <select id="trainingDeliveryMethod" class="wg-form-select" required>
                                    <option value="lms_elearning">Online LMS E-Learning</option>
                                    <option value="proctored_assessment">Proctored Assessment / Exam</option>
                                    <option value="classroom_instructor">Classroom / Live Instructor</option>
                                    <option value="external_accredited">External Accredited Continuing Education</option>
                                </select>
                            </div>

                            <div class="wg-form-group full">
                                <label for="trainingProctor">Trainer / Proctor / Institution</label>
                                <input type="text" id="trainingProctor" class="wg-form-input" value="USIntellix Healthcare Compliance Academy">
                            </div>

                            <div class="wg-form-group full">
                                <label for="trainingNotes">Verification Notes</label>
                                <textarea id="trainingNotes" class="wg-form-textarea" placeholder="Assessment details, passing threshold confirmation, verification notes..."></textarea>
                            </div>
                        </div>

                        <div class="wg-modal-actions">
                            <button type="button" class="wg-btn wg-btn-outline" id="btnCancelRecordTraining">Cancel</button>
                            <button type="submit" class="wg-btn wg-btn-primary" id="btnSubmitRecordTraining">
                                <i class="fa-solid fa-check"></i>
                                <span>Save &amp; Generate Certificate</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal 2: Printable Training Certificate / Attestation -->
            <div class="wg-modal-overlay" id="modalTrainingCertOverlay">
                <div class="wg-modal-box" style="max-width: 750px;">
                    <div class="wg-modal-header">
                        <div>
                            <h3>HIPAA Compliance Training Certificate</h3>
                            <p>Official workforce completion attestation for HHS OCR audit presentation.</p>
                        </div>
                        <button type="button" class="wg-modal-close" id="btnCloseTrainingCertModal">&times;</button>
                    </div>

                    <div id="trainingCertContent">
                        <!-- Populated dynamically -->
                    </div>

                    <div class="wg-modal-actions">
                        <button type="button" class="wg-btn wg-btn-outline" id="btnCancelTrainingCert">Close</button>
                        <button type="button" class="wg-btn wg-btn-primary" id="btnPrintTrainingCert">
                            <i class="fa-solid fa-print"></i>
                            <span>Print Certificate</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal 3: Log Disciplinary Sanction -->
            <div class="wg-modal-overlay" id="modalLogSanctionOverlay">
                <div class="wg-modal-box" style="max-width: 700px;">
                    <div class="wg-modal-header">
                        <div>
                            <h3>Log Disciplinary Sanction (§ 164.308(a)(1)(ii)(C))</h3>
                            <p>Document privacy/security policy violations, investigation findings, and sanctions.</p>
                        </div>
                        <button type="button" class="wg-modal-close" id="btnCloseLogSanctionModal">&times;</button>
                    </div>

                    <form id="formLogSanction">
                        <div class="wg-form-grid">
                            <div class="wg-form-group">
                                <label for="sanctionEmployeeId">Workforce Member Involved *</label>
                                <select id="sanctionEmployeeId" class="wg-form-select" required>
                                    <option value="">Select staff member...</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionViolationDate">Violation Date *</label>
                                <input type="date" id="sanctionViolationDate" class="wg-form-input" required>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionCategory">Violation Category *</label>
                                <select id="sanctionCategory" class="wg-form-select" required>
                                    <option value="unauthorized_phi_snooping">Unauthorized PHI Snooping / Curiosity Browsing</option>
                                    <option value="improper_phi_disclosure">Improper PHI Disclosure / Misdirected Transmission</option>
                                    <option value="credential_sharing">Credential Sharing / Password Policy Breach</option>
                                    <option value="unencrypted_device">Unencrypted Device / Insecure Storage</option>
                                    <option value="failure_to_report_incident">Failure to Report Security Incident</option>
                                    <option value="phishing_social_engineering">Phishing / Social Engineering Negligence</option>
                                    <option value="willful_neglect_data_theft">Willful Neglect / Data Exfiltration</option>
                                    <option value="other_policy_breach">Other Security / Privacy Policy Violation</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionSeverity">Severity Level *</label>
                                <select id="sanctionSeverity" class="wg-form-select" required>
                                    <option value="minor">Minor (Low PHI Impact / Accidental)</option>
                                    <option value="moderate" selected>Moderate (Repeated Policy Lapses)</option>
                                    <option value="serious">Serious (Direct Unauthorized PHI Viewing)</option>
                                    <option value="critical_gross_misconduct">Critical / Gross Misconduct (Intentional / Exfiltration)</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionAction">Disciplinary Action Imposed *</label>
                                <select id="sanctionAction" class="wg-form-select" required>
                                    <option value="verbal_counseling">Tier 1: Documented Verbal Counseling &amp; Retraining</option>
                                    <option value="written_reprimand" selected>Tier 2: Formal Written Warning &amp; HR File Entry</option>
                                    <option value="suspension_without_pay">Tier 3: Suspension Without Pay &amp; System Access Freeze</option>
                                    <option value="immediate_termination">Tier 4: Immediate Termination &amp; Account Revocation</option>
                                    <option value="credential_revocation_referral">Tier 5: Licensure Board / HHS OCR Referral</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionEffectiveDate">Sanction Effective Date *</label>
                                <input type="date" id="sanctionEffectiveDate" class="wg-form-input" required>
                            </div>

                            <div class="wg-form-group full">
                                <label for="sanctionFindings">Investigation Findings &amp; Circumstances *</label>
                                <textarea id="sanctionFindings" class="wg-form-textarea" placeholder="Detail the forensic investigation, evidence reviewed (e.g. audit logs, badge scans), root causes, and staff responses..." required></textarea>
                            </div>

                            <div class="wg-form-group full">
                                <label for="sanctionRationale">Disciplinary Rationale &amp; Policy Cited *</label>
                                <textarea id="sanctionRationale" class="wg-form-textarea" placeholder="Rationale for the sanction tier selected, policies violated (e.g. Hospital Security Rule § 4.2), and prior disciplinary history..." required></textarea>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionRemediation">Required Remediation *</label>
                                <select id="sanctionRemediation" class="wg-form-select">
                                    <option value="mandatory_retraining">Mandatory HIPAA Retraining &amp; Exam</option>
                                    <option value="supervised_audit_period">90-Day Supervised Audit Period</option>
                                    <option value="access_downgrade">Permanent Privilege Downgrade</option>
                                    <option value="none">None (Termination / Separation)</option>
                                </select>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionSuspensionDays">Suspension Duration (Days)</label>
                                <input type="number" id="sanctionSuspensionDays" class="wg-form-input" min="0" value="0">
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionOfficerName">Sanctioning Officer Name *</label>
                                <input type="text" id="sanctionOfficerName" class="wg-form-input" value="Dr. Elizabeth Warren, JD, CHPC" required>
                            </div>

                            <div class="wg-form-group">
                                <label for="sanctionOfficerRole">Officer Role *</label>
                                <input type="text" id="sanctionOfficerRole" class="wg-form-input" value="Chief Privacy &amp; Security Compliance Officer" required>
                            </div>
                        </div>

                        <div class="wg-modal-actions">
                            <button type="button" class="wg-btn wg-btn-outline" id="btnCancelLogSanction">Cancel</button>
                            <button type="submit" class="wg-btn wg-btn-danger" id="btnSubmitLogSanction">
                                <i class="fa-solid fa-gavel"></i>
                                <span>Record Disciplinary Sanction</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal 4: Printable Disciplinary Sanction Audit Dossier -->
            <div class="wg-modal-overlay" id="modalSanctionDossierOverlay">
                <div class="wg-modal-box" style="max-width: 800px;">
                    <div class="wg-modal-header">
                        <div>
                            <h3>Workforce Disciplinary Sanction Dossier</h3>
                            <p>Official OCR auditor presentation record per 45 CFR § 164.308(a)(1)(ii)(C).</p>
                        </div>
                        <button type="button" class="wg-modal-close" id="btnCloseSanctionDossierModal">&times;</button>
                    </div>

                    <div id="sanctionDossierContent">
                        <!-- Populated dynamically -->
                    </div>

                    <div class="wg-modal-actions">
                        <button type="button" class="wg-btn wg-btn-outline" id="btnCancelSanctionDossier">Close</button>
                        <button type="button" class="wg-btn wg-btn-primary" id="btnPrintSanctionDossier">
                            <i class="fa-solid fa-print"></i>
                            <span>Print Audit Dossier</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
        `;
    }
}
