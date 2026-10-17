import { getUser } from "../../core/session.js?v=5";
import { showToast } from "../../core/toast.js";
import {
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchPermissionsMatrix,
    saveRolePermissions
} from "./role-management.service.js";

const FIELDS = ["name", "description"];

let roles = [];
let matrixData = null; // { modules: {}, roles: [], matrix: {} }
let localMatrix = {};  // roleId -> Set<string> of capability keys
let searchTerm = "";
let matrixSearchTerm = "";
let selectedSubsystemFilter = "";

// State for single-role permissions modal
let currentPermRoleId = null;
let currentPermSelectedCaps = new Set();
let permSearchTerm = "";

const ICONS = {
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>`,
    'user-check': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`,
    'file-text': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    pill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>`,
    activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    'dollar-sign': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
    'bar-chart-2': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
};

export async function initRoleManagement()
{
    const user = getUser();

    if (!user || !["admin"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";
    matrixSearchTerm = "";
    selectedSubsystemFilter = "";

    // DOM Elements - Basic Role Modal
    const roleModalOverlay = document.getElementById("roleModalOverlay");
    const roleModalTitle = document.getElementById("roleModalTitle");
    const saveRoleBtn = document.getElementById("saveRoleBtn");
    const idInput = document.getElementById("role_id");
    const form = document.getElementById("roleForm");
    const searchInput = document.getElementById("roleSearch");
    const searchClear = document.getElementById("roleSearchClear");

    // DOM Elements - View Switcher
    const tabBtnDirectory = document.getElementById("tabBtnDirectory");
    const tabBtnMatrix = document.getElementById("tabBtnMatrix");
    const viewDirectory = document.getElementById("viewDirectory");
    const viewMatrix = document.getElementById("viewMatrix");

    // DOM Elements - Matrix View
    const matrixSubsystemFilter = document.getElementById("matrixSubsystemFilter");
    const matrixSearch = document.getElementById("matrixSearch");
    const matrixSaveAllBtn = document.getElementById("matrixSaveAllBtn");

    // DOM Elements - Single Role Permissions Modal
    const permModalOverlay = document.getElementById("permissionsModalOverlay");
    const closePermModalBtn = document.getElementById("closePermModal");
    const cancelPermModalBtn = document.getElementById("cancelPermModal");
    const saveRolePermsBtn = document.getElementById("saveRolePermsBtn");
    const permSearchInput = document.getElementById("permSearchInput");
    const btnSelectAllCaps = document.getElementById("btnSelectAllCaps");
    const btnClearAllCaps = document.getElementById("btnClearAllCaps");

    // Tab Navigation
    tabBtnDirectory.addEventListener("click", () => {
        tabBtnDirectory.classList.add("active");
        tabBtnDirectory.setAttribute("aria-selected", "true");
        tabBtnMatrix.classList.remove("active");
        tabBtnMatrix.setAttribute("aria-selected", "false");
        viewDirectory.style.display = "block";
        viewMatrix.style.display = "none";
    });

    tabBtnMatrix.addEventListener("click", () => {
        tabBtnMatrix.classList.add("active");
        tabBtnMatrix.setAttribute("aria-selected", "true");
        tabBtnDirectory.classList.remove("active");
        tabBtnDirectory.setAttribute("aria-selected", "false");
        viewMatrix.style.display = "block";
        viewDirectory.style.display = "none";
        renderMatrixView();
    });

    // Role Basic Info Modal
    const openBasicModal = (role) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (role) {
            roleModalTitle.textContent = "Edit Role";
            saveRoleBtn.textContent = "Save Changes";
            idInput.value = role.id;
            document.getElementById("name").value = role.name ?? "";
            document.getElementById("description").value = role.description ?? "";
        } else {
            roleModalTitle.textContent = "Add Role";
            saveRoleBtn.textContent = "Create Role";
            idInput.value = "";
            form.reset();
        }

        roleModalOverlay.classList.add("open");
    };

    const closeBasicModal = () => {
        roleModalOverlay.classList.remove("open");
        form.reset();
        idInput.value = "";
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddRoleModal").addEventListener("click", () => openBasicModal(null));
    document.getElementById("closeRoleModal").addEventListener("click", closeBasicModal);
    document.getElementById("cancelRole").addEventListener("click", closeBasicModal);
    roleModalOverlay.addEventListener("click", (e) => {
        if (e.target === roleModalOverlay) closeBasicModal();
    });

    // Search in Directory
    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        renderDirectoryRows(openBasicModal);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchTerm = "";
        searchClear.classList.remove("show");
        renderDirectoryRows(openBasicModal);
        searchInput.focus();
    });

    // Save Basic Role Info
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearErrors();

        const data = {};
        FIELDS.forEach((field) => {
            const val = document.getElementById(field).value.trim();
            if (val !== "") data[field] = val;
        });

        const editingId = idInput.value;
        const result = editingId
            ? await updateRole(editingId, data)
            : await createRole(data);

        if (!result.success) {
            showAlert(result.message || "Failed to save role.", "error");
            if (result.errors) {
                Object.entries(result.errors).forEach(([field, msg]) => {
                    const el = document.getElementById(`err-${field}`);
                    if (el) el.textContent = msg;
                });
            }
            return;
        }

        closeBasicModal();
        showToast(editingId ? "Role updated successfully." : "Role created successfully.", "success");
        await loadAllData(openBasicModal);
    });

    // Matrix Filters
    matrixSubsystemFilter.addEventListener("change", () => {
        selectedSubsystemFilter = matrixSubsystemFilter.value;
        renderMatrixView();
    });

    matrixSearch.addEventListener("input", () => {
        matrixSearchTerm = matrixSearch.value.trim().toLowerCase();
        renderMatrixView();
    });

    // Save Matrix All Changes
    matrixSaveAllBtn.addEventListener("click", async () => {
        matrixSaveAllBtn.disabled = true;
        matrixSaveAllBtn.textContent = "Saving Changes...";

        try {
            const updates = [];
            for (const r of roles) {
                if (r.name === 'admin') continue; // admin always has full access
                const roleId = r.id;
                const caps = Array.from(localMatrix[roleId] || []);
                updates.push(saveRolePermissions(roleId, caps));
            }

            const results = await Promise.all(updates);
            const anyFailed = results.some(res => !res.success);

            if (anyFailed) {
                showToast("Some permissions could not be updated.", "error");
            } else {
                showToast("Matrix permissions updated successfully across all roles.", "success");
            }

            await loadAllData(openBasicModal);
            renderMatrixView();
        } catch (err) {
            showToast("Failed to save matrix changes: " + err.message, "error");
        } finally {
            matrixSaveAllBtn.disabled = false;
            matrixSaveAllBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save Matrix Changes
            `;
        }
    });

    // Permissions Modal Events
    closePermModalBtn.addEventListener("click", () => permModalOverlay.classList.remove("open"));
    cancelPermModalBtn.addEventListener("click", () => permModalOverlay.classList.remove("open"));
    permModalOverlay.addEventListener("click", (e) => {
        if (e.target === permModalOverlay) permModalOverlay.classList.remove("open");
    });

    permSearchInput.addEventListener("input", () => {
        permSearchTerm = permSearchInput.value.trim().toLowerCase();
        renderPermModalSubsystems();
    });

    btnSelectAllCaps.addEventListener("click", () => {
        if (!matrixData || !matrixData.modules) return;
        Object.values(matrixData.modules).forEach(mod => {
            Object.keys(mod.capabilities).forEach(cap => currentPermSelectedCaps.add(cap));
        });
        renderPermModalSubsystems();
    });

    btnClearAllCaps.addEventListener("click", () => {
        currentPermSelectedCaps.clear();
        renderPermModalSubsystems();
    });

    saveRolePermsBtn.addEventListener("click", async () => {
        if (!currentPermRoleId) return;
        saveRolePermsBtn.disabled = true;
        saveRolePermsBtn.textContent = "Saving...";

        const result = await saveRolePermissions(currentPermRoleId, Array.from(currentPermSelectedCaps));
        saveRolePermsBtn.disabled = false;
        saveRolePermsBtn.textContent = "Save Permissions";

        if (!result.success) {
            showToast(result.message || "Failed to save permissions.", "error");
            return;
        }

        permModalOverlay.classList.remove("open");
        showToast("Role permissions updated successfully.", "success");
        await loadAllData(openBasicModal);
        renderMatrixView();
    });

    // Initial load
    await loadAllData(openBasicModal);
}

