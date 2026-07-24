import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { fetchPayerTypes } from "../payer-types/payer-types.service.js";
import { fetchX12Partners } from "../x12-partners/x12-partners.service.js";
import { fetchCqmSourceOfPayments } from "../cqm-source-of-payments/cqm-source-of-payments.service.js";
import {
    fetchInsurances,
    createInsurance,
    updateInsurance,
    deleteInsurance
} from "./insurances.service.js";

const FIELDS = [
    "insurance_id", "name", "attention",
    "address_line1", "address_line2", "city", "state", "zip", "country",
    "phone", "payer_id", "payer_type_id", "x12_partner_id", "cqm_source_of_payment_id"
];

let insurances = [];
let searchTerm = "";

export async function initInsurances()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("insuranceModalOverlay");
    const modalTitle = document.getElementById("insuranceModalTitle");
    const saveBtn = document.getElementById("saveInsuranceBtn");
    const idInput = document.getElementById("record_id");
    const form = document.getElementById("insuranceForm");
    const searchInput = document.getElementById("insuranceSearch");
    const searchClear = document.getElementById("insuranceSearchClear");

    const openModal = async (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        await loadDropdownOptions();

        if (item) {
            modalTitle.textContent = "Edit Insurance";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;

            FIELDS.forEach((field) => {
                document.getElementById(field).value = item[field] ?? "";
            });
        } else {
            modalTitle.textContent = "Add Insurance";
            saveBtn.textContent = "Add Insurance";
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

    document.getElementById("openAddInsuranceModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeInsuranceModal").addEventListener("click", closeModal);
    document.getElementById("cancelInsurance").addEventListener("click", closeModal);
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
            ? await updateInsurance(editingId, data)
            : await createInsurance(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save insurance.", "error");

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
        showToast(editingId ? "Insurance updated successfully." : "Insurance added successfully.", "success");
        await loadInsurances(openModal);
    });

    await loadInsurances(openModal);
}

async function loadDropdownOptions()
{
    const [payerTypesResult, x12PartnersResult, sopResult] = await Promise.all([
        fetchPayerTypes(),
        fetchX12Partners(),
        fetchCqmSourceOfPayments()
    ]);

    populateSelect("payer_type_id", payerTypesResult);
    populateSelect("x12_partner_id", x12PartnersResult);
    populateSelect("cqm_source_of_payment_id", sopResult);
}

function populateSelect(elementId, result)
{
    const select = document.getElementById(elementId);
    const previousValue = select.value;

    select.querySelectorAll("option[data-dynamic]").forEach((option) => option.remove());

    if (result.success) {
        result.data.forEach((item) => {
            const option = document.createElement("option");

            option.value = item.id;
            option.dataset.dynamic = "true";
            option.textContent = item.name;

            select.appendChild(option);
        });
    }

    select.value = previousValue;
}

async function loadInsurances(openModal)
{
    const result = await fetchInsurances();

    insurances = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("insurancesTableBody");
    const countText = document.getElementById("insuranceCountText");

    countText.textContent = `${insurances.length} ${insurances.length === 1 ? "insurance" : "insurances"}`;

    const filtered = searchTerm
        ? insurances.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.insurance_id.toLowerCase().includes(searchTerm) ||
            (item.payer_id ?? "").toLowerCase().includes(searchTerm) ||
            (item.phone ?? "").toLowerCase().includes(searchTerm) ||
            (item.payer_type_name ?? "").toLowerCase().includes(searchTerm))
        : insurances;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(insurances.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="ins-name-cell">
                    <div class="ins-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <div class="ins-name-wrap">
                        <span class="ins-name">${escapeHtml(item.name)}</span>
                        ${item.city || item.state ? `<span class="ins-subtext">${escapeHtml([item.city, item.state].filter(Boolean).join(", "))}</span>` : ""}
                    </div>
                </div>
            </td>
            <td><span class="ins-id-badge">${escapeHtml(item.insurance_id)}</span></td>
            <td><span class="ins-tag ${item.payer_type_name ? "" : "empty"}">${item.payer_type_name ? escapeHtml(item.payer_type_name) : "Not set"}</span></td>
            <td class="ins-muted ${item.phone ? "" : "empty"}">${escapeHtml(item.phone || "No phone provided")}</td>
            <td>
                <div class="ins-actions">
                    <button class="ins-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="ins-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = insurances.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this insurance?")) {
                return;
            }

            const result = await deleteInsurance(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete insurance.", "error");
                return;
            }

            showToast("Insurance deleted successfully.", "success");
            await loadInsurances(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No insurances yet" : "No matching insurances";
    const message = noneAtAll
        ? "Create your first insurance company to start billing patients."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="5" class="ins-empty-state">
                <div class="ins-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z"></path></svg>
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
