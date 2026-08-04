import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchCodes,
    createCode,
    updateCode,
    deleteCode,
    importCodes
} from "./codes.service.js";
import { codeTypeLabel } from "./codes.constants.js";

const TEXT_FIELDS = ["code", "modifier", "description", "short_description", "related_code"];
const ALL_FIELDS = [...TEXT_FIELDS, "code_type", "category", "fee_standard"];

let codes = [];
let searchTerm = "";
let typeFilter = "";

export async function initCodes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";
    typeFilter = "";

    const modalOverlay = document.getElementById("codeModalOverlay");
    const modalTitle = document.getElementById("codeModalTitle");
    const saveBtn = document.getElementById("saveCodeBtn");
    const idInput = document.getElementById("code_id");
    const form = document.getElementById("codeForm");
    const searchInput = document.getElementById("codeSearch");
    const searchClear = document.getElementById("codeSearchClear");
    const typeSelect = document.getElementById("codeTypeFilter");

    const importOverlay = document.getElementById("importCodeModalOverlay");
    const importForm = document.getElementById("importCodeForm");

    const openModal = (code) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (code) {
            modalTitle.textContent = "Edit Code";
            saveBtn.textContent = "Save Changes";
            idInput.value = code.id;
            document.getElementById("code_type").value = code.code_type ?? "";
            document.getElementById("code").value = code.code ?? "";
            document.getElementById("modifier").value = code.modifier ?? "";
            document.getElementById("active").checked = !!Number(code.active);
            document.getElementById("description").value = code.description ?? "";
            document.getElementById("short_description").value = code.short_description ?? "";
            document.getElementById("category").value = code.category ?? "Unassigned";
            document.getElementById("fee_standard").value = code.fee_standard ?? "";
            document.getElementById("diagnosis_reporting").checked = !!Number(code.diagnosis_reporting);
            document.getElementById("service_reporting").checked = !!Number(code.service_reporting);
            document.getElementById("related_code").value = code.related_code ?? "";
        } else {
            modalTitle.textContent = "Add Code";
            saveBtn.textContent = "Add Code";
            idInput.value = "";
            form.reset();
            document.getElementById("active").checked = true;
            document.getElementById("category").value = "Unassigned";
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

    document.getElementById("openAddCodeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeCodeModal").addEventListener("click", closeModal);
    document.getElementById("cancelCode").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    const openImportModal = () => {
        importForm.reset();
        document.getElementById("importAlert").innerHTML = "";
        document.getElementById("err-import_file").textContent = "";
        importOverlay.classList.add("open");
    };
    const closeImportModal = () => {
        importOverlay.classList.remove("open");
        importForm.reset();
        document.getElementById("importAlert").innerHTML = "";
    };

    document.getElementById("openImportCodeModal").addEventListener("click", openImportModal);
    document.getElementById("closeImportCodeModal").addEventListener("click", closeImportModal);
    document.getElementById("cancelImportCode").addEventListener("click", closeImportModal);
    importOverlay.addEventListener("click", (event) => {
        if (event.target === importOverlay) {
            closeImportModal();
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

    typeSelect.addEventListener("change", () => {
        typeFilter = typeSelect.value;
        renderRows(openModal);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {};

        TEXT_FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        data.code_type = document.getElementById("code_type").value;
        data.category = document.getElementById("category").value;
        data.active = document.getElementById("active").checked;
        data.diagnosis_reporting = document.getElementById("diagnosis_reporting").checked;
        data.service_reporting = document.getElementById("service_reporting").checked;

        const fee = document.getElementById("fee_standard").value.trim();
        if (fee !== "") {
            data.fee_standard = fee;
        }

        const editingId = idInput.value;
        const result = editingId
            ? await updateCode(editingId, data)
            : await createCode(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save code.", "error");

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
        showToast(editingId ? "Code updated successfully." : "Code added successfully.", "success");
        await loadCodes(openModal);
    });

    importForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("importAlert").innerHTML = "";
        document.getElementById("err-import_file").textContent = "";

        const codeType = document.getElementById("import_code_type").value;
        const fileInput = document.getElementById("import_file");
        const file = fileInput.files[0];

        if (!file) {
            document.getElementById("err-import_file").textContent = "Please choose a CSV file.";
            return;
        }

        const submitBtn = document.getElementById("submitImportCodeBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Importing...";

        const result = await importCodes(codeType, file);

        submitBtn.disabled = false;
        submitBtn.textContent = "Import";

        if (!result.success) {
            showImportAlert(result.message || "Failed to import codes.", "error");
            return;
        }

        const summary = result.data || {};
        showToast(`Imported ${summary.inserted ?? 0} codes (${summary.skipped_count ?? 0} skipped).`, "success");
        closeImportModal();
        await loadCodes(openModal);
    });

    await loadCodes(openModal);
}

async function loadCodes(openModal)
{
    const result = await fetchCodes({ perPage: 1000 });

    codes = result.success ? (result.data?.items ?? []) : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("codesTableBody");
    const countText = document.getElementById("codeCountText");

    countText.textContent = `${codes.length} ${codes.length === 1 ? "code" : "codes"}`;

    const filtered = codes.filter((code) => {
        const matchesType = !typeFilter || code.code_type === typeFilter;
        const matchesSearch = !searchTerm ||
            (code.code ?? "").toLowerCase().includes(searchTerm) ||
            (code.description ?? "").toLowerCase().includes(searchTerm) ||
            (code.short_description ?? "").toLowerCase().includes(searchTerm);

        return matchesType && matchesSearch;
    });

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(codes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((code) => `
        <tr>
            <td><span class="cdx-type-badge">${escapeHtml(codeTypeLabel(code.code_type))}</span></td>
            <td><span class="cdx-code">${escapeHtml(code.code)}</span></td>
            <td>${escapeHtml(code.modifier || "")}</td>
            <td>${Number(code.active) ? '<span class="cdx-flag-yes">Yes</span>' : '<span class="cdx-flag-no">No</span>'}</td>
            <td>${escapeHtml(code.category || "Unassigned")}</td>
            <td>${Number(code.diagnosis_reporting) ? '<span class="cdx-flag-yes">Yes</span>' : '<span class="cdx-flag-no">-</span>'}</td>
            <td>${Number(code.service_reporting) ? '<span class="cdx-flag-yes">Yes</span>' : '<span class="cdx-flag-no">-</span>'}</td>
            <td class="cdx-desc-cell">${escapeHtml(code.description || "")}</td>
            <td class="cdx-desc-cell">${escapeHtml(code.short_description || "")}</td>
            <td>${escapeHtml(code.related_code || "")}</td>
            <td>${code.fee_standard ? escapeHtml(code.fee_standard) : ""}</td>
            <td>
                <div class="cdx-actions">
                    <button class="cdx-icon-btn edit" data-edit-id="${code.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="cdx-icon-btn delete" data-id="${code.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const code = codes.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (code) {
                openModal(code);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this code?")) {
                return;
            }

            const result = await deleteCode(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete code.", "error");
                return;
            }

            showToast("Code deleted successfully.", "success");
            await loadCodes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No codes yet" : "No matching codes";
    const message = noneAtAll
        ? "Add your first code or import a CSV file to get started."
        : "Try a different search term or type filter.";

    return `
        <tr>
            <td colspan="12" class="cdx-empty-state">
                <div class="cdx-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 9h10M7 13h6M7 17h4"></path></svg>
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
    ALL_FIELDS.forEach((field) => {
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

function showImportAlert(message, type)
{
    const container = document.getElementById("importAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
