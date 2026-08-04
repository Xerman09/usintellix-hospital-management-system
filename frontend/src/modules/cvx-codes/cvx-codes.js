import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCvxCodes,
    createCvxCode,
    updateCvxCode,
    deleteCvxCode
} from "./cvx-codes.service.js";

const FIELDS = ["code", "short_description", "status"];
const PER_PAGE = 50;

let currentItems = [];
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let searchTerm = "";
let searchDebounceTimer = null;

export async function initCvxCodes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    currentPage = 1;
    searchTerm = "";

    const modalOverlay = document.getElementById("cvxModalOverlay");
    const modalTitle = document.getElementById("cvxModalTitle");
    const saveBtn = document.getElementById("saveCvxBtn");
    const idInput = document.getElementById("record_id");
    const form = document.getElementById("cvxForm");
    const searchInput = document.getElementById("cvxSearch");
    const searchClear = document.getElementById("cvxSearchClear");
    const prevBtn = document.getElementById("cvxPrevPage");
    const nextBtn = document.getElementById("cvxNextPage");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit CVX Code";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("code").value = item.code ?? "";
            document.getElementById("short_description").value = item.short_description ?? "";
            document.getElementById("status").value = item.status ?? "Active";
        } else {
            modalTitle.textContent = "Add CVX Code";
            saveBtn.textContent = "Add CVX Code";
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

    document.getElementById("openAddCvxModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCvxModal").addEventListener("click", closeModal);
    document.getElementById("cancelCvx").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        searchClear.classList.toggle("show", searchInput.value.length > 0);

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchTerm = searchInput.value.trim();
            currentPage = 1;
            loadPage(openModal);
        }, 300);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        clearTimeout(searchDebounceTimer);
        searchTerm = "";
        currentPage = 1;
        loadPage(openModal);
        searchInput.focus();
    });

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage -= 1;
            loadPage(openModal);
        }
    });

    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            loadPage(openModal);
        }
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
            ? await updateCvxCode(editingId, data)
            : await createCvxCode(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save CVX code.", "error");

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
        showToast(editingId ? "CVX code updated successfully." : "CVX code added successfully.", "success");
        await loadPage(openModal);
    });

    await loadPage(openModal);
}

async function loadPage(openModal)
{
    const result = await fetchCvxCodes(currentPage, PER_PAGE, searchTerm);

    if (result.success) {
        currentItems = result.data.items;
        totalItems = result.data.total;
        totalPages = Math.max(1, result.data.total_pages);
        currentPage = result.data.page;
    } else {
        currentItems = [];
        totalItems = 0;
        totalPages = 1;
    }

    renderRows(openModal);
    renderPagination();
}

function renderRows(openModal)
{
    const tbody = document.getElementById("cvxTableBody");
    const countText = document.getElementById("cvxCountText");

    countText.textContent = `${totalItems} ${totalItems === 1 ? "code" : "codes"}`;

    if (!currentItems.length) {
        tbody.innerHTML = renderEmptyState(totalItems === 0);
        return;
    }

    tbody.innerHTML = currentItems.map((item) => `
        <tr>
            <td><span class="icd-code-badge">${escapeHtml(item.code)}</span></td>
            <td class="icd-description">${escapeHtml(item.short_description)}</td>
            <td><span class="status-badge ${item.status === "Inactive" ? "cancelled" : "completed"}">${escapeHtml(item.status || "Active")}</span></td>
            <td>
                <div class="icd-actions">
                    <button class="icd-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="icd-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = currentItems.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this CVX code?")) {
                return;
            }

            const result = await deleteCvxCode(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete CVX code.", "error");
                return;
            }

            showToast("CVX code deleted successfully.", "success");
            await loadPage(openModal);
        });
    });
}

function renderPagination()
{
    const info = document.getElementById("cvxPaginationInfo");
    const indicator = document.getElementById("cvxPageIndicator");
    const prevBtn = document.getElementById("cvxPrevPage");
    const nextBtn = document.getElementById("cvxNextPage");

    if (!totalItems) {
        info.textContent = "";
    } else {
        const start = (currentPage - 1) * PER_PAGE + 1;
        const end = Math.min(currentPage * PER_PAGE, totalItems);

        info.textContent = `Showing ${start}-${end} of ${totalItems}`;
    }

    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No CVX codes yet" : "No matching CVX codes";
    const message = noneAtAll
        ? "Add your first CVX code to start using it on immunization records."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="icd-empty-state">
                <div class="icd-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path></svg>
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
