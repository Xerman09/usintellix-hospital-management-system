export function TermsConditionsView(options = {}) {
    const isTab = options && options.isTab === true;

    return `
    <div class="terms-wrapper ${isTab ? 'terms-tab-mode' : 'terms-standalone-mode'}" id="termsConditionsContainer">
        <style>
            .terms-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: var(--text-primary, #1e293b);
                background: var(--bg-page, #f8fafc);
                line-height: 1.65;
                box-sizing: border-box;
                min-height: 100vh;
            }

            .terms-standalone-mode {
                padding: 0;
            }

            .terms-tab-mode {
                padding: 24px;
                min-height: auto;
            }

            /* Standalone Top Bar */
            .terms-topbar {
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

            .terms-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
                color: #ffffff;
            }

            .terms-brand img {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                object-fit: contain;
            }

            .terms-brand-title {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .terms-brand-badge {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.4);
                padding: 2px 8px;
                border-radius: 12px;
                letter-spacing: 0.5px;
            }

            .terms-topbar-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .btn-terms-nav {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.15s ease;
                border: 1px solid transparent;
            }

            .btn-terms-back {
                background: rgba(255, 255, 255, 0.1);
                color: #e2e8f0;
                border-color: rgba(255, 255, 255, 0.15);
            }
            .btn-terms-back:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
            }

            .btn-terms-print {
                background: #0284c7;
                color: #ffffff;
            }
            .btn-terms-print:hover {
                background: #0369a1;
            }

            /* Main Layout */
            .terms-container {
                max-width: 1140px;
                margin: 0 auto;
                padding: 36px 20px 60px;
                display: grid;
                grid-template-columns: 280px 1fr;
                gap: 36px;
                align-items: start;
            }

            .terms-tab-mode .terms-container {
                max-width: 1200px;
                padding: 0;
                gap: 28px;
            }

            /* Sticky Sidebar Navigation */
            .terms-sidebar {
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 20px;
                position: sticky;
                top: 76px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }

            .terms-sidebar-title {
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-muted, #64748b);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .terms-nav-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .terms-nav-item a {
                display: block;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary, #334155);
                text-decoration: none;
                transition: all 0.15s ease;
                border-left: 3px solid transparent;
            }

            .terms-nav-item a:hover {
                background: var(--bg-surface-alt, #f1f5f9);
                color: #0284c7;
            }

            .terms-nav-item.active a {
                background: rgba(2, 132, 199, 0.08);
                color: #0284c7;
                border-left-color: #0284c7;
                font-weight: 600;
            }

            .terms-sidebar-meta {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid var(--border-color, #e2e8f0);
                font-size: 11.5px;
                color: var(--text-muted, #64748b);
            }

            /* Document Main Body */
            .terms-content-card {
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 36px 44px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }

            .terms-doc-header {
                border-bottom: 2px solid var(--border-color, #e2e8f0);
                padding-bottom: 24px;
                margin-bottom: 32px;
            }

            .terms-doc-header h1 {
                font-size: 26px;
                font-weight: 800;
                color: var(--text-primary, #0f172a);
                margin: 0 0 10px;
                line-height: 1.25;
            }

            .terms-doc-subtitle {
                font-size: 15px;
                color: var(--text-muted, #64748b);
                margin-bottom: 14px;
            }

            .terms-meta-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
                font-size: 12px;
            }

            .terms-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 6px;
                background: var(--bg-surface-alt, #f1f5f9);
                color: var(--text-muted, #475569);
                font-weight: 500;
                border: 1px solid var(--border-color, #e2e8f0);
            }

            .terms-pill-verified {
                background: rgba(16, 185, 129, 0.12);
                color: #059669;
                border-color: rgba(16, 185, 129, 0.3);
            }

            /* Critical Medical Disclaimer Banner */
            .terms-alert-box {
                background: rgba(239, 68, 68, 0.08);
                border-left: 4px solid #ef4444;
                border-radius: 0 8px 8px 0;
                padding: 16px 20px;
                margin-bottom: 32px;
                font-size: 13.5px;
                color: var(--text-primary, #1e293b);
            }

            .terms-alert-box strong {
                display: block;
                font-size: 14px;
                color: #dc2626;
                margin-bottom: 6px;
            }

            /* Sections */
            .terms-section {
                margin-bottom: 36px;
                scroll-margin-top: 86px;
            }

            .terms-section h2 {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
                margin: 0 0 14px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .terms-section h3 {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary, #1e293b);
                margin: 18px 0 8px;
            }

            .terms-section p {
                font-size: 14px;
                color: var(--text-primary, #334155);
                margin: 0 0 12px;
                line-height: 1.7;
            }

            .terms-section ul, .terms-section ol {
                margin: 8px 0 16px 24px;
                padding: 0;
                font-size: 14px;
                color: var(--text-primary, #334155);
            }

            .terms-section li {
                margin-bottom: 8px;
                line-height: 1.6;
            }

            .terms-section li strong {
                color: var(--text-primary, #0f172a);
            }

            /* Highlights Cards Grid */
            .terms-cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 14px;
                margin: 18px 0;
            }

            .terms-feature-card {
                background: var(--bg-surface-alt, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
                padding: 14px 16px;
            }

            .terms-feature-title {
                font-size: 13.5px;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .terms-feature-desc {
                font-size: 12.5px;
                color: var(--text-muted, #64748b);
                line-height: 1.5;
                margin: 0;
            }

            /* Legal Entity Card */
            .terms-entity-card {
                background: var(--bg-surface-alt, #f8fafc);
                border: 1px solid var(--border-color, #cbd5e1);
                border-radius: 10px;
                padding: 20px 24px;
                margin-top: 16px;
            }

            .terms-entity-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 12px;
            }

            .entity-info-item {
                font-size: 13px;
            }

            .entity-info-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--text-muted, #64748b);
                letter-spacing: 0.5px;
                margin-bottom: 3px;
            }

            .entity-info-val {
                font-weight: 600;
                color: var(--text-primary, #0f172a);
            }

            /* Responsive */
            @media (max-width: 900px) {
                .terms-container {
                    grid-template-columns: 1fr;
                }
                .terms-sidebar {
                    display: none;
                }
                .terms-content-card {
                    padding: 24px 20px;
                }
                .terms-entity-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* Dark Theme Overrides */
            :root[data-theme="dark"] .terms-wrapper {
                background: #0b1120;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .terms-sidebar,
            :root[data-theme="dark"] .terms-content-card {
                background: #1e293b;
                border-color: #334155;
            }
            :root[data-theme="dark"] .terms-feature-card,
            :root[data-theme="dark"] .terms-entity-card {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .terms-doc-header,
            :root[data-theme="dark"] .terms-section h2 {
                border-color: #334155;
            }
            :root[data-theme="dark"] .terms-alert-box {
                background: rgba(239, 68, 68, 0.15);
                border-left-color: #f87171;
                color: #fca5a5;
            }
            :root[data-theme="dark"] .terms-alert-box strong {
                color: #f87171;
            }
            :root[data-theme="dark"] .terms-nav-item a {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .terms-nav-item a:hover {
                background: #0f172a;
                color: #38bdf8;
            }
            :root[data-theme="dark"] .terms-nav-item.active a {
                background: rgba(56, 189, 248, 0.12);
                color: #38bdf8;
                border-left-color: #38bdf8;
            }

            /* Print Styles */
            @media print {
                .terms-topbar,
                .terms-sidebar,
                .btn-terms-nav {
                    display: none !important;
                }
                .terms-container {
                    grid-template-columns: 1fr !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                }
                .terms-content-card {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                body {
                    background: #ffffff !important;
                    color: #000000 !important;
                }
            }
        </style>

        ${!isTab ? `
        <!-- Standalone Public Top Navigation -->
        <header class="terms-topbar">
            <a href="#/login" class="terms-brand">
                <img src="./assets/logo.png?v=1" alt="USIntellix Logo">
                <span class="terms-brand-title">USIntellix Hospital System</span>
                <span class="terms-brand-badge">Terms of Service</span>
            </a>
            <div class="terms-topbar-actions">
                <button type="button" class="btn-terms-nav btn-terms-print" id="btnTermsPrint">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Terms
                </button>
                <a href="#/login" class="btn-terms-nav btn-terms-back" id="btnTermsBack">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to Login
                </a>
            </div>
        </header>
        ` : `
        <!-- In-Tab Action Strip -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--bg-surface); padding: 12px 18px; border: 1px solid var(--border-color); border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">⚖️</span>
                <div>
                    <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Hospital System Terms & Conditions of Service</h3>
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted);">Legal Terms of Use, Clinical Authorization & System Governance</p>
                </div>
            </div>
            <button type="button" class="btn-terms-nav btn-terms-print" id="btnTermsPrint" style="border: none;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save PDF
            </button>
        </div>
        `}

        <div class="terms-container">
            <!-- Sidebar Table of Contents -->
            <aside class="terms-sidebar">
                <div class="terms-sidebar-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    Table of Contents
                </div>
                <ul class="terms-nav-list">
                    <li class="terms-nav-item active"><a href="#terms-section-agreement">1. Agreement to Terms</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-eligibility">2. Permitted Users & Roles</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-security">3. Account Security & Credentials</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-medical-disclaimer">4. Medical Advice & Emergencies</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-phi">5. PHI & HIPAA Compliance</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-signatures">6. Electronic Signatures & Orders</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-telehealth">7. Telehealth & Messaging</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-conduct">8. Prohibited Conduct</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-ip">9. Intellectual Property</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-liability">10. Limitation of Liability</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-availability">11. Service Availability & Maintenance</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-termination">12. Suspension & Termination</a></li>
                    <li class="terms-nav-item"><a href="#terms-section-law">13. Governing Law & Contact</a></li>
                </ul>
                <div class="terms-sidebar-meta">
                    <div><strong>Effective Date:</strong> September 20, 2026</div>
                    <div style="margin-top: 4px;"><strong>Jurisdiction:</strong> Federal Healthcare Law (USA)</div>
                    <div style="margin-top: 4px;"><strong>Status:</strong> Active & Binding</div>
                </div>
            </aside>

            <!-- Document Content -->
            <main class="terms-content-card">
                <!-- Header -->
                <header class="terms-doc-header">
                    <h1>Terms & Conditions of Service (Terms of Use)</h1>
                    <div class="terms-doc-subtitle">USIntellix Hospital Management System & Digital Healthcare Platform</div>
                    <div class="terms-meta-pills">
                        <span class="terms-pill terms-pill-verified">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Legally Binding Agreement
                        </span>
                        <span class="terms-pill">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Last Updated: September 20, 2026
                        </span>
                        <span class="terms-pill">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            HIPAA Security Safeguards
                        </span>
                    </div>
                </header>

                <!-- Critical Medical Alert Banner -->
                <div class="terms-alert-box">
                    <strong>EMERGENCY MEDICAL NOTICE: DO NOT USE THIS PLATFORM FOR MEDICAL EMERGENCIES.</strong>
                    If you or someone you are assisting is experiencing a life-threatening medical crisis, chest pain, severe bleeding, breathing difficulty, or an acute psychiatric emergency, immediately call <strong>911</strong> or proceed to the nearest hospital Emergency Room. This software platform is not designed to support emergency response dispatch.
                </div>

                <!-- Section 1: Agreement -->
                <section class="terms-section" id="terms-section-agreement">
                    <h2>
                        <span>1. Agreement to Terms</span>
                    </h2>
                    <p>
                        These Terms and Conditions of Service ("Terms", "Agreement") constitute a legally binding agreement between you ("User", "you", or "your") and <strong>USIntellix Hospital Management System</strong> ("USIntellix", "Hospital", "we", "us", or "our") governing your access to and utilization of our electronic medical records, clinical workstations, patient portals, inpatient ADT modules, telemetry feeds, and telehealth applications.
                    </p>
                    <p>
                        By logging into, accessing, or interacting with any segment of this software platform, you expressly certify that you have read, understood, and agreed to be bound by all terms, conditions, and disclaimers contained herein. If you do not agree, you must immediately terminate your session and refrain from further use.
                    </p>
                </section>

                <!-- Section 2: Permitted Users & Roles -->
                <section class="terms-section" id="terms-section-eligibility">
                    <h2>
                        <span>2. Permitted Users & Role-Based Access</span>
                    </h2>
                    <p>
                        Access to USIntellix is restricted strictly to authorized individuals operating under authenticated, role-based security clearance:
                    </p>
                    <div class="terms-cards-grid">
                        <div class="terms-feature-card">
                            <div class="terms-feature-title">
                                <span>🩺 Licensed Clinicians</span>
                            </div>
                            <p class="terms-feature-desc">Attending physicians, surgeons, residents, and nurse practitioners authorized to record clinical diagnoses, issue inpatient admission/discharge orders, and prescribe medications.</p>
                        </div>
                        <div class="terms-feature-card">
                            <div class="terms-feature-title">
                                <span>📋 Nursing & Allied Care</span>
                            </div>
                            <p class="terms-feature-desc">Registered nurses and clinical specialists authorized to administer medications, log patient flow vitals, and coordinate bed-to-bed transfers and care plans.</p>
                        </div>
                        <div class="terms-feature-card">
                            <div class="terms-feature-title">
                                <span>🏢 Reception & Front Desk</span>
                            </div>
                            <p class="terms-feature-desc">Authorized administrative personnel managing patient demographics, room and bed availability reservations, scheduling, and billing check-ins.</p>
                        </div>
                        <div class="terms-feature-card">
                            <div class="terms-feature-title">
                                <span>👤 Registered Patients</span>
                            </div>
                            <p class="terms-feature-desc">Individual patients and their legally designated personal representatives accessing their own personal health summaries, appointments, and secure messaging.</p>
                        </div>
                    </div>
                </section>

                <!-- Section 3: Account Security -->
                <section class="terms-section" id="terms-section-security">
                    <h2>
                        <span>3. Account Security & Credential Integrity</span>
                    </h2>
                    <p>
                        Due to the sensitive clinical nature of electronic Protected Health Information (ePHI), all users must adhere to strict cybersecurity safeguards:
                    </p>
                    <ul>
                        <li><strong>Individual Credentials:</strong> Accounts are strictly non-transferable. You may not share your username, password, cryptographic token, or biometric credentials with any other employee, clinician, family member, or third party.</li>
                        <li><strong>Password Complexity:</strong> Passwords must meet institutional complexity requirements (minimum 8 characters, combining uppercase, lowercase, numerical, and special characters) and must be rotated in accordance with hospital policy.</li>
                        <li><strong>Multi-Factor Authentication (MFA):</strong> When MFA is provisioned, you must verify access using your registered authentication device for every remote or sensitive session.</li>
                        <li><strong>Immediate Incident Reporting:</strong> You agree to immediately notify the Hospital Information Security Office if you suspect that your login credentials have been compromised or disclosed to an unauthorized party.</li>
                    </ul>
                </section>

                <!-- Section 4: Medical Disclaimer -->
                <section class="terms-section" id="terms-section-medical-disclaimer">
                    <h2>
                        <span>4. Medical Advice Disclaimer & Clinical Discretion</span>
                    </h2>
                    <p>
                        <strong>For Patients:</strong> The patient portal, electronic reminders, and health summaries are informational tools designed to augment your relationship with your healthcare providers. They do not substitute for professional in-person medical diagnosis, physical examinations, or specialized clinical advice. Always seek the advice of your physician regarding any medical condition.
                    </p>
                    <p>
                        <strong>For Clinicians:</strong> Automated decision support tools, drug interaction alerts, surgical checklists, and length-of-stay algorithms provided within USIntellix are assistive clinical aids. Licensed healthcare providers retain sole, independent medical judgment and professional responsibility for all clinical diagnoses, treatments, surgical interventions, and pharmaceutical prescriptions rendered.
                    </p>
                </section>

                <!-- Section 5: PHI & HIPAA Compliance -->
                <section class="terms-section" id="terms-section-phi">
                    <h2>
                        <span>5. Protected Health Information (PHI) & HIPAA Compliance</span>
                    </h2>
                    <p>
                        All users agree to comply fully with the Health Insurance Portability and Accountability Act of 1996 (HIPAA), the Health Information Technology for Economic and Clinical Health (HITECH) Act, and our official <a href="#/privacy-policy" style="color: #0284c7; text-decoration: underline; font-weight: 600;">Notice of Privacy Practices</a>.
                    </p>
                    <ul>
                        <li><strong>Need-to-Know Standard:</strong> Hospital personnel are authorized to view and interact only with patient records for which they possess a verified, legitimate clinical or administrative need.</li>
                        <li><strong>Snooping Prohibited:</strong> Viewing charts of family members, acquaintances, VIP patients, coworkers, or any individual without direct clinical assignment is an egregious violation of federal law and grounds for immediate employment termination and regulatory reporting.</li>
                        <li><strong>Screen Privacy:</strong> When operating workstations in patient-accessible areas, staff must use screen privacy filters and ensure that displays are locked when leaving the desk.</li>
                    </ul>
                </section>

                <!-- Section 6: Electronic Signatures -->
                <section class="terms-section" id="terms-section-signatures">
                    <h2>
                        <span>6. Electronic Signatures, Clinical Orders & Record Integrity</span>
                    </h2>
                    <p>
                        In accordance with the federal Electronic Signatures in Global and National Commerce Act (ESIGN) and Uniform Electronic Transactions Act (UETA):
                    </p>
                    <ul>
                        <li>Your secure digital login and entry of a signature credential constitutes a legally binding electronic signature having the identical legal weight and enforceability as a handwritten signature.</li>
                        <li>All clinical encounter notes, diagnostic interpretations, surgical operative summaries, laboratory verifications, and pharmaceutical prescription orders signed within the system become part of the immutable permanent medical-legal record.</li>
                        <li>Retroactive amendments or alterations to signed records must adhere to standardized medical chart addendum procedures and are permanently tracked within tamper-evident audit logs.</li>
                    </ul>
                </section>

                <!-- Section 7: Telehealth & Messaging -->
                <section class="terms-section" id="terms-section-telehealth">
                    <h2>
                        <span>7. Telehealth & Remote Communication Guidelines</span>
                    </h2>
                    <p>
                        When utilizing secure messaging, teleconsultation, or remote monitoring modules:
                    </p>
                    <ul>
                        <li>Secure messages are intended for non-urgent clinical queries, appointment confirmations, and routine follow-up questions. Clinicians review messages during standard outpatient office hours.</li>
                        <li>All communications conducted via patient messaging are preserved and may be incorporated directly into the patient's medical chart.</li>
                        <li>Users agree not to send offensive, abusive, defamatory, or unlawful content across secure messaging channels.</li>
                    </ul>
                </section>

                <!-- Section 8: Prohibited Conduct -->
                <section class="terms-section" id="terms-section-conduct">
                    <h2>
                        <span>8. Prohibited Conduct & System Misuse</span>
                    </h2>
                    <p>Users shall not engage in any activity that compromises the integrity, availability, or security of the platform. Specifically prohibited actions include:</p>
                    <ul>
                        <li>Attempting to reverse-engineer, decompile, disassemble, or extract source code from the software application.</li>
                        <li>Deploying automated scrapers, bots, spiders, or crawlers to extract medical or patient directory data.</li>
                        <li>Introducing viruses, trojans, ransomware, worms, or other malicious code into hospital networks.</li>
                        <li>Circumventing, disabling, or probing security authentication controls, role gates, or network firewalls.</li>
                        <li>Exporting or transmitting unencrypted patient health data to personal email accounts, unauthorized USB storage devices, or unapproved third-party clouds.</li>
                    </ul>
                </section>

                <!-- Section 9: Intellectual Property -->
                <section class="terms-section" id="terms-section-ip">
                    <h2>
                        <span>9. Intellectual Property & Software License</span>
                    </h2>
                    <p>
                        The USIntellix software architecture, graphical user interfaces, database schemas, clinical workflow modules, surgical safety algorithms, logos, and documentation are the exclusive proprietary property of USIntellix Healthcare Systems and its licensors.
                    </p>
                    <p>
                        Authorized users are granted a limited, non-exclusive, non-transferable, revocable license to access the platform solely for internal healthcare delivery and patient management purposes in accordance with these Terms.
                    </p>
                </section>

                <!-- Section 10: Limitation of Liability -->
                <section class="terms-section" id="terms-section-liability">
                    <h2>
                        <span>10. Warranty Disclaimer & Limitation of Liability</span>
                    </h2>
                    <p>
                        Except as required by applicable healthcare regulations, the software platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express, implied, or statutory.
                    </p>
                    <p>
                        To the maximum extent permitted by law, USIntellix, its affiliates, directors, officers, software engineers, and suppliers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of the use of or inability to use the platform, including network outages, data transmission failures, or delays resulting from telecommunication carriers.
                    </p>
                </section>

                <!-- Section 11: Service Availability -->
                <section class="terms-section" id="terms-section-availability">
                    <h2>
                        <span>11. Service Availability, Backups & Scheduled Maintenance</span>
                    </h2>
                    <p>
                        We strive to maintain 99.9% uptime for core clinical EHR and inpatient ADT systems. However, routine maintenance, emergency security patching, and server updates may occasionally require brief scheduled downtimes.
                    </p>
                    <p>
                        All clinical facilities maintain offline paper charting procedures and redundant encrypted failover backups to guarantee patient care continuity during unforeseen technological outages.
                    </p>
                </section>

                <!-- Section 12: Suspension & Termination -->
                <section class="terms-section" id="terms-section-termination">
                    <h2>
                        <span>12. Suspension & Termination of Access</span>
                    </h2>
                    <p>
                        USIntellix reserves the right to immediately suspend, restrict, or revoke access to any account without prior notice if:
                    </p>
                    <ul>
                        <li>A security breach, credential leakage, or unauthorized chart snooping incident is detected.</li>
                        <li>An employee or contractor departs the institution or changes clinical credential status.</li>
                        <li>A user engages in material violation of these Terms of Service or hospital governance policies.</li>
                    </ul>
                </section>

                <!-- Section 13: Governing Law -->
                <section class="terms-section" id="terms-section-law">
                    <h2>
                        <span>13. Governing Law, Dispute Resolution & Legal Inquiries</span>
                    </h2>
                    <p>
                        These Terms and any disputes arising from your use of the system shall be governed by and construed in accordance with federal healthcare statutes and applicable state laws, without regard to conflicts of law principles.
                    </p>

                    <div class="terms-entity-card">
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                            USIntellix Office of Legal Affairs & Compliance
                        </div>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
                            Hospital Risk Management, Legal Affairs & Regulatory Governance
                        </p>
                        <div class="terms-entity-grid">
                            <div class="entity-info-item">
                                <div class="entity-info-label">General Counsel & Compliance</div>
                                <div class="entity-info-val">Office of Legal Counsel</div>
                            </div>
                            <div class="entity-info-item">
                                <div class="entity-info-label">Legal Inquiries Telephone</div>
                                <div class="entity-info-val">(800) 555-0199 / Ext. 4080</div>
                            </div>
                            <div class="entity-info-item">
                                <div class="entity-info-label">Official Legal Email</div>
                                <div class="entity-info-val">legal@usintellix-hospital.com</div>
                            </div>
                            <div class="entity-info-item">
                                <div class="entity-info-label">Headquarters Address</div>
                                <div class="entity-info-val">100 Healthcare Boulevard, Legal Pavilion, Suite 600</div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    </div>
    `;
}
