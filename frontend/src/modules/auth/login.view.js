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

    </div>

</div>

`;
}
