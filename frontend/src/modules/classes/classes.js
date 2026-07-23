import { getUser } from "../../core/session.js";
import {
    fetchClasses,
    createClass,
    updateClass,
    deleteClass
} from "./classes.service.js";

const FIELDS = ["name", "description"];

let classes = [];
let searchTerm = "";

export async function initClasses()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("classModalOverlay");
    const modalTitle = document.getElementById("classModalTitle");
    const saveBtn = document.getElementById("saveClassBtn");
    const idInput = document.getElementById("class_id");
    const form = document.getElementById("classForm");
    const searchInput = document.getElementById("classSearch");

    const openModal = (item) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (item) {
            modalTitle.textContent = "Edit Class";
            saveBtn.textContent = "Save Changes";
            idInput.value = item.id;
            document.getElementById("name").value = item.name ?? "";
            document.getElementById("description").value = item.description ?? "";
        } else {
            modalTitle.textContent = "Add Class";
            saveBtn.textContent = "Add Class";
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

    document.getElementById("openAddClassModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeClassModal").addEventListener("click", closeModal);
    document.getElementById("cancelClass").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderRows(openModal);
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
            ? await updateClass(editingId, data)
            : await createClass(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save class.", "error");

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
        showListAlert(editingId ? "Class updated successfully." : "Class added successfully.", "success");
        await loadClasses(openModal);
    });

    await loadClasses(openModal);
}

async function loadClasses(openModal)
{
    const result = await fetchClasses();

    classes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("classesTableBody");
    const countText = document.getElementById("classCountText");

    countText.textContent = `${classes.length} ${classes.length === 1 ? "class" : "classes"}`;

    const filtered = searchTerm
        ? classes.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description ?? "").toLowerCase().includes(searchTerm))
        : classes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(classes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>
                <div class="cls-name-cell">
                    <div class="cls-avatar">${escapeHtml((item.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="cls-name">${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="cls-description ${item.description ? "" : "empty"}">${escapeHtml(item.description || "No description provided")}</td>
            <td>
                <div class="cls-actions">
                    <button class="cls-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="cls-icon-btn delete" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = classes.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this class?")) {
                return;
            }

            await deleteClass(btn.getAttribute("data-id"));
            await loadClasses(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No classes yet" : "No matching classes";
    const message = noneAtAll
        ? "Create your first class to start using it across the system."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="cls-empty-state">
                <div class="cls-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path></svg>
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

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}
