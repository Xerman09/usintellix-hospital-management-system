console.log("auth.js loaded");
import { login } from "./auth.service.js";
import { saveUser } from "../../core/session.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = ["subdomain", "username", "password"];

export function initLogin()
{
     console.log("initLogin called");

    enablePasswordToggles();

    const form =
        document.getElementById("loginForm");


    form.addEventListener(
        "submit",
        async (event)=>{

            event.preventDefault();

            clearErrors();


            const subdomain =
                document.getElementById("subdomain").value;


            const username =
                document.getElementById("username").value;


            const password =
                document.getElementById("password").value;


            const result =
                await login(
                    subdomain,
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


            saveUser(result.data.user);


            window.location.hash =
                "#/dashboard";

        }
    );


    const registerCompanyBtn =
        document.getElementById("registerCompanyBtn");


    if (registerCompanyBtn) {
        registerCompanyBtn.addEventListener(
            "click",
            () => {
                window.location.hash = "#/register-company";
            }
        );
    }

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