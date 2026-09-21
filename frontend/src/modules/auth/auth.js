console.log("auth.js loaded");
import { login, verifyTwoFactor, completeFirstLogin, updateExpiredPassword, logout } from "./auth.service.js?v=3";
import { saveUser, clearSession } from "../../core/session.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { initBranding } from "../../core/branding.js";
import { resetInactivityTimer, stopInactivityGuard } from "../../core/inactivity-guard.js?v=1";

const FIELDS = ["username", "password"];

export function initLogin()
{
     console.log("initLogin called");

    stopInactivityGuard();

    enablePasswordToggles();
    initBranding();

    if (window.location.hash.includes("reason=inactivity")) {
        showAlert(`
            <div class="login-alert-content">
                <div class="login-alert-header">
                    <span class="login-alert-badge">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        HIPAA § 164.312(a)(2)(iii)
                    </span>
                    <span class="login-alert-time">15-Min Inactivity</span>
                </div>
                <div class="login-alert-main">
                    <div class="login-alert-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div class="login-alert-text-block">
                        <strong class="login-alert-title">Session Safely Logged Off</strong>
                        <p class="login-alert-desc">Your session was automatically terminated after 15 minutes of inactivity in accordance with federal HIPAA safeguards to protect electronic health records.</p>
                        <span class="login-alert-hint">Please enter your credentials below to log in again.</span>
                    </div>
                </div>
            </div>
        `, "warning");
    }

    const loginForm =
        document.getElementById("loginForm");

    const twoFactorForm =
        document.getElementById("twoFactorForm");

    const firstLoginForm =
        document.getElementById("firstLoginForm");

    const expiredPasswordForm =
        document.getElementById("expiredPasswordForm");


    loginForm.addEventListener(
        "submit",
        async (event)=>{

            event.preventDefault();

            clearErrors();


            const username =
                document.getElementById("username").value;


            const password =
                document.getElementById("password").value;


            const submitBtn = loginForm.querySelector(".login-btn");

            setButtonLoading(submitBtn, true, "Logging in...");

            let result;

            try {
                result =
                    await login(
                        username,
                        password
                    );
            } finally {
                setButtonLoading(submitBtn, false);
            }


            console.log(result);


            if(!result.success)
            {
                if (result.password_expired) {
                    showExpiredPasswordStep(result);
                    return;
                }

                if (result.locked) {
                    showAlert(`
                        <div style="display:flex;align-items:flex-start;gap:10px;text-align:left;">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:2px;">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <div>
                                <strong style="display:block;margin-bottom:4px;">Account Temporarily Locked</strong>
                                <span>${result.message}</span>
                            </div>
                        </div>
                    `, "error");
                } else {
                    showAlert(result.message, "error");
                }

                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, message]) => {
                        const errorEl = document.getElementById(`err-${field}`);

                        if (errorEl) {
                            errorEl.textContent = message;
                        }
                    });
                }

                return;
            }


            if (result.data.requires_2fa) {
                showTwoFactorStep(result.data);
                return;
            }


            proceedAfterAuthentication(result.data.user);

        }
    );


    twoFactorForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            document.getElementById("err-tfa_code").textContent = "";

            const code =
                document.getElementById("tfa_code").value.trim();

            const submitBtn = twoFactorForm.querySelector(".login-btn");

            setButtonLoading(submitBtn, true, "Verifying...");

            let result;

            try {
                result =
                    await verifyTwoFactor(code);
            } finally {
                setButtonLoading(submitBtn, false);
            }

            if (!result.success) {
                document.getElementById("err-tfa_code").textContent = result.message;
                return;
            }

            proceedAfterAuthentication(result.data.user);

        }
    );


    document.getElementById("backToLoginBtn").addEventListener("click", (event) => {
        event.preventDefault();
        showLoginStep();
    });


    firstLoginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            clearFirstLoginErrors();

            const newPassword = document.getElementById("fl_new_password").value;
            const confirmPassword = document.getElementById("fl_confirm_password").value;

            if (newPassword !== confirmPassword) {
                document.getElementById("err-fl_confirm_password").textContent = "Passwords do not match.";
                return;
            }

            const submitBtn = firstLoginForm.querySelector(".login-btn");

            setButtonLoading(submitBtn, true, "Saving...");

            let result;

            try {
                result = await completeFirstLogin({
                    username: document.getElementById("fl_username").value.trim(),
                    current_password: document.getElementById("fl_current_password").value,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                    confirm_email: document.getElementById("fl_confirm_email").value.trim()
                });
            } finally {
                setButtonLoading(submitBtn, false);
            }

            if (!result.success) {
                showAlert(result.message, "error");

                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, message]) => {
                        const errorEl = document.getElementById(`err-fl_${field}`);

                        if (errorEl) {
                            errorEl.textContent = message;
                        }
                    });
                }

                return;
            }

            saveUser(result.data.user);

            window.location.hash =
                "#/dashboard";

        }
    );


    document.getElementById("firstLoginCancelBtn").addEventListener("click", async () => {
        await logout();
        clearSession();
        showLoginStep();
    });

    if (expiredPasswordForm) {
        expiredPasswordForm.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();
                clearExpiredPasswordErrors();

                const userId = parseInt(document.getElementById("exp_user_id").value, 10);
                const username = document.getElementById("exp_username").value.trim();
                const currentPassword = document.getElementById("exp_current_password").value;
                const newPassword = document.getElementById("exp_new_password").value;
                const confirmPassword = document.getElementById("exp_confirm_password").value;

                if (!currentPassword) {
                    document.getElementById("err-exp_current_password").textContent = "Current password is required.";
                    return;
                }

                if (!newPassword) {
                    document.getElementById("err-exp_new_password").textContent = "New password is required.";
                    return;
                }

                if (newPassword !== confirmPassword) {
                    document.getElementById("err-exp_confirm_password").textContent = "Passwords do not match.";
                    return;
                }

                const submitBtn = expiredPasswordForm.querySelector(".login-btn");
                setButtonLoading(submitBtn, true, "Updating Password...");

                let result;
                try {
                    result = await updateExpiredPassword({
                        user_id: userId,
                        username: username,
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    });
                } finally {
                    setButtonLoading(submitBtn, false);
                }

                if (!result.success) {
                    showAlert(result.message, "error");
                    if (result.errors) {
                        Object.entries(result.errors).forEach(([field, message]) => {
                            const errorEl = document.getElementById(`err-exp_${field}`);
                            if (errorEl) {
                                errorEl.textContent = message;
                            }
                        });
                    }
                    return;
                }

                proceedAfterAuthentication(result.data.user);
            }
        );
    }

    const expiredCancelBtn = document.getElementById("expiredPasswordCancelBtn");
    if (expiredCancelBtn) {
        expiredCancelBtn.addEventListener("click", () => {
            showLoginStep();
        });
    }

}

