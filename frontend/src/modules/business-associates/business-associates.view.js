export function BusinessAssociatesView() {
    return `
    <div class="baa-container">
        <style>
            .baa-container {
                padding: 24px;
                background: #f8fafc;
                min-height: calc(100vh - 100px);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #1e293b;
            }

            /* Header */
            .baa-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 16px;
                background: #ffffff;
                padding: 20px 24px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }

            .baa-title-area {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .baa-title-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .baa-title {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .baa-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .baa-badge-red {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }

            .baa-badge-green {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .baa-badge-amber {
                background: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
            }

            .baa-badge-blue {
                background: #dbeafe;
                color: #1d4ed8;
                border: 1px solid #bfdbfe;
            }

            .baa-subtitle {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }

            .baa-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            /* Buttons */
            .baa-btn-primary {
                background: #2563eb;
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
                box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
            }

            .baa-btn-primary:hover {
                background: #1d4ed8;
            }

            .baa-btn-secondary {
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

            .baa-btn-secondary:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }

            .baa-btn-sm {
                padding: 4px 10px;
                font-size: 12px;
                border-radius: 5px;
            }

            /* Audit Alert Banner */
            .baa-alert-banner {
                background: #fff1f2;
                border: 1px solid #fecdd3;
                border-left: 5px solid #e11d48;
                border-radius: 8px;
                padding: 14px 18px;
                margin-bottom: 20px;
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }

            .baa-alert-text {
                font-size: 13px;
                color: #9f1239;
                line-height: 1.5;
            }

            /* KPI Cards */
            .baa-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .baa-kpi-card {
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

            .baa-kpi-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
            }

            .kpi-total::before { background: #3b82f6; }
            .kpi-active::before { background: #10b981; }
            .kpi-expiring::before { background: #f59e0b; }
            .kpi-expired::before { background: #ef4444; }
            .kpi-missing::before { background: #dc2626; }
            .kpi-sub::before { background: #8b5cf6; }

            .baa-kpi-label {
                font-size: 11.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                margin-bottom: 6px;
            }

            .baa-kpi-val {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1;
            }

            .baa-kpi-sub {
                font-size: 11.5px;
                color: #94a3b8;
                margin-top: 6px;
            }

            /* Filter Bar */
            .baa-filter-bar {
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

            .baa-filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                flex: 1;
            }

            .baa-search {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                min-width: 260px;
                outline: none;
            }

            .baa-search:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
            }

            .baa-select {
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                background: #ffffff;
                outline: none;
                cursor: pointer;
            }

            /* Table */
            .baa-table-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                overflow: hidden;
            }

            .baa-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .baa-table th {
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

            .baa-table td {
                padding: 12px 14px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }

            .baa-table tr:hover td {
                background: #fafafa;
            }

            .status-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }

            .status-active {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .status-expiring {
                background: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
            }

            .status-expired {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }

            .status-missing {
                background: #fee2e2;
                color: #dc2626;
                border: 1px solid #f87171;
                font-weight: 800;
                animation: pulseBaa 2s infinite;
            }

            @keyframes pulseBaa {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            /* Modals */
            .baa-modal-overlay {
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

            .baa-modal {
                background: #ffffff;
                border-radius: 12px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }

            .baa-modal-header {
                padding: 18px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #f8fafc;
            }

            .baa-modal-title {
                font-size: 17px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .baa-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #64748b;
                line-height: 1;
                padding: 4px;
            }

            .baa-modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .baa-modal-footer {
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
                border-color: #2563eb;
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
            }

            /* Print Dossier Styling */
            @media print {
                body * {
                    visibility: hidden;
                }
                #baaDossierPrintArea, #baaDossierPrintArea * {
                    visibility: visible;
                }
                #baaDossierPrintArea {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 40px;
                    background: white;
                    color: black;
                }
            }

            /* Dark Theme Support */
            :root[data-theme="dark"] .baa-container {
                background: #0f172a;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .baa-header,
            :root[data-theme="dark"] .baa-kpi-card,
            :root[data-theme="dark"] .baa-filter-bar,
            :root[data-theme="dark"] .baa-table-card,
            :root[data-theme="dark"] .baa-modal {
                background: #1e293b;
                border-color: #334155;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .baa-title,
            :root[data-theme="dark"] .baa-kpi-val,
            :root[data-theme="dark"] .baa-modal-title,
            :root[data-theme="dark"] .form-label {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .baa-table th,
            :root[data-theme="dark"] .baa-modal-header,
            :root[data-theme="dark"] .baa-modal-footer {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .baa-table td {
                border-color: #334155;
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .baa-table tr:hover td {
                background: #243044;
            }
            :root[data-theme="dark"] .form-input,
            :root[data-theme="dark"] .form-textarea,
            :root[data-theme="dark"] .form-select,
            :root[data-theme="dark"] .baa-search {
                background: #0f172a;
                border-color: #334155;
                color: #e2e8f0;
            }
        </style>

        <!-- Header -->
        <div class="baa-header">
            <div class="baa-title-area">
                <div class="baa-title-row">
                    <h1 class="baa-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Business Associate Agreement (BAA) &amp; Vendor Governance
                    </h1>
                    <span class="baa-badge baa-badge-blue">45 CFR § 164.502(e)</span>
                    <span class="baa-badge baa-badge-green">§ 164.504(e)</span>
                    <span class="baa-badge baa-badge-red">§ 164.308(b)(1)</span>
                </div>
                <p class="baa-subtitle">
                    Centralized vendor registry, executed BAA tracking, expiration schedules, subcontractor warranties, and OCR audit dossiers.
                </p>
            </div>
            <div class="baa-header-actions">
                <button type="button" class="baa-btn-secondary" id="btnExportBaaCsv">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Export CSV</span>
                </button>
                <button type="button" class="baa-btn-primary" id="btnNewVendor">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Register New Vendor</span>
                </button>
            </div>
        </div>

        <!-- Critical Audit Alert Banner (Populated Dynamically) -->
        <div class="baa-alert-banner" id="baaAuditAlertBanner">
            <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <div class="baa-alert-text" id="baaAlertText">
                    <strong>CRITICAL HIPAA AUDIT ALERT:</strong> One or more vendors handling ePHI lack an active or executed Business Associate Agreement.
                </div>
            </div>
            <button type="button" class="baa-btn-secondary baa-btn-sm" id="btnFilterAlertVendors" style="color: #9f1239; border-color: #fda4af;">
                View High-Risk Vendors
            </button>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="baa-kpi-grid">
            <div class="baa-kpi-card kpi-total">
                <div class="baa-kpi-label">Total BAA Vendors</div>
                <div class="baa-kpi-val" id="kpiTotalVendors">—</div>
                <div class="baa-kpi-sub">Third-party associates</div>
            </div>
            <div class="baa-kpi-card kpi-active">
                <div class="baa-kpi-label">Active Compliant BAAs</div>
                <div class="baa-kpi-val" id="kpiActiveBaas" style="color: #10b981;">—</div>
                <div class="baa-kpi-sub">Signed &amp; fully verified</div>
            </div>
            <div class="baa-kpi-card kpi-expiring">
                <div class="baa-kpi-label">Expiring Soon (&le;60d)</div>
                <div class="baa-kpi-val" id="kpiExpiringSoon" style="color: #f59e0b;">—</div>
                <div class="baa-kpi-sub">Renewal review required</div>
            </div>
            <div class="baa-kpi-card kpi-expired">
                <div class="baa-kpi-label">Expired BAAs</div>
                <div class="baa-kpi-val" id="kpiExpiredBaas" style="color: #ef4444;">—</div>
                <div class="baa-kpi-sub">Overdue agreements</div>
            </div>
            <div class="baa-kpi-card kpi-missing">
                <div class="baa-kpi-label">Missing BAAs</div>
                <div class="baa-kpi-val" id="kpiMissingBaas" style="color: #dc2626;">—</div>
                <div class="baa-kpi-sub">CRITICAL Audit Gap</div>
            </div>
            <div class="baa-kpi-card kpi-sub">
                <div class="baa-kpi-label">Subcontractors Tracked</div>
                <div class="baa-kpi-val" id="kpiSubcontractors" style="color: #8b5cf6;">—</div>
                <div class="baa-kpi-sub">Downstream PHI vendors</div>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="baa-filter-bar">
            <div class="baa-filter-group">
                <input type="text" class="baa-search" id="inputBaaSearch" placeholder="Search vendor name, service, PHI data, contact...">
                <select class="baa-select" id="selectBaaCategory">
                    <option value="">All Categories</option>
                    <option value="cloud_hosting">Cloud Hosting &amp; Infrastructure</option>
                    <option value="communications">Communications &amp; SMS Gateway</option>
                    <option value="email_relay">Email Relay</option>
                    <option value="laboratory_interface">Laboratory Interface / Diagnostic</option>
                    <option value="billing_clearinghouse">Billing Clearinghouse / EDI</option>
                    <option value="transcription_ai">Medical Transcription / AI</option>
                    <option value="it_managed_services">IT Managed Services / Security</option>
                    <option value="document_destruction">Document Destruction / Shredding</option>
                    <option value="legal_audit_consulting">Legal, Audit &amp; Compliance</option>
                    <option value="other">Other Vendor</option>
                </select>
                <select class="baa-select" id="selectBaaStatus">
                    <option value="">All Compliance Statuses</option>
                    <option value="active">Active Compliant</option>
                    <option value="expiring_soon">Expiring Soon (&le;60 Days)</option>
                    <option value="expired">Expired</option>
                    <option value="missing_baa">Missing BAA (Critical Gap)</option>
                </select>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="checkFilterSubcontractor">
                    <span>Subcontractors Only</span>
                </label>
            </div>
            <div>
                <button type="button" class="baa-btn-secondary baa-btn-sm" id="btnRefreshBaa">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        <!-- Master BAA Table -->
        <div class="baa-table-card">
            <table class="baa-table" id="baaTable">
                <thead>
                    <tr>
                        <th>Vendor Name &amp; Category</th>
                        <th>Services &amp; PHI Handled</th>
                        <th>Primary Contact</th>
                        <th>BAA Execution &amp; Expiration</th>
                        <th>Compliance Status</th>
                        <th>Safeguards &amp; SLA</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="baaTableBody">
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 32px; color: #94a3b8;">
                            Loading Business Associate registry...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- MODAL: Vendor Intake & Edit -->
        <div class="baa-modal-overlay" id="modalBaaIntake">
            <div class="baa-modal">
                <div class="baa-modal-header">
                    <h3 class="baa-modal-title" id="intakeModalTitle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        Register Business Associate Vendor (§ 164.502(e))
                    </h3>
                    <button type="button" class="baa-modal-close" id="btnCloseIntakeModal">&times;</button>
                </div>
                <div class="baa-modal-body">
                    <form id="formBaaIntake">
                        <input type="hidden" id="editVendorId" value="">

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Vendor Legal Name *</label>
                                <input type="text" class="form-input" id="inputVendorName" placeholder="e.g. Amazon Web Services Inc." required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Vendor Category *</label>
                                <select class="form-select" id="selectVendorCategory" required>
                                    <option value="cloud_hosting">Cloud Hosting &amp; Infrastructure</option>
                                    <option value="communications">Communications &amp; SMS Gateway</option>
                                    <option value="email_relay">Email Relay</option>
                                    <option value="laboratory_interface">Laboratory Interface / Diagnostic</option>
                                    <option value="billing_clearinghouse">Billing Clearinghouse / EDI</option>
                                    <option value="transcription_ai">Medical Transcription / AI</option>
                                    <option value="it_managed_services">IT Managed Services / Security</option>
                                    <option value="document_destruction">Document Destruction / Shredding</option>
                                    <option value="legal_audit_consulting">Legal, Audit &amp; Compliance</option>
                                    <option value="other">Other Vendor</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Service Description *</label>
                            <textarea class="form-textarea" id="textareaServiceDesc" placeholder="Describe the specific services, cloud systems, or operations provided by this vendor..." required></textarea>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">PHI Data Types Handled *</label>
                            <input type="text" class="form-input" id="inputPhiTypes" placeholder="e.g. Demographics, Clinical Records, Lab Orders, Billing Balances" required>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Primary Contact Person</label>
                                <input type="text" class="form-input" id="inputContactName" placeholder="e.g. Jane Doe (Account Exec)">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Primary Contact Email</label>
                                <input type="email" class="form-input" id="inputContactEmail" placeholder="privacy@vendor.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Primary Contact Phone</label>
                                <input type="text" class="form-input" id="inputContactPhone" placeholder="1-800-555-0199">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Vendor Corporate Address</label>
                                <input type="text" class="form-input" id="inputVendorAddress" placeholder="City, State, Zip">
                            </div>
                        </div>

                        <!-- BAA Execution & Compliance Dates -->
                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                                <span>Contractual BAA Execution Status</span>
                                <label style="display: flex; align-items: center; gap: 8px; font-weight: 700; cursor: pointer; color: #2563eb;">
                                    <input type="checkbox" id="checkHasSignedBaa" style="width: 16px; height: 16px;">
                                    <span>Signed BAA on File (§ 164.504(e))</span>
                                </label>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">BAA Execution Date</label>
                                    <input type="date" class="form-input" id="inputBaaExecDate">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">BAA Expiration Date (Renewal)</label>
                                    <input type="date" class="form-input" id="inputBaaExpDate">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Compliance Audit Date</label>
                                    <input type="date" class="form-input" id="inputAuditDate">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Next Scheduled Review</label>
                                    <input type="date" class="form-input" id="inputReviewDate">
                                </div>
                            </div>
                            <div class="form-group full-width" style="margin-bottom: 0;">
                                <label class="form-label">BAA Document Reference / Filename</label>
                                <input type="text" class="form-input" id="inputDocFilename" placeholder="e.g. AWS_HIPAA_Business_Associate_Addendum_2026.pdf">
                            </div>
                        </div>

                        <!-- Warranties & SLA -->
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Breach Notification SLA (Hours) *</label>
                                <input type="number" class="form-input" id="inputSlaHours" value="72" min="1" max="720" required>
                                <small style="font-size: 11px; color: #64748b;">Contractual deadline for vendor to notify CE of a security incident.</small>
                            </div>
                            <div class="form-group" style="display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    <input type="checkbox" id="checkSubcontractor">
                                    <span>Subcontractors Access ePHI (§ 164.504(e)(2)(ii)(D))</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                                    <input type="checkbox" id="checkSoc2">
                                    <span>SOC2 Type II / HITRUST Certified</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Compliance Notes</label>
                            <textarea class="form-textarea" id="textareaNotes" placeholder="Additional audit notes, risk assessments, or contract stipulations..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="baa-modal-footer">
                    <button type="button" class="baa-btn-secondary" id="btnCancelIntake">Cancel</button>
                    <button type="button" class="baa-btn-primary" id="btnSaveVendor">Save Vendor Record</button>
                </div>
            </div>
        </div>

        <!-- MODAL: Vendor BAA Compliance Dossier / OCR Question #1 Audit Pack -->
        <div class="baa-modal-overlay" id="modalBaaDossier">
            <div class="baa-modal" style="max-width: 850px;">
                <div class="baa-modal-header">
                    <h3 class="baa-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        Business Associate Compliance Dossier (45 CFR § 164.502(e))
                    </h3>
                    <button type="button" class="baa-modal-close" id="btnCloseDossierModal">&times;</button>
                </div>
                <div class="baa-modal-body">
                    <div id="baaDossierPrintArea">
                        <!-- Populated dynamically -->
                    </div>
                </div>
                <div class="baa-modal-footer">
                    <button type="button" class="baa-btn-secondary" id="btnPrintDossier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        <span>Print Compliance Dossier</span>
                    </button>
                    <button type="button" class="baa-btn-secondary" id="btnCloseDossier">Close</button>
                </div>
            </div>
        </div>

    </div>
    `;
}
