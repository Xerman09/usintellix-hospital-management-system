import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchFacilities,
    createFacility,
    updateFacility,
    deleteFacility
} from "../facilities/facilities.service.js";

// Vendor Management is a focused view over the same `facilities` table
// the "Load Lab Compendium" Vendor dropdown reads from -- a vendor is
// simply any facility with an NPI set. Fields the general Facilities
// form has but a lab vendor doesn't need (address, billing, tax id...)
// are left alone here; "color" is required by the backend but not
// meaningful for a vendor, so it's set to a fixed default automatically.
const DEFAULT_COLOR = "#1d4ed8";

let vendors = [];
let searchTerm = "";

export async function initVendors()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("vendorModalOverlay");
    const modalTitle = document.getElementById("vendorModalTitle");
    const saveBtn = document.getElementById("saveVendorBtn");
    const idInput = document.getElementById("vendor_id");
    const form = document.getElementById("vendorForm");
    const searchInput = document.getElementById("vendorSearchInput");
    const searchClear = document.getElementById("vendorSearchClear");

    const openModal = (vendor) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (vendor) {
            modalTitle.textContent = "Edit Vendor";
            saveBtn.textContent = "Save Changes";
            idInput.value = vendor.id;
            document.getElementById("vendor_name").value = vendor.name ?? "";
            document.getElementById("vendor_npi").value = vendor.facility_npi ?? "";
            document.getElementById("vendor_clia").value = vendor.clia_number ?? "";
            document.getElementById("vendor_lab_code").value = vendor.facility_lab_code ?? "";
        } else {
            modalTitle.textContent = "Add Vendor";
            saveBtn.textContent = "Add Vendor";
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

    document.getElementById("openAddVendorModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeVendorModal").addEventListener("click", closeModal);
    document.getElementById("cancelVendor").addEventListener("click", closeModal);
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

        const name = document.getElementById("vendor_name").value.trim();
        const npi = document.getElementById("vendor_npi").value.trim();
        const clia = document.getElementById("vendor_clia").value.trim();
        const labCode = document.getElementById("vendor_lab_code").value.trim();

        if (!npi) {
            document.getElementById("err-facility_npi").textContent = "NPI is required for a vendor.";
            return;
        }

        const data = {
            name,
            facility_npi: npi,
            color: DEFAULT_COLOR
        };

        if (clia !== "") data.clia_number = clia;
        if (labCode !== "") data.facility_lab_code = labCode;

        const editingId = idInput.value;
        const result = editingId
            ? await updateFacility(editingId, data)
            : await createFacility(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save vendor.", "error");

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
        showToast(editingId ? "Vendor updated successfully." : "Vendor added successfully.", "success");
        await loadVendors(openModal);
    });

    await loadVendors(openModal);
}

async function loadVendors(openModal)
{
    const result = await fetchFacilities();

    vendors = result.success ? result.data.filter((facility) => facility.facility_npi) : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("vendorsTableBody");
    const countText = document.getElementById("vendorCountText");

    if (!tbody || !countText) {
        return;
    }

    countText.textContent = `${vendors.length} ${vendors.length === 1 ? "vendor" : "vendors"}`;

    const filtered = searchTerm
        ? vendors.filter((vendor) =>
            vendor.name.toLowerCase().includes(searchTerm) ||
            (vendor.facility_npi ?? "").toLowerCase().includes(searchTerm))
        : vendors;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(vendors.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((vendor) => `
        <tr>
            <td class="ven-name">${escapeHtml(vendor.name)}</td>
            <td class="ven-muted">${escapeHtml(vendor.facility_npi)}</td>
            <td class="ven-muted ${vendor.clia_number ? "" : "empty"}">${escapeHtml(vendor.clia_number || "-")}</td>
            <td class="ven-muted ${vendor.facility_lab_code ? "" : "empty"}">${escapeHtml(vendor.facility_lab_code || "-")}</td>
            <td>
                <div class="ven-actions">
                    <button class="btn-edit" data-edit-id="${vendor.id}">Edit</button>
                    <button class="btn-danger" data-id="${vendor.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const vendor = vendors.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (vendor) {
                openModal(vendor);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this vendor?")) {
                return;
            }

            const result = await deleteFacility(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete vendor.", "error");
                return;
            }

            showToast("Vendor deleted successfully.", "success");
            await loadVendors(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No vendors yet" : "No matching vendors";
    const message = noneAtAll
        ? "Add a vendor so it shows up in the Load Lab Compendium Vendor list."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="5" class="ven-empty-state">
                <div class="ven-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"></path><path d="M9 21v-6h6v6"></path></svg>
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
    ["name", "facility_npi"].forEach((field) => {
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
