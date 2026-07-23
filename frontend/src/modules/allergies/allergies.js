import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchAllergies,
    createAllergy,
    updateAllergy,
    deleteAllergy
} from "./allergies.service.js";

const FIELDS = ["name", "description"];

let allergies = [];
let searchTerm = "";

export async function initAllergies()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("allergyModalOverlay");
    const modalTitle = document.getElementById("allergyModalTitle");
    const saveBtn = document.getElementById("saveAllergyBtn");
    const idInput = document.getElementById("allergy_id");
    const form = document.getElementById("allergyForm");
    const searchInput = document.getElementById("allergySearch");
    const searchClear = document.getElementById("allergySearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Allergy";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Allergy";
            saveBtn.textContent = "Add Allergy";
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

    document.getElementById("openAddAllergyModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeAllergyModal").addEventListener("click", closeModal);
    document.getElementById("cancelAllergy").addEventListener("click", closeModal);
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
            ? await updateAllergy(editingId, data)
            : await createAllergy(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save allergy.", "error");

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
        showToast(editingId ? "Allergy updated successfully." : "Allergy added successfully.", "success");
        await loadAllergies(openModal);
    });

    await loadAllergies(openModal);
}

async function loadAllergies(openModal)
{
    const result = await fetchAllergies();

    allergies = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("allergiesTableBody");
    const countText = document.getElementById("allergyCountText");

    countText.textContent = `${allergies.length} ${allergies.length === 1 ? "allergy" : "allergies"}`;

    const filtered = searchTerm
        ? allergies.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : allergies;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(allergies.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="alg-name-cell">
                    <div class="alg-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="alg-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="alg-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="alg-actions">
                    <button class="alg-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="alg-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = allergies.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this allergy?")) {
                return;
            }

            const result = await deleteAllergy(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete allergy.", "error");
                return;
            }

            showToast("Allergy deleted successfully.", "success");
            await loadAllergies(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No allergies yet" : "No matching allergies";
    const message = noneAtAll
        ? "Create your first allergy to start recording patient allergy history."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="alg-empty-state">
                <div class="alg-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4"></path></svg>
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
