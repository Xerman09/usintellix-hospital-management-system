import { showToast } from "../../core/toast.js";
import { fetchFormDefinitions, saveFormDefinitions } from "./forms-administration.service.js";
import { ACCESS_CONTROL_GROUPS } from "./forms-administration.view.js";

export async function initFormsAdministration()
{
    document.getElementById("faSaveBtn").addEventListener("click", handleSave);

    await loadOverview();
}

async function loadOverview()
{
    const registeredBody = document.getElementById("faRegisteredBody");
    const unregisteredBody = document.getElementById("faUnregisteredBody");

    const result = await fetchFormDefinitions();

    if (!result.success) {
        registeredBody.innerHTML = `<tr><td colspan="9" class="fa-loading">${escapeHtml(result.message || "Failed to load forms.")}</td></tr>`;
        unregisteredBody.innerHTML = "";
        return;
    }

    renderRegistered(result.data.registered || []);
    renderUnregistered(result.data.unregistered || []);
}

function renderRegistered(rows)
{
    const tbody = document.getElementById("faRegisteredBody");
    document.getElementById("faAlert").innerHTML = "";

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="fa-empty">No registered forms.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr data-id="${row.id}">
            <td class="fa-id-cell">${row.id}</td>
            <td class="fa-name-cell">${escapeHtml(row.name)}</td>
            <td class="${row.status === 'enabled' ? 'fa-status-enabled' : 'fa-status-disabled'}">${escapeHtml(row.status)}</td>
            <td class="fa-meta-cell">${row.php_extracted ? "PHP extracted" : "-"}</td>
            <td class="fa-meta-cell">${row.db_installed ? "DB installed" : "-"}</td>
            <td><input type="number" class="fa-priority-input" data-field="priority" value="${Number(row.priority) || 0}"></td>
            <td><input type="text" class="fa-text-input" data-field="category" value="${escapeHtml(row.category || "")}"></td>
            <td><input type="text" class="fa-text-input" data-field="nickname" value="${escapeHtml(row.nickname || "")}"></td>
            <td>${renderAclSelect(row.access_control)}</td>
        </tr>
    `).join("");
}

function renderUnregistered(rows)
{
    const tbody = document.getElementById("faUnregisteredBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td class="fa-empty">Nothing unregistered.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td class="fa-name-cell">${escapeHtml(row.name)}${row.marketplace ? '<span class="fa-cloud-icon" title="Available via marketplace">&#9729;</span>' : ""}</td>
            <td><a class="fa-register-link" data-register="${escapeHtml(row.name)}">register</a></td>
            <td class="fa-meta-cell">PHP extracted</td>
            <td class="fa-meta-cell">n/a</td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-register]").forEach((link) => {
        link.addEventListener("click", () => {
            showToast(`${link.dataset.register} is not available in this system yet.`, "error");
        });
    });
}

function renderAclSelect(currentValue)
{
    const groupsHtml = ACCESS_CONTROL_GROUPS.map((group) => `
        <optgroup label="${escapeHtml(group.label)}">
            ${group.options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === currentValue ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </optgroup>
    `).join("");

    return `<select class="fa-acl-select" data-field="access_control"><option value="">-- None --</option>${groupsHtml}</select>`;
}

async function handleSave()
{
    const saveBtn = document.getElementById("faSaveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const rows = [...document.querySelectorAll("#faRegisteredBody tr[data-id]")].map((row) => ({
        id: Number(row.dataset.id),
        priority: Number(row.querySelector('[data-field="priority"]').value) || 0,
        category: row.querySelector('[data-field="category"]').value.trim(),
        nickname: row.querySelector('[data-field="nickname"]').value.trim() || null,
        access_control: row.querySelector('[data-field="access_control"]').value || null
    }));

    const result = await saveFormDefinitions(rows);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save";

    if (!result.success) {
        document.getElementById("faAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save.")}</div>`;
        showToast(result.message || "Failed to save Forms Administration settings.", "error");
        return;
    }

    showToast("Forms Administration settings saved successfully.", "success");
    await loadOverview();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
