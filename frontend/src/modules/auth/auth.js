console.log("auth.js loaded");
import { login, verifyTwoFactor, completeFirstLogin, updateExpiredPassword, logout, acknowledgeNpp } from "./auth.service.js?v=4";
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
            <div class="session-ended-alert">
                <div class="session-ended-left">
                    <svg class="session-ended-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span class="session-ended-title">Session Ended</span>
                </div>
                <button type="button" class="alert-dismiss-btn" id="dismissAlertBtn" aria-label="Dismiss" title="Dismiss">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `, "warning");

        const dismissBtn = document.getElementById("dismissAlertBtn");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", () => {
                const alertEl = document.getElementById("formAlert");
                if (alertEl) {
                    alertEl.style.transition = "opacity 0.2s ease, transform 0.2s ease";
                    alertEl.style.opacity = "0";
                    alertEl.style.transform = "translateY(-6px)";
                    setTimeout(() => {
                        alertEl.innerHTML = "";
                        alertEl.style.opacity = "";
                        alertEl.style.transform = "";
                        alertEl.style.transition = "";
                    }, 200);
                }
                if (window.location.hash.includes("reason=inactivity")) {
                    history.replaceState(null, "", window.location.pathname + "#/login");
                }
            });
        }
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

            proceedAfterAuthentication(result.data.user);

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

    const nppConsentForm = document.getElementById("nppConsentForm");
    if (nppConsentForm) {
        nppConsentForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearNppErrors();

            const checkPrivacy = document.getElementById("npp_check_privacy");
            const checkTerms = document.getElementById("npp_check_terms");
            const signatureInput = document.getElementById("npp_signature_name");
            const submitBtn = document.getElementById("nppSubmitBtn");

            let hasError = false;
            if (!checkPrivacy || !checkPrivacy.checked) {
                const errEl = document.getElementById("err-npp_check_privacy");
                if (errEl) errEl.textContent = "You must acknowledge the Notice of Privacy Practices.";
                hasError = true;
            }
            if (!checkTerms || !checkTerms.checked) {
                const errEl = document.getElementById("err-npp_check_terms");
                if (errEl) errEl.textContent = "You must agree to the Terms of Service.";
                hasError = true;
            }

            const signatureName = (signatureInput?.value || "").trim();
            if (!signatureName) {
                const errEl = document.getElementById("err-npp_signature_name");
                if (errEl) errEl.textContent = "Please type your full legal name as your electronic signature.";
                hasError = true;
            }

            if (hasError) {
                return;
            }

            setButtonLoading(submitBtn, true, "Signing & Acknowledging...");

            try {
                const result = await acknowledgeNpp({
                    signature_data: signatureName,
                    signature_type: "electronic",
                    npp_version: "2026-09"
                });

                if (!result.success) {
                    showAlert(result.message || "Failed to record acknowledgment.", "error");
                    return;
                }

                const updatedUser = result.data?.user || (pendingNppUser ? { ...pendingNppUser, npp_acknowledged: true } : null);
                if (updatedUser) {
                    saveUser(updatedUser);
                }
                resetInactivityTimer();

                window.location.hash = "#/dashboard";
            } catch (err) {
                showAlert("A network error occurred while submitting consent. Please try again.", "error");
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    const nppCancelBtn = document.getElementById("nppCancelBtn");
    if (nppCancelBtn) {
        nppCancelBtn.addEventListener("click", async () => {
            await logout();
            clearSession();
            showLoginStep();
        });
    }

}

let pendingNppUser = null;

function proceedAfterAuthentication(user)
{
    if (user.must_change_password) {
        showFirstLoginStep(user);
        return;
    }

    // HIPAA § 164.520 Patient Consent & Notice of Privacy Practices
    if ((user.role === "patient" || !user.role || user.role === "") && !user.npp_acknowledged) {
        showNppConsentStep(user);
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
    const nppForm = document.getElementById("nppConsentForm");
    if (nppForm) nppForm.style.display = "none";
    document.getElementById("loginForm").style.display = "";
    document.getElementById("password").value = "";
    clearErrors();
    clearExpiredPasswordErrors();
    clearNppErrors();
}

function showNppConsentStep(user)
{
    pendingNppUser = user;
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";

    const nppForm = document.getElementById("nppConsentForm");
    if (nppForm) {
        nppForm.style.display = "";
    }

    const checkPrivacy = document.getElementById("npp_check_privacy");
    if (checkPrivacy) checkPrivacy.checked = false;
    const checkTerms = document.getElementById("npp_check_terms");
    if (checkTerms) checkTerms.checked = false;

    const signatureInput = document.getElementById("npp_signature_name");
    if (signatureInput) {
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
        signatureInput.value = fullName || "";
        signatureInput.focus();
    }

    clearNppErrors();
    const alertEl = document.getElementById("formAlert");
    if (alertEl) alertEl.innerHTML = "";
}

function clearNppErrors()
{
    ["check_privacy", "check_terms", "signature_name"].forEach((id) => {
        const el = document.getElementById(`err-npp_${id}`);
        if (el) el.textContent = "";
    });
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
                <button type="button" class="alert-dismiss-btn" onclick="const a=document.getElementById('formAlert');if(a)a.innerHTML='';" aria-label="Dismiss" title="Dismiss">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}
