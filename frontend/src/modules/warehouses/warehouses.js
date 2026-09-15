import { fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "./warehouses.service.js";
import { showToast } from "../../core/toast.js";

let facilities = [];
let warehouses = [];

export async function initWarehouses() {
    const overlay = document.getElementById("whModalOverlay");
    const form = document.getElementById("whForm");

    document.getElementById("whAddBtn").addEventListener("click", () => openModal(null));
    document.getElementById("whCloseModal").addEventListener("click", closeModal);
    document.getElementById("whCancelBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeModal(); });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveWarehouse();
    });

    await loadWarehouses();
}

async function loadWarehouses() {
    const tbody = document.getElementById("whTableBody");
    tbody.innerHTML = `<tr><td colspan="5" class="wh-empty-state">Loading...</td></tr>`;

    const result = await fetchWarehouses();

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="5" class="wh-empty-state">Failed to load warehouses.</td></tr>`;
        return;
    }

    warehouses = result.data.warehouses || [];
    facilities = result.data.facilities || [];

    populateFacilitySelect();
    renderTable();
}

function populateFacilitySelect() {
    const select = document.getElementById("wh_facility_id");
    const current = select.value;

    select.innerHTML = `<option value="">N/A</option>` + facilities.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");
    select.value = current;
}

function renderTable() {
    const tbody = document.getElementById("whTableBody");

    if (!warehouses.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="wh-empty-state">No warehouses yet -- click "Add Warehouse" to create one.</td></tr>`;
        return;
    }

    tbody.innerHTML = warehouses.map((w) => `
        <tr>
            <td>${escapeHtml(w.name)}</td>
            <td>${escapeHtml(w.facility_name || "N/A")}</td>
            <td><span class="status-badge ${w.is_active ? "completed" : "cancelled"}">${w.is_active ? "Active" : "Inactive"}</span></td>
            <td>${w.lot_count}</td>
            <td>
                <div class="wh-actions">
                    <button type="button" class="wh-icon-btn edit" data-edit-id="${w.id}">Edit</button>
                    <button type="button" class="wh-icon-btn delete" data-delete-id="${w.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const warehouse = warehouses.find((w) => w.id === Number(btn.getAttribute("data-edit-id")));
            if (warehouse) openModal(warehouse);
        });
    });

    tbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
        btn.addEventListener("click", () => removeWarehouse(Number(btn.getAttribute("data-delete-id"))));
    });
}

function openModal(warehouse) {
    document.getElementById("whFormAlert").innerHTML = "";
    document.querySelectorAll("#whForm .form-error").forEach((el) => { el.textContent = ""; });

    document.getElementById("whModalTitle").textContent = warehouse ? "Edit Warehouse" : "Add Warehouse";
    document.getElementById("wh_id").value = warehouse ? warehouse.id : "";
    document.getElementById("wh_name").value = warehouse ? warehouse.name : "";
    document.getElementById("wh_facility_id").value = warehouse && warehouse.facility_id ? warehouse.facility_id : "";

    const activeRow = document.getElementById("whActiveRow");

    if (warehouse) {
        activeRow.style.display = "flex";
        document.getElementById("wh_is_active").checked = !!warehouse.is_active;
    } else {
        activeRow.style.display = "none";
    }

    document.getElementById("whModalOverlay").classList.add("open");
}

function closeModal() {
    document.getElementById("whModalOverlay").classList.remove("open");
}

async function saveWarehouse() {
    document.getElementById("whFormAlert").innerHTML = "";
    document.querySelectorAll("#whForm .form-error").forEach((el) => { el.textContent = ""; });

    const id = document.getElementById("wh_id").value;
    const details = {
        name: document.getElementById("wh_name").value.trim(),
        facility_id: document.getElementById("wh_facility_id").value
    };

    if (id) {
        details.is_active = document.getElementById("wh_is_active").checked;
    }

    const result = id ? await updateWarehouse(Number(id), details) : await createWarehouse(details);

    if (!result.success) {
        const hasFieldErrors = result.errors && Object.keys(result.errors).length > 0;

        showAlert("whFormAlert", hasFieldErrors ? Object.values(result.errors).join(" ") : (result.message || "Failed to save the warehouse."), "error");

        if (hasFieldErrors) {
            Object.entries(result.errors).forEach(([field, message]) => {
                const el = document.getElementById(`err-wh_${field}`);
                if (el) el.textContent = message;
            });
        }

        return;
    }

    closeModal();
    showToast(result.message || "Saved.", "success");
    await loadWarehouses();
}

async function removeWarehouse(id) {
    if (!confirm("Delete this warehouse? Any existing lots stay on record, but it will no longer appear in the Add Drug / Transfer pickers.")) {
        return;
    }

    const result = await deleteWarehouse(id);

    if (!result.success) {
        showToast(result.message || "Failed to delete the warehouse.", "error");
        return;
    }

    showToast(result.message || "Deleted.", "success");
    await loadWarehouses();
}

function showAlert(containerId, message, type) {
    document.getElementById(containerId).innerHTML = `<div class="form-alert ${type}">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
