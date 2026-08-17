import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchSpecimenTypes,
    createSpecimenType,
    updateSpecimenType,
    deleteSpecimenType
} from "./specimen-types.service.js";

const FIELDS = ["name", "description"];

let types = [];
let searchTerm = "";

export async function initSpecimenTypes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("specimenTypeModalOverlay");
    const modalTitle = document.getElementById("specimenTypeModalTitle");
    const saveBtn = document.getElementById("saveSpecimenTypeBtn");
    const idInput = document.getElementById("specimen_type_id");
    const form = document.getElementById("specimenTypeForm");
    const searchInput = document.getElementById("specimenTypeSearch");
    const searchClear = document.getElementById("specimenTypeSearchClear");

    const openModal = (type) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (type) {
            modalTitle.textContent = "Edit Type";
            saveBtn.textContent = "Save Changes";
            idInput.value = type.id;
            document.getElementById("name").value = type.name ?? "";
            document.getElementById("description").value = type.description ?? "";
        } else {
            modalTitle.textContent = "Add Type";
            saveBtn.textContent = "Add Type";
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

    document.getElementById("openAddSpecimenTypeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeSpecimenTypeModal").addEventListener("click", closeModal);
    document.getElementById("cancelSpecimenType").addEventListener("click", closeModal);
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
            ? await updateSpecimenType(editingId, data)
            : await createSpecimenType(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save specimen type.", "error");

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
        showToast(editingId ? "Type updated successfully." : "Type added successfully.", "success");
        await loadSpecimenTypes(openModal);
    });

    await loadSpecimenTypes(openModal);
}

async function loadSpecimenTypes(openModal)
{
    const result = await fetchSpecimenTypes();

    types = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("specimenTypesTableBody");
    const countText = document.getElementById("specimenTypeCountText");

    countText.textContent = `${types.length} ${types.length === 1 ? "type" : "types"}`;

    const filtered = searchTerm
        ? types.filter((type) =>
            type.name.toLowerCase().includes(searchTerm) ||
            (type.description ?? "").toLowerCase().includes(searchTerm))
        : types;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(types.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((type) => `
        <tr>
            <td>
                <div class="st-name-cell">
                    <div class="st-avatar">${escapeHtml((type.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="st-name">${escapeHtml(type.name)}</span>
                </div>
            </td>
            <td class="st-description ${type.description ? "" : "empty"}">${escapeHtml(type.description || "No description provided")}</td>
            <td>
                <div class="st-actions">
                    <button class="st-icon-btn edit" data-edit-id="${type.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="st-icon-btn delete" data-id="${type.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const type = types.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (type) {
                openModal(type);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this specimen type?")) {
                return;
            }

            const result = await deleteSpecimenType(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete specimen type.", "error");
                return;
            }

            showToast("Specimen type deleted successfully.", "success");
            await loadSpecimenTypes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No types yet" : "No matching types";
    const message = noneAtAll
        ? "Create your first specimen type to start categorizing collected specimens."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="st-empty-state">
                <div class="st-empty-icon">
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
