import {
    fetchFacilityOrgTree,
    assignHeadOfDepartment,
    assignWardToDepartment
} from "./department-org.service.js";
import { showToast } from "../../core/toast.js";

let state = {
    user: null,
    treeData: null,
    selectedFacilityId: null,
    viewMode: 'tree', // 'tree' or 'cards'
    filterType: '',
    filterSearch: '',
    allDoctors: []
};

/**
 * Initialize Visual Department Organizational Mapping
 */
export async function initDepartmentOrg(user = {}) {
    state.user = user;

    setupEventListeners();
    await loadOrgTree();
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
    // Facility selector change
    const facilitySelect = document.getElementById("do-select-facility");
    if (facilitySelect) {
        facilitySelect.onchange = (e) => {
            const val = parseInt(e.target.value, 10);
            if (val) {
                state.selectedFacilityId = val;
                loadOrgTree(val);
            }
        };
    }

    // Refresh button
    const btnRefresh = document.getElementById("do-btn-refresh");
    if (btnRefresh) {
        btnRefresh.onclick = () => {
            loadOrgTree(state.selectedFacilityId);
            showToast("Organizational directory refreshed.", "info");
        };
    }

    // View mode switcher
    const btnModeTree = document.getElementById("do-btn-mode-tree");
    const btnModeCards = document.getElementById("do-btn-mode-cards");

    if (btnModeTree && btnModeCards) {
        btnModeTree.onclick = () => {
            state.viewMode = 'tree';
            btnModeTree.style.background = "#6366f1";
            btnModeTree.style.color = "#fff";
            btnModeCards.style.background = "#fff";
            btnModeCards.style.color = "#64748b";
            renderDepartments();
        };

        btnModeCards.onclick = () => {
            state.viewMode = 'cards';
            btnModeCards.style.background = "#6366f1";
            btnModeCards.style.color = "#fff";
            btnModeTree.style.background = "#fff";
            btnModeTree.style.color = "#64748b";
            renderDepartments();
        };
    }

    // Type filter pills
    document.querySelectorAll(".do-type-pill").forEach(pill => {
        pill.onclick = (e) => {
            document.querySelectorAll(".do-type-pill").forEach(p => {
                p.style.background = "#fff";
                p.style.color = "#475569";
                p.style.borderColor = "#cbd5e1";
            });
            pill.style.background = "#6366f1";
            pill.style.color = "#fff";
            pill.style.borderColor = "#6366f1";

            state.filterType = pill.getAttribute("data-type") || '';
            renderDepartments();
        };
    });

    // Instant search input
    const searchInput = document.getElementById("do-filter-search");
    if (searchInput) {
        let timer = null;
        searchInput.oninput = (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.filterSearch = e.target.value.toLowerCase().trim();
                renderDepartments();
            }, 250);
        };
    }

    // Appoint Head Modal close
    document.querySelectorAll(".do-modal-close").forEach(btn => {
        btn.onclick = () => closeModal("do-modal-appoint");
    });

    const modalAppoint = document.getElementById("do-modal-appoint");
    if (modalAppoint) {
        modalAppoint.onclick = (e) => {
            if (e.target === modalAppoint) closeModal("do-modal-appoint");
        };
    }

    // Form Appoint Submit
    const formAppoint = document.getElementById("do-form-appoint");
    if (formAppoint) {
        formAppoint.onsubmit = handleAppointSubmit;
    }

    // Doctor select change in modal -> preview
    const docSelect = document.getElementById("do-appoint-doctor-select");
    if (docSelect) {
        docSelect.onchange = (e) => {
            const empId = parseInt(e.target.value, 10);
            const previewBox = document.getElementById("do-appoint-preview");
            if (!empId) {
                if (previewBox) previewBox.style.display = "none";
                return;
            }
            const doc = state.allDoctors.find(d => d.employee_id === empId);
            if (doc && previewBox) {
                previewBox.style.display = "block";
                document.getElementById("do-preview-name").textContent = `Dr. ${doc.first_name} ${doc.last_name}` + (doc.suffix ? `, ${doc.suffix}` : '');
                document.getElementById("do-preview-notes").textContent = doc.assignment_notes || 'Licensed Physician / Clinical Specialist';
                document.getElementById("do-preview-contact").textContent = `Email: ${doc.email || 'N/A'} • Phone: ${doc.phone || 'N/A'}`;
            }
        };
    }
}

/**
 * Load complete organizational tree from backend
 */
