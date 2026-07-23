import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchFacilityBillings,
    createFacilityBilling,
    updateFacilityBilling,
    deleteFacilityBilling
} from "./facility-billings.service.js";

const FIELDS = ["name", "rate", "description"];

let billings = [];
let searchTerm = "";

export async function initFacilityBillings()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("facilityBillingModalOverlay");
    const modalTitle = document.getElementById("facilityBillingModalTitle");
    const saveBtn = document.getElementById("saveFacilityBillingBtn");
    const idInput = document.getElementById("facility_billing_id");
    const form = document.getElementById("facilityBillingForm");
    const searchInput = document.getElementById("facilityBillingSearch");
    const searchClear = document.getElementById("facilityBillingSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Facility Billing";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("rate").value = item.rate ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Facility Billing";
            saveBtn.textContent = "Add Facility Billing";
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

    document.getElementById("openAddFacilityBillingModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeFacilityBillingModal").addEventListener("click", closeModal);
    document.getElementById("cancelFacilityBilling").addEventListener("click", closeModal);
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
            ? await updateFacilityBilling(editingId, data)
            : await createFacilityBilling(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save facility billing.", "error");

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
        showToast(editingId ? "Facility billing updated successfully." : "Facility billing added successfully.", "success");
        await loadFacilityBillings(openModal);
    });

    await loadFacilityBillings(openModal);
}

async function loadFacilityBillings(openModal)
{
    const result = await fetchFacilityBillings();

    billings = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("facilityBillingsTableBody");
    const countText = document.getElementById("facilityBillingCountText");

    countText.textContent = `${billings.length} ${billings.length === 1 ? "billing record" : "billing records"}`;

    const filtered = searchTerm
        ? billings.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : billings;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(billings.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="fb-name-cell">
                    <div class="fb-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="fb-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="fb-rate">${formatCurrency(item.rate)}</td>
            <td class="fb-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="fb-actions">
                    <button class="fb-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="fb-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = billings.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this facility billing record?")) {
                return;
            }

            const result = await deleteFacilityBilling(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete facility billing.", "error");
                return;
            }

            showToast("Facility billing deleted successfully.", "success");
            await loadFacilityBillings(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No facility billing records yet" : "No matching billing records";
    const message = noneAtAll
        ? "Create your first facility billing rate to start charging for facility usage."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="fb-empty-state">
                <div class="fb-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function formatCurrency(value)
{
    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return "-";
    }

    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