function proceedAfterAuthentication(user)
{
    if (user.must_change_password) {
        showFirstLoginStep(user);
        return;
    }

    saveUser(user);
    resetInactivityTimer();

    window.location.hash =
        "#/dashboard";
}

function showFirstLoginStep(user)
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("twoFactorForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";
    document.getElementById("firstLoginForm").style.display = "";

    document.getElementById("fl_account_name").value = user.username;
    document.getElementById("fl_username").value = user.username;
    document.getElementById("fl_current_password").value = "";
    document.getElementById("fl_new_password").value = "";
    document.getElementById("fl_confirm_password").value = "";
    document.getElementById("fl_confirm_email").value = "";

    clearFirstLoginErrors();
}

const FIRST_LOGIN_FIELDS = ["username", "current_password", "new_password", "confirm_password", "confirm_email"];

function clearFirstLoginErrors()
{
    FIRST_LOGIN_FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-fl_${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showExpiredPasswordStep(data)
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) {
        expForm.style.display = "";
    }

    const idEl = document.getElementById("exp_user_id");
    if (idEl) idEl.value = data.user_id || "";

    const userEl = document.getElementById("exp_username");
    if (userEl) userEl.value = data.username || "";

    const curEl = document.getElementById("exp_current_password");
    if (curEl) curEl.value = "";

    const newEl = document.getElementById("exp_new_password");
    if (newEl) newEl.value = "";

    const confEl = document.getElementById("exp_confirm_password");
    if (confEl) confEl.value = "";

    clearExpiredPasswordErrors();
    const alertEl = document.getElementById("formAlert");
    if (alertEl) {
        alertEl.innerHTML = "";
    }
}

const EXPIRED_FIELDS = ["current_password", "new_password", "confirm_password"];

function clearExpiredPasswordErrors()
{
    EXPIRED_FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-exp_${field}`);
        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showTwoFactorStep(data)
{
    document.getElementById("loginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";
    document.getElementById("twoFactorForm").style.display = "";

    const destination = data.destination || "your " + (data.method === "email" ? "email" : "phone");
    const via = data.method === "email" ? "email" : "SMS";

    document.getElementById("tfaInstructions").textContent =
        `We sent a verification code via ${via} to ${destination}.`;

    const devNotice = document.getElementById("tfaDevNotice");

    if (data.dev_mode && data.dev_code) {
        devNotice.innerHTML = `<div class="form-alert">Development mode &mdash; verification code: <strong>${data.dev_code}</strong> (no real message was sent).</div>`;
        devNotice.style.display = "";
    } else {
        devNotice.style.display = "none";
        devNotice.innerHTML = "";
    }

    document.getElementById("tfa_code").value = "";
    document.getElementById("err-tfa_code").textContent = "";
    document.getElementById("tfa_code").focus();
}

function showLoginStep()
{
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";
    document.getElementById("loginForm").style.display = "";
    document.getElementById("password").value = "";
    clearErrors();
    clearExpiredPasswordErrors();
}

function clearErrors()
{
    FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function setButtonLoading(button, loading, loadingText)
{
    if (!button) {
        return;
    }

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.classList.add("is-loading");
        button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.classList.remove("is-loading");
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    if (!container) {
        return;
    }

    if (!message) {
        container.innerHTML = "";
        return;
    }

    // If message is already structured HTML
    if (typeof message === "string" && (message.includes("<div") || message.includes("<svg") || message.includes("<strong"))) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
        return;
    }

    let iconSvg = "";
    if (type === "error") {
        iconSvg = `<svg class="form-alert-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else if (type === "warning") {
        iconSvg = `<svg class="form-alert-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === "success") {
        iconSvg = `<svg class="form-alert-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else {
        iconSvg = `<svg class="form-alert-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    container.innerHTML = `
        <div class="form-alert ${type}">
            <div class="form-alert-row">
                ${iconSvg}
                <div class="form-alert-body">${message}</div>
            </div>
        </div>
    `;
}
