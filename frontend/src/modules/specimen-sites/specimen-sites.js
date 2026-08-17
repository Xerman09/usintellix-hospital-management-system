import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchSpecimenSites,
    createSpecimenSite,
    updateSpecimenSite,
    deleteSpecimenSite
} from "./specimen-sites.service.js";

const FIELDS = ["name", "description"];

let sites = [];
let searchTerm = "";

export async function initSpecimenSites()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("specimenSiteModalOverlay");
    const modalTitle = document.getElementById("specimenSiteModalTitle");
    const saveBtn = document.getElementById("saveSpecimenSiteBtn");
    const idInput = document.getElementById("specimen_site_id");
    const form = document.getElementById("specimenSiteForm");
    const searchInput = document.getElementById("specimenSiteSearch");
    const searchClear = document.getElementById("specimenSiteSearchClear");

    const openModal = (site) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (site) {
            modalTitle.textContent = "Edit Site";
            saveBtn.textContent = "Save Changes";
            idInput.value = site.id;
            document.getElementById("name").value = site.name ?? "";
            document.getElementById("description").value = site.description ?? "";
        } else {
            modalTitle.textContent = "Add Site";
            saveBtn.textContent = "Add Site";
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

    document.getElementById("openAddSpecimenSiteModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeSpecimenSiteModal").addEventListener("click", closeModal);
    document.getElementById("cancelSpecimenSite").addEventListener("click", closeModal);
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
            ? await updateSpecimenSite(editingId, data)
            : await createSpecimenSite(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save specimen site.", "error");

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
        showToast(editingId ? "Site updated successfully." : "Site added successfully.", "success");
        await loadSpecimenSites(openModal);
    });

    await loadSpecimenSites(openModal);
}

async function loadSpecimenSites(openModal)
{
    const result = await fetchSpecimenSites();

    sites = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("specimenSitesTableBody");
    const countText = document.getElementById("specimenSiteCountText");

    countText.textContent = `${sites.length} ${sites.length === 1 ? "site" : "sites"}`;

    const filtered = searchTerm
        ? sites.filter((site) =>
            site.name.toLowerCase().includes(searchTerm) ||
            (site.description ?? "").toLowerCase().includes(searchTerm))
        : sites;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(sites.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((site) => `
        <tr>
            <td>
                <div class="ss-name-cell">
                    <div class="ss-avatar">${escapeHtml((site.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="ss-name">${escapeHtml(site.name)}</span>
                </div>
            </td>
            <td class="ss-description ${site.description ? "" : "empty"}">${escapeHtml(site.description || "No description provided")}</td>
            <td>
                <div class="ss-actions">
                    <button class="ss-icon-btn edit" data-edit-id="${site.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="ss-icon-btn delete" data-id="${site.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const site = sites.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (site) {
                openModal(site);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this specimen site?")) {
                return;
            }

            const result = await deleteSpecimenSite(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete specimen site.", "error");
                return;
            }

            showToast("Specimen site deleted successfully.", "success");
            await loadSpecimenSites(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No sites yet" : "No matching sites";
    const message = noneAtAll
        ? "Create your first specimen site to start recording where specimens were collected."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="ss-empty-state">
                <div class="ss-empty-icon">
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
