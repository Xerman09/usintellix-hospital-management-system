console.log("auth.js loaded");
import { login, verifyTwoFactor, resendTwoFactor, completeFirstLogin, updateExpiredPassword, updateBreachedPassword, checkPasswordBreach, logout, acknowledgeNpp, requestPasswordReset, verifyPasswordResetCode, completePasswordReset } from "./auth.service.js?v=10";
import { saveUser, clearSession } from "../../core/session.js?v=5";
import { markResultsInboxLogin } from "../results-inbox/results-inbox.js?v=8";
import { markMyWorkLogin } from "../my-work/my-work.js?v=7";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { initBranding } from "../../core/branding.js";
import { resetInactivityTimer, stopInactivityGuard } from "../../core/inactivity-guard.js?v=4";

const FIELDS = ["username", "password"];

export function initLogin()
{
     console.log("initLogin called");

    stopInactivityGuard();

    enablePasswordToggles();
    initBranding();
    initForgotPassword();

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
                if (result.password_breached) {
                    showBreachedPasswordStep(result);
                    return;
                }

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


    document.getElementById("resendTfaBtn").addEventListener("click", async () => {
        const resendBtn = document.getElementById("resendTfaBtn");
        resendBtn.disabled = true;
        resendBtn.textContent = "Sending...";

        const result = await resendTwoFactor();

        if (!result.success) {
            const wait = Number(result.errors?.resend_in) || 0;
            document.getElementById("err-tfa_code").textContent = result.message;
            if (wait > 0) {
                startResendCooldown(wait);
            } else {
                resendBtn.textContent = "Resend code";
                resendBtn.disabled = false;
            }
            return;
        }

        showTwoFactorStep(result.data);
        showAlert(result.message, "success");
    });


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

    const breachedPasswordForm = document.getElementById("breachedPasswordForm");
    if (breachedPasswordForm) {
        let breachDebounce = null;
        const newPassInput = document.getElementById("brch_new_password");
        const warnBox = document.getElementById("brch_password_breach_warning");
        const submitBtn = document.getElementById("breachedPasswordSubmitBtn");

        newPassInput?.addEventListener("input", () => {
            clearTimeout(breachDebounce);
            const val = newPassInput.value;
            if (val.length < 6) {
                if (warnBox) { warnBox.style.display = "none"; warnBox.textContent = ""; }
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            breachDebounce = setTimeout(async () => {
                try {
                    const check = await checkPasswordBreach(val);
                    if (check?.data?.breached) {
                        if (warnBox) {
                            const cnt = check.data.count ? Number(check.data.count).toLocaleString() : "";
                            warnBox.innerHTML = `<strong>Breached Password Detected:</strong> This password has appeared in public breaches ${cnt ? `(${cnt} times)` : ""} and is unsafe. You cannot use this password.`;
                            warnBox.style.display = "block";
                        }
                        if (submitBtn) submitBtn.disabled = true;
                    } else {
                        if (warnBox) { warnBox.style.display = "none"; warnBox.textContent = ""; }
                        if (submitBtn) submitBtn.disabled = false;
                    }
                } catch (err) {
                    // ignore network errors
                }
            }, 350);
        });

        breachedPasswordForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearBreachedPasswordErrors();

            const userId = parseInt(document.getElementById("brch_user_id").value, 10);
            const username = document.getElementById("brch_username").value.trim();
            const currentPassword = document.getElementById("brch_current_password").value;
            const newPassword = document.getElementById("brch_new_password").value;
            const confirmPassword = document.getElementById("brch_confirm_password").value;

            if (!currentPassword) {
                document.getElementById("err-brch_current_password").textContent = "Current password is required.";
                return;
            }
            if (!newPassword) {
                document.getElementById("err-brch_new_password").textContent = "New password is required.";
                return;
            }
            if (newPassword !== confirmPassword) {
                document.getElementById("err-brch_confirm_password").textContent = "Passwords do not match.";
                return;
            }

            setButtonLoading(submitBtn, true, "Updating Compromised Password...");

            let result;
            try {
                result = await updateBreachedPassword({
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
                        const errorEl = document.getElementById(`err-brch_${field}`);
                        if (errorEl) {
                            errorEl.textContent = message;
                        }
                    });
                }
                return;
            }

            proceedAfterAuthentication(result.data.user);
        });
    }

    const breachedCancelBtn = document.getElementById("breachedPasswordCancelBtn");
    if (breachedCancelBtn) {
        breachedCancelBtn.addEventListener("click", () => {
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
    // The results inbox opens by itself after sign-in when there are new results.
    markResultsInboxLogin();
    // ... and the dashboard opens on My Work.
    markMyWorkLogin();

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
    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) brchForm.style.display = "none";
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

function showBreachedPasswordStep(data)
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";
    const nppForm = document.getElementById("nppConsentForm");
    if (nppForm) nppForm.style.display = "none";

    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) {
        brchForm.style.display = "";
    }

    const idEl = document.getElementById("brch_user_id");
    if (idEl) idEl.value = data.user_id || "";

    const userEl = document.getElementById("brch_username");
    if (userEl) userEl.value = data.username || "";

    const curEl = document.getElementById("brch_current_password");
    if (curEl) curEl.value = "";

    const newEl = document.getElementById("brch_new_password");
    if (newEl) newEl.value = "";

    const confEl = document.getElementById("brch_confirm_password");
    if (confEl) confEl.value = "";

    const msgEl = document.getElementById("breachedAlertMsg");
    if (msgEl) {
        const cnt = data.breach_count ? Number(data.breach_count).toLocaleString() : "many";
        msgEl.innerHTML = `Your current password was detected in a list of known data breaches (appeared <strong>${cnt}</strong> times). For your security and HIPAA compliance (§ 164.308), access has been blocked until you change it right away. The system will strictly not allow any password included in that breach list.`;
    }

    clearBreachedPasswordErrors();
    const alertEl = document.getElementById("formAlert");
    if (alertEl) {
        alertEl.innerHTML = "";
    }
}

