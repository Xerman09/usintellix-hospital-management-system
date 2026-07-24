import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCqmSourceOfPayments,
    createCqmSourceOfPayment,
    updateCqmSourceOfPayment,
    deleteCqmSourceOfPayment
} from "./cqm-source-of-payments.service.js";

const FIELDS = ["name", "description"];

let records = [];
let searchTerm = "";

export async function initCqmSourceOfPayments()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("cqmSourceOfPaymentModalOverlay");
    const modalTitle = document.getElementById("cqmSourceOfPaymentModalTitle");
    const saveBtn = document.getElementById("saveCqmSourceOfPaymentBtn");
    const idInput = document.getElementById("cqm_source_of_payment_id");
    const form = document.getElementById("cqmSourceOfPaymentForm");
    const searchInput = document.getElementById("cqmSourceOfPaymentSearch");
    const searchClear = document.getElementById("cqmSourceOfPaymentSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Source of Payment";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Source of Payment";
            saveBtn.textContent = "Add Source of Payment";
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

    document.getElementById("openAddCqmSourceOfPaymentModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCqmSourceOfPaymentModal").addEventListener("click", closeModal);
    document.getElementById("cancelCqmSourceOfPayment").addEventListener("click", closeModal);
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
            ? await updateCqmSourceOfPayment(editingId, data)
            : await createCqmSourceOfPayment(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save source of payment.", "error");

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
        showToast(editingId ? "Source of payment updated successfully." : "Source of payment added successfully.", "success");
        await loadCqmSourceOfPayments(openModal);
    });

    await loadCqmSourceOfPayments(openModal);
}

async function loadCqmSourceOfPayments(openModal)
{
    const result = await fetchCqmSourceOfPayments();

    records = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("cqmSourceOfPaymentsTableBody");
    const countText = document.getElementById("cqmSourceOfPaymentCountText");

    countText.textContent = `${records.length} ${records.length === 1 ? "source of payment" : "sources of payment"}`;

    const filtered = searchTerm
        ? records.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : records;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(records.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="sop-name-cell">
                    <div class="sop-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="sop-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="sop-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="sop-actions">
                    <button class="sop-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="sop-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = records.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this source of payment?")) {
                return;
            }

            const result = await deleteCqmSourceOfPayment(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete source of payment.", "error");
                return;
            }

            showToast("Source of payment deleted successfully.", "success");
            await loadCqmSourceOfPayments(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No sources of payment yet" : "No matching sources of payment";
    const message = noneAtAll
        ? "Create your first source of payment category to start CQM reporting."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="sop-empty-state">
                <div class="sop-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
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
