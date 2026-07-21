import { getUser } from "../../core/session.js";
import { fetchProviders, createProvider, deleteProvider } from "./providers.service.js";
import { fetchDepartments } from "../employees/employees.service.js";

const FIELDS = [
    "title", "first_name", "middle_name", "last_name", "suffix",
    "specialty", "npi_number", "license_number", "dea_number",
    "email", "phone", "department_id", "status"
];

export async function initProviders()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    await loadDepartments();
    await loadProviders();

    const modalOverlay = document.getElementById("addProviderModalOverlay");
    const form = document.getElementById("addProviderForm");

    const openModal = () => modalOverlay.classList.add("open");
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddProviderModal").addEventListener("click", openModal);
    document.getElementById("closeAddProviderModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddProvider").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

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

        const result = await createProvider(data);

        if (!result.success) {
            showAlert(result.message || "Failed to create provider.", "error");

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
        showListAlert("Provider added successfully.", "success");
        await loadProviders();
    });
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

async function loadProviders()
{
    const tbody = document.getElementById("providersTableBody");
    const result = await fetchProviders();

    if (!result.success || !result.data.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No providers registered yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = result.data.map((provider) => `
        <tr>
            <td>${[provider.title, provider.first_name, provider.middle_name, provider.last_name, provider.suffix].filter(Boolean).join(" ")}</td>
            <td>${provider.specialty}</td>
            <td>${provider.npi_number ?? "-"}</td>
            <td>${provider.email}</td>
            <td>${provider.phone}</td>
            <td><span class="status-pill status-${provider.status}">${provider.status}</span></td>
            <td><button class="btn-danger" data-id="${provider.id}">Delete</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-danger").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this provider? This will not affect existing patient records.")) {
                return;
            }

            await deleteProvider(btn.getAttribute("data-id"));
            await loadProviders();
        });
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

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
