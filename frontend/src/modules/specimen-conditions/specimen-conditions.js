import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchSpecimenConditions,
    createSpecimenCondition,
    updateSpecimenCondition,
    deleteSpecimenCondition
} from "./specimen-conditions.service.js";

const FIELDS = ["name", "description"];

let conditions = [];
let searchTerm = "";

export async function initSpecimenConditions()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("specimenConditionModalOverlay");
    const modalTitle = document.getElementById("specimenConditionModalTitle");
    const saveBtn = document.getElementById("saveSpecimenConditionBtn");
    const idInput = document.getElementById("specimen_condition_id");
    const form = document.getElementById("specimenConditionForm");
    const searchInput = document.getElementById("specimenConditionSearch");
    const searchClear = document.getElementById("specimenConditionSearchClear");

    const openModal = (condition) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (condition) {
            modalTitle.textContent = "Edit Condition";
            saveBtn.textContent = "Save Changes";
            idInput.value = condition.id;
            document.getElementById("name").value = condition.name ?? "";
            document.getElementById("description").value = condition.description ?? "";
        } else {
            modalTitle.textContent = "Add Condition";
            saveBtn.textContent = "Add Condition";
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

    document.getElementById("openAddSpecimenConditionModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeSpecimenConditionModal").addEventListener("click", closeModal);
    document.getElementById("cancelSpecimenCondition").addEventListener("click", closeModal);
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
            ? await updateSpecimenCondition(editingId, data)
            : await createSpecimenCondition(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save specimen condition.", "error");

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
        showToast(editingId ? "Condition updated successfully." : "Condition added successfully.", "success");
        await loadSpecimenConditions(openModal);
    });

    await loadSpecimenConditions(openModal);
}

async function loadSpecimenConditions(openModal)
{
    const result = await fetchSpecimenConditions();

    conditions = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("specimenConditionsTableBody");
    const countText = document.getElementById("specimenConditionCountText");

    countText.textContent = `${conditions.length} ${conditions.length === 1 ? "condition" : "conditions"}`;

    const filtered = searchTerm
        ? conditions.filter((condition) =>
            condition.name.toLowerCase().includes(searchTerm) ||
            (condition.description ?? "").toLowerCase().includes(searchTerm))
        : conditions;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(conditions.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((condition) => `
        <tr>
            <td>
                <div class="sc-name-cell">
                    <div class="sc-avatar">${escapeHtml((condition.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="sc-name">${escapeHtml(condition.name)}</span>
                </div>
            </td>
            <td class="sc-description ${condition.description ? "" : "empty"}">${escapeHtml(condition.description || "No description provided")}</td>
            <td>
                <div class="sc-actions">
                    <button class="sc-icon-btn edit" data-edit-id="${condition.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="sc-icon-btn delete" data-id="${condition.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const condition = conditions.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (condition) {
                openModal(condition);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this specimen condition?")) {
                return;
            }

            const result = await deleteSpecimenCondition(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete specimen condition.", "error");
                return;
            }

            showToast("Specimen condition deleted successfully.", "success");
            await loadSpecimenConditions(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No conditions yet" : "No matching conditions";
    const message = noneAtAll
        ? "Create your first specimen condition to start recording the state a specimen arrived in."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="sc-empty-state">
                <div class="sc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
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