const BREACHED_FIELDS = ["current_password", "new_password", "confirm_password"];

function clearBreachedPasswordErrors()
{
    BREACHED_FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-brch_${field}`);
        if (errorEl) {
            errorEl.textContent = "";
        }
    });
    const warnBox = document.getElementById("brch_password_breach_warning");
    if (warnBox) {
        warnBox.style.display = "none";
        warnBox.textContent = "";
    }
}

function showExpiredPasswordStep(data)
{
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) brchForm.style.display = "none";
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
    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) brchForm.style.display = "none";
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

    // Drop any leftover alert from the password step (e.g. an earlier
    // "Invalid username or password") so it doesn't sit above the code form.
    const alertEl = document.getElementById("formAlert");
    if (alertEl) alertEl.innerHTML = "";

    document.getElementById("tfa_code").value = "";
    document.getElementById("err-tfa_code").textContent = "";
    document.getElementById("tfa_code").focus();

    startTfaTimers(Number(data.expires_in) || 600, Number(data.resend_in) || 60);
}

let tfaTimerInterval = null;
let tfaExpiresAt = 0;
let tfaResendAt = 0;

function startTfaTimers(expiresIn, resendIn)
{
    const now = Date.now();
    tfaExpiresAt = now + expiresIn * 1000;
    tfaResendAt = now + resendIn * 1000;
    runTfaTimer();
}

function startResendCooldown(seconds)
{
    tfaResendAt = Date.now() + seconds * 1000;
    runTfaTimer();
}

function stopTfaTimers()
{
    clearInterval(tfaTimerInterval);
    tfaTimerInterval = null;
}

function runTfaTimer()
{
    stopTfaTimers();
    renderTfaTimer();
    tfaTimerInterval = setInterval(renderTfaTimer, 1000);
}

function renderTfaTimer()
{
    const timerEl = document.getElementById("tfaTimer");
    const resendBtn = document.getElementById("resendTfaBtn");
    const verifyBtn = document.querySelector("#twoFactorForm .login-btn");

    if (!timerEl || !resendBtn) {
        stopTfaTimers();
        return;
    }

    const now = Date.now();
    const expiresLeft = Math.max(0, Math.ceil((tfaExpiresAt - now) / 1000));
    const resendLeft = Math.max(0, Math.ceil((tfaResendAt - now) / 1000));

    if (expiresLeft > 0) {
        const mins = Math.floor(expiresLeft / 60);
        const secs = String(expiresLeft % 60).padStart(2, "0");
        timerEl.textContent = `Code expires in ${mins}:${secs}`;
        timerEl.classList.toggle("is-urgent", expiresLeft <= 60);
        timerEl.classList.remove("is-expired");
        if (verifyBtn && !verifyBtn.classList.contains("is-loading")) verifyBtn.disabled = false;
    } else {
        timerEl.textContent = "This code has expired. Please request a new one.";
        timerEl.classList.remove("is-urgent");
        timerEl.classList.add("is-expired");
        if (verifyBtn) verifyBtn.disabled = true;
    }

    // An expired code makes the cooldown moot -- let them resend right away.
    if (resendLeft > 0 && expiresLeft > 0) {
        resendBtn.disabled = true;
        resendBtn.textContent = `Resend code (${resendLeft}s)`;
    } else {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
    }

    if (expiresLeft === 0 && resendLeft === 0) {
        stopTfaTimers();
    }
}

function showLoginStep()
{
    stopTfaTimers();
    document.getElementById("twoFactorForm").style.display = "none";
    document.getElementById("firstLoginForm").style.display = "none";
    const expForm = document.getElementById("expiredPasswordForm");
    if (expForm) expForm.style.display = "none";
    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) brchForm.style.display = "none";
    const nppForm = document.getElementById("nppConsentForm");
    if (nppForm) nppForm.style.display = "none";
    hideForgotForms();
    document.getElementById("loginForm").style.display = "";
    document.getElementById("password").value = "";
    clearErrors();
    clearExpiredPasswordErrors();
    clearBreachedPasswordErrors();
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
    const brchForm = document.getElementById("breachedPasswordForm");
    if (brchForm) brchForm.style.display = "none";

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


/* =====================================================================
 * Forgot Password
 *
 * Two steps: ask for a code, then use it. They are separate forms rather
 * than one, because the server will not say whether an account exists --
 * so the first step cannot tell the user anything except "if we know you,
 * it is on its way", and putting a password box on that screen would
 * imply a confirmation the server never gave.
 *
 * The username is held in a module variable between the two steps rather
 * than in a hidden input, so it cannot be edited into somebody else's
 * between asking for a code and spending it. The server checks the pair
 * anyway; this just stops the UI offering a confusing way to fail.
 * ===================================================================== */

let forgotUsername = "";
let forgotResendTimer = null;
let forgotResendLeft = 0;

function hideForgotForms()
{
    const req = document.getElementById("forgotRequestForm");
    if (req) req.style.display = "none";
    const rst = document.getElementById("forgotResetForm");
    if (rst) rst.style.display = "none";
    stopForgotTimer();
}

function hideAllLoginSteps()
{
    ["loginForm", "twoFactorForm", "firstLoginForm", "expiredPasswordForm", "breachedPasswordForm", "nppConsentForm"]
        .forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
}

function stopForgotTimer()
{
    if (forgotResendTimer) {
        clearInterval(forgotResendTimer);
        forgotResendTimer = null;
    }
}

function startForgotTimer(seconds)
{
    stopForgotTimer();

    forgotResendLeft = Number(seconds) || 0;

    const btn = document.getElementById("fpResendBtn");
    const label = document.getElementById("fpResetTimer");

    const tick = () => {
        if (label) {
            label.textContent = forgotResendLeft > 0
                ? `You can ask for another code in ${forgotResendLeft}s.`
                : "";
        }

        if (btn) btn.disabled = forgotResendLeft > 0;

        if (forgotResendLeft <= 0) {
            stopForgotTimer();
            return;
        }

        forgotResendLeft--;
    };

    tick();
    forgotResendTimer = setInterval(tick, 1000);
}

function showForgotRequestStep()
{
    hideAllLoginSteps();
    hideForgotForms();

    const form = document.getElementById("forgotRequestForm");
    if (!form) return;

    form.style.display = "";

    const notice = document.getElementById("fpRequestNotice");
    if (notice) notice.style.display = "none";

    // Clear any code left on the step-2 panel, so coming back here and asking
    // again never shows digits belonging to a previous request.
    renderForgotDevCode(null);

    const field = document.getElementById("fp_username");
    if (field) {
        // Carried over from the login box if they already typed it there.
        field.value = (document.getElementById("username")?.value || "").trim();
        field.focus();
    }

    clearForgotErrors();
}

/**
 * Show the code on screen when the server could not email it.
 *
 * The server only ever sends dev_code back for a staff account, from loopback,
 * after a send that actually failed -- see schema 345. This side of it is
 * deliberately the same shape and wording as #tfaDevNotice on the verification
 * step, so the two read as one mechanism rather than two.
 */
function renderForgotDevCode(data)
{
    const notice = document.getElementById("fpDevNotice");
    if (!notice) return;

    if (data?.dev_mode && data?.dev_code) {
        notice.innerHTML = `<div class="form-alert">Development mode &mdash; reset code: <strong>${String(data.dev_code).replace(/[^0-9]/g, "")}</strong> (mail could not be sent, so no message went out).</div>`;
        notice.style.display = "";
        return;
    }

    notice.style.display = "none";
    notice.innerHTML = "";
}

function showForgotResetStep(message, resendIn, data)
{
    hideAllLoginSteps();
    hideForgotForms();

    const form = document.getElementById("forgotResetForm");
    if (!form) return;

    form.style.display = "";

    const instructions = document.getElementById("fpResetInstructions");
    if (instructions) instructions.textContent = message;

    renderForgotDevCode(data);

    ["fp_code", "fp_password", "fp_confirm"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const notice = document.getElementById("fpResetNotice");
    if (notice) notice.style.display = "none";

    clearForgotErrors();
    startForgotTimer(resendIn);

    document.getElementById("fp_code")?.focus();
}

function clearForgotErrors()
{
    ["err-fp_username", "err-fp_code", "err-fp_password", "err-fp_confirm"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
    });
}

function setForgotError(id, message)
{
    const el = document.getElementById(`err-${id}`);
    if (el) el.textContent = message || "";
}

function showForgotNotice(id, message)
{
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = message;
    el.style.display = "";
}

export function initForgotPassword()
{
    const link = document.querySelector(".forgot-password");

    if (link) {
        link.style.cursor = "pointer";
        link.addEventListener("click", (event) => {
            event.preventDefault();
            showForgotRequestStep();
        });
    }

    document.getElementById("fpBackToLogin")?.addEventListener("click", (event) => {
        event.preventDefault();
        showLoginStep();
    });

    document.getElementById("fpBackToLogin2")?.addEventListener("click", (event) => {
        event.preventDefault();
        showLoginStep();
    });

    const requestForm = document.getElementById("forgotRequestForm");

    requestForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearForgotErrors();

        const username = (document.getElementById("fp_username")?.value || "").trim();

        if (!username) {
            setForgotError("fp_username", "Enter the username or email you sign in with.");
            return;
        }

        const btn = requestForm.querySelector(".login-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

        const res = await requestPasswordReset(username).catch(() => null);

        if (btn) { btn.disabled = false; btn.textContent = "Send me a code"; }

        if (!res?.success) {
            // Only reached when the hospital has the feature switched off, or
            // the field was empty. There is no "no such user" case to handle.
            showForgotNotice("fpRequestNotice", res?.message || "That did not work. Please try again.");
            return;
        }

        forgotUsername = username;
        showForgotResetStep(res.message, res.data?.resend_in, res.data);
    });

    document.getElementById("fpResendBtn")?.addEventListener("click", async () => {
        if (!forgotUsername) return;

        const btn = document.getElementById("fpResendBtn");
        if (btn) btn.disabled = true;

        const res = await requestPasswordReset(forgotUsername).catch(() => null);

        showForgotNotice("fpResetNotice", res?.message || "If we recognise that account, another code is on its way.");

        // A resend issues a new code, so the one on screen is now the stale
        // one. Re-render rather than leaving the old digits sitting there.
        renderForgotDevCode(res?.data);
        startForgotTimer(res?.data?.resend_in);
    });

    const resetForm = document.getElementById("forgotResetForm");

    resetForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearForgotErrors();

        const code = (document.getElementById("fp_code")?.value || "").trim();
        const password = document.getElementById("fp_password")?.value || "";
        const confirm = document.getElementById("fp_confirm")?.value || "";

        if (!/^\d{6}$/.test(code)) {
            setForgotError("fp_code", "Enter the six-digit code.");
            return;
        }

        if (!password) {
            setForgotError("fp_password", "Choose a new password.");
            return;
        }

        // Checked here as well as on the server: a mistyped confirmation is the
        // one failure worth catching before spending an attempt on the code.
        if (password !== confirm) {
            setForgotError("fp_confirm", "The two passwords do not match.");
            return;
        }

        const btn = resetForm.querySelector(".login-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Setting…"; }

        const res = await completePasswordReset(forgotUsername, code, password).catch(() => null);

        if (btn) { btn.disabled = false; btn.textContent = "Set my new password"; }

        if (!res?.success) {
            const field = res?.errors?.password ? "fp_password" : "fp_code";
            setForgotError(field, res?.message || "That did not work.");
            return;
        }

        stopForgotTimer();
        forgotUsername = "";
        showLoginStep();
        showAlert(res.message || "Your password has been changed. You can sign in with it now.", "success");
    });
}
