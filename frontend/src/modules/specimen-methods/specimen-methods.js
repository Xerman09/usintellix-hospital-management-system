import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchSpecimenMethods,
    createSpecimenMethod,
    updateSpecimenMethod,
    deleteSpecimenMethod
} from "./specimen-methods.service.js";

const FIELDS = ["name", "description"];

let methods = [];
let searchTerm = "";

export async function initSpecimenMethods()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("specimenMethodModalOverlay");
    const modalTitle = document.getElementById("specimenMethodModalTitle");
    const saveBtn = document.getElementById("saveSpecimenMethodBtn");
    const idInput = document.getElementById("specimen_method_id");
    const form = document.getElementById("specimenMethodForm");
    const searchInput = document.getElementById("specimenMethodSearch");
    const searchClear = document.getElementById("specimenMethodSearchClear");

    const openModal = (method) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (method) {
            modalTitle.textContent = "Edit Method";
            saveBtn.textContent = "Save Changes";
            idInput.value = method.id;
            document.getElementById("name").value = method.name ?? "";
            document.getElementById("description").value = method.description ?? "";
        } else {
            modalTitle.textContent = "Add Method";
            saveBtn.textContent = "Add Method";
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

    document.getElementById("openAddSpecimenMethodModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeSpecimenMethodModal").addEventListener("click", closeModal);
    document.getElementById("cancelSpecimenMethod").addEventListener("click", closeModal);
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
        const result = editingId
            ? await updateSpecimenMethod(editingId, data)
            : await createSpecimenMethod(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save specimen method.", "error");

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
        showToast(editingId ? "Method updated successfully." : "Method added successfully.", "success");
        await loadSpecimenMethods(openModal);
    });

    await loadSpecimenMethods(openModal);
}

async function loadSpecimenMethods(openModal)
{
    const result = await fetchSpecimenMethods();

    methods = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("specimenMethodsTableBody");
    const countText = document.getElementById("specimenMethodCountText");

    countText.textContent = `${methods.length} ${methods.length === 1 ? "method" : "methods"}`;

    const filtered = searchTerm
        ? methods.filter((method) =>
            method.name.toLowerCase().includes(searchTerm) ||
            (method.description ?? "").toLowerCase().includes(searchTerm))
        : methods;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(methods.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((method) => `
        <tr>
            <td>
                <div class="sm-name-cell">
                    <div class="sm-avatar">${escapeHtml((method.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="sm-name">${escapeHtml(method.name)}</span>
                </div>
            </td>
            <td class="sm-description ${method.description ? "" : "empty"}">${escapeHtml(method.description || "No description provided")}</td>
            <td>
                <div class="sm-actions">
                    <button class="sm-icon-btn edit" data-edit-id="${method.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="sm-icon-btn delete" data-id="${method.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const method = methods.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (method) {
                openModal(method);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this specimen method?")) {
                return;
            }

            const result = await deleteSpecimenMethod(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete specimen method.", "error");
                return;
            }

            showToast("Specimen method deleted successfully.", "success");
            await loadSpecimenMethods(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No methods yet" : "No matching methods";
    const message = noneAtAll
        ? "Create your first specimen method to start recording how specimens were collected."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="sm-empty-state">
                <div class="sm-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
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
