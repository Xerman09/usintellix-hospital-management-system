import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchSurgeries,
    createSurgery,
    updateSurgery,
    deleteSurgery
} from "./surgeries.service.js";

const FIELDS = ["surg_name", "surg_description"];

let surgeries = [];
let searchTerm = "";

export async function initSurgeries()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("surgeryModalOverlay");
    const modalTitle = document.getElementById("surgeryModalTitle");
    const saveBtn = document.getElementById("saveSurgeryBtn");
    const idInput = document.getElementById("surgery_id");
    const form = document.getElementById("surgeryForm");
    const searchInput = document.getElementById("surgerySearch");
    const searchClear = document.getElementById("surgerySearchClear");

    const openModal = (surgery) => {
        clearErrors();
        document.getElementById("surgFormAlert").innerHTML = "";

        if (surgery) {
            modalTitle.textContent = "Edit Surgery";
            saveBtn.textContent = "Save Changes";
            idInput.value = surgery.id;
            document.getElementById("surg_name").value = surgery.name ?? "";
            document.getElementById("surg_description").value = surgery.description ?? "";
        } else {
            modalTitle.textContent = "Add Surgery";
            saveBtn.textContent = "Add Surgery";
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
        document.getElementById("surgFormAlert").innerHTML = "";
    };

    document.getElementById("openAddSurgeryModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeSurgeryModal").addEventListener("click", closeModal);
    document.getElementById("cancelSurgery").addEventListener("click", closeModal);
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
                const apiField = field.replace("surg_", "");
                data[apiField] = value;
            }
        });

        const editingId = idInput.value;
        const result = editingId
            ? await updateSurgery(editingId, data)
            : await createSurgery(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save surgery.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-surg_${field}`);
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showToast(editingId ? "Surgery updated successfully." : "Surgery added successfully.", "success");
        await loadSurgeries(openModal);
    });

    await loadSurgeries(openModal);
}

async function loadSurgeries(openModal)
{
    const result = await fetchSurgeries();
    surgeries = result.success ? result.data : [];
    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("surgeriesTableBody");
    const countText = document.getElementById("surgeryCountText");

    countText.textContent = `${surgeries.length} ${surgeries.length === 1 ? "surgery" : "surgeries"}`;

    const filtered = searchTerm
        ? surgeries.filter((surgery) =>
            surgery.name.toLowerCase().includes(searchTerm) ||
            (surgery.description ?? "").toLowerCase().includes(searchTerm))
        : surgeries;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(surgeries.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((surgery) => `
        <tr>
            <td>
                <div class="surg-name-cell">
                    <div class="surg-avatar">${escapeHtml((surgery.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="surg-name">${escapeHtml(surgery.name)}</span>
                </div>
            </td>
            <td class="surg-description ${surgery.description ? "" : "empty"}">${escapeHtml(surgery.description || "No description provided")}</td>
            <td>
                <div class="surg-actions">
                    <button class="surg-icon-btn edit" data-edit-id="${surgery.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="surg-icon-btn delete" data-id="${surgery.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const surgery = surgeries.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));
            if (surgery) {
                openModal(surgery);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const surgeryId = btn.getAttribute("data-id");
            showConfirmDeleteModal(async () => {
                const result = await deleteSurgery(surgeryId);
                if (!result.success) {
                    showToast(result.message || "Failed to delete surgery.", "error");
                    return;
                }
                showToast("Surgery deleted successfully.", "success");
                await loadSurgeries(openModal);
            });
        });
    });
}

function showConfirmDeleteModal(onConfirm)
{
    const modal = document.getElementById("surgConfirmDeleteModal");
    const cancelBtn = document.getElementById("surgCancelDeleteBtn");
    const confirmBtn = document.getElementById("surgConfirmDeleteBtn");

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
    const heading = noneAtAll ? "No surgeries yet" : "No matching surgeries";
    const message = noneAtAll
        ? "Create your first surgery to start recording patient surgical history."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="surg-empty-state">
                <div class="surg-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line></svg>
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
    const container = document.getElementById("surgFormAlert");
    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
