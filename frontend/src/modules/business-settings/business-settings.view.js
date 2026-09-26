export function BusinessSettingsView()
{
    return `
<style>
.ps-page {
    width: 100%;
    font-size: 13.5px;
}

.ps-title {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.ps-layout {
    display: flex;
    align-items: flex-start;
    gap: 0;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    background: white;
    overflow: hidden;
    min-height: 480px;
}

.ps-sidebar {
    flex-shrink: 0;
    width: 220px;
    border-right: 1px solid #e5e9f0;
    padding: 8px 0;
}

.ps-nav-link {
    display: block;
    padding: 11px 20px;
    color: #29323f;
    text-decoration: none;
    font-size: 14px;
    cursor: pointer;
    border-left: 3px solid transparent;
}

.ps-nav-link:hover {
    background: #f8fafc;
}

.ps-nav-link.active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 600;
    border-left-color: var(--accent);
}

.ps-content {
    flex: 1;
    min-width: 0;
    padding: 28px 32px;
}

@media (max-width: 720px) {
    .ps-layout { flex-direction: column; }
    .ps-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e5e9f0; }
}

:root[data-theme="dark"] .ps-title { color: var(--text-primary); }
:root[data-theme="dark"] .ps-layout { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .ps-sidebar { border-right-color: var(--border-color); }
:root[data-theme="dark"] .ps-nav-link { color: var(--text-primary); }
:root[data-theme="dark"] .ps-nav-link:hover { background: var(--bg-surface-alt); }
</style>

<div class="ps-page">
    <h1 class="ps-title">Practice Settings</h1>

    <div class="ps-layout">
        <div class="ps-sidebar" id="psSidebar">
            <a class="ps-nav-link active" data-section="general">General</a>
            <a class="ps-nav-link" data-section="hipaa_officers"><span style="margin-right:6px;">🛡️</span>HIPAA Officers</a>
            <a class="ps-nav-link" data-section="pharmacies">Pharmacies</a>
            <a class="ps-nav-link" data-section="insurance_companies">Insurance Companies</a>
            <a class="ps-nav-link" data-section="insurance_numbers">Insurance Numbers</a>
            <a class="ps-nav-link" data-section="x12_partners">X12 Partners</a>
            <a class="ps-nav-link" data-section="document_categories">Document Categories</a>
            <a class="ps-nav-link" data-section="hl7_viewer">HL7 Viewer</a>
        </div>
        <div class="ps-content" id="psContent"></div>
    </div>
</div>
`;
}

