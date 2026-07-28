import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPrescriptionCategories,
    createPrescriptionCategory,
    updatePrescriptionCategory,
    deletePrescriptionCategory
} from "./prescription-categories.service.js";

const FIELDS = ["name", "description"];

let categories = [];
let searchTerm = "";

export async function initPrescriptionCategories()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("prescriptionCategoryModalOverlay");
    const modalTitle = document.getElementById("prescriptionCategoryModalTitle");
    const saveBtn = document.getElementById("savePrescriptionCategoryBtn");
    const idInput = document.getElementById("prescription_category_id");
    const form = document.getElementById("prescriptionCategoryForm");
    const searchInput = document.getElementById("prescriptionCategorySearch");
    const searchClear = document.getElementById("prescriptionCategorySearchClear");

    const openModal = (category) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (category) {
            modalTitle.textContent = "Edit Prescription Category";
            saveBtn.textContent = "Save Changes";
            idInput.value = category.id;
            document.getElementById("name").value = category.name ?? "";
            document.getElementById("description").value = category.description ?? "";
        } else {
            modalTitle.textContent = "Add Prescription Category";
            saveBtn.textContent = "Add Prescription Category";
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

    document.getElementById("openAddPrescriptionCategoryModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePrescriptionCategoryModal").addEventListener("click", closeModal);
    document.getElementById("cancelPrescriptionCategory").addEventListener("click", closeModal);
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
            ? await updatePrescriptionCategory(editingId, data)
            : await createPrescriptionCategory(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save prescription category.", "error");

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
        showToast(editingId ? "Prescription category updated successfully." : "Prescription category added successfully.", "success");
        await loadPrescriptionCategories(openModal);
    });

    await loadPrescriptionCategories(openModal);
}

async function loadPrescriptionCategories(openModal)
{
    const result = await fetchPrescriptionCategories();

    categories = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("prescriptionCategoriesTableBody");
    const countText = document.getElementById("prescriptionCategoryCountText");

    countText.textContent = `${categories.length} ${categories.length === 1 ? "category" : "categories"}`;

    const filtered = searchTerm
        ? categories.filter((category) =>
            category.name.toLowerCase().includes(searchTerm) ||
            (category.description ?? "").toLowerCase().includes(searchTerm))
        : categories;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(categories.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((category) => `
        <tr>
            <td>
                <div class="pc-name-cell">
                    <div class="pc-avatar">${escapeHtml((category.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pc-name">${escapeHtml(category.name)}</span>
                </div>
            </td>
            <td class="pc-description ${category.description ? "" : "empty"}">${escapeHtml(category.description || "No description provided")}</td>
            <td>
                <div class="pc-actions">
                    <button class="pc-icon-btn edit" data-edit-id="${category.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pc-icon-btn delete" data-id="${category.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const category = categories.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (category) {
                openModal(category);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this prescription category?")) {
                return;
            }

            const result = await deletePrescriptionCategory(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete prescription category.", "error");
                return;
            }

            showToast("Prescription category deleted successfully.", "success");
            await loadPrescriptionCategories(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No prescription categories yet" : "No matching categories";
    const message = noneAtAll
        ? "Create your first category to start classifying patient prescriptions."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="pc-empty-state">
                <div class="pc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"></path></svg>
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
