import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchProcedureOrderConfigs,
    createProcedureOrderConfig,
    updateProcedureOrderConfig,
    deleteProcedureOrderConfig
} from "./procedure-order-configs.service.js";

const TIER_LABELS = {
    group: "Group",
    procedure_order: "Procedure Order",
    discrete_result: "Discrete Result",
    recommendation: "Recommendation",
    custom_favorite_group: "Custom Favorite Group",
    custom_favorite_item: "Custom Favorite Item"
};

// OpenEMR's own "Add Mode" dropdown lists every tier regardless of
// context (top-level or nested) -- invalid combinations are caught by
// the backend's nesting validation at save time instead of being
// filtered out of the picker.
const ALL_TIERS = Object.keys(TIER_LABELS);

// Mirrors the backend's ALLOWED_PARENT_TIERS, inverted: which tiers may
// be added as a child of a node of the given tier.
const ALLOWED_CHILD_TIERS = {
    group: ["group", "procedure_order"],
    procedure_order: ["discrete_result", "recommendation"],
    discrete_result: [],
    recommendation: [],
    custom_favorite_group: ["custom_favorite_item"],
    custom_favorite_item: []
};

// Which extra (tier-specific) fields show for each tier. name/description/
// sequence are common to every tier and always shown.
const FIELDS_BY_TIER = {
    group: [],
    procedure_order: ["order_test_type", "order_from", "identifying_code", "standard_code", "body_site", "specimen_type", "administer_via", "laterality"],
    discrete_result: ["identifying_code", "default_units", "default_range"],
    recommendation: ["identifying_code", "default_units", "default_range"],
    custom_favorite_group: ["order_from", "identifying_code"],
    custom_favorite_item: ["order_from", "identifying_code", "standard_code", "body_site", "specimen_type", "administer_via", "laterality"]
};

const ALL_EXTRA_FIELDS = ["order_test_type", "order_from", "identifying_code", "standard_code", "body_site", "specimen_type", "administer_via", "laterality", "default_units", "default_range"];
const COMMON_FIELDS = ["name", "description", "sequence"];
const DROPDOWN_FIELDS = ["order_test_type", "order_from", "body_site", "specimen_type", "administer_via", "laterality", "default_units"];
const OTHER_VALUE = "__other__";

let items = [];
let dropdownOptions = {};
let expanded = new Set();
let onSelectItem = null;

