import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchProviderCategories,
    createProviderCategory,
    updateProviderCategory,
    deleteProviderCategory
} from "./provider-categories.service.js";

const FIELDS = ["name", "description"];

let categories = [];
let searchTerm = "";

export async function initProviderCategories()
{
    const user = getUser();

    if (!user || !["admin", "receptionist"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("providerCategoryModalOverlay");
    const modalTitle = document.getElementById("providerCategoryModalTitle");
    const saveBtn = document.getElementById("saveProviderCategoryBtn");
    const idInput = document.getElementById("provider_category_id");
    const form = document.getElementById("providerCategoryForm");
    const searchInput = document.getElementById("providerCategorySearch");
    const searchClear = document.getElementById("providerCategorySearchClear");

    const openModal = (category) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (category) {
            modalTitle.textContent = "Edit Provider Category";
            saveBtn.textContent = "Save Changes";
            idInput.value = category.id;
            document.getElementById("name").value = category.name ?? "";
            document.getElementById("description").value = category.description ?? "";
        } else {
            modalTitle.textContent = "Add Provider Category";
            saveBtn.textContent = "Add Provider Category";
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

    document.getElementById("openAddProviderCategoryModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeProviderCategoryModal").addEventListener("click", closeModal);
    document.getElementById("cancelProviderCategory").addEventListener("click", closeModal);
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
            ? await updateProviderCategory(editingId, data)
            : await createProviderCategory(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save provider category.", "error");

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
        showToast(editingId ? "Provider category updated successfully." : "Provider category added successfully.", "success");
        await loadProviderCategories(openModal);
    });

    await loadProviderCategories(openModal);
}

async function loadProviderCategories(openModal)
{
    const result = await fetchProviderCategories();

    categories = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("providerCategoriesTableBody");
    const countText = document.getElementById("providerCategoryCountText");

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
                <div class="vc-name-cell">
                    <div class="vc-avatar">${escapeHtml((category.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="vc-name">${escapeHtml(category.name)}</span>
                </div>
            </td>
            <td class="vc-description ${category.description ? "" : "empty"}">${escapeHtml(category.description || "No description provided")}</td>
            <td>
                <div class="vc-actions">
                    <button class="vc-icon-btn edit" data-edit-id="${category.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="vc-icon-btn delete" data-id="${category.id}">
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
            if (!confirm("Remove this provider category?")) {
                return;
            }

            const result = await deleteProviderCategory(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete provider category.", "error");
                return;
            }

            showToast("Provider category deleted successfully.", "success");
            await loadProviderCategories(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No provider categories yet" : "No matching categories";
    const message = noneAtAll
        ? "Create your first category to start classifying providers."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="vc-empty-state">
                <div class="vc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1"></rect></svg>
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