async function loadOrgTree(facilityId = null) {
    try {
        const res = await fetchFacilityOrgTree(facilityId);
        if (res && res.data) {
            state.treeData = res.data;
            state.selectedFacilityId = res.data.facility ? res.data.facility.id : null;

            // Extract all doctors across departments for the appoint modal
            const docsMap = {};
            (res.data.tree || []).forEach(d => {
                (d.staff || []).forEach(s => {
                    if (s.role_name === 'doctor') {
                        docsMap[s.employee_id] = s;
                    }
                });
            });
            state.allDoctors = Object.values(docsMap);

            populateFacilitiesSelect(res.data.facilities, state.selectedFacilityId);
            updateKPIs(res.data.kpis);
            updateFacilityCard(res.data.facility);
            renderDepartments();
        } else {
            showToast("Failed to load facility organizational tree.", "error");
        }
    } catch (err) {
        console.error("Failed to load organizational tree:", err);
        showToast("Network error loading organizational mapping: " + err.message, "error");
    }
}

/**
 * Populate facility selector dropdown
 */
function populateFacilitiesSelect(facilities, activeId) {
    const select = document.getElementById("do-select-facility");
    if (!select || !facilities) return;

    select.innerHTML = facilities.map(f => {
        return `<option value="${f.id}" ${parseInt(f.id, 10) === parseInt(activeId, 10) ? 'selected' : ''}>${escapeHtml(f.name)}</option>`;
    }).join("");
}

/**
 * Update top KPI numbers
 */
function updateKPIs(kpis) {
    if (!kpis) return;
    const elDepts = document.getElementById("do-kpi-depts");
    const elHeads = document.getElementById("do-kpi-heads");
    const elWards = document.getElementById("do-kpi-wards");
    const elBeds = document.getElementById("do-kpi-beds");
    const elDocs = document.getElementById("do-kpi-doctors");
    const elNurses = document.getElementById("do-kpi-nurses");

    if (elDepts) elDepts.textContent = kpis.total_departments ?? 0;
    if (elHeads) elHeads.textContent = `${kpis.heads_appointed ?? 0} Chairs Appointed`;
    if (elWards) elWards.textContent = kpis.total_wards ?? 0;
    if (elBeds) elBeds.textContent = `${kpis.total_beds ?? 0} Inpatient Beds`;
    if (elDocs) elDocs.textContent = kpis.total_doctors ?? 0;
    if (elNurses) elNurses.textContent = kpis.total_nurses ?? 0;
}

/**
 * Update Facility header banner
 */
function updateFacilityCard(facility) {
    const nameEl = document.getElementById("do-facility-name");
    const metaEl = document.getElementById("do-facility-meta");
    if (!facility) return;

    if (nameEl) nameEl.textContent = facility.name || 'Hospital Campus Facility';

    if (metaEl) {
        metaEl.innerHTML = `
            ${facility.physical_city ? `<span>Location: <b>${escapeHtml(facility.physical_city)}, ${escapeHtml(facility.physical_state || '')}</b></span>` : ''}
            ${facility.phone ? `<span>Phone: <b>${escapeHtml(facility.phone)}</b></span>` : ''}
            ${facility.email ? `<span>Email: <b>${escapeHtml(facility.email)}</b></span>` : ''}
            <span>Facility ID: <b>#${facility.id}</b></span>
        `;
    }
}

/**
 * Render department nodes in selected view mode
 */
