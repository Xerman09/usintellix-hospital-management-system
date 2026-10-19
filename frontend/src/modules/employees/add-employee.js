import { getUser } from "../../core/session.js?v=5";
import { showToast } from "../../core/toast.js";
import {
    createEmployee,
    updateEmployee,
    fetchEmployees,
    fetchRoles,
    fetchDepartments,
    unlockEmployee,
    updateEmployeeStatus,
    fetchEmployeeSessions,
    revokeSession,
    revokeAllSessions
} from "./employees.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { systemNow, todayISO } from "../../core/timezone.js";

const FIELDS = [
    "username", "password", "role_id", "department_id", "secondary_department_id",
    "duty_tag", "assignment_notes", "status", "status_reason",
    "first_name", "middle_name", "last_name", "suffix",
    "sex", "birthdate", "email", "phone",
    "hipaa_training_status", "hipaa_initial_training_date",
    "hipaa_last_refresher_date", "hipaa_next_refresher_due",
    "hipaa_training_score", "hipaa_cert_ref"
];

let employees = [];
let searchTerm = "";
let currentSessionEmployee = null;

export async function initAddEmployee()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    searchTerm = "";

    enablePasswordToggles();

    const birthdateEl = document.getElementById("birthdate");
    if (birthdateEl) {
        birthdateEl.max = todayISO();
    }

    const modalOverlay = document.getElementById("employeeModalOverlay");
    const modalTitle = document.getElementById("employeeModalTitle");
    const modalSubtitle = document.getElementById("employeeModalSubtitle");
    const passwordHint = document.getElementById("passwordHint");
    const passwordInput = document.getElementById("password");
    const saveBtn = document.getElementById("saveEmployeeBtn");
    const idInput = document.getElementById("employee_id");
    const form = document.getElementById("addEmployeeForm");
    const searchInput = document.getElementById("employeeSearch");
    const searchClear = document.getElementById("employeeSearchClear");

    // Session Modal Elements
    const sessionModalOverlay = document.getElementById("sessionHistoryModalOverlay");
    const closeSessionModal = document.getElementById("closeSessionModal");
    const closeSessionModalFooterBtn = document.getElementById("closeSessionModalFooterBtn");
    const revokeAllSessionsBtn = document.getElementById("revokeAllSessionsBtn");

    // Quick Status Modal Elements
    const quickStatusModalOverlay = document.getElementById("quickStatusModalOverlay");
    const closeQuickStatusModal = document.getElementById("closeQuickStatusModal");
    const cancelQuickStatus = document.getElementById("cancelQuickStatus");
    const quickStatusForm = document.getElementById("quickStatusForm");
    const quickStatusUserId = document.getElementById("quickStatusUserId");
    const quickStatusSelect = document.getElementById("quickStatusSelect");
    const quickStatusReason = document.getElementById("quickStatusReason");
    const quickStatusTargetUser = document.getElementById("quickStatusTargetUser");
    const saveQuickStatusBtn = document.getElementById("saveQuickStatusBtn");

    const openModal = (employee) => {
        clearErrors();
        document.getElementById("formAlert").innerHTML = "";

        if (employee) {
            modalTitle.textContent = "Edit Employee";
            modalSubtitle.textContent = "Update this employee's login credentials, clinical units, and account lifecycle.";
            saveBtn.textContent = "Save Changes";
            passwordInput.placeholder = "••••••••";
            passwordHint.style.display = "";

            idInput.value = employee.id;
            document.getElementById("username").value = employee.username ?? "";
            passwordInput.value = "";
            document.getElementById("role_id").value = employee.role_id ?? "";
            document.getElementById("status").value = employee.user_status ?? "active";
            document.getElementById("status_reason").value = employee.status_reason ?? "";
            document.getElementById("department_id").value = employee.department_id ?? "";
            document.getElementById("secondary_department_id").value = employee.secondary_department_id ?? "";
            document.getElementById("duty_tag").value = employee.duty_tag ?? "primary";
            document.getElementById("assignment_notes").value = employee.assignment_notes ?? "";

            document.getElementById("first_name").value = employee.first_name ?? "";
            document.getElementById("middle_name").value = employee.middle_name ?? "";
            document.getElementById("last_name").value = employee.last_name ?? "";
            document.getElementById("suffix").value = employee.suffix ?? "";
            document.getElementById("sex").value = employee.sex ?? "";
            document.getElementById("birthdate").value = employee.birthdate ?? "";
            document.getElementById("email").value = employee.email ?? "";
            document.getElementById("phone").value = employee.phone ?? "";
            document.getElementById("hipaa_training_status").value = employee.hipaa_training_status ?? "overdue";
            document.getElementById("hipaa_initial_training_date").value = employee.hipaa_initial_training_date ?? "";
            document.getElementById("hipaa_last_refresher_date").value = employee.hipaa_last_refresher_date ?? "";
            document.getElementById("hipaa_next_refresher_due").value = employee.hipaa_next_refresher_due ?? "";
            document.getElementById("hipaa_training_score").value = employee.hipaa_training_score ?? "";
            document.getElementById("hipaa_cert_ref").value = employee.hipaa_cert_ref ?? "";
        } else {
            modalTitle.textContent = "Add Employee";
            modalSubtitle.textContent = "Create a login account, bind to clinical units, and register staff records.";
            saveBtn.textContent = "Create Employee";
            passwordInput.placeholder = "••••••••";
            passwordHint.style.display = "none";

            idInput.value = "";
            form.reset();
            document.getElementById("status").value = "active";
            document.getElementById("duty_tag").value = "primary";
            document.getElementById("hipaa_training_status").value = "overdue";
            document.getElementById("hipaa_initial_training_date").value = "";
            document.getElementById("hipaa_last_refresher_date").value = "";
            document.getElementById("hipaa_next_refresher_due").value = "";
            document.getElementById("hipaa_training_score").value = "";
            document.getElementById("hipaa_cert_ref").value = "";
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

    document.getElementById("openAddEmployeeModal").addEventListener("click", () => openModal(null));
    document.getElementById("closeEmployeeModal").addEventListener("click", closeModal);
    document.getElementById("cancelEmployee").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        renderRows(openModal, openSessionModal, openQuickStatusModal);
    });

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchTerm = "";
        searchClear.classList.remove("show");
        renderRows(openModal, openSessionModal, openQuickStatusModal);
        searchInput.focus();
    });

    // ==============================================
    // SESSION MODAL LOGIC
    // ==============================================
    const openSessionModal = async (employee) => {
        currentSessionEmployee = employee;
        const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ");
        document.getElementById("sessionModalEmployeeName").textContent = `Sessions: ${fullName}`;
        document.getElementById("sessionModalEmployeeDetails").textContent = `@${employee.username} • ${employee.employee_no || 'No ID'} • ${employee.role_name || ''}`;
        
        sessionModalOverlay.classList.add("open");
        await reloadSessionsList();
    };

    const closeSessionModalHandler = () => {
        sessionModalOverlay.classList.remove("open");
        currentSessionEmployee = null;
    };

    closeSessionModal.addEventListener("click", closeSessionModalHandler);
    closeSessionModalFooterBtn.addEventListener("click", closeSessionModalHandler);
    sessionModalOverlay.addEventListener("click", (e) => {
        if (e.target === sessionModalOverlay) closeSessionModalHandler();
    });

    revokeAllSessionsBtn.addEventListener("click", async () => {
        if (!currentSessionEmployee) return;
        if (!confirm(`Are you sure you want to terminate all active sessions for ${currentSessionEmployee.username}? The user will be immediately logged out.`)) return;

        revokeAllSessionsBtn.disabled = true;
        try {
            const res = await revokeAllSessions(currentSessionEmployee.user_id, "Terminated by administrator");
            if (res.success) {
                showToast(res.message, "success");
                await reloadSessionsList();
                await loadEmployees(openModal, openSessionModal, openQuickStatusModal);
            } else {
                showToast(res.message || "Failed to terminate sessions.", "error");
            }
        } catch (e) {
            showToast("Network error terminating sessions.", "error");
        } finally {
            revokeAllSessionsBtn.disabled = false;
        }
    });

    async function reloadSessionsList() {
        if (!currentSessionEmployee) return;
        const tbody = document.getElementById("sessionHistoryTableBody");
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px;">Loading session history...</td></tr>`;

        try {
            const res = await fetchEmployeeSessions(currentSessionEmployee.user_id);
            const sessions = res.success ? res.data : [];
            const activeCount = sessions.filter(s => Number(s.is_active) === 1).length;
            document.getElementById("sessionSummaryActiveCount").textContent = `${activeCount} active`;

            if (!sessions.length) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">No login sessions recorded yet for this user.</td></tr>`;
                return;
            }

            tbody.innerHTML = sessions.map(s => {
                const isActive = Number(s.is_active) === 1;
                const statusBadge = isActive
                    ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#dcfce7;color:#15803d;"><i class="fa-solid fa-circle" style="font-size:6px;"></i> Active</span>`
                    : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#f1f5f9;color:#64748b;">Terminated</span>`;

                const deviceIcon = s.device_type === 'Mobile' ? 'fa-mobile-screen' : (s.device_type === 'Tablet' ? 'fa-tablet-screen-button' : 'fa-laptop');
                const actionBtn = isActive
                    ? `<button type="button" class="btn-revoke-single" data-session-id="${s.id}" style="padding:4px 9px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">Revoke</button>`
                    : `<span style="font-size:11px;color:#94a3b8;">${escapeHtml(s.revocation_reason || 'Logged out')}</span>`;

                return `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fa-solid ${deviceIcon}" style="font-size:14px;color:#6366f1;"></i>
                                <div>
                                    <div style="font-weight:600;color:#1e293b;">${escapeHtml(s.device_type || 'Desktop')}</div>
                                    <div style="font-size:11px;color:#64748b;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(s.user_agent || '')}">${escapeHtml(s.user_agent || 'Unknown Client')}</div>
                                </div>
                            </div>
                        </td>
                        <td><span style="font-family:monospace;font-size:12px;background:#f8fafc;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;">${escapeHtml(s.ip_address || '127.0.0.1')}</span></td>
                        <td style="font-size:12px;">${escapeHtml(s.login_at || '')}</td>
                        <td style="font-size:12px;">${escapeHtml(s.last_activity_at || '')}</td>
                        <td>${statusBadge}</td>
                        <td style="text-align: right;">${actionBtn}</td>
                    </tr>
                `;
            }).join("");

            tbody.querySelectorAll(".btn-revoke-single").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const sid = btn.getAttribute("data-session-id");
                    if (!sid) return;
                    btn.disabled = true;
                    btn.textContent = "Revoking...";
                    try {
                        const r = await revokeSession(sid, "Revoked by administrator");
                        if (r.success) {
                            showToast("Session terminated.", "success");
                            await reloadSessionsList();
                            await loadEmployees(openModal, openSessionModal, openQuickStatusModal);
                        } else {
                            showToast(r.message || "Failed to revoke session.", "error");
                        }
                    } catch (e) {
                        showToast("Error revoking session.", "error");
                    }
                });
            });
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load session histories.</td></tr>`;
        }
    }

    // ==============================================
    // QUICK STATUS MODAL LOGIC
    // ==============================================
    const openQuickStatusModal = (employee) => {
        quickStatusUserId.value = employee.user_id;
        quickStatusSelect.value = employee.user_status || 'active';
        quickStatusReason.value = employee.status_reason || '';
        quickStatusTargetUser.textContent = `Transitioning account for ${employee.first_name} ${employee.last_name} (@${employee.username})`;
        quickStatusModalOverlay.classList.add("open");
    };

    const closeQuickStatusModalHandler = () => {
        quickStatusModalOverlay.classList.remove("open");
        quickStatusForm.reset();
    };

    closeQuickStatusModal.addEventListener("click", closeQuickStatusModalHandler);
    cancelQuickStatus.addEventListener("click", closeQuickStatusModalHandler);
    quickStatusModalOverlay.addEventListener("click", (e) => {
        if (e.target === quickStatusModalOverlay) closeQuickStatusModalHandler();
    });

    quickStatusForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const uid = quickStatusUserId.value;
        const newStatus = quickStatusSelect.value;
        const reason = quickStatusReason.value.trim();

        if (!uid || !newStatus) return;

        setButtonLoading(saveQuickStatusBtn, true, "Updating...");
        try {
            const res = await updateEmployeeStatus(uid, newStatus, reason);
            if (res.success) {
                showToast(res.message, "success");
                closeQuickStatusModalHandler();
                await loadEmployees(openModal, openSessionModal, openQuickStatusModal);
            } else {
                showToast(res.message || "Failed to update account status.", "error");
            }
        } catch (err) {
            showToast("Network error updating status.", "error");
        } finally {
            setButtonLoading(saveQuickStatusBtn, false);
        }
    });

    await Promise.all([loadRoles(), loadDepartments()]);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearErrors();

        const data = {};

        FIELDS.forEach((field) => {
            const el = document.getElementById(field);
            if (!el) return;
            const value = el.value.trim();
            if (value !== "") {
                data[field] = value;
            }
        });

        const editingId = idInput.value;
        setButtonLoading(saveBtn, true, editingId ? "Saving..." : "Creating...");

        let result;
        try {
            result = editingId
                ? await updateEmployee(editingId, data)
                : await createEmployee(data);
        } finally {
            setButtonLoading(saveBtn, false);
        }

        if (!result.success) {
            showAlert(result.message || "Failed to save employee.", "error");

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
        showToast(editingId ? "Employee updated successfully." : "Employee created successfully.", "success");
        await loadEmployees(openModal, openSessionModal, openQuickStatusModal);
    });

    await loadEmployees(openModal, openSessionModal, openQuickStatusModal);
}

async function loadEmployees(openModal, openSessionModal, openQuickStatusModal)
{
    const result = await fetchEmployees();
    employees = result.success ? result.data : [];
    renderRows(openModal, openSessionModal, openQuickStatusModal);
}

const NON_STAFF_ROLES = ["patient"];

async function loadRoles()
{
    const result = await fetchRoles();
    const select = document.getElementById("role_id");
    if (!select) return;

    if (result.success) {
        // "patient" is a portal role, not a job: an employee given it would land in
        // the patient portal with no patient record behind it.
        result.data.filter((role) => !NON_STAFF_ROLES.includes(String(role.name).toLowerCase())).forEach((role) => {
            const option = document.createElement("option");
            option.value = role.id;
            option.textContent = role.name;
            select.appendChild(option);
        });
    }
}

async function loadDepartments()
{
    const result = await fetchDepartments();
    const primarySelect = document.getElementById("department_id");
    const secondarySelect = document.getElementById("secondary_department_id");

    if (result.success && primarySelect) {
        result.data.forEach((dept) => {
            const opt1 = document.createElement("option");
            opt1.value = dept.id;
            opt1.textContent = dept.name;
            primarySelect.appendChild(opt1);

            if (secondarySelect) {
                const opt2 = document.createElement("option");
                opt2.value = dept.id;
                opt2.textContent = dept.name;
                secondarySelect.appendChild(opt2);
            }
        });
    }
}

function renderRows(openModal, openSessionModal, openQuickStatusModal)
{
    const tbody = document.getElementById("employeesTableBody");
    const countText = document.getElementById("employeeCountText");

    countText.textContent = `${employees.length} ${employees.length === 1 ? "employee" : "employees"}`;

    const filtered = searchTerm
        ? employees.filter((employee) => {
            const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            return fullName.includes(searchTerm) ||
                (employee.username ?? "").toLowerCase().includes(searchTerm) ||
                (employee.employee_no ?? "").toLowerCase().includes(searchTerm) ||
                (employee.email ?? "").toLowerCase().includes(searchTerm) ||
                (employee.department_name ?? "").toLowerCase().includes(searchTerm) ||
                (employee.secondary_department_name ?? "").toLowerCase().includes(searchTerm);
        })
        : employees;

    if (!filtered.length) {
        tbody.innerHTML = renderEmptyState(employees.length === 0);
        return;
    }

    tbody.innerHTML = filtered.map((employee) => {
        const fullName = [employee.first_name, employee.middle_name, employee.last_name, employee.suffix]
            .filter(Boolean)
            .join(" ");

        const initial = (employee.first_name || "?").charAt(0).toUpperCase();
        const userStatus = employee.user_status || (Number(employee.is_locked) === 1 ? 'locked' : 'active');
        const activeSessions = Number(employee.active_session_count || 0);

        // Account status badges
        let statusBadge = '';
        if (userStatus === 'active') {
            statusBadge = `
                <span class="vc-status-badge status-active">
                    <i class="fa-solid fa-circle" style="font-size: 6px;"></i> Active
                </span>
            `;
        } else if (userStatus === 'suspended') {
            statusBadge = `
                <span class="vc-status-badge status-suspended" title="${escapeHtml(employee.status_reason || 'Suspended')}">
                    <i class="fa-solid fa-pause"></i> Suspended
                </span>
            `;
        } else if (userStatus === 'locked') {
            statusBadge = `
                <span class="vc-status-badge status-locked" title="${escapeHtml(employee.status_reason || 'Locked')}">
                    <i class="fa-solid fa-lock"></i> Locked
                </span>
            `;
        } else if (userStatus === 'decommissioned') {
            statusBadge = `
                <span class="vc-status-badge status-decommissioned" title="${escapeHtml(employee.status_reason || 'Decommissioned')}">
                    <i class="fa-solid fa-user-slash"></i> Decommissioned
                </span>
            `;
        }

        const sessionBadge = `
            <button type="button" class="vc-session-btn ${activeSessions > 0 ? 'has-active' : ''}" data-sessions-user-id="${employee.user_id}" title="View active sessions & login history">
                <i class="fa-solid fa-shield-halved"></i>
                <span>${activeSessions > 0 ? `${activeSessions} Active` : '0 Active'}</span>
            </button>
        `;

        // Department mapping badges
        const dutyTag = employee.duty_tag || 'primary';
        const primaryDept = employee.department_name
            ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                 <span class="vc-dept-badge"><i class="fa-solid fa-hospital"></i> ${escapeHtml(employee.department_name)}</span>
                 <span class="vc-duty-tag duty-${dutyTag}">${escapeHtml(dutyTag.replace('_', '-'))}</span>
               </div>`
            : `<span style="color:#94a3b8;font-style:italic;">No department</span>`;

        const secondaryDept = employee.secondary_department_name
            ? `<div style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:#64748b;">
                 <i class="fa-solid fa-arrow-turn-down-right" style="font-size:10px;"></i>
                 <span style="background:#f5f3ff;color:#6d28d9;padding:1px 6px;border-radius:4px;border:1px solid #ddd6fe;font-weight:600;">${escapeHtml(employee.secondary_department_name)}</span>
                 <span style="font-size:10.5px;color:#8b5cf6;">(2nd Unit)</span>
               </div>`
            : '';

        // HIPAA Training Badge
        const trainingStatus = employee.hipaa_training_status || 'overdue';
        let trainingBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#fee2e2;color:#991b1b;"><svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>Overdue</span>`;
        if (trainingStatus === 'compliant') {
            trainingBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#dcfce7;color:#15803d;"><svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>Compliant</span>`;
        } else if (trainingStatus === 'approaching_due') {
            trainingBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#fef3c7;color:#b45309;"><svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3"/></svg>Due Soon</span>`;
        } else if (trainingStatus === 'exempt') {
            trainingBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#f1f5f9;color:#475569;">Exempt</span>`;
        }

        return `
        <tr>
            <td>
                <div class="vc-name-cell">
                    <div class="vc-avatar">${escapeHtml(initial)}</div>
                    <div>
                        <div class="vc-name">${escapeHtml(fullName)}</div>
                        <div class="vc-subtext">${escapeHtml(employee.employee_no || "")}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:600;color:#1e293b;">@${escapeHtml(employee.username || "")}</div>
                <div style="margin-top:3px;"><span class="vc-role-pill">${escapeHtml(employee.role_name || "")}</span></div>
            </td>
            <td>
                ${primaryDept}
                ${secondaryDept}
            </td>
            <td>
                <div class="vc-name">${escapeHtml(employee.email || "")}</div>
                <div class="vc-subtext">${escapeHtml(employee.phone || "")}</div>
            </td>
            <td>
                <div>${statusBadge}</div>
                <div>${sessionBadge}</div>
            </td>
            <td>${trainingBadge}</td>
            <td style="text-align: right;">
                <div class="vc-actions">
                    <button class="vc-btn-action vc-btn-edit" data-edit-id="${employee.id}" title="Edit Profile & Unit Assignments">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="vc-btn-action vc-btn-status" data-status-user-id="${employee.user_id}" title="Transition Account Lifecycle Status">
                        <i class="fa-solid fa-sliders"></i> Status
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const employee = employees.find((item) => String(item.id) === btn.getAttribute("data-edit-id"));
            if (employee) {
                openModal(employee);
            }
        });
    });

    tbody.querySelectorAll("[data-status-user-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const uid = btn.getAttribute("data-status-user-id");
            const employee = employees.find((item) => String(item.user_id) === String(uid));
            if (employee && openQuickStatusModal) {
                openQuickStatusModal(employee);
            }
        });
    });

    tbody.querySelectorAll("[data-sessions-user-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const uid = btn.getAttribute("data-sessions-user-id");
            const employee = employees.find((item) => String(item.user_id) === String(uid));
            if (employee && openSessionModal) {
                openSessionModal(employee);
            }
        });
    });
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No employees yet" : "No matching employees";
    const message = noneAtAll
        ? "Add your first employee to create their login account and assign clinical units."
        : "Try a different search term.";

    return `
        <tr>
            <td colspan="7" class="vc-empty-state">
                <div class="vc-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
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

function setButtonLoading(button, loading, loadingText)
{
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.classList.add("is-loading");
        button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.classList.remove("is-loading");
        button.textContent = button.dataset.originalText || button.textContent;
    }
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
    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
