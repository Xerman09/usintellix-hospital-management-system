export function RegulatoryDiseaseSurveillanceView() {
    return `
    <div class="rds-container" style="padding: 24px; background: #f8fafc; min-height: calc(100vh - 64px); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a;">
        <style>
            .rds-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 16px;
                flex-wrap: wrap;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #7f1d1d 100%);
                color: #ffffff;
                padding: 22px 26px;
                border-radius: 14px;
                box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
                margin-bottom: 22px;
            }
            .rds-badge-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }
            .rds-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
                gap: 16px;
                margin-bottom: 22px;
            }
            .rds-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px 20px;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
                position: relative;
                overflow: hidden;
            }
            .rds-kpi-card .kpi-label {
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                margin-bottom: 8px;
            }
            .rds-kpi-card .kpi-value {
                font-size: 28px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
                margin-bottom: 6px;
            }
            .rds-kpi-card .kpi-sub {
                font-size: 12px;
                color: #475569;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .rds-panel {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
                margin-bottom: 22px;
                overflow: hidden;
            }
            .rds-panel-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                background: #fcfdff;
            }
            .rds-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            .rds-table th {
                background: #f1f5f9;
                color: #334155;
                font-weight: 700;
                text-align: left;
                padding: 11px 14px;
                font-size: 11.5px;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                border-bottom: 1px solid #cbd5e1;
            }
            .rds-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: top;
            }
            .rds-table tr:hover td {
                background: #f8fafc;
            }
            .rds-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: 1px solid transparent;
                transition: all 0.15s ease;
            }
            .rds-btn-primary {
                background: #dc2626;
                color: #ffffff;
            }
            .rds-btn-primary:hover {
                background: #b91c1c;
            }
            .rds-btn-secondary {
                background: #1e293b;
                color: #ffffff;
                border-color: #334155;
            }
            .rds-btn-secondary:hover {
                background: #0f172a;
            }
            .rds-btn-outline {
                background: #ffffff;
                color: #1e293b;
                border-color: #cbd5e1;
            }
            .rds-btn-outline:hover {
                background: #f1f5f9;
            }
            .rds-tab-bar {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .rds-tab-btn {
                padding: 7px 14px;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 600;
                border: 1px solid #cbd5e1;
                background: #ffffff;
                color: #475569;
                cursor: pointer;
            }
            .rds-tab-btn.active {
                background: #0f172a;
                color: #ffffff;
                border-color: #0f172a;
            }
            .rds-modal-backdrop {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.65);
                z-index: 9999;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow-y: auto;
            }
            .rds-modal-card {
                background: #ffffff;
                border-radius: 14px;
                width: 100%;
                max-width: 920px;
                max-height: 92vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
                border: 1px solid #cbd5e1;
            }
            .cif-document {
                padding: 28px;
                background: #ffffff;
                color: #0f172a;
                font-size: 13px;
            }
            .cif-section-header {
                background: #0f172a;
                color: #ffffff;
                padding: 7px 12px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-top: 16px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            .cif-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
                gap: 10px;
            }
            .cif-field {
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 8px 10px;
                background: #f8fafc;
            }
            .cif-field-label {
                font-size: 10.5px;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
                margin-bottom: 3px;
            }
            .cif-field-value {
                font-size: 13px;
                font-weight: 600;
                color: #0f172a;
            }
        </style>

        <!-- Executive Banner -->
        <div class="rds-header">
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span class="rds-badge-pill" style="background: rgba(239, 68, 68, 0.25); color: #fecaca; border: 1px solid rgba(248, 113, 113, 0.5);">
                        🦠 Statutory Mandate • R.A. 11332 / DOH PIDSR / WHO IHR
                    </span>
                    <span class="rds-badge-pill" style="background: rgba(59, 130, 246, 0.25); color: #bfdbfe; border: 1px solid rgba(96, 165, 250, 0.4);">
                        Schema 326 • Automated ICD-10 Trigger
                    </span>
                </div>
                <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
                    Notifiable Disease Surveillance Registry &amp; Epidemiological CIF
                </h1>
                <p style="margin: 0; color: #cbd5e1; font-size: 13.5px; max-width: 780px;">
                    Automated ICD-10 communicable disease detection engine enforcing <strong>Category 1 STAT (24-Hour Mandatory Notification)</strong> vs. <strong>Category 2 (Weekly Epidemiological Summary)</strong> and official <strong>Case Investigation Form (CIF)</strong> generation.
                </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="rdsScanIcd10Btn" class="rds-btn" style="background: #f59e0b; color: #0f172a; font-weight: 700;">
                    🔍 Run Automated ICD-10 Surveillance Scanner
                </button>
                <button id="rdsNewCaseBtn" class="rds-btn rds-btn-primary">
                    ➕ Report Notifiable Disease Case (CIF)
                </button>
            </div>
        </div>

        <!-- KPI Summary Strip -->
        <div class="rds-kpi-grid" id="rdsKpiGrid">
            <div class="rds-kpi-card" style="border-top: 4px solid #dc2626;">
                <div class="kpi-label">Category 1 STAT (24-Hour Mandate)</div>
                <div class="kpi-value" id="rdsKpiCat1Total">—</div>
                <div class="kpi-sub" id="rdsKpiCat1Sub">Loading 24h SLA status...</div>
            </div>
            <div class="rds-kpi-card" style="border-top: 4px solid #ea580c;">
                <div class="kpi-label">24h Notification SLA Compliance</div>
                <div class="kpi-value" id="rdsKpiSlaRate">—%</div>
                <div class="kpi-sub" id="rdsKpiOverdueSub">Checking overdue alerts...</div>
            </div>
            <div class="rds-kpi-card" style="border-top: 4px solid #2563eb;">
                <div class="kpi-label">Category 2 (Weekly Summary)</div>
                <div class="kpi-value" id="rdsKpiCat2Total">—</div>
                <div class="kpi-sub">Dengue, PTB, Leptospirosis, Typhoid</div>
            </div>
            <div class="rds-kpi-card" style="border-top: 4px solid #16a34a;">
                <div class="kpi-label">Lab-Confirmed Pathogens</div>
                <div class="kpi-value" id="rdsKpiLabConfirmed">—</div>
                <div class="kpi-sub" id="rdsKpiLabRateSub">RITM / Molecular RT-PCR / ELISA</div>
            </div>
            <div class="rds-kpi-card" style="border-top: 4px solid #7c3aed;">
                <div class="kpi-label">Auto-Detected &amp; Contacts Traced</div>
                <div class="kpi-value" id="rdsKpiAutoDetected">—</div>
                <div class="kpi-sub" id="rdsKpiContactsSub">Close contacts under active tracing</div>
            </div>
        </div>

        <!-- Two-Column Breakdown: Disease Distribution & Reportable ICD-10 Catalog -->
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 18px; margin-bottom: 22px;">
            <div class="rds-panel" style="margin-bottom: 0;">
                <div class="rds-panel-header">
                    <div>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                            📊 Active Notifiable Disease Distribution by ICD-10
                        </h3>
                        <span style="font-size: 12px; color: #64748b;">Lab confirmation vs. DOH PIDSR transmission status</span>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table class="rds-table">
                        <thead>
                            <tr>
                                <th>ICD-10</th>
                                <th>Notifiable Disease</th>
                                <th>Statutory Category</th>
                                <th>Cases</th>
                                <th>Lab-Confirmed</th>
                                <th>DOH Transmitted</th>
                            </tr>
                        </thead>
                        <tbody id="rdsDiseaseBreakdownBody">
                            <tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">Loading disease distribution...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="rds-panel" style="margin-bottom: 0;">
                <div class="rds-panel-header">
                    <div>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                            ⚡ Automated ICD-10 Surveillance Trigger Catalog
                        </h3>
                        <span style="font-size: 12px; color: #64748b;">Diagnosing any of these codes auto-flags Epidemiology &amp; Infection Control</span>
                    </div>
                </div>
                <div style="max-height: 295px; overflow-y: auto;">
                    <table class="rds-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Disease &amp; Required Specimen</th>
                                <th>Mandatory SLA</th>
                                <th>Isolation Protocol</th>
                            </tr>
                        </thead>
                        <tbody id="rdsCatalogBody">
                            <tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">Loading ICD-10 catalog...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Main Registry Table & Filter Bar -->
        <div class="rds-panel">
            <div class="rds-panel-header">
                <div class="rds-tab-bar" id="rdsCategoryTabs">
                    <button class="rds-tab-btn active" data-category="ALL">All Surveillance Cases</button>
                    <button class="rds-tab-btn" data-category="Category 1 STAT (24h Immediate)">🔴 Category 1 STAT (24h Notification)</button>
                    <button class="rds-tab-btn" data-category="Category 2 (Weekly Summary)">🔵 Category 2 (Weekly Summary)</button>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="rdsStatusFilter" style="padding: 7px 11px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12.5px;">
                        <option value="ALL">All Reporting Statuses</option>
                        <option value="Overdue >24h Alert">🚨 Overdue &gt;24h Alert</option>
                        <option value="Pending Notification">⏳ Pending Notification</option>
                        <option value="Submitted - CIF Transmitted">📤 Submitted - CIF Transmitted</option>
                        <option value="Acknowledged by Health Authority">✅ Acknowledged by Health Authority</option>
                    </select>
                    <input type="text" id="rdsSearchInput" placeholder="Search patient, MRN, CIF#, ICD-10, disease..."
                        style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; width: 250px;">
                    <button id="rdsRefreshBtn" class="rds-btn rds-btn-outline">↻ Refresh</button>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table class="rds-table">
                    <thead>
                        <tr>
                            <th>CIF / PIDSR EPI-ID</th>
                            <th>Patient &amp; Location</th>
                            <th>ICD-10 &amp; Notifiable Disease</th>
                            <th>Category &amp; 24h SLA Timer</th>
                            <th>Case Classification &amp; Lab Status</th>
                            <th>Biosafety Isolation &amp; Contacts</th>
                            <th>DOH / RESU Reporting Status</th>
                            <th style="text-align: right;">CIF &amp; Statutory Actions</th>
                        </tr>
                    </thead>
                    <tbody id="rdsRegistryTableBody">
                        <tr><td colspan="8" style="text-align: center; padding: 32px; color: #64748b;">Loading notifiable disease surveillance registry...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal 1: Standardized Government Epidemiological Case Investigation Form (CIF) Viewer / PDF Generator -->
        <div class="rds-modal-backdrop" id="rdsCifModal">
            <div class="rds-modal-card">
                <div style="padding: 16px 22px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center; border-radius: 13px 13px 0 0;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #93c5fd; font-weight: 700;">
                            Republic of the Philippines • Department of Health • Epidemiology Bureau (PIDSR / WHO IHR)
                        </div>
                        <h3 style="margin: 2px 0 0 0; font-size: 17px; font-weight: 800;" id="rdsCifModalTitle">
                            Epidemiological Case Investigation Form (CIF)
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="rdsPrintCifBtn" class="rds-btn" style="background: #2563eb; color: #ffffff;">
                            🖨️ Print / Export Official CIF PDF
                        </button>
                        <button id="rdsTransmitFromCifBtn" class="rds-btn" style="background: #16a34a; color: #ffffff;">
                            📡 Transmit CIF to DOH RESU
                        </button>
                        <button id="rdsCloseCifModalBtn" class="rds-btn rds-btn-outline" style="background: #334155; color: #ffffff; border-color: #475569;">
                            ✕ Close
                        </button>
                    </div>
                </div>
                <div id="rdsCifPrintableArea" class="cif-document">
                    <!-- Populated dynamically -->
                </div>
            </div>
        </div>

        <!-- Modal 2: Report New Notifiable Disease Case -->
        <div class="rds-modal-backdrop" id="rdsNewCaseModal">
            <div class="rds-modal-card" style="max-width: 760px;">
                <div style="padding: 16px 22px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center; border-radius: 13px 13px 0 0;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #fca5a5; font-weight: 700;">
                            Statutory Epidemiological Surveillance Registration
                        </div>
                        <h3 style="margin: 2px 0 0 0; font-size: 17px; font-weight: 800;">
                            Register Notifiable Disease Case &amp; Generate CIF
                        </h3>
                    </div>
                    <button id="rdsCloseNewCaseModalBtn" class="rds-btn rds-btn-outline" style="background: #334155; color: #ffffff; border-color: #475569;">✕</button>
                </div>
                <form id="rdsNewCaseForm" style="padding: 22px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Reportable ICD-10 Disease *</label>
                            <select id="rdsFormIcd10" required style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                <option value="A00.9">[Category 1 STAT - 24h] A00.9 — Cholera (Vibrio cholerae)</option>
                                <option value="A82.9">[Category 1 STAT - 24h] A82.9 — Human Rabies (Encephalomyelitis)</option>
                                <option value="B05.9">[Category 1 STAT - 24h] B05.9 — Measles (Rubeola)</option>
                                <option value="U07.1">[Category 1 STAT - 24h] U07.1 — COVID-19 (SARS-CoV-2 Severe)</option>
                                <option value="A39.0">[Category 1 STAT - 24h] A39.0 — Meningococcemia</option>
                                <option value="G83.9">[Category 1 STAT - 24h] G83.9 — Acute Flaccid Paralysis (Polio)</option>
                                <option value="A91">[Category 2 Weekly] A91 — Dengue Hemorrhagic Fever / Severe Dengue</option>
                                <option value="A15.0">[Category 2 Weekly] A15.0 — Pulmonary Tuberculosis (Bacteriologically Confirmed)</option>
                                <option value="A27.9">[Category 2 Weekly] A27.9 — Leptospirosis (Weil's Syndrome)</option>
                                <option value="A01.0">[Category 2 Weekly] A01.0 — Typhoid &amp; Paratyphoid Fever</option>
                                <option value="B15.9">[Category 2 Weekly] B15.9 — Acute Viral Hepatitis A</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Detection Trigger Source</label>
                            <select id="rdsFormDetectionSource" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                <option value="automated_icd10_trigger">Automated ICD-10 Diagnosis Trigger</option>
                                <option value="laboratory_critical_alert">Laboratory Critical Pathogen Alert</option>
                                <option value="clinical_triage_flag">ER Clinical Triage Syndromic Flag</option>
                                <option value="manual_infection_control">Infection Control Officer Manual Entry</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1.4fr 1fr 0.6fr 0.7fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Patient Full Name *</label>
                            <input type="text" id="rdsFormPatientName" required placeholder="e.g., Juan Dela Cruz" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Patient MRN *</label>
                            <input type="text" id="rdsFormPatientMrn" required placeholder="MRN-2026-9401" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Age *</label>
                            <input type="number" id="rdsFormPatientAge" required value="29" min="0" max="120" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Sex</label>
                            <select id="rdsFormPatientSex" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Residential Address *</label>
                            <input type="text" id="rdsFormAddress" required value="124 Mabini St, Brgy. San Antonio" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">City / Municipality *</label>
                            <input type="text" id="rdsFormMunicipality" required value="Pasig City" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Isolation Ward / Bed</label>
                            <input type="text" id="rdsFormWardBed" value="ISO-AIIR-03 (Negative Pressure)" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Clinical Case Classification</label>
                            <select id="rdsFormClinicalClass" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                <option value="Suspected">Suspected Case</option>
                                <option value="Probable">Probable Case</option>
                                <option value="Lab-Confirmed">Lab-Confirmed Case</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Laboratory Confirmation Status</label>
                            <select id="rdsFormLabStatus" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                                <option value="Specimen Sent to Reference Lab">Specimen Sent to Reference Lab (RITM)</option>
                                <option value="Positive - Confirmed">Positive - Confirmed Pathogen</option>
                                <option value="Pending Specimen Collection">Pending Specimen Collection</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Close Contacts Identified</label>
                            <input type="number" id="rdsFormCloseContacts" value="5" min="0" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
                        </div>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Clinical Signs, Symptoms &amp; Laboratory Findings *</label>
                        <textarea id="rdsFormSymptoms" rows="2" required style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">Acute onset high-grade fever, characteristic syndromic presentation; specimen collected under strict biosafety protocol.</textarea>
                    </div>

                    <div style="margin-bottom: 18px;">
                        <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Exposure, Travel History &amp; Contact Tracing Notes</label>
                        <textarea id="rdsFormExposure" rows="2" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">Household and community exposure investigation initiated by Hospital Epidemiology &amp; Infection Control Committee.</textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                        <button type="button" id="rdsCancelNewCaseBtn" class="rds-btn rds-btn-outline">Cancel</button>
                        <button type="submit" class="rds-btn rds-btn-primary">⚡ Register Notifiable Case &amp; Generate CIF</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
}
