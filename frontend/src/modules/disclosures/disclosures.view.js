export function DisclosuresView() {
    return `
    <div class="pf-page" id="disclosuresModuleRoot">
        <!-- HEADER -->
        <div class="pf-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e293b;">
                        Accounting of Disclosures Log
                    </h1>
                    <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px;">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        HIPAA § 164.528
                    </span>
                    <span style="font-size: 11px; font-weight: 600; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 9999px;">
                        6-Year Statutory Retention
                    </span>
                </div>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                    Official audit log of Protected Health Information (PHI) released to external third parties outside of Treatment, Payment, and Operations (TPO).
                </p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn-primary" id="btnOpenNewDisclosureModal" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 600; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Record External Disclosure
                </button>
                <button type="button" class="btn-secondary" id="btnOpenAccountingReportModal" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 600; background: white; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Patient Accounting Statement
                </button>
                <button type="button" class="btn-secondary" id="btnExportDisclosuresCsv" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; font-weight: 600; background: white; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export CSV
                </button>
            </div>
        </div>

        <!-- STAT METRIC CARDS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0;">
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Total Disclosures</div>
                <div style="font-size: 24px; font-weight: 800; color: #0f172a;" id="statTotalDisclosures">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Active external releases</div>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Court Orders &amp; Subpoenas</div>
                <div style="font-size: 24px; font-weight: 800; color: #b91c1c;" id="statSubpoenas">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">45 CFR § 164.512(e)</div>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Public Health Reports</div>
                <div style="font-size: 24px; font-weight: 800; color: #0284c7;" id="statPublicHealth">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">45 CFR § 164.512(b)</div>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Law Enforcement</div>
                <div style="font-size: 24px; font-weight: 800; color: #6d28d9;" id="statLawEnforcement">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">45 CFR § 164.512(f)</div>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">HIE / External Exchanges</div>
                <div style="font-size: 24px; font-weight: 800; color: #059669;" id="statHie">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Regional exchange feeds</div>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">6-Year Retained</div>
                <div style="font-size: 24px; font-weight: 800; color: #0369a1;" id="statSixYears">--</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">§ 164.528(a)(1) period</div>
            </div>
        </div>

        <!-- FILTER TOOLBAR -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                <div style="flex: 1; min-width: 220px;">
                    <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                        Search Keywords
                    </label>
                    <input type="text" id="discFilterSearch" class="form-input" style="height: 36px;" placeholder="Recipient, requestor, ref #, or patient...">
                </div>

                <div style="width: 240px; min-width: 200px;">
                    <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                        Statutory Legal Basis (§ 164.512)
                    </label>
                    <select id="discFilterBasis" class="form-input" style="height: 36px;">
                        <option value="">All Legal Bases</option>
                        <option value="court_order_subpoena">Court Order / Subpoena (§ 164.512(e))</option>
                        <option value="public_health">Public Health Authority (§ 164.512(b))</option>
                        <option value="law_enforcement">Law Enforcement Request (§ 164.512(f))</option>
                        <option value="health_oversight">Health Oversight Audit (§ 164.512(d))</option>
                        <option value="hie_exchange">Health Information Exchange (HIE)</option>
                        <option value="abuse_neglect">Abuse, Neglect, Domestic Violence (§ 164.512(c))</option>
                        <option value="threat_safety">Serious Threat to Health/Safety (§ 164.512(j))</option>
                        <option value="workers_comp">Workers' Compensation (§ 164.512(l))</option>
                        <option value="coroner_medical_examiner">Coroner / Medical Examiner (§ 164.512(g))</option>
                        <option value="organ_procurement">Organ Procurement (§ 164.512(h))</option>
                        <option value="other_non_tpo">Other Non-TPO Disclosure</option>
                    </select>
                </div>

                <div style="width: 140px;">
                    <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">From Date</label>
                    <input type="date" id="discFilterFrom" class="form-input" style="height: 36px;">
                </div>

                <div style="width: 140px;">
                    <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">To Date</label>
                    <input type="date" id="discFilterTo" class="form-input" style="height: 36px;">
                </div>

                <div style="display: flex; gap: 8px;">
                    <button type="button" id="btnApplyDiscFilters" style="height: 36px; padding: 0 16px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">
                        Filter
                    </button>
                    <button type="button" id="btnResetDiscFilters" style="height: 36px; padding: 0 14px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">
                        Reset
                    </button>
                </div>
            </div>

            <!-- QUICK PRESET PILLS -->
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; color: #64748b;">
                <span>Quick Presets:</span>
                <button type="button" class="disc-preset-btn" data-preset="6years" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 8px; font-size: 11.5px; cursor: pointer; color: #334155;">
                    Last 6 Years (Mandatory)
                </button>
                <button type="button" class="disc-preset-btn" data-preset="1year" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 8px; font-size: 11.5px; cursor: pointer; color: #334155;">
                    Last 1 Year
                </button>
                <button type="button" class="disc-preset-btn" data-preset="90days" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 8px; font-size: 11.5px; cursor: pointer; color: #334155;">
                    Last 90 Days
                </button>
                <button type="button" class="disc-preset-btn" data-preset="all" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 8px; font-size: 11.5px; cursor: pointer; color: #334155;">
                    All Time
                </button>
            </div>
        </div>

        <div id="disclosuresListAlert"></div>

        <!-- DISCLOSURES DATA TABLE -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div class="table-wrap">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Date &amp; Time</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Patient</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Legal Basis (§ 164.512)</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Recipient Entity &amp; Address</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Purpose &amp; Records Disclosed</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Medium / Ref #</th>
                            <th style="padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Recorded By</th>
                            <th style="padding: 10px 14px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748b;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="disclosuresTableBody">
                        <tr>
                            <td colspan="8" class="table-empty" style="padding: 30px; text-align: center; color: #94a3b8;">
                                Loading Accounting of Disclosures log...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- MODAL 1: RECORD / EDIT DISCLOSURE MODAL -->
    <div class="modal-overlay" id="recordDisclosureModalOverlay">
        <div class="modal-box" style="max-width: 720px;">
            <div class="modal-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0284c7" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <h2 id="recordDisclosureModalTitle" style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                        Record External Disclosure
                    </h2>
                </div>
                <button type="button" class="modal-close" id="btnCloseRecordDisclosureModal">&times;</button>
            </div>
            <p class="form-subtitle" style="margin-top: 4px; font-size: 12.5px; color: #64748b;">
                Under 45 CFR § 164.528, record all required statutory details regarding the release of patient health records.
            </p>

            <div id="recordDisclosureFormAlert"></div>

            <form id="recordDisclosureForm" style="margin-top: 14px;">
                <input type="hidden" id="rec_disclosure_id">

                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <!-- PATIENT SELECT -->
                    <div class="form-group full" id="recPatientGroup">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Patient <span style="color: #ef4444;">*</span></label>
                        <select id="rec_patient_id" class="form-input" required>
                            <option value="">Select patient...</option>
                        </select>
                        <span class="form-error" id="err-rec_patient_id"></span>
                    </div>

                    <!-- DATE -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Date of Disclosure <span style="color: #ef4444;">*</span></label>
                        <input type="date" id="rec_disclosure_date" class="form-input" required>
                        <span class="form-error" id="err-rec_disclosure_date"></span>
                    </div>

                    <!-- LEGAL BASIS -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Statutory Legal Basis (§ 164.512) <span style="color: #ef4444;">*</span></label>
                        <select id="rec_legal_basis" class="form-input" required>
                            <option value="court_order_subpoena">Subpoena / Court Order (§ 164.512(e))</option>
                            <option value="public_health">Public Health Reporting (§ 164.512(b))</option>
                            <option value="law_enforcement">Law Enforcement Inquiries (§ 164.512(f))</option>
                            <option value="health_oversight">Health Oversight Agency Audit (§ 164.512(d))</option>
                            <option value="hie_exchange">Health Information Exchange (HIE)</option>
                            <option value="abuse_neglect">Abuse / Neglect Reporting (§ 164.512(c))</option>
                            <option value="threat_safety">Averting Serious Health Threat (§ 164.512(j))</option>
                            <option value="workers_comp">Workers' Compensation (§ 164.512(l))</option>
                            <option value="coroner_medical_examiner">Coroner / Medical Examiner (§ 164.512(g))</option>
                            <option value="organ_procurement">Organ Donation Procurement (§ 164.512(h))</option>
                            <option value="other_non_tpo">Other Authorized Non-TPO Release</option>
                        </select>
                    </div>

                    <!-- RECIPIENT ENTITY / PERSON -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Recipient Entity or Person <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="rec_recipient" class="form-input" placeholder="e.g. State Dept of Health, Superior Court, Smith Law Firm" required>
                        <span class="form-error" id="err-rec_recipient"></span>
                    </div>

                    <!-- RECIPIENT ADDRESS -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Recipient Address / Jurisdiction (if known)</label>
                        <input type="text" id="rec_recipient_address" class="form-input" placeholder="e.g. 500 Court St, Metropolis, NY 10001">
                    </div>

                    <!-- REQUESTOR NAME -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Requesting Official / Contact</label>
                        <input type="text" id="rec_requestor_name" class="form-input" placeholder="e.g. Judge J. Adams, Inspector R. Miller">
                    </div>

                    <!-- TRANSMISSION MEDIUM -->
                    <div class="form-group">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Disclosure Medium</label>
                        <select id="rec_disclosure_medium" class="form-input">
                            <option value="electronic_portal">Electronic Portal / API Feed</option>
                            <option value="secure_email">Encrypted Secure Email (TLS / PGP)</option>
                            <option value="encrypted_media">Encrypted Storage Media (USB / Disc)</option>
                            <option value="fax">Secure HIPAA Facsimile</option>
                            <option value="paper_mail">Certified Mail / Paper Delivery</option>
                            <option value="in_person">In-Person Legal Handover</option>
                        </select>
                    </div>

                    <!-- REFERENCE NUMBER -->
                    <div class="form-group full">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Case / Docket / Subpoena Reference #</label>
                        <input type="text" id="rec_reference_number" class="form-input" placeholder="e.g. DOCKET-2026-CV-8912 or SUBPOENA-8941">
                    </div>

                    <!-- STATEMENT OF PURPOSE -->
                    <div class="form-group full">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Statement of Purpose (§ 164.528(b)(2)(iv)) <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="rec_purpose" class="form-input" placeholder="e.g. Mandatory public health communicable disease report pursuant to NY Public Health Law § 2101" required>
                        <span class="form-error" id="err-rec_purpose"></span>
                    </div>

                    <!-- RECORDS DISCLOSED -->
                    <div class="form-group full">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Specific PHI Records Disclosed (§ 164.528(b)(2)(iii)) <span style="color: #ef4444;">*</span></label>
                        <textarea id="rec_records_disclosed" class="form-input" style="min-height: 60px;" placeholder="e.g. Laboratory & PCR diagnostic results (Jan 2026 - Mar 2026), clinical encounter notes, vaccination records" required></textarea>
                        <span class="form-error" id="err-rec_records_disclosed"></span>
                    </div>

                    <!-- DESCRIPTION / REMARKS -->
                    <div class="form-group full">
                        <label style="font-weight: 600; font-size: 12px; color: #334155;">Additional Internal Notes</label>
                        <textarea id="rec_description" class="form-input" style="min-height: 50px;" placeholder="Internal documentation, supervisor authorization, or delivery confirmation tracking number"></textarea>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn-secondary" id="btnCancelRecordDisclosure">Cancel</button>
                    <button class="login-btn" type="submit" id="btnSubmitRecordDisclosure" style="background: #0284c7;">
                        Save Disclosure Record
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL 2: PATIENT ACCOUNTING STATEMENT REPORT MODAL -->
    <div class="modal-overlay" id="accountingReportModalOverlay">
        <div class="modal-box" style="max-width: 860px;">
            <div class="modal-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#059669" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                        Patient Accounting of Disclosures Statement
                    </h2>
                </div>
                <button type="button" class="modal-close" id="btnCloseAccountingReportModal">&times;</button>
            </div>
            <p class="form-subtitle" style="margin-top: 4px; font-size: 12.5px; color: #64748b;">
                Formal legal report generated for a patient upon request pursuant to 45 CFR § 164.528.
            </p>

            <!-- CONTROLS -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 14px 0; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                <div style="flex: 1; min-width: 220px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
                        Select Patient
                    </label>
                    <select id="rpt_patient_id" class="form-input" style="height: 34px;">
                        <option value="">Select patient...</option>
                    </select>
                </div>
                <div style="width: 140px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Period From</label>
                    <input type="date" id="rpt_from_date" class="form-input" style="height: 34px;">
                </div>
                <div style="width: 140px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Period To</label>
                    <input type="date" id="rpt_to_date" class="form-input" style="height: 34px;">
                </div>
                <button type="button" id="btnGenerateReportView" style="height: 34px; padding: 0 16px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 12.5px; cursor: pointer;">
                    Generate Statement
                </button>
            </div>

            <div id="accountingReportAlert"></div>

            <!-- PRINTABLE STATEMENT PREVIEW -->
            <div id="accountingReportPreviewArea" style="display: none; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; max-height: 480px; overflow-y: auto;">
                <div id="printableReportContent"></div>
            </div>

            <div class="form-actions" style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn-secondary" id="btnCancelAccountingReport">Close</button>
                <button type="button" id="btnPrintAccountingReport" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; display: none;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Statement / Save PDF
                </button>
            </div>
        </div>
    </div>
    `;
}
