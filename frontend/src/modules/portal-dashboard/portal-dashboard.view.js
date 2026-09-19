/**
 * Patient Portal Dashboard View (matching OpenEMR Jerry Padgett layout)
 * With full Light & Dark mode support.
 */
export function PortalDashboardView() {
    return `
<style>
.portal-dash-wrapper {
    padding: 30px 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #1e293b);
}

.portal-dash-hero {
    background: #e9ecef;
    border-radius: 4px;
    padding: 24px 20px;
    text-align: center;
    margin-bottom: 24px;
    border: 1px solid #dee2e6;
    transition: all 0.2s ease;
}

:root[data-theme="dark"] .portal-dash-hero {
    background: #1e293b;
    border-color: #334155;
}

.portal-dash-title-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 12px;
}

.portal-dash-title-row h1 {
    font-size: 28px;
    font-weight: 500;
    color: #212529;
    margin: 0;
    letter-spacing: -0.01em;
}

:root[data-theme="dark"] .portal-dash-title-row h1 {
    color: #f1f5f9;
}

.portal-dash-doctor-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.portal-dash-tell-me-btn {
    background: #ffffff;
    border: 1px solid #adb5bd;
    border-radius: 4px;
    padding: 5px 16px;
    font-size: 13px;
    color: #212529;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: all 0.15s ease;
}

.portal-dash-tell-me-btn:hover {
    background: #f8f9fa;
    border-color: #6c757d;
}

:root[data-theme="dark"] .portal-dash-tell-me-btn {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
}

:root[data-theme="dark"] .portal-dash-tell-me-btn:hover {
    background: #475569;
    color: #ffffff;
}

.portal-dash-grid {
    background: #e9ecef;
    border-radius: 4px;
    padding: 30px 24px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 40px;
    border: 1px solid #dee2e8;
    transition: all 0.2s ease;
}

:root[data-theme="dark"] .portal-dash-grid {
    background: #1e293b;
    border-color: #334155;
}

@media (max-width: 900px) {
    .portal-dash-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 500px) {
    .portal-dash-grid {
        grid-template-columns: 1fr;
    }
}

.portal-dash-col {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.portal-dash-col h2 {
    font-size: 20px;
    font-weight: 500;
    color: #212529;
    margin: 0 0 12px 0;
}

:root[data-theme="dark"] .portal-dash-col h2 {
    color: #f1f5f9;
}

.portal-btn-green {
    background: #28a745;
    color: #ffffff;
    border: 1px solid #28a745;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    transition: background 0.15s ease, border-color 0.15s ease;
}

.portal-btn-green:hover {
    background: #218838;
    border-color: #1e7e34;
}

.portal-btn-blue {
    background: #007bff;
    color: #ffffff;
    border: 1px solid #007bff;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    transition: background 0.15s ease, border-color 0.15s ease;
}

.portal-btn-blue:hover {
    background: #0069d9;
    border-color: #0062cc;
}

.portal-dash-footer {
    text-align: center;
    margin-top: 50px;
}

.portal-dash-divider {
    height: 1px;
    background: #dee2e6;
    margin-bottom: 24px;
}

:root[data-theme="dark"] .portal-dash-divider {
    background: #334155;
}

.portal-dash-footer p {
    font-size: 12.5px;
    color: #495057;
    margin: 0;
}

:root[data-theme="dark"] .portal-dash-footer p {
    color: #94a3b8;
}

/* Modals */
.portal-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
}

.portal-modal-card {
    background: #ffffff;
    border-radius: 8px;
    max-width: 720px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2);
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

:root[data-theme="dark"] .portal-modal-card {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
}

.portal-modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e2e8f0;
}

:root[data-theme="dark"] .portal-modal-header {
    border-bottom-color: #334155;
}

.portal-modal-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
}

.portal-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    line-height: 1;
    color: #64748b;
    cursor: pointer;
    padding: 0;
}

:root[data-theme="dark"] .portal-modal-close {
    color: #94a3b8;
}

.portal-modal-body {
    padding: 20px;
    overflow-y: auto;
    font-size: 13.5px;
    line-height: 1.6;
}

.portal-modal-footer {
    padding: 14px 20px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

:root[data-theme="dark"] .portal-modal-footer {
    background: #172033;
    border-top-color: #334155;
}
</style>

<div class="portal-dash-wrapper">
    <!-- Top Hero Card -->
    <div class="portal-dash-hero">
        <div class="portal-dash-title-row">
            <h1>Portal Dashboard</h1>
            <span class="portal-dash-doctor-icon">
                <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="11" r="7" fill="#dc2626"/>
                    <path d="M7 30c0-6 4.9-11 11-11s11 5 11 11" fill="#dc2626"/>
                    <!-- Stethoscope -->
                    <path d="M12 21v3.5a6 6 0 0 0 12 0V21" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
                    <circle cx="18" cy="27" r="2.2" fill="#ffffff"/>
                </svg>
            </span>
        </div>
        <div>
            <button type="button" class="portal-dash-tell-me-btn" id="portalTellMeMoreBtn">Tell me more</button>
        </div>
    </div>

    <!-- Middle 4-Column Action Grid -->
    <div class="portal-dash-grid">
        <div class="portal-dash-col">
            <h2>Templates</h2>
            <button type="button" class="portal-btn-green" id="portalManageTemplatesBtn">Manage Templates</button>
        </div>

        <div class="portal-dash-col">
            <h2>Audits</h2>
            <button type="button" class="portal-btn-green" id="portalReviewAuditsBtn">Review Audits</button>
        </div>

        <div class="portal-dash-col">
            <h2>Mail</h2>
            <button type="button" class="portal-btn-green" id="portalSecureMailBtn">Secure Mail</button>
        </div>

        <div class="portal-dash-col">
            <h2>Signature</h2>
            <button type="button" class="portal-btn-blue" id="portalSignatureBtn">
                Signature on File
                <span style="font-size: 14px;">➔</span>
            </button>
        </div>
    </div>

    <!-- Footer Attribution -->
    <div class="portal-dash-footer">
        <div class="portal-dash-divider"></div>
        <p>Patient Portal v8.4.0 Copyright &copy; 2026 By sjpadgett@gmail.com License GPLv3</p>
    </div>
</div>

<!-- Modal: Tell Me More -->
<div class="portal-modal-overlay" id="portalTellMeModal" style="display: none;">
    <div class="portal-modal-card">
        <div class="portal-modal-header">
            <h3>About Patient Portal</h3>
            <button type="button" class="portal-modal-close" id="closePortalTellMeModal">&times;</button>
        </div>
        <div class="portal-modal-body">
            <p><strong>OpenEMR Patient Portal Engine (v8.4.0)</strong></p>
            <p>The Patient Portal allows clinic staff and registered patients to collaborate securely:</p>
            <ul style="padding-left: 20px; line-height: 1.8;">
                <li><strong>Templates</strong>: Design and publish customized clinical, intake, and consent document templates to all patients or specific patient charts.</li>
                <li><strong>Audits</strong>: Monitor compliance trails, login timestamps, and document download/signature activities.</li>
                <li><strong>Secure Mail</strong>: Send HIPAA-compliant direct messages and clinical alerts between care teams and patients.</li>
                <li><strong>Signature on File</strong>: Request and collect legally binding electronic signatures for HIPAA disclosures and medical authorizations.</li>
            </ul>
        </div>
        <div class="portal-modal-footer">
            <button type="button" class="btn-secondary" id="okPortalTellMeModal" style="padding: 6px 16px;">Got It</button>
        </div>
    </div>
</div>

<!-- Modal: Review Audits -->
<div class="portal-modal-overlay" id="portalAuditsModal" style="display: none;">
    <div class="portal-modal-card" style="max-width: 920px;">
        <div class="portal-modal-header">
            <h3>Patient Portal Audit Logs</h3>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button type="button" class="btn-secondary" id="refreshPortalAuditsBtn" style="padding: 4px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>
                    Refresh
                </button>
                <button type="button" class="portal-modal-close" id="closePortalAuditsModal">&times;</button>
            </div>
        </div>
        <div class="portal-modal-body">
            <div style="margin-bottom: 12px;">
                <input type="text" id="portalAuditsSearch" placeholder="Filter audits by patient, event, or description..." style="width: 100%; box-sizing: border-box; padding: 7px 12px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; font-size: 13px; background: var(--bg-surface-alt, #fff); color: var(--text-primary);">
            </div>
            <div style="max-height: 420px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color, #cbd5e1); text-align: left; color: var(--text-muted, #64748b); position: sticky; top: 0; background: var(--bg-surface, #fff);">
                            <th style="padding: 10px;">Date / Time</th>
                            <th style="padding: 10px;">Patient / User</th>
                            <th style="padding: 10px;">Event</th>
                            <th style="padding: 10px;">Description</th>
                            <th style="padding: 10px;">IP Address</th>
                            <th style="padding: 10px;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="portalAuditsTableBody">
                        <tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-muted);">Loading real audit trail...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="portal-modal-footer">
            <button type="button" class="btn-secondary" id="closePortalAuditsBtn" style="padding: 6px 16px;">Close</button>
        </div>
    </div>
</div>

<!-- Modal: Secure Mail -->
<div class="portal-modal-overlay" id="portalMailModal" style="display: none;">
    <div class="portal-modal-card" style="max-width: 840px;">
        <div class="portal-modal-header">
            <h3>Portal Secure Mail</h3>
            <button type="button" class="portal-modal-close" id="closePortalMailModal">&times;</button>
        </div>
        <div class="portal-modal-body">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <button type="button" class="btn-primary" id="togglePortalMailComposeBtn" style="padding: 6px 14px; font-size: 13px; background: #16a34a; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                    + Compose Secure Message
                </button>
                <button type="button" class="btn-secondary" id="refreshPortalMailBtn" style="padding: 5px 12px; font-size: 13px;">
                    Refresh Messages
                </button>
            </div>

            <!-- Compose Form Box (collapsible) -->
            <div id="portalMailComposeBox" style="display: none; background: var(--bg-surface-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 600; font-size: 13.5px; margin-bottom: 10px;">New Message to Patient</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Recipient Patient</label>
                        <select id="portalMailPatientSelect" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 4px; font-size: 13px; background: var(--bg-surface, #fff); color: var(--text-primary);"></select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Subject</label>
                        <input type="text" id="portalMailSubjectInput" placeholder="e.g. Follow-up regarding intake forms" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 4px; font-size: 13px; background: var(--bg-surface, #fff); color: var(--text-primary);">
                    </div>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Message Body</label>
                    <textarea id="portalMailBodyInput" rows="3" placeholder="Type confidential message..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 4px; font-size: 13px; background: var(--bg-surface, #fff); color: var(--text-primary); resize: vertical;"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" class="btn-secondary" id="cancelPortalMailComposeBtn" style="padding: 5px 12px; font-size: 12px;">Cancel</button>
                    <button type="button" class="btn-primary" id="sendPortalMailBtn" style="padding: 5px 14px; font-size: 12px; background: #16a34a; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Send Message</button>
                </div>
            </div>

            <!-- Messages List -->
            <div id="portalMailList" style="border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px; overflow: hidden; max-height: 380px; overflow-y: auto;">
                <div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading real messages...</div>
            </div>
        </div>
        <div class="portal-modal-footer">
            <button type="button" class="btn-secondary" id="closePortalMailBtn" style="padding: 6px 16px;">Close</button>
        </div>
    </div>
</div>

<!-- Modal: Signature on File -->
<div class="portal-modal-overlay" id="portalSignatureModal" style="display: none;">
    <div class="portal-modal-card" style="max-width: 900px;">
        <div class="portal-modal-header">
            <h3>Patient Signatures on File</h3>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button type="button" class="btn-secondary" id="refreshPortalSignaturesBtn" style="padding: 4px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>
                    Refresh
                </button>
                <button type="button" class="portal-modal-close" id="closePortalSignatureModal">&times;</button>
            </div>
        </div>
        <div class="portal-modal-body">
            <div style="max-height: 420px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color, #cbd5e1); text-align: left; color: var(--text-muted, #64748b); position: sticky; top: 0; background: var(--bg-surface, #fff);">
                            <th style="padding: 10px;">Patient ID</th>
                            <th style="padding: 10px;">Patient Name</th>
                            <th style="padding: 10px;">Document / Consent Form</th>
                            <th style="padding: 10px;">Date Enrolled</th>
                            <th style="padding: 10px;">Signature Status</th>
                            <th style="padding: 10px; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="portalSignaturesTableBody">
                        <tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-muted);">Loading real signatures...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="portal-modal-footer">
            <button type="button" class="btn-secondary" id="closePortalSignatureBtn" style="padding: 6px 16px;">Close</button>
        </div>
    </div>
</div>

<!-- Modal: Signature Preview -->
<div class="portal-modal-overlay" id="portalSigPreviewModal" style="display: none; z-index: 1050;">
    <div class="portal-modal-card" style="max-width: 520px;">
        <div class="portal-modal-header">
            <h3 id="sigPreviewPatientName">Signature Verification</h3>
            <button type="button" class="portal-modal-close" id="closePortalSigPreviewModal">&times;</button>
        </div>
        <div class="portal-modal-body" style="text-align: center; padding: 24px;">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">Digital Signature on File</div>
            <div id="sigPreviewContent" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; min-height: 120px; display: flex; align-items: center; justify-content: center;">
                <!-- Real signature image / canvas rendered here -->
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 14px;" id="sigPreviewMeta">Legally binding electronic signature</div>
        </div>
        <div class="portal-modal-footer">
            <button type="button" class="btn-secondary" id="closePortalSigPreviewBtn" style="padding: 6px 16px;">Close</button>
        </div>
    </div>
</div>
    `;
}