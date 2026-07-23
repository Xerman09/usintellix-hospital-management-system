import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchVisitTypes,
    createVisitType,
    updateVisitType,
    deleteVisitType
} from "./visit-types.service.js";

const FIELDS = ["type", "description"];

let visitTypes = [];
let searchTerm = "";

export async function initVisitTypes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("visitTypeModalOverlay");
    const modalTitle = document.getElementById("visitTypeModalTitle");
    const saveBtn = document.getElementById("saveVisitTypeBtn");
    const idInput = document.getElementById("visit_type_id");
    const form = document.getElementById("visitTypeForm");
    const searchInput = document.getElementById("visitTypeSearch");
    const searchClear = document.getElementById("visitTypeSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Visit Type";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("type").value = item.type ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Visit Type";
            saveBtn.textContent = "Add Visit Type";
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

    document.getElementById("openAddVisitTypeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeVisitTypeModal").addEventListener("click", closeModal);
    document.getElementById("cancelVisitType").addEventListener("click", closeModal);
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
            ? await updateVisitType(editingId, data)
            : await createVisitType(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save visit type.", "error");

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
        showToast(editingId ? "Visit type updated successfully." : "Visit type added successfully.", "success");
        await loadVisitTypes(openModal);
    });

    await loadVisitTypes(openModal);
}

async function loadVisitTypes(openModal)
{
    const result = await fetchVisitTypes();

    visitTypes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("visitTypesTableBody");
    const countText = document.getElementById("visitTypeCountText");

    countText.textContent = `${visitTypes.length} ${visitTypes.length === 1 ? "visit type" : "visit types"}`;

    const filtered = searchTerm
        ? visitTypes.filter((item) =>
            item.type.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : visitTypes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(visitTypes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="vt-name-cell">
                    <div class="vt-avatar">${escapeHtml((item.type || "?").charAt(0).toUpperCase())}</div>
                    <span class="vt-name">${escapeHtml(item.type)}</span>
                </div>
            </td>
            <td class="vt-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="vt-actions">
                    <button class="vt-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="vt-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = visitTypes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this visit type?")) {
                return;
            }

            const result = await deleteVisitType(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete visit type.", "error");
                return;
            }

            showToast("Visit type deleted successfully.", "success");
            await loadVisitTypes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No visit types yet" : "No matching visit types";
    const message = noneAtAll
        ? "Create your first visit type to start classifying patient visits."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="vt-empty-state">
                <div class="vt-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"></path></svg>
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
