import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchIcd10Diagnoses,
    createIcd10Diagnosis,
    updateIcd10Diagnosis,
    deleteIcd10Diagnosis
} from "./icd10-diagnoses.service.js";

const FIELDS = ["code", "description"];
const PER_PAGE = 50;

let currentItems = [];
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let searchTerm = "";
let searchDebounceTimer = null;

export async function initIcd10Diagnoses()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    currentPage = 1;
    searchTerm = "";

    const modalOverlay = document.getElementById("icd10ModalOverlay");
    const modalTitle = document.getElementById("icd10ModalTitle");
    const saveBtn = document.getElementById("saveIcd10Btn");
    const idInput = document.getElementById("record_id");
    const form = document.getElementById("icd10Form");
    const searchInput = document.getElementById("icd10Search");
    const searchClear = document.getElementById("icd10SearchClear");
    const prevBtn = document.getElementById("icd10PrevPage");
    const nextBtn = document.getElementById("icd10NextPage");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Diagnosis Code";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("code").value = item.code ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Diagnosis Code";
            saveBtn.textContent = "Add Diagnosis Code";
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

    document.getElementById("openAddIcd10Modal").addEventListener("click", () => openModal(null));
    document.getElementById("closeIcd10Modal").addEventListener("click", closeModal);
    document.getElementById("cancelIcd10").addEventListener("click", closeModal);
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
            ? await updateIcd10Diagnosis(editingId, data)
            : await createIcd10Diagnosis(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save diagnosis code.", "error");

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
        showToast(editingId ? "Diagnosis code updated successfully." : "Diagnosis code added successfully.", "success");
        await loadPage(openModal);
    });

    await loadPage(openModal);
}

async function loadPage(openModal)
{
    const result = await fetchIcd10Diagnoses(currentPage, PER_PAGE, searchTerm);

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
    const tbody = document.getElementById("icd10TableBody");
    const countText = document.getElementById("icd10CountText");

    countText.textContent = `${totalItems} ${totalItems === 1 ? "code" : "codes"}`;

    if (!currentItems.length) {
        tbody.innerHTML = renderEmptyState(totalItems === 0);
        return;
    }

    tbody.innerHTML = currentItems.map((item) => `
        <tr>
            <td><span class="icd-code-badge">${escapeHtml(item.code)}</span></td>
            <td class="icd-description">${escapeHtml(item.description)}</td>
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
            if (!confirm("Remove this diagnosis code?")) {
                return;
            }

            const result = await deleteIcd10Diagnosis(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete diagnosis code.", "error");
                return;
            }

            showToast("Diagnosis code deleted successfully.", "success");
            await loadPage(openModal);
        });
    });
}

function renderPagination()
{
    const info = document.getElementById("icd10PaginationInfo");
    const indicator = document.getElementById("icd10PageIndicator");
    const prevBtn = document.getElementById("icd10PrevPage");
    const nextBtn = document.getElementById("icd10NextPage");

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
    const heading = noneAtAll ? "No diagnosis codes yet" : "No matching diagnosis codes";
    const message = noneAtAll
        ? "Add your first ICD10 diagnosis code to start using it across the system."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="icd-empty-state">
                <div class="icd-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>
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
