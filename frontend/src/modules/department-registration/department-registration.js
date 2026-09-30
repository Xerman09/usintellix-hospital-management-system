import { showToast } from "../../core/toast.js";
import {
    fetchDepartments,
    fetchDepartmentStats,
    fetchDepartmentOptions,
    fetchDepartmentStaff,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "./department-registration.service.js";

let departmentsData = [];
let currentViewMode = "table";

export async function initDepartmentRegistration() {
    const searchInput = document.getElementById("deptSearchInput");
    const searchClear = document.getElementById("deptSearchClear");
    const typeFilter = document.getElementById("deptTypeFilter");
    const statusFilter = document.getElementById("deptStatusFilter");
    const facilityFilter = document.getElementById("deptFacilityFilter");

    const viewTableBtn = document.getElementById("deptViewTableBtn");
    const viewGridBtn = document.getElementById("deptViewGridBtn");
    const openCreateBtn = document.getElementById("deptOpenCreateBtn");

    // Form Modal
    const formModal = document.getElementById("deptFormModal");
    const closeFormModalBtn = document.getElementById("deptCloseFormModal");
    const cancelFormBtn = document.getElementById("deptCancelFormBtn");
    const saveDeptBtn = document.getElementById("deptSaveBtn");
    const form = document.getElementById("departmentForm");

    // Staff Modal
    const staffModal = document.getElementById("deptStaffModal");
    const closeStaffModalBtn = document.getElementById("deptCloseStaffModal");
    const closeStaffBtn = document.getElementById("deptCloseStaffBtn");

    // 1. Initial Load of Stats, Options, and Departments
    await Promise.all([
        loadStats(),
        loadOptions(),
        loadDepartments()
    ]);

    // 2. View Mode Toggling
    if (viewTableBtn && viewGridBtn) {
        viewTableBtn.addEventListener("click", () => {
            currentViewMode = "table";
            viewTableBtn.classList.add("active");
            viewGridBtn.classList.remove("active");
            document.getElementById("deptTableView").style.display = "block";
            document.getElementById("deptGridView").style.display = "none";
        });

        viewGridBtn.addEventListener("click", () => {
            currentViewMode = "grid";
            viewGridBtn.classList.add("active");
            viewTableBtn.classList.remove("active");
            document.getElementById("deptTableView").style.display = "none";
            document.getElementById("deptGridView").style.display = "grid";
            renderDepartments(departmentsData);
        });
    }

    // 3. Search and Filtering
    let debounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (searchInput.value.trim().length > 0) {
                searchClear.classList.add("show");
            } else {
                searchClear.classList.remove("show");
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applyFilters();
            }, 250);
        });
    }

    if (searchClear) {
        searchClear.addEventListener("click", () => {
            searchInput.value = "";
            searchClear.classList.remove("show");
            applyFilters();
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener("change", applyFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener("change", applyFilters);
    }
    if (facilityFilter) {
        facilityFilter.addEventListener("change", applyFilters);
    }

    // 4. Open Modal for Create
    if (openCreateBtn) {
        openCreateBtn.addEventListener("click", () => {
            openCreateModal();
        });
    }

    // Modal Close buttons
    if (closeFormModalBtn) closeFormModalBtn.addEventListener("click", closeFormModal);
    if (cancelFormBtn) cancelFormBtn.addEventListener("click", closeFormModal);

    if (formModal) {
        formModal.addEventListener("click", (e) => {
            if (e.target === formModal) closeFormModal();
        });
    }

    if (closeStaffModalBtn) closeStaffModalBtn.addEventListener("click", closeStaffModal);
    if (closeStaffBtn) closeStaffBtn.addEventListener("click", closeStaffModal);

    if (staffModal) {
        staffModal.addEventListener("click", (e) => {
            if (e.target === staffModal) closeStaffModal();
        });
    }

    // 5. Save Department Handler
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            handleSaveDepartment();
        });
    } else if (saveDeptBtn) {
        saveDeptBtn.addEventListener("click", handleSaveDepartment);
    }
}

// =========================================================================
// Data Loading
// =========================================================================

