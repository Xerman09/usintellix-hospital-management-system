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
                <a href="#sec-hipaa-anticache" class="sysdoc-nav-item hipaa-highlight">Anti-Caching &amp; Transmission</a>
                <a href="#sec-hipaa-privacy" class="sysdoc-nav-item hipaa-highlight">Accounting of Disclosures &amp; Privacy</a>

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
                        </tbody>
                    </table>
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
                        <ul style="margin: 6px 0 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
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

                <!-- SECTION: ACCOUNTING OF DISCLOSURES & PRIVACY -->
                <section id="sec-hipaa-privacy" class="sysdoc-card hipaa-card">
                    <div class="sysdoc-section-header">
                        <h2 class="sysdoc-section-title">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><circle cx="11" cy="14" r="3"></circle><line x1="17" y1="14" x2="14" y2="14"></line></svg>
                            Accounting of Disclosures &amp; Privacy Rule (§ 164.528 &amp; § 164.520)
                        </h2>
                        <span class="sysdoc-badge sysdoc-badge-green">Privacy Safeguards</span>
                    </div>
                    <p>
                        Under the HIPAA Privacy Rule, patients are entitled to an accounting of non-routine disclosures of their health records.
                    </p>
                    <div class="sysdoc-rule-box">
                        <div class="sysdoc-rule-title">Disclosure Tracking Module</div>
                        <div>Tracks recipient agency, date, purpose, legal basis (e.g. public health mandate, court order, payer audit), and specific clinical documents disclosed. Accessible under <strong>Miscellaneous &rarr; Disclosures</strong>.</div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px;">
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }">
                            <span>Open Notice of Privacy Practices</span>
                        </button>
                        <button type="button" class="sysdoc-btn-secondary" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('terms_conditions', 'Terms &amp; Conditions'); } else { window.location.hash = '#/terms-conditions'; }">
                            <span>Open Terms of Service</span>
                        </button>
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
