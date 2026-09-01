import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import {
    fetchDocumentCategories,
    createDocumentCategory,
    updateDocumentCategory,
    deleteDocumentCategory
} from "./document-categories.service.js";

const ACCESS_CONTROL_OPTIONS = [
    "Documents (write,addonly optional)",
    "Patients (write)",
    "Patients (read)",
    "Admin (write)"
];
const OTHER_VALUE = "__other__";

let categories = [];
let expanded = new Set();

export async function initDocumentCategories()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    expanded = new Set();

    await loadCategories();
}

async function loadCategories()
{
    const result = await fetchDocumentCategories();

    if (!result.success) {
        document.getElementById("dcTree").innerHTML = `<p class="dc-form-empty">${escapeHtml(result.message || "Failed to load categories.")}</p>`;
        return;
    }

    categories = result.data || [];

    const root = categories.find((c) => c.parent_id === null);

    if (root) {
        expanded.add(root.id);
    }

    renderTree();
}

function renderTree()
{
    const container = document.getElementById("dcTree");
    const roots = categories.filter((c) => c.parent_id === null);

    container.innerHTML = `<ul>${roots.map((node) => renderNode(node)).join("")}</ul>`;

    wireTreeEvents();
}

function renderNode(node)
{
    const children = categories.filter((c) => c.parent_id === node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(node.id);

    const toggle = hasChildren
        ? `<button type="button" class="dc-toggle" data-toggle-id="${node.id}">${isExpanded ? "&minus;" : "+"}</button>`
        : `<span class="dc-toggle-spacer"></span>`;

    const childrenHtml = hasChildren && isExpanded
        ? `<ul>${children.map((child) => renderNode(child)).join("")}</ul>`
        : "";

    return `
        <li>
            <div class="dc-node">
                ${toggle}
                <svg class="dc-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"></path></svg>
                <button type="button" class="dc-name-link" data-add-under="${node.id}">${escapeHtml(node.name)}</button>
                <button type="button" class="dc-node-action edit" data-edit-id="${node.id}">(Edit)</button>
                <button type="button" class="dc-node-action delete" data-delete-id="${node.id}">(Delete)</button>
            </div>
            ${childrenHtml}
        </li>
    `;
}

function wireTreeEvents()
{
    document.querySelectorAll("[data-toggle-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.toggleId);

            if (expanded.has(id)) {
                expanded.delete(id);
            } else {
                expanded.add(id);
            }

            renderTree();
        });
    });

    document.querySelectorAll("[data-add-under]").forEach((btn) => {
        btn.addEventListener("click", () => renderAddForm(Number(btn.dataset.addUnder)));
    });

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => renderEditForm(Number(btn.dataset.editId)));
    });

    document.querySelectorAll("[data-delete-id]").forEach((btn) => {
        btn.addEventListener("click", () => handleDelete(Number(btn.dataset.deleteId)));
    });
}

function renderAddForm(parentId)
{
    const parent = categories.find((c) => c.id === parentId);
    const formCol = document.getElementById("dcFormCol");

    document.getElementById("dcFormAlert").innerHTML = "";

    formCol.innerHTML = `
        <p class="dc-form-intro">This new category will be a sub-category of <strong>${escapeHtml(parent.name)}</strong></p>
        <form id="dcAddForm">
            ${fieldsHtml("dcadd_")}
            <div class="dc-form-actions">
                <button type="submit" class="dc-save-btn primary">Save Category</button>
            </div>
        </form>
    `;

    wireAccessControlOther("dcadd_");

    document.getElementById("dcAddForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = collectFields("dcadd_");
        data.parent_id = parentId;

        const result = await createDocumentCategory(data);

        if (!result.success) {
            showAlert(result.message || "Failed to add category.", result.errors);
            return;
        }

        expanded.add(parentId);
        showToast("Category added successfully.", "success");
        formCol.innerHTML = `<p class="dc-form-empty">Click a category name to add a sub-category, or (Edit) to change it.</p>`;
        await loadCategories();
    });
}