async function loadStats() {
    try {
        const res = await fetchDepartmentStats();
        if (res.status === "success" && res.data) {
            const stats = res.data;
            const elTotal = document.getElementById("statTotalDepts");
            const elActive = document.getElementById("statActiveDepts");
            const elClinical = document.getElementById("statClinicalDepts");
            const elStaff = document.getElementById("statAssignedStaff");

            if (elTotal) elTotal.textContent = stats.total_departments ?? 0;
            if (elActive) elActive.textContent = stats.active_departments ?? 0;
            if (elClinical) elClinical.textContent = stats.clinical_departments ?? 0;
            if (elStaff) elStaff.textContent = stats.total_assigned_staff ?? 0;
        }
    } catch (err) {
        console.error("Failed to load department stats:", err);
    }
}

async function loadOptions() {
    try {
        const res = await fetchDepartmentOptions();
        if (res.status === "success" && res.data) {
            const { facilities, employees } = res.data;

            // Facility Filter in Toolbar
            const facilityFilter = document.getElementById("deptFacilityFilter");
            if (facilityFilter && facilities) {
                facilityFilter.innerHTML = '<option value="all">All Facilities</option>';
                facilities.forEach(fac => {
                    const opt = document.createElement("option");
                    opt.value = fac.id;
                    opt.textContent = fac.name;
                    facilityFilter.appendChild(opt);
                });
            }

            // Facility Select in Form
            const formFacility = document.getElementById("dept_facility");
            if (formFacility && facilities) {
                formFacility.innerHTML = '<option value="">-- Main Facility / General --</option>';
                facilities.forEach(fac => {
                    const opt = document.createElement("option");
                    opt.value = fac.id;
                    opt.textContent = fac.name;
                    formFacility.appendChild(opt);
                });
            }

            // Head of Department Select in Form
            const formHead = document.getElementById("dept_head");
            if (formHead && Array.isArray(employees)) {
                formHead.innerHTML = '<option value="">-- Select Assigned HOD --</option>';
                employees.forEach(emp => {
                    const opt = document.createElement("option");
                    opt.value = emp.id;
                    const displayName = emp.full_name || emp.name || emp.username || `Staff #${emp.employee_no || emp.id}`;
                    const roleSuffix = emp.user_role ? ` (${emp.user_role.charAt(0).toUpperCase() + emp.user_role.slice(1)})` : '';
                    opt.textContent = `${displayName}${roleSuffix}`;
                    formHead.appendChild(opt);
                });
            }
        }
    } catch (err) {
        console.error("Failed to load department options:", err);
    }
}

