export function HelpView() {
    return `
<style>
.help-page-container {
    width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
    background: #ffffff;
    min-height: 100%;
}
.help-header {
    background-color: #0f172a;
    color: white;
    padding: 12px 16px;
    font-size: 20px;
    font-weight: 500;
}
.help-list {
    display: flex;
    flex-direction: column;
}
.help-item {
    display: flex;
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    align-items: flex-start;
}
.help-icon {
    width: 24px;
    height: 24px;
    margin-right: 12px;
    margin-top: 2px;
    flex-shrink: 0;
    color: #0f172a;
    fill: currentColor;
}
.help-content {
    display: flex;
    flex-direction: column;
}
.help-title {
    font-size: 16px;
    color: #334155;
    margin-bottom: 4px;
}
.help-description {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
}

.help-item-clickable {
    cursor: pointer;
    transition: background 0.15s ease;
}
.help-item-clickable:hover {
    background: rgba(2, 132, 199, 0.06);
}
:root[data-theme="dark"] .help-item-clickable:hover {
    background: rgba(56, 189, 248, 0.08);
}
:root[data-theme="dark"] .help-page-container { background: var(--bg-surface); }
:root[data-theme="dark"] .help-item { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .help-icon { color: var(--text-muted); }
:root[data-theme="dark"] .help-title { color: var(--text-primary); }
:root[data-theme="dark"] .help-description { color: var(--text-muted); }
</style>

<div class="help-page-container">
    <div class="help-header">
        Dashboard Help
    </div>
    <div class="help-list">
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline fill="none" stroke="currentColor" stroke-width="2" points="14 2 14 8 20 8"/></svg>
            <div class="help-content">
                <div class="help-title">Clinical Documents</div>
                <div class="help-description">Clinical forms and documents that have been sent by your clinical staff to be filled out.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><rect fill="none" stroke="currentColor" stroke-width="2" x="3" y="4" width="18" height="18" rx="2" ry="2"/><line fill="none" stroke="currentColor" stroke-width="2" x1="16" y1="2" x2="16" y2="6"/><line fill="none" stroke="currentColor" stroke-width="2" x1="8" y1="2" x2="8" y2="6"/><line fill="none" stroke="currentColor" stroke-width="2" x1="3" y1="10" x2="21" y2="10"/><path fill="none" stroke="currentColor" stroke-width="2" d="m9 16 2 2 4-4"/></svg>
            <div class="help-content">
                <div class="help-title">Appointments</div>
                <div class="help-description">View upcoming appointments and if allowed by your clinical staff make new appointments.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline fill="none" stroke="currentColor" stroke-width="2" points="22,6 12,13 2,6"/></svg>
            <div class="help-content">
                <div class="help-title">Secure Messaging</div>
                <div class="help-description">You can send and receive secure communications with your care team staff through this system.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect fill="none" stroke="currentColor" stroke-width="2" x="8" y="2" width="8" height="4" rx="1" ry="1"/><line fill="none" stroke="currentColor" stroke-width="2" x1="9" y1="14" x2="15" y2="14"/></svg>
            <div class="help-content">
                <div class="help-title">Health Snapshot</div>
                <div class="help-description">See your immunization, medications, active prescriptions, allergy list, current problems list, and lab results.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="7" r="4"/></svg>
            <div class="help-content">
                <div class="help-title">Profile</div>
                <div class="help-description">Review and edit your medical profile information. This includes your basic demographics (name, address, emergency contact). You can also review your insurance information if you use a third party insurer to help pay for treatment of care.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><rect fill="none" stroke="currentColor" stroke-width="2" x="1" y="4" width="22" height="16" rx="2" ry="2"/><line fill="none" stroke="currentColor" stroke-width="2" x1="1" y1="10" x2="23" y2="10"/></svg>
            <div class="help-content">
                <div class="help-title">Billing Summary</div>
                <div class="help-description"></div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <div class="help-content">
                <div class="help-title">Medical Reports</div>
                <div class="help-description">Setup your digital signature for signing your clinical documents, update your login credentials, or change application settings in the portal.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <div class="help-content">
                <div class="help-title">Settings</div>
                <div class="help-description">Setup your digital signature for signing your clinical documents, update your login credentials, or change application settings in the portal.</div>
            </div>
        </div>
        
        <div class="help-item help-item-clickable" id="helpItemHipaaCompliance" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 95, 70, 0.05)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 18px; margin-bottom: 12px;">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" style="color: #059669; width: 32px; height: 32px; flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
            <div class="help-content" style="flex: 1;">
                <div class="help-title" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span style="color: #047857; font-size: 16px; font-weight: 700;">HIPAA Security &amp; Compliance Specification (45 CFR § 164)</span>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #059669; color: #ffffff; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">Compliant</span>
                </div>
                <div class="help-description" style="margin-top: 6px; color: #334155; line-height: 1.6;">
                    Complete specifications of HIPAA Security &amp; Privacy Rule technical controls:
                    <ul style="margin: 6px 0 10px 18px; padding: 0; font-size: 12px; color: #475569;">
                        <li><strong>Account Lockout &amp; Brute-Force Defense (§ 164.312(a)(2)(i)):</strong> 5 failed attempts within 15 min triggers 30-min lockout.</li>
                        <li><strong>Password Expiration &amp; History (§ 164.308(a)(5)(ii)(D)):</strong> 90-day mandatory expiration, 5-password history restriction, 7-day advance notice banner.</li>
                        <li><strong>Cryptographic Audit Controls (§ 164.312(b) &amp; § 164.312(c)(1)):</strong> SHA-256 HMAC chained tamper-evident logging.</li>
                        <li><strong>Automatic Inactivity Logoff (§ 164.312(a)(2)(iii)):</strong> 15-minute inactivity termination with 60-second live warning countdown.</li>
                        <li><strong>Emergency Break-Glass Protocol (§ 164.312(a)(2)(ii)):</strong> Audited clinical overrides for emergency patient care.</li>
                        <li><strong>Accounting of Disclosures (§ 164.528):</strong> Systematic tracking of external PHI disclosures.</li>
                    </ul>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('hipaa_audit', 'HIPAA Audit Logs &amp; Integrity'); }" style="background: #059669; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                        <span>Open HIPAA Audit Console</span>
                    </button>
                    <button type="button" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }" style="background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        <span>View Notice of Privacy Practices</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="help-item" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(30, 64, 175, 0.05)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 18px; margin-bottom: 12px;">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="color: #2563eb; width: 32px; height: 32px; flex-shrink: 0;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <div class="help-content" style="flex: 1;">
                <div class="help-title" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span style="color: #1d4ed8; font-size: 16px; font-weight: 700;">Master System Documentation &amp; Architecture Guide</span>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #2563eb; color: #ffffff; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">v2.6.0</span>
                </div>
                <div class="help-description" style="margin-top: 6px; color: #334155; line-height: 1.6;">
                    Complete architecture guide covering:
                    <ul style="margin: 6px 0 10px 18px; padding: 0; font-size: 12px; color: #475569;">
                        <li><strong>Technology Stack:</strong> PHP 8.x OOP MVC backend, Vanilla JS modular SPA with multi-tab desktop manager (<code>TabManager</code>), MySQL InnoDB relational schema.</li>
                        <li><strong>6-Tier RBAC Matrix:</strong> Admin, Physician, Nurse, Receptionist, Biller, and Patient Portal permissions.</li>
                        <li><strong>Inpatient Bed Management (ADT):</strong> Wards, rooms, beds, occupancy tracking, and transfers.</li>
                        <li><strong>EHR Clinical Workflows:</strong> Encounters, SOAP notes, vitals, allergies, problems, orders, and 5-category longitudinal patient history.</li>
                        <li><strong>Billing &amp; EDI:</strong> Fee sheets, superbills, ANSI 837P claims generation, and ANSI 835 remittance posting.</li>
                    </ul>
                    <span style="font-size: 12px; color: #64748b;">Documentation files located in codebase at: <code style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">docs/SYSTEM_DOCUMENTATION.md</code> and <code style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">docs/HIPAA_COMPLIANCE.md</code></span>
                    <div style="margin-top: 10px;">
                        <button type="button" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('system_documentation', 'System Documentation'); } else { window.location.hash = '#/system-documentation'; }" style="background: #2563eb; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            <span>Open System Documentation</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="help-item help-item-clickable" id="helpItemPrivacyPolicy" data-tab="privacy_policy" data-tab-title="Privacy Policy &amp; HIPAA Notice" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }" style="cursor: pointer; transition: all 0.15s ease;" title="Click to open Privacy Policy">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" style="color: #0284c7;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <div class="help-content" style="flex: 1;">
                <div class="help-title" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <a href="#/privacy-policy" onclick="event.preventDefault(); if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }" style="color: #0284c7; text-decoration: underline; font-weight: 600; cursor: pointer; font-size: 16px;">
                        Privacy Policy &amp; HIPAA Notice
                    </a>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(2, 132, 199, 0.15); color: #0284c7; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">Click to Open &rarr;</span>
                </div>
                <div class="help-description" style="margin-top: 4px;">
                    Review our hospital data protection policy, Notice of Privacy Practices, patient rights under HIPAA, and instructions on how to request copies of your health records.
                </div>
                <div style="margin-top: 8px;">
                    <button type="button" onclick="event.stopPropagation(); if (window.__openDashboardTab) { window.__openDashboardTab('privacy_policy', 'Privacy Policy &amp; HIPAA Notice'); } else { window.location.hash = '#/privacy-policy'; }" style="background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s ease;">
                        <span>Open Privacy Policy Document</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="help-item help-item-clickable" id="helpItemTermsConditions" data-tab="terms_conditions" data-tab-title="Terms &amp; Conditions" onclick="if (window.__openDashboardTab) { window.__openDashboardTab('terms_conditions', 'Terms &amp; Conditions'); } else { window.location.hash = '#/terms-conditions'; }" style="cursor: pointer; transition: all 0.15s ease;" title="Click to open Terms &amp; Conditions">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="color: #2563eb;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <div class="help-content" style="flex: 1;">
                <div class="help-title" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <a href="#/terms-conditions" onclick="event.preventDefault(); if (window.__openDashboardTab) { window.__openDashboardTab('terms_conditions', 'Terms &amp; Conditions'); } else { window.location.hash = '#/terms-conditions'; }" style="color: #2563eb; text-decoration: underline; font-weight: 600; cursor: pointer; font-size: 16px;">
                        Terms &amp; Conditions of Service
                    </a>
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(37, 99, 235, 0.15); color: #2563eb; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">Click to Open &rarr;</span>
                </div>
                <div class="help-description" style="margin-top: 4px;">
                    Review our healthcare services agreement, patient rights and responsibilities, medical emergency disclaimers, billing policies, and portal usage terms.
                </div>
                <div style="margin-top: 8px;">
                    <button type="button" onclick="event.stopPropagation(); if (window.__openDashboardTab) { window.__openDashboardTab('terms_conditions', 'Terms &amp; Conditions'); } else { window.location.hash = '#/terms-conditions'; }" style="background: #2563eb; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s ease;">
                        <span>Open Terms of Service Document</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        </div>
        
    </div>
</div>
    `;
}
