import { getUser } from "../../core/session.js";
import { createEmployee, fetchRoles, fetchDepartments } from "./employees.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "username", "password", "role_id", "department_id",
    "first_name", "middle_name", "last_name", "suffix",
    "sex", "birthdate", "email", "phone"
];

export async function initAddEmployee()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    enablePasswordToggles();

    await Promise.all([loadRoles(), loadDepartments()]);

    const form = document.getElementById("addEmployeeForm");

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

        const result = await createEmployee(data);

        if (!result.success) {
            showAlert(result.message || "Failed to create employee.", "error");

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

        showAlert(`Employee created successfully. Employee No: ${result.data.employee_no}`, "success");
        form.reset();
    });
}

async function loadRoles()
{
    const result = await fetchRoles();
    const select = document.getElementById("role_id");

    if (result.success) {
        result.data.forEach((role) => {
            const option = document.createElement("option");

            option.value = role.id;
            option.textContent = role.name;

            select.appendChild(option);
        });
    }
}

async function loadDepartments()
{
    const result = await fetchDepartments();
    const select = document.getElementById("department_id");

    if (result.success) {
        result.data.forEach((department) => {
            const option = document.createElement("option");

            option.value = department.id;
            option.textContent = department.name;

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
