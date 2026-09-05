import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    createEmployee,
    updateEmployee,
    fetchEmployees,
    fetchRoles,
    fetchDepartments
} from "./employees.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";

const FIELDS = [
    "username", "password", "role_id", "department_id",
    "first_name", "middle_name", "last_name", "suffix",
    "sex", "birthdate", "email", "phone"
];

let employees = [];
let searchTerm = "";

export async function initAddEmployee()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    enablePasswordToggles();

    document.getElementById("birthdate").max = new Date().toISOString().split("T")[0];

    const modalOverlay = document.getElementById("employeeModalOverlay");
    const modalTitle = document.getElementById("employeeModalTitle");
    const modalSubtitle = document.getElementById("employeeModalSubtitle");
    const passwordHint = document.getElementById("passwordHint");
    const passwordInput = document.getElementById("password");
    const saveBtn = document.getElementById("saveEmployeeBtn");
    const idInput = document.getElementById("employee_id");
    const form = document.getElementById("addEmployeeForm");
    const searchInput = document.getElementById("employeeSearch");
    const searchClear = document.getElementById("employeeSearchClear");

    const openModal = (employee) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (employee) {
            modalTitle.textContent = "Edit Employee";
            modalSubtitle.textContent = "Update this employee's login account and record.";
            saveBtn.textContent = "Save Changes";
            passwordInput.placeholder = "••••••••";
            passwordHint.style.display = "";

            idInput.value = employee.id;
            document.getElementById("username").value = employee.username ?? "";
            passwordInput.value = "";
            document.getElementById("role_id").value = employee.role_id ?? "";
            document.getElementById("department_id").value = employee.department_id ?? "";
            document.getElementById("first_name").value = employee.first_name ?? "";
            document.getElementById("middle_name").value = employee.middle_name ?? "";
            document.getElementById("last_name").value = employee.last_name ?? "";
            document.getElementById("suffix").value = employee.suffix ?? "";
            document.getElementById("sex").value = employee.sex ?? "";
            document.getElementById("birthdate").value = employee.birthdate ?? "";
            document.getElementById("email").value = employee.email ?? "";
            document.getElementById("phone").value = employee.phone ?? "";
        } else {
            modalTitle.textContent = "Add Employee";
            modalSubtitle.textContent = "Create a login account and employee record.";
            saveBtn.textContent = "Create Employee";
            passwordInput.placeholder = "••••••••";
            passwordHint.style.display = "none";

            idInput.value = "";
            form.reset();
        }

        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        idInput.value = "";
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddEmployeeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeEmployeeModal").addEventListener("click", closeModal);
    document.getElementById("cancelEmployee").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        renderRows(openModal);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchTerm = "";
        searchClear.classList.remove("show");
        renderRows(openModal);
        searchInput.focus();
    });

    await Promise.all([loadRoles(), loadDepartments()]);

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

        const editingId = idInput.value;

        setButtonLoading(saveBtn, true, editingId ? "Saving..." : "Creating...");

        let result;

        try {
            result = editingId
                ? await updateEmployee(editingId, data)
                : await createEmployee(data);
        } finally {
            setButtonLoading(saveBtn, false);
        }

        if (!result.success) {
            showAlert(result.message || "Failed to save employee.", "error");

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

        closeModal();
        showToast(editingId ? "Employee updated successfully." : "Employee created successfully.", "success");
        await loadEmployees(openModal);
    });

    await loadEmployees(openModal);
}

async function loadEmployees(openModal)
{
    const result = await fetchEmployees();

    employees = result.success ? result.data : [];

    renderRows(openModal);
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

function renderRows(openModal)
{
    const tbody = document.getElementById("employeesTableBody");
    const countText = document.getElementById("employeeCountText");

    countText.textContent = `${employees.length} ${employees.length === 1 ? "employee" : "employees"}`;

    const filtered = searchTerm
        ? employees.filter((employee) => {
            const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();

            return fullName.includes(searchTerm) ||
                (employee.username ?? "").toLowerCase().includes(searchTerm) ||
                (employee.employee_no ?? "").toLowerCase().includes(searchTerm) ||
                (employee.email ?? "").toLowerCase().includes(searchTerm);
        })
        : employees;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(employees.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((employee) => {
        const fullName = [employee.first_name, employee.middle_name, employee.last_name, employee.suffix]
            .filter(Boolean)
            .join(" ");

        const initial = (employee.first_name || "?").charAt(0).toUpperCase();

        return `
        <tr>
            <td>
                <div class="vc-name-cell">
                    <div class="vc-avatar">${escapeHtml(initial)}</div>
                    <div>
                        <div class="vc-name">${escapeHtml(fullName)}</div>
                        <div class="vc-subtext">${escapeHtml(employee.employee_no || "")}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(employee.username || "")}</td>
            <td><span class="vc-role-pill">${escapeHtml(employee.role_name || "")}</span></td>
            <td class="vc-description ${employee.department_name ? "" : "empty"}">${escapeHtml(employee.department_name || "No department")}</td>
            <td>
                <div class="vc-name">${escapeHtml(employee.email || "")}</div>
                <div class="vc-subtext">${escapeHtml(employee.phone || "")}</div>
            </td>
            <td>
                <div class="vc-actions">
                    <button class="vc-icon-btn edit" data-edit-id="${employee.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const employee = employees.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (employee) {
                openModal(employee);
            }
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No employees yet" : "No matching employees";
    const message = noneAtAll
        ? "Add your first employee to create their login account."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="6" class="vc-empty-state">
                <div class="vc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
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
