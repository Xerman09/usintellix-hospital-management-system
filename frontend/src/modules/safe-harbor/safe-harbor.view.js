export function SafeHarborView() {
    return `
<style>
.safe-harbor-page {
    width: 100%;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #0f172a;
    padding-bottom: 40px;
}

.deid-header-card {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
    color: white;
    padding: 24px 28px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(6, 78, 59, 0.15);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
}

.deid-header-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.deid-header-subtitle {
    font-size: 13px;
    color: #a7f3d0;
    margin: 0;
    max-width: 720px;
    line-height: 1.5;
}

.deid-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.deid-header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.btn-deid-primary {
    background: #10b981;
    color: white;
    border: 1px solid #059669;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-deid-primary:hover {
    background: #059669;
    transform: translateY(-1px);
}

.btn-deid-secondary {
    background: rgba(255, 255, 255, 0.12);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.btn-deid-secondary:hover {
    background: rgba(255, 255, 255, 0.22);
}

/* KPI Cards */
.deid-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.deid-kpi-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 18px 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.2s, box-shadow 0.2s;
}

.deid-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.06);
}

.deid-kpi-label {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}

.deid-kpi-value {
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 6px;
}

.deid-kpi-sub {
    font-size: 11px;
    color: #10b981;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Tab Navigation */
.deid-tabs-container {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
}

.deid-tabs-header {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 0 16px;
}

.deid-tab-btn {
    background: none;
    border: none;
    padding: 14px 20px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.deid-tab-btn:hover {
    color: #047857;
}

.deid-tab-btn.active {
    color: #047857;
    border-bottom-color: #047857;
    background: white;
}

/* Filter Bar */
.deid-filter-bar {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    background: white;
}

.deid-search-input {
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    min-width: 240px;
    outline: none;
}

.deid-search-input:focus {
    border-color: #047857;
    box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.15);
}

.deid-select-filter {
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    background: white;
}

/* Data Table */
.deid-table-wrapper {
    overflow-x: auto;
}

.deid-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 13px;
}

.deid-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
}

.deid-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.deid-table tbody tr:hover {
    background: #f8fafc;
}

/* Status Badges */
.badge-deid-type {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #e0f2fe;
    color: #0369a1;
}

.badge-deid-purpose {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #fef3c7;
    color: #92400e;
}

.badge-deid-verified {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #dcfce7;
    color: #166534;
}

.deid-hash-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    color: #475569;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
}

/* Checklist Visualizer Cards */
.deid-checklist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    padding: 24px;
}

.deid-check-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.deid-check-letter {
    width: 32px;
    height: 32px;
    background: #047857;
    color: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
}

/* Modals */
.deid-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.deid-modal-card {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 680px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
}

.deid-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border-radius: 12px 12px 0 0;
}

.deid-modal-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
}

.deid-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    color: #64748b;
    cursor: pointer;
}

.deid-modal-body {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
}

.deid-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-radius: 0 0 12px 12px;
}

.form-group-deid {
    margin-bottom: 18px;
}

.form-group-deid label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
}

.form-control-deid {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    box-sizing: border-box;
    outline: none;
}

.form-control-deid:focus {
    border-color: #047857;
    box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.15);
}

.deid-cert-paper {
    background: #fffdfa;
    border: 2px solid #d97706;
    border-radius: 8px;
    padding: 28px;
    font-family: 'Times New Roman', Times, serif;
    color: #1e293b;
    box-shadow: inset 0 0 15px rgba(217, 119, 6, 0.05);
}
</style>

<div class="safe-harbor-page">
    <!-- Header Banner -->
    <div class="deid-header-card">
        <div>
            <div class="deid-badge-pill" style="margin-bottom: 8px;">
                <span>⚖️</span>
                <span>45 CFR § 164.514(a)–(c) STATUTORY STANDARD</span>
            </div>
            <h1 class="deid-header-title">Safe Harbor 18-Identifier PHI De-Identification Tool</h1>
            <p class="deid-header-subtitle">
                Automated clinical & demographic sanitization engine. Definitively removes all 18 direct and indirect identifiers, converts 17 Census-restricted ZIP prefixes to 000, aggregates ages &gt; 89 to "90 or older", reduces all dates to year-only, and manages non-derivable research pseudonym keys in an isolated vault.
            </p>
        </div>
        <div class="deid-header-actions">
            <button class="btn-deid-primary" id="btnOpenNewDatasetModal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Generate Safe Harbor Dataset
            </button>
            <button class="btn-deid-secondary" id="btnExportMasterRegistry">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Registry (CSV)
            </button>
        </div>
    </div>

    <!-- 6 KPI Telemetry Cards -->
    <div class="deid-kpi-grid">
        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Total Exports</div>
                <div class="deid-kpi-value" id="kpiTotalExports">0</div>
            </div>
            <div class="deid-kpi-sub">
                <span>✓</span> Master Ledgers Recorded
            </div>
        </div>

        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Records De-Identified</div>
                <div class="deid-kpi-value" id="kpiRecordsSanitized">0</div>
            </div>
            <div class="deid-kpi-sub">
                <span>🔒</span> Safe Harbor Certified
            </div>
        </div>

        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Identifiers Stripped</div>
                <div class="deid-kpi-value" id="kpiIdentifiersRemoved">18 / 18</div>
            </div>
            <div class="deid-kpi-sub">
                <span>✓</span> § 164.514(b)(2) Complete
            </div>
        </div>

        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Research Cohorts</div>
                <div class="deid-kpi-value" id="kpiActiveCohorts">0</div>
            </div>
            <div class="deid-kpi-sub">
                <span>📊</span> AI & Quality Studies
            </div>
        </div>

        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Vault Lookup Keys</div>
                <div class="deid-kpi-value" id="kpiVaultKeys">0</div>
            </div>
            <div class="deid-kpi-sub">
                <span>🛡️</span> Encrypted (§ 164.514(c))
            </div>
        </div>

        <div class="deid-kpi-card">
            <div>
                <div class="deid-kpi-label">Safe Harbor Compliance</div>
                <div class="deid-kpi-value" style="color: #059669;" id="kpiComplianceRate">100.0%</div>
            </div>
            <div class="deid-kpi-sub">
                <span>⚖️</span> OCR Audit Defensible
            </div>
        </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="deid-tabs-container">
        <div class="deid-tabs-header">
            <button class="deid-tab-btn active" id="tabBtnLedger" data-target="panelLedger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Master De-Identification Ledger
            </button>
            <button class="deid-tab-btn" id="tabBtnChecklist" data-target="panelChecklist">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                18-Identifier Safe Harbor Rules (§ 164.514(b))
            </button>
        </div>

        <!-- Panel 1: Master Ledger -->
        <div id="panelLedger" class="deid-tab-panel">
            <div class="deid-filter-bar">
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="inputDeidSearch" class="deid-search-input" placeholder="Search by Export Code, Recipient, or Investigator...">
                    <select id="selectDeidTypeFilter" class="deid-select-filter">
                        <option value="all">All Dataset Types</option>
                        <option value="patient_demographics">Demographics</option>
                        <option value="clinical_encounters">Clinical Encounters & SOAP</option>
                        <option value="prescriptions_rx">Prescriptions (Rx)</option>
                        <option value="laboratory_results">Laboratory Results</option>
                        <option value="financial_billing">Financial Billing & Claims</option>
                        <option value="longitudinal_cohort">Longitudinal Cohort</option>
                    </select>
                    <select id="selectDeidPurposeFilter" class="deid-select-filter">
                        <option value="all">All Research Purposes</option>
                        <option value="clinical_research">Clinical Research</option>
                        <option value="ai_model_training">AI Model Training</option>
                        <option value="internal_quality_improvement">Internal Quality Improvement</option>
                        <option value="epidemiological_study">Epidemiological Study</option>
                        <option value="health_data_analytics">Health Data Analytics</option>
                    </select>
                </div>
                <div>
                    <button class="btn-deid-primary" style="padding: 8px 14px; font-size: 12px;" id="btnOpenVaultModal">
                        <span>🔑</span> Compliance Re-ID Vault
                    </button>
                </div>
            </div>

            <div class="deid-table-wrapper">
                <table class="deid-table">
                    <thead>
                        <tr>
                            <th>Export Code</th>
                            <th>Dataset Domain</th>
                            <th>Purpose & Recipient</th>
                            <th>Records</th>
                            <th>SHA-256 Checksum</th>
                            <th>Attestation Officer</th>
                            <th>Attested At</th>
                            <th style="text-align: right;">Statutory Actions</th>
                        </tr>
                    </thead>
                    <tbody id="deidLedgerTbody">
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 32px; color: #64748b;">
                                Loading Safe Harbor export ledger...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Panel 2: 18-Identifier Checklist -->
        <div id="panelChecklist" class="deid-tab-panel" style="display: none;">
            <div style="padding: 20px 24px; background: #ecfdf5; border-bottom: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 4px 0; color: #065f46; font-size: 15px;">Statutory 18 Direct & Indirect Identifiers (45 CFR § 164.514(b)(2))</h3>
                    <p style="margin: 0; color: #047857; font-size: 12px;">Under the Safe Harbor method, health information is not individually identifiable only if all of the following 18 identifiers of the individual or of relatives, employers, or household members of the individual, are removed.</p>
                </div>
                <div class="badge-deid-verified" style="padding: 6px 12px; font-size: 12px;">
                    <span>✓</span> All 18 Automated
                </div>
            </div>

            <div class="deid-checklist-grid" id="deidChecklistContainer">
                <!-- Checklist items injected via JS -->
            </div>
        </div>
    </div>

    <!-- Modal 1: Generate De-Identified Dataset -->
    <div id="modalNewDataset" class="deid-modal-overlay" style="display: none;">
        <div class="deid-modal-card">
            <div class="deid-modal-header">
                <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Generate Safe Harbor De-Identified Dataset
                </h3>
                <button class="deid-modal-close" id="btnCloseNewDatasetModal">&times;</button>
            </div>
            <div class="deid-modal-body">
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: #166534; line-height: 1.4;">
                    <strong>Statutory Safe Harbor Engine:</strong> Patient names, MRNs, SSNs, phone numbers, and addresses will be completely stripped. All dates will be truncated to <strong>Year Only</strong>, all ages over 89 will be aggregated to <strong>"90 or older"</strong>, and the 17 Census-restricted ZIP prefixes will be converted to <strong>000</strong>.
                </div>

                <div class="form-group-deid">
                    <label>Target Dataset Domain *</label>
                    <select id="inputDeidType" class="form-control-deid">
                        <option value="patient_demographics">Patient Demographics (Pseudonymized)</option>
                        <option value="clinical_encounters">Clinical Encounters & Scrubbed SOAP Notes</option>
                        <option value="prescriptions_rx">Prescriptions & Dispensations (RxNorm)</option>
                        <option value="laboratory_results">Laboratory Results (LOINC Codes)</option>
                        <option value="financial_billing">Financial Billing & Procedures (CPT Codes)</option>
                        <option value="longitudinal_cohort">Longitudinal Multi-Domain Cohort</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group-deid">
                        <label>Purpose of Use *</label>
                        <select id="inputDeidPurpose" class="form-control-deid">
                            <option value="clinical_research">Clinical Research Cohort</option>
                            <option value="ai_model_training">AI Model Training / ML Pipeline</option>
                            <option value="internal_quality_improvement">Internal Quality Improvement Study</option>
                            <option value="epidemiological_study">Epidemiological / Public Health Study</option>
                            <option value="health_data_analytics">Health Data Analytics</option>
                        </select>
                    </div>

                    <div class="form-group-deid">
                        <label>Export Format *</label>
                        <select id="inputDeidFormat" class="form-control-deid">
                            <option value="rfc4180_csv">RFC 4180 CSV (with Statutory Header)</option>
                            <option value="fhir_json">FHIR / JSON ResearchStudy Bundle</option>
                        </select>
                    </div>
                </div>

                <div class="form-group-deid">
                    <label>Purpose Description & Protocol Title *</label>
                    <textarea id="inputDeidPurposeDesc" class="form-control-deid" rows="2" placeholder="e.g. IRB-Approved Longitudinal Outcomes Study in Diabetic Cardiopathy (IRB #2026-0814)"></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group-deid">
                        <label>Recipient Institution *</label>
                        <input type="text" id="inputDeidRecipientInst" class="form-control-deid" placeholder="e.g. Johns Hopkins Medical Research Center">
                    </div>
                    <div class="form-group-deid">
                        <label>Recipient Investigator *</label>
                        <input type="text" id="inputDeidRecipientInvestigator" class="form-control-deid" placeholder="e.g. Dr. Eleanor Vance, MD PhD">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group-deid">
                        <label>Attestation Compliance Officer *</label>
                        <input type="text" id="inputDeidOfficerName" class="form-control-deid" value="Dr. Harold Finch, JD CHPC">
                    </div>
                    <div class="form-group-deid">
                        <label>Compliance Officer Role *</label>
                        <input type="text" id="inputDeidOfficerRole" class="form-control-deid" value="HIPAA Privacy & Security Officer">
                    </div>
                </div>

                <div class="form-group-deid">
                    <label>Maximum Cohort Sample Limit</label>
                    <select id="inputDeidLimit" class="form-control-deid">
                        <option value="50">50 Records (Quick Cohort)</option>
                        <option value="100" selected>100 Records</option>
                        <option value="250">250 Records</option>
                        <option value="500">500 Records</option>
                    </select>
                </div>

                <div style="margin-top: 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px;">
                    <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: #92400e; cursor: pointer;">
                        <input type="checkbox" id="chkStatutoryAttestation" style="margin-top: 2px;">
                        <span>
                            <strong>Mandatory Safe Harbor Certification (§ 164.514(b)(2)):</strong>
                            I certify that this data export satisfies the 18 Safe Harbor identifiers standard, that no key for re-identification is disclosed to the recipient, and that I have no actual knowledge that the remaining data could identify any individual.
                        </span>
                    </label>
                </div>
            </div>
            <div class="deid-modal-footer">
                <button class="btn-deid-secondary" style="color: #475569; border-color: #cbd5e1;" id="btnCancelNewDatasetModal">Cancel</button>
                <button class="btn-deid-primary" id="btnSubmitNewDataset" disabled>
                    Generate & Certify Safe Harbor Dataset
                </button>
            </div>
        </div>
    </div>

    <!-- Modal 2: Re-Identification Vault Lookup Modal -->
    <div id="modalVaultLookup" class="deid-modal-overlay" style="display: none;">
        <div class="deid-modal-card" style="max-width: 600px;">
            <div class="deid-modal-header" style="background: #fef2f2; border-bottom-color: #fecaca;">
                <h3 style="color: #991b1b;">
                    <span>🛡️</span>
                    Isolated Re-Identification Vault (§ 164.514(c))
                </h3>
                <button class="deid-modal-close" id="btnCloseVaultModal">&times;</button>
            </div>
            <div class="deid-modal-body">
                <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #9f1239;">
                    <strong>RESTRICTED COMPLIANCE ACCESS:</strong> Access to this isolated vault is strictly restricted to authorized Compliance Officers. Any lookup is permanently bound to your user identity and sequential HMAC-SHA-256 audit blockchain under 45 CFR § 164.312(b).
                </div>

                <div class="form-group-deid">
                    <label>Select Target Export Reference *</label>
                    <select id="selectVaultExportId" class="form-control-deid">
                        <option value="">Select an export...</option>
                    </select>
                </div>

                <div class="form-group-deid">
                    <label>Research Subject Pseudonym Code *</label>
                    <input type="text" id="inputVaultPseudonym" class="form-control-deid" placeholder="e.g. SUBJ-4F9A2C18">
                </div>

                <button class="btn-deid-primary" style="width: 100%; justify-content: center;" id="btnQueryVault">
                    <span>🔍</span> Query Re-Identification Key
                </button>

                <div id="vaultResultBox" style="display: none; margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                    <!-- Result populated by JS -->
                </div>
            </div>
            <div class="deid-modal-footer">
                <button class="btn-deid-secondary" style="color: #475569; border-color: #cbd5e1;" id="btnCloseVaultFooter">Close</button>
            </div>
        </div>
    </div>

    <!-- Modal 3: Safe Harbor Compliance Attestation Certificate Modal -->
    <div id="modalAttestation" class="deid-modal-overlay" style="display: none;">
        <div class="deid-modal-card" style="max-width: 760px;">
            <div class="deid-modal-header">
                <h3>
                    <span>📜</span>
                    Safe Harbor Compliance Attestation Certificate
                </h3>
                <button class="deid-modal-close" id="btnCloseAttestationModal">&times;</button>
            </div>
            <div class="deid-modal-body" id="attestationModalContent">
                <!-- Populated by JS -->
            </div>
            <div class="deid-modal-footer">
                <button class="btn-deid-secondary" style="color: #475569; border-color: #cbd5e1;" id="btnCloseAttestationFooter">Close</button>
                <button class="btn-deid-primary" id="btnPrintAttestationCertificate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Official Certificate
                </button>
            </div>
        </div>
    </div>
</div>
`;
}

SafeHarborView.render = SafeHarborView;
