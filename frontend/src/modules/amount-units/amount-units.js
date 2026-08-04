import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchAmountUnits,
    createAmountUnit,
    updateAmountUnit,
    deleteAmountUnit
} from "./amount-units.service.js";

const FIELDS = ["name", "description"];

let units = [];
let searchTerm = "";

export async function initAmountUnits()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("amountUnitModalOverlay");
    const modalTitle = document.getElementById("amountUnitModalTitle");
    const saveBtn = document.getElementById("saveAmountUnitBtn");
    const idInput = document.getElementById("amount_unit_id");
    const form = document.getElementById("amountUnitForm");
    const searchInput = document.getElementById("amountUnitSearch");
    const searchClear = document.getElementById("amountUnitSearchClear");

    const openModal = (unit) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (unit) {
            modalTitle.textContent = "Edit Unit";
            saveBtn.textContent = "Save Changes";
            idInput.value = unit.id;
            document.getElementById("name").value = unit.name ?? "";
            document.getElementById("description").value = unit.description ?? "";
        } else {
            modalTitle.textContent = "Add Unit";
            saveBtn.textContent = "Add Unit";
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

    document.getElementById("openAddAmountUnitModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeAmountUnitModal").addEventListener("click", closeModal);
    document.getElementById("cancelAmountUnit").addEventListener("click", closeModal);
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
            ? await updateAmountUnit(editingId, data)
            : await createAmountUnit(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save amount unit.", "error");

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
        showToast(editingId ? "Unit updated successfully." : "Unit added successfully.", "success");
        await loadAmountUnits(openModal);
    });

    await loadAmountUnits(openModal);
}

async function loadAmountUnits(openModal)
{
    const result = await fetchAmountUnits();

    units = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("amountUnitsTableBody");
    const countText = document.getElementById("amountUnitCountText");

    countText.textContent = `${units.length} ${units.length === 1 ? "unit" : "units"}`;

    const filtered = searchTerm
        ? units.filter((unit) =>
            unit.name.toLowerCase().includes(searchTerm) ||
            (unit.description ?? "").toLowerCase().includes(searchTerm))
        : units;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(units.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((unit) => `
        <tr>
            <td>
                <div class="au-name-cell">
                    <div class="au-avatar">${escapeHtml((unit.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="au-name">${escapeHtml(unit.name)}</span>
                </div>
            </td>
            <td class="au-description ${unit.description ? "" : "empty"}">${escapeHtml(unit.description || "No description provided")}</td>
            <td>
                <div class="au-actions">
                    <button class="au-icon-btn edit" data-edit-id="${unit.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="au-icon-btn delete" data-id="${unit.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const unit = units.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (unit) {
                openModal(unit);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this amount unit?")) {
                return;
            }

            const result = await deleteAmountUnit(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete amount unit.", "error");
                return;
            }

            showToast("Amount unit deleted successfully.", "success");
            await loadAmountUnits(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No units yet" : "No matching units";
    const message = noneAtAll
        ? "Create your first amount unit to start recording medications and immunizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="au-empty-state">
                <div class="au-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"></path></svg>
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
