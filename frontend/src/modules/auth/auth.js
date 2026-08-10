console.log("auth.js loaded");
import { login, verifyTwoFactor } from "./auth.service.js?v=2";
import { saveUser } from "../../core/session.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { initBranding } from "../../core/branding.js";

const FIELDS = ["username", "password"];

export function initLogin()
{
     console.log("initLogin called");

    enablePasswordToggles();
    initBranding();

    const loginForm =
        document.getElementById("loginForm");

    const twoFactorForm =
        document.getElementById("twoFactorForm");


    loginForm.addEventListener(
        "submit",
        async (event)=>{

            event.preventDefault();

            clearErrors();


            const username =
                document.getElementById("username").value;


            const password =
                document.getElementById("password").value;


            const result =
                await login(
                    username,
                    password
                );


            console.log(result);


            if(!result.success)
            {
                showAlert(result.message, "error");

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


            saveUser(result.data.user);


            window.location.hash =
                "#/dashboard";

        }
    );


    twoFactorForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            document.getElementById("err-tfa_code").textContent = "";

            const code =
                document.getElementById("tfa_code").value.trim();

            const result =
                await verifyTwoFactor(code);

            if (!result.success) {
                document.getElementById("err-tfa_code").textContent = result.message;
                return;
            }

            saveUser(result.data.user);

            window.location.hash =
                "#/dashboard";

        }
    );


    document.getElementById("backToLoginBtn").addEventListener("click", (event) => {
        event.preventDefault();
        showLoginStep();
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

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
