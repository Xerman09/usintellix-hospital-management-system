import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPreferenceTypes,
    createPreferenceType,
    updatePreferenceType,
    deletePreferenceType
} from "./preference-types.service.js";

const FIELDS = ["name", "loinc_code", "description"];

let preferenceTypes = [];
let searchTerm = "";

export async function initPreferenceTypes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("preferenceTypeModalOverlay");
    const modalTitle = document.getElementById("preferenceTypeModalTitle");
    const saveBtn = document.getElementById("savePreferenceTypeBtn");
    const idInput = document.getElementById("preference_type_id");
    const form = document.getElementById("preferenceTypeForm");
    const searchInput = document.getElementById("preferenceTypeSearch");
    const searchClear = document.getElementById("preferenceTypeSearchClear");

    const openModal = (preferenceType) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (preferenceType) {
            modalTitle.textContent = "Edit Preference Type";
            saveBtn.textContent = "Save Changes";
            idInput.value = preferenceType.id;
            document.getElementById("name").value = preferenceType.name ?? "";
            document.getElementById("loinc_code").value = preferenceType.loinc_code ?? "";
            document.getElementById("description").value = preferenceType.description ?? "";
        } else {
            modalTitle.textContent = "Add Preference Type";
            saveBtn.textContent = "Add Preference Type";
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

    document.getElementById("openAddPreferenceTypeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePreferenceTypeModal").addEventListener("click", closeModal);
    document.getElementById("cancelPreferenceType").addEventListener("click", closeModal);
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
            ? await updatePreferenceType(editingId, data)
            : await createPreferenceType(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save preference type.", "error");

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
        showToast(editingId ? "Preference type updated successfully." : "Preference type added successfully.", "success");
        await loadPreferenceTypes(openModal);
    });

    await loadPreferenceTypes(openModal);
}

async function loadPreferenceTypes(openModal)
{
    const result = await fetchPreferenceTypes();

    preferenceTypes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("preferenceTypesTableBody");
    const countText = document.getElementById("preferenceTypeCountText");

    countText.textContent = `${preferenceTypes.length} preference ${preferenceTypes.length === 1 ? "type" : "types"}`;

    const filtered = searchTerm
        ? preferenceTypes.filter((preferenceType) =>
            preferenceType.name.toLowerCase().includes(searchTerm) ||
            (preferenceType.loinc_code ?? "").toLowerCase().includes(searchTerm) ||
            (preferenceType.description ?? "").toLowerCase().includes(searchTerm))
        : preferenceTypes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(preferenceTypes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((preferenceType) => `
        <tr>
            <td>
                <div class="pft-name-cell">
                    <div class="pft-avatar">${escapeHtml((preferenceType.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pft-name">${escapeHtml(preferenceType.name)}</span>
                </div>
            </td>
            <td><span class="pft-code ${preferenceType.loinc_code ? "" : "empty"}">${escapeHtml(preferenceType.loinc_code || "Not coded")}</span></td>
            <td class="pft-description ${preferenceType.description ? "" : "empty"}">${escapeHtml(preferenceType.description || "No description provided")}</td>
            <td>
                <div class="pft-actions">
                    <button class="pft-icon-btn edit" data-edit-id="${preferenceType.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pft-icon-btn delete" data-id="${preferenceType.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const preferenceType = preferenceTypes.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (preferenceType) {
                openModal(preferenceType);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this preference type?")) {
                return;
            }

            const result = await deletePreferenceType(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete preference type.", "error");
                return;
            }

            showToast("Preference type deleted successfully.", "success");
            await loadPreferenceTypes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No preference types yet" : "No matching preference types";
    const message = noneAtAll
        ? "Create your first preference type to start recording patient treatment preferences."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="pft-empty-state">
                <div class="pft-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>
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
