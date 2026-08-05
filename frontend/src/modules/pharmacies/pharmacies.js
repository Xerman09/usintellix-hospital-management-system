import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchPharmacies,
    createPharmacy,
    updatePharmacy,
    deletePharmacy
} from "./pharmacies.service.js";

const FIELDS = [
    "name", "address", "address2", "city", "state", "zip",
    "email", "phone", "fax", "npi", "ncpdp", "default_method"
];

let pharmacies = [];
let searchTerm = "";

export async function initPharmacies()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("pharmacyModalOverlay");
    const modalTitle = document.getElementById("pharmacyModalTitle");
    const saveBtn = document.getElementById("savePharmacyBtn");
    const idInput = document.getElementById("pharmacy_id");
    const form = document.getElementById("pharmacyForm");
    const searchInput = document.getElementById("pharmacySearch");
    const searchClear = document.getElementById("pharmacySearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Pharmacy";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            FIELDS.forEach((field) => {
                document.getElementById(field).value = item[field] ?? "";
            });
        } else {
            modalTitle.textContent = "Add a Pharmacy";
            saveBtn.textContent = "Add a Pharmacy";
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

    document.getElementById("openAddPharmacyModal").addEventListener("click", () => openModal(null));
    document.getElementById("closePharmacyModal").addEventListener("click", closeModal);
    document.getElementById("cancelPharmacy").addEventListener("click", closeModal);
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
            ? await updatePharmacy(editingId, data)
            : await createPharmacy(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save pharmacy.", "error");

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
        showToast(editingId ? "Pharmacy updated successfully." : "Pharmacy added successfully.", "success");
        await loadPharmacies(openModal);
    });

    await loadPharmacies(openModal);
}

async function loadPharmacies(openModal)
{
    const result = await fetchPharmacies();

    pharmacies = result.success ? result.data : [];

    renderRows(openModal);
}

function formatAddress(item)
{
    const parts = [item.address, item.address2, item.city, item.state, item.zip].filter(Boolean);

    return parts.join(", ");
}

function renderRows(openModal)
{
    const tbody = document.getElementById("pharmaciesTableBody");
    const countText = document.getElementById("pharmacyCountText");

    countText.textContent = `${pharmacies.length} ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"}`;

    const filtered = searchTerm
        ? pharmacies.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            formatAddress(item).toLowerCase().includes(searchTerm))
        : pharmacies;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(pharmacies.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => {
        const address = formatAddress(item);

        return `
        <tr>
            <td>
                <div class="pharmacy-name-cell">
                    <div class="pharmacy-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="pharmacy-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="pharmacy-address ${address ? "" : "empty"}">${escapeHtml(address || "No address provided")}</td>
            <td>${item.default_method ? `<span class="pharmacy-method-badge">${escapeHtml(item.default_method)}</span>` : `<span class="pharmacy-address empty">Not set</span>`}</td>
            <td>
                <div class="pharmacy-actions">
                    <button class="pharmacy-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="pharmacy-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = pharmacies.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this pharmacy?")) {
                return;
            }

            const result = await deletePharmacy(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete pharmacy.", "error");
                return;
            }

            showToast("Pharmacy deleted successfully.", "success");
            await loadPharmacies(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No pharmacies yet" : "No matching pharmacies";
    const message = noneAtAll
        ? "Add your first pharmacy to start routing prescriptions."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="pharmacy-empty-state">
                <div class="pharmacy-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5"></path></svg>
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
