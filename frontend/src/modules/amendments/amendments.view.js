export class AmendmentsView {
    static render() {
        return `
        <div class="amendments-container" style="padding: 20px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #fef3c7; color: #b45309; border-radius: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </span>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">Statutory PHI Amendment Workflow &amp; Registry</h1>
                        <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">
                            45 CFR § 164.526 &bull; 60-Day Mandate
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 13.5px; color: #64748b;">
                        Administrative 60-day action pipeline, 4 statutory denial grounds (§ 164.526(a)(2)), single 30-day extension enforcement, Statements of Disagreement, and permanent EHR linkage.
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button type="button" id="btnExportAmendCsv" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Export Registry (CSV)</span>
                    </button>
                    <button type="button" id="btnRefreshAmend" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                    <button type="button" id="btnOpenAmendIntakeModal" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.2);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Log PHI Amendment Request</span>
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 22px;">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #0284c7;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Total Requests</div>
                    <div id="statAmendTotal" style="font-size: 26px; font-weight: 700; color: #0f172a;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">All logged amendment requests</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Active Pending</div>
                    <div id="statAmendPending" style="font-size: 26px; font-weight: 700; color: #2563eb;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">In progress within 60 days</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">Impending (≤10 Days)</div>
                    <div id="statAmendImpending" style="font-size: 26px; font-weight: 700; color: #d97706;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Action required urgently</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 12px; font-weight: 600; color: #b91c1c; text-transform: uppercase; margin-bottom: 4px;">Overdue (&gt;60 Days)</div>
                    <div id="statAmendOverdue" style="font-size: 26px; font-weight: 700; color: #dc2626;">--</div>
                    <div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 2px;">Immediate OCR violation risk</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #8b5cf6;">
                    <div style="font-size: 12px; font-weight: 600; color: #6d28d9; text-transform: uppercase; margin-bottom: 4px;">30-Day Extensions</div>
                    <div id="statAmendExtensions" style="font-size: 26px; font-weight: 700; color: #7c3aed;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Single permissible extension (§ 164.526(b))</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #10b981;">
                    <div style="font-size: 12px; font-weight: 600; color: #047857; text-transform: uppercase; margin-bottom: 4px;">Accepted / Denied</div>
                    <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                        <span id="statAmendAccepted" style="color: #059669;">0</span> / <span id="statAmendDenied" style="color: #64748b;">0</span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;"><span id="statAmendDisagreements" style="color: #dc2626; font-weight: 600;">0</span> Disagreements filed</div>
                </div>
            </div>

            <!-- Overdue Alert Banner -->
            <div id="amendOverdueBanner" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div>
                        <strong style="color: #991b1b; font-size: 14px;">STATUTORY COMPLIANCE ALERT: Overdue PHI Amendment Requests Detected</strong>
                        <p style="margin: 3px 0 0 0; font-size: 12.5px; color: #b91c1c;">
                            One or more amendment requests have exceeded the 60-calendar-day mandate under 45 CFR § 164.526(b)(2). Immediate clinical review or formal denial issuance is required to maintain HIPAA compliance.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
                    <div style="position: relative; flex: 1;">
                        <input type="text" id="amendSearchInput" placeholder="Search by amendment #, patient name, or ID..." style="width: 100%; box-sizing: border-box; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <select id="amendStatusFilter" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; outline: none; background: #fff;">
                        <option value="">All Statuses</option>
                        <option value="pending_review">Pending Review (60-Day SLA)</option>
                        <option value="extension_granted">Extension Granted (+30d)</option>
                        <option value="accepted">Accepted (§ 164.526(c))</option>
                        <option value="denied">Denied (§ 164.526(d))</option>
                        <option value="disagreement_filed">Disagreement Filed</option>
                    </select>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: #64748b; font-weight: 600; margin-right: 4px;">Filter:</span>
                    <button type="button" class="amend-filter-btn active" data-filter="" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #0284c7; color: #fff; cursor: pointer;">All</button>
                    <button type="button" class="amend-filter-btn" data-filter="impending" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #b45309; cursor: pointer;">⚠️ Impending (≤10d)</button>
                    <button type="button" class="amend-filter-btn" data-filter="overdue" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #b91c1c; cursor: pointer;">🚨 Overdue</button>
                    <button type="button" class="amend-filter-btn" data-filter="extended" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #6d28d9; cursor: pointer;">Extended</button>
                    <button type="button" class="amend-filter-btn" data-filter="disagreements" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #dc2626; cursor: pointer;">Disagreements Filed</button>
                </div>
            </div>

            <!-- Pipeline Table -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">
                                <th style="padding: 12px 16px;">Amendment #</th>
                                <th style="padding: 12px 16px;">Patient</th>
                                <th style="padding: 12px 16px;">Target Record / Note</th>
                                <th style="padding: 12px 16px;">60-Day Countdown Clock</th>
                                <th style="padding: 12px 16px;">Status</th>
                                <th style="padding: 12px 16px;">Statutory Ground / Disagreement</th>
                                <th style="padding: 12px 16px; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="amendTableBody">
                            <tr>
                                <td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>Loading PHI amendment requests pipeline...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL: Log PHI Amendment Request (§ 164.526) -->
        <div id="modalAmendIntakeOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Log Formal PHI Amendment Request</h2>
                        <span style="font-size: 12px; color: #64748b;">HIPAA 45 CFR § 164.526 &bull; Patient Right to Amend PHI Intake</span>
                    </div>
                    <button type="button" id="btnCloseAmendIntakeModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <form id="formAmendIntake">
                    <!-- Patient Selection -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Target Patient *</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="intakeAmendPatientSearch" placeholder="Type name or Patient No to find..." style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <input type="hidden" id="intakeAmendPatientId" required>
                        </div>
                        <div id="intakeAmendPatientSelectedLabel" style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px; display: none;"></div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Date of Receipt *</label>
                            <input type="date" id="intakeAmendDate" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <span style="font-size: 11px; color: #64748b;">Starts the 60-calendar-day statutory countdown.</span>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requester Type *</label>
                            <select id="intakeAmendRequesterType" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="patient">Patient Directly</option>
                                <option value="personal_representative">Personal Representative</option>
                                <option value="legal_guardian">Legal Guardian</option>
                                <option value="authorized_representative">Authorized Representative (Signed Authorization)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requester Contact Info</label>
                            <input type="text" id="intakeAmendRequesterContact" placeholder="Phone or verified mailing/email address" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Target Record Type *</label>
                            <select id="intakeAmendTargetRecordType" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="encounter_soap_note">Clinical Note / SOAP Progress Note</option>
                                <option value="medical_problem">Problem List / Diagnostic History</option>
                                <option value="allergy">Allergy / Adverse Reaction</option>
                                <option value="medication">Medication / Prescription Record</option>
                                <option value="procedure_result">Laboratory / Diagnostic Test Result</option>
                                <option value="demographics">Demographics / Identity</option>
                                <option value="other">Other Designated Record Set Item</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Target Record Label / Reference</label>
                        <input type="text" id="intakeAmendTargetLabel" placeholder="e.g., Progress Note by Dr. Smith on 2026-03-12" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Disputed Statement / Text *</label>
                        <textarea id="intakeAmendDisputedText" rows="3" required placeholder="Specify the exact phrasing, clinical statement, or information being disputed..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requested Amendment / Correction *</label>
                        <textarea id="intakeAmendRequestedAmendment" rows="3" required placeholder="Specify the exact proposed correction or supplementary note requested..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelAmendIntake" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitAmendIntake" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Initialize 60-Day Pipeline</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Grant 30-Day Extension (§ 164.526(b)(2)(ii)) -->
        <div id="modalAmendExtensionOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Grant Statutory 30-Day Extension</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.526(b)(2)(ii) &bull; Single Permissible Extension</span>
                    </div>
                    <button type="button" id="btnCloseAmendExtensionModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div style="background: #fdf4ff; border: 1px solid #f5d0fe; border-left: 4px solid #a855f7; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12.5px; font-weight: 600; color: #701a75;">Statutory Rule Under 45 CFR § 164.526(b)(2)(ii):</div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #86198f; line-height: 1.5;">
                        A covered entity may extend the initial 60-day deadline by no more than <strong>30 additional calendar days</strong>, provided written notice stating the reasons for delay and date by which action will be taken is provided within the initial 60-day period. <em>Only ONE extension is permitted under federal law.</em>
                    </p>
                </div>

                <form id="formAmendExtension">
                    <input type="hidden" id="extAmendId">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Statutory Reason for Delay *</label>
                        <select id="extAmendReason" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="provider_consultation_required">Required consultation with originating/treating licensed practitioner</option>
                            <option value="historical_archive_retrieval">Retrieval and verification of historical paper or archived electronic records</option>
                            <option value="multi_departmental_coordination">Complex multi-departmental clinical and coding review required</option>
                            <option value="originator_availability_inquiry">Investigation regarding current availability of originating practitioner (§ 164.526(a)(2)(i))</option>
                            <option value="legal_compliance_review">HIPAA Privacy Officer and legal counsel review</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Extension Rationale Narrative *</label>
                        <textarea id="extAmendRationale" rows="3" required placeholder="Detailed evidentiary explanation of why amendment action could not be completed within the initial 60 days..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelAmendExtension" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitAmendExtension" style="background: #7c3aed; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Apply +30 Day Extension</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Review Decision: Accept or Deny (§ 164.526(c) & (d)) -->
        <div id="modalAmendDecisionOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Adjudicate PHI Amendment Request</h2>
                        <span style="font-size: 12px; color: #64748b;">Statutory Adjudication &bull; 45 CFR § 164.526</span>
                    </div>
                    <button type="button" id="btnCloseAmendDecisionModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="decisionTargetSummary" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 12.5px;">
                    <!-- Injected target summary -->
                </div>

                <!-- Decision Toggle -->
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <label style="flex: 1; border: 2px solid #22c55e; border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 10px; background: #f0fdf4;">
                        <input type="radio" name="amendDecisionChoice" value="accept" checked style="margin-top: 3px;">
                        <div>
                            <div style="font-weight: 700; color: #15803d; font-size: 13.5px;">Accept Amendment (§ 164.526(c))</div>
                            <div style="font-size: 11.5px; color: #166534; margin-top: 2px;">Permanently link amendment/correction to patient record and identify relevant third parties.</div>
                        </div>
                    </label>
                    <label style="flex: 1; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 10px; background: #fff;">
                        <input type="radio" name="amendDecisionChoice" value="deny" style="margin-top: 3px;">
                        <div>
                            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px;">Deny Amendment (§ 164.526(d))</div>
                            <div style="font-size: 11.5px; color: #7f1d1d; margin-top: 2px;">Cite 1 of 4 statutory grounds and issue formal written denial notice.</div>
                        </div>
                    </label>
                </div>

                <!-- Accept Section -->
                <div id="decisionAcceptSection">
                    <form id="formAmendAccept">
                        <input type="hidden" id="acceptAmendId">
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Acceptance &amp; Record Linking Notes</label>
                            <textarea id="acceptNotes" rows="3" placeholder="Clinical justification, notes on amendment insertion, or identifying persons/entities to be notified (§ 164.526(c)(2))..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                            <button type="button" class="btnCancelDecision" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" style="background: #15803d; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Confirm &amp; Accept Amendment</button>
                        </div>
                    </form>
                </div>

                <!-- Deny Section (Initially Hidden) -->
                <div id="decisionDenySection" style="display: none;">
                    <form id="formAmendDeny">
                        <input type="hidden" id="denyAmendId">
                        
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 14px;">
                            <div style="font-size: 12.5px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">Mandatory 4 Statutory Grounds (45 CFR § 164.526(a)(2)):</div>
                            <div style="font-size: 12px; color: #7f1d1d;">HIPAA strictly restricts covered entity denials to one of four legally enumerated grounds:</div>
                        </div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Statutory Ground for Denial *</label>
                            <select id="denyStatutoryGround" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="accurate_and_complete">1. PHI is determined to be accurate and complete (§ 164.526(a)(2)(iv))</option>
                                <option value="not_created_by_entity">2. PHI was not created by this entity (originator available) (§ 164.526(a)(2)(i))</option>
                                <option value="not_part_of_drs">3. PHI is not part of the Designated Record Set (§ 164.526(a)(2)(ii))</option>
                                <option value="exempt_from_access">4. PHI is exempt from inspection under § 164.524 (e.g. Psychotherapy notes) (§ 164.526(a)(2)(iii))</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Plain-Language Denial Rationale Narrative *</label>
                            <textarea id="denyRationale" rows="3" required placeholder="Evidentiary explanation written in plain language for the individual explaining the clinical basis of denial..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                            <button type="button" class="btnCancelDecision" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" style="background: #b91c1c; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Issue Statutory Denial</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- MODAL: File Statement of Disagreement (§ 164.526(d)(2)) -->
        <div id="modalAmendDisagreementOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">File Patient Statement of Disagreement</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.526(d)(2) &bull; Patient Rebuttal to Denial</span>
                    </div>
                    <button type="button" id="btnCloseAmendDisagreementModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12.5px; font-weight: 600; color: #92400e;">Mandatory Future Disclosure Rule (§ 164.526(d)(4)):</div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #b45309; line-height: 1.5;">
                        Under federal law, whenever a patient files a Statement of Disagreement, the covered entity must <strong>permanently link</strong> the statement to the disputed record so that any future disclosure, printout, or Designated Record Set bundle automatically includes this statement.
                    </p>
                </div>

                <form id="formAmendDisagreement">
                    <input type="hidden" id="disagreeAmendId">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Patient's Statement of Disagreement *</label>
                        <textarea id="disagreeText" rows="4" required placeholder="Enter the exact written statement of disagreement submitted by the patient..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #334155; cursor: pointer;">
                            <input type="checkbox" id="disagreeDisseminate" checked>
                            <span>Attach to all subsequent Designated Record Set exports and third-party disclosures (§ 164.526(d)(4))</span>
                        </label>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelAmendDisagreement" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitAmendDisagreement" style="background: #d97706; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Permanently Link Disagreement</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: File Covered Entity Statement of Rebuttal (§ 164.526(d)(3)) -->
        <div id="modalAmendRebuttalOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">File Covered Entity Statement of Rebuttal</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.526(d)(3) &bull; Provider Rebuttal to Disagreement</span>
                    </div>
                    <button type="button" id="btnCloseAmendRebuttalModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12.5px; font-weight: 600; color: #166534;">Statutory Rebuttal Rule (§ 164.526(d)(3)):</div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d; line-height: 1.5;">
                        The covered entity may prepare a written statement of rebuttal. If prepared, a copy must be provided to the individual and appended to future record disclosures alongside the patient's disagreement statement.
                    </p>
                </div>

                <form id="formAmendRebuttal">
                    <input type="hidden" id="rebuttalAmendId">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Provider's Statement of Rebuttal *</label>
                        <textarea id="rebuttalText" rows="4" required placeholder="Enter the provider or covered entity's written rebuttal statement..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelAmendRebuttal" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitAmendRebuttal" style="background: #15803d; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Save &amp; Link Rebuttal</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Formal 30-Day Extension Notice Letter (§ 164.526(b)(2)(ii)) -->
        <div id="modalAmendExtensionNoticeOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Statutory Written Extension Notice</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.526(b)(2)(ii) &bull; Amendment Extension Letter</span>
                    </div>
                    <button type="button" id="btnCloseAmendExtensionNoticeModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="amendExtensionLetterContainer" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 24px; font-family: Georgia, serif; line-height: 1.6; color: #1e293b; margin-bottom: 16px;">
                    <!-- Dynamically populated letter content -->
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" id="btnPrintAmendExtensionLetter" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Print Extension Letter</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Formal Statutory Written Denial Notice (§ 164.526(d)(1)) -->
        <div id="modalAmendDenialNoticeOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Statutory Written Denial Notice</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.526(d)(1) &bull; Formal Notice of Amendment Denial</span>
                    </div>
                    <button type="button" id="btnCloseAmendDenialNoticeModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="amendDenialLetterContainer" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 24px; font-family: Georgia, serif; line-height: 1.6; color: #1e293b; margin-bottom: 16px;">
                    <!-- Dynamically populated letter content -->
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" id="btnPrintAmendDenialLetter" style="background: #b91c1c; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Print Statutory Denial Letter</span>
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
            .amend-filter-btn:hover { background: #f1f5f9; }
            .amend-filter-btn.active { background: #0284c7 !important; color: #ffffff !important; border-color: #0284c7 !important; }
        </style>
        `;
    }
}