function renderEditForm(id)
{
    const category = categories.find((c) => c.id === id);
    const formCol = document.getElementById("dcFormCol");

    document.getElementById("dcFormAlert").innerHTML = "";

    formCol.innerHTML = `
        <p class="dc-form-intro">Editing <strong>${escapeHtml(category.name)}</strong></p>
        <form id="dcEditForm">
            ${fieldsHtml("dcedit_", category)}
            <div class="dc-form-actions">
                <button type="submit" class="dc-save-btn primary">Save Category</button>
                <button type="button" class="dc-save-btn" id="dcEditCancelBtn">Cancel</button>
            </div>
        </form>
    `;

    wireAccessControlOther("dcedit_", category.access_control);

    document.getElementById("dcEditCancelBtn").addEventListener("click", () => {
        formCol.innerHTML = `<p class="dc-form-empty">Click a category name to add a sub-category, or (Edit) to change it.</p>`;
    });

    document.getElementById("dcEditForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = collectFields("dcedit_");
        const result = await updateDocumentCategory(id, data);

        if (!result.success) {
            showAlert(result.message || "Failed to update category.", result.errors);
            return;
        }

        showToast("Category updated successfully.", "success");
        formCol.innerHTML = `<p class="dc-form-empty">Click a category name to add a sub-category, or (Edit) to change it.</p>`;
        await loadCategories();
    });
}

function fieldsHtml(prefix, category = null)
{
    return `
        <div class="dc-form-row">
            <label>Category Name</label>
            <input id="${prefix}name" class="form-input" value="${escapeAttr(category?.name)}">
        </div>
        <div class="dc-form-row">
            <label>Value</label>
            <input id="${prefix}value" class="form-input" value="${escapeAttr(category?.value)}">
        </div>
        <div class="dc-form-row">
            <label>Access Control</label>
            <select id="${prefix}access_control" class="form-input">
                <option value="">-- None --</option>
                ${ACCESS_CONTROL_OPTIONS.map((opt) => `<option value="${escapeAttr(opt)}">${escapeHtml(opt)}</option>`).join("")}
                <option value="${OTHER_VALUE}">Other</option>
            </select>
            <input id="${prefix}access_control_other" class="form-input" placeholder="Enter custom value" style="display:none; margin-top: 8px;">
        </div>
        <div class="dc-form-row">
            <label>Codes</label>
            <input id="${prefix}codes" class="form-input" value="${escapeAttr(category?.codes)}">
        </div>
    `;
}

function wireAccessControlOther(prefix, currentValue = null)
{
    const select = document.getElementById(`${prefix}access_control`);
    const otherInput = document.getElementById(`${prefix}access_control_other`);

    if (currentValue) {
        if (ACCESS_CONTROL_OPTIONS.includes(currentValue)) {
            select.value = currentValue;
        } else {
            select.value = OTHER_VALUE;
            otherInput.value = currentValue;
            otherInput.style.display = "";
        }
    }

    select.addEventListener("change", () => {
        otherInput.style.display = select.value === OTHER_VALUE ? "" : "none";
    });
}

function collectFields(prefix)
{
    const accessSelect = document.getElementById(`${prefix}access_control`).value;
    const accessOther = document.getElementById(`${prefix}access_control_other`).value.trim();

    return {
        name: document.getElementById(`${prefix}name`).value.trim(),
        value: document.getElementById(`${prefix}value`).value.trim() || null,
        access_control: accessSelect === OTHER_VALUE ? (accessOther || null) : (accessSelect || null),
        codes: document.getElementById(`${prefix}codes`).value.trim() || null
    };
}

async function handleDelete(id)
{
    const category = categories.find((c) => c.id === id);
    const hasChildren = categories.some((c) => c.parent_id === id);

    const confirmMessage = hasChildren
        ? `Delete "${category.name}" and every sub-category nested under it?`
        : `Delete "${category.name}"?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    const result = await deleteDocumentCategory(id);

    if (!result.success) {
        showToast(result.message || "Failed to delete category.", "error");
        return;
    }

    showToast("Category deleted successfully.", "success");
    document.getElementById("dcFormCol").innerHTML = `<p class="dc-form-empty">Click a category name to add a sub-category, or (Edit) to change it.</p>`;
    await loadCategories();
}

function showAlert(message, errors)
{
    const detail = errors ? Object.values(errors).filter(Boolean).join(" ") : "";
    document.getElementById("dcFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(detail || message)}</div>`;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function escapeAttr(value)
{
    return escapeHtml(value ?? "");
}
