import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchRoles,
    createRole,
    updateRole,
    deleteRole
} from "./role-management.service.js";

const FIELDS = ["name", "description"];

let roles = [];
let searchTerm = "";

export async function initRoleManagement()
{
    const user = getUser();

    if (!user || !["admin"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("roleModalOverlay");
    const modalTitle = document.getElementById("roleModalTitle");
    const saveBtn = document.getElementById("saveRoleBtn");
    const idInput = document.getElementById("role_id");
    const form = document.getElementById("roleForm");
    const searchInput = document.getElementById("roleSearch");
    const searchClear = document.getElementById("roleSearchClear");

    const openModal = (role) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (role) {
            modalTitle.textContent = "Edit Role";
            saveBtn.textContent = "Save Changes";
            idInput.value = role.id;
            document.getElementById("name").value = role.name ?? "";
            document.getElementById("description").value = role.description ?? "";
        } else {
            modalTitle.textContent = "Add Role";
            saveBtn.textContent = "Add Role";
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

    document.getElementById("openAddRoleModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeRoleModal").addEventListener("click", closeModal);
    document.getElementById("cancelRole").addEventListener("click", closeModal);
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
            ? await updateRole(editingId, data)
            : await createRole(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save role.", "error");

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
        showToast(editingId ? "Role updated successfully." : "Role added successfully.", "success");
        await loadRoles(openModal);
    });

    await loadRoles(openModal);
}

async function loadRoles(openModal)
{
    const result = await fetchRoles();

    roles = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("rolesTableBody");
    const countText = document.getElementById("roleCountText");

    countText.textContent = `${roles.length} ${roles.length === 1 ? "role" : "roles"}`;

    const filtered = searchTerm
        ? roles.filter((role) =>
            role.name.toLowerCase().includes(searchTerm) ||
            (role.description ?? "").toLowerCase().includes(searchTerm))
        : roles;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(roles.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((role) => `
        <tr>
            <td>
                <div class="vc-name-cell">
                    <div class="vc-avatar">${escapeHtml((role.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="vc-name">${escapeHtml(role.name)}</span>
                </div>
            </td>
            <td class="vc-description ${role.description ? "" : "empty"}">${escapeHtml(role.description || "No description provided")}</td>
            <td>
                <div class="vc-actions">
                    <button class="vc-icon-btn edit" data-edit-id="${role.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="vc-icon-btn delete" data-id="${role.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const role = roles.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (role) {
                openModal(role);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this role?")) {
                return;
            }

            const result = await deleteRole(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete role.", "error");
                return;
            }

            showToast("Role deleted successfully.", "success");
            await loadRoles(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No roles yet" : "No matching roles";
    const message = noneAtAll
        ? "Create your first role to start assigning access levels."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="vc-empty-state">
                <div class="vc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
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
