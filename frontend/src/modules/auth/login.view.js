export function LoginView()
{
    return `

<div class="login-page">

    <div class="login-atmosphere" aria-hidden="true">
        <div class="login-shards">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="login-mesh"></div>
        <div class="login-grain"></div>
    </div>

    <div class="login-container">

        <div class="login-brand">
            <div class="login-logo">
                <img data-app-logo src="./assets/logo.png?v=1" alt="Business logo">
            </div>
            <span data-app-name>Intellix</span>
        </div>

        <h1>Login</h1>

        <div id="formAlert"></div>

        <form id="loginForm">

            <div class="form-group">
                <label class="sr-only" for="username">Username</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </span>
                    <input id="username" class="form-input" placeholder="Username">
                </div>
                <span class="form-error" id="err-username"></span>
            </div>

            <div class="form-group">
                <label class="sr-only" for="password">Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="password" type="password" class="form-input" placeholder="Password">
                </div>
                <span class="form-error" id="err-password"></span>
            </div>

            <label class="remember-row">
                <input type="checkbox"> Remember me
            </label>

            <button class="login-btn" type="submit">Login</button>

            <p class="login-forgot">Forgot Password? <a class="forgot-password">Click Here</a></p>

            <div class="login-divider"></div>

            <a class="login-secondary-btn">Contact Support</a>

            <div class="login-footer-legal" style="margin-top: 18px; text-align: center; font-size: 12px; color: var(--login-muted, rgba(222,229,250,.62));">
                <a href="#/privacy-policy" style="color: #38bdf8; text-decoration: none; font-weight: 500; transition: color 0.15s ease;">Privacy Policy</a>
                <span style="margin: 0 8px; opacity: 0.5;">&bull;</span>
                <a href="#/terms-conditions" style="color: #38bdf8; text-decoration: none; font-weight: 500; transition: color 0.15s ease;">Terms &amp; Conditions</a>
            </div>

        </form>

        <form id="twoFactorForm" style="display:none;">

            <p id="tfaInstructions" class="form-subtitle"></p>
            <div id="tfaDevNotice" style="display:none;"></div>

            <div class="form-group">
                <label class="sr-only" for="tfa_code">Verification code</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="tfa_code" class="form-input" placeholder="6-digit code" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
                </div>
                <span class="form-error" id="err-tfa_code"></span>
            </div>

            <button class="login-btn" type="submit">Verify</button>

            <p class="login-forgot"><a id="backToLoginBtn">Back to Login</a></p>

        </form>

        <form id="firstLoginForm" style="display:none;">

            <p class="form-subtitle">Please enter new credentials to continue.</p>

            <div class="form-group">
                <label class="login-field-label" for="fl_account_name">Account Name</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </span>
                    <input id="fl_account_name" class="form-input" disabled>
                </div>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="fl_username">Use Username</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </span>
                    <input id="fl_username" class="form-input">
                </div>
                <span class="form-error" id="err-fl_username"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="fl_current_password">Current Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="fl_current_password" type="password" class="form-input" autocomplete="current-password">
                </div>
                <span class="form-error" id="err-fl_current_password"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="fl_new_password">New Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="fl_new_password" type="password" class="form-input" placeholder="Min length is 8 with upper, lowercase, numbers mix" autocomplete="new-password">
                </div>
                <span class="form-error" id="err-fl_new_password"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="fl_confirm_password">Confirm New Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="fl_confirm_password" type="password" class="form-input" autocomplete="new-password">
                </div>
                <span class="form-error" id="err-fl_confirm_password"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="fl_confirm_email">Confirm Email Address</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m4 6 8 7 8-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <input id="fl_confirm_email" type="email" class="form-input" placeholder="Current on record trusted email">
                </div>
                <span class="form-error" id="err-fl_confirm_email"></span>
            </div>

            <div class="login-btn-row">
                <button class="login-btn-outline" type="button" id="firstLoginCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Log In</button>
            </div>

        </form>

        <form id="expiredPasswordForm" style="display:none;">

            <div class="form-alert warning" style="margin-bottom: 16px; font-size: 13px; line-height: 1.5;">
                <strong>HIPAA Security Notice (§ 164.308(a)(5)(ii)(D)):</strong><br>
                Your password has expired after 90 days. Please set a new secure password to proceed. Reusing any of your last 5 passwords is prohibited.
            </div>

            <input type="hidden" id="exp_user_id">

            <div class="form-group">
                <label class="login-field-label" for="exp_username">Username</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </span>
                    <input id="exp_username" class="form-input" disabled>
                </div>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="exp_current_password">Current Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="exp_current_password" type="password" class="form-input" autocomplete="current-password">
                </div>
                <span class="form-error" id="err-exp_current_password"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="exp_new_password">New Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="exp_new_password" type="password" class="form-input" placeholder="Min 8 chars, uppercase, lowercase, number & special char" autocomplete="new-password">
                </div>
                <span class="form-error" id="err-exp_new_password"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="exp_confirm_password">Confirm New Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="exp_confirm_password" type="password" class="form-input" autocomplete="new-password">
                </div>
                <span class="form-error" id="err-exp_confirm_password"></span>
            </div>

            <div class="login-btn-row">
                <button class="login-btn-outline" type="button" id="expiredPasswordCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Update Password &amp; Log In</button>
            </div>

        </form>

        <form id="nppConsentForm" style="display:none;">

            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04)); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    <strong style="color: #065f46; font-size: 14px;">HIPAA Notice of Privacy Practices (§ 164.520)</strong>
                </div>
                <p style="margin: 0; font-size: 12.5px; line-height: 1.45; color: #374151;">
                    Federal law requires that we provide you with notice of how your Protected Health Information (PHI) may be used, disclosed, and safeguarded, and obtain your electronic acknowledgment.
                </p>
            </div>

            <div style="border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 12px 14px; max-height: 150px; overflow-y: auto; font-size: 12px; line-height: 1.5; color: #4b5563; margin-bottom: 14px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Patient Privacy &amp; Consent Summary (NPP v2026-09):</p>
                <ul style="margin: 0; padding-left: 18px;">
                    <li><strong>Treatment, Payment &amp; Operations:</strong> We use your clinical records to coordinate medical care, process insurance claims, and maintain healthcare operations.</li>
                    <li><strong>Patient Rights:</strong> You have the right to inspect electronic records, request amendments, request confidential communications, and receive an accounting of disclosures (§ 164.528).</li>
                    <li><strong>Data Safeguards:</strong> Encrypted with AES-256-GCM at rest (§ 164.312(a)(2)(iv)), with strict role boundaries and tamper-evident audit logs.</li>
                    <li><strong>Authorizations:</strong> Non-routine disclosures require your prior written authorization.</li>
                </ul>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 12px;">
                <a href="#/privacy-policy" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">
                    Read Full Privacy Policy &rarr;
                </a>
                <a href="#/terms-conditions" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">
                    Read Terms of Service &rarr;
                </a>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 12.5px; color: #374151; margin-bottom: 8px;">
                    <input type="checkbox" id="npp_check_privacy" style="margin-top: 2.5px; cursor: pointer; accent-color: #10b981;">
                    <span>I acknowledge that I have received and understand the <strong>HIPAA Notice of Privacy Practices</strong>.</span>
                </label>
                <span class="form-error" id="err-npp_check_privacy"></span>

                <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 12.5px; color: #374151;">
                    <input type="checkbox" id="npp_check_terms" style="margin-top: 2.5px; cursor: pointer; accent-color: #10b981;">
                    <span>I agree to the <strong>Patient Portal Terms of Service</strong>.</span>
                </label>
                <span class="form-error" id="err-npp_check_terms"></span>
            </div>

            <div class="form-group">
                <label class="login-field-label" for="npp_signature_name">
                    Electronic Signature (Type Full Legal Name)
                </label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <input id="npp_signature_name" class="form-input" placeholder="e.g. Jane Doe" autocomplete="name">
                </div>
                <span style="font-size: 11px; color: #6b7280; display: block; margin-top: 4px;">
                    By typing your name, you attest under 45 CFR § 164.520 that you are the patient or an authorized representative.
                </span>
                <span class="form-error" id="err-npp_signature_name"></span>
            </div>

            <div class="login-btn-row">
                <button class="login-btn-outline" type="button" id="nppCancelBtn">Log Out</button>
                <button class="login-btn" type="submit" id="nppSubmitBtn" style="background: #059669;">
                    Sign &amp; Acknowledge &rarr;
                </button>
            </div>

        </form>

    </div>

</div>

`;
}
