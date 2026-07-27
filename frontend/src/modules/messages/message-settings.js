import { getUser } from "../../core/session.js";
import {
    fetchMessageTypes, createMessageType, updateMessageType, deleteMessageType,
    fetchMessageStatuses, createMessageStatus, updateMessageStatus, deleteMessageStatus
} from "./messages.service.js";

const CATALOGS = {
    types: {
        label: "Message Type",
        fetch: fetchMessageTypes,
        create: createMessageType,
        update: updateMessageType,
        remove: deleteMessageType,
        tbodyId: "messageTypesTableBody",
        countTextId: "typesCountText",
        searchId: "typesSearch",
        searchClearId: "typesSearchClear",
        addBtnId: "openAddTypeModal"
    },
    statuses: {
        label: "Message Status",
        fetch: fetchMessageStatuses,
        create: createMessageStatus,
        update: updateMessageStatus,
        remove: deleteMessageStatus,
        tbodyId: "messageStatusesTableBody",
        countTextId: "statusesCountText",
        searchId: "statusesSearch",
        searchClearId: "statusesSearchClear",
        addBtnId: "openAddStatusModal"
    }
};

const state = {
    types: { items: [], search: "" },
    statuses: { items: [], search: "" }
};

export async function initMessageSettings()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    setupModal();
    setupCatalog("types");
    setupCatalog("statuses");

    await Promise.all([
        loadCatalog("types"),
        loadCatalog("statuses")
    ]);
}

function setupCatalog(key)
{
    const cfg = CATALOGS[key];
    const searchInput = document.getElementById(cfg.searchId);
    const searchClear = document.getElementById(cfg.searchClearId);

    document.getElementById(cfg.addBtnId).addEventListener("click", () => openModal(key, null));

    searchInput.addEventListener("input", () => {
        state[key].search = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        renderCatalog(key);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        state[key].search = "";
        searchClear.classList.remove("show");
        renderCatalog(key);
        searchInput.focus();
    });
}

function setupModal()
{
    const overlay = document.getElementById("catalogEntryModalOverlay");
    const form = document.getElementById("catalogEntryForm");

    document.getElementById("closeCatalogEntryModal").addEventListener("click", closeModal);
    document.getElementById("cancelCatalogEntry").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-name").textContent = "";

        const key = document.getElementById("catalog_entry_kind").value;
        const id = document.getElementById("catalog_entry_id").value;
        const name = document.getElementById("catalog_entry_name").value.trim();

        if (!name) {
            document.getElementById("err-name").textContent = "Name is required.";
            return;
        }

        const cfg = CATALOGS[key];
        const result = id
            ? await cfg.update(id, { name })
            : await cfg.create({ name });

        if (!result.success) {
            showAlert(result.message || `Failed to save ${cfg.label.toLowerCase()}.`, "error");

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
        showListAlert(`${cfg.label} ${id ? "updated" : "added"} successfully.`, "success");
        await loadCatalog(key);
    });
}

function openModal(key, item)
{
    const cfg = CATALOGS[key];

    document.getElementById("formAlert").innerHTML = "";
    document.getElementById("err-name").textContent = "";
    document.getElementById("catalog_entry_kind").value = key;

    if (item) {
        document.getElementById("catalogEntryModalTitle").textContent = `Edit ${cfg.label}`;
        document.getElementById("saveCatalogEntryBtn").textContent = "Save Changes";
        document.getElementById("catalog_entry_id").value = item.id;
        document.getElementById("catalog_entry_name").value = item.name;
    } else {
        document.getElementById("catalogEntryModalTitle").textContent = `Add ${cfg.label}`;
        document.getElementById("saveCatalogEntryBtn").textContent = "Add";
        document.getElementById("catalog_entry_id").value = "";
        document.getElementById("catalog_entry_name").value = "";
    }

    document.getElementById("catalogEntryModalOverlay").classList.add("open");
}

function closeModal()
{
    document.getElementById("catalogEntryModalOverlay").classList.remove("open");
}

async function loadCatalog(key)
{
    const cfg = CATALOGS[key];
    const result = await cfg.fetch();

    state[key].items = result.success ? result.data : [];

    renderCatalog(key);
}

function renderCatalog(key)
{
    const cfg = CATALOGS[key];
    const tbody = document.getElementById(cfg.tbodyId);
    const countText = document.getElementById(cfg.countTextId);
    const items = state[key].items;
    const search = state[key].search;

    countText.textContent = `${items.length} ${items.length === 1 ? "entry" : "entries"}`;

    const filtered = search
        ? items.filter((item) => item.name.toLowerCase().includes(search))
        : items;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="table-empty">${items.length === 0 ? "No entries yet." : "No matching entries."}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>
                <div class="mts-row-actions">
                    <button class="btn-edit" data-edit-id="${item.id}">Edit</button>
                    <button class="btn-danger" data-id="${item.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = items.find((entry) => String(entry.id) === btn.getAttribute("data-edit-id"));

            if (item) {
                openModal(key, item);
            }
        });
    });

    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm(`Delete this ${cfg.label.toLowerCase()}?`)) {
                return;
            }

            const result = await cfg.remove(btn.getAttribute("data-id"));

            if (!result.success) {
                showListAlert(result.message || `Failed to delete ${cfg.label.toLowerCase()}.`, "error");
                return;
            }

            showListAlert(`${cfg.label} deleted successfully.`, "success");
            await loadCatalog(key);
        });
    });
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
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
