import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchAdministrationRoutes,
    createAdministrationRoute,
    updateAdministrationRoute,
    deleteAdministrationRoute
} from "./administration-routes.service.js";

const FIELDS = ["name", "description"];

let routes = [];
let searchTerm = "";

export async function initAdministrationRoutes()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    const modalOverlay = document.getElementById("administrationRouteModalOverlay");
    const modalTitle = document.getElementById("administrationRouteModalTitle");
    const saveBtn = document.getElementById("saveAdministrationRouteBtn");
    const idInput = document.getElementById("administration_route_id");
    const form = document.getElementById("administrationRouteForm");
    const searchInput = document.getElementById("administrationRouteSearch");
    const searchClear = document.getElementById("administrationRouteSearchClear");

    const openModal = (route) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (route) {
            modalTitle.textContent = "Edit Route";
            saveBtn.textContent = "Save Changes";
            idInput.value = route.id;
            document.getElementById("name").value = route.name ?? "";
            document.getElementById("description").value = route.description ?? "";
        } else {
            modalTitle.textContent = "Add Route";
            saveBtn.textContent = "Add Route";
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

    document.getElementById("openAddAdministrationRouteModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeAdministrationRouteModal").addEventListener("click", closeModal);
    document.getElementById("cancelAdministrationRoute").addEventListener("click", closeModal);
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
            ? await updateAdministrationRoute(editingId, data)
            : await createAdministrationRoute(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save administration route.", "error");

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
        showToast(editingId ? "Route updated successfully." : "Route added successfully.", "success");
        await loadAdministrationRoutes(openModal);
    });

    await loadAdministrationRoutes(openModal);
}

async function loadAdministrationRoutes(openModal)
{
    const result = await fetchAdministrationRoutes();

    routes = result.success ? result.data : [];

    renderRows(openModal);
}

function renderRows(openModal)
{
    const tbody = document.getElementById("administrationRoutesTableBody");
    const countText = document.getElementById("administrationRouteCountText");

    countText.textContent = `${routes.length} ${routes.length === 1 ? "route" : "routes"}`;

    const filtered = searchTerm
        ? routes.filter((route) =>
            route.name.toLowerCase().includes(searchTerm) ||
            (route.description ?? "").toLowerCase().includes(searchTerm))
        : routes;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(routes.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((route) => `
        <tr>
            <td>
                <div class="ar-name-cell">
                    <div class="ar-avatar">${escapeHtml((route.name || "?").charAt(0).toUpperCase())}</div>
                    <span class="ar-name">${escapeHtml(route.name)}</span>
                </div>
            </td>
            <td class="ar-description ${route.description ? "" : "empty"}">${escapeHtml(route.description || "No description provided")}</td>
            <td>
                <div class="ar-actions">
                    <button class="ar-icon-btn edit" data-edit-id="${route.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    <button class="ar-icon-btn delete" data-id="${route.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const route = routes.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));

            if (route) {
                openModal(route);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this administration route?")) {
                return;
            }

            const result = await deleteAdministrationRoute(btn.getAttribute("data-id"));

            if (!result.success) {
                showToast(result.message || "Failed to delete administration route.", "error");
                return;
            }

            showToast("Administration route deleted successfully.", "success");
            await loadAdministrationRoutes(openModal);
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No routes yet" : "No matching routes";
    const message = noneAtAll
        ? "Create your first administration route to start recording medications and immunizations."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="3" class="ar-empty-state">
                <div class="ar-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path></svg>
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
