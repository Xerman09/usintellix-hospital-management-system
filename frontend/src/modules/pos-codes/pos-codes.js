import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPosCodes,
    createPosCode,
    updatePosCode,
    deletePosCode
} from "./pos-codes.service.js";

const FIELDS = ["code", "name", "description"];

let posCodes = [];
let searchTerm = "";

export async function initPosCodes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("posCodeModalOverlay");
    const modalTitle = document.getElementById("posCodeModalTitle");
    const saveBtn = document.getElementById("savePosCodeBtn");
    const idInput = document.getElementById("record_id");
    const form = document.getElementById("posCodeForm");
    const searchInput = document.getElementById("posCodeSearch");
    const searchClear = document.getElementById("posCodeSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit POS Code";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("code").value = item.code ?? "";
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add POS Code";
            saveBtn.textContent = "Add POS Code";
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

    document.getElementById("openAddPosCodeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePosCodeModal").addEventListener("click", closeModal);
    document.getElementById("cancelPosCode").addEventListener("click", closeModal);
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
            ? await updatePosCode(editingId, data)
            : await createPosCode(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save POS code.", "error");

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
        showToast(editingId ? "POS code updated successfully." : "POS code added successfully.", "success");
        await loadPosCodes(openModal);
    });

    await loadPosCodes(openModal);
}

async function loadPosCodes(openModal)
{
    const result = await fetchPosCodes();

    posCodes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("posCodesTableBody");
    const countText = document.getElementById("posCodeCountText");

    countText.textContent = `${posCodes.length} ${posCodes.length === 1 ? "POS code" : "POS codes"}`;

    const filtered = searchTerm
        ? posCodes.filter((item) =>
            item.code.toLowerCase().includes(searchTerm) ||
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : posCodes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(posCodes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td><span class="pos-code-badge">${escapeHtml(item.code)}</span></td>
            <td>
                <div class="pos-name-cell">
                    <div class="pos-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pos-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="pos-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="pos-actions">
                    <button class="pos-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pos-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = posCodes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this POS code?")) {
                return;
            }

            const result = await deletePosCode(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete POS code.", "error");
                return;
            }

            showToast("POS code deleted successfully.", "success");
            await loadPosCodes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No POS codes yet" : "No matching POS codes";
    const message = noneAtAll
        ? "Create your first POS code to start billing by place of service."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="pos-empty-state">
                <div class="pos-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-6 7 6v12"></path></svg>
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