export function BusinessInfoSectionView()
{
    return `
<style>
.biz-card {
    width: 100%;
}

.biz-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.biz-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.biz-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.biz-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.biz-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.biz-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.biz-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.biz-add-btn svg {
    width: 14px;
    height: 14px;
}

.biz-logo-menu-wrap {
    position: relative;
    flex-shrink: 0;
}

.biz-logo-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.biz-logo-wrap img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.biz-logo-overlay {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: rgba(20, 24, 31, 0.55);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity .15s;
    pointer-events: none;
}

.biz-logo-wrap:hover .biz-logo-overlay {
    opacity: 1;
}

.biz-logo-overlay svg {
    width: 20px;
    height: 20px;
}

.biz-logo-dropdown {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: white;
    min-width: 170px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.14);
    border-radius: 8px;
    border: 1px solid #e5e9f0;
    z-index: 20;
    padding: 6px;
    flex-direction: column;
    gap: 2px;
}

.biz-logo-menu-wrap.open .biz-logo-dropdown {
    display: flex;
}

.biz-logo-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: none;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    text-align: left;
}

.biz-logo-dropdown-item:hover {
    background: #f3f4f6;
}

.biz-logo-dropdown-item svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.biz-logo-dropdown-item.danger {
    color: #b91c1c;
}

.biz-logo-dropdown-item.danger:hover {
    background: #fef2f2;
}

@media (max-width: 640px) {
    .biz-header { flex-direction: column; align-items: stretch; }
    .biz-header-actions { justify-content: flex-end; }
}

:root[data-theme="dark"] .biz-logo-wrap { background: var(--bg-surface-alt); border-color: var(--border-color); }
:root[data-theme="dark"] .biz-logo-dropdown { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .biz-logo-dropdown-item { color: var(--text-primary); }
:root[data-theme="dark"] .biz-logo-dropdown-item:hover { background: var(--bg-surface-alt); }
</style>

<div class="biz-card">
    <div class="biz-header">
        <div class="biz-header-title">
            <div class="biz-logo-menu-wrap" id="logoMenuWrap">
                <div class="biz-logo-wrap" id="logoMenuTrigger" title="Change logo">
                    <img id="logoPreview" src="./assets/logo.png?v=1" alt="Business logo">
                    <div class="biz-logo-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </div>
                </div>
                <div class="biz-logo-dropdown" id="logoDropdown">
                    <button type="button" class="biz-logo-dropdown-item" id="chooseLogoBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        Choose Icon
                    </button>
                    <button type="button" class="biz-logo-dropdown-item danger" id="removeLogoBtn" style="display:none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Remove Icon
                    </button>
                </div>
                <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" style="display:none;">
            </div>
            <div>
                <h1 id="businessHeaderName">Business Information</h1>
                <p class="form-subtitle" id="businessHeaderSub">View and update your business information.</p>
            </div>
        </div>
        <div class="biz-header-actions">
            <button type="button" class="biz-add-btn" id="openEditBusinessModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                Edit
            </button>
        </div>
    </div>

    <div id="formAlert"></div>

    <div class="form-grid" style="margin-top: 20px;">
        <div class="form-group full">
            <label>Business Name</label>
            <p id="ro_business_name">-</p>
        </div>

        <div class="form-group full">
            <label>Address</label>
            <p id="ro_business_address">-</p>
        </div>

        <div class="form-group">
            <label>Phone</label>
            <p id="ro_business_phone">-</p>
        </div>

        <div class="form-group">
            <label>Email</label>
            <p id="ro_business_email">-</p>
        </div>
    </div>
</div>

<div class="modal-overlay" id="editBusinessModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit Business Information</h2>
            <button type="button" class="modal-close" id="closeEditBusinessModal">&times;</button>
        </div>
        <p class="form-subtitle">Update the business name and contact information shown across the system.</p>

        <div id="editBusinessFormAlert"></div>

        <form id="editBusinessForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Business Name</label>
                    <input id="edit_business_name" class="form-input">
                    <span class="form-error" id="err-edit_name"></span>
                </div>

                <div class="form-group full">
                    <label>Address</label>
                    <input id="edit_business_address" class="form-input" placeholder="Optional">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input id="edit_business_phone" class="form-input" placeholder="Optional">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input id="edit_business_email" type="email" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-edit_email"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelEditBusiness">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>
`;
}

