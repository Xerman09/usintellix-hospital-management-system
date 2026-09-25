export class DrsRequestsView {
    static render() {
        return `
        <div class="drs-container" style="padding: 20px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #e0f2fe; color: #0284c7; border-radius: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </span>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">Patient Right of Access &amp; Designated Record Set (DRS)</h1>
                        <span style="font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">
                            45 CFR § 164.524 &bull; 21st Century Cures Act
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 13.5px; color: #64748b;">
                        Administrative 30-day fulfillment pipeline, statutory countdown timers, Designated Record Set compilation, and single 30-day extension enforcement.
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button type="button" id="btnExportDrsCsv" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Export Registry (CSV)</span>
                    </button>
                    <button type="button" id="btnRefreshDrs" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                    <button type="button" id="btnOpenDrsIntakeModal" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.2);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Log Right of Access Request</span>
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 22px;">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #0284c7;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Total Requests</div>
                    <div id="statDrsTotal" style="font-size: 26px; font-weight: 700; color: #0f172a;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">All logged access requests</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Active Pending</div>
                    <div id="statDrsPending" style="font-size: 26px; font-weight: 700; color: #2563eb;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">In progress within 30 days</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">Impending (≤7 Days)</div>
                    <div id="statDrsImpending" style="font-size: 26px; font-weight: 700; color: #d97706;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Action required urgently</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 12px; font-weight: 600; color: #b91c1c; text-transform: uppercase; margin-bottom: 4px;">Overdue (&gt;30 Days)</div>
                    <div id="statDrsOverdue" style="font-size: 26px; font-weight: 700; color: #dc2626;">--</div>
                    <div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 2px;">Immediate OCR violation risk</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #8b5cf6;">
                    <div style="font-size: 12px; font-weight: 600; color: #6d28d9; text-transform: uppercase; margin-bottom: 4px;">30-Day Extensions</div>
                    <div id="statDrsExtensions" style="font-size: 26px; font-weight: 700; color: #7c3aed;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Single permissible extension (§ 164.524)</div>
                </div>
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #10b981;">
                    <div style="font-size: 12px; font-weight: 600; color: #047857; text-transform: uppercase; margin-bottom: 4px;">Compliance Rate</div>
                    <div id="statDrsCompliance" style="font-size: 26px; font-weight: 700; color: #059669;">--%</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Fulfilled within statutory deadline</div>
                </div>
            </div>

            <!-- Overdue Alert Banner (conditionally displayed if overdue > 0) -->
            <div id="drsOverdueBanner" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div>
                        <strong style="color: #991b1b; font-size: 14px;">STATUTORY COMPLIANCE ALERT: Overdue Right of Access Requests Detected</strong>
                        <p style="margin: 3px 0 0 0; font-size: 12.5px; color: #b91c1c;">
                            One or more Designated Record Set requests have exceeded the 30-calendar-day mandate under 45 CFR § 164.524. Expedited compilation and delivery are required to mitigate OCR enforcement penalties.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
                    <div style="position: relative; flex: 1;">
                        <input type="text" id="drsSearchInput" placeholder="Search by request #, patient name, or ID..." style="width: 100%; box-sizing: border-box; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <select id="drsStatusFilter" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; outline: none; background: #fff;">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_review">In Review</option>
                        <option value="extension_granted">Extension Granted</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="denied">Denied</option>
                    </select>
                    <select id="drsFormatFilter" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; outline: none; background: #fff;">
                        <option value="">All Formats</option>
                        <option value="electronic_pdf">Electronic PDF</option>
                        <option value="machine_readable_json">JSON Interoperability</option>
                        <option value="paper_printout">Paper Printout</option>
                        <option value="portal_download">Portal Download</option>
                    </select>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span style="font-size: 12px; color: #64748b; font-weight: 600; margin-right: 4px;">Urgency:</span>
                    <button type="button" class="drs-urgency-btn active" data-urgency="" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #0284c7; color: #fff; cursor: pointer;">All</button>
                    <button type="button" class="drs-urgency-btn" data-urgency="impending" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #b45309; cursor: pointer;">⚠️ Impending (≤7d)</button>
                    <button type="button" class="drs-urgency-btn" data-urgency="overdue" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #b91c1c; cursor: pointer;">🚨 Overdue</button>
                    <button type="button" class="drs-urgency-btn" data-urgency="extended" style="padding: 6px 10px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #6d28d9; cursor: pointer;">Extended</button>
                </div>
            </div>

            <!-- Pipeline Requests Table -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">
                                <th style="padding: 12px 16px;">Request #</th>
                                <th style="padding: 12px 16px;">Patient</th>
                                <th style="padding: 12px 16px;">Request Date</th>
                                <th style="padding: 12px 16px;">Format &amp; Delivery</th>
                                <th style="padding: 12px 16px;">30-Day Countdown Clock</th>
                                <th style="padding: 12px 16px;">Fee Rule (§ 164.524(c)(4))</th>
                                <th style="padding: 12px 16px;">Status</th>
                                <th style="padding: 12px 16px; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="drsTableBody">
                            <tr>
                                <td colspan="8" style="padding: 40px; text-align: center; color: #94a3b8;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>Loading Right of Access requests pipeline...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL: Log Right of Access Request -->
        <div id="modalDrsIntakeOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Log Patient Right of Access Request</h2>
                        <span style="font-size: 12px; color: #64748b;">HIPAA 45 CFR § 164.524 &bull; Designated Record Set Request Intake</span>
                    </div>
                    <button type="button" id="btnCloseDrsIntakeModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <form id="formDrsIntake">
                    <!-- Patient Selection -->
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Target Patient *</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="intakePatientSearch" placeholder="Type name or Patient No to find..." style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <input type="hidden" id="intakePatientId" required>
                        </div>
                        <div id="intakePatientSelectedLabel" style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 4px; display: none;"></div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Date of Receipt *</label>
                            <input type="date" id="intakeRequestDate" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <span style="font-size: 11px; color: #64748b;">Starts the 30-calendar-day statutory countdown.</span>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requestor Type *</label>
                            <select id="intakeRequestorType" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="patient">Patient Directly</option>
                                <option value="personal_representative">Personal Representative</option>
                                <option value="legal_guardian">Legal Guardian</option>
                                <option value="authorized_third_party">Authorized Third Party (Signed HIPAA Form)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requestor Legal Name *</label>
                            <input type="text" id="intakeRequestorName" required placeholder="Full legal name" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requestor Contact Info</label>
                            <input type="text" id="intakeRequestorContact" placeholder="Phone or verified email" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Intake Channel *</label>
                            <select id="intakeRequestChannel" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="patient_portal">Patient Portal Electronic</option>
                                <option value="written_mail">Written Letter / Postal Mail</option>
                                <option value="in_person">In-Person Clinic Request</option>
                                <option value="secure_email">Direct / Secure Email</option>
                                <option value="fax">Encrypted HIPAA Fax</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Requested Format *</label>
                            <select id="intakeFormatRequested" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="electronic_pdf">Electronic Complete PDF Bundle</option>
                                <option value="machine_readable_json">Machine-Readable JSON (C-CDA/USCDI)</option>
                                <option value="paper_printout">Paper Printout</option>
                                <option value="portal_download">Secure Portal Download</option>
                                <option value="all_formats">All Formats (PDF + JSON + Paper)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Delivery Method *</label>
                            <select id="intakeDeliveryMethod" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="secure_portal">Secure Patient Portal ($0.00)</option>
                                <option value="encrypted_email">Encrypted Secure Email</option>
                                <option value="first_class_mail">First-Class Postal Mail</option>
                                <option value="in_person_pickup">In-Person Clinic Pick-up</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Record Scope *</label>
                            <select id="intakeRecordsScope" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="complete_designated_record_set">Complete Designated Record Set (All)</option>
                                <option value="clinical_only">Clinical Records Only (SOAP, Labs, Vitals)</option>
                                <option value="billing_only">Billing Ledger &amp; Financial Statements Only</option>
                                <option value="date_range_custom">Specific Date Range</option>
                            </select>
                        </div>
                    </div>

                    <!-- Fee Rules Card (§ 164.524(c)(4)) -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12.5px; font-weight: 700; color: #0f172a;">Statutory Fee Limitation Rule (§ 164.524(c)(4))</span>
                            <span style="font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Search/Retrieval Fees Prohibited</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Fee Category</label>
                                <select id="intakeFeeCategory" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12.5px;">
                                    <option value="none_zero_fee">Zero Fee / Portal Delivery ($0.00)</option>
                                    <option value="electronic_media_safe_harbor">Electronic Media OCR Safe Harbor (Max $6.50)</option>
                                    <option value="paper_copying_supplies">Paper Copying Supplies (Actual Paper/Toner)</option>
                                    <option value="actual_postage">Actual First-Class Postage</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Assessed Fee Amount ($)</label>
                                <input type="number" step="0.01" min="0" value="0.00" id="intakeFeeAssessed" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12.5px;">
                            </div>
                        </div>
                        <div style="margin-top: 8px;">
                            <input type="text" id="intakeFeeBreakdown" placeholder="Itemized supply or postage justification (Search fees prohibited)" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12px;">
                        </div>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Intake / Fulfillment Notes</label>
                        <textarea id="intakeNotes" rows="2" placeholder="Administrative coordination or special instructions..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelDrsIntake" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitDrsIntake" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Initialize 30-Day Pipeline</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Grant 30-Day Extension (§ 164.524(b)(2)(ii)) -->
        <div id="modalDrsExtensionOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Grant Statutory 30-Day Extension</h2>
                        <span style="font-size: 12px; color: #64748b;">45 CFR § 164.524(b)(2)(ii) &bull; Single Permissible Extension</span>
                    </div>
                    <button type="button" id="btnCloseDrsExtensionModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div style="background: #fdf4ff; border: 1px solid #f5d0fe; border-left: 4px solid #a855f7; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12.5px; font-weight: 600; color: #701a75;">Statutory Rule Under 45 CFR § 164.524(b)(2)(ii):</div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #86198f; line-height: 1.5;">
                        A covered entity may extend the initial 30-day deadline by no more than <strong>30 additional calendar days</strong>, provided written notice stating the reasons for delay and definitive new delivery date is provided to the individual within the initial 30-day period. <em>Only ONE extension is permitted under federal law.</em>
                    </p>
                </div>

                <form id="formDrsExtension">
                    <input type="hidden" id="extRequestId">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Statutory Reason for Delay *</label>
                        <select id="extReason" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="offsite_archive_retrieval">Retrieval of historical records stored in off-site archival repository</option>
                            <option value="extensive_record_compilation">Extensive collation of multi-departmental clinical and billing records</option>
                            <option value="physician_review_consultation">Required consultation with treating licensed healthcare provider (§ 164.524(a)(3))</option>
                            <option value="technical_format_conversion">Technical conversion to requested specialized electronic format</option>
                            <option value="legal_representative_verification">Verification of personal representative authority documentation</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 4px;">Extension Rationale Narrative *</label>
                        <textarea id="extRationale" rows="3" required placeholder="Detailed evidentiary explanation of why records could not be delivered within the initial 30 days..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: inherit;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                        <button type="button" id="btnCancelDrsExtension" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="btnSubmitDrsExtension" style="background: #7c3aed; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Apply +30 Day Extension</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Designated Record Set Export Bundle (§ 164.501 & § 164.524) -->
        <div id="modalDrsBundleOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Designated Record Set (DRS) Export Bundle</h2>
                        <span style="font-size: 12px; color: #64748b;">HIPAA 45 CFR § 164.501 &bull; Complete Medical &amp; Billing Records Collation</span>
                    </div>
                    <button type="button" id="btnCloseDrsBundleModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="drsBundleLoading" style="text-align: center; padding: 30px; color: #64748b;">
                    <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 8px; font-size: 13px;">Compiling clinical encounters, SOAP notes, vitals, labs, and billing ledger...</p>
                </div>

                <div id="drsBundleContent" style="display: none;">
                    <!-- Patient Summary Card -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div id="bundlePatientName" style="font-size: 16px; font-weight: 700; color: #0f172a;">--</div>
                            <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">
                                Patient No: <span id="bundlePatientNo" style="font-weight: 600;">--</span> &bull; DOB: <span id="bundlePatientDob">--</span> &bull; Sex: <span id="bundlePatientSex">--</span>
                            </div>
                        </div>
                        <span style="background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">
                            DRS Verified
                        </span>
                    </div>

                    <!-- Collation Manifest Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 18px;">
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Encounters &amp; SOAP</div>
                            <div id="bundleCountEncounters" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Problems &amp; Diagnoses</div>
                            <div id="bundleCountProblems" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Allergies</div>
                            <div id="bundleCountAllergies" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Medications / Rx</div>
                            <div id="bundleCountMeds" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Lab &amp; Procedure Results</div>
                            <div id="bundleCountLabs" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #fff;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Billing Ledger Entries</div>
                            <div id="bundleCountLedger" style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">0</div>
                        </div>
                    </div>

                    <!-- Action Export Buttons -->
                    <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Deliver Complete Designated Record Set</div>
                            <div style="font-size: 12px; color: #64748b;">Supports immediate browser printing to PDF or machine-readable JSON download.</div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" id="btnDownloadDrsJson" style="background: #ffffff; color: #0284c7; border: 1px solid #0284c7; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>Download JSON Package</span>
                            </button>
                            <button type="button" id="btnPrintDrsPdfBundle" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                <span>Print / Save Complete PDF Bundle</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: Formal 30-Day Extension Notice Letter -->
        <div id="modalDrsNoticeOverlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
            <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">Statutory Written Extension Notice</h2>
                        <span style="font-size: 12px; color: #64748b;">Formal Letterhead Required under 45 CFR § 164.524(b)(2)(ii)</span>
                    </div>
                    <button type="button" id="btnCloseDrsNoticeModal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>

                <div id="drsNoticeLetterContainer" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 24px; font-family: Georgia, serif; line-height: 1.6; color: #1e293b; margin-bottom: 16px;">
                    <!-- Dynamically populated letter content -->
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" id="btnPrintNoticeLetter" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Print Extension Letter</span>
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .drs-urgency-btn:hover { background: #f1f5f9; }
            .drs-urgency-btn.active { background: #0284c7 !important; color: #ffffff !important; border-color: #0284c7 !important; }
        </style>
        `;
    }
}
