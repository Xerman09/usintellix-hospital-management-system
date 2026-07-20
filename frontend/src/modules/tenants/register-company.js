import { saveUser } from "../../core/session.js";
import { registerCompany } from "./tenants.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "subdomain", "company_name", "company_email", "company_phone",
    "username", "password", "first_name", "middle_name", "last_name",
    "suffix", "sex", "birthdate", "email", "phone"
];

export function initRegisterCompany()
{
    enablePasswordToggles();

    const form = document.getElementById("registerCompanyForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await registerCompany(data);

        if (!result.success) {
            showAlert(result.message || "Failed to register company.", "error");

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

        if (result.data && result.data.user) {
            saveUser(result.data.user);
            window.location.hash = "#/dashboard";
            return;
        }

        showAlert("Company registered successfully. Please log in.", "success");
        form.reset();
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

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
