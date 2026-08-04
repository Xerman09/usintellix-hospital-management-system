import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchInformationSources,
    createInformationSource,
    updateInformationSource,
    deleteInformationSource
} from "./information-sources.service.js";

const FIELDS = ["name", "description"];

let sources = [];
let searchTerm = "";

export async function initInformationSources()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("informationSourceModalOverlay");
    const modalTitle = document.getElementById("informationSourceModalTitle");
    const saveBtn = document.getElementById("saveInformationSourceBtn");
    const idInput = document.getElementById("information_source_id");
    const form = document.getElementById("informationSourceForm");
    const searchInput = document.getElementById("informationSourceSearch");
    const searchClear = document.getElementById("informationSourceSearchClear");

    const openModal = (source) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (source) {
            modalTitle.textContent = "Edit Source";
            saveBtn.textContent = "Save Changes";
            idInput.value = source.id;
            document.getElementById("name").value = source.name ?? "";
            document.getElementById("description").value = source.description ?? "";
        } else {
            modalTitle.textContent = "Add Source";
            saveBtn.textContent = "Add Source";
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

    document.getElementById("openAddInformationSourceModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeInformationSourceModal").addEventListener("click", closeModal);
    document.getElementById("cancelInformationSource").addEventListener("click", closeModal);
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
            ? await updateInformationSource(editingId, data)
            : await createInformationSource(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save information source.", "error");

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
        showToast(editingId ? "Source updated successfully." : "Source added successfully.", "success");
        await loadInformationSources(openModal);
    });

    await loadInformationSources(openModal);
}

async function loadInformationSources(openModal)
{
    const result = await fetchInformationSources();

    sources = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("informationSourcesTableBody");
    const countText = document.getElementById("informationSourceCountText");

    countText.textContent = `${sources.length} ${sources.length === 1 ? "source" : "sources"}`;

    const filtered = searchTerm
        ? sources.filter((source) =>
            source.name.toLowerCase().includes(searchTerm) ||
            (source.description ?? "").toLowerCase().includes(searchTerm))
        : sources;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(sources.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((source) => `
        <tr>
            <td>
                <div class="isrc-name-cell">
                    <div class="isrc-avatar">${escapeHtml((source.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="isrc-name">${escapeHtml(source.name)}</span>
                </div>
            </td>
            <td class="isrc-description ${source.description ? "" : "empty"}">${escapeHtml(source.description || "No description provided")}</td>
            <td>
                <div class="isrc-actions">
                    <button class="isrc-icon-btn edit" data-edit-id="${source.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="isrc-icon-btn delete" data-id="${source.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const source = sources.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (source) {
                openModal(source);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this information source?")) {
                return;
            }

            const result = await deleteInformationSource(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete information source.", "error");
                return;
            }

            showToast("Information source deleted successfully.", "success");
            await loadInformationSources(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No sources yet" : "No matching sources";
    const message = noneAtAll
        ? "Create your first information source to start recording immunizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="isrc-empty-state">
                <div class="isrc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path></svg>
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
