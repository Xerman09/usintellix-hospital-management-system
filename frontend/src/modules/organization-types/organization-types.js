import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchOrganizationTypes,
    createOrganizationType,
    updateOrganizationType,
    deleteOrganizationType
} from "./organization-types.service.js";

const FIELDS = ["name", "description"];

let orgTypes = [];
let searchTerm = "";

export async function initOrganizationTypes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("organizationTypeModalOverlay");
    const modalTitle = document.getElementById("organizationTypeModalTitle");
    const saveBtn = document.getElementById("saveOrganizationTypeBtn");
    const idInput = document.getElementById("organization_type_id");
    const form = document.getElementById("organizationTypeForm");
    const searchInput = document.getElementById("organizationTypeSearch");
    const searchClear = document.getElementById("organizationTypeSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Organization Type";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Organization Type";
            saveBtn.textContent = "Add Organization Type";
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

    document.getElementById("openAddOrganizationTypeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeOrganizationTypeModal").addEventListener("click", closeModal);
    document.getElementById("cancelOrganizationType").addEventListener("click", closeModal);
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
            ? await updateOrganizationType(editingId, data)
            : await createOrganizationType(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save organization type.", "error");

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
        showToast(editingId ? "Organization type updated successfully." : "Organization type added successfully.", "success");
        await loadOrganizationTypes(openModal);
    });

    await loadOrganizationTypes(openModal);
}

async function loadOrganizationTypes(openModal)
{
    const result = await fetchOrganizationTypes();

    orgTypes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("organizationTypesTableBody");
    const countText = document.getElementById("organizationTypeCountText");

    countText.textContent = `${orgTypes.length} ${orgTypes.length === 1 ? "organization type" : "organization types"}`;

    const filtered = searchTerm
        ? orgTypes.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : orgTypes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(orgTypes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="org-name-cell">
                    <div class="org-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="org-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="org-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="org-actions">
                    <button class="org-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="org-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = orgTypes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this organization type?")) {
                return;
            }

            const result = await deleteOrganizationType(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete organization type.", "error");
                return;
            }

            showToast("Organization type deleted successfully.", "success");
            await loadOrganizationTypes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No organization types yet" : "No matching organization types";
    const message = noneAtAll
        ? "Create your first organization type to start classifying affiliated organizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="org-empty-state">
                <div class="org-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
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