async function loadAllData(openBasicModal)
{
    const [rolesRes, matrixRes] = await Promise.all([
        fetchRoles(),
        fetchPermissionsMatrix()
    ]);

    roles = rolesRes.success ? rolesRes.data : [];
    if (matrixRes.success) {
        matrixData = matrixRes.data;
        // Build localMatrix sets
        localMatrix = {};
        for (const [rId, caps] of Object.entries(matrixData.matrix || {})) {
            localMatrix[rId] = new Set(caps);
        }
    }

    renderDirectoryRows(openBasicModal);
}

function getTotalCapabilitiesCount()
{
    if (!matrixData || !matrixData.modules) return 53;
    let total = 0;
    Object.values(matrixData.modules).forEach(mod => {
        total += Object.keys(mod.capabilities || {}).length;
    });
    return total;
}

function renderDirectoryRows(openBasicModal)
{
    const tbody = document.getElementById("rolesTableBody");
    const countText = document.getElementById("roleCountText");
    const totalCaps = getTotalCapabilitiesCount();

    countText.textContent = `${roles.length} ${roles.length === 1 ? "role" : "roles"}`;

    const filtered = searchTerm
        ? roles.filter((role) =>
            role.name.toLowerCase().includes(searchTerm) ||
            (role.description ?? "").toLowerCase().includes(searchTerm))
        : roles;

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="vc-empty-state">
                    <div class="vc-empty-icon">
                        ${ICONS.shield}
                    </div>
                    <strong>${roles.length === 0 ? "No roles defined yet" : "No matching roles found"}</strong>
                    <p>${roles.length === 0 ? "Create your first role to start assigning access levels." : "Try adjusting your search criteria."}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map((role) => {
        const isAdmin = role.name === 'admin';
        const grantedCount = isAdmin ? totalCaps : (localMatrix[role.id]?.size || 0);

        return `
        <tr>
            <td>
                <div class="vc-name-cell">
                    <div class="vc-avatar">${escapeHtml((role.name || "?").charAt(0).toUpperCase())}</div>
                    <div>
                        <span class="vc-name">${escapeHtml(role.name)}</span>
                        ${isAdmin ? '<span class="vc-badge-admin">Superuser</span>' : ''}
                    </div>
                </div>
            </td>
            <td class="vc-description ${role.description ? "" : "empty"}">
                ${escapeHtml(role.description || "No description provided")}
            </td>
            <td>
                <button type="button" class="vc-perm-count-badge ${isAdmin ? 'super' : ''}" data-open-perm="${role.id}" style="cursor: pointer; border: none;">
                    ${ICONS.lock}
                    <span>${isAdmin ? 'All Capabilities (Superuser)' : `${grantedCount} / ${totalCaps} Capabilities`}</span>
                </button>
            </td>
            <td>
                <div class="vc-actions">
                    <button class="vc-icon-btn permissions" data-open-perm="${role.id}" title="Configure dynamic capabilities for this role">
                        ${ICONS.lock}
                        Permissions
                    </button>
                    <button class="vc-icon-btn edit" data-edit-id="${role.id}" title="Edit role metadata">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit
                    </button>
                    ${!isAdmin ? `
                    <button class="vc-icon-btn delete" data-id="${role.id}" title="Delete role">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                        Delete
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join("");

    // Wire Edit Buttons
    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const role = roles.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));
            if (role) openBasicModal(role);
        });
    });

    // Wire Permissions Buttons
    tbody.querySelectorAll("[data-open-perm]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const roleId = parseInt(btn.getAttribute("data-open-perm"), 10);
            openPermissionsModal(roleId);
        });
    });

    // Wire Delete Buttons
    tbody.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const role = roles.find(r => String(r.id) === btn.getAttribute("data-id"));
            if (!confirm(`Are you sure you want to remove the role "${role?.name || ''}"? This will delete all capability mappings.`)) {
                return;
            }

            const result = await deleteRole(btn.getAttribute("data-id"));
            if (!result.success) {
                showToast(result.message || "Failed to delete role.", "error");
                return;
            }

            showToast("Role deleted successfully.", "success");
            await loadAllData(openBasicModal);
        });
    });
}