// options.onSelect, when provided, turns this into a picker: each row's
// name becomes clickable and invokes onSelect(item) instead of doing
// nothing -- used when this tree is embedded inside another page (e.g.
// Batch Results' "Procedure" field) rather than opened as its own tab.
// Everything else (Add Top Level, Edit, Add child, Delete) still works
// exactly as it does on the standalone page.
export async function initProcedureOrderConfigs(options = {})
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    onSelectItem = options.onSelect || null;

    const modalOverlay = document.getElementById("pocModalOverlay");
    const modalTitle = document.getElementById("pocModalTitle");
    const parentNote = document.getElementById("pocModalParentNote");
    const parentNameEl = document.getElementById("pocModalParentName");
    const saveBtn = document.getElementById("pocSaveBtn");
    const deleteBtn = document.getElementById("pocDeleteBtn");
    const idInput = document.getElementById("poc_id");
    const parentIdInput = document.getElementById("poc_parent_id");
    const tierSelect = document.getElementById("poc_procedure_tier");
    const form = document.getElementById("pocForm");

    tierSelect.addEventListener("change", () => applyFieldVisibility(tierSelect.value));

    const openModal = ({ item = null, parentId = null } = {}) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
        form.reset();

        DROPDOWN_FIELDS.forEach((field) => {
            const otherInput = document.getElementById(`poc_${field}_other`);

            if (otherInput) {
                otherInput.style.display = "none";
            }
        });

        if (item) {
            modalTitle.textContent = `Edit ${TIER_LABELS[item.procedure_tier] || "Item"}`;
            saveBtn.textContent = "Save Changes";
            deleteBtn.style.display = "";
            idInput.value = item.id;
            parentIdInput.value = item.parent_id ?? "";

            populateTierSelect([item.procedure_tier]);
            tierSelect.value = item.procedure_tier;
            tierSelect.disabled = true;

            document.getElementById("poc_name").value = item.name ?? "";
            document.getElementById("poc_description").value = item.description ?? "";
            document.getElementById("poc_sequence").value = item.sequence ?? 0;

            ALL_EXTRA_FIELDS.forEach((field) => {
                const el = document.getElementById(`poc_${field}`);

                if (!el) return;

                if (DROPDOWN_FIELDS.includes(field)) {
                    setDropdownValue(field, item[field] ?? "");
                } else {
                    el.value = item[field] ?? "";
                }
            });

            const parent = item.parent_id ? items.find((row) => row.id === item.parent_id) : null;

            if (parent) {
                parentNameEl.textContent = parent.name;
                parentNote.style.display = "";
            } else {
                parentNote.style.display = "none";
            }

            applyFieldVisibility(item.procedure_tier);
        } else if (parentId) {
            const parent = items.find((row) => row.id === parentId);

            modalTitle.textContent = "Add Child Item";
            saveBtn.textContent = "Add Item";
            deleteBtn.style.display = "none";
            idInput.value = "";
            parentIdInput.value = parentId;
            parentNameEl.textContent = parent ? parent.name : "";
            parentNote.style.display = "";

            populateTierSelect(ALL_TIERS, { blank: true });
            tierSelect.disabled = false;
            document.getElementById("poc_sequence").value = 0;
            applyFieldVisibility(tierSelect.value);
        } else {
            modalTitle.textContent = "Add Top Level Item";
            saveBtn.textContent = "Add Item";
            deleteBtn.style.display = "none";
            idInput.value = "";
            parentIdInput.value = "";
            parentNote.style.display = "none";

            populateTierSelect(ALL_TIERS, { blank: true });
            tierSelect.disabled = false;
            document.getElementById("poc_sequence").value = 0;
            applyFieldVisibility(tierSelect.value);
        }

        modalOverlay.classList.add("open");
    };

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        idInput.value = "";
        parentIdInput.value = "";
        tierSelect.disabled = false;
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("pocAddTopLevelBtn").addEventListener("click", () => openModal());
    document.getElementById("pocRefreshBtn").addEventListener("click", () => loadItems(openModal));
    document.getElementById("pocModalClose").addEventListener("click", closeModal);
    document.getElementById("pocCancelBtn").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    deleteBtn.addEventListener("click", async () => {
        const id = idInput.value;

        if (!id || !confirm("Delete this item and everything nested under it?")) {
            return;
        }

        const result = await deleteProcedureOrderConfig(id);

        if (!result.success) {
            showToast(result.message || "Failed to delete item.", "error");
            return;
        }

        closeModal();
        showToast("Item deleted successfully.", "success");
        await loadItems(openModal);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors();

        const data = {
            procedure_tier: tierSelect.value
        };

        [...COMMON_FIELDS, ...ALL_EXTRA_FIELDS].forEach((field) => {
            const el = document.getElementById(`poc_${field}`);

            if (!el) return;

            const value = DROPDOWN_FIELDS.includes(field) ? getDropdownValue(field) : el.value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const editingId = idInput.value;

        if (!editingId && parentIdInput.value) {
            data.parent_id = parentIdInput.value;
        }

        const result = editingId
            ? await updateProcedureOrderConfig(editingId, data)
            : await createProcedureOrderConfig(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save item.", "error");

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

        if (!editingId && parentIdInput.value) {
            expanded.add(Number(parentIdInput.value));
        }

        closeModal();
        showToast(editingId ? "Item updated successfully." : "Item added successfully.", "success");
        await loadItems(openModal);
    });

    await loadItems(openModal);
}

function populateTierSelect(allowedTiers, { blank = false } = {})
{
    const select = document.getElementById("poc_procedure_tier");

    const blankOption = blank ? `<option value="" selected>Select...</option>` : "";

    select.innerHTML = blankOption
        + allowedTiers.map((tier) => `<option value="${tier}">${TIER_LABELS[tier]}</option>`).join("");
}

function applyFieldVisibility(tier)
{
    const extraFields = FIELDS_BY_TIER[tier] || [];

    ALL_EXTRA_FIELDS.forEach((field) => {
        const group = document.querySelector(`[data-field-group="${field}"]`);

        if (group) {
            group.style.display = extraFields.includes(field) ? "" : "none";
        }
    });
}

async function loadItems(openModal)
{
    const result = await fetchProcedureOrderConfigs();

    if (result.success) {
        items = (result.data.items || []).map((row) => ({
            ...row,
            id: Number(row.id),
            parent_id: row.parent_id ? Number(row.parent_id) : null
        }));
        dropdownOptions = result.data.options || {};
        populateDropdownOptions();
    } else {
        items = [];
    }

    render(openModal);
}

function setDropdownValue(field, value)
{
    const select = document.getElementById(`poc_${field}`);
    const otherInput = document.getElementById(`poc_${field}_other`);
    const knownOptions = dropdownOptions[field] || [];

    if (!select) return;

    if (value && !knownOptions.includes(value)) {
        select.value = OTHER_VALUE;

        if (otherInput) {
            otherInput.style.display = "";
            otherInput.value = value;
        }
    } else {
        select.value = value;

        if (otherInput) {
            otherInput.style.display = "none";
            otherInput.value = "";
        }
    }
}

function getDropdownValue(field)
{
    const select = document.getElementById(`poc_${field}`);

    if (!select) return "";

    if (select.value === OTHER_VALUE) {
        const otherInput = document.getElementById(`poc_${field}_other`);

        return otherInput ? otherInput.value.trim() : "";
    }

    return select.value;
}

function populateDropdownOptions()
{
    DROPDOWN_FIELDS.forEach((field) => {
        const select = document.getElementById(`poc_${field}`);
        const otherInput = document.getElementById(`poc_${field}_other`);

        if (!select) return;

        const options = dropdownOptions[field] || [];

        select.innerHTML = `<option value="">Select...</option>`
            + options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")
            + `<option value="${OTHER_VALUE}">Other</option>`;

        if (otherInput && !select.dataset.otherWired) {
            select.dataset.otherWired = "true";
            select.addEventListener("change", () => {
                const showOther = select.value === OTHER_VALUE;

                otherInput.style.display = showOther ? "" : "none";

                if (!showOther) {
                    otherInput.value = "";
                }
            });
        }
    });
}

function buildTree()
{
    const byParent = new Map();

    items.forEach((item) => {
        const key = item.parent_id ?? "root";

        if (!byParent.has(key)) {
            byParent.set(key, []);
        }

        byParent.get(key).push(item);
    });

    byParent.forEach((rows) => rows.sort((a, b) => (a.sequence - b.sequence) || a.name.localeCompare(b.name)));

    return byParent;
}

function render(openModal)
{
    const tbody = document.getElementById("pocTableBody");
    const countText = document.getElementById("pocCountText");

    if (!tbody || !countText) {
        return;
    }

    countText.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;

    if (!items.length) {
        tbody.innerHTML = renderEmptyState();
        return;
    }

    const byParent = buildTree();
    const rows = [];

    const walk = (parentKey, depth) => {
        const children = byParent.get(parentKey) || [];

        children.forEach((item) => {
            const hasChildren = byParent.has(item.id);

            rows.push(renderRow(item, depth, hasChildren));

            if (hasChildren && expanded.has(item.id)) {
                walk(item.id, depth + 1);
            }
        });
    };

    walk("root", 0);

    tbody.innerHTML = rows.join("");

    tbody.querySelectorAll("[data-toggle-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = Number(btn.getAttribute("data-toggle-id"));

            if (expanded.has(id)) {
                expanded.delete(id);
            } else {
                expanded.add(id);
            }

            render(openModal);
        });
    });

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const item = items.find((row) => row.id === Number(btn.getAttribute("data-edit-id")));

            if (item && openModal) {
                openModal({ item });
            }
        });
    });

    tbody.querySelectorAll("[data-add-child-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const parentId = Number(btn.getAttribute("data-add-child-id"));

            if (openModal) {
                openModal({ parentId });
            }
        });
    });

    if (onSelectItem) {
        tbody.querySelectorAll("[data-select-id]").forEach((el) => {
            el.addEventListener("click", () => {
                const item = items.find((row) => row.id === Number(el.getAttribute("data-select-id")));

                if (item) {
                    onSelectItem(item);
                }
            });
        });
    }
}

