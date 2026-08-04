import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchImmunizations,
    createImmunization,
    updateImmunization,
    deleteImmunization
} from "./immunizations.service.js";

const FIELDS = ["name", "description"];

let immunizations = [];
let searchTerm = "";

export async function initImmunizations()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("immunizationModalOverlay");
    const modalTitle = document.getElementById("immunizationModalTitle");
    const saveBtn = document.getElementById("saveImmunizationBtn");
    const idInput = document.getElementById("immunization_id");
    const form = document.getElementById("immunizationForm");
    const searchInput = document.getElementById("immunizationSearch");
    const searchClear = document.getElementById("immunizationSearchClear");

    const openModal = (immunization) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (immunization) {
            modalTitle.textContent = "Edit Immunization";
            saveBtn.textContent = "Save Changes";
            idInput.value = immunization.id;
            document.getElementById("name").value = immunization.name ?? "";
            document.getElementById("description").value = immunization.description ?? "";
        } else {
            modalTitle.textContent = "Add Immunization";
            saveBtn.textContent = "Add Immunization";
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

    document.getElementById("openAddImmunizationModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeImmunizationModal").addEventListener("click", closeModal);
    document.getElementById("cancelImmunization").addEventListener("click", closeModal);
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
            ? await updateImmunization(editingId, data)
            : await createImmunization(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save immunization.", "error");

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
        showToast(editingId ? "Immunization updated successfully." : "Immunization added successfully.", "success");
        await loadImmunizations(openModal);
    });

    await loadImmunizations(openModal);
}

async function loadImmunizations(openModal)
{
    const result = await fetchImmunizations();

    immunizations = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("immunizationsTableBody");
    const countText = document.getElementById("immunizationCountText");

    countText.textContent = `${immunizations.length} ${immunizations.length === 1 ? "immunization" : "immunizations"}`;

    const filtered = searchTerm
        ? immunizations.filter((immunization) =>
            immunization.name.toLowerCase().includes(searchTerm) ||
            (immunization.description ?? "").toLowerCase().includes(searchTerm))
        : immunizations;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(immunizations.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((immunization) => `
        <tr>
            <td>
                <div class="imm-name-cell">
                    <div class="imm-avatar">${escapeHtml((immunization.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="imm-name">${escapeHtml(immunization.name)}</span>
                </div>
            </td>
            <td class="imm-description ${immunization.description ? "" : "empty"}">${escapeHtml(immunization.description || "No description provided")}</td>
            <td>
                <div class="imm-actions">
                    <button class="imm-icon-btn edit" data-edit-id="${immunization.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="imm-icon-btn delete" data-id="${immunization.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const immunization = immunizations.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (immunization) {
                openModal(immunization);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this immunization?")) {
                return;
            }

            const result = await deleteImmunization(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete immunization.", "error");
                return;
            }

            showToast("Immunization deleted successfully.", "success");
            await loadImmunizations(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No immunizations yet" : "No matching immunizations";
    const message = noneAtAll
        ? "Create your first immunization to start recording patient vaccinations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="imm-empty-state">
                <div class="imm-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"></path></svg>
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
