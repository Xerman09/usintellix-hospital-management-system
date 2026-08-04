import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchRefusalReasons,
    createRefusalReason,
    updateRefusalReason,
    deleteRefusalReason
} from "./refusal-reasons.service.js";

const FIELDS = ["name", "description"];

let reasons = [];
let searchTerm = "";

export async function initRefusalReasons()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("refusalReasonModalOverlay");
    const modalTitle = document.getElementById("refusalReasonModalTitle");
    const saveBtn = document.getElementById("saveRefusalReasonBtn");
    const idInput = document.getElementById("refusal_reason_id");
    const form = document.getElementById("refusalReasonForm");
    const searchInput = document.getElementById("refusalReasonSearch");
    const searchClear = document.getElementById("refusalReasonSearchClear");

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

    document.getElementById("openAddRefusalReasonModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeRefusalReasonModal").addEventListener("click", closeModal);
    document.getElementById("cancelRefusalReason").addEventListener("click", closeModal);
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
            ? await updateRefusalReason(editingId, data)
            : await createRefusalReason(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save refusal reason.", "error");

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
        await loadRefusalReasons(openModal);
    });

    await loadRefusalReasons(openModal);
}

async function loadRefusalReasons(openModal)
{
    const result = await fetchRefusalReasons();

    reasons = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("refusalReasonsTableBody");
    const countText = document.getElementById("refusalReasonCountText");

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
                <div class="rr-name-cell">
                    <div class="rr-avatar">${escapeHtml((reason.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="rr-name">${escapeHtml(reason.name)}</span>
                </div>
            </td>
            <td class="rr-description ${reason.description ? "" : "empty"}">${escapeHtml(reason.description || "No description provided")}</td>
            <td>
                <div class="rr-actions">
                    <button class="rr-icon-btn edit" data-edit-id="${reason.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="rr-icon-btn delete" data-id="${reason.id}">
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
            if (!confirm("Remove this refusal reason?")) {
                return;
            }

            const result = await deleteRefusalReason(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete refusal reason.", "error");
                return;
            }

            showToast("Refusal reason deleted successfully.", "success");
            await loadRefusalReasons(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No reasons yet" : "No matching reasons";
    const message = noneAtAll
        ? "Create your first refusal reason to start recording declined medications and immunizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="rr-empty-state">
                <div class="rr-empty-icon">
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
