export function PrivacyPolicyView(options = {}) {
    const isTab = options && options.isTab === true;

    return `
    <div class="privacy-policy-wrapper ${isTab ? 'privacy-tab-mode' : 'privacy-standalone-mode'}" id="privacyPolicyContainer">
        <style>
            .privacy-policy-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: var(--text-primary, #1e293b);
                background: var(--bg-page, #f8fafc);
                line-height: 1.65;
                box-sizing: border-box;
                min-height: 100vh;
            }

            .privacy-standalone-mode {
                padding: 0;
            }

            .privacy-tab-mode {
                padding: 24px;
                min-height: auto;
            }

            /* Standalone Top Bar */
            .privacy-topbar {
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

            .privacy-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
                color: #ffffff;
            }

            .privacy-brand img {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                object-fit: contain;
            }

            .privacy-brand-title {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .privacy-brand-badge {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                background: rgba(56, 189, 248, 0.2);
                color: #38bdf8;
                border: 1px solid rgba(56, 189, 248, 0.4);
                padding: 2px 8px;
                border-radius: 12px;
                letter-spacing: 0.5px;
            }

            .privacy-topbar-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .btn-privacy-nav {
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

            .btn-privacy-back {
                background: rgba(255, 255, 255, 0.1);
                color: #e2e8f0;
                border-color: rgba(255, 255, 255, 0.15);
            }
            .btn-privacy-back:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
            }

            .btn-privacy-print {
                background: #0284c7;
                color: #ffffff;
            }
            .btn-privacy-print:hover {
                background: #0369a1;
            }

            /* Main Layout */
            .privacy-container {
                max-width: 1140px;
                margin: 0 auto;
                padding: 36px 20px 60px;
                display: grid;
                grid-template-columns: 280px 1fr;
                gap: 36px;
            }

            .privacy-tab-mode .privacy-container {
                max-width: 1200px;
                padding: 0;
                gap: 28px;
            }

            /* Grid item is stretched to match the content column's full
               height (default align-items: stretch) purely so the sticky
               box below has room to travel down the whole document --
               this wrapper itself stays invisible/unstyled. */
            .privacy-sidebar-col {
                min-width: 0;
            }

            /* Sticky Sidebar Navigation */
            .privacy-sidebar {
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 20px;
                position: sticky;
                top: 76px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }

            .privacy-sidebar-title {
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

            .privacy-nav-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .privacy-nav-item a {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary, #334155);
                text-decoration: none;
                transition: all 0.15s ease;
                border-left: 3px solid transparent;
            }

            .privacy-nav-num {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--bg-surface-alt, #f1f5f9);
                color: var(--text-muted, #64748b);
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
                transition: all 0.15s ease;
            }

            .privacy-nav-item a:hover .privacy-nav-num,
            .privacy-nav-item.active .privacy-nav-num {
                background: #0284c7;
                color: #ffffff;
            }

            .privacy-nav-item a:hover {
                background: var(--bg-surface-alt, #f1f5f9);
                color: #0284c7;
                transform: translateX(2px);
            }

            .privacy-nav-item.active a {
                background: rgba(2, 132, 199, 0.08);
                color: #0284c7;
                border-left-color: #0284c7;
                font-weight: 600;
            }

            .privacy-sidebar-meta {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid var(--border-color, #e2e8f0);
                font-size: 11.5px;
                color: var(--text-muted, #64748b);
            }

            /* Document Main Body */
            .privacy-content-card {
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 36px 44px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }

            .privacy-doc-header {
                border-bottom: 2px solid var(--border-color, #e2e8f0);
                padding-bottom: 24px;
                margin-bottom: 32px;
            }

            .privacy-doc-header h1 {
                font-size: 26px;
                font-weight: 800;
                color: var(--text-primary, #0f172a);
                margin: 0 0 10px;
                line-height: 1.25;
            }

            .privacy-doc-subtitle {
                font-size: 15px;
                color: var(--text-muted, #64748b);
                margin-bottom: 14px;
            }

            .privacy-meta-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
                font-size: 12px;
            }

            .privacy-pill {
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

            .privacy-pill-verified {
                background: rgba(16, 185, 129, 0.12);
                color: #059669;
                border-color: rgba(16, 185, 129, 0.3);
            }

            /* In-Tab Header Icon Badge */
            .privacy-tab-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                border-radius: 10px;
                background: rgba(2, 132, 199, 0.1);
                color: #0284c7;
                flex-shrink: 0;
            }

            /* Legal Notice Banner */
            .privacy-notice-box {
                background: rgba(2, 132, 199, 0.08);
                border-left: 4px solid #0284c7;
                border-radius: 0 8px 8px 0;
                padding: 16px 20px;
                margin-bottom: 32px;
                font-size: 13.5px;
                color: var(--text-primary, #1e293b);
                display: flex;
                gap: 14px;
                align-items: flex-start;
            }

            .privacy-notice-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: rgba(2, 132, 199, 0.15);
                color: #0284c7;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .privacy-notice-box strong {
                display: block;
                font-size: 14px;
                color: #0284c7;
                margin-bottom: 6px;
            }

            /* Sections */
            .privacy-section {
                margin-bottom: 36px;
                scroll-margin-top: 86px;
            }

            .privacy-section h2 {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
                margin: 0 0 14px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .privacy-section-num {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: rgba(2, 132, 199, 0.1);
                color: #0284c7;
                font-size: 14px;
                font-weight: 800;
                flex-shrink: 0;
            }

            .privacy-section h3 {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary, #1e293b);
                margin: 18px 0 8px;
            }

            .privacy-section p {
                font-size: 14px;
                color: var(--text-primary, #334155);
                margin: 0 0 12px;
                line-height: 1.7;
            }

            .privacy-section ul, .privacy-section ol {
                margin: 8px 0 16px 24px;
                padding: 0;
                font-size: 14px;
                color: var(--text-primary, #334155);
            }

            .privacy-section li {
                margin-bottom: 8px;
                line-height: 1.6;
            }

            .privacy-section li strong {
                color: var(--text-primary, #0f172a);
            }

            /* Highlights Grid */
            .privacy-cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 14px;
                margin: 18px 0;
            }

            .privacy-feature-card {
                background: var(--bg-surface-alt, #f8fafc);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
                padding: 14px 16px;
            }

            .privacy-feature-title {
                font-size: 13.5px;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .privacy-feature-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 6px;
                background: rgba(2, 132, 199, 0.1);
                color: #0284c7;
                flex-shrink: 0;
            }

            .privacy-feature-desc {
                font-size: 12.5px;
                color: var(--text-muted, #64748b);
                line-height: 1.5;
                margin: 0;
            }

            /* Contact / Officer Box */
            .privacy-officer-card {
                background: var(--bg-surface-alt, #f8fafc);
                border: 1px solid var(--border-color, #cbd5e1);
                border-radius: 10px;
                padding: 20px 24px;
                margin-top: 16px;
            }

            .privacy-officer-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 12px;
            }

            .officer-info-item {
                font-size: 13px;
            }

            .officer-info-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--text-muted, #64748b);
                letter-spacing: 0.5px;
                margin-bottom: 3px;
            }

            .officer-info-val {
                font-weight: 600;
                color: var(--text-primary, #0f172a);
            }

            /* Responsive */
            @media (max-width: 900px) {
                .privacy-container {
                    grid-template-columns: 1fr;
                }
                .privacy-sidebar-col {
                    display: none;
                }
                .privacy-content-card {
                    padding: 24px 20px;
                }
                .privacy-officer-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* Dark Theme Overrides */
            :root[data-theme="dark"] .privacy-policy-wrapper {
                background: #0b1120;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .privacy-sidebar,
            :root[data-theme="dark"] .privacy-content-card {
                background: #1e293b;
                border-color: #334155;
            }
            :root[data-theme="dark"] .privacy-feature-card,
            :root[data-theme="dark"] .privacy-officer-card {
                background: #0f172a;
                border-color: #334155;
            }
            :root[data-theme="dark"] .privacy-doc-header,
            :root[data-theme="dark"] .privacy-section h2 {
                border-color: #334155;
            }
            :root[data-theme="dark"] .privacy-notice-box {
                background: rgba(2, 132, 199, 0.15);
                border-left-color: #38bdf8;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .privacy-notice-box strong {
                color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-nav-item a {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .privacy-nav-item a:hover {
                background: #0f172a;
                color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-nav-item.active a {
                background: rgba(56, 189, 248, 0.12);
                color: #38bdf8;
                border-left-color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-nav-num {
                background: #0f172a;
            }
            :root[data-theme="dark"] .privacy-nav-item a:hover .privacy-nav-num,
            :root[data-theme="dark"] .privacy-nav-item.active .privacy-nav-num {
                background: #38bdf8;
                color: #0b1120;
            }
            :root[data-theme="dark"] .privacy-section-num {
                background: rgba(56, 189, 248, 0.15);
                color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-tab-icon {
                background: rgba(56, 189, 248, 0.15);
                color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-notice-icon {
                background: rgba(56, 189, 248, 0.2);
                color: #38bdf8;
            }
            :root[data-theme="dark"] .privacy-feature-icon {
                background: rgba(56, 189, 248, 0.15);
                color: #38bdf8;
            }

            /* Print Styles */
            @media print {
                .privacy-topbar,
                .privacy-sidebar-col,
                .btn-privacy-nav {
                    display: none !important;
                }
                .privacy-container {
                    grid-template-columns: 1fr !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                }
                .privacy-content-card {
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
        <header class="privacy-topbar">
            <a href="#/login" class="privacy-brand">
                <img src="./assets/logo.png?v=1" alt="USIntellix Logo">
                <span class="privacy-brand-title">USIntellix Hospital System</span>
                <span class="privacy-brand-badge">HIPAA Compliant</span>
            </a>
            <div class="privacy-topbar-actions">
                <button type="button" class="btn-privacy-nav btn-privacy-print" id="btnPrivacyPrint">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Policy
                </button>
                <a href="#/login" class="btn-privacy-nav btn-privacy-back" id="btnPrivacyBack">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to Login
                </a>
            </div>
        </header>
        ` : `
        <!-- In-Tab Action Strip -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--bg-surface); padding: 12px 18px; border: 1px solid var(--border-color); border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <span class="privacy-tab-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                </span>
                <div>
                    <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Hospital Privacy Policy & Notice of Privacy Practices</h3>
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted);">Protected Health Information (PHI) Governance & Patient Rights</p>
                </div>
            </div>
            <button type="button" class="btn-privacy-nav btn-privacy-print" id="btnPrivacyPrint" style="border: none;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save PDF
            </button>
        </div>
        `}

        <div class="privacy-container">
            <!-- Sidebar Table of Contents -->
            <aside class="privacy-sidebar-col">
              <div class="privacy-sidebar">
                <div class="privacy-sidebar-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    Table of Contents
                </div>
                <ul class="privacy-nav-list">
                    <li class="privacy-nav-item active"><a href="#section-overview"><span class="privacy-nav-num">1</span>Notice of Privacy Practices</a></li>
                    <li class="privacy-nav-item"><a href="#section-information"><span class="privacy-nav-num">2</span>Information We Collect</a></li>
                    <li class="privacy-nav-item"><a href="#section-uses"><span class="privacy-nav-num">3</span>Permissible Uses & Disclosures</a></li>
                    <li class="privacy-nav-item"><a href="#section-authorizations"><span class="privacy-nav-num">4</span>When Authorization is Required</a></li>
                    <li class="privacy-nav-item"><a href="#section-rights"><span class="privacy-nav-num">5</span>Your Patient Privacy Rights</a></li>
                    <li class="privacy-nav-item"><a href="#section-security"><span class="privacy-nav-num">6</span>Security & Data Protection</a></li>
                    <li class="privacy-nav-item"><a href="#section-business-associates"><span class="privacy-nav-num">7</span>Business Associates</a></li>
                    <li class="privacy-nav-item"><a href="#section-breach"><span class="privacy-nav-num">8</span>Breach Notification Protocol</a></li>
                    <li class="privacy-nav-item"><a href="#section-retention"><span class="privacy-nav-num">9</span>Data Retention & Disposal</a></li>
                    <li class="privacy-nav-item"><a href="#section-contact"><span class="privacy-nav-num">10</span>Privacy Officer & Complaints</a></li>
                </ul>
                <div class="privacy-sidebar-meta">
                    <div><strong>Effective Date:</strong> September 20, 2026</div>
                    <div style="margin-top: 4px;"><strong>Jurisdiction:</strong> Federal HIPAA & HITECH (USA)</div>
                    <div style="margin-top: 4px;"><strong>Version:</strong> 2.4.0 (Enterprise)</div>
                </div>
              </div>
            </aside>

            <!-- Document Content -->
            <main class="privacy-content-card">
                <!-- Header -->
                <header class="privacy-doc-header">
                    <h1>Notice of Privacy Practices & Patient Data Protection Policy</h1>
                    <div class="privacy-doc-subtitle">USIntellix Hospital Management System & Healthcare Enterprise</div>
                    <div class="privacy-meta-pills">
                        <span class="privacy-pill privacy-pill-verified">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            HIPAA Omnibus Rule Compliant
                        </span>
                        <span class="privacy-pill">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Last Reviewed: September 20, 2026
                        </span>
                        <span class="privacy-pill">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            HITECH & NIST 800-53 Certified Controls
                        </span>
                    </div>
                </header>

                <!-- Legal Notice Banner -->
                <div class="privacy-notice-box">
                    <span class="privacy-notice-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </span>
                    <div>
                        <strong>THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.</strong>
                        USIntellix Hospital Management System is committed to safeguarding your Protected Health Information (PHI). We are mandated by federal law under the Health Insurance Portability and Accountability Act of 1996 (HIPAA) to maintain the privacy of your health records, provide you with this comprehensive notice, and notify you in the event of an unauthorized security breach.
                    </div>
                </div>

                <!-- Section 1: Overview -->
                <section class="privacy-section" id="section-overview">
                    <h2>
                        <span class="privacy-section-num">1</span>
                        <span>Notice of Privacy Practices & Legal Duties</span>
                    </h2>
                    <p>
                        This Notice of Privacy Practices applies to all physical facilities, electronic health records (EHR), clinical laboratories, surgical suites, inpatient wards, pharmacy portals, telemedicine interactions, and online communication services operated under USIntellix Hospital Management System.
                    </p>
                    <p>
                        Under the HIPAA Privacy and Security Rules (45 C.F.R. Parts 160 and 164), our hospital and covered entities are legally bound to:
                    </p>
                    <ul>
                        <li><strong>Maintain Confidentiality:</strong> Ensure that your medical records and Protected Health Information (PHI) remain confidential and protected from unauthorized access or alteration.</li>
                        <li><strong>Provide Timely Notice:</strong> Supply each patient upon registration, admission, or consultation with this Notice detailing our legal duties and operational privacy practices.</li>
                        <li><strong>Abide by Notice Terms:</strong> Adhere strictly to the privacy terms currently in effect.</li>
                        <li><strong>Minimum Necessary Standard:</strong> Restrict internal access and external disclosures to the minimal amount of health information necessary to accomplish the intended healthcare or administrative purpose.</li>
                    </ul>
                </section>

                <!-- Section 2: Information We Collect -->
                <section class="privacy-section" id="section-information">
                    <h2>
                        <span class="privacy-section-num">2</span>
                        <span>Information We Collect</span>
                    </h2>
                    <p>
                        During your outpatient visits, emergency consultations, inpatient stays, or administrative interactions, our healthcare professionals and digital systems collect and maintain categories of personal data:
                    </p>
                    <div class="privacy-cards-grid">
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><circle cx="8" cy="12" r="2"></circle><line x1="14" y1="10" x2="18" y2="10"></line><line x1="14" y1="14" x2="18" y2="14"></line></svg></span>
                                <span>Demographics & Identity</span>
                            </div>
                            <p class="privacy-feature-desc">Full legal name, date of birth, social security number, government ID, residential address, emergency contacts, legal guardians, and communication preferences.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></span>
                                <span>Clinical & Medical History</span>
                            </div>
                            <p class="privacy-feature-desc">Vital signs, diagnoses, treatment notes, surgical operative records, medications, immunization history, allergies, pathology findings, and diagnostic imaging (DICOM).</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></span>
                                <span>Billing & Insurance</span>
                            </div>
                            <p class="privacy-feature-desc">Health insurance policy numbers, claims, coverage eligibility verification, payment records, superbills, guarantor details, and billing encounter histories.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>
                                <span>Audit & Digital Metadata</span>
                            </div>
                            <p class="privacy-feature-desc">Portal login sessions, IP addresses, digital electronic signatures, timestamped chart access audit records, and patient portal communication transcripts.</p>
                        </div>
                    </div>
                </section>

                <!-- Section 3: Permissible Uses & Disclosures -->
                <section class="privacy-section" id="section-uses">
                    <h2>
                        <span class="privacy-section-num">3</span>
                        <span>How We Use and Disclose Health Information (TPO)</span>
                    </h2>
                    <p>
                        The HIPAA Privacy Rule permits USIntellix Hospital System to use and disclose your Protected Health Information without prior written consent for three primary purposes known collectively as <strong>Treatment, Payment, and Health Care Operations (TPO)</strong>:
                    </p>
                    <ul>
                        <li>
                            <strong>For Treatment:</strong> Your medical information is shared among attending physicians, surgeons, consulting clinicians, nurses, pharmacists, laboratory technicians, and emergency personnel involved in your direct clinical care. For example, a physician treating you for pneumonia may review your previous allergy history or share blood culture results with an infectious disease specialist.
                        </li>
                        <li>
                            <strong>For Payment:</strong> We use your PHI to bill and collect payment from you, your health insurance provider, HMO, Medicare, Medicaid, or other third-party payers. This includes submitting diagnostic and procedure codes, verifying coverage eligibility, pre-authorizing surgical procedures, and processing insurance claims.
                        </li>
                        <li>
                            <strong>For Health Care Operations:</strong> We utilize medical data for hospital administrative activities including clinical quality assurance reviews, surgical safety auditing, accreditation by Joint Commission (JCAHO), medical staff credentialing, electronic system monitoring, and training of licensed healthcare personnel.
                        </li>
                    </ul>

                    <h3>Additional Permitted Uses Without Prior Authorization</h3>
                    <p>Under specific federal and state statutory conditions, we may disclose your information without prior consent to:</p>
                    <ul>
                        <li><strong>Public Health Authorities:</strong> To prevent or control disease outbreaks, report vital statistics (births, deaths), report adverse pharmaceutical reactions, or report communicable diseases.</li>
                        <li><strong>Health Oversight Agencies:</strong> For audits, civil, administrative, or criminal investigations, and licensing inspections mandated by law.</li>
                        <li><strong>Judicial & Administrative Proceedings:</strong> In response to valid court orders, subpoenas, or discovery requests complying with federal procedural guidelines.</li>
                        <li><strong>Law Enforcement & National Security:</strong> As required by law to locate missing persons, report criminal violence, or avert a serious and imminent threat to individual or public safety.</li>
                        <li><strong>Organ & Tissue Donation:</strong> To organ procurement organizations for organ, eye, or tissue donation and transplantation purposes.</li>
                        <li><strong>Coroners & Medical Examiners:</strong> To identify deceased persons or determine cause of death.</li>
                    </ul>
                </section>

                <!-- Section 4: Authorizations Required -->
                <section class="privacy-section" id="section-authorizations">
                    <h2>
                        <span class="privacy-section-num">4</span>
                        <span>When Explicit Written Authorization is Required</span>
                    </h2>
                    <p>
                        Any use or disclosure of your medical information outside the routine purposes specified above requires your explicit, voluntary written consent. You have the full right to revoke an authorization at any time in writing, except to the extent that our hospital has already acted upon it.
                    </p>
                    <p>Specifically, we will <strong>never</strong> perform the following without your signed authorization:</p>
                    <ul>
                        <li><strong>Marketing Activities:</strong> We do not sell or disclose your patient contact details or clinical records to pharmaceutical companies, commercial third parties, or marketing agencies for promotional purposes.</li>
                        <li><strong>Sale of Protected Health Information:</strong> USIntellix will never sell your patient records or PHI for financial remuneration.</li>
                        <li><strong>Psychotherapy Notes:</strong> Specialized psychotherapy notes recorded by mental health professionals are maintained with heightened security barriers and require specific patient authorization to release.</li>
                    </ul>
                </section>

                <!-- Section 5: Patient Rights -->
                <section class="privacy-section" id="section-rights">
                    <h2>
                        <span class="privacy-section-num">5</span>
                        <span>Your Patient Privacy Rights</span>
                    </h2>
                    <p>As a patient in our healthcare network, federal law guarantees you substantial rights regarding your protected health records:</p>

                    <div class="privacy-cards-grid">
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>
                                <span>Right to Inspect & Copy</span>
                            </div>
                            <p class="privacy-feature-desc">You have the right to inspect and obtain an electronic or paper copy of your medical charts, billing records, and clinical lab results within 30 calendar days of written request.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span>
                                <span>Right to Amend Records</span>
                            </div>
                            <p class="privacy-feature-desc">If you believe information in your health record is inaccurate or incomplete, you may submit a formal request for an amendment to be appended to your medical file.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg></span>
                                <span>Accounting of Disclosures</span>
                            </div>
                            <p class="privacy-feature-desc">You have the right to request a formal list (accounting) of specific disclosures of your health information made outside of routine Treatment, Payment, and Operations for up to 6 years prior.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg></span>
                                <span>Right to Request Restrictions</span>
                            </div>
                            <p class="privacy-feature-desc">You can request restrictions on certain uses of your PHI for treatment, payment, or operations, or restrict disclosures to health plans for services paid entirely out-of-pocket.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></span>
                                <span>Confidential Communications</span>
                            </div>
                            <p class="privacy-feature-desc">You have the right to request that our clinical staff contact you via specific alternate addresses, private telephone numbers, or secure portal channels.</p>
                        </div>
                        <div class="privacy-feature-card">
                            <div class="privacy-feature-title">
                                <span class="privacy-feature-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></span>
                                <span>Right to a Paper Copy</span>
                            </div>
                            <p class="privacy-feature-desc">Even if you have agreed to review this notice electronically, you are entitled to obtain a physical printed copy of this Notice of Privacy Practices upon request.</p>
                        </div>
                    </div>
                </section>

                <!-- Section 6: Security Safeguards -->
                <section class="privacy-section" id="section-security">
                    <h2>
                        <span class="privacy-section-num">6</span>
                        <span>Data Security & Technical Safeguards</span>
                    </h2>
                    <p>
                        USIntellix Hospital Management System deploys administrative, technical, and physical safeguards meeting or exceeding the HIPAA Security Rule and NIST 800-53 cybersecurity frameworks:
                    </p>
                    <ul>
                        <li><strong>Advanced Encryption:</strong> All electronic Protected Health Information (ePHI) stored in our databases is encrypted at rest using <strong>AES-256</strong> cryptographic standards. All communications over networks are secured via <strong>TLS 1.3</strong> transport encryption.</li>
                        <li><strong>Role-Based Access Control (RBAC):</strong> Strict principle of least privilege is enforced across our hospital staff. Only certified clinical and administrative personnel assigned to your care have permission to access corresponding chart segments.</li>
                        <li><strong>Multi-Factor Authentication (MFA):</strong> All clinician and staff accounts require multi-factor verification to authenticate into hospital workstations and clinical portals.</li>
                        <li><strong>Immutable Audit Logging:</strong> Every view, edit, download, export, and transmission of a patient record is permanently recorded in tamper-evident system audit logs with user IDs, IP addresses, and exact timestamps.</li>
                        <li><strong>Automated Session Timeouts:</strong> Workstation screens and browser sessions automatically lock after periods of inactivity to prevent unauthorized visual exposure of patient data.</li>
                    </ul>
                </section>

                <!-- Section 7: Business Associates -->
                <section class="privacy-section" id="section-business-associates">
                    <h2>
                        <span class="privacy-section-num">7</span>
                        <span>Business Associate Compliance</span>
                    </h2>
                    <p>
                        From time to time, USIntellix contracts with third-party service vendors who perform essential functions on our behalf (such as cloud database hosting, offsite digital radiology interpretation, electronic billing processing, and medical transcription services).
                    </p>
                    <p>
                        Prior to granting access to any data, every third-party vendor must execute a legally binding <strong>Business Associate Agreement (BAA)</strong> requiring them to maintain the identical strict HIPAA security, privacy, and breach notification standards required of our hospital.
                    </p>
                </section>

                <!-- Section 8: Breach Notification -->
                <section class="privacy-section" id="section-breach">
                    <h2>
                        <span class="privacy-section-num">8</span>
                        <span>Breach Notification Protocol</span>
                    </h2>
                    <p>
                        Under the HITECH Act and HIPAA Breach Notification Rule (45 C.F.R. §§ 164.400-414), in the unlikely event of an unauthorized acquisition, access, use, or disclosure of unencrypted Protected Health Information that compromises the security or privacy of your data, USIntellix will:
                    </p>
                    <ul>
                        <li>Notify affected patients in writing via first-class mail or secure electronic notification without unreasonable delay and in no case later than <strong>60 calendar days</strong> following discovery of the breach.</li>
                        <li>Provide details describing the incident, categories of information exposed, steps taken to mitigate harm, and protective measures recommended for affected individuals.</li>
                        <li>Report the incident to the U.S. Department of Health and Human Services (HHS) Office for Civil Rights as required by law.</li>
                    </ul>
                </section>

                <!-- Section 9: Data Retention & Disposal -->
                <section class="privacy-section" id="section-retention">
                    <h2>
                        <span class="privacy-section-num">9</span>
                        <span>Data Retention & Secure Disposal</span>
                    </h2>
                    <p>
                        Hospital records are retained in compliance with federal clinical guidelines and applicable state medical board statutes (minimum of 7 years for adults, and until age of majority plus statutory statute of limitations for pediatric patients).
                    </p>
                    <p>
                        When medical records or physical storage media reach the end of their legal retention lifecycle, they are irreversibly purged using cryptographic media sanitization and certified cross-cut shredding conforming to NIST SP 800-88 guidelines.
                    </p>
                </section>

                <!-- Section 10: Contact & Complaints -->
                <section class="privacy-section" id="section-contact">
                    <h2>
                        <span class="privacy-section-num">10</span>
                        <span>Privacy Officer Contact & Filing a Complaint</span>
                    </h2>
                    <p>
                        If you have questions about this Notice of Privacy Practices, believe your privacy rights have been violated, or wish to exercise any of your statutory patient rights, please contact our hospital's dedicated Privacy & Compliance Officer:
                    </p>

                    <div class="privacy-officer-card" style="margin-bottom: 20px;">
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                            <span>USIntellix Hospital Privacy &amp; Data Protection Office</span>
                            <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: 600;">45 CFR § 164.530(a)</span>
                        </div>
                        <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-muted);">
                            Designated HIPAA Privacy Official &amp; Patient Grievance Contact Office
                        </p>
                        <div class="privacy-officer-grid">
                            <div class="officer-info-item">
                                <div class="officer-info-label">HIPAA Privacy Officer</div>
                                <div class="officer-info-val" id="nppPrivacyOfficerName">Sarah Jenkins, JD, CHPC</div>
                                <div style="font-size: 11.5px; color: var(--text-muted);" id="nppPrivacyOfficerTitle">Chief Privacy &amp; Compliance Officer</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Direct Telephone</div>
                                <div class="officer-info-val" id="nppPrivacyOfficerPhone">(800) 555-0199 / Ext. 4040</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Confidential Email</div>
                                <div class="officer-info-val" id="nppPrivacyOfficerEmail">privacy@usintellix-hospital.com</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Postal Office Address</div>
                                <div class="officer-info-val" id="nppPrivacyOfficerAddress">100 Healthcare Boulevard, Suite 500, Medical District, NY 10001</div>
                            </div>
                        </div>
                    </div>

                    <div class="privacy-officer-card" style="margin-bottom: 20px; border-left: 4px solid #10b981;">
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                            <span>USIntellix Information Security &amp; Technology Safeguards</span>
                            <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #dcfce7; color: #15803d; font-weight: 600;">45 CFR § 164.308(a)(2)</span>
                        </div>
                        <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-muted);">
                            Designated HIPAA Security Official &amp; Cyber Governance Office
                        </p>
                        <div class="privacy-officer-grid">
                            <div class="officer-info-item">
                                <div class="officer-info-label">HIPAA Security Officer</div>
                                <div class="officer-info-val" id="nppSecurityOfficerName">Marcus Vance, CISSP, HCISPP</div>
                                <div style="font-size: 11.5px; color: var(--text-muted);" id="nppSecurityOfficerTitle">Chief Information Security Officer</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Security Incident Desk</div>
                                <div class="officer-info-val" id="nppSecurityOfficerPhone">(800) 555-0199 / Ext. 4088</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Security &amp; Breach Email</div>
                                <div class="officer-info-val" id="nppSecurityOfficerEmail">security@usintellix-hospital.com</div>
                            </div>
                            <div class="officer-info-item">
                                <div class="officer-info-label">Appointment Date</div>
                                <div class="officer-info-val" id="nppSecurityOfficerDate">Official Statutory Designation Active</div>
                            </div>
                        </div>
                    </div>

                    <h3>Filing a Federal Complaint with HHS</h3>
                    <p>
                        You also have the full right to file a formal complaint with the Secretary of the U.S. Department of Health and Human Services (HHS), Office for Civil Rights (OCR). Complaints may be submitted electronically through the OCR Complaint Portal at:
                        <br>
                        <a href="https://www.hhs.gov/hipaa/filing-a-complaint" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: none; font-weight: 600;">https://www.hhs.gov/hipaa/filing-a-complaint</a>
                    </p>
                    <p style="font-style: italic; color: var(--text-muted); font-size: 13px;">
                        <strong>Non-Retaliation Guarantee:</strong> USIntellix strictly prohibits retaliation or discrimination of any kind against any individual who exercises their patient privacy rights or files a privacy complaint.
                    </p>
                </section>
            </main>
        </div>
    </div>
    `;
}