export function HipaaOfficersSectionView()
{
    return `
<style>
.ho-container {
    width: 100%;
    font-family: inherit;
    color: var(--text-primary, #1e293b);
}

.ho-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.ho-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    margin: 0 0 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.ho-subtitle {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0;
    line-height: 1.5;
    max-width: 780px;
}

.ho-header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.ho-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s ease;
    border: 1px solid transparent;
}

.ho-btn-primary {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.ho-btn-primary:hover {
    background: #0369a1;
}

.ho-btn-secondary {
    background: #f8fafc;
    color: #334155;
    border-color: #cbd5e1;
}

.ho-btn-secondary:hover {
    background: #f1f5f9;
}

.ho-banner {
    background: linear-gradient(135deg, rgba(2,132,199,0.06), rgba(16,185,129,0.06));
    border: 1px solid rgba(2,132,199,0.25);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 24px;
    font-size: 12.5px;
    color: #0369a1;
    line-height: 1.5;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.ho-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.ho-stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.ho-stat-label {
    font-size: 11.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
    margin-bottom: 4px;
}

.ho-stat-val {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
}

.ho-stat-sub {
    font-size: 11px;
    color: #10b981;
    margin-top: 3px;
    font-weight: 600;
}

.ho-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
}

.ho-officer-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.ho-officer-card.privacy {
    border-top: 4px solid #0284c7;
}

.ho-officer-card.security {
    border-top: 4px solid #10b981;
}

.ho-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.ho-role-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.privacy .ho-role-badge {
    background: #e0f2fe;
    color: #0369a1;
}

.security .ho-role-badge {
    background: #dcfce7;
    color: #15803d;
}

.ho-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #15803d;
    background: #f0fdf4;
    padding: 3px 8px;
    border-radius: 9999px;
    border: 1px solid #bbf7d0;
}

.ho-officer-name {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 2px;
}

.ho-officer-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #475569;
    margin: 0 0 16px;
}

.ho-details-table {
    width: 100%;
    margin-bottom: 16px;
    font-size: 12.5px;
    border-collapse: collapse;
}

.ho-details-table td {
    padding: 6px 0;
    vertical-align: top;
    border-bottom: 1px solid #f1f5f9;
}

.ho-dt-label {
    width: 130px;
    color: #64748b;
    font-weight: 600;
}

.ho-dt-val {
    color: #0f172a;
    font-weight: 500;
    word-break: break-word;
}

.ho-scope-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 18px;
    font-size: 12px;
    color: #334155;
    line-height: 1.5;
    max-height: 105px;
    overflow-y: auto;
}

.ho-scope-label {
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.3px;
}

.ho-card-actions {
    display: flex;
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
}

/* Modal Styling */
.ho-modal-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.ho-modal-overlay.open {
    display: flex;
}

.ho-modal-box {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
}

.ho-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ho-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}

.ho-modal-body {
    padding: 20px 24px;
}

.ho-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.ho-form-group.full {
    grid-column: 1 / -1;
}

.ho-label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 5px;
}

.ho-input, .ho-textarea, .ho-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    box-sizing: border-box;
}

.ho-input:focus, .ho-textarea:focus, .ho-select:focus {
    border-color: #0284c7;
    outline: none;
    box-shadow: 0 0 0 2px rgba(2,132,199,0.15);
}

.ho-textarea {
    resize: vertical;
    min-height: 70px;
}

.ho-modal-footer {
    padding: 14px 24px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-radius: 0 0 12px 12px;
}

:root[data-theme="dark"] .ho-container { color: var(--text-primary); }
:root[data-theme="dark"] .ho-title { color: var(--text-primary); }
:root[data-theme="dark"] .ho-stat-card,
:root[data-theme="dark"] .ho-officer-card,
:root[data-theme="dark"] .ho-modal-box { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .ho-stat-val,
:root[data-theme="dark"] .ho-officer-name,
:root[data-theme="dark"] .ho-dt-val,
:root[data-theme="dark"] .ho-modal-title { color: var(--text-primary); }
:root[data-theme="dark"] .ho-scope-box,
:root[data-theme="dark"] .ho-modal-footer { background: var(--bg-surface-alt); border-color: var(--border-color); }
:root[data-theme="dark"] .ho-input,
:root[data-theme="dark"] .ho-textarea,
:root[data-theme="dark"] .ho-select { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-primary); }
</style>

<div class="ho-container">
    <div class="ho-header">
        <div>
            <h2 class="ho-title">
                <span>🛡️</span>
                <span>HIPAA Privacy &amp; Security Officer Designation</span>
            </h2>
            <p class="ho-subtitle">
                Official federal personnel designations mandated by <strong>45 CFR § 164.530(a)</strong> (HIPAA Privacy Official &amp; Contact Person) and <strong>45 CFR § 164.308(a)(2)</strong> (HIPAA Security Official). Subject to mandatory 6-year documentation retention (§ 164.530(j) &amp; § 164.316(b)).
            </p>
        </div>
        <div class="ho-header-actions">
            <button type="button" class="ho-btn ho-btn-secondary" id="btnExportHipaaOfficersCsv">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Registry (CSV)</span>
            </button>
            <a href="#/system-documentation" class="ho-btn ho-btn-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Statutory Docs</span>
            </a>
        </div>
    </div>

    <!-- AUTOMATIC PROPAGATION NOTICE -->
    <div class="ho-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:1px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div>
            <strong>Dynamic EHR Operationalization:</strong> Designation credentials updated here are automatically reflected in real time across the <strong>Notice of Privacy Practices</strong> Section 10 (§ 164.520), <strong>Accounting of Disclosures</strong> Patient Statements (§ 164.528), <strong>Security Incident &amp; Breach Notification</strong> Letters (§ 164.404), <strong>Right of Access</strong> 30-day Extension Notices (§ 164.524), and <strong>Safe Harbor De-Identification</strong> Compliance Attestations (§ 164.514). Every update is cryptographically hashed with sequential HMAC-SHA-256 signatures.
        </div>
    </div>

    <!-- TELEMETRY STATS -->
    <div class="ho-stats-grid">
        <div class="ho-stat-card">
            <div class="ho-stat-label">Privacy Official (§ 164.530(a))</div>
            <div class="ho-stat-val" id="hoStatPrivacyStatus">ACTIVE</div>
            <div class="ho-stat-sub" id="hoStatPrivacyTenure">Designated Active</div>
        </div>
        <div class="ho-stat-card">
            <div class="ho-stat-label">Security Official (§ 164.308(a)(2))</div>
            <div class="ho-stat-val" id="hoStatSecurityStatus">ACTIVE</div>
            <div class="ho-stat-sub" id="hoStatSecurityTenure">Designated Active</div>
        </div>
        <div class="ho-stat-card">
            <div class="ho-stat-label">Statutory Retention Status</div>
            <div class="ho-stat-val" style="color: #10b981;">6 YEARS</div>
            <div class="ho-stat-sub">Mandatory § 164.530(j) Compliant</div>
        </div>
        <div class="ho-stat-card">
            <div class="ho-stat-label">Governance Audit Events</div>
            <div class="ho-stat-val" id="hoStatGovernanceAudits">0</div>
            <div class="ho-stat-sub">HMAC-SHA-256 Sealed</div>
        </div>
    </div>

    <!-- DUAL OFFICER CARDS -->
    <div class="ho-cards-grid">
        <!-- PRIVACY OFFICER CARD -->
        <div class="ho-officer-card privacy" id="cardPrivacyOfficer">
            <div>
                <div class="ho-card-top">
                    <span class="ho-role-badge">45 CFR § 164.530(a)</span>
                    <span class="ho-status-badge" id="badgePrivacyStatus">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg>
                        <span>Active Statutory Role</span>
                    </span>
                </div>
                <h3 class="ho-officer-name" id="cardPrivacyOfficerName">Sarah Jenkins, JD, CHPC</h3>
                <div class="ho-officer-title" id="cardPrivacyOfficerTitle">Chief Privacy &amp; Compliance Officer</div>

                <table class="ho-details-table">
                    <tbody>
                        <tr>
                            <td class="ho-dt-label">Official Email:</td>
                            <td class="ho-dt-val" id="cardPrivacyOfficerEmail">privacy@usintellix-hospital.com</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Direct Phone:</td>
                            <td class="ho-dt-val" id="cardPrivacyOfficerPhone">(800) 555-0199 / Ext. 4040</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Office Address:</td>
                            <td class="ho-dt-val" id="cardPrivacyOfficerAddress">100 Healthcare Boulevard, Suite 500, Medical District, NY 10001</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Appointment Date:</td>
                            <td class="ho-dt-val" id="cardPrivacyOfficerAppointed">January 15, 2024</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Appointed By:</td>
                            <td class="ho-dt-val" id="cardPrivacyOfficerAppointedBy">Board of Directors / Chief Executive Officer</td>
                        </tr>
                    </tbody>
                </table>

                <div class="ho-scope-box">
                    <div class="ho-scope-label">Statutory Responsibilities &amp; Grievance Scope:</div>
                    <div id="cardPrivacyOfficerScope">
                        Responsible for the development, implementation, and maintenance of hospital-wide HIPAA Privacy Rule policies and procedures under 45 CFR § 164.530(a)(1)(i), receiving and investigating patient privacy grievances under § 164.530(a)(1)(ii), overseeing Notice of Privacy Practices dissemination (§ 164.520), Designated Record Set requests (§ 164.524), PHI amendment workflows (§ 164.526), Accounting of Disclosures (§ 164.528), and Business Associate Agreements (§ 164.502(e)).
                    </div>
                </div>
            </div>

            <div class="ho-card-actions">
                <button type="button" class="ho-btn ho-btn-primary" id="btnEditPrivacyOfficer" style="flex:1;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Edit Designation</span>
                </button>
                <button type="button" class="ho-btn ho-btn-secondary" id="btnPrintPrivacyAttestation" style="flex:1;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    <span>Print Attestation</span>
                </button>
            </div>
        </div>

        <!-- SECURITY OFFICER CARD -->
        <div class="ho-officer-card security" id="cardSecurityOfficer">
            <div>
                <div class="ho-card-top">
                    <span class="ho-role-badge">45 CFR § 164.308(a)(2)</span>
                    <span class="ho-status-badge" id="badgeSecurityStatus">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg>
                        <span>Active Statutory Role</span>
                    </span>
                </div>
                <h3 class="ho-officer-name" id="cardSecurityOfficerName">Marcus Vance, CISSP, HCISPP</h3>
                <div class="ho-officer-title" id="cardSecurityOfficerTitle">Chief Information Security Officer</div>

                <table class="ho-details-table">
                    <tbody>
                        <tr>
                            <td class="ho-dt-label">Official Email:</td>
                            <td class="ho-dt-val" id="cardSecurityOfficerEmail">security@usintellix-hospital.com</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Direct Phone:</td>
                            <td class="ho-dt-val" id="cardSecurityOfficerPhone">(800) 555-0199 / Ext. 4088</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Office Address:</td>
                            <td class="ho-dt-val" id="cardSecurityOfficerAddress">100 Healthcare Boulevard, Suite 500, Medical District, NY 10001</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Appointment Date:</td>
                            <td class="ho-dt-val" id="cardSecurityOfficerAppointed">January 15, 2024</td>
                        </tr>
                        <tr>
                            <td class="ho-dt-label">Appointed By:</td>
                            <td class="ho-dt-val" id="cardSecurityOfficerAppointedBy">Board of Directors / Chief Executive Officer</td>
                        </tr>
                    </tbody>
                </table>

                <div class="ho-scope-box">
                    <div class="ho-scope-label">Statutory Safeguards &amp; Security Scope:</div>
                    <div id="cardSecurityOfficerScope">
                        Responsible for the development, implementation, and operational oversight of technical, administrative, and physical safeguards required by the HIPAA Security Rule under 45 CFR § 164.308(a)(2), conducting enterprise security risk analyses (§ 164.308(a)(1)(ii)(A)), incident response and 4-factor breach risk evaluations (§ 164.402), disaster recovery verification (§ 164.308(a)(7)), role-based access management (§ 164.312(a)), and cryptographic integrity auditing (§ 164.312(b)).
                    </div>
                </div>
            </div>

            <div class="ho-card-actions">
                <button type="button" class="ho-btn ho-btn-primary" id="btnEditSecurityOfficer" style="flex:1;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Edit Designation</span>
                </button>
                <button type="button" class="ho-btn ho-btn-secondary" id="btnPrintSecurityAttestation" style="flex:1;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    <span>Print Attestation</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- EDIT OFFICER MODAL -->
<div class="ho-modal-overlay" id="modalEditHipaaOfficer">
    <div class="ho-modal-box">
        <div class="ho-modal-header">
            <h3 class="ho-modal-title" id="modalEditOfficerTitle">Edit Officer Designation</h3>
            <button type="button" id="btnCloseEditOfficerModal" style="background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">&times;</button>
        </div>
        <form id="formEditHipaaOfficer">
            <div class="ho-modal-body">
                <input type="hidden" id="editOfficerType" value="">
                
                <div id="alertEditOfficer" style="display:none; margin-bottom:14px; padding:10px 14px; border-radius:6px; font-size:12.5px;"></div>

                <div class="ho-form-grid">
                    <div class="ho-form-group full">
                        <label class="ho-label">Officer Full Name &amp; Academic Credentials *</label>
                        <input type="text" id="editOfficerFullName" class="ho-input" required placeholder="e.g. Sarah Jenkins, JD, CHPC">
                    </div>

                    <div class="ho-form-group full">
                        <label class="ho-label">Official Title / Corporate Role *</label>
                        <input type="text" id="editOfficerTitle" class="ho-input" required placeholder="e.g. Chief Privacy & Compliance Officer">
                    </div>

                    <div class="ho-form-group">
                        <label class="ho-label">Confidential Contact Email *</label>
                        <input type="email" id="editOfficerEmail" class="ho-input" required placeholder="e.g. privacy@usintellix-hospital.com">
                    </div>

                    <div class="ho-form-group">
                        <label class="ho-label">Direct Telephone *</label>
                        <input type="text" id="editOfficerPhone" class="ho-input" required placeholder="e.g. (800) 555-0199">
                    </div>

                    <div class="ho-form-group">
                        <label class="ho-label">Phone Extension</label>
                        <input type="text" id="editOfficerExtension" class="ho-input" placeholder="e.g. 4040">
                    </div>

                    <div class="ho-form-group">
                        <label class="ho-label">Official Appointment Date *</label>
                        <input type="date" id="editOfficerAppointmentDate" class="ho-input" required>
                    </div>

                    <div class="ho-form-group full">
                        <label class="ho-label">Physical Office / Postal Address</label>
                        <input type="text" id="editOfficerAddress" class="ho-input" placeholder="e.g. 100 Healthcare Boulevard, Suite 500, Medical District">
                    </div>

                    <div class="ho-form-group full">
                        <label class="ho-label">Appointed By (Governing Body / Executive)</label>
                        <input type="text" id="editOfficerAppointedBy" class="ho-input" placeholder="e.g. Board of Directors / Chief Executive Officer">
                    </div>

                    <div class="ho-form-group full">
                        <label class="ho-label">Scope of Statutory Responsibilities</label>
                        <textarea id="editOfficerScope" class="ho-textarea" rows="3" placeholder="Summary of duties, oversight, and statutory authorities..."></textarea>
                    </div>

                    <div class="ho-form-group full">
                        <label class="ho-label">Administrative &amp; Board Notes</label>
                        <textarea id="editOfficerNotes" class="ho-textarea" rows="2" placeholder="Internal compliance notes or board resolution references..."></textarea>
                    </div>

                    <div class="ho-form-group">
                        <label class="ho-label">Designation Status</label>
                        <select id="editOfficerActive" class="ho-select">
                            <option value="1">Active Designation</option>
                            <option value="0">Inactive / Past Designation</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="ho-modal-footer">
                <button type="button" class="ho-btn ho-btn-secondary" id="btnCancelEditOfficer">Cancel</button>
                <button type="submit" class="ho-btn ho-btn-primary" id="btnSaveOfficerDesignation">Save Official Designation</button>
            </div>
        </form>
    </div>
</div>
`;
}