function renderRow(item, depth, hasChildren)
{
    const isExpanded = expanded.has(item.id);
    const indent = depth * 22;
    const canHaveChildren = (ALLOWED_CHILD_TIERS[item.procedure_tier] || []).length > 0;

    const toggle = hasChildren
        ? `<button type="button" class="poc-toggle${isExpanded ? " expanded" : ""}" data-toggle-id="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
          </button>`
        : `<span class="poc-toggle-spacer"></span>`;

    const details = buildDetailsSummary(item);
    const nameAttrs = onSelectItem ? `class="poc-name poc-name--selectable" data-select-id="${item.id}"` : `class="poc-name"`;

    return `
        <tr>
            <td>
                <div class="poc-name-cell" style="padding-left: ${indent}px;">
                    ${toggle}
                    <span ${nameAttrs}>${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="poc-muted">${TIER_LABELS[item.procedure_tier] || item.procedure_tier}</td>
            <td class="poc-muted">${item.sequence ?? 0}</td>
            <td class="poc-muted ${details === "No details" ? "empty" : ""}">${escapeHtml(details)}</td>
            <td>
                <div class="poc-row-actions">
                    <button type="button" class="poc-icon-btn edit" data-edit-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    ${canHaveChildren ? `
                    <button type="button" class="poc-icon-btn add-child" data-add-child-id="${item.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                        Add
                    </button>` : ""}
                </div>
            </td>
        </tr>
    `;
}

function buildDetailsSummary(item)
{
    const labels = {
        order_test_type: "Type",
        order_from: "From",
        identifying_code: "Code",
        standard_code: "LOINC",
        body_site: "Site",
        specimen_type: "Specimen",
        administer_via: "Via",
        laterality: "Laterality",
        default_units: "Units",
        default_range: "Range"
    };

    const parts = [];

    if (item.description) {
        parts.push(item.description);
    }

    ALL_EXTRA_FIELDS.forEach((field) => {
        if (item[field]) {
            parts.push(`${labels[field]}: ${item[field]}`);
        }
    });

    return parts.join(" · ") || "No details";
}

function renderEmptyState()
{
    return `
        <tr>
            <td colspan="5" class="poc-empty-state">
                <div class="poc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
                </div>
                <strong>No order/result items yet</strong>
                <p>Click "Add Top Level" to start building the tree.</p>
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
    [...COMMON_FIELDS, ...ALL_EXTRA_FIELDS, "procedure_tier"].forEach((field) => {
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
