import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchProcedureOrderConfigs,
    createProcedureOrderConfig,
    updateProcedureOrderConfig,
    deleteProcedureOrderConfig
} from "../procedure-order-configs/procedure-order-configs.service.js";

// Container Group Name Management is a focused view over the same
// procedure_order_configs tree the "Configure Orders and Results" screen
// manages -- scoped to just the top-level "Group" tier nodes, since
// those are what the Load Lab Compendium's Container Group Name
// dropdown offers. Nested sub-groups still exist and are managed from
// the full tree screen; this page only lists/creates top-level ones.
let containerGroups = [];
let searchTerm = "";

export async function initContainerGroups()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("containerGroupModalOverlay");
    const modalTitle = document.getElementById("containerGroupModalTitle");
    const saveBtn = document.getElementById("saveContainerGroupBtn");
    const idInput = document.getElementById("container_group_id");
    const form = document.getElementById("containerGroupForm");
    const searchInput = document.getElementById("containerGroupSearchInput");
    const searchClear = document.getElementById("containerGroupSearchClear");

    const openModal = (group) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (group) {
            modalTitle.textContent = "Edit Container Group";
            saveBtn.textContent = "Save Changes";
            idInput.value = group.id;
            document.getElementById("container_group_name").value = group.name ?? "";
            document.getElementById("container_group_description").value = group.description ?? "";
            document.getElementById("container_group_sequence").value = group.sequence ?? 0;
        } else {
            modalTitle.textContent = "Add Container Group";
            saveBtn.textContent = "Add Container Group";
            idInput.value = "";
            form.reset();
            document.getElementById("container_group_sequence").value = 0;
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

    document.getElementById("openAddContainerGroupModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeContainerGroupModal").addEventListener("click", closeModal);
    document.getElementById("cancelContainerGroup").addEventListener("click", closeModal);
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

        const name = document.getElementById("container_group_name").value.trim();
        const description = document.getElementById("container_group_description").value.trim();
        const sequence = document.getElementById("container_group_sequence").value.trim();

        const data = { procedure_tier: "group", name };

        if (description !== "") data.description = description;
        if (sequence !== "") data.sequence = sequence;

        const editingId = idInput.value;
        const result = editingId
            ? await updateProcedureOrderConfig(editingId, data)
            : await createProcedureOrderConfig(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save container group.", "error");

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
        showToast(editingId ? "Container group updated successfully." : "Container group added successfully.", "success");
        await loadContainerGroups(openModal);
    });

    await loadContainerGroups(openModal);
}

async function loadContainerGroups(openModal)
{
    const result = await fetchProcedureOrderConfigs();

    containerGroups = result.success
        ? (result.data.items || []).filter((item) => item.procedure_tier === "group" && !item.parent_id)
        : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("containerGroupsTableBody");
    const countText = document.getElementById("containerGroupCountText");

    if (!tbody || !countText) {
        return;
    }

    countText.textContent = `${containerGroups.length} ${containerGroups.length === 1 ? "group" : "groups"}`;

    const filtered = searchTerm
        ? containerGroups.filter((group) => group.name.toLowerCase().includes(searchTerm))
        : containerGroups;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(containerGroups.length === 0);
        return;
    }

    tbody.innerHTML = filtered
        .slice()
        .sort((a, b) => (a.sequence - b.sequence) || a.name.localeCompare(b.name))
        .map((group) => `
        <tr>
            <td class="cg-name">${escapeHtml(group.name)}</td>
            <td class="cg-muted ${group.description ? "" : "empty"}">${escapeHtml(group.description || "No description")}</td>
            <td class="cg-muted">${group.sequence ?? 0}</td>
            <td>
                <div class="cg-actions">
                    <button class="btn-edit" data-edit-id="${group.id}">Edit</button>
                    <button class="btn-danger" data-id="${group.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const group = containerGroups.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (group) {
                openModal(group);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this container group? Anything nested under it will be removed too.")) {
                return;
            }

            const result = await deleteProcedureOrderConfig(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete container group.", "error");
                return;
            }

            showToast("Container group deleted successfully.", "success");
            await loadContainerGroups(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No container groups yet" : "No matching container groups";
    const message = noneAtAll
        ? "Add a group so it shows up in the Load Lab Compendium Container Group Name list."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="cg-empty-state">
                <div class="cg-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
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
    ["name", "description", "sequence"].forEach((field) => {
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
