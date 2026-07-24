import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPayerTypes,
    createPayerType,
    updatePayerType,
    deletePayerType
} from "./payer-types.service.js";

const FIELDS = ["name", "description"];

let payerTypes = [];
let searchTerm = "";

export async function initPayerTypes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("payerTypeModalOverlay");
    const modalTitle = document.getElementById("payerTypeModalTitle");
    const saveBtn = document.getElementById("savePayerTypeBtn");
    const idInput = document.getElementById("payer_type_id");
    const form = document.getElementById("payerTypeForm");
    const searchInput = document.getElementById("payerTypeSearch");
    const searchClear = document.getElementById("payerTypeSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Payer Type";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Payer Type";
            saveBtn.textContent = "Add Payer Type";
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

    document.getElementById("openAddPayerTypeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePayerTypeModal").addEventListener("click", closeModal);
    document.getElementById("cancelPayerType").addEventListener("click", closeModal);
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
            ? await updatePayerType(editingId, data)
            : await createPayerType(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save payer type.", "error");

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
        showToast(editingId ? "Payer type updated successfully." : "Payer type added successfully.", "success");
        await loadPayerTypes(openModal);
    });

    await loadPayerTypes(openModal);
}

async function loadPayerTypes(openModal)
{
    const result = await fetchPayerTypes();

    payerTypes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("payerTypesTableBody");
    const countText = document.getElementById("payerTypeCountText");

    countText.textContent = `${payerTypes.length} ${payerTypes.length === 1 ? "payer type" : "payer types"}`;

    const filtered = searchTerm
        ? payerTypes.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : payerTypes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(payerTypes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="pt-name-cell">
                    <div class="pt-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pt-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="pt-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="pt-actions">
                    <button class="pt-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pt-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = payerTypes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this payer type?")) {
                return;
            }

            const result = await deletePayerType(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete payer type.", "error");
                return;
            }

            showToast("Payer type deleted successfully.", "success");
            await loadPayerTypes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No payer types yet" : "No matching payer types";
    const message = noneAtAll
        ? "Create your first payer type to start recording patient billing information."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="pt-empty-state">
                <div class="pt-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
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
