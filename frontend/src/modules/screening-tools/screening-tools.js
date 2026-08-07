import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchScreeningTools,
    createScreeningTool,
    updateScreeningTool,
    deleteScreeningTool
} from "./screening-tools.service.js";

const FIELDS = ["st_name", "st_description"];

let tools = [];
let searchTerm = "";

export async function initScreeningTools()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("screeningToolModalOverlay");
    const modalTitle = document.getElementById("screeningToolModalTitle");
    const saveBtn = document.getElementById("saveScreeningToolBtn");
    const idInput = document.getElementById("screening_tool_id");
    const form = document.getElementById("screeningToolForm");
    const searchInput = document.getElementById("screeningToolSearch");
    const searchClear = document.getElementById("screeningToolSearchClear");

    const openModal = (tool) => {
        clearErrors();
        document.getElementById("stFormAlert").innerHTML = "";

        if (tool) {
            modalTitle.textContent = "Edit Screening Tool";
            saveBtn.textContent = "Save Changes";
            idInput.value = tool.id;
            document.getElementById("st_name").value = tool.name ?? "";
            document.getElementById("st_description").value = tool.description ?? "";
        } else {
            modalTitle.textContent = "Add Screening Tool";
            saveBtn.textContent = "Add Screening Tool";
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
        document.getElementById("stFormAlert").innerHTML = "";
    };

    document.getElementById("openAddScreeningToolModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeScreeningToolModal").addEventListener("click", closeModal);
    document.getElementById("cancelScreeningTool").addEventListener("click", closeModal);
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
                const apiField = field.replace("st_", "");
                data[apiField] = value;
            }
        });

        const editingId = idInput.value;
        const result = editingId
            ? await updateScreeningTool(editingId, data)
            : await createScreeningTool(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save screening tool.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-st_${field}`);
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showToast(editingId ? "Screening tool updated successfully." : "Screening tool added successfully.", "success");
        await loadScreeningTools(openModal);
    });

    await loadScreeningTools(openModal);
}

async function loadScreeningTools(openModal)
{
    const result = await fetchScreeningTools();
    tools = result.success ? result.data : [];
    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("screeningToolsTableBody");
    const countText = document.getElementById("screeningToolCountText");

    countText.textContent = `${tools.length} ${tools.length === 1 ? "tool" : "tools"}`;

    const filtered = searchTerm
        ? tools.filter((tool) =>
            tool.name.toLowerCase().includes(searchTerm) ||
            (tool.description ?? "").toLowerCase().includes(searchTerm))
        : tools;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(tools.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((tool) => `
        <tr>
            <td>
                <div class="st-name-cell">
                    <div class="st-avatar">${escapeHtml((tool.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="st-name">${escapeHtml(tool.name)}</span>
                </div>
            </td>
            <td class="st-description ${tool.description ? "" : "empty"}">${escapeHtml(tool.description || "No description provided")}</td>
            <td>
                <div class="st-actions">
                    <button class="st-icon-btn edit" data-edit-id="${tool.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="st-icon-btn delete" data-id="${tool.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const tool = tools.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));
            if (tool) {
                openModal(tool);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const toolId = btn.getAttribute("data-id");
            showConfirmDeleteModal(async () => {
                const result = await deleteScreeningTool(toolId);
                if (!result.success) {
                    showToast(result.message || "Failed to delete screening tool.", "error");
                    return;
                }
                showToast("Screening tool deleted successfully.", "success");
                await loadScreeningTools(openModal);
            });
        });
    });
}

function showConfirmDeleteModal(onConfirm)
{
    const modal = document.getElementById("stConfirmDeleteModal");
    const cancelBtn = document.getElementById("stCancelDeleteBtn");
    const confirmBtn = document.getElementById("stConfirmDeleteBtn");

    const closeHandler = () => {
        modal.classList.remove("open");
        cancelBtn.removeEventListener("click", closeHandler);
        confirmBtn.removeEventListener("click", confirmHandler);
    };

    const confirmHandler = () => {
        onConfirm();
        closeHandler();
    };

    cancelBtn.addEventListener("click", closeHandler);
    confirmBtn.addEventListener("click", confirmHandler);

    modal.classList.add("open");
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No screening tools yet" : "No matching tools";
    const message = noneAtAll
        ? "Create your first tool to start assessing patient conditions."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="st-empty-state">
                <div class="st-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
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
    const container = document.getElementById("stFormAlert");
    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