async function loadDepartments(filters = {}) {
    const tableBody = document.getElementById("deptTableBody");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 32px;">
                    <span style="color: var(--text-muted, #94a3b8);">Loading departments...</span>
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetchDepartments(filters);
        if (res.status === "success" && Array.isArray(res.data)) {
            departmentsData = res.data;
            renderDepartments(departmentsData);
        } else {
            departmentsData = [];
            renderDepartments([]);
        }
    } catch (err) {
        console.error("Failed to load departments:", err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 32px; color: #ef4444;">
                        Failed to load departments. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

function applyFilters() {
    const keyword = document.getElementById("deptSearchInput")?.value.trim() || "";
    const type = document.getElementById("deptTypeFilter")?.value || "all";
    const status = document.getElementById("deptStatusFilter")?.value || "all";
    const facility_id = document.getElementById("deptFacilityFilter")?.value || "all";

    loadDepartments({
        keyword,
        type,
        status,
        facility_id
    });
}

// =========================================================================
// Rendering Views
// =========================================================================

function renderDepartments(departments) {
    renderTableView(departments);
    renderGridView(departments);
}

function renderTableView(departments) {
    const tableBody = document.getElementById("deptTableBody");
    if (!tableBody) return;

    if (!departments || departments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 36px 20px; color: #71809b;">
                    No departments found matching your criteria.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = departments.map(dept => {
        const initials = (dept.code || dept.name.substring(0, 3)).toUpperCase();
        const typeClass = (dept.type || '').toLowerCase().replace(/[^a-z]/g, '');
        const statusClass = (dept.status || 'active').toLowerCase();

        return `
            <tr data-id="${dept.id}">
                <td>
                    <div class="dept-name-cell">
                        <div class="dept-avatar">${escapeHtml(initials.substring(0, 3))}</div>
                        <div>
                            <div class="dept-name-title">${escapeHtml(dept.name)}</div>
                            <span class="dept-code-tag">${escapeHtml(dept.code || 'NO-CODE')}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="dept-pill-badge ${typeClass}">
                        ${escapeHtml(dept.type || 'Clinical')}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(dept.facility_name || 'Main Facility')}</div>
                    <div style="font-size: 12px; color: #71809b;">${escapeHtml(dept.location || 'Central Campus')}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(dept.head_name || 'Unassigned')}</div>
                    ${dept.head_email ? `<div style="font-size: 12px; color: #71809b;">${escapeHtml(dept.head_email)}</div>` : ''}
                </td>
                <td>
                    <div style="font-size: 13px;">${escapeHtml(dept.operating_hours || '24/7')}</div>
                    ${dept.phone ? `<div style="font-size: 12px; color: #71809b;">${escapeHtml(dept.phone)}</div>` : ''}
                </td>
                <td>
                    <button type="button" class="dept-pill-badge" style="background: var(--accent-light); color: var(--accent); border: none; cursor: pointer;" onclick="window.deptViewStaff(${dept.id})">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        ${dept.staff_count} Staff
                    </button>
                </td>
                <td>
                    <span class="dept-pill-badge ${statusClass}">
                        ${dept.status ? dept.status.charAt(0).toUpperCase() + dept.status.slice(1) : 'Active'}
                    </span>
                </td>
                <td>
                    <div class="dept-actions">
                        <button type="button" class="dept-btn-icon" title="View Staff Roster" onclick="window.deptViewStaff(${dept.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </button>
                        <button type="button" class="dept-btn-icon" title="Edit Department" onclick="window.deptEdit(${dept.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button type="button" class="dept-btn-icon delete" title="Delete Department" onclick="window.deptDelete(${dept.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function renderGridView(departments) {
    const gridContainer = document.getElementById("deptGridView");
    if (!gridContainer) return;

    if (!departments || departments.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; color: #71809b;">
                No departments found matching your criteria.
            </div>
        `;
        return;
    }

    gridContainer.innerHTML = departments.map(dept => {
        const initials = (dept.code || dept.name.substring(0, 3)).toUpperCase();
        const typeClass = (dept.type || '').toLowerCase().replace(/[^a-z]/g, '');
        const statusClass = (dept.status || 'active').toLowerCase();

        return `
            <div class="dept-card-item">
                <div>
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                        <div class="dept-name-cell">
                            <div class="dept-avatar">${escapeHtml(initials.substring(0, 3))}</div>
                            <div>
                                <div class="dept-name-title">${escapeHtml(dept.name)}</div>
                                <span class="dept-code-tag">${escapeHtml(dept.code || 'NO-CODE')}</span>
                            </div>
                        </div>
                        <span class="dept-pill-badge ${statusClass}">
                            ${dept.status ? dept.status.charAt(0).toUpperCase() + dept.status.slice(1) : 'Active'}
                        </span>
                    </div>

                    <div style="margin-bottom: 14px;">
                        <span class="dept-pill-badge ${typeClass}">
                            ${escapeHtml(dept.type || 'Clinical')}
                        </span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #71809b; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8; flex-shrink: 0;">
                                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"></path>
                            </svg>
                            <span>${escapeHtml(dept.facility_name || 'Main Facility')} - ${escapeHtml(dept.location || 'Central Campus')}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8; flex-shrink: 0;">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>HOD: <strong>${escapeHtml(dept.head_name || 'Unassigned')}</strong></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8; flex-shrink: 0;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${escapeHtml(dept.operating_hours || '24/7')}</span>
                        </div>
                        ${dept.phone ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8; flex-shrink: 0;">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span>${escapeHtml(dept.phone)}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid #eef1f7;">
                    <button type="button" class="dept-pill-badge" style="background: var(--accent-light); color: var(--accent); border: none; cursor: pointer;" onclick="window.deptViewStaff(${dept.id})">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        ${dept.staff_count} Staff
                    </button>
                    <div class="dept-actions">
                        <button type="button" class="dept-btn-icon" title="Edit Department" onclick="window.deptEdit(${dept.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button type="button" class="dept-btn-icon delete" title="Delete Department" onclick="window.deptDelete(${dept.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// =========================================================================
// Form & Modal Management
// =========================================================================

function openCreateModal() {
    clearForm();
    const modalTitle = document.getElementById("deptModalTitle");
    if (modalTitle) {
        modalTitle.textContent = "Register Department";
    }
    const modal = document.getElementById("deptFormModal");
    if (modal) modal.classList.add("open");
}

function openEditModal(dept) {
    clearForm();
    const modalTitle = document.getElementById("deptModalTitle");
    if (modalTitle) {
        modalTitle.textContent = `Edit Department: ${dept.name}`;
    }

    document.getElementById("dept_id").value = dept.id;
    document.getElementById("dept_name").value = dept.name || "";
    document.getElementById("dept_code").value = dept.code || "";
    document.getElementById("dept_type").value = dept.type || "Clinical";
    document.getElementById("dept_facility").value = dept.facility_id || "";
    document.getElementById("dept_head").value = dept.head_of_department_id || "";
    document.getElementById("dept_status").value = dept.status || "active";
    document.getElementById("dept_phone").value = dept.phone || "";
    document.getElementById("dept_email").value = dept.email || "";
    document.getElementById("dept_location").value = dept.location || "";
    document.getElementById("dept_hours").value = dept.operating_hours || "24/7";
    document.getElementById("dept_description").value = dept.description || "";

    const modal = document.getElementById("deptFormModal");
    if (modal) modal.classList.add("open");
}

function closeFormModal() {
    const modal = document.getElementById("deptFormModal");
    if (modal) modal.classList.remove("open");
    clearForm();
}

function clearForm() {
    const form = document.getElementById("departmentForm");
    if (form) form.reset();
    const idInput = document.getElementById("dept_id");
    if (idInput) idInput.value = "";
    document.querySelectorAll(".form-error").forEach(el => {
        el.textContent = "";
    });
    const alertEl = document.getElementById("deptFormAlert");
    if (alertEl) alertEl.innerHTML = "";
}

function closeStaffModal() {
    const modal = document.getElementById("deptStaffModal");
    if (modal) modal.classList.remove("open");
}

async function handleSaveDepartment() {
    const id = document.getElementById("dept_id")?.value;
    const name = document.getElementById("dept_name")?.value.trim() || "";
    const code = document.getElementById("dept_code")?.value.trim() || "";
    const type = document.getElementById("dept_type")?.value || "Clinical";
    const facility_id = document.getElementById("dept_facility")?.value;
    const head_of_department_id = document.getElementById("dept_head")?.value;
    const status = document.getElementById("dept_status")?.value || "active";
    const phone = document.getElementById("dept_phone")?.value.trim() || "";
    const email = document.getElementById("dept_email")?.value.trim() || "";
    const location = document.getElementById("dept_location")?.value.trim() || "";
    const operating_hours = document.getElementById("dept_hours")?.value.trim() || "24/7";
    const description = document.getElementById("dept_description")?.value.trim() || "";

    // Clear previous errors
    document.querySelectorAll(".form-error").forEach(el => {
        el.textContent = "";
    });
    const alertEl = document.getElementById("deptFormAlert");
    if (alertEl) alertEl.innerHTML = "";

    if (!name) {
        showFieldError("err-dept_name", "Department name is required.");
        return;
    }

    const payload = {
        name,
        code,
        type,
        facility_id: facility_id ? parseInt(facility_id) : null,
        head_of_department_id: head_of_department_id ? parseInt(head_of_department_id) : null,
        status,
        phone,
        email,
        location,
        operating_hours,
        description
    };

    const saveBtn = document.getElementById("deptSaveBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    try {
        let res;
        if (id) {
            res = await updateDepartment(id, payload);
        } else {
            res = await createDepartment(payload);
        }

        if (res.status === "success" || res.success) {
            showToast(res.message || (id ? "Department updated successfully." : "Department created successfully."), "success");
            closeFormModal();
            await Promise.all([
                loadStats(),
                loadDepartments()
            ]);
        } else {
            if (res.errors) {
                if (res.errors.name) showFieldError("err-dept_name", res.errors.name);
                if (res.errors.code) showFieldError("err-dept_code", res.errors.code);
            }
            if (alertEl) {
                alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(res.message || "Failed to save department.")}</div>`;
            }
            showToast(res.message || "Failed to save department.", "error");
        }
    } catch (err) {
        console.error("Error saving department:", err);
        if (alertEl) {
            alertEl.innerHTML = `<div class="form-alert error">${escapeHtml(err.message || "An error occurred while saving the department.")}</div>`;
        }
        showToast(err.message || "An error occurred while saving the department.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = id ? "Save Changes" : "Save Department";
        }
    }
}

function showFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
    }
}

// =========================================================================
// Global Actions (Wired to window for easy onclick in templates)
// =========================================================================

window.deptEdit = function(id) {
    const dept = departmentsData.find(d => parseInt(d.id) === parseInt(id));
    if (dept) {
        openEditModal(dept);
    }
};

window.deptDelete = async function(id) {
    const dept = departmentsData.find(d => parseInt(d.id) === parseInt(id));
    if (!dept) return;

    if (parseInt(dept.staff_count) > 0) {
        showToast(`Cannot delete "${dept.name}": It has ${dept.staff_count} active assigned personnel. Reassign staff members before deleting.`, "error");
        return;
    }

    if (!confirm(`Are you sure you want to delete the department "${dept.name}" (${dept.code || 'NO-CODE'})? This action can be undone only by database administrators.`)) {
        return;
    }

    try {
        const res = await deleteDepartment(id);
        if (res.status === "success" || res.success) {
            showToast(res.message || "Department deleted successfully.", "success");
            await Promise.all([
                loadStats(),
                loadDepartments()
            ]);
        } else {
            showToast(res.message || "Failed to delete department.", "error");
        }
    } catch (err) {
        console.error("Error deleting department:", err);
        showToast(err.message || "Error deleting department.", "error");
    }
};

window.deptViewStaff = async function(id) {
    const modal = document.getElementById("deptStaffModal");
    const title = document.getElementById("deptStaffModalTitle");
    const tbody = document.getElementById("deptStaffTableBody");

    if (modal) modal.classList.add("open");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted, #94a3b8);">
                    Loading roster...
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetchDepartmentStaff(id);
        if (res.status === "success" && res.data) {
            const { department, staff } = res.data;
            if (title) {
                title.textContent = `${department.name} - Personnel Roster (${staff.length})`;
            }

            if (!staff || staff.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 28px 16px; color: #71809b;">
                            No active staff members currently assigned to this department.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = staff.map(emp => {
                const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                const hipaaBadge = emp.hipaa_training_status === 'compliant'
                    ? '<span class="dept-pill-badge active">Compliant</span>'
                    : '<span class="dept-pill-badge maintenance">Pending</span>';

                return `
                    <tr>
                        <td style="font-weight: 600; color: var(--accent);">${escapeHtml(emp.employee_no || 'N/A')}</td>
                        <td>
                            <div style="font-weight: 600;">${escapeHtml(fullName)}</div>
                            ${emp.username ? `<div style="font-size: 11px; color: #71809b;">@${escapeHtml(emp.username)}</div>` : ''}
                        </td>
                        <td>
                            <span class="dept-pill-badge clinical">${escapeHtml(emp.user_role || 'Staff')}</span>
                        </td>
                        <td>${escapeHtml(emp.email || '--')}</td>
                        <td>${escapeHtml(emp.phone || '--')}</td>
                        <td>${hipaaBadge}</td>
                    </tr>
                `;
            }).join("");
        }
    } catch (err) {
        console.error("Error loading staff roster:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: #ef4444;">
                        Failed to load personnel roster.
                    </td>
                </tr>
            `;
        }
    }
};

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
