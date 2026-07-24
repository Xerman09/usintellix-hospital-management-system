import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchX12Partners,
    createX12Partner,
    updateX12Partner,
    deleteX12Partner
} from "./x12-partners.service.js";

const FIELDS = ["name", "partner_id", "description"];

let partners = [];
let searchTerm = "";

export async function initX12Partners()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("x12PartnerModalOverlay");
    const modalTitle = document.getElementById("x12PartnerModalTitle");
    const saveBtn = document.getElementById("saveX12PartnerBtn");
    const idInput = document.getElementById("x12_partner_id");
    const form = document.getElementById("x12PartnerForm");
    const searchInput = document.getElementById("x12PartnerSearch");
    const searchClear = document.getElementById("x12PartnerSearchClear");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit X12 Partner";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("partner_id").value = item.partner_id ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add X12 Partner";
            saveBtn.textContent = "Add X12 Partner";
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

    document.getElementById("openAddX12PartnerModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeX12PartnerModal").addEventListener("click", closeModal);
    document.getElementById("cancelX12Partner").addEventListener("click", closeModal);
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
            ? await updateX12Partner(editingId, data)
            : await createX12Partner(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save X12 partner.", "error");

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
        showToast(editingId ? "X12 partner updated successfully." : "X12 partner added successfully.", "success");
        await loadX12Partners(openModal);
    });

    await loadX12Partners(openModal);
}

async function loadX12Partners(openModal)
{
    const result = await fetchX12Partners();

    partners = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("x12PartnersTableBody");
    const countText = document.getElementById("x12PartnerCountText");

    countText.textContent = `${partners.length} ${partners.length === 1 ? "partner" : "partners"}`;

    const filtered = searchTerm
        ? partners.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.partner_id.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : partners;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(partners.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="x12-name-cell">
                    <div class="x12-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="x12-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td><span class="x12-id-badge">${escapeHtml(item.partner_id)}</span></td>
            <td class="x12-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="x12-actions">
                    <button class="x12-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="x12-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = partners.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this X12 partner?")) {
                return;
            }

            const result = await deleteX12Partner(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete X12 partner.", "error");
                return;
            }

            showToast("X12 partner deleted successfully.", "success");
            await loadX12Partners(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No X12 partners yet" : "No matching partners";
    const message = noneAtAll
        ? "Create your first X12 trading partner to start exchanging EDI transactions."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="4" class="x12-empty-state">
                <div class="x12-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
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
