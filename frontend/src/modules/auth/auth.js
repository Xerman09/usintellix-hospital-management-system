console.log("auth.js loaded");
import { login, verifyTwoFactor, completeFirstLogin, logout } from "./auth.service.js?v=2";
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
        showAlert("Your session was safely logged off due to 15 minutes of inactivity in accordance with HIPAA Security Rule § 164.312(a)(2)(iii). Please log in again.", "warning");
    }

    const loginForm =
        document.getElementById("loginForm");

    const twoFactorForm =
        document.getElementById("twoFactorForm");

    const firstLoginForm =
        document.getElementById("firstLoginForm");


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

function showTwoFactorStep(data)
{
    document.getElementById("loginForm").style.display = "none";
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
    document.getElementById("loginForm").style.display = "";
    document.getElementById("password").value = "";
    clearErrors();
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

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
