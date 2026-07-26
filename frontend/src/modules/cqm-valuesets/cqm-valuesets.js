import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCqmValuesets,
    createCqmValueset,
    updateCqmValueset,
    deleteCqmValueset,
    fetchCqmValuesetCodes,
    createCqmValuesetCode,
    updateCqmValuesetCode,
    deleteCqmValuesetCode
} from "./cqm-valuesets.service.js";

const FIELDS = ["oid", "name", "code_system", "definition_version"];
const CODE_FIELDS = ["code", "code_system", "description"];
const PER_PAGE = 50;

const CODE_SYSTEM_LABELS = {
    ICD10CM: "ICD-10-CM",
    ICD9CM: "ICD-9-CM",
    SNOMEDCT: "SNOMED CT",
    LOINC: "LOINC",
    RXNORM: "RxNorm",
    CPT: "CPT",
    HCPCS: "HCPCS",
    CVX: "CVX"
};

let currentItems = [];
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let searchTerm = "";
let searchDebounceTimer = null;

let activeValueset = null;
let activeCodes = [];

export async function initCqmValuesets()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    currentPage = 1;
    searchTerm = "";

    const modalOverlay = document.getElementById("cqmModalOverlay");
    const modalTitle = document.getElementById("cqmModalTitle");
    const saveBtn = document.getElementById("saveCqmBtn");
    const idInput = document.getElementById("cqm_record_id");
    const form = document.getElementById("cqmForm");
    const searchInput = document.getElementById("cqmSearch");
    const searchClear = document.getElementById("cqmSearchClear");
    const prevBtn = document.getElementById("cqmPrevPage");
    const nextBtn = document.getElementById("cqmNextPage");

    const codesModalOverlay = document.getElementById("cqmCodesModalOverlay");
    const codeFormModalOverlay = document.getElementById("cqmCodeFormModalOverlay");
    const codeFormTitle = document.getElementById("cqmCodeFormModalTitle");
    const saveCodeBtn = document.getElementById("saveCqmCodeBtn");
    const codeIdInput = document.getElementById("cqm_code_record_id");
    const codeForm = document.getElementById("cqmCodeForm");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("cqmFormAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Value Set";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("cqm_oid").value = item.oid ?? "";
            document.getElementById("cqm_name").value = item.name ?? "";
            document.getElementById("cqm_code_system").value = item.code_system ?? "";
            document.getElementById("cqm_definition_version").value = item.definition_version ?? "";
        } else {
            modalTitle.textContent = "Add Value Set";
            saveBtn.textContent = "Add Value Set";
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
        document.getElementById("cqmFormAlert").innerHTML = "";
    };

    document.getElementById("openAddCqmModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCqmModal").addEventListener("click", closeModal);
    document.getElementById("cancelCqm").addEventListener("click", closeModal);
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
            loadPage(openModal, openCodesModal);
        }, 300);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        clearTimeout(searchDebounceTimer);
        searchTerm = "";
        currentPage = 1;
        loadPage(openModal, openCodesModal);
        searchInput.focus();
    });

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage -= 1;
            loadPage(openModal, openCodesModal);
        }
    });

    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            loadPage(openModal, openCodesModal);
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(`cqm_${field}`).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const editingId = idInput.value;
        const result = editingId
            ? await updateCqmValueset(editingId, data)
            : await createCqmValueset(data);

        if (!result.success) {
            showFormAlert(result.message || "Failed to save value set.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-cqm_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showToast(editingId ? "Value set updated successfully." : "Value set added successfully.", "success");
        await loadPage(openModal, openCodesModal);
    });

    // ----- Codes modal -----

    const closeCodesModal = () => {
        codesModalOverlay.classList.remove("open");
        activeValueset = null;
        activeCodes = [];
    };

    document.getElementById("closeCqmCodesModal").addEventListener("click", closeCodesModal);
    codesModalOverlay.addEventListener("click", (event) => {
        if (event.target === codesModalOverlay) {
            closeCodesModal();
        }
    });

    const openCodeFormModal = (codeItem) => {
        clearCodeErrors();
        document.getElementById("cqmCodeFormAlert").innerHTML = "";

        if (codeItem) {
            codeFormTitle.textContent = "Edit Code";
            saveCodeBtn.textContent = "Save Changes";
            codeIdInput.value = codeItem.id;
            document.getElementById("cqm_code_code").value = codeItem.code ?? "";
            document.getElementById("cqm_code_code_system").value = codeItem.code_system ?? "";
            document.getElementById("cqm_code_description").value = codeItem.description ?? "";
        } else {
            codeFormTitle.textContent = "Add Code";
            saveCodeBtn.textContent = "Add Code";
            codeIdInput.value = "";
            codeForm.reset();
            if (activeValueset) {
                document.getElementById("cqm_code_code_system").value = activeValueset.code_system ?? "";
            }
        }

        codeFormModalOverlay.classList.add("open");
    };
    const closeCodeFormModal = () => {
        codeFormModalOverlay.classList.remove("open");
        codeForm.reset();
        codeIdInput.value = "";
        clearCodeErrors();
        document.getElementById("cqmCodeFormAlert").innerHTML = "";
    };

    document.getElementById("openAddCqmCodeModal").addEventListener("click", () => openCodeFormModal(null));
    document.getElementById("closeCqmCodeFormModal").addEventListener("click", closeCodeFormModal);
    document.getElementById("cancelCqmCode").addEventListener("click", closeCodeFormModal);
    codeFormModalOverlay.addEventListener("click", (event) => {
        if (event.target === codeFormModalOverlay) {
            closeCodeFormModal();
        }
    });

    codeForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearCodeErrors();

        if (!activeValueset) {
            return;
        }

        const data = {};

        CODE_FIELDS.forEach((field) => {
            const value = document.getElementById(`cqm_code_${field}`).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const editingId = codeIdInput.value;
        const result = editingId
            ? await updateCqmValuesetCode(editingId, data)
            : await createCqmValuesetCode(activeValueset.id, data);

        if (!result.success) {
            showCodeFormAlert(result.message || "Failed to save code.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-cqm_code_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeCodeFormModal();
        showToast(editingId ? "Code updated successfully." : "Code added successfully.", "success");
        await refreshCodes(activeValueset);
        await loadPage(openModal, openCodesModal, true);
    });

    async function openCodesModal(valueset)
    {
        activeValueset = valueset;
        document.getElementById("cqmCodesModalTitle").textContent = valueset.name;
        document.getElementById("cqmCodesModalSubtitle").textContent =
            `${valueset.oid} · ${CODE_SYSTEM_LABELS[valueset.code_system] || valueset.code_system}`;

        codesModalOverlay.classList.add("open");
        await refreshCodes(valueset);
    }

    async function refreshCodes(valueset)
    {
        const result = await fetchCqmValuesetCodes(valueset.id);
        activeCodes = result.success ? result.data : [];
        renderCodesTable();
    }

    function renderCodesTable()
    {
        const tbody = document.getElementById("cqmCodesTableBody");

        if (!activeCodes.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="cqm-empty-state">
                        <div class="cqm-empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>
                        </div>
                        <strong>No codes yet</strong>
                        <p>Add member codes to this value set.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = activeCodes.map((item) => `
            <tr>
                <td><span class="cqm-oid-badge">${escapeHtml(item.code)}</span></td>
                <td><span class="cqm-system-badge">${escapeHtml(CODE_SYSTEM_LABELS[item.code_system] || item.code_system)}</span></td>
                <td>${escapeHtml(item.description || "")}</td>
                <td>
                    <div class="cqm-actions">
                        <button class="cqm-icon-btn edit" data-edit-code-id="${item.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                            Edit
                        </button>
                        <button class="cqm-icon-btn delete" data-delete-code-id="${item.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

        tbody.querySelectorAll("[data-edit-code-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const item = activeCodes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-code-id"));

                if (item) {
                    openCodeFormModal(item);
                }
            });
        });

        tbody.querySelectorAll("[data-delete-code-id]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                if (!confirm("Remove this code from the value set?")) {
                    return;
                }

                const result = await deleteCqmValuesetCode(btn.getAttribute("data-delete-code-id"));

                if (!result.success) {
                    showToast(result.message || "Failed to remove code.", "error");
                    return;
                }

                showToast("Code removed successfully.", "success");
                await refreshCodes(activeValueset);
                await loadPage(openModal, openCodesModal, true);
            });
        });
    }

    await loadPage(openModal, openCodesModal);
}

async function loadPage(openModal, openCodesModal, silent = false)
{
    const result = await fetchCqmValuesets(currentPage, PER_PAGE, searchTerm);

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

    renderRows(openModal, openCodesModal);
    renderPagination();
}

function renderRows(openModal, openCodesModal)
{
    const tbody = document.getElementById("cqmTableBody");
    const countText = document.getElementById("cqmCountText");

    countText.textContent = `${totalItems} ${totalItems === 1 ? "value set" : "value sets"}`;

    if (!currentItems.length) {
        tbody.innerHTML = renderEmptyState(totalItems === 0);
        return;
    }

    tbody.innerHTML = currentItems.map((item) => `
        <tr>
            <td><span class="cqm-oid-badge">${escapeHtml(item.oid)}</span></td>
            <td class="cqm-name">${escapeHtml(item.name)}</td>
            <td><span class="cqm-system-badge">${escapeHtml(CODE_SYSTEM_LABELS[item.code_system] || item.code_system)}</span></td>
            <td>
                <button type="button" class="cqm-codes-btn" data-codes-id="${item.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13h6M9 17h6M9 9h1"></path><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>
                    ${item.code_count} ${item.code_count === 1 ? "code" : "codes"}
                </button>
            </td>
            <td>
                <div class="cqm-actions">
                    <button class="cqm-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="cqm-icon-btn delete" data-id="${item.id}">
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

    tbody.querySelectorAll("[data-codes-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = currentItems.find((entry) => String(entry.id) === btn.getAttribute("data-codes-id"));

            if (item) {
                openCodesModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this value set and all of its member codes?")) {
                return;
            }

            const result = await deleteCqmValueset(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete value set.", "error");
                return;
            }

            showToast("Value set deleted successfully.", "success");
            await loadPage(openModal, openCodesModal);
        });
    });
}

function renderPagination()
{
    const info = document.getElementById("cqmPaginationInfo");
    const indicator = document.getElementById("cqmPageIndicator");
    const prevBtn = document.getElementById("cqmPrevPage");
    const nextBtn = document.getElementById("cqmNextPage");

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
    const heading = noneAtAll ? "No value sets yet" : "No matching value sets";
    const message = noneAtAll
        ? "Add your first CQM value set to start grouping codes for eCQM reporting."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="5" class="cqm-empty-state">
                <div class="cqm-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>
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
        const errorEl = document.getElementById(`err-cqm_${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function clearCodeErrors()
{
    CODE_FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-cqm_code_${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showFormAlert(message, type)
{
    const container = document.getElementById("cqmFormAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showCodeFormAlert(message, type)
{
    const container = document.getElementById("cqmCodeFormAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
