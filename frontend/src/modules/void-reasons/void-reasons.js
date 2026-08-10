import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchVoidReasons,
    createVoidReason,
    updateVoidReason,
    deleteVoidReason
} from "./void-reasons.service.js";

const FIELDS = ["name", "description"];

let reasons = [];
let searchTerm = "";

export async function initVoidReasons()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("voidReasonModalOverlay");
    const modalTitle = document.getElementById("voidReasonModalTitle");
    const saveBtn = document.getElementById("saveVoidReasonBtn");
    const idInput = document.getElementById("void_reason_id");
    const form = document.getElementById("voidReasonForm");
    const searchInput = document.getElementById("voidReasonSearch");
    const searchClear = document.getElementById("voidReasonSearchClear");

    const openModal = (reason) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (reason) {
            modalTitle.textContent = "Edit Reason";
            saveBtn.textContent = "Save Changes";
            idInput.value = reason.id;
            document.getElementById("name").value = reason.name ?? "";
            document.getElementById("description").value = reason.description ?? "";
        } else {
            modalTitle.textContent = "Add Reason";
            saveBtn.textContent = "Add Reason";
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

    document.getElementById("openAddVoidReasonModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeVoidReasonModal").addEventListener("click", closeModal);
    document.getElementById("cancelVoidReason").addEventListener("click", closeModal);
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
            ? await updateVoidReason(editingId, data)
            : await createVoidReason(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save void reason.", "error");

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
        showToast(editingId ? "Reason updated successfully." : "Reason added successfully.", "success");
        await loadVoidReasons(openModal);
    });

    await loadVoidReasons(openModal);
}

async function loadVoidReasons(openModal)
{
    const result = await fetchVoidReasons();

    reasons = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("voidReasonsTableBody");
    const countText = document.getElementById("voidReasonCountText");

    countText.textContent = `${reasons.length} ${reasons.length === 1 ? "reason" : "reasons"}`;

    const filtered = searchTerm
        ? reasons.filter((reason) =>
            reason.name.toLowerCase().includes(searchTerm) ||
            (reason.description ?? "").toLowerCase().includes(searchTerm))
        : reasons;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(reasons.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((reason) => `
        <tr>
            <td>
                <div class="vr-name-cell">
                    <div class="vr-avatar">${escapeHtml((reason.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="vr-name">${escapeHtml(reason.name)}</span>
                </div>
            </td>
            <td class="vr-description ${reason.description ? "" : "empty"}">${escapeHtml(reason.description || "No description provided")}</td>
            <td>
                <div class="vr-actions">
                    <button class="vr-icon-btn edit" data-edit-id="${reason.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="vr-icon-btn delete" data-id="${reason.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const reason = reasons.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (reason) {
                openModal(reason);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this void reason?")) {
                return;
            }

            const result = await deleteVoidReason(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete void reason.", "error");
                return;
            }

            showToast("Void reason deleted successfully.", "success");
            await loadVoidReasons(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No reasons yet" : "No matching reasons";
    const message = noneAtAll
        ? "Create your first void reason to start recording voided entries."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="vr-empty-state">
                <div class="vr-empty-icon">
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
