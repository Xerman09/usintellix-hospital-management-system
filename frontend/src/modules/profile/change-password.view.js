export function ChangePasswordView() {
    return `
<style>
.cp-page-container {
    max-width: 680px;
    margin: 28px auto;
    padding: 0 16px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.cp-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.cp-card-header {
    padding: 24px 28px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(to bottom, #f8fafc, #ffffff);
}

.cp-card-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 12px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}

.cp-card-title {
    margin: 0 0 6px 0;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 10px;
}

.cp-card-title svg {
    color: #2563eb;
}

.cp-card-subtitle {
    margin: 0;
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.5;
}

.cp-card-body {
    padding: 28px;
}

.cp-notice-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.cp-notice-box svg {
    color: #d97706;
    flex-shrink: 0;
    margin-top: 2px;
}

.cp-notice-content {
    font-size: 13px;
    color: #92400e;
    line-height: 1.45;
}

.cp-notice-content strong {
    font-weight: 600;
}

.cp-form-group {
    margin-bottom: 20px;
}

.cp-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 7px;
}

.cp-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.cp-input {
    width: 100%;
    padding: 10px 42px 10px 14px;
    font-size: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #0f172a;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
}

.cp-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.cp-toggle-btn {
    position: absolute;
    right: 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #64748b;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
}

.cp-toggle-btn:hover {
    color: #0f172a;
}

.cp-rules-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-top: 10px;
    margin-bottom: 20px;
}

.cp-rules-title {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 10px;
}

.cp-rules-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    list-style: none;
    padding: 0;
    margin: 0;
}

.cp-rule-item {
    font-size: 12.5px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.15s;
}

.cp-rule-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
    flex-shrink: 0;
    transition: background-color 0.15s;
}

.cp-rule-item.valid {
    color: #16a34a;
    font-weight: 500;
}

.cp-rule-item.valid .cp-rule-dot {
    background: #16a34a;
}

.cp-error-msg {
    font-size: 12px;
    color: #dc2626;
    margin-top: 5px;
    display: none;
}

.cp-alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13.5px;
    margin-bottom: 20px;
    display: none;
}

.cp-alert.error {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
}

.cp-alert.success {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
}

.cp-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
}

.cp-btn-submit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;
}

.cp-btn-submit:hover {
    background: #1d4ed8;
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.cp-btn-submit:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
}

.cp-btn-cancel {
    background: #ffffff;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
}

.cp-btn-cancel:hover {
    background: #f8fafc;
    border-color: #94a3b8;
}

:root[data-theme="dark"] .cp-card {
    background: var(--bg-surface);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .cp-card-header {
    background: var(--bg-surface-alt);
    border-bottom-color: var(--border-color);
}
:root[data-theme="dark"] .cp-card-title {
    color: var(--text-primary);
}
:root[data-theme="dark"] .cp-input {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}
:root[data-theme="dark"] .cp-label {
    color: var(--text-primary);
}
:root[data-theme="dark"] .cp-rules-panel {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .cp-rules-title {
    color: var(--text-muted);
}
:root[data-theme="dark"] .cp-btn-cancel {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}
</style>

<div class="cp-page-container">
    <div class="cp-card">
        <div class="cp-card-header">
            <div class="cp-card-header-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                HIPAA Security Standard § 164.308(a)(5)(ii)(D)
            </div>
            <h1 class="cp-card-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Change Account Password
            </h1>
            <p class="cp-card-subtitle">
                Keep your account secure by choosing a strong password conforming to hospital privacy and security standards.
            </p>
        </div>

        <div class="cp-card-body">
            <div class="cp-notice-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div class="cp-notice-content">
                    <strong>HIPAA Security Notice:</strong> Passwords expire regularly to protect patient and clinical data. You cannot reuse your current password or any of your last 5 previous passwords.
                </div>
            </div>

            <div id="cpAlert" class="cp-alert"></div>

            <form id="cpForm" autocomplete="off">
                <div class="cp-form-group">
                    <label class="cp-label" for="cpCurrentPassword">Current Password</label>
                    <div class="cp-input-wrap">
                        <input type="password" id="cpCurrentPassword" class="cp-input" placeholder="Enter current password" required autocomplete="current-password">
                        <button type="button" class="cp-toggle-btn" data-toggle-for="cpCurrentPassword" aria-label="Show password">
                            <svg class="cp-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                    <div id="errCpCurrentPassword" class="cp-error-msg"></div>
                </div>

                <div class="cp-form-group">
                    <label class="cp-label" for="cpNewPassword">New Password</label>
                    <div class="cp-input-wrap">
                        <input type="password" id="cpNewPassword" class="cp-input" placeholder="Enter new strong password" required autocomplete="new-password">
                        <button type="button" class="cp-toggle-btn" data-toggle-for="cpNewPassword" aria-label="Show password">
                            <svg class="cp-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                    <div id="errCpNewPassword" class="cp-error-msg"></div>
                </div>

                <div class="cp-rules-panel">
                    <div class="cp-rules-title">Password Complexity Requirements</div>
                    <ul class="cp-rules-list">
                        <li class="cp-rule-item" id="ruleMinLength">
                            <span class="cp-rule-dot"></span>
                            At least 8 characters
                        </li>
                        <li class="cp-rule-item" id="ruleUppercase">
                            <span class="cp-rule-dot"></span>
                            One uppercase letter (A-Z)
                        </li>
                        <li class="cp-rule-item" id="ruleLowercase">
                            <span class="cp-rule-dot"></span>
                            One lowercase letter (a-z)
                        </li>
                        <li class="cp-rule-item" id="ruleNumber">
                            <span class="cp-rule-dot"></span>
                            One number (0-9)
                        </li>
                        <li class="cp-rule-item" id="ruleSpecial">
                            <span class="cp-rule-dot"></span>
                            One special character (!@#$%^&*)
                        </li>
                        <li class="cp-rule-item" id="ruleMatch">
                            <span class="cp-rule-dot"></span>
                            Passwords match
                        </li>
                    </ul>
                </div>

                <div class="cp-form-group">
                    <label class="cp-label" for="cpConfirmPassword">Confirm New Password</label>
                    <div class="cp-input-wrap">
                        <input type="password" id="cpConfirmPassword" class="cp-input" placeholder="Re-enter new password" required autocomplete="new-password">
                        <button type="button" class="cp-toggle-btn" data-toggle-for="cpConfirmPassword" aria-label="Show password">
                            <svg class="cp-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                    <div id="errCpConfirmPassword" class="cp-error-msg"></div>
                </div>

                <div class="cp-actions">
                    <button type="reset" id="cpCancelBtn" class="cp-btn-cancel">Reset</button>
                    <button type="submit" id="cpSubmitBtn" class="cp-btn-submit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
`;
}
