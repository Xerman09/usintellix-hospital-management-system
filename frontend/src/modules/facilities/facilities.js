import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchFacilities,
    createFacility,
    updateFacility,
    deleteFacility
} from "./facilities.service.js";

const FIELDS = ["name", "location", "description"];

let facilities = [];
let searchTerm = "";

export async function initFacilities()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("facilityModalOverlay");
    const modalTitle = document.getElementById("facilityModalTitle");
    const saveBtn = document.getElementById("saveFacilityBtn");
    const idInput = document.getElementById("facility_id");
    const form = document.getElementById("facilityForm");
    const searchInput = document.getElementById("facilitySearch");
    const searchClear = document.getElementById("facilitySearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Facility";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("location").value = item.location ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Facility";
            saveBtn.textContent = "Add Facility";
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

    document.getElementById("openAddFacilityModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeFacilityModal").addEventListener("click", closeModal);
    document.getElementById("cancelFacility").addEventListener("click", closeModal);
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
            ? await updateFacility(editingId, data)
            : await createFacility(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save facility.", "error");

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
        showToast(editingId ? "Facility updated successfully." : "Facility added successfully.", "success");
        await loadFacilities(openModal);
    });

    await loadFacilities(openModal);
}

async function loadFacilities(openModal)
{
    const result = await fetchFacilities();

    facilities = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("facilitiesTableBody");
    const countText = document.getElementById("facilityCountText");

    countText.textContent = `${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}`;

    const filtered = searchTerm
        ? facilities.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.location ?? "").toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : facilities;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(facilities.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="fac-name-cell">
                    <div class="fac-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="fac-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="fac-location ${item.location ? "" : "empty"}">
                ${item.location ? `<span class="fac-location-cell"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>${escapeHtml(item.location)}</span>` : "No location set"}
            </td>
            <td class="fac-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="fac-actions">
                    <button class="fac-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="fac-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = facilities.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this facility?")) {
                return;
            }

            const result = await deleteFacility(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete facility.", "error");
                return;
            }

            showToast("Facility deleted successfully.", "success");
            await loadFacilities(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No facilities yet" : "No matching facilities";
    const message = noneAtAll
        ? "Create your first facility to start using it across the system."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="fac-empty-state">
                <div class="fac-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"></path></svg>
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