function renderMatrixView()
{
    if (!matrixData || !matrixData.modules) return;

    const thead = document.getElementById("matrixHead");
    const tbody = document.getElementById("matrixBody");

    // Header Row
    let headHtml = `
        <tr>
            <th class="col-capability">Subsystem & Capability</th>
    `;
    roles.forEach(r => {
        const isAdmin = r.name === 'admin';
        headHtml += `
            <th class="col-role" title="${escapeHtml(r.description || r.name)}">
                <div style="font-weight: 700; color: #1e293b;">${escapeHtml(r.name)}</div>
                ${isAdmin ? '<div style="font-size: 10px; color: #92400e;">SUPERUSER</div>' : `
                    <div style="margin-top: 4px;">
                        <button type="button" class="vc-btn-ghost-toggle" data-matrix-toggle-role="${r.id}" style="font-size: 10px; padding: 2px 6px;">
                            Toggle All
                        </button>
                    </div>
                `}
            </th>
        `;
    });
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // Filter modules
    const modulesToRender = [];
    Object.entries(matrixData.modules).forEach(([modKey, modData]) => {
        if (selectedSubsystemFilter && selectedSubsystemFilter !== modKey) return;
        
        // Filter capabilities by search term
        const matchingCaps = Object.entries(modData.capabilities).filter(([capKey, capData]) => {
            if (!matrixSearchTerm) return true;
            return capKey.toLowerCase().includes(matrixSearchTerm) ||
                   capData.label.toLowerCase().includes(matrixSearchTerm) ||
                   capData.description.toLowerCase().includes(matrixSearchTerm);
        });

        if (matchingCaps.length > 0) {
            modulesToRender.push({
                key: modKey,
                data: modData,
                capabilities: matchingCaps
            });
        }
    });

    if (modulesToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${roles.length + 1}" style="text-align: center; padding: 40px; color: #64748b;">
                    No capabilities match the selected subsystem and search term.
                </td>
            </tr>
        `;
        return;
    }

    let bodyHtml = "";
    modulesToRender.forEach(mod => {
        const iconSvg = ICONS[mod.data.icon] || ICONS.shield;
        // Subsystem section header row
        bodyHtml += `
            <tr class="vc-matrix-subsystem-row">
                <td colspan="${roles.length + 1}">
                    <div class="vc-matrix-subsystem-header">
                        ${iconSvg}
                        <span>${escapeHtml(mod.data.title)}</span>
                        <span style="font-size: 11px; font-weight: normal; color: #64748b; text-transform: none; margin-left: 6px;">
                            (${mod.capabilities.length} capabilities)
                        </span>
                    </div>
                </td>
            </tr>
        `;

        // Capability rows
        mod.capabilities.forEach(([capKey, capData]) => {
            bodyHtml += `
                <tr>
                    <td class="col-capability">
                        <span class="vc-cap-title">${escapeHtml(capData.label)}</span>
                        <span class="vc-cap-desc">${escapeHtml(capData.description)}</span>
                        <span class="vc-cap-code">${escapeHtml(capKey)}</span>
                    </td>
            `;

            roles.forEach(r => {
                const isAdmin = r.name === 'admin';
                const isChecked = isAdmin || (localMatrix[r.id]?.has(capKey) ?? false);

                bodyHtml += `
                    <td class="vc-matrix-check-cell">
                        <input type="checkbox" class="vc-checkbox" 
                            data-role="${r.id}" 
                            data-cap="${capKey}" 
                            ${isChecked ? 'checked' : ''} 
                            ${isAdmin ? 'disabled title="Superusers possess all capabilities"' : ''}
                        >
                    </td>
                `;
            });

            bodyHtml += `</tr>`;
        });
    });

    tbody.innerHTML = bodyHtml;

    // Wire matrix checkboxes
    tbody.querySelectorAll('input.vc-checkbox[data-role]').forEach(chk => {
        chk.addEventListener("change", () => {
            const roleId = parseInt(chk.getAttribute("data-role"), 10);
            const cap = chk.getAttribute("data-cap");
            if (!localMatrix[roleId]) localMatrix[roleId] = new Set();

            if (chk.checked) {
                localMatrix[roleId].add(cap);
            } else {
                localMatrix[roleId].delete(cap);
            }
        });
    });

    // Wire column "Toggle All" in matrix header
    thead.querySelectorAll("[data-matrix-toggle-role]").forEach(btn => {
        btn.addEventListener("click", () => {
            const roleId = parseInt(btn.getAttribute("data-matrix-toggle-role"), 10);
            if (!localMatrix[roleId]) localMatrix[roleId] = new Set();

            // Collect all visible capabilities in the view
            const visibleCaps = [];
            modulesToRender.forEach(mod => {
                mod.capabilities.forEach(([capKey]) => visibleCaps.push(capKey));
            });

            const allActive = visibleCaps.every(cap => localMatrix[roleId].has(cap));
            visibleCaps.forEach(cap => {
                if (allActive) {
                    localMatrix[roleId].delete(cap);
                } else {
                    localMatrix[roleId].add(cap);
                }
            });

            renderMatrixView();
        });
    });
}

// Single-Role Permissions Modal
function openPermissionsModal(roleId)
{
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    currentPermRoleId = roleId;
    const isAdmin = role.name === 'admin';

    // Copy current permissions to local Set
    if (isAdmin) {
        currentPermSelectedCaps = new Set();
        if (matrixData && matrixData.modules) {
            Object.values(matrixData.modules).forEach(mod => {
                Object.keys(mod.capabilities).forEach(cap => currentPermSelectedCaps.add(cap));
            });
        }
    } else {
        currentPermSelectedCaps = new Set(localMatrix[roleId] || []);
    }

    permSearchTerm = "";
    document.getElementById("permSearchInput").value = "";

    document.getElementById("permModalRoleName").textContent = `Permissions: ${role.name.toUpperCase()}`;
    document.getElementById("permModalRoleDesc").textContent = role.description || "Configure granular subsystem capabilities granted to this role";

    const saveBtn = document.getElementById("saveRolePermsBtn");
    const selectAllBtn = document.getElementById("btnSelectAllCaps");
    const clearAllBtn = document.getElementById("btnClearAllCaps");

    if (isAdmin) {
        saveBtn.disabled = true;
        saveBtn.title = "Admin superuser permissions are fixed with unconditional system-wide access";
        selectAllBtn.disabled = true;
        clearAllBtn.disabled = true;
    } else {
        saveBtn.disabled = false;
        saveBtn.title = "";
        selectAllBtn.disabled = false;
        clearAllBtn.disabled = false;
    }

    renderPermModalSubsystems();
    document.getElementById("permissionsModalOverlay").classList.add("open");
}

function renderPermModalSubsystems()
{
    if (!matrixData || !matrixData.modules) return;

    const container = document.getElementById("permSubsystemsContainer");
    const totalCaps = getTotalCapabilitiesCount();
    const role = roles.find(r => r.id === currentPermRoleId);
    const isAdmin = role?.name === 'admin';

    document.getElementById("permTotalSelectedText").textContent =
        `${currentPermSelectedCaps.size} of ${totalCaps} capabilities selected`;

    let html = "";
    Object.entries(matrixData.modules).forEach(([modKey, modData]) => {
        const iconSvg = ICONS[modData.icon] || ICONS.shield;
        
        // Filter capabilities
        const matchingCaps = Object.entries(modData.capabilities).filter(([capKey, capData]) => {
            if (!permSearchTerm) return true;
            return capKey.toLowerCase().includes(permSearchTerm) ||
                   capData.label.toLowerCase().includes(permSearchTerm) ||
                   capData.description.toLowerCase().includes(permSearchTerm);
        });

        if (matchingCaps.length === 0) return;

        const allModCaps = Object.keys(modData.capabilities);
        const grantedModCaps = allModCaps.filter(c => currentPermSelectedCaps.has(c));
        const allModActive = allModCaps.length > 0 && allModCaps.length === grantedModCaps.length;

        html += `
            <div class="vc-subsystem-card" data-subsystem="${modKey}">
                <div class="vc-subsystem-head">
                    <div class="vc-subsystem-info">
                        <div class="vc-subsystem-icon">
                            ${iconSvg}
                        </div>
                        <div>
                            <h3 class="vc-subsystem-title">${escapeHtml(modData.title)}</h3>
                            <p class="vc-subsystem-meta">${escapeHtml(modData.description)}</p>
                        </div>
                    </div>
                    <div class="vc-subsystem-actions">
                        <span class="vc-badge-counter">${grantedModCaps.length} / ${allModCaps.length}</span>
                        ${!isAdmin ? `
                            <button type="button" class="vc-btn-ghost-toggle" data-toggle-subsystem="${modKey}">
                                ${allModActive ? 'Revoke All' : 'Grant All'}
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="vc-cap-grid">
                    ${matchingCaps.map(([capKey, capData]) => {
                        const isChecked = currentPermSelectedCaps.has(capKey);
                        return `
                            <label class="vc-cap-item ${isChecked ? 'active' : ''}">
                                <input type="checkbox" 
                                    data-cap-key="${capKey}" 
                                    ${isChecked ? 'checked' : ''}
                                    ${isAdmin ? 'disabled' : ''}
                                >
                                <div class="vc-cap-text">
                                    <span class="vc-cap-title">${escapeHtml(capData.label)}</span>
                                    <span class="vc-cap-desc">${escapeHtml(capData.description)}</span>
                                    <span class="vc-cap-code">${escapeHtml(capKey)}</span>
                                </div>
                            </label>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    });

    if (html === "") {
        html = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                No capabilities match "${escapeHtml(permSearchTerm)}".
            </div>
        `;
    }

    container.innerHTML = html;

    if (isAdmin) return;

    // Wire capability item clicks
    container.querySelectorAll("input[data-cap-key]").forEach(chk => {
        chk.addEventListener("change", (e) => {
            const capKey = chk.getAttribute("data-cap-key");
            if (chk.checked) {
                currentPermSelectedCaps.add(capKey);
            } else {
                currentPermSelectedCaps.delete(capKey);
            }
            renderPermModalSubsystems();
        });
    });

    // Wire Subsystem "Grant All / Revoke All"
    container.querySelectorAll("[data-toggle-subsystem]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modKey = btn.getAttribute("data-toggle-subsystem");
            const modData = matrixData.modules[modKey];
            if (!modData) return;

            const modCaps = Object.keys(modData.capabilities);
            const allGranted = modCaps.every(c => currentPermSelectedCaps.has(c));

            modCaps.forEach(c => {
                if (allGranted) {
                    currentPermSelectedCaps.delete(c);
                } else {
                    currentPermSelectedCaps.add(c);
                }
            });

            renderPermModalSubsystems();
        });
    });
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
        if (errorEl) errorEl.textContent = "";
    });
}

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-${type === 'error' ? 'danger' : 'success'}" style="margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; background: ${type === 'error' ? '#fee2e2' : '#dcfce7'}; color: ${type === 'error' ? '#991b1b' : '#166534'};">
            ${escapeHtml(message)}
        </div>
    `;
}
