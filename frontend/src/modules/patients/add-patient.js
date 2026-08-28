import { getUser } from "../../core/session.js";
import { createPatient } from "./patients.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "username", "password", "first_name", "middle_name",
    "last_name", "suffix", "sex", "birthdate",
    "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased"
];

export async function initAddPatient()
{
    const user = getUser();

    if (!user || user.role !== "receptionist") {
        window.location.hash = "#/dashboard";
        return;
    }

    enablePasswordToggles();
    wireTabs();

    document.getElementById("birthdate").max = new Date().toISOString().split("T")[0];

    await loadProviders();

    const form = document.getElementById("addPatientForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton.disabled) {
            return;
        }

        submitButton.disabled = true;

        clearErrors();

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        try {
            const result = await createPatient(data);

            if (!result.success) {
                if (result.errors && Object.keys(result.errors).length > 0) {
                    showAlert(Object.values(result.errors).join(" "), "error");

                    let firstErrorField = null;

                    Object.entries(result.errors).forEach(([field, message]) => {
                        const errorEl = document.getElementById(`err-${field}`);

                        if (errorEl) {
                            errorEl.textContent = message;
                        }

                        if (!firstErrorField) {
                            firstErrorField = field;
                        }
                    });

                    revealField(firstErrorField);
                } else {
                    showAlert(result.message || "Failed to register patient.", "error");
                }

                return;
            }

            showAlert(`Patient registered successfully. Patient No: ${result.data.patient_no}`, "success");
            form.reset();
            resetTabs();
        } catch (error) {
            showAlert("Something went wrong while registering the patient. Please try again.", "error");
        } finally {
            submitButton.disabled = false;
        }
    });
}

/**
 * Switch to the tab containing a field and focus it, so a validation
 * error on a non-default tab (e.g. Choices, Contact Info) isn't invisible.
 */
function revealField(fieldId)
{
    if (!fieldId) {
        return;
    }

    const fieldEl = document.getElementById(fieldId);
    const panel = fieldEl?.closest(".modal-tab-panel");

    if (!panel) {
        return;
    }

    const tabName = panel.getAttribute("data-panel");
    const tabBtn = document.querySelector(`.modal-tab[data-tab="${tabName}"]`);

    tabBtn?.click();
    fieldEl.focus();
}

function wireTabs()
{
    const tabs = document.querySelectorAll(".modal-tab");
    const panels = document.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            document.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });
}

function resetTabs()
{
    const tabs = document.querySelectorAll(".modal-tab");
    const panels = document.querySelectorAll(".modal-tab-panel");

    tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
    panels.forEach((p, i) => p.classList.toggle("active", i === 0));
}

async function loadProviders()
{
    const result = await fetchProviders();
    const select = document.getElementById("provider_id");

    if (result.success) {
        result.data.forEach((provider) => {
            const option = document.createElement("option");

            option.value = provider.id;
            option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

            select.appendChild(option);
        });
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

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
