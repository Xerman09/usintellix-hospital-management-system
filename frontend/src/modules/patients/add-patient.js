import { getUser } from "../../core/session.js";
import { createPatient } from "./patients.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "username", "password", "first_name", "middle_name",
    "last_name", "suffix", "sex", "birthdate",
    "civil_status", "blood_type", "height", "weight"
];

export async function initAddPatient()
{
    const user = getUser();

    if (!user || user.role !== "receptionist") {
        window.location.hash = "#/dashboard";
        return;
    }

    enablePasswordToggles();

    const form = document.getElementById("addPatientForm");

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

        const result = await createPatient(data);

        if (!result.success) {
            showAlert(result.message || "Failed to register patient.", "error");

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

        showAlert(`Patient registered successfully. Patient No: ${result.data.patient_no}`, "success");
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
