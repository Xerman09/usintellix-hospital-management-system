import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCarePlanReasonCodes,
    createCarePlanReasonCode,
    updateCarePlanReasonCode,
    deleteCarePlanReasonCode
} from "./care-plan-reason-codes.service.js";

const FIELDS = ["code", "description"];

let reasonCodes = [];
let searchTerm = "";

export async function initCarePlanReasonCodes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("carePlanReasonCodeModalOverlay");
    const modalTitle = document.getElementById("carePlanReasonCodeModalTitle");
    const saveBtn = document.getElementById("saveCarePlanReasonCodeBtn");
    const idInput = document.getElementById("care_plan_reason_code_id");
    const form = document.getElementById("carePlanReasonCodeForm");
    const searchInput = document.getElementById("carePlanReasonCodeSearch");
    const searchClear = document.getElementById("carePlanReasonCodeSearchClear");

    const openModal = (reasonCode) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (reasonCode) {
            modalTitle.textContent = "Edit Reason Code";
            saveBtn.textContent = "Save Changes";
            idInput.value = reasonCode.id;
            document.getElementById("code").value = reasonCode.code ?? "";
            document.getElementById("description").value = reasonCode.description ?? "";
        } else {
            modalTitle.textContent = "Add Reason Code";
            saveBtn.textContent = "Add Reason Code";
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

    document.getElementById("openAddCarePlanReasonCodeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCarePlanReasonCodeModal").addEventListener("click", closeModal);
    document.getElementById("cancelCarePlanReasonCode").addEventListener("click", closeModal);
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
            ? await updateCarePlanReasonCode(editingId, data)
            : await createCarePlanReasonCode(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save care plan reason code.", "error");

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
        showToast(editingId ? "Reason code updated successfully." : "Reason code added successfully.", "success");
        await loadCarePlanReasonCodes(openModal);
    });

    await loadCarePlanReasonCodes(openModal);
}

async function loadCarePlanReasonCodes(openModal)
{
    const result = await fetchCarePlanReasonCodes();

    reasonCodes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("carePlanReasonCodesTableBody");
    const countText = document.getElementById("carePlanReasonCodeCountText");

    countText.textContent = `${reasonCodes.length} ${reasonCodes.length === 1 ? "reason code" : "reason codes"}`;

    const filtered = searchTerm
        ? reasonCodes.filter((reasonCode) =>
            reasonCode.code.toLowerCase().includes(searchTerm) ||
            (reasonCode.description ?? "").toLowerCase().includes(searchTerm))
        : reasonCodes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(reasonCodes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((reasonCode) => `
        <tr>
            <td>
                <div class="cprc-code-cell">
                    <div class="cprc-avatar">${escapeHtml((reasonCode.code || "?").charAt(0).toUpperCase())}</div>
                    <span class="cprc-code">${escapeHtml(reasonCode.code)}</span>
                </div>
            </td>
            <td class="cprc-description ${reasonCode.description ? "" : "empty"}">${escapeHtml(reasonCode.description || "No description provided")}</td>
            <td>
                <div class="cprc-actions">
                    <button class="cprc-icon-btn edit" data-edit-id="${reasonCode.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="cprc-icon-btn delete" data-id="${reasonCode.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const reasonCode = reasonCodes.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (reasonCode) {
                openModal(reasonCode);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this care plan reason code?")) {
                return;
            }

            const result = await deleteCarePlanReasonCode(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete care plan reason code.", "error");
                return;
            }

            showToast("Care plan reason code deleted successfully.", "success");
            await loadCarePlanReasonCodes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No reason codes yet" : "No matching reason codes";
    const message = noneAtAll
        ? "Create your first care plan reason code to start documenting care plan changes."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="cprc-empty-state">
                <div class="cprc-empty-icon">
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