function renderDepartments() {
    const container = document.getElementById("do-departments-container");
    if (!container || !state.treeData) return;

    let list = state.treeData.tree || [];

    // Filter by type
    if (state.filterType) {
        list = list.filter(d => d.type === state.filterType);
    }

    // Filter by search term
    if (state.filterSearch) {
        const q = state.filterSearch;
        list = list.filter(d => {
            const nameMatch = (d.name || '').toLowerCase().includes(q);
            const codeMatch = (d.code || '').toLowerCase().includes(q);
            const headMatch = (`${d.head_first_name || ''} ${d.head_last_name || ''}`).toLowerCase().includes(q);
            const wardMatch = (d.wards || []).some(w => (w.ward_name || '').toLowerCase().includes(q) || (w.ward_code || '').toLowerCase().includes(q));
            const staffMatch = (d.staff || []).some(s => (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(q));
            return nameMatch || codeMatch || headMatch || wardMatch || staffMatch;
        });
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted, #64748b); background: #fff; border-radius: 10px; border: 1px solid #e2e8f0;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <div style="font-weight: 600; font-size: 0.9375rem;">No departments match your filter</div>
                <div style="font-size: 0.8125rem; margin-top: 4px;">Try searching a different keyword or select "All Types".</div>
            </div>
        `;
        return;
    }

    const isGrid = state.viewMode === 'cards';
    container.style.display = isGrid ? 'grid' : 'flex';
    container.style.gridTemplateColumns = isGrid ? 'repeat(auto-fill, minmax(520px, 1fr))' : 'none';
    container.style.flexDirection = isGrid ? 'row' : 'column';

    container.innerHTML = list.map(dept => renderDepartmentCard(dept)).join("");

    attachCardInteractions();
}

/**
 * Render single department organizational card
 */
function renderDepartmentCard(dept) {
    const hasHead = Boolean(dept.head_employee_id);
    const headName = hasHead ? `Dr. ${escapeHtml(dept.head_first_name)} ${escapeHtml(dept.head_last_name)}` + (dept.head_suffix ? `, ${escapeHtml(dept.head_suffix)}` : '') : 'Unassigned';
    const headRole = dept.head_notes || 'Department Chair / Clinical Director';

    // Type styling
    let typeClass = 'do-badge-clinical';
    if (dept.type === 'Emergency') typeClass = 'do-badge-emergency';
    else if (dept.type === 'Inpatient') typeClass = 'do-badge-inpatient';
    else if (dept.type === 'Surgical') typeClass = 'do-badge-surgical';
    else if (dept.type === 'Diagnostic') typeClass = 'do-badge-diagnostic';
    else if (dept.type === 'Administrative') typeClass = 'do-badge-admin';

    // Wards
    const wards = dept.wards || [];
    const staff = dept.staff || [];
    const counts = dept.counts || {};

    return `
        <div class="do-tree-card" id="do-card-${dept.id}" data-id="${dept.id}">
            <!-- Header bar -->
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color, #f1f5f9); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="eq-badge ${typeClass}" style="font-weight: 700; font-size: 0.75rem;">
                        ${escapeHtml(dept.code || 'DEPT')}
                    </span>
                    <h3 style="margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--text-primary, #0f172a);">
                        ${escapeHtml(dept.name)}
                    </h3>
                    <span style="font-size: 0.75rem; color: var(--text-muted, #64748b); font-weight: 500;">
                        (${escapeHtml(dept.type)})
                    </span>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; ${dept.status === 'active' ? 'background: rgba(16, 185, 129, 0.12); color: #10b981;' : 'background: rgba(100, 116, 139, 0.12); color: #64748b;'}">
                        ${(dept.status || 'active').toUpperCase()}
                    </span>
                    <button type="button" class="btn btn-sm do-btn-appoint" data-id="${dept.id}" data-name="${escapeHtml(dept.name)}" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; color: #6366f1; font-weight: 600; cursor: pointer;" title="Appoint or change Department Chair">
                        Appoint Chair
                    </button>
                </div>
            </div>

            <!-- Content Grid: 4 Pillars -->
            <div style="padding: 18px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Pillar 1: Head of Department -->
                <div style="padding: 12px 14px; border-radius: 8px; background: ${hasHead ? 'rgba(99, 102, 241, 0.04)' : '#fff'}; border: 1px solid ${hasHead ? 'rgba(99, 102, 241, 0.15)' : '#e2e8f0'};">
                    <div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #6366f1; margin-bottom: 6px;">
                        Head of Department (Chair)
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 36px; height: 36px; border-radius: 50%; background: ${hasHead ? '#6366f1' : '#cbd5e1'}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
                            ${hasHead ? getInitials(dept.head_first_name, dept.head_last_name) : '?'}
                        </span>
                        <div style="overflow: hidden;">
                            <div style="font-weight: 700; font-size: 0.875rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${headName}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted, #64748b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${headRole}
                            </div>
                            ${hasHead && dept.head_phone ? `<div style="font-size: 0.6875rem; color: #0284c7; margin-top: 2px;">${escapeHtml(dept.head_phone)}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Pillar 2: Assigned Wards & Bed Capacity -->
                <div style="padding: 12px 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #0284c7;">
                            Assigned Wards &amp; Beds
                        </span>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #0f172a;">
                            ${counts.beds_count || 0} Beds (${wards.length} Wards)
                        </span>
                    </div>

                    ${wards.length === 0 ? `
                        <div style="font-size: 0.75rem; color: var(--text-muted, #94a3b8); padding: 6px 0;">
                            Outpatient / Ambulatory Service Only (No dedicated wards)
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${wards.map(w => `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; padding: 4px 8px; background: #fff; border-radius: 4px; border: 1px solid #e2e8f0;">
                                    <div>
                                        <b style="color: #0f172a;">${escapeHtml(w.ward_name)}</b>
                                        <span style="color: #64748b;">(${escapeHtml(w.floor_location)})</span>
                                    </div>
                                    <div style="font-weight: 600; color: #0284c7;">
                                        ${w.total_beds_count} Beds • ${w.rooms_count} Rooms
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    `}
                </div>
            </div>

            <!-- Pillar 3: Medical Staff Roster -->
            <div style="padding: 0 20px 16px 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #475569;">
                        Clinical Staff Roster (${counts.doctors_count || 0} Doctors, ${counts.nurses_count || 0} Nurses)
                    </span>
                    <span style="font-size: 0.75rem; color: var(--text-muted, #64748b);">
                        Total Assigned: <b>${staff.length}</b>
                    </span>
                </div>

                ${staff.length === 0 ? `
                    <div style="font-size: 0.75rem; color: var(--text-muted, #94a3b8); padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1; text-align: center;">
                        No staff directly assigned to this unit yet.
                    </div>
                ` : `
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${staff.map(s => {
                            const isDoc = s.role_name === 'doctor';
                            const badgeBg = isDoc ? 'rgba(2, 132, 199, 0.08)' : 'rgba(217, 119, 6, 0.08)';
                            const badgeColor = isDoc ? '#0284c7' : '#d97706';
                            const dutyColor = s.duty_tag === 'on_call' ? '#dc2626' : (s.duty_tag === 'consultant' ? '#9333ea' : '#16a34a');

                            return `
                                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: ${badgeBg}; border: 1px solid rgba(0,0,0,0.06); font-size: 0.75rem;">
                                    <span style="font-weight: 700; color: ${badgeColor};">
                                        ${isDoc ? 'Dr.' : ''} ${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}
                                    </span>
                                    <span style="font-size: 0.6875rem; color: var(--text-muted, #64748b);">
                                        ${s.suffix ? escapeHtml(s.suffix) : capitalize(s.role_name)}
                                    </span>
                                    <span style="font-size: 0.625rem; font-weight: 700; text-transform: uppercase; color: ${dutyColor}; background: #fff; padding: 1px 4px; border-radius: 3px; border: 1px solid #e2e8f0;">
                                        ${s.duty_tag || 'primary'}
                                    </span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                `}
            </div>

            <!-- Card Footer: Operational Meta & Assets -->
            <div style="padding: 10px 20px; border-top: 1px solid var(--border-color, #f1f5f9); background: #f8fafc; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted, #64748b);">
                <div>
                    Operating Hours: <b>${escapeHtml(dept.operating_hours || 'Mon-Fri 08:00 - 17:00')}</b>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span>Biomedical Machinery: <b style="color: #0f172a;">${counts.equipment_count || 0} Units</b></span>
                    ${dept.equipment && dept.equipment.life_critical_count > 0 ? `
                        <span style="color: #dc2626; font-weight: 600;">(${dept.equipment.life_critical_count} Life Critical)</span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach interaction events to cards (Appoint Head modal)
 */
function attachCardInteractions() {
    document.querySelectorAll(".do-btn-appoint").forEach(btn => {
        btn.onclick = () => {
            const deptId = parseInt(btn.getAttribute("data-id"), 10);
            const deptName = btn.getAttribute("data-name");
            openAppointModal(deptId, deptName);
        };
    });
}

/**
 * Open Appoint Head of Department Modal
 */
function openAppointModal(deptId, deptName) {
    document.getElementById("do-appoint-dept-id").value = deptId;
    document.getElementById("do-modal-dept-title").textContent = `Department: ${deptName}`;

    const docSelect = document.getElementById("do-appoint-doctor-select");
    const previewBox = document.getElementById("do-appoint-preview");
    if (previewBox) previewBox.style.display = "none";

    if (docSelect) {
        if (!state.allDoctors || state.allDoctors.length === 0) {
            docSelect.innerHTML = `<option value="">No physicians found on roster</option>`;
        } else {
            docSelect.innerHTML = `<option value="">Select Physician / Specialist...</option>` +
                state.allDoctors.map(doc => {
                    const title = `Dr. ${doc.first_name} ${doc.last_name}` + (doc.suffix ? `, ${doc.suffix}` : '') + (doc.assignment_notes ? ` (${doc.assignment_notes})` : '');
                    return `<option value="${doc.employee_id}">${escapeHtml(title)}</option>`;
                }).join("");
        }
    }

    openModal("do-modal-appoint");
}

/**
 * Handle Appoint Form Submit
 */
async function handleAppointSubmit(e) {
    e.preventDefault();

    const deptId = parseInt(document.getElementById("do-appoint-dept-id").value, 10);
    const empId = parseInt(document.getElementById("do-appoint-doctor-select").value, 10);

    if (!deptId || !empId) {
        showToast("Please choose a physician to appoint as Department Chair.", "warning");
        return;
    }

    try {
        const res = await assignHeadOfDepartment(deptId, empId);
        if (res && res.success) {
            showToast(res.message || "Department Chair successfully appointed.", "success");
            closeModal("do-modal-appoint");
            await loadOrgTree(state.selectedFacilityId);
        } else {
            showToast(res.message || "Failed to appoint Department Chair.", "error");
        }
    } catch (err) {
        showToast("Error appointing Department Chair: " + err.message, "error");
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "none";
        document.body.style.overflow = "";
    }
}

function getInitials(first, last) {
    const f = first ? first[0].toUpperCase() : '';
    const l = last ? last[0].toUpperCase() : '';
    return f + l || 'MD';
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
