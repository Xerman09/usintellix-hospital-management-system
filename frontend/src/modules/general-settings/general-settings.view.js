export function GeneralSettingsView()
{
    return `
<style>
.gs-page {
    width: 100%;
    font-size: 13.5px;
}

.gs-card {
    width: 100%;
}

.gs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.gs-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.gs-header .form-subtitle {
    margin: 1px 0 0;
    max-width: 480px;
}

.gs-add-btn {
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

.gs-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.gs-add-btn svg {
    width: 14px;
    height: 14px;
}

.gs-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}

.gs-status-badge.on {
    background: #e6f6ec;
    color: #1f7a44;
}

.gs-status-badge.off {
    background: #f1f3f7;
    color: #5a6478;
}

.gs-role-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.gs-role-chip {
    padding: 3px 10px;
    border-radius: 999px;
    background: #eef1f7;
    color: #374151;
    font-size: 12px;
    font-weight: 500;
}

.gs-2fa-toggle {
    display: flex;
    gap: 18px;
    margin-bottom: 4px;
}

.gs-2fa-toggle label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    color: #25324b;
    cursor: pointer;
}

.gs-2fa-toggle input {
    accent-color: var(--accent);
}

.gs-2fa-detail {
    display: none;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #eef1f7;
}

.gs-2fa-detail.open {
    display: block;
}

.gs-role-checklist {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 18px;
    margin-top: 6px;
}

.gs-role-checklist label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #25324b;
}

.gs-role-checklist input {
    accent-color: var(--accent);
}

:root[data-theme="dark"] .gs-role-chip { background: var(--bg-surface-alt); color: var(--text-primary); }
:root[data-theme="dark"] .gs-2fa-toggle label,
:root[data-theme="dark"] .gs-role-checklist label { color: var(--text-primary); }
:root[data-theme="dark"] .gs-2fa-detail { border-top-color: var(--border-color); }
:root[data-theme="dark"] .gs-status-badge.off { background: var(--bg-surface-alt); color: var(--text-muted); }
</style>

<div class="gs-page">
    <div class="gs-card">
        <div class="gs-header">
            <div>
                <h1>Two-Factor Authentication</h1>
                <p class="form-subtitle">Require an extra verification code at login for selected roles.</p>
            </div>
            <button type="button" class="gs-add-btn" id="openEditGeneralSettingsModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                Edit
            </button>
        </div>

        <div id="gsFormAlert"></div>

        <div class="form-grid" style="margin-top: 20px;">
            <div class="form-group full">
                <label>Status</label>
                <p><span class="gs-status-badge off" id="ro_tfa_status">Disabled</span></p>
            </div>

            <div class="form-group">
                <label>Method</label>
                <p id="ro_tfa_method">-</p>
            </div>

            <div class="form-group full">
                <label>Applies To</label>
                <div class="gs-role-list" id="ro_tfa_roles"><p>-</p></div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="editGeneralSettingsModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit Two-Factor Authentication</h2>
            <button type="button" class="modal-close" id="closeEditGeneralSettingsModal">&times;</button>
        </div>
        <p class="form-subtitle">Choose whether to require Two-Factor Authentication, and for which roles.</p>

        <div id="editGeneralSettingsFormAlert"></div>

        <form id="editGeneralSettingsForm">
            <div class="form-group full">
                <label>Enable Two-Factor Authentication?</label>
                <div class="gs-2fa-toggle">
                    <label><input type="radio" name="tfa_enabled" value="yes" id="tfa_enabled_yes"> Yes</label>
                    <label><input type="radio" name="tfa_enabled" value="no" id="tfa_enabled_no" checked> No</label>
                </div>
            </div>

            <div class="gs-2fa-detail" id="tfaDetailSection">
                <div class="form-group full">
                    <label>Verification Method</label>
                    <div class="gs-2fa-toggle">
                        <label><input type="radio" name="tfa_method" value="sms" id="tfa_method_sms" checked> SMS</label>
                        <label><input type="radio" name="tfa_method" value="email" id="tfa_method_email"> Email</label>
                    </div>
                    <span class="form-error" id="err-tfa_method"></span>
                </div>

                <div class="form-group full">
                    <label>Applies To</label>
                    <div class="gs-role-checklist" id="tfaRoleChecklist"></div>
                    <span class="form-error" id="err-tfa_role_ids"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelEditGeneralSettings">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>
`;
}
