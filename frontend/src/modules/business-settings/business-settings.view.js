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
</style>

<div class="ps-page">
    <h1 class="ps-title">Practice Settings</h1>

    <div class="ps-layout">
        <div class="ps-sidebar" id="psSidebar">
            <a class="ps-nav-link active" data-section="general">General</a>
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
