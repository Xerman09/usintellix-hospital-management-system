export function HelpView() {
    return `
<style>
.help-page-container {
    width: 100%;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: #f8fafc;
    min-height: 100%;
    padding: 24px;
    box-sizing: border-box;
}

.help-card {
    max-width: 960px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    overflow: hidden;
}

.help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
}

.help-header-title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
}

.help-header-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.help-header-icon svg {
    width: 22px;
    height: 22px;
}

.help-header-text h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
}

.help-header-text p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #64748b;
}

.help-section-label {
    padding: 18px 24px 8px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #64748b;
    background: #fafbfc;
    border-bottom: 1px solid #f1f5f9;
}

.help-list {
    display: flex;
    flex-direction: column;
}

.help-item {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    text-decoration: none;
    transition: background 0.15s ease;
}

.help-item:last-child {
    border-bottom: none;
}

.help-item-clickable {
    cursor: pointer;
}

.help-item-clickable:hover {
    background: #f8fafc;
}

.help-icon-wrap {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    flex-shrink: 0;
    transition: transform 0.15s ease;
}

.help-item-clickable:hover .help-icon-wrap {
    transform: scale(1.05);
}

.help-icon {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.help-icon-blue   { background: #eff6ff; color: #2563eb; }
.help-icon-indigo { background: #eef2ff; color: #4f46e5; }
.help-icon-emerald{ background: #ecfdf5; color: #059669; }
.help-icon-amber  { background: #fffbeb; color: #d97706; }
.help-icon-purple { background: #faf5ff; color: #9333ea; }
.help-icon-rose   { background: #fff1f2; color: #e11d48; }
.help-icon-cyan   { background: #ecfeff; color: #0891b2; }
.help-icon-slate  { background: #f1f5f9; color: #475569; }

.help-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.help-title {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.help-description {
    font-size: 13px;
    color: #64748b;
    line-height: 1.45;
}

.help-action-arrow {
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 16px;
    flex-shrink: 0;
    transition: transform 0.15s ease, color 0.15s ease;
}

.help-item-clickable:hover .help-action-arrow {
    color: #2563eb;
    transform: translateX(4px);
}

/* Compliance cards section */
.help-compliance-section {
    padding: 20px 24px;
    background: #fafbfc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.help-compliance-card {
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.help-compliance-card--hipaa {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
}

.help-compliance-card--docs {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
}

.help-compliance-icon {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    margin-top: 2px;
}

.help-compliance-body {
    flex: 1;
    min-width: 0;
}

.help-compliance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
}

.help-compliance-title {
    font-size: 15px;
    font-weight: 700;
}

.help-compliance-card--hipaa .help-compliance-title {
    color: #15803d;
}

.help-compliance-card--docs .help-compliance-title {
    color: #1d4ed8;
}

.help-compliance-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 12px;
    white-space: nowrap;
}

.help-compliance-badge--green {
    background: #15803d;
    color: #ffffff;
}

.help-compliance-badge--blue {
    background: #2563eb;
    color: #ffffff;
}

.help-compliance-text {
    font-size: 13px;
    color: #334155;
    line-height: 1.5;
}

.help-compliance-list {
    margin: 8px 0 12px 18px;
    padding: 0;
    font-size: 12.5px;
    color: #475569;
    line-height: 1.5;
}

.help-compliance-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
}

.help-btn {
    border: none;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.help-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.help-btn--green {
    background: #059669;
    color: #ffffff;
}

.help-btn--blue {
    background: #2563eb;
    color: #ffffff;
}

.help-btn--sky {
    background: #0284c7;
    color: #ffffff;
}

/* ========================================================
   DARK MODE ADAPTATION
   ======================================================== */
:root[data-theme="dark"] .help-page-container {
    background: var(--bg-page, #0f172a);
}

:root[data-theme="dark"] .help-card {
    background: var(--bg-surface, #1e293b);
    border-color: var(--border-color, #334155);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:root[data-theme="dark"] .help-header {
    background: var(--bg-surface-alt, #172033);
    border-bottom-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .help-header-icon {
    background: rgba(37, 99, 235, 0.18);
    color: #60a5fa;
}

:root[data-theme="dark"] .help-header-text h1 {
    color: #f1f5f9;
}

:root[data-theme="dark"] .help-header-text p {
    color: var(--text-muted, #94a3b8);
}

:root[data-theme="dark"] .help-section-label {
    background: #131d2e;
    color: var(--text-muted, #94a3b8);
    border-bottom-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .help-item {
    border-bottom-color: rgba(255, 255, 255, 0.05);
}

:root[data-theme="dark"] .help-item-clickable:hover {
    background: rgba(255, 255, 255, 0.035);
}

:root[data-theme="dark"] .help-icon-blue   { background: rgba(37, 99, 235, 0.15); color: #60a5fa; }
:root[data-theme="dark"] .help-icon-indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
:root[data-theme="dark"] .help-icon-emerald{ background: rgba(16, 185, 129, 0.15); color: #34d399; }
:root[data-theme="dark"] .help-icon-amber  { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
:root[data-theme="dark"] .help-icon-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
:root[data-theme="dark"] .help-icon-rose   { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
:root[data-theme="dark"] .help-icon-cyan   { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
:root[data-theme="dark"] .help-icon-slate  { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }

:root[data-theme="dark"] .help-title {
    color: #f1f5f9;
}

:root[data-theme="dark"] .help-description {
    color: var(--text-muted, #94a3b8);
}

:root[data-theme="dark"] .help-action-arrow {
    color: #64748b;
}

:root[data-theme="dark"] .help-item-clickable:hover .help-action-arrow {
    color: #60a5fa;
}

:root[data-theme="dark"] .help-compliance-section {
    background: #131d2e;
    border-top-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .help-compliance-card--hipaa {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.25);
}

:root[data-theme="dark"] .help-compliance-card--hipaa .help-compliance-title {
    color: #34d399;
}

:root[data-theme="dark"] .help-compliance-card--docs {
    background: rgba(37, 99, 235, 0.08);
    border-color: rgba(37, 99, 235, 0.25);
}

:root[data-theme="dark"] .help-compliance-card--docs .help-compliance-title {
    color: #60a5fa;
}

:root[data-theme="dark"] .help-compliance-text {
    color: #cbd5e1;
}

:root[data-theme="dark"] .help-compliance-list {
    color: #94a3b8;
}
</style>

<div class="help-page-container">
    <div class="help-card">
        <!-- HEADER -->
        <div class="help-header">
            <div class="help-header-title-wrap">
                <div class="help-header-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <div class="help-header-text">
                    <h1>Patient Portal Help &amp; User Guide</h1>
                    <p>Select any section below to navigate directly to that service in your portal.</p>
                </div>
            </div>
        </div>

        <div class="help-section-label">Portal Services &amp; Medical Records</div>

        <!-- PORTAL FEATURE LINKS -->
        <div class="help-list">
            
            <!-- Clinical Documents -->
            <div class="help-item help-item-clickable" data-tab="documents" data-tab-title="Documents">
                <div class="help-icon-wrap help-icon-blue">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Clinical Documents</div>
                    <div class="help-description">Clinical forms, intake questionnaires, and medical documents requested by your healthcare team.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Appointments -->
            <div class="help-item help-item-clickable" data-tab="appointments" data-tab-title="Appointments">
                <div class="help-icon-wrap help-icon-indigo">
                    <svg class="help-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Appointments</div>
                    <div class="help-description">View scheduled clinic visits, check physician availability, and book new clinical consultations.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Secure Messaging -->
            <div class="help-item help-item-clickable" data-tab="messaging" data-tab-title="Messaging">
                <div class="help-icon-wrap help-icon-emerald">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Secure Messaging</div>
                    <div class="help-description">Send and receive encrypted, HIPAA-compliant messages and inquiries with your primary care providers.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Health Snapshot / Records -->
            <div class="help-item help-item-clickable" data-tab="health_records" data-tab-title="Health Records Summary">
                <div class="help-icon-wrap help-icon-amber">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Health Snapshot &amp; Summary</div>
                    <div class="help-description">Inspect your complete longitudinal health summary: immunizations, medications, active prescriptions, allergies, problems, and lab results.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Profile -->
            <div class="help-item help-item-clickable" data-tab="profile" data-tab-title="Profile">
                <div class="help-icon-wrap help-icon-purple">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Profile &amp; Demographics</div>
                    <div class="help-description">Review and update your personal demographics, primary emergency contacts, and insurance coverage.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Billing Summary -->
            <div class="help-item help-item-clickable" data-tab="billing" data-tab-title="Billing">
                <div class="help-icon-wrap help-icon-rose">
                    <svg class="help-icon" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Billing Summary &amp; Invoices</div>
                    <div class="help-description">Review visit fee sheets, insurance claims processing, copays, invoices, and transaction history.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Medical Reports -->
            <div class="help-item help-item-clickable" data-tab="reports" data-tab-title="Medical Reports">
                <div class="help-icon-wrap help-icon-cyan">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="18" x2="9" y2="15"></line><line x1="15" y1="18" x2="15" y2="9"></line></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Medical Reports</div>
                    <div class="help-description">Access and export official clinical summary reports, lab findings, and physician progress notes.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Settings -->
            <div class="help-item help-item-clickable" data-tab="settings" data-tab-title="Settings">
                <div class="help-icon-wrap help-icon-slate">
                    <svg class="help-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Settings &amp; Preferences</div>
                    <div class="help-description">Manage your digital signature, change your account password, and set confidential communication preferences.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Privacy Policy -->
            <div class="help-item help-item-clickable" data-tab="privacy_policy" data-tab-title="Privacy Policy &amp; HIPAA Notice">
                <div class="help-icon-wrap help-icon-blue">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Notice of Privacy Practices (NPP)</div>
                    <div class="help-description">Review our hospital data protection standards, patient privacy rights under 45 CFR § 164.520, and instructions for record access.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            
            <!-- Terms & Conditions -->
            <div class="help-item help-item-clickable" data-tab="terms_conditions" data-tab-title="Terms &amp; Conditions">
                <div class="help-icon-wrap help-icon-indigo">
                    <svg class="help-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div class="help-content">
                    <div class="help-title">Terms &amp; Conditions of Service</div>
                    <div class="help-description">Healthcare services agreement, medical emergency disclaimers, billing responsibilities, and portal terms of use.</div>
                </div>
                <div class="help-action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
        </div>

        <!-- COMPLIANCE & ARCHITECTURE GUIDES -->
        <div class="help-compliance-section">
            
            <!-- HIPAA Specification -->
            <div class="help-compliance-card help-compliance-card--hipaa">
                <svg class="help-compliance-icon" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                <div class="help-compliance-body">
                    <div class="help-compliance-header">
                        <span class="help-compliance-title">HIPAA Security &amp; Compliance Specification (45 CFR § 164)</span>
                        <span class="help-compliance-badge help-compliance-badge--green">Compliant</span>
                    </div>
                    <div class="help-compliance-text">
                        Complete specifications of HIPAA Security &amp; Privacy Rule technical controls enforced in USIntellix:
                        <ul class="help-compliance-list">
                            <li><strong>Account Lockout &amp; Brute-Force Defense (§ 164.312(a)(2)(i)):</strong> 5 failed attempts within 15 min triggers 30-min lockout.</li>
                            <li><strong>Password Management &amp; Breached Credential Defense (§ 164.308(a)(5)(ii)(D) &amp; NIST SP 800-63B):</strong> 90-day expiration, 5-password history limit, live k-Anonymity breach lookup.</li>
                            <li><strong>Cryptographic Audit Controls (§ 164.312(b) &amp; § 164.312(c)(1)):</strong> SHA-256 HMAC chained tamper-evident logging.</li>
                            <li><strong>Automatic Inactivity Logoff (§ 164.312(a)(2)(iii)):</strong> 15-minute inactivity termination with 60-second warning countdown.</li>
                        </ul>
                    </div>
                    <div class="help-compliance-actions">
                        <button type="button" class="help-btn help-btn--green" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('hipaa_audit', 'HIPAA Audit Logs &amp; Integrity'); }">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                            <span>Open HIPAA Audit Console</span>
                        </button>
                        <button type="button" class="help-btn help-btn--sky" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            <span>View Notice of Privacy Practices</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Master System Documentation -->
            <div class="help-compliance-card help-compliance-card--docs">
                <svg class="help-compliance-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <div class="help-compliance-body">
                    <div class="help-compliance-header">
                        <span class="help-compliance-title">Master System Documentation &amp; Architecture Guide</span>
                        <span class="help-compliance-badge help-compliance-badge--blue">v2.6.0</span>
                    </div>
                    <div class="help-compliance-text">
                        Complete architecture guide covering:
                        <ul class="help-compliance-list">
                            <li><strong>Technology Stack:</strong> PHP 8.x OOP MVC backend, Vanilla JS modular SPA with multi-tab desktop manager (<code>TabManager</code>), MySQL InnoDB relational schema.</li>
                            <li><strong>6-Tier RBAC Matrix:</strong> Admin, Physician, Nurse, Receptionist, Biller, and Patient Portal permissions.</li>
                            <li><strong>EHR Clinical Workflows:</strong> Encounters, SOAP notes, vitals, allergies, problems, orders, and 5-category longitudinal patient history.</li>
                        </ul>
                    </div>
                    <div class="help-compliance-actions">
                        <button type="button" class="help-btn help-btn--blue" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('system_documentation', 'System Documentation'); } else { window.location.hash = '#/system-documentation'; }">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            <span>Open System Documentation</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>
`;
}
