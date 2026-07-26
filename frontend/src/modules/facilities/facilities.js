import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { fetchOrganizationTypes } from "../organization-types/organization-types.service.js";
import { fetchPosCodes } from "../pos-codes/pos-codes.service.js";
import {
    fetchFacilities,
    createFacility,
    updateFacility,
    deleteFacility
} from "./facilities.service.js";

const TEXT_FIELDS = [
    "name",
    "physical_address_line1", "physical_city", "physical_state", "physical_zip", "physical_country",
    "mailing_address_line1", "mailing_city", "mailing_state", "mailing_zip", "mailing_country",
    "phone", "fax", "website", "email",
    "iban", "color", "facility_taxonomy", "billing_attn", "clia_number",
    "facility_lab_code", "tax_id_type", "tax_id", "oid", "facility_npi", "info"
];
const SELECT_FIELDS = ["organization_type_id", "pos_code_id"];
const TOGGLE_FIELDS = ["is_billing_location", "is_service_location", "is_primary_business_entity", "is_inactive"];
const ERROR_FIELDS = ["name", "color", "organization_type_id", "pos_code_id"];

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
    const idInput = document.getElementById("record_id");
    const form = document.getElementById("facilityForm");
    const searchInput = document.getElementById("facilitySearch");
    const searchClear = document.getElementById("facilitySearchClear");
    const colorHex = document.getElementById("color");
    const colorNative = document.getElementById("color_native");
    const differentMailing = document.getElementById("different_mailing_address");
    const mailingBlock = document.getElementById("mailingAddressBlock");
    const billingCheckbox = document.getElementById("is_billing_location");
    const assignmentCheckbox = document.getElementById("accepts_assignment");
    const assignmentItem = document.getElementById("item_accepts_assignment");
    const inactiveCheckbox = document.getElementById("is_inactive");
    const inactiveItem = document.getElementById("item_is_inactive");

    differentMailing.addEventListener("change", () => {
        mailingBlock.hidden = !differentMailing.checked;

        if (!differentMailing.checked) {
            ["mailing_address_line1", "mailing_city", "mailing_state", "mailing_zip", "mailing_country"].forEach((field) => {
                document.getElementById(field).value = "";
            });
        }
    });

    colorHex.addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
            colorNative.value = colorHex.value;
        }
    });
    colorNative.addEventListener("input", () => {
        colorHex.value = colorNative.value;
    });

    const syncAssignmentState = () => {
        assignmentCheckbox.disabled = !billingCheckbox.checked;
        assignmentItem.classList.toggle("is-disabled", !billingCheckbox.checked);

        if (!billingCheckbox.checked) {
            assignmentCheckbox.checked = false;
        }
    };
    billingCheckbox.addEventListener("change", syncAssignmentState);

    inactiveCheckbox.addEventListener("change", () => {
        inactiveItem.classList.toggle("is-danger-active", inactiveCheckbox.checked);
    });

    const openModal = async (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        await loadDropdownOptions();

        if (item) {
            modalTitle.textContent = "Edit Facility";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;

            TEXT_FIELDS.forEach((field) => {
                document.getElementById(field).value = item[field] ?? "";
            });

            const hasMailing = Boolean(item.mailing_address_line1 || item.mailing_city);
            differentMailing.checked = hasMailing;
            mailingBlock.hidden = !hasMailing;

            document.getElementById("organization_type_id").value = item.organization_type_id ?? "";
            document.getElementById("pos_code_id").value = item.pos_code_id ?? "";

            const colorValue = item.color || "#1d4ed8";
            colorHex.value = colorValue;
            colorNative.value = colorValue;

            TOGGLE_FIELDS.forEach((field) => {
                document.getElementById(field).checked = Number(item[field]) === 1;
            });
            syncAssignmentState();
            assignmentCheckbox.checked = Number(item.accepts_assignment) === 1;
            inactiveItem.classList.toggle("is-danger-active", inactiveCheckbox.checked);
        } else {
            modalTitle.textContent = "Add Facility";
            saveBtn.textContent = "Add Facility";
            idInput.value = "";
            form.reset();
            differentMailing.checked = false;
            mailingBlock.hidden = true;
            colorHex.value = "#1d4ed8";
            colorNative.value = "#1d4ed8";
            document.getElementById("tax_id_type").value = "EIN";
            syncAssignmentState();
            inactiveItem.classList.remove("is-danger-active");
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

        TEXT_FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        SELECT_FIELDS.forEach((field) => {
            const value = document.getElementById(field).value;

            if (value !== "") {
                data[field] = value;
            }
        });

        TOGGLE_FIELDS.forEach((field) => {
            data[field] = document.getElementById(field).checked ? "1" : "0";
        });

        data.accepts_assignment = assignmentCheckbox.checked ? "1" : "0";

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

async function loadDropdownOptions()
{
    const [orgTypesResult, posCodesResult] = await Promise.all([
        fetchOrganizationTypes(),
        fetchPosCodes()
    ]);

    populateSelect("organization_type_id", orgTypesResult, (item) => item.name);
    populateSelect("pos_code_id", posCodesResult, (item) => `${item.code}: ${item.name}`);
}

function populateSelect(elementId, result, labelFn)
{
    const select = document.getElementById(elementId);
    const previousValue = select.value;

    select.querySelectorAll("option[data-dynamic]").forEach((option) => option.remove());

    if (result.success) {
        result.data.forEach((item) => {
            const option = document.createElement("option");

            option.value = item.id;
            option.dataset.dynamic = "true";
            option.textContent = labelFn(item);

            select.appendChild(option);
        });
    }

    select.value = previousValue;
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
            (item.organization_type_name ?? "").toLowerCase().includes(searchTerm) ||
            (item.phone ?? "").toLowerCase().includes(searchTerm) ||
            (item.physical_city ?? "").toLowerCase().includes(searchTerm))
        : facilities;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(facilities.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => {
        const isInactive = Number(item.is_inactive) === 1;

        return `
        <tr>
            <td>
                <div class="fac-name-cell">
                    <div class="fac-avatar" style="background:${escapeHtml(item.color || "#1d4ed8")}">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="fac-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td><span class="fac-tag ${item.organization_type_name ? "" : "empty"}">${item.organization_type_name ? escapeHtml(item.organization_type_name) : "Not set"}</span></td>
            <td class="fac-muted ${item.phone ? "" : "empty"}">${escapeHtml(item.phone || "No phone provided")}</td>
            <td class="fac-muted ${item.physical_city ? "" : "empty"}">${escapeHtml(item.physical_city || "No city provided")}</td>
            <td>
                <span class="fac-status-badge ${isInactive ? "inactive" : "active"}">
                    <span class="dot"></span>${isInactive ? "Inactive" : "Active"}
                </span>
            </td>
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
    `;
    }).join("");

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
            <td colspan="6" class="fac-empty-state">
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
    ERROR_FIELDS.forEach((field) => {
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
