import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPriceLevels,
    createPriceLevel,
    updatePriceLevel,
    deletePriceLevel
} from "./price-levels.service.js";

const FIELDS = ["name", "description"];

let levels = [];
let searchTerm = "";

export async function initPriceLevels()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("priceLevelModalOverlay");
    const modalTitle = document.getElementById("priceLevelModalTitle");
    const saveBtn = document.getElementById("savePriceLevelBtn");
    const idInput = document.getElementById("price_level_id");
    const form = document.getElementById("priceLevelForm");
    const searchInput = document.getElementById("priceLevelSearch");
    const searchClear = document.getElementById("priceLevelSearchClear");

    const openModal = (level) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (level) {
            modalTitle.textContent = "Edit Price Level";
            saveBtn.textContent = "Save Changes";
            idInput.value = level.id;
            document.getElementById("name").value = level.name ?? "";
            document.getElementById("description").value = level.description ?? "";
        } else {
            modalTitle.textContent = "Add Price Level";
            saveBtn.textContent = "Add Price Level";
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

    document.getElementById("openAddPriceLevelModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePriceLevelModal").addEventListener("click", closeModal);
    document.getElementById("cancelPriceLevel").addEventListener("click", closeModal);
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
            ? await updatePriceLevel(editingId, data)
            : await createPriceLevel(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save price level.", "error");

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
        showToast(editingId ? "Price level updated successfully." : "Price level added successfully.", "success");
        await loadPriceLevels(openModal);
    });

    await loadPriceLevels(openModal);
}

async function loadPriceLevels(openModal)
{
    const result = await fetchPriceLevels();

    levels = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("priceLevelsTableBody");
    const countText = document.getElementById("priceLevelCountText");

    countText.textContent = `${levels.length} ${levels.length === 1 ? "price level" : "price levels"}`;

    const filtered = searchTerm
        ? levels.filter((level) =>
            level.name.toLowerCase().includes(searchTerm) ||
            (level.description ?? "").toLowerCase().includes(searchTerm))
        : levels;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(levels.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((level) => `
        <tr>
            <td>
                <div class="pl-name-cell">
                    <div class="pl-avatar">${escapeHtml((level.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pl-name">${escapeHtml(level.name)}</span>
                </div>
            </td>
            <td class="pl-description ${level.description ? "" : "empty"}">${escapeHtml(level.description || "No description provided")}</td>
            <td>
                <div class="pl-actions">
                    <button class="pl-icon-btn edit" data-edit-id="${level.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pl-icon-btn delete" data-id="${level.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const level = levels.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (level) {
                openModal(level);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this price level?")) {
                return;
            }

            const result = await deletePriceLevel(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete price level.", "error");
                return;
            }

            showToast("Price level deleted successfully.", "success");
            await loadPriceLevels(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No price levels yet" : "No matching price levels";
    const message = noneAtAll
        ? "Create your first price level to start setting fees on the billing catalog."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="pl-empty-state">
                <div class="pl-empty-icon">
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
