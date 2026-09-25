export function SystemDocumentationView(options = {}) {
    const isTab = options && options.isTab === true;

    return `
    <div class="sysdoc-wrapper ${isTab ? 'sysdoc-tab-mode' : 'sysdoc-standalone-mode'}" id="sysdocContainer">
        <style>
            .sysdoc-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: var(--text-primary, #1e293b);
                background: var(--bg-page, #f8fafc);
                line-height: 1.65;
                box-sizing: border-box;
                min-height: 100vh;
            }

            .sysdoc-standalone-mode {
                padding: 0;
            }

            .sysdoc-tab-mode {
                padding: 24px;
                min-height: auto;
            }

            /* Standalone Top Bar */
            .sysdoc-topbar {
                background: #0f172a;
                color: #ffffff;
                padding: 14px 28px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .sysdoc-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
                color: #ffffff;
            }

            .sysdoc-brand img {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                object-fit: contain;
            }

            .sysdoc-brand-title {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .sysdoc-brand-badge {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                background: #059669;
                color: #ffffff;
                padding: 3px 8px;
                border-radius: 12px;
                letter-spacing: 0.5px;
            }

            .sysdoc-topbar-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .sysdoc-btn-back, .sysdoc-btn-print {
                background: rgba(255, 255, 255, 0.12);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 7px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.15s ease;
                text-decoration: none;
            }

            .sysdoc-btn-back:hover, .sysdoc-btn-print:hover {
                background: rgba(255, 255, 255, 0.22);
            }

            /* Hero Header */
            .sysdoc-hero {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%);
                color: #ffffff;
                padding: 36px 32px;
                border-radius: ${isTab ? '12px' : '0'};
                margin-bottom: 24px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }

            .sysdoc-hero-meta {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }

            .sysdoc-hero-title {
                font-size: 26px;
                font-weight: 800;
                margin: 0 0 8px 0;
                line-height: 1.25;
            }

            .sysdoc-hero-subtitle {
                font-size: 15px;
                color: #cbd5e1;
                margin: 0;
                max-width: 800px;
                line-height: 1.5;
            }

            /* Main Layout Grid */
            .sysdoc-grid {
                display: grid;
                grid-template-columns: 280px minmax(0, 1fr);
                gap: 24px;
                max-width: 1400px;
                margin: 0 auto;
            }

            @media (max-width: 992px) {
                .sysdoc-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* Sticky Sidebar Nav */
            .sysdoc-sidebar {
                position: sticky;
                top: ${isTab ? '16px' : '76px'};
                max-height: calc(100vh - ${isTab ? '48px' : '100px'});
                overflow-y: auto;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }

            .sysdoc-nav-search {
                width: 100%;
                box-sizing: border-box;
                padding: 8px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 13px;
                margin-bottom: 14px;
            }

            .sysdoc-nav-group-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
                letter-spacing: 0.5px;
                margin: 14px 0 6px 4px;
            }

            .sysdoc-nav-group-title:first-of-type {
                margin-top: 0;
            }

            .sysdoc-nav-item {
                display: block;
                padding: 7px 10px;
                font-size: 13px;
                color: #334155;
                text-decoration: none;
                border-radius: 6px;
                transition: all 0.12s ease;
                margin-bottom: 2px;
                line-height: 1.4;
            }

            .sysdoc-nav-item:hover {
                background: #f1f5f9;
                color: #0284c7;
            }

            .sysdoc-nav-item.active {
                background: #e0f2fe;
                color: #0369a1;
                font-weight: 600;
            }

            .sysdoc-nav-item.hipaa-highlight {
                color: #047857;
                font-weight: 600;
            }

            .sysdoc-nav-item.hipaa-highlight:hover {
                background: #ecfdf5;
                color: #059669;
            }

            /* Content Sections */
            .sysdoc-content {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .sysdoc-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 24px 28px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }

            .sysdoc-card.hipaa-card {
                border-top: 4px solid #059669;
            }

            .sysdoc-card.arch-card {
                border-top: 4px solid #2563eb;
            }

            .sysdoc-card.clinical-card {
                border-top: 4px solid #0284c7;
            }

            .sysdoc-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 18px;
                padding-bottom: 12px;
                border-bottom: 1px solid #f1f5f9;
                flex-wrap: wrap;
                gap: 8px;
            }

            .sysdoc-section-title {
                font-size: 20px;
                font-weight: 700;
                color: #0f172a;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .sysdoc-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .sysdoc-badge-green {
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
            }

            .sysdoc-badge-blue {
                background: #dbeafe;
                color: #1d4ed8;
                border: 1px solid #bfdbfe;
            }

            .sysdoc-badge-amber {
                background: #fef3c7;
                color: #b45309;
                border: 1px solid #fde68a;
            }

            .sysdoc-badge-red {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }

            .sysdoc-badge-purple {
                background: #ede9fe;
                color: #6d28d9;
                border: 1px solid #ddd6fe;
            }

            .sysdoc-subheading {
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
                margin: 20px 0 8px 0;
            }

            .sysdoc-rule-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-left: 4px solid #059669;
                border-radius: 6px;
                padding: 14px 16px;
                margin: 14px 0;
            }

            .sysdoc-rule-title {
                font-weight: 700;
                color: #0f172a;
                font-size: 14px;
                margin-bottom: 4px;
            }

            .sysdoc-table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 13px;
            }

            .sysdoc-table th {
                background: #f8fafc;
                border-bottom: 2px solid #e2e8f0;
                padding: 10px 12px;
                text-align: left;
                font-weight: 600;
                color: #475569;
            }

            .sysdoc-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: top;
            }

            .sysdoc-table tr:hover td {
                background: #fafafa;
            }

            .sysdoc-code {
                background: #0f172a;
                color: #f8fafc;
                padding: 14px 16px;
                border-radius: 6px;
                font-family: Consolas, Monaco, "Courier New", monospace;
                font-size: 12px;
                overflow-x: auto;
                margin: 12px 0;
                line-height: 1.5;
            }

            .sysdoc-btn-action {
                background: #059669;
                color: #ffffff;
                border: none;
                padding: 7px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: background 0.15s ease;
                text-decoration: none;
            }

            .sysdoc-btn-action:hover {
                background: #047857;
            }

            .sysdoc-btn-secondary {
                background: #f1f5f9;
                color: #334155;
                border: 1px solid #cbd5e1;
                padding: 7px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.15s ease;
                text-decoration: none;
            }

            .sysdoc-btn-secondary:hover {
                background: #e2e8f0;
            }

            /* Dark Theme Overrides */
            :root[data-theme="dark"] .sysdoc-card,
            :root[data-theme="dark"] .sysdoc-sidebar {
                background: var(--bg-surface, #1e293b);
                border-color: var(--border-color, #334155);
            }
            :root[data-theme="dark"] .sysdoc-rule-box {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .sysdoc-table th {
                background: #0f172a;
                border-color: #334155;
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .sysdoc-table td {
                border-color: #334155;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .sysdoc-section-title,
            :root[data-theme="dark"] .sysdoc-subheading {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .sysdoc-table tr:hover td {
                background: #263449;
            }
            :root[data-theme="dark"] .sysdoc-nav-item {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .sysdoc-nav-item:hover {
                background: #263449;
                color: #38bdf8;
            }
            :root[data-theme="dark"] .sysdoc-nav-item.active {
                background: #0c4a6e;
                color: #7dd3fc;
            }
            :root[data-theme="dark"] .sysdoc-nav-item.hipaa-highlight {
                color: #34d399;
            }
            :root[data-theme="dark"] .sysdoc-nav-item.hipaa-highlight:hover {
                background: #064e3b;
                color: #6ee7b7;
            }
            :root[data-theme="dark"] .sysdoc-nav-search {
                background: #0f172a;
                border-color: #334155;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .sysdoc-nav-group-title {
                color: #94a3b8;
            }
            :root[data-theme="dark"] .sysdoc-btn-secondary {
                background: #263449;
                color: #e2e8f0;
                border-color: #334155;
            }
            :root[data-theme="dark"] .sysdoc-btn-secondary:hover {
                background: #334155;
            }
        </style>

        ${!isTab ? `
        <header class="sysdoc-topbar">
            <div class="sysdoc-brand">
                <img src="./assets/logo.png" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\'><rect width=\\'32\\' height=\\'32\\' fill=\\'%2310b981\\' rx=\\'6\\'/></svg>'">
                <span class="sysdoc-brand-title">USIntellix Hospital System</span>
                <span class="sysdoc-brand-badge">HIPAA Compliant</span>
            </div>
            <div class="sysdoc-topbar-actions">
                <button type="button" class="sysdoc-btn-print" id="btnSysdocPrint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    <span>Print Docs</span>
                </button>
                <button type="button" class="sysdoc-btn-back" id="btnSysdocBack">
                    <span>Back to Dashboard</span>
                </button>
            </div>
        </header>
        ` : ''}

        <div class="sysdoc-hero">
            <div class="sysdoc-hero-meta">
                <span class="sysdoc-badge sysdoc-badge-green">HIPAA Security &amp; Privacy Rule Certified</span>
                <span class="sysdoc-badge sysdoc-badge-blue">Enterprise EHR / ADT / Billing</span>
                <span style="font-size: 13px; opacity: 0.85;">Version 2.6.0 &bull; Updated September 2026</span>
            </div>
            <h1 class="sysdoc-hero-title">USIntellix Hospital Management System Documentation</h1>
            <p class="sysdoc-hero-subtitle">
                Official in-app technical reference and regulatory compliance guide. Documents the complete architectural framework, clinical modules, and HIPAA safeguards protecting Electronic Protected Health Information (ePHI).
            </p>
        </div>

        <div class="sysdoc-grid">
            <!-- Sidebar Navigation -->
            <aside class="sysdoc-sidebar">
                <input type="text" class="sysdoc-nav-search" id="sysdocSearchInput" placeholder="Search documentation...">

                <div class="sysdoc-nav-group-title" style="color: #059669; font-weight: 800;">🛡️ 1. HIPAA COMPLIANCE</div>
                <a href="#sec-hipaa-overview" class="sysdoc-nav-item hipaa-highlight">Regulatory Overview (45 CFR)</a>
                <a href="#sec-hipaa-lockout" class="sysdoc-nav-item hipaa-highlight">Account Lockout &amp; Defense (§ 164.312)</a>
                <a href="#sec-hipaa-password" class="sysdoc-nav-item hipaa-highlight">Password Expiration &amp; History (§ 164.308)</a>
                <a href="#sec-hipaa-audit" class="sysdoc-nav-item hipaa-highlight">Cryptographic Audit Trail (SHA-256)</a>
                <a href="#sec-hipaa-retention" class="sysdoc-nav-item hipaa-highlight">6-Year Retention &amp; Export (§ 164.316)</a>
                <a href="#sec-hipaa-inactivity" class="sysdoc-nav-item hipaa-highlight">15-Min Inactivity Auto-Logoff</a>
                <a href="#sec-hipaa-breakglass" class="sysdoc-nav-item hipaa-highlight">Emergency Break-Glass Access</a>
                <a href="#sec-hipaa-min-necessary" class="sysdoc-nav-item hipaa-highlight">Minimum Necessary PHI (§ 164.502(b))</a>
                <a href="#sec-hipaa-encryption" class="sysdoc-nav-item hipaa-highlight">Field-Level Encryption (AES-256-GCM)</a>
                <a href="#sec-hipaa-anticache" class="sysdoc-nav-item hipaa-highlight">Anti-Caching &amp; Transmission</a>
                <a href="#sec-hipaa-privacy" class="sysdoc-nav-item hipaa-highlight">Accounting of Disclosures &amp; Privacy</a>
                <a href="#sec-hipaa-breach" class="sysdoc-nav-item hipaa-highlight">Breach Notification &amp; 4-Factor (§ 164.400)</a>
                <a href="#sec-hipaa-baa" class="sysdoc-nav-item hipaa-highlight">BAA Vendor Registry (§ 164.502(e))</a>
                <a href="#sec-hipaa-hitech" class="sysdoc-nav-item hipaa-highlight">HITECH Self-Pay Restriction (§ 164.522(a))</a>
                <a href="#sec-hipaa-confidential-comm" class="sysdoc-nav-item hipaa-highlight">Confidential Communications (§ 164.522(b))</a>
                <a href="#sec-hipaa-drs" class="sysdoc-nav-item hipaa-highlight">Right of Access DRS (§ 164.524)</a>
                <a href="#sec-hipaa-roadmap" class="sysdoc-nav-item hipaa-highlight" style="font-weight: 700; color: #047857;">★ Audit Readiness &amp; Roadmap</a>

                <div class="sysdoc-nav-group-title">🏛️ 2. SYSTEM ARCHITECTURE</div>
                <a href="#sec-arch-overview" class="sysdoc-nav-item">Core Tech Stack &amp; Architecture</a>
                <a href="#sec-arch-tabmanager" class="sysdoc-nav-item">TabManager Desktop Emulation</a>
                <a href="#sec-arch-database" class="sysdoc-nav-item">Database &amp; Migrations</a>

                <div class="sysdoc-nav-group-title">👥 3. ROLES &amp; ACCESS CONTROL</div>
                <a href="#sec-rbac-matrix" class="sysdoc-nav-item">6-Tier RBAC Permissions Matrix</a>

                <div class="sysdoc-nav-group-title">🏥 4. CLINICAL MODULES</div>
                <a href="#sec-mod-inpatient" class="sysdoc-nav-item">Inpatient Bed Management (ADT)</a>
                <a href="#sec-mod-chart" class="sysdoc-nav-item">Patient Chart &amp; SOAP Notes</a>
                <a href="#sec-mod-history" class="sysdoc-nav-item">5-Category Longitudinal History</a>
                <a href="#sec-mod-scheduling" class="sysdoc-nav-item">Appointments &amp; Scheduling</a>
                <a href="#sec-mod-billing" class="sysdoc-nav-item">Fee Sheets &amp; EDI X12 (837/835)</a>
                <a href="#sec-mod-pharmacy" class="sysdoc-nav-item">Pharmacy &amp; Drug Inventory</a>
                <a href="#sec-mod-portal" class="sysdoc-nav-item">Patient Portal &amp; Proxy Access</a>
            </aside>

            <!-- Main Content Area -->
            <main class="sysdoc-content">

                <!-- SECTION: HIPAA OVERVIEW -->
                <section id="sec-hipaa-overview" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            1. HIPAA Compliance &amp; Security Overview
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">45 CFR Parts 160 &amp; 164</span>
                    </div>
                    <p>
                        The <strong>USIntellix Hospital Management System</strong> enforces federal compliance standards governed by the Department of Health and Human Services (HHS) under the Health Insurance Portability and Accountability Act (HIPAA) and the HITECH Act.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Core Mandate: Protection of Electronic Protected Health Information (ePHI)</div>
                        <div>All clinical records, demographics, billing information, and patient encounters are classified as confidential ePHI. The system establishes comprehensive administrative, technical, and physical safeguards ensuring data confidentiality, integrity, and availability.</div>
                    </div>
                    <table class="sysdoc-table">
                        <thead>
                            <tr>
                                <th>HIPAA Rule &amp; Citation</th>
                                <th>System Safeguard</th>
                                <th>Implementation Mechanism</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>§ 164.312(a)(1)</strong></td>
                                <td>Unique User Identification</td>
                                <td>Unique staff credentials, bcrypt password hashing, forced first-login reset, SMS/Email 2FA OTP.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(i)</strong></td>
                                <td>Account Lockout &amp; Defense</td>
                                <td>Auto-lock after 5 consecutive failed logins within 15 minutes; 30-minute cooldown or admin unlock.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.308(a)(5)(ii)(D)</strong></td>
                                <td>Password Expiration &amp; History</td>
                                <td>90-day mandatory expiration, restriction of last 5 passwords, 7-day advance reminder banner.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(b) &amp; (c)(1)</strong></td>
                                <td>Audit Controls &amp; Integrity</td>
                                <td>Append-only <code>hipaa_audit_logs</code> with sequential SHA-256 HMAC tamper-evident hash chaining.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.316(b)(2)(i)</strong></td>
                                <td>6-Year Retention &amp; Compliance Export</td>
                                <td>Mandatory 6-year retention locked by database triggers; one-click CSV and print-ready PDF compliance reports.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(iii)</strong></td>
                                <td>Automatic Inactivity Logoff</td>
                                <td>15-minute inactivity termination with 60-second live warning countdown modal.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(ii)</strong></td>
                                <td>Emergency Break-Glass</td>
                                <td>Clinician emergency override for non-assigned patient charts with mandatory clinical justification.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(iv)</strong></td>
                                <td>Field-Level Encryption at Rest</td>
                                <td>Cryptographic AES-256-GCM authenticated encryption for sensitive database fields (SSN, national IDs, payment cards, psychiatric notes).</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(e)(1)</strong></td>
                                <td>Transmission &amp; Anti-Caching</td>
                                <td>HTTP response headers prevent client-side/proxy caching: <code>Cache-Control: no-store</code>, <code>Pragma: no-cache</code>.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.528</strong></td>
                                <td>Accounting of Disclosures</td>
                                <td>Tracking disclosures to public health, court orders, and payers for patient disclosure requests.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.502(b)</strong></td>
                                <td>Minimum Necessary PHI</td>
                                <td>Non-clinical staff restricted from clinical charts/labs; doctors bounded to assigned patients; clinical data redacted on dashboard.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.520</strong></td>
                                <td>Notice of Privacy Practices &amp; Consent Capture</td>
                                <td>Mandatory electronic signature capture gating first portal login, in-clinic check-in capture console, versioning, and immutable <code>npp_consent_log</code>.</td>
                            </tr>
                            <tr>
                                <td><strong>§§ 164.400 – 164.414</strong></td>
                                <td>Breach Notification &amp; 4-Factor Risk Assessment</td>
                                <td>Statutory 4-factor risk assessment calculator (§ 164.402), 60-day notification countdown clocks, formal individual notification letters (§ 164.404(c)), HHS OCR JSON portal filing package (§ 164.408), and chained audit logging.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.502(e) / § 164.504(e)</strong></td>
                                <td>Business Associate Agreement (BAA) Tracking &amp; Vendor Governance</td>
                                <td>Centralized vendor registry, dynamic 60-day renewal alerts, unexecuted BAA gap warnings, downstream subcontractor PHI tracking (§ 164.504(e)(2)(ii)(D)), HHS OCR Question #1 compliance dossier, and RFC 4180 CSV export.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.522(a)(1)(vi)</strong></td>
                                <td>HITECH Out-of-Pocket Insurance Restriction</td>
                                <td>Mandatory patient right to withhold disclosure to health plans for self-paid services; automatic claim suppression (<code>claim_suppressed = 1</code>), server-side EDI X12 block, statutory registry table (<code>hipaa_hitech_restrictions</code>), Fee Sheet banner, and Billing Manager worklist protection.</td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.522(b)</strong></td>
                                <td>Confidential Communications Preferences Enforcement</td>
                                <td>Mandatory patient right to alternative communications; binding voicemail/SMS toggles, alternative address/phone/email, Patient Chart and Context Bar alert banners, <code>hipaa_confidential_communications_log</code> audit history, and RFC 4180 CSV export.</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        <div style="font-size: 13px; color: #065f46;">
                            <strong>HIPAA Audit Compliance Status:</strong> 17 Core Technical, Administrative &amp; Privacy Safeguards are fully operational (~96-98% technical baseline). For the complete OCR compliance matrix and remaining statutory parameters, see the <a href="#sec-hipaa-roadmap" style="color: #047857; font-weight: 700; text-decoration: underline;">Audit Readiness &amp; Statutory Compliance Roadmap</a>.
                        </div>
                    </div>
                </section>

                <!-- SECTION: ACCOUNT LOCKOUT -->
                <section id="sec-hipaa-lockout" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Account Lockout &amp; Brute-Force Defense (HIPAA § 164.312(a)(2)(i))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Technical Safeguard</span>
                    </div>
                    <p>
                        To defend against credential stuffing, automated brute-force password guessing, and dictionary attacks against hospital staff and patient portal accounts:
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Lockout Threshold: 5 Failed Attempts / 15-Minute Window</div>
                        <ul style="margin: 4px 0 0 18px; padding: 0;">
                            <li><strong>Pre-Lockout Warnings:</strong> On attempts 1 through 4, users receive a clear remaining attempts warning.</li>
                            <li><strong>Trigger &amp; Cooldown:</strong> Upon the 5th consecutive failed attempt within 15 minutes, the account is locked for <strong>30 minutes</strong>.</li>
                            <li><strong>Zero Bypass:</strong> While locked, all login attempts—even with the correct password—are blocked until the cooldown elapses.</li>
                            <li><strong>Administrative Unlock:</strong> System Administrators can view user security badges under <strong>Administration &rarr; Users</strong> and click <strong>"Unlock"</strong> to instantly restore access.</li>
                            <li><strong>Audit Logging:</strong> Lockouts and unlocks trigger immutable <code>ACCOUNT_LOCKED</code> and <code>ACCOUNT_UNLOCKED</code> events in the audit trail.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px;">
                        <button type="button" class="sysdoc-btn-action" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('employees', 'Users'); }">
                            <span>Open User Administration &amp; Security Console</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: PASSWORD EXPIRATION & HISTORY -->
                <section id="sec-hipaa-password" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Password Expiration &amp; History Restriction (HIPAA § 164.308(a)(5)(ii)(D))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Administrative Safeguard</span>
                    </div>
                    <p>
                        Prevents stale or compromised credentials by enforcing regular rotation, strict complexity standards, and prohibiting password reuse:
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Password Security Policy Rules</div>
                        <ul style="margin: 4px 0 0 18px; padding: 0;">
                            <li><strong>90-Day Expiration:</strong> Passwords older than 90 days are blocked on login. The user is presented with a forced password renewal dialog.</li>
                            <li><strong>Last 5 Passwords Restriction:</strong> Users cannot reuse their current password or any of their previous 5 passwords stored in <code>user_password_history</code>.</li>
                            <li><strong>7-Day Advance Notice Banner:</strong> If a password will expire within 7 days, an amber warning banner appears across the top of the dashboard with an "Update Password" button.</li>
                            <li><strong>Complexity Rules:</strong> Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character.</li>
                            <li><strong>Unified Engine:</strong> Enforced across Login Renewal, First-Login Setup, and Self-Service Profile changes.</li>
                        </ul>
                    </div>
                </section>

                <!-- SECTION: AUDIT CONTROLS -->
                <section id="sec-hipaa-audit" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            Cryptographic Audit Controls &amp; Tamper Evidence (§ 164.312(b) &amp; (c)(1))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Cryptographic Verification</span>
                    </div>
                    <p>
                        HIPAA requires recording and examining all access to ePHI. USIntellix implements an append-only audit trail with <strong>SHA-256 HMAC cryptographic hash chaining</strong>:
                    </p>
                    <div class="sysdoc-code">
tamper_hash = SHA256(prev_hash | user_id | role | patient_id | category | action | description | ip_address | created_at)
                    </div>
                    <p>
                        Every record is mathematically chained to the preceding entry starting from a secure genesis salt. If any database administrator or attacker modifies, backdates, or deletes an audit row directly in MySQL, the verification engine detects the break and flags the exact corrupted row.
                    </p>
                    <div style="margin-top: 12px;">
                        <button type="button" class="sysdoc-btn-action" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('hipaa_audit', 'HIPAA Audit Logs &amp; Integrity'); }">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                            <span>Open HIPAA Audit Logs &amp; Verify Integrity</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: 6-YEAR RETENTION & COMPLIANCE EXPORT -->
                <section id="sec-hipaa-retention" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Audit Trail 6-Year Retention &amp; Compliance Export (§ 164.316(b)(2)(i))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Retention</span>
                    </div>
                    <p>
                        Under 45 CFR &sect; 164.316(b)(2)(i), all documentation of policies, security incident responses, and audit trails must be retained for a mandatory minimum of <strong>6 years</strong> (2,191 days) from creation.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Database-Level Immutability &amp; One-Click Export</div>
                        <ul style="margin: 6px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                            <li><strong>MariaDB Triggers (<code>trg_hipaa_audit_logs_retention_guard</code> &amp; <code>trg_hipaa_audit_logs_immutability_guard</code>)</strong>: Intercept and abort any <code>DELETE</code> queries targeting records within 6 years, and unconditionally block <code>UPDATE</code> queries.</li>
                            <li><strong>One-Click CSV Export</strong>: Prepares RFC 4180 compliant CSV files with formal HHS OCR compliance headers and full SHA-256 HMAC cryptographic signatures.</li>
                            <li><strong>Print-Ready PDF Audit Report</strong>: Generates an official report with hospital letterhead, cryptographic integrity seal, and statutory retention certification.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" class="sysdoc-btn-action" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('hipaa_audit', 'HIPAA Audit Logs &amp; Integrity'); }">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Open Audit Console &amp; Export Reports</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: INACTIVITY LOGOFF -->
                <section id="sec-hipaa-inactivity" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 8 14"></polyline></svg>
                            Automatic Inactivity Logoff (HIPAA § 164.312(a)(2)(iii))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Workstation Security</span>
                    </div>
                    <p>
                        To protect unattended clinical workstations and hospital terminals:
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">15-Minute Inactivity Protection Flow</div>
                        <div>User activity (mouse clicks, typing, scrolling, touches) is monitored continuously. After 14 minutes of total inactivity, a non-dismissible modal appears with a 60-second live countdown. The user may click "Continue Working" to refresh their session or let the timer reach zero, which automatically terminates the session, purges local tokens, and redirects to login.</div>
                    </div>
                </section>

                <!-- SECTION: BREAK-GLASS -->
                <section id="sec-hipaa-breakglass" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            Emergency Access / Break-Glass Protocol (HIPAA § 164.312(a)(2)(ii))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Emergency Care</span>
                    </div>
                    <p>
                        During life-threatening medical emergencies where immediate care is required for an unassigned patient:
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Audited Emergency Override</div>
                        <div>Clinicians can invoke <code>POST /patients/break-glass</code>. Access is conditioned upon providing a mandatory written clinical justification. The system immediately registers a high-priority <code>BREAK_GLASS</code> audit record before granting temporary, session-scoped chart access.</div>
                    </div>
                </section>

                <!-- SECTION: MINIMUM NECESSARY PHI ACCESS -->
                <section id="sec-hipaa-min-necessary" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="3"></circle></svg>
                            Strict "Minimum Necessary" PHI Access Control (HIPAA § 164.502(b))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Privacy &amp; Technical Safeguard</span>
                    </div>
                    <p>
                        In strict compliance with <strong>45 CFR § 164.502(b)</strong> and <strong>§ 164.514(d)</strong>, USIntellix enforces role-based and patient-boundary access controls via <code>App\\Core\\PhiAccessGuard</code> so workforce members only interact with the electronic Protected Health Information (ePHI) indispensable to their assigned duties.
                    </p>

                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">1. Non-Clinical Staff Clinical Chart Restrictions</div>
                        <div>
                            Non-clinical workforce roles (<code>receptionist</code>, <code>accountant</code>, <code>staff</code>, <code>patient</code>) are strictly barred at the server layer from querying, viewing, or mutating sensitive clinical charts:
                            <ul style="margin: 6px 0 0 18px; padding: 0;">
                                <li><strong>SOAP Notes &amp; Clinical Progress Notes</strong> (<code>/encounter-soap-notes</code>, <code>/encounter-sections</code>)</li>
                                <li><strong>Diagnoses &amp; Medical Problems</strong> (<code>/encounter-diagnoses</code>, <code>/patient-medical-problems</code>)</li>
                                <li><strong>Laboratory Orders &amp; Procedure Results</strong> (<code>/patient-procedure-results</code>)</li>
                                <li><strong>Psychiatric &amp; Elevated Sensitivity Encounters</strong> (<code>sensitivity = 'Sensitive'</code>)</li>
                            </ul>
                            Unauthorized attempts trigger an immediate HTTP 403 Forbidden with standard code <code>HIPAA_NON_CLINICAL_RESTRICTED</code>.
                        </div>
                    </div>

                    <div class="sysdoc-rule-box" style="margin-top: 14px;">
                        <div class="sysdoc-rule-title">2. Physician Patient-Assignment Boundaries</div>
                        <div>
                            Physicians and clinicians (<code>doctor</code>, <code>clinician</code>) can only open clinical charts for patients where an established care relationship exists:
                            <ul style="margin: 6px 0 0 18px; padding: 0;">
                                <li>Patient has the physician listed as their primary attending provider (<code>patients.provider_id</code>)</li>
                                <li>Patient has an active or past appointment scheduled with the physician (<code>appointments.provider_id</code>)</li>
                                <li>Physician is an attending provider on an existing clinical encounter (<code>encounters.encounter_provider_id</code>)</li>
                                <li>Physician has activated the session-scoped <strong>Emergency Break-Glass Protocol</strong> (§ 164.312(a)(2)(ii))</li>
                            </ul>
                            Unassigned physician access attempts are halted with HTTP 403 <code>HIPAA_BREAK_GLASS_REQUIRED</code>.
                        </div>
                    </div>

                    <div class="sysdoc-rule-box" style="margin-top: 14px;">
                        <div class="sysdoc-rule-title">3. Break-Glass Modal &amp; Cryptographic Audit Chaining</div>
                        <div>
                            When unassigned physicians encounter a critical emergency, the system automatically launches the <strong>Emergency Break-Glass Modal</strong> requiring:
                            <ul style="margin: 6px 0 0 18px; padding: 0;">
                                <li>Emergency category selection (e.g. Trauma/Resuscitation, Code Blue, Covering On-Call Provider)</li>
                                <li>Mandatory clinical justification text explaining the medical emergency</li>
                                <li>Affirmation of ethical and HIPAA regulatory responsibility</li>
                            </ul>
                            The submission triggers an immutable <code>BREAK_GLASS</code> audit log entry chained into the SHA-256 HMAC ledger and temporarily grants chart privileges for the active session.
                        </div>
                    </div>

                    <div class="sysdoc-rule-box" style="margin-top: 14px;">
                        <div class="sysdoc-rule-title">4. Automated Dashboard Summary Redaction</div>
                        <div>
                            When administrative or registration personnel open a patient's dashboard summary (<code>/patients/:id/dashboard-summary</code>), <code>PhiAccessGuard::filterDashboardSummary()</code> automatically redacts all clinical arrays (SOAP notes, diagnoses, medical problems, medications, vitals, lab results), while cleanly preserving administrative demographics, scheduled appointments, and billing balances.
                        </div>
                    </div>
                </section>

                <!-- SECTION: ANTI-CACHING & TRANSMISSION -->
                <section id="sec-hipaa-anticache" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M2 18h20"></path><path d="M4 10h16"></path><path d="M12 2v20"></path></svg>
                            Transmission Security &amp; Anti-Caching (HIPAA § 164.312(e)(1))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Network Security</span>
                    </div>
                    <p>
                        Every HTTP response originating from the backend kernel (<code>App\\Core\\Cors</code>) injects hardened security headers to prevent unauthorized proxy or browser caching of ePHI:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8;">
                        <li><code>Cache-Control: no-store, no-cache, must-revalidate, max-age=0</code> — Zero client disk caching of PHI.</li>
                        <li><code>Pragma: no-cache</code> — Legacy HTTP/1.0 anti-caching enforcement.</li>
                        <li><code>X-Frame-Options: SAMEORIGIN</code> — Clickjacking prevention.</li>
                        <li><code>X-Content-Type-Options: nosniff</code> — MIME sniffing defense.</li>
                        <li><code>X-XSS-Protection: 1; mode=block</code> — Reflected XSS termination.</li>
                    </ul>
                </section>

                <!-- SECTION: FIELD-LEVEL DATABASE ENCRYPTION (AES-256-GCM) -->
                <section id="sec-hipaa-encryption" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Field-Level Database Encryption at Rest (AES-256-GCM) (HIPAA § 164.312(a)(2)(iv))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Cryptographic Safeguards</span>
                    </div>
                    <p>
                        In strict adherence to <strong>45 CFR § 164.312(a)(2)(iv)</strong> (Security Rule: Encryption and Decryption) and <strong>45 CFR § 164.501</strong> (Special Privacy Protections for Psychotherapy Notes), USIntellix enforces field-level database encryption at rest using NIST SP 800-38D compliant <strong>AES-256-GCM (Galois/Counter Mode)</strong>.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Why Field-Level Encryption at Rest is Required</div>
                        <div>
                            Database-level transparent data encryption (TDE) only protects the raw physical storage volume. If a database administrator account is compromised, or an unencrypted SQL dump, replication log, or remote database backup file is exposed, standard TDE does not protect patient records. Field-level encryption guarantees that sensitive ePHI fields remain cryptographically unreadable ciphertext outside the authorized application runtime.
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 16px 0;">
                        <div style="background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 14px 16px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #059669; font-weight: 700;">🔐 Cryptographic Specifications</h4>
                            <ul style="font-size: 12.5px; line-height: 1.7; margin: 0; padding-left: 18px;">
                                <li><strong>Algorithm:</strong> AES-256-GCM (Galois/Counter Mode AEAD).</li>
                                <li><strong>Key Length:</strong> 256-bit symmetric key configured via <code>DB_ENCRYPTION_KEY</code> in <code>.env</code>.</li>
                                <li><strong>Initialization Vector (IV):</strong> 96-bit (12-byte) cryptographically secure random nonces generated per field via <code>random_bytes(12)</code> (prevents identical ciphertext patterns).</li>
                                <li><strong>Authentication Tag:</strong> 128-bit (16-byte) GHASH authentication tag verifying ciphertext authenticity and detecting any database tampering.</li>
                                <li><strong>Envelope Format:</strong> <code>enc:v1:&lt;base64(12-byte IV . 16-byte Tag . Ciphertext)&gt;</code>.</li>
                            </ul>
                        </div>
                        <div style="background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 14px 16px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #059669; font-weight: 700;">🛡️ Protected Database Fields</h4>
                            <ul style="font-size: 12.5px; line-height: 1.7; margin: 0; padding-left: 18px;">
                                <li><strong>Patient Identifiers:</strong> <code>patients.ssn</code> (Social Security Number) and <code>patients.national_id</code> (Government ID).</li>
                                <li><strong>Facility &amp; Tax IDs:</strong> <code>facilities.tax_id</code> (SSN/EIN) and <code>facilities.iban</code> (Banking IBAN).</li>
                                <li><strong>Payment Instruments:</strong> <code>patient_ledger_payments.card_number</code>, <code>card_expiry</code>, and <code>card_cvv</code>.</li>
                                <li><strong>Psychotherapy Notes (§ 164.501):</strong> <code>patient_psychiatric_notes.psychiatric_notes</code>, <code>symptoms</code>, <code>treatment_plan</code>, and <code>confidential_remarks</code>.</li>
                                <li><strong>Clinical SOAP Notes:</strong> <code>encounter_soap_notes.subjective</code>, <code>objective</code>, <code>assessment</code>, and <code>plan</code>.</li>
                                <li><strong>Clinical Narratives:</strong> <code>encounter_clinical_note_items.narrative</code>.</li>
                            </ul>
                        </div>
                    </div>
                    <div class="sysdoc-rule-box" style="margin-top: 14px;">
                        <div class="sysdoc-rule-title">Zero-Downtime Transparent Engine (App\\Core\\FieldEncryption)</div>
                        <div>
                            The encryption engine seamlessly hooks into the <code>App\\Core\\QueryBuilder</code> model lifecycle. When models like <code>Patient</code>, <code>PatientPsychiatricNote</code>, or <code>PatientLedgerPayment</code> save data, fields declared in <code>$encryptedFields</code> are automatically encrypted before writing to MySQL. When reading via <code>find()</code>, <code>first()</code>, or <code>get()</code>, fields are transparently authenticated and decrypted. If ciphertext or authentication tags are tampered with, decryption fails safely and logs a tamper alert without corrupting data.
                        </div>
                    </div>
                </section>

                <!-- SECTION: ACCOUNTING OF DISCLOSURES & PRIVACY -->
                <section id="sec-hipaa-privacy" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><circle cx="11" cy="14" r="3"></circle><line x1="17" y1="14" x2="14" y2="14"></line></svg>
                            Accounting of Disclosures &amp; Notice of Privacy Practices (§ 164.528 &amp; § 164.520)
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Privacy Safeguards</span>
                    </div>
                    <p>
                        Under the HIPAA Privacy Rule, covered entities must provide clear notice of privacy practices, obtain written patient acknowledgment at first service delivery, and maintain an official accounting of non-routine disclosures of protected health information made outside of Treatment, Payment, and Health Care Operations (TPO).
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Accounting of Disclosures Log Submodule (§ 164.528)</div>
                        <div>
                            Patients have a federal statutory right under <strong>45 CFR § 164.528</strong> to request and receive an accounting of all non-TPO disclosures of their PHI made by the hospital during the preceding <strong>6 years</strong> (§ 164.528(a)(1)).
                        </div>
                        <ul style="margin: 6px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Dedicated Navigation:</strong> Located under <strong>Miscellaneous &rarr; Accounting of Disclosures</strong> (<code>data-tab="misc_disclosures"</code>), complete with real-time metric cards (Total, Subpoenas, Public Health, Law Enforcement, HIE feeds, 6-Year Window).</li>
                            <li><strong>Mandatory Statutory Fields (§ 164.528(b)(2)):</strong> Captures date of disclosure, recipient entity/person, recipient address, requesting official, delivery medium (Electronic Portal, Encrypted Email, Encrypted Media, HIPAA Fax, Certified Mail, Handover), case/docket reference number, statement of purpose, and specific PHI records disclosed.</li>
                            <li><strong>Statutory Presets:</strong> Quick-filter toolbar supporting <strong>Last 6 Years (Mandatory)</strong>, <strong>Last 1 Year</strong>, <strong>Last 90 Days</strong>, and <strong>All Time</strong> lookback periods.</li>
                            <li><strong>Formal Patient Accounting Statement Generator:</strong> One-click generation of the formal written accounting statement fulfilling § 164.528(c)(1), featuring hospital letterhead, patient demographics, detailed disclosures table, TPO exemption disclosure notices, and Privacy Officer signature/certification block with print-ready CSS for direct PDF export.</li>
                            <li><strong>Regulatory CSV Export:</strong> Direct RFC 4180 CSV export with compliance metadata headers for OCR regulatory audits via <code>/api/disclosures/export-csv</code>.</li>
                            <li><strong>Patient Chart Integration:</strong> Live disclosures widget on the patient dashboard and interactive modal in the patient chart for recording and printing patient statements in real-time.</li>
                            <li><strong>Cryptographic Audit Trails:</strong> All disclosure operations (<code>RECORD_DISCLOSURE</code>, <code>UPDATE_DISCLOSURE</code>, <code>DELETE_DISCLOSURE</code>, <code>EXPORT_DISCLOSURE_REPORT</code>) are permanently chained into <code>hipaa_audit_logs</code> via SHA-256 HMAC.</li>
                        </ul>
                    </div>
                    <div class="sysdoc-rule-box" style="margin-top: 10px;">
                        <div class="sysdoc-rule-title">Patient Consent &amp; NPP Signature Capture (§ 164.520)</div>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>First Portal Login Interception:</strong> Patients logging into the portal with unacknowledged NPP are prevented from accessing the dashboard until completing an interactive consent form requiring checkboxes for the Privacy Policy and Terms of Service, along with a full legal name electronic signature.</li>
                            <li><strong>In-Clinic Check-In Console:</strong> The Patient Flow board displays live NPP status upon appointment selection, allowing front-desk reception staff to capture electronic/verbal or physical paper acknowledgment directly into the system.</li>
                            <li><strong>Immutable Consent Ledger:</strong> Every consent event is persisted into <code>npp_consent_log</code> with client IP, timestamp, signature type, version string (<code>2026-09</code>), and staff witness identity, verified via sequential SHA-256 HMAC audit logs.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('misc_disclosures', 'Accounting of Disclosures'); }">
                            <span>Open Accounting of Disclosures</span>
                        </button>
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }">
                            <span>Open Notice of Privacy Practices</span>
                        </button>
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('terms_conditions', 'Terms &amp; Conditions'); } else { window.location.hash = '#/terms-conditions'; }">
                            <span>Open Terms of Service</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: BREACH NOTIFICATION & 4-FACTOR RISK ASSESSMENT -->
                <section id="sec-hipaa-breach" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            12. HIPAA Breach Notification Rule &amp; 4-Factor Risk Assessment (§§ 164.400 – 164.414 &amp; § 164.308(a)(6))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Safeguard</span>
                    </div>
                    <p>
                        Under federal law (<strong>45 CFR § 164.402</strong>), any impermissible acquisition, access, use, or disclosure of unencrypted protected health information is presumed to be a reportable breach <em>unless</em> the covered entity demonstrates that there is a low probability that the PHI has been compromised based on a statutory 4-Factor Risk Assessment.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Statutory 4-Factor Risk Assessment Engine (§ 164.402)</div>
                        <ul style="margin: 6px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Factor 1 — Nature and Extent of PHI:</strong> Evaluates clinical sensitivity (diagnoses, psychiatric notes, lab results, SSNs) and likelihood of re-identification.</li>
                            <li><strong>Factor 2 — Unauthorized Recipient:</strong> Evaluates who impermissibly accessed or received the PHI (e.g., trusted internal physician vs. unauthorized third party).</li>
                            <li><strong>Factor 3 — Actual Viewing / Acquisition:</strong> Evaluates whether forensic logs demonstrate that the PHI was actually accessed, copied, or acquired.</li>
                            <li><strong>Factor 4 — Extent of Mitigation:</strong> Evaluates immediate containment steps (e.g., immediate verified deletion agreement, returned unopened courier).</li>
                            <li><strong>Composite Scoring:</strong> Real-time average calculator (&le; 2.0 = Non-Breach / Low Risk demonstrated; &gt; 2.0 = Presumption of Breach applies).</li>
                        </ul>
                    </div>
                    <div class="sysdoc-rule-box" style="margin-top: 10px;">
                        <div class="sysdoc-rule-title">Statutory Notification &amp; Regulatory Filings</div>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>60-Day Countdown Clock (§ 164.404):</strong> Strict statutory deadline monitoring from discovery date with visual alert pills (&gt;15d blue, &le;15d pulsing amber, &lt;0d overdue red).</li>
                            <li><strong>Individual Breach Notification Letter Generator (§ 164.404(c)):</strong> Formats formal written notices fulfilling all 5 mandatory statutory elements with facility letterhead and print/PDF export.</li>
                            <li><strong>HHS OCR Portal Electronic Filing Package (§ 164.408):</strong> Standardized JSON package formatted specifically for submission to the HHS.gov OCR Breach Portal (&lt;500 annual log vs. &ge;500 immediate notice).</li>
                            <li><strong>Chained Audit Trail:</strong> Every incident creation, assessment score, patient linkage, letter generation, and filing package export is committed to <code>hipaa_audit_logs</code> under <code>CATEGORY_INCIDENT</code> with sequential HMAC-SHA-256 hash chaining.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('security_incidents', 'Security Incidents &amp; Breach Assessment'); }">
                            <span>Open Security Incidents &amp; Breach Log</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: BAA VENDOR REGISTRY & GOVERNANCE -->
                <section id="sec-hipaa-baa" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            13. Business Associate Agreement (BAA) Tracking &amp; Vendor Governance (§ 164.502(e) &amp; § 164.504(e))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Safeguard</span>
                    </div>
                    <p>
                        Under <strong>45 CFR § 164.502(e)</strong> and <strong>§ 164.504(e)</strong>, a covered healthcare provider may disclose protected health information to an external vendor, cloud host, SMS/email gateway, clearinghouse, or laboratory only if satisfactory assurances are obtained through an executed Business Associate Agreement (BAA).
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Centralized Vendor Registry &amp; OCR Question #1 Compliance</div>
                        <p style="margin: 4px 0 8px 0; font-size: 13px;">
                            During an official HHS OCR compliance audit, Question #1 under vendor management requires: <em>"Provide your complete active inventory of Business Associates, including signed BAA copies, execution dates, and compliance audit dates."</em> The BAA Vendor Registry provides direct, one-click fulfillment of this inquiry:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Centralized Vendor Catalog:</strong> Catalogs all vendors handling ePHI across cloud infrastructure, messaging relays, reference labs, clearinghouses, transcription/AI tools, and IT MSP contractors.</li>
                            <li><strong>Statutory Contract Governance:</strong> Tracks legal vendor name, service description, primary contact, execution date, expiration/renewal date, last audit date, and next review deadline.</li>
                            <li><strong>Dynamic Status &amp; 60-Day Renewal Warnings:</strong> Automatically evaluates agreement dates and triggers high-visibility administrative warning banners for missing BAAs, expired contracts, or renewals impending within 60 days.</li>
                            <li><strong>Subcontractor PHI Access Tracking (§ 164.504(e)(2)(ii)(D)):</strong> Audits downstream subcontractor data sharing and enforces contractual breach notification SLAs (e.g. 24h, 48h, 72h).</li>
                            <li><strong>HHS OCR Question #1 Compliance Dossier:</strong> Compiles an instant printable compliance dossier with facility letterhead, active vs. missing/expired vendor breakdown, subcontractor disclosures, and statutory safeguard attestations.</li>
                            <li><strong>Regulatory RFC 4180 CSV Export:</strong> Direct CSV export containing complete statutory vendor governance metadata via <code>/api/business-associates/export-csv</code>.</li>
                            <li><strong>Cryptographic Audit Trails:</strong> Every vendor registration, modification, deletion, dossier compilation, and CSV export is chained into <code>hipaa_audit_logs</code> under <code>CATEGORY_BAA</code> via SHA-256 HMAC.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('business_associates', 'BAA Vendor Registry'); }">
                            <span>Open BAA Vendor Registry</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: HITECH MANDATORY OUT-OF-POCKET RESTRICTION -->
                <section id="sec-hipaa-hitech" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                            14. HITECH Mandatory Out-of-Pocket Insurance Restriction (45 CFR § 164.522(a)(1)(vi))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Safeguard</span>
                    </div>
                    <p>
                        Under <strong>45 CFR § 164.522(a)(1)(vi)</strong> (enacted under HITECH Act § 13405(a)), a covered entity <strong>must agree</strong> to a patient's request to restrict disclosure of protected health information to a health plan/insurer if the disclosure is for payment or health care operations and the medical service or encounter has been paid out-of-pocket in full.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Fail-Safe Claim Suppression &amp; EDI Hard Block Architecture</div>
                        <p style="margin: 4px 0 8px 0; font-size: 13px;">
                            Accidental inclusion of a self-paid restricted encounter into an EDI 837P batch or automated billing export is an automatic HIPAA Privacy Rule violation. The system enforces multi-layered technical controls to prevent accidental exposure:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Encounter Intake Form Card:</strong> A dedicated amber toggle card in the Encounter Form modal allows front-desk or clinical registrars to record the patient's mandatory restriction request, paid-in-full verification, receipt or transaction reference, and custom restriction notes.</li>
                            <li><strong>Automated Database Claim Suppression:</strong> Activating the restriction automatically asserts <code>claim_suppressed = 1</code> and records <code>hitech_restriction_date</code> directly on the <code>encounters</code> record.</li>
                            <li><strong>Server-Side EDI Hard Block:</strong> <code>EncounterService::setX12Status()</code> enforces an impassable server-side validation rejecting any attempt to transition a restricted encounter's EDI X12 claim status to <code>sent</code> or <code>accepted</code> (HTTP 422 Unprocessable Entity), automatically writing an <code>ACTION_HITECH_CLAIM_BLOCKED</code> audit event.</li>
                            <li><strong>Fee Sheet Live Warning Banner:</strong> The billing Fee Sheet displays a prominent, persistent amber warning banner (<code>#pdFeeSheetHitechBanner</code>) alerting billing staff that insurance disclosure is prohibited under federal law, displaying receipt verification and offering a direct link to inspect the restriction.</li>
                            <li><strong>Billing Manager Worklist Safeguards:</strong> Encounters under active restriction are badged with a <code>🔒 HITECH Restricted</code> indicator. The EDI X12 status dropdown options for <code>sent</code> and <code>accepted</code> are strictly disabled with <code>(Blocked)</code> labels. Staff can filter worklists using the dedicated <code>hitech_restriction</code> criteria.</li>
                            <li><strong>Statutory Registry &amp; OCR Export:</strong> Synchronizes records to the dedicated <code>hipaa_hitech_restrictions</code> table and provides RFC 4180 CSV export functionality with compliance headers citing 45 CFR § 164.522(a)(1)(vi).</li>
                            <li><strong>Tamper-Evident Chained Audit Logging:</strong> All restriction actions (<code>HITECH_RESTRICTION_APPLIED</code>, <code>HITECH_RESTRICTION_REMOVED</code>, <code>HITECH_CLAIM_DISPATCH_BLOCKED</code>, <code>EXPORT_HITECH_REGISTRY_CSV</code>) are sequentially hashed into <code>hipaa_audit_logs</code> under <code>CATEGORY_HITECH</code>.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('billing_manager', 'Billing Manager'); }">
                            <span>Open Billing Manager Worklist</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: CONFIDENTIAL COMMUNICATIONS PREFERENCES (§ 164.522(b)) -->
                <section id="sec-hipaa-confidential-comm" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            15. Confidential Communications Preference Enforcement (45 CFR § 164.522(b))
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Patient Right</span>
                    </div>
                    <p>
                        Under <strong>45 CFR § 164.522(b)</strong>, a covered entity <strong>must permit individuals to request</strong> and <strong>must accommodate reasonable requests</strong> to receive communications of protected health information by alternative means or at alternative locations (e.g., only call mobile phone, never leave voicemails containing clinical or appointment details, send correspondence to a P.O. Box instead of a residential address).
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Multi-Channel Safeguards &amp; Clinical Workflow Alerts</div>
                        <p style="margin: 4px 0 8px 0; font-size: 13px;">
                            Healthcare providers violate § 164.522(b) when front-desk staff, phone operators, or automated outreach services place calls or leave voicemails without checking the patient's legally binding communication instructions. USIntellix enforces end-to-end technical protections:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Binding Preference Toggles:</strong> Patient demographics capture explicit toggles for <code>allow_voicemail</code> (Yes/No), <code>allow_sms</code> (Yes/No), <code>allow_voice_calls</code> (Yes/No), <code>allow_email</code>, <code>allow_postcard</code>, <code>preferred_contact_method</code>, and alternative confidential mailing address, phone, and email fields.</li>
                            <li><strong>Automated Restriction Detection:</strong> The backend automatically sets <code>has_confidential_restrictions = 1</code> if the patient sets voicemail to No, SMS to No, prefers an alternative confidential address, or registers custom staff instructions.</li>
                            <li><strong>Patient Chart Visual Alert Banner:</strong> The Patient Chart topbar displays an impassable red alert banner (<code>#pdConfidentialCommBanner</code>) and high-visibility header badge notifying clinicians and nurses of restricted communication channels before placing calls or sending mail.</li>
                            <li><strong>Patient Context Bar &amp; Finder Warnings:</strong> When working across tabs, the persistent <code>patientContextBar</code> highlights active restrictions. Patient List and Patient Finder display <code>🔒 CC</code> badges next to the patient's name.</li>
                            <li><strong>Demographics Widget Integration:</strong> The Choices panel within the Patient Summary widget displays all active restrictions, alternative channels, and staff guidance in plain view.</li>
                            <li><strong>Statutory Ledger &amp; OCR Export:</strong> All changes are recorded in <code>hipaa_confidential_communications_log</code> with foreign-key integrity. Staff can export an RFC 4180 CSV registry with official OCR headers via <code>/api/patients/confidential-registry/export</code>.</li>
                            <li><strong>Tamper-Evident HMAC-SHA-256 Audit Trail:</strong> Restriction updates are logged to <code>hipaa_audit_logs</code> under <code>CATEGORY_COMMUNICATIONS</code> with actions <code>CONFIDENTIAL_COMM_RESTRICTION_SET</code> and <code>CONFIDENTIAL_COMM_RESTRICTION_REMOVED</code>.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="window.location.href='/api/patients/confidential-registry/export';">
                            <span>Export Confidential Registry (CSV)</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: RIGHT OF ACCESS 30-DAY DESIGNATED RECORD SET (§ 164.524) -->
                <section id="sec-hipaa-drs" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            16. Patient Right of Access 30-Day Designated Record Set Management (45 CFR § 164.524 &amp; 21st Century Cures Act)
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Statutory Patient Right</span>
                    </div>
                    <p>
                        Under <strong>45 CFR § 164.524</strong> and the <strong>21st Century Cures Act (Information Blocking Rule)</strong>, individuals and their personal representatives have an enforceable federal right to inspect and obtain a complete copy of their <strong>Designated Record Set (DRS)</strong> within <strong>30 calendar days</strong> of a request. Under the OCR's active Right of Access Initiative, failure to timely produce records or assessing prohibited retrieval fees incurs mandatory civil monetary penalties.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Centralized DRS Request Pipeline &amp; Statutory Safeguards</div>
                        <p style="margin: 4px 0 8px 0; font-size: 13px;">
                            The system provides an administrative pipeline to govern access requests, countdown timers, extension notices, and complete export bundles:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Automated 30-Day Statutory Countdown Clock:</strong> Calculates initial fulfillment deadlines exactly 30 calendar days from receipt date. Live urgency indicators trigger amber warnings (&le;7 days) and pulsing red alerts when overdue, mitigating OCR breach liability.</li>
                            <li><strong>Single 30-Day Extension Enforcement (§ 164.524(b)(2)(ii)):</strong> Programmatically permits at most <em>one</em> 30-day extension per request, locking subsequent extension attempts and auto-generating the formal written statutory notice letter citing legitimate delay rationales.</li>
                            <li><strong>Multi-Format Designated Record Set Bundle:</strong> One-click collation of demographics, clinical encounters, SOAP notes, vital signs, active diagnoses, allergies, medications, immunizations, diagnostic lab results, and billing ledgers into print-ready PDF letterheads or machine-readable JSON interoperability packages.</li>
                            <li><strong>Statutory Fee Restriction Rules (§ 164.524(c)(4)):</strong> Programmatic validation blocks search and retrieval fees. Fees are strictly bounded to reasonable cost-based paper supplies, actual postage, or portable electronic media up to the OCR $6.50 safe harbor (with electronic portal delivery enforced at $0.00).</li>
                            <li><strong>OCR Audit Registry &amp; Tamper-Evident Trail:</strong> Maintains full pipeline history in <code>hipaa_drs_access_requests</code> with RFC 4180 CSV export and sequential HMAC-SHA-256 audit logging under <code>CATEGORY_RIGHT_OF_ACCESS</code>.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('drs_requests', 'Right of Access (DRS)'); }">
                            <span>Open DRS Request Pipeline</span>
                        </button>
                        <button type="button" class="sysdoc-btn-secondary" onclick="window.location.href='/api/drs-requests/export-csv';">
                            <span>Export DRS Registry (CSV)</span>
                        </button>
                    </div>
                </section>

                <!-- SECTION: HIPAA AUDIT READINESS & STATUTORY ROADMAP -->
                <section id="sec-hipaa-roadmap" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                            HIPAA Audit Readiness, Gap Analysis &amp; Statutory Compliance Roadmap
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">OCR Audit Protocol (45 CFR)</span>
                    </div>
                    <p>
                        To achieve 100% compliance and pass an official <strong>HHS Office for Civil Rights (OCR)</strong> or third-party HIPAA audit (SOC 2 Type II + HIPAA, HITRUST CSF), a healthcare system must satisfy every technical, administrative, and physical safeguard under <strong>45 CFR Parts 160 &amp; 164</strong>. USIntellix maintains an industry-grade foundation across 16 core safeguards (~94-96% technical baseline). This section documents the formal compliance scorecard and the remaining statutory parameters required for complete certification.
                    </p>

                    <!-- COMPLIANCE STATUS SCORECARD -->
                    <div class="sysdoc-subheading" style="margin-top: 18px;">Master HIPAA Audit Compliance Scorecard</div>
                    <table class="sysdoc-table">
                        <thead>
                            <tr>
                                <th style="width: 15%;">Rule &amp; Section</th>
                                <th style="width: 25%;">Safeguard / Requirement</th>
                                <th style="width: 45%;">System Technical Implementation</th>
                                <th style="width: 15%;">Audit Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>§ 164.312(a)(1)</strong></td>
                                <td>Unique User ID &amp; 2FA</td>
                                <td>Unique accounts, bcrypt password hashing, forced first-login reset, SMS/Email 2FA OTP.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(i)</strong></td>
                                <td>Account Lockout &amp; Defense</td>
                                <td>Auto-lock after 5 consecutive failed logins in 15 mins; 30-min cooldown or admin override.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(ii)</strong></td>
                                <td>Emergency Break-Glass Access</td>
                                <td>Clinical override for non-assigned patient charts with mandatory justification &amp; chained audit.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(iii)</strong></td>
                                <td>Automatic Inactivity Logoff</td>
                                <td>15-minute global inactivity timer with 60-second live warning countdown modal.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(a)(2)(iv)</strong></td>
                                <td>Field-Level Encryption at Rest</td>
                                <td>NIST SP 800-38D AES-256-GCM authenticated cipher for SSN, National IDs, payment instruments, and notes.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(b) &amp; (c)(1)</strong></td>
                                <td>Audit Controls &amp; Integrity</td>
                                <td>Tamper-evident sequential HMAC-SHA-256 chained audit logs with CLI &amp; Web cryptographic verifiers.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.316(b)(2)(i)</strong></td>
                                <td>6-Year Audit Trail Retention</td>
                                <td>Database triggers blocking deletion of records &lt; 6 years old; RFC 4180 CSV &amp; print-ready PDF reports.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.312(e)(1)</strong></td>
                                <td>Transmission &amp; Anti-Caching</td>
                                <td>HTTP anti-caching headers (<code>no-store</code>, <code>no-cache</code>), clickjacking &amp; MIME sniffing defenses.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.308(a)(5)(ii)(D)</strong></td>
                                <td>Password Expiration &amp; History</td>
                                <td>90-day mandatory credential rotation, previous 5 passwords restriction, 7-day warning banner.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.308(a)(4)</strong></td>
                                <td>6-Tier Role-Based Access Control</td>
                                <td>Granular roles (Admin, Doctor, Clinician, Nurse, Receptionist, Biller, Patient) with dynamic ACL rules.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.502(b) / § 164.514(d)</strong></td>
                                <td>Minimum Necessary PHI</td>
                                <td>Clinical chart/lab masking for non-clinical staff; physician patient-assignment boundaries; dashboard redaction.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.520</strong></td>
                                <td>NPP Consent &amp; Signature Capture</td>
                                <td>First-login portal modal gating with e-signature; flow board in-clinic check-in console; immutable consent log.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.528</strong></td>
                                <td>Accounting of Disclosures Log</td>
                                <td>Dedicated submodule tracking non-TPO releases; statutory fields; 6-year presets; printable legal statement &amp; CSV.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§§ 164.400 – 164.414</strong></td>
                                <td><strong>Breach Notification &amp; 4-Factor Risk Assessment</strong></td>
                                <td>Statutory 4-factor risk assessment engine, 60-day notification countdown, patient letter generator, and OCR JSON export.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.502(e) / § 164.504(e)</strong></td>
                                <td><strong>Business Associate Agreement (BAA) Registry</strong></td>
                                <td>Centralized vendor inventory, signed BAA tracking, review/expiration schedules, breach SLAs, and OCR Question #1 dossiers.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.522(a)(1)(vi)</strong></td>
                                <td><strong>HITECH Paid-in-Full Insurance Restriction</strong></td>
                                <td>Mandatory patient right to withhold disclosure to health plans for out-of-pocket services; automatic claim suppression (<code>claim_suppressed = 1</code>), server-side EDI X12 dispatch block, statutory registry (<code>hipaa_hitech_restrictions</code>), Fee Sheet and Billing Manager worklist indicators.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.522(b)</strong></td>
                                <td><strong>Confidential Communications Preferences Enforcement</strong></td>
                                <td>Mandatory patient right to alternative communications; binding voicemail and SMS toggles, alternative address/phone/email, Patient Chart and Context Bar alert banners, <code>hipaa_confidential_communications_log</code> audit history, and RFC 4180 CSV registry export.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr>
                                <td><strong>§ 164.524</strong></td>
                                <td><strong>Right of Access 30-Day DRS Management</strong></td>
                                <td>Designated Record Set request tracker, 30-day statutory countdown timer, single 30-day extension enforcement (§ 164.524(b)(2)(ii)), comprehensive clinical &amp; billing export bundle (PDF/JSON), and statutory fee rules (§ 164.524(c)(4)).</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span></td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td><strong>§ 164.526</strong></td>
                                <td><strong>Statutory PHI Amendment 60-Day Workflow</strong></td>
                                <td>60-day action clock, written denial notices citing 4 statutory grounds, and Statement of Disagreement linking.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-blue">🟡 Roadmap (Tier 2)</span></td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td><strong>§ 164.308(a)(7)</strong></td>
                                <td><strong>Backup &amp; Contingency Verification Console</strong></td>
                                <td>In-app daily encrypted backup status, SHA-256 integrity verification, and periodic restoration drill logs.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-blue">🟡 Roadmap (Tier 3)</span></td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td><strong>§ 164.308(a)(1) &amp; (5)</strong></td>
                                <td><strong>Workforce Training &amp; Sanctions Log</strong></td>
                                <td>Annual HIPAA training certification tracking in employee profiles and confidential disciplinary sanctions log.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-blue">🟡 Roadmap (Tier 3)</span></td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td><strong>§ 164.514(b)</strong></td>
                                <td><strong>Safe Harbor 18-Identifier De-Identification</strong></td>
                                <td>Automated removal/masking of all 18 HIPAA identifiers for clinical research and statistical export datasets.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-blue">🟡 Roadmap (Tier 3)</span></td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td><strong>§ 164.308(a)(2)</strong></td>
                                <td><strong>HIPAA Privacy &amp; Security Officer Designation</strong></td>
                                <td>Dedicated system configuration of official Privacy and Security Officers with dynamic notice auto-fill.</td>
                                <td><span class="sysdoc-badge sysdoc-badge-green">🟢 Roadmap (Tier 3)</span></td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- DETAILED PARAMETER BREAKDOWN -->
                    <div class="sysdoc-subheading" style="margin-top: 24px;">Detailed Specifications of Remaining Statutory Parameters</div>

                    <!-- 1. BREACH NOTIFICATION -->
                    <div class="sysdoc-rule-box" style="border-left-color: #059669;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>1. HIPAA Breach Notification Rule &amp; 4-Factor Risk Assessment (§§ 164.400 – 164.414 &amp; § 164.308(a)(6))</span>
                            <span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Under <strong>45 CFR § 164.402</strong>, any unauthorized acquisition, access, use, or disclosure of unencrypted PHI is legally presumed to be a reportable breach <em>unless</em> the covered entity demonstrates that there is a low probability the PHI has been compromised based on a mandatory <strong>4-Factor Risk Assessment</strong>:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Factor 1 (Nature &amp; Extent of PHI):</strong> Evaluates the sensitivity of the data (SSNs, diagnoses, lab results) and the likelihood of patient re-identification.</li>
                            <li><strong>Factor 2 (Unauthorized Recipient):</strong> Evaluates who accessed or received the PHI (e.g., another covered entity physician vs. an untrusted external party).</li>
                            <li><strong>Factor 3 (Actual Access / Viewing):</strong> Determines whether the PHI was actually opened, viewed, or acquired, or if only device storage was exposed.</li>
                            <li><strong>Factor 4 (Mitigation Extent):</strong> Documents the immediate mitigation steps taken (e.g., immediate verified deletion agreement, returned unopened envelope).</li>
                            <li><strong>Individual Notification (§ 164.404):</strong> Covered entities must notify affected individuals in writing without unreasonable delay and in no case later than <strong>60 calendar days</strong> following discovery. Formal letter generator fulfills all 5 statutory elements (§ 164.404(c)).</li>
                            <li><strong>HHS OCR Reporting (§ 164.408):</strong> Breaches affecting &ge;500 individuals must be reported to the HHS Secretary without unreasonable delay (&lt;60 days); breaches affecting &lt;500 individuals must be logged and reported annually within 60 days of calendar year end. One-click standard JSON export matches HHS OCR portal specifications.</li>
                        </ul>
                        <div style="margin-top: 10px;">
                            <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('security_incidents', 'Security Incidents & Breach Assessment'); }">
                                <span>Open Security Incidents &amp; Breach Log</span>
                            </button>
                        </div>
                    </div>

                    <!-- 2. BAA VENDOR REGISTRY -->
                    <div class="sysdoc-rule-box" style="border-left-color: #059669; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>2. Business Associate Agreement (BAA) Vendor Registry &amp; Governance (§ 164.502(e) &amp; § 164.504(e))</span>
                            <span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Under <strong>45 CFR § 164.502(e)</strong> and <strong>§ 164.504(e)</strong>, a covered entity may not disclose PHI to a vendor, contractor, cloud service, or clearinghouse without obtaining satisfactory assurances through an executed Business Associate Agreement (BAA). The system provides a centralized BAA Vendor Registry satisfying <strong>HHS OCR Audit Protocol Question #1</strong>:
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Centralized Vendor Catalog:</strong> Catalogs all vendors handling ePHI (cloud hosting, SMS/email gateways like Twilio/SendGrid, reference laboratories, clearinghouses, billing contractors, transcription/AI tools, IT MSPs).</li>
                            <li><strong>Comprehensive Contract Tracking:</strong> Records vendor legal name, service category, execution date, expiration/renewal date, last compliance audit date, next scheduled review date, and primary contact.</li>
                            <li><strong>Downstream Subcontractor PHI Access (§ 164.504(e)(2)(ii)(D)):</strong> Tracks downstream subcontractor data sharing and contractual breach notification SLA hours.</li>
                            <li><strong>Dynamic Status &amp; 60-Day Warning Engine:</strong> Automatically computes compliance status (<code>active</code>, <code>expiring_soon</code> (&le; 60 days), <code>expired</code>, <code>missing_baa</code>) and presents persistent dashboard warning banners if any active vendor handling PHI lacks an active BAA.</li>
                            <li><strong>Audit Dossier &amp; RFC 4180 CSV Export:</strong> Generates instant printable compliance dossiers addressing OCR audit question #1 and streams RFC 4180 compliant CSV exports for federal auditors.</li>
                            <li><strong>HMAC-SHA-256 Audit Trail:</strong> Every vendor creation, status change, dossier review, and CSV export is sequentially logged in <code>hipaa_audit_logs</code> under <code>CATEGORY_BAA</code>.</li>
                        </ul>
                        <div style="margin-top: 10px;">
                            <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('business_associates', 'BAA Vendor Registry'); }">
                                <span>Open BAA Vendor Registry</span>
                            </button>
                        </div>
                    </div>

                    <!-- 3. HITECH OUT-OF-POCKET RESTRICTION -->
                    <div class="sysdoc-rule-box" style="border-left-color: #10b981; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>3. HITECH Mandatory Out-of-Pocket Insurance Restriction (§ 164.522(a)(1)(vi))</span>
                            <span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Enacted under Section 13405(a) of the HITECH Act, covered entities <strong>must agree</strong> to a patient's request to restrict disclosure of PHI to a health plan/insurer if the encounter or service has been paid in full out-of-pocket. Accidental inclusion of these encounters into an insurance claim batch is an automatic HIPAA Privacy Rule violation.
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Encounter Form &amp; Fee Sheet Integration:</strong> Dedicated toggle card on the encounter modal recording mandatory restriction, paid-in-full status, receipt ref #, and scope; real-time amber alert banner on the Fee Sheet.</li>
                            <li><strong>Automated Claim Suppression &amp; EDI Dispatch Block:</strong> Flagging automatically sets <code>claim_suppressed = 1</code>. Server-side validation in <code>EncounterService::setX12Status()</code> strictly rejects marking restricted encounters as <code>sent</code> or <code>accepted</code>, writing tamper-evident blocks to <code>hipaa_audit_logs</code>.</li>
                            <li><strong>Billing Manager Worklist Indicators:</strong> High-visibility <code>🔒 HITECH Restricted</code> chip on the worklist; X12 submission options disabled; custom criteria filter (<code>hitech_restriction</code>).</li>
                            <li><strong>Statutory Registry &amp; OCR Export:</strong> Dedicated <code>hipaa_hitech_restrictions</code> database table synced on every restriction action; RFC 4180 CSV export for HHS OCR audit inspection.</li>
                        </ul>
                    </div>

                    <!-- 4. CONFIDENTIAL COMMUNICATIONS -->
                    <div class="sysdoc-rule-box" style="border-left-color: #10b981; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>4. Confidential Communications Preference Enforcement (§ 164.522(b))</span>
                            <span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Patients have a federal statutory right to receive communications of PHI by alternative means or at alternative locations to protect their privacy (e.g., only call mobile phone, never leave voicemails disclosing medical issues, mail statements to P.O. Box).
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Structured Demographics Fields:</strong> Explicit patient flags for <code>Allow Voicemail</code> (Yes/No), <code>Allow SMS Reminders</code> (Yes/No), <code>Allow Voice Calls</code>, <code>Preferred Contact Method</code>, and alternative confidential address, phone, and email fields.</li>
                            <li><strong>Patient Chart Visual Alert Banner &amp; Badge:</strong> Prominent visual alert badge and banner on the patient chart topbar notifying clinicians, nurses, and front-desk staff before outbound contact.</li>
                            <li><strong>Context Bar &amp; Finder Warnings:</strong> Global patient context bar and patient finder table indicators (<code>🔒 CC</code>) alert staff across all navigation tabs.</li>
                            <li><strong>Statutory Ledger &amp; CSV Export:</strong> Audit history tracked in <code>hipaa_confidential_communications_log</code> with full RFC 4180 CSV registry export.</li>
                        </ul>
                    </div>

                    <!-- 5. RIGHT OF ACCESS DRS PIPELINE -->
                    <div class="sysdoc-rule-box" style="border-left-color: #10b981; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>5. Patient Right of Access 30-Day Designated Record Set Pipeline (§ 164.524 &amp; Cures Act)</span>
                            <span class="sysdoc-badge sysdoc-badge-green">✓ Implemented</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Under the OCR's active <strong>Right of Access Initiative</strong>, covered entities are strictly required to provide patients or their personal representatives with complete copies of their Designated Record Set (DRS) within <strong>30 calendar days</strong>.
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Centralized Statutory Pipeline &amp; Countdown Timer:</strong> Real-time tracking of request intake date, automated 30-day statutory countdown timer, impending (&le;7d) and overdue alerts, and filterable status pipeline.</li>
                            <li><strong>Single 30-Day Extension Management (§ 164.524(b)(2)(ii)):</strong> Enforces maximum 1 permissible 30-day extension, automated formal written extension notice generator with expected fulfillment date and statutory justification.</li>
                            <li><strong>Designated Record Set (DRS) Export Bundle (§ 164.501):</strong> Collates complete clinical records (demographics, encounters, SOAP clinical notes, vitals, problem list, allergies, active meds, lab results) and billing records (financial ledger) into printable electronic PDF bundles and structured machine-readable JSON.</li>
                            <li><strong>Statutory Fee Enforcement (§ 164.524(c)(4)):</strong> Strictly blocks search and retrieval fees; enforces reasonable cost-based supplies/postage or OCR $6.50 safe harbor ($0.00 for portal delivery).</li>
                            <li><strong>Compliance Registry &amp; Tamper-Evident Audit:</strong> Dedicated <code>hipaa_drs_access_requests</code> registry table, regulatory RFC 4180 CSV export, and HMAC-SHA-256 cryptographically chained audit logging in <code>hipaa_audit_logs</code> under <code>CATEGORY_RIGHT_OF_ACCESS</code>.</li>
                        </ul>
                    </div>

                    <!-- 6. PHI AMENDMENT WORKFLOW -->
                    <div class="sysdoc-rule-box" style="border-left-color: #2563eb; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #1d4ed8; display: flex; align-items: center; justify-content: space-between;">
                            <span>6. PHI Amendment Statutory 60-Day Workflow &amp; Denial Notices (§ 164.526)</span>
                            <span class="sysdoc-badge sysdoc-badge-blue">Operational Workflow</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            While USIntellix includes an amendments table, § 164.526 mandates a formal administrative workflow with a strict <strong>60-day action timeline</strong> (§ 164.526(b)(2)).
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Statutory Denial Notices:</strong> If an amendment is denied, the system generates the formal legal denial citing one of 4 federal grounds (§ 164.526(a)(2)): not created by entity, not part of DRS, exempt from access, or accurate and complete.</li>
                            <li><strong>Statement of Disagreement Linking (§ 164.526(d)):</strong> Ability to append patient disagreement statements directly to disputed records, ensuring any subsequent disclosure automatically includes the statement.</li>
                        </ul>
                    </div>

                    <!-- 7. BACKUP & DISASTER RECOVERY -->
                    <div class="sysdoc-rule-box" style="border-left-color: #2563eb; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #1d4ed8; display: flex; align-items: center; justify-content: space-between;">
                            <span>7. Backup &amp; Contingency Verification Console (§ 164.308(a)(7))</span>
                            <span class="sysdoc-badge sysdoc-badge-blue">Contingency Safeguard</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Mandates an established data backup plan, disaster recovery plan, and routine testing and revision procedures (§ 164.308(a)(7)(ii)(D)).
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>In-App Backup Health Monitor:</strong> Console tracking daily automated backup timestamps, file sizes, SHA-256 checksums, and AES-256 backup encryption status.</li>
                            <li><strong>Disaster Recovery Drill Log:</strong> Formal documentation of periodic test restoration drills recording test date, operator, target environment, and recovery time objective (RTO).</li>
                        </ul>
                    </div>

                    <!-- 8. WORKFORCE TRAINING & SANCTIONS -->
                    <div class="sysdoc-rule-box" style="border-left-color: #2563eb; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #1d4ed8; display: flex; align-items: center; justify-content: space-between;">
                            <span>8. Workforce Training Tracker &amp; Disciplinary Sanctions Log (§ 164.308(a)(1) &amp; (5))</span>
                            <span class="sysdoc-badge sysdoc-badge-blue">Administrative Safeguard</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Covered entities must maintain proof that all employees complete security awareness training upon hire and annually thereafter, and enforce documented sanctions against policy violators (§ 164.308(a)(1)(ii)(C)).
                        </p>
                        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 12.5px; line-height: 1.65;">
                            <li><strong>Employee Profile Certification:</strong> Tracks Initial HIPAA Training Date, Annual Recertification Date, and Compliance Status with renewal reminders.</li>
                            <li><strong>Confidential Sanctions Log:</strong> Administrative registry documenting security policy violations, investigation summaries, corrective action plans, and disciplinary sanctions applied.</li>
                        </ul>
                    </div>

                    <!-- 9. SAFE HARBOR DE-IDENTIFICATION -->
                    <div class="sysdoc-rule-box" style="border-left-color: #2563eb; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #1d4ed8; display: flex; align-items: center; justify-content: space-between;">
                            <span>9. Safe Harbor 18-Identifier De-Identification Tool (§ 164.514(b))</span>
                            <span class="sysdoc-badge sysdoc-badge-blue">Research &amp; Analytics</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Permits exporting clinical and financial data for research, analytics, or quality improvement without individual HIPAA authorization by automatically stripping all <strong>18 statutory identifiers</strong> (names, geographic units smaller than state, dates except year, phone/fax, emails, SSNs, MRNs, device identifiers, URLs, IP addresses, photos).
                        </p>
                    </div>

                    <!-- 10. OFFICER DESIGNATION -->
                    <div class="sysdoc-rule-box" style="border-left-color: #059669; margin-top: 12px;">
                        <div class="sysdoc-rule-title" style="color: #065f46; display: flex; align-items: center; justify-content: space-between;">
                            <span>10. Official HIPAA Privacy &amp; Security Officer Designation (§ 164.308(a)(2) &amp; § 164.530(a))</span>
                            <span class="sysdoc-badge sysdoc-badge-green">Governance Configuration</span>
                        </div>
                        <p style="margin: 6px 0; font-size: 13px;">
                            Designation fields in System Settings for the official <strong>HIPAA Privacy Officer</strong> and <strong>HIPAA Security Officer</strong> (names, direct phone, official email, appointment date). Automatically injects officer credentials into the Notice of Privacy Practices, Accounting of Disclosures certifications, and breach notification letters.
                        </p>
                    </div>

                    <!-- IMPLEMENTATION ROADMAP -->
                    <div class="sysdoc-subheading" style="margin-top: 24px;">Recommended Implementation Sequence</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 10px;">
                        <div style="background: #fff; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span class="sysdoc-badge sysdoc-badge-green">Phase 1 Complete</span>
                                <strong style="font-size: 14px; color: #166534;">Tier 1 Statutory Modules</strong>
                            </div>
                            <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #475569;">
                                <li><strong>Breach Assessment Log (§§ 164.400-414):</strong> 4-factor risk assessment, 60-day timers, OCR export. <span class="sysdoc-badge sysdoc-badge-green" style="font-size: 10px; padding: 1px 5px;">✓ Completed</span></li>
                                <li><strong>BAA Vendor Registry (§ 164.502(e)):</strong> Vendor tracking, signed BAAs, OCR Question #1 dossiers. <span class="sysdoc-badge sysdoc-badge-green" style="font-size: 10px; padding: 1px 5px;">✓ Completed</span></li>
                                <li><strong>HITECH Out-of-Pocket (§ 164.522(a)):</strong> Encounter self-pay claim suppression &amp; EDI X12 block. <span class="sysdoc-badge sysdoc-badge-green" style="font-size: 10px; padding: 1px 5px;">✓ Completed</span></li>
                            </ul>
                        </div>
                        <div style="background: #fff; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span class="sysdoc-badge sysdoc-badge-amber">Phase 2</span>
                                <strong style="font-size: 14px; color: #b45309;">Enhanced Patient Rights</strong>
                            </div>
                            <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #475569;">
                                <li><strong>Right of Access 30-Day Pipeline (§ 164.524):</strong> Request clock &amp; complete DRS bundle.</li>
                                <li><strong>Confidential Communications (§ 164.522(b)):</strong> Toggles &amp; chart banner warning badges.</li>
                                <li><strong>PHI Amendment Workflow (§ 164.526):</strong> 60-day clock, denial letters, disagreement linking.</li>
                            </ul>
                        </div>
                        <div style="background: #fff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span class="sysdoc-badge sysdoc-badge-blue">Phase 3</span>
                                <strong style="font-size: 14px; color: #1d4ed8;">Operational Governance</strong>
                            </div>
                            <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #475569;">
                                <li><strong>Backup &amp; Contingency Console (§ 164.308(a)(7)):</strong> Backup health &amp; drill verification.</li>
                                <li><strong>Workforce Training &amp; Sanctions (§ 164.308(a)):</strong> Employee tracking &amp; disciplinary log.</li>
                                <li><strong>Safe Harbor De-Identification (§ 164.514(b)):</strong> 18-identifier scrub filter.</li>
                                <li><strong>Officer Designation (§ 164.308(a)(2)):</strong> Official Privacy &amp; Security Officer config.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- SECTION: SYSTEM ARCHITECTURE -->
                <section id="sec-arch-overview" class="sysdoc-card arch-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                            2. Core System Architecture &amp; Technology Stack
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Full-Stack Framework</span>
                    </div>
                    <p>
                        USIntellix is constructed as a high-performance, modular healthcare web application utilizing standard enterprise web technologies:
                    </p>
                    <table class="sysdoc-table">
                        <thead>
                            <tr>
                                <th>Layer</th>
                                <th>Technology</th>
                                <th>Architectural Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Backend Kernel</strong></td>
                                <td>PHP 8.0+ OOP</td>
                                <td>Modular Model-View-Controller (MVC) architecture, custom fast router, PDO database abstraction layer, QueryBuilder, and middleware pipelines.</td>
                            </tr>
                            <tr>
                                <td><strong>Frontend Application</strong></td>
                                <td>Vanilla JavaScript (ES6 Modules)</td>
                                <td>Single Page Application (SPA) driven by hash-routing (<code>#/login</code>, <code>#/dashboard</code>), custom desktop tab manager (<code>TabManager</code>), zero heavy third-party framework dependencies.</td>
                            </tr>
                            <tr>
                                <td><strong>Database</strong></td>
                                <td>MySQL 5.7+ / MariaDB 10.3+</td>
                                <td>InnoDB transactional storage engine with strict foreign keys, sequentially numbered migrations, and indexed query optimizations.</td>
                            </tr>
                            <tr>
                                <td><strong>Security Services</strong></td>
                                <td>OpenSSL &amp; Native Cryptography</td>
                                <td>Bcrypt password hashing, HMAC-SHA256 audit chaining, CSRF mitigation, session token regeneration.</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <!-- SECTION: TABMANAGER -->
                <section id="sec-arch-tabmanager" class="sysdoc-card arch-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            TabManager Desktop Workstation Emulation
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Client UI Engine</span>
                    </div>
                    <p>
                        To mirror the efficiency of desktop EHR clinical software, USIntellix features a custom <strong>TabManager</strong> (<code>frontend/src/core/tabs.js</code>):
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8;">
                        <li><strong>Multi-Tasking Workflow:</strong> Physicians and staff can simultaneously keep open multiple patient charts, scheduling calendars, fee sheets, and reports.</li>
                        <li><strong>State Preservation:</strong> Swapping tabs maintains form inputs and chart states without discarding unsaved progress.</li>
                        <li><strong>Session Persistence:</strong> Active tabs are serialized to <code>localStorage</code>, allowing users to restore their exact multi-tab workspace upon browser refresh.</li>
                    </ul>
                </section>

                <!-- SECTION: RBAC MATRIX -->
                <section id="sec-rbac-matrix" class="sysdoc-card arch-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            3. User Roles &amp; Access Control Matrix (RBAC)
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Access Governance</span>
                    </div>
                    <p>
                        Access to protected clinical and financial functions is governed by 6 core user roles:
                    </p>
                    <table class="sysdoc-table">
                        <thead>
                            <tr>
                                <th>Functional Area</th>
                                <th>Admin</th>
                                <th>Physician</th>
                                <th>Nurse</th>
                                <th>Receptionist</th>
                                <th>Biller</th>
                                <th>Patient</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>User &amp; Employee Admin</strong></td>
                                <td>Full</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>HIPAA Audit Logs &amp; Integrity</strong></td>
                                <td>Full</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>Inpatient Bed Management (ADT)</strong></td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>View Beds</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>Patient Demographics &amp; Finder</strong></td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>View</td>
                                <td>Self</td>
                            </tr>
                            <tr>
                                <td><strong>Clinical Encounters &amp; SOAP</strong></td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>Limited</td>
                                <td>None</td>
                                <td>None</td>
                                <td>Self View</td>
                            </tr>
                            <tr>
                                <td><strong>Vital Signs &amp; Triage</strong></td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>None</td>
                                <td>None</td>
                                <td>Self View</td>
                            </tr>
                            <tr>
                                <td><strong>Fee Sheets &amp; EDI Claims</strong></td>
                                <td>Full</td>
                                <td>Full</td>
                                <td>None</td>
                                <td>None</td>
                                <td>Full</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>Drug Inventory &amp; Pharmacy</strong></td>
                                <td>Full</td>
                                <td>View</td>
                                <td>View</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>Security Incidents &amp; Breach Assessment</strong></td>
                                <td>Full</td>
                                <td>Report Only</td>
                                <td>Report Only</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>BAA Vendor Registry &amp; Governance</strong></td>
                                <td>Full</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                                <td>None</td>
                            </tr>
                            <tr>
                                <td><strong>Accounting of Disclosures</strong></td>
                                <td>Full</td>
                                <td>View</td>
                                <td>View</td>
                                <td>View/Record</td>
                                <td>View/Record</td>
                                <td>Self Request</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <!-- SECTION: CLINICAL MODULES -->
                <section id="sec-mod-inpatient" class="sysdoc-card clinical-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                            4. Inpatient Bed Management (ADT)
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Clinical Module</span>
                    </div>
                    <p>
                        The Inpatient Admission, Discharge, and Transfer (ADT) module coordinates inpatient hospital stays:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8;">
                        <li><strong>Admissions:</strong> Records admitting diagnosis, attending physician, admission priority (Urgent, Elective, Emergency), and assigned bed.</li>
                        <li><strong>Interactive Ward Floorplan:</strong> Visual grid of rooms and beds with live occupancy statuses: <code>Available</code>, <code>Occupied</code>, <code>Cleaning</code>, <code>Maintenance</code>.</li>
                        <li><strong>Bed Transfers:</strong> Seamlessly transfers inpatients between rooms or specialty units with full historical bed audit logging.</li>
                        <li><strong>Discharges:</strong> Coordinates discharge dispositions, summaries, and automated release of bed inventory.</li>
                    </ul>
                </section>

                <!-- SECTION: CHART & HISTORY -->
                <section id="sec-mod-chart" class="sysdoc-card clinical-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                            Patient Chart &amp; Longitudinal History
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Clinical EHR</span>
                    </div>
                    <p>
                        The core clinical interface features an interactive widget dashboard alongside a comprehensive 5-tab longitudinal history subsystem:
                    </p>
                    <div class="sysdoc-rule-box" id="sec-mod-history">
                        <div class="sysdoc-rule-title">5-Category Longitudinal History Subsystem</div>
                        <ul style="margin: 4px 0 0 18px; padding: 0;">
                            <li><strong>General:</strong> 20 fixed risk factors and 15 physical examination categories.</li>
                            <li><strong>Family History:</strong> Father, mother, siblings, spouse, offspring with integrated ICD-10 diagnosis picker.</li>
                            <li><strong>Relatives:</strong> 9-condition familial health checklist (Cancer, Diabetes, Epilepsy, Heart Disease, Stroke, etc.).</li>
                            <li><strong>Lifestyle:</strong> Tobacco status with cigarette pack-years, alcohol, recreational drugs, sleep patterns, exercise, and counseling.</li>
                            <li><strong>Other:</strong> Free-text and customizable clinical background.</li>
                        </ul>
                    </div>
                </section>

                <!-- SECTION: BILLING & EDI -->
                <section id="sec-mod-billing" class="sysdoc-card clinical-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            Billing, Fee Sheets &amp; EDI X12 Engine
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Revenue Cycle</span>
                    </div>
                    <p>
                        Integrates clinical documentation with hospital financial workflows:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8;">
                        <li><strong>Fee Sheets &amp; Superbills:</strong> Encounter diagnosis (ICD-10) and procedure codes (CPT/HCPCS) auto-populate into billable line items.</li>
                        <li><strong>EDI 837P Claims:</strong> Automatically compiles and formats standard ANSI X12 837 Professional claim batch files for clearinghouse transmission.</li>
                        <li><strong>EDI 835 Remittance Advice:</strong> Ingests electronic Remittance Advices (ERAs) to auto-post insurance payments and adjudicate balances.</li>
                        <li><strong>Checkout &amp; Copays:</strong> Point-of-service patient payment receipting and ledger accounting.</li>
                    </ul>
                </section>

                <!-- SECTION: PATIENT PORTAL -->
                <section id="sec-mod-portal" class="sysdoc-card clinical-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            Patient Portal &amp; Caregiver Proxy Access
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-blue">Patient Engagement</span>
                    </div>
                    <p>
                        Patients access their electronic health record securely through the integrated portal:
                    </p>
                    <ul style="font-size: 13px; line-height: 1.8;">
                        <li><strong>Self-Service Health Records:</strong> View lab results, vitals, immunization histories, clinical summaries, and upcoming appointments.</li>
                        <li><strong>Secure Provider Messaging:</strong> End-to-end encrypted messaging with clinical staff.</li>
                        <li><strong>Caregiver Proxy Access:</strong> Parents, guardians, or authorized representatives can switch between dependent accounts via the top-bar proxy switcher with verified consent.</li>
                    </ul>
                </section>

            </main>
        </div>
    </div>
    `;
}
