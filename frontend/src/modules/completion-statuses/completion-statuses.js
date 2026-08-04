import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCompletionStatuses,
    createCompletionStatus,
    updateCompletionStatus,
    deleteCompletionStatus
} from "./completion-statuses.service.js";

const FIELDS = ["name", "description"];

let statuses = [];
let searchTerm = "";

export async function initCompletionStatuses()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("completionStatusModalOverlay");
    const modalTitle = document.getElementById("completionStatusModalTitle");
    const saveBtn = document.getElementById("saveCompletionStatusBtn");
    const idInput = document.getElementById("completion_status_id");
    const form = document.getElementById("completionStatusForm");
    const searchInput = document.getElementById("completionStatusSearch");
    const searchClear = document.getElementById("completionStatusSearchClear");

    const openModal = (status) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (status) {
            modalTitle.textContent = "Edit Status";
            saveBtn.textContent = "Save Changes";
            idInput.value = status.id;
            document.getElementById("name").value = status.name ?? "";
            document.getElementById("description").value = status.description ?? "";
        } else {
            modalTitle.textContent = "Add Status";
            saveBtn.textContent = "Add Status";
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

    document.getElementById("openAddCompletionStatusModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCompletionStatusModal").addEventListener("click", closeModal);
    document.getElementById("cancelCompletionStatus").addEventListener("click", closeModal);
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
            ? await updateCompletionStatus(editingId, data)
            : await createCompletionStatus(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save completion status.", "error");

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
        showToast(editingId ? "Status updated successfully." : "Status added successfully.", "success");
        await loadCompletionStatuses(openModal);
    });

    await loadCompletionStatuses(openModal);
}

async function loadCompletionStatuses(openModal)
{
    const result = await fetchCompletionStatuses();

    statuses = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("completionStatusesTableBody");
    const countText = document.getElementById("completionStatusCountText");

    countText.textContent = `${statuses.length} ${statuses.length === 1 ? "status" : "statuses"}`;

    const filtered = searchTerm
        ? statuses.filter((status) =>
            status.name.toLowerCase().includes(searchTerm) ||
            (status.description ?? "").toLowerCase().includes(searchTerm))
        : statuses;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(statuses.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((status) => `
        <tr>
            <td>
                <div class="cs-name-cell">
                    <div class="cs-avatar">${escapeHtml((status.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="cs-name">${escapeHtml(status.name)}</span>
                </div>
            </td>
            <td class="cs-description ${status.description ? "" : "empty"}">${escapeHtml(status.description || "No description provided")}</td>
            <td>
                <div class="cs-actions">
                    <button class="cs-icon-btn edit" data-edit-id="${status.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="cs-icon-btn delete" data-id="${status.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const status = statuses.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (status) {
                openModal(status);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this completion status?")) {
                return;
            }

            const result = await deleteCompletionStatus(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete completion status.", "error");
                return;
            }

            showToast("Completion status deleted successfully.", "success");
            await loadCompletionStatuses(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No statuses yet" : "No matching statuses";
    const message = noneAtAll
        ? "Create your first completion status to start recording medications and immunizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="cs-empty-state">
                <div class="cs-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"></path></svg>
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
