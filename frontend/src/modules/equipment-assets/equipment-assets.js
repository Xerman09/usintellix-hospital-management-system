import {
    fetchEquipmentAssets,
    fetchEquipmentMetrics,
    fetchEquipmentLocations,
    fetchEquipmentAsset,
    createEquipmentAsset,
    updateEquipmentAsset,
    updateEquipmentStatus,
    recordEquipmentLog,
    deleteEquipmentAsset,
    fetchPMSummary,
    fetchPMSchedules,
    fetchPMSchedule,
    createPMSchedule,
    updatePMSchedule,
    deletePMSchedule,
    generateWorkOrderFromSchedule,
    fetchBiomedWorkOrders,
    fetchBiomedWorkOrder,
    createBiomedWorkOrder,
    updateBiomedWorkOrder
} from "./equipment-assets.service.js";
import { showToast } from "../../core/toast.js";
import { formatCurrency, updateDomCurrencyElements } from "../../core/currency.js";

let state = {
    user: null,
    assets: [],
    metrics: null,
    locations: { facilities: [], departments: [], buildings: [], wards: [], rooms: [] },
    filters: {
        search: "",
        category: "",
        status: "",
        criticality_level: "",
        department_id: "",
        ward_id: "",
        calibration_filter: ""
    },
    pmSummary: null,
    pmSchedules: [],
    pmFilters: {
        search: "",
        frequency: "",
        criticality_tier: "",
        maintenance_type: "",
        due_filter: ""
    },
    workOrders: [],
    woFilters: {
        search: "",
        status: "",
        priority: "",
        work_order_type: ""
    },
    activeTab: "fleet",
    selectedSchedule: null,
    selectedAsset: null
};

/**
 * Initialize Equipment Assets Module
 */
export async function initEquipmentAssets(user = {}) {
    state.user = user;

    // Attach listeners
    setupEventListeners();
    setupBiomedEventListeners();
    updateDomCurrencyElements();

    // Initial loads
    await loadLocations();
    await Promise.all([
        loadMetrics(),
        loadAssets(),
        loadPMSummary(),
        loadPMSchedules()
    ]);
}

/**
 * Tab Switching Handler
 */
function switchBiomedTab(tabKey) {
    state.activeTab = tabKey;

    const tabs = ["fleet", "calendar", "workorders"];
    tabs.forEach(t => {
        const btn = document.getElementById(`biomed-tab-${t}`);
        const view = document.getElementById(`biomed-view-${t}`);
        if (btn) {
            if (t === tabKey) {
                btn.classList.add("active-tab");
            } else {
                btn.classList.remove("active-tab");
            }
        }
        if (view) {
            view.style.display = (t === tabKey) ? "block" : "none";
        }
    });

    if (tabKey === "calendar") {
        loadPMSummary();
        loadPMSchedules();
    } else if (tabKey === "workorders") {
        loadWorkOrders();
    }
}

/**
 * Setup Biomedical Specific Listeners
 */
function setupBiomedEventListeners() {
    // Nav Tabs
    document.getElementById("biomed-tab-fleet")?.addEventListener("click", () => switchBiomedTab("fleet"));
    document.getElementById("biomed-tab-calendar")?.addEventListener("click", () => switchBiomedTab("calendar"));
    document.getElementById("biomed-tab-workorders")?.addEventListener("click", () => switchBiomedTab("workorders"));

    // Overdue PM Card click -> quick filter to overdue
    document.getElementById("biomed-card-pm-overdue")?.addEventListener("click", () => {
        const dueSel = document.getElementById("biomed-pm-filter-due");
        if (dueSel) {
            dueSel.value = "overdue";
            state.pmFilters.due_filter = "overdue";
            loadPMSchedules();
        }
    });

    // PM Add Schedule button
    document.getElementById("biomed-btn-add-schedule")?.addEventListener("click", () => {
        openScheduleModal();
    });

    // PM Filters
    const pmSearch = document.getElementById("biomed-pm-filter-search");
    if (pmSearch) {
        let pmTimer = null;
        pmSearch.oninput = (e) => {
            clearTimeout(pmTimer);
            pmTimer = setTimeout(() => {
                state.pmFilters.search = e.target.value.trim();
                loadPMSchedules();
            }, 300);
        };
    }

    document.getElementById("biomed-pm-filter-frequency")?.addEventListener("change", (e) => {
        state.pmFilters.frequency = e.target.value;
        loadPMSchedules();
    });
    document.getElementById("biomed-pm-filter-tier")?.addEventListener("change", (e) => {
        state.pmFilters.criticality_tier = e.target.value;
        loadPMSchedules();
    });
    document.getElementById("biomed-pm-filter-type")?.addEventListener("change", (e) => {
        state.pmFilters.maintenance_type = e.target.value;
        loadPMSchedules();
    });
    document.getElementById("biomed-pm-filter-due")?.addEventListener("change", (e) => {
        state.pmFilters.due_filter = e.target.value;
        loadPMSchedules();
    });

    // Reset PM Filters
    document.getElementById("biomed-btn-reset-pm-filters")?.addEventListener("click", () => {
        state.pmFilters = { search: "", frequency: "", criticality_tier: "", maintenance_type: "", due_filter: "" };
        if (pmSearch) pmSearch.value = "";
        const fFreq = document.getElementById("biomed-pm-filter-frequency");
        if (fFreq) fFreq.value = "";
        const fTier = document.getElementById("biomed-pm-filter-tier");
        if (fTier) fTier.value = "";
        const fType = document.getElementById("biomed-pm-filter-type");
        if (fType) fType.value = "";
        const fDue = document.getElementById("biomed-pm-filter-due");
        if (fDue) fDue.value = "";
        loadPMSchedules();
    });

    // Add Checklist Step row in PM modal
    document.getElementById("biomed-btn-add-task-row")?.addEventListener("click", () => {
        addTaskRowToScheduleModal();
    });

    // PM Schedule Form Submit
    document.getElementById("biomed-form-schedule")?.addEventListener("submit", handleScheduleFormSubmit);

    // Spawn WO from Checklist Inspector modal button
    document.getElementById("biomed-btn-spawn-wo-from-modal")?.addEventListener("click", async () => {
        if (!state.selectedSchedule) return;
        await handleDispatchWorkOrder(state.selectedSchedule.id, state.selectedSchedule.title);
        closeModal("biomed-modal-checklist");
    });

    // Work Order Filters
    const woSearch = document.getElementById("biomed-wo-filter-search");
    if (woSearch) {
        let woTimer = null;
        woSearch.oninput = (e) => {
            clearTimeout(woTimer);
            woTimer = setTimeout(() => {
                state.woFilters.search = e.target.value.trim();
                loadWorkOrders();
            }, 300);
        };
    }
    document.getElementById("biomed-wo-filter-status")?.addEventListener("change", (e) => {
        state.woFilters.status = e.target.value;
        loadWorkOrders();
    });
    document.getElementById("biomed-wo-filter-priority")?.addEventListener("change", (e) => {
        state.woFilters.priority = e.target.value;
        loadWorkOrders();
    });
    document.getElementById("biomed-wo-filter-type")?.addEventListener("change", (e) => {
        state.woFilters.work_order_type = e.target.value;
        loadWorkOrders();
    });

    // Work Order Form Submit
    document.getElementById("biomed-form-workorder")?.addEventListener("submit", handleWorkOrderFormSubmit);
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
    // Refresh button
    const btnRefresh = document.getElementById("eq-btn-refresh");
    if (btnRefresh) {
        btnRefresh.onclick = async () => {
            await Promise.all([loadMetrics(), loadAssets(), loadPMSummary(), loadPMSchedules(), loadWorkOrders()]);
            showToast("Equipment & Biomedical data refreshed.", "info");
        };
    }

    // Register Asset button
    const btnAdd = document.getElementById("eq-btn-add");
    if (btnAdd) {
        btnAdd.onclick = () => openAssetModal();
    }

    // Calibration KPI Card Click -> quick filter
    const cardCalib = document.getElementById("eq-card-calibration-kpi");
    if (cardCalib) {
        cardCalib.onclick = () => {
            const calibSelect = document.getElementById("eq-filter-calibration");
            if (calibSelect) {
                calibSelect.value = "all_due";
                state.filters.calibration_filter = "all_due";
                loadAssets();
            }
        };
    }

    // Search filter with debounce
    const searchInput = document.getElementById("eq-filter-search");
    if (searchInput) {
        let timer = null;
        searchInput.oninput = (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.filters.search = e.target.value.trim();
                loadAssets();
            }, 300);
        };
    }

    // Category filter
    const catSelect = document.getElementById("eq-filter-category");
    if (catSelect) {
        catSelect.onchange = (e) => {
            state.filters.category = e.target.value;
            loadAssets();
        };
    }

    // Status filter
    const statusSelect = document.getElementById("eq-filter-status");
    if (statusSelect) {
        statusSelect.onchange = (e) => {
            state.filters.status = e.target.value;
            loadAssets();
        };
    }

    // Department filter
    const deptSelect = document.getElementById("eq-filter-department");
    if (deptSelect) {
        deptSelect.onchange = (e) => {
            state.filters.department_id = e.target.value;
            loadAssets();
        };
    }

    // Calibration filter
    const calibSelect = document.getElementById("eq-filter-calibration");
    if (calibSelect) {
        calibSelect.onchange = (e) => {
            state.filters.calibration_filter = e.target.value;
            loadAssets();
        };
    }

    // Reset filters
    const btnReset = document.getElementById("eq-btn-reset-filters");
    if (btnReset) {
        btnReset.onclick = () => {
            state.filters = {
                search: "",
                category: "",
                status: "",
                criticality_level: "",
                department_id: "",
                ward_id: "",
                calibration_filter: ""
            };
            if (searchInput) searchInput.value = "";
            if (catSelect) catSelect.value = "";
            if (statusSelect) statusSelect.value = "";
            if (deptSelect) deptSelect.value = "";
            if (calibSelect) calibSelect.value = "";
            loadAssets();
        };
    }

    // Modal close buttons
    document.querySelectorAll(".eq-modal-close").forEach(btn => {
        btn.onclick = () => {
            const modalId = btn.getAttribute("data-modal");
            closeModal(modalId);
        };
    });

    // Backdrop clicks
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                closeModal(backdrop.id);
            }
        };
    });

    // Asset Form Submit (Create / Edit)
    const formAsset = document.getElementById("eq-form-asset");
    if (formAsset) {
        formAsset.onsubmit = handleAssetFormSubmit;
    }

    // Quick Status Form Submit
    const formStatus = document.getElementById("eq-form-quick-status");
    if (formStatus) {
        formStatus.onsubmit = handleQuickStatusSubmit;
    }

    // Record Maintenance Log Form Submit
    const formLog = document.getElementById("eq-form-record-log");
    if (formLog) {
        formLog.onsubmit = handleRecordLogSubmit;
    }
}

/**
 * Load location options and populate selects
 */
async function loadLocations() {
    try {
        const res = await fetchEquipmentLocations();
        if (res && res.data) {
            state.locations = res.data;
            populateLocationSelects();
        }
    } catch (err) {
        console.error("Failed to load equipment locations:", err);
    }
}

function populateLocationSelects() {
    const { facilities, departments, buildings, wards, rooms } = state.locations;

    const filterDept = document.getElementById("eq-filter-department");
    if (filterDept) {
        const currentVal = filterDept.value;
        filterDept.innerHTML = `<option value="">All Departments</option>` +
            (departments || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
        filterDept.value = currentVal;
    }

    const formFacility = document.getElementById("eq-form-facility");
    if (formFacility) {
        formFacility.innerHTML = `<option value="">Select Facility...</option>` +
            (facilities || []).map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");
    }

    const formDept = document.getElementById("eq-form-department");
    if (formDept) {
        formDept.innerHTML = `<option value="">Select Department...</option>` +
            (departments || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
    }

    const formBuilding = document.getElementById("eq-form-building");
    if (formBuilding) {
        formBuilding.innerHTML = `<option value="">Select Building...</option>` +
            (buildings || []).map(b => `<option value="${b.id}">${escapeHtml(b.building_name)} (${escapeHtml(b.building_code || '')})</option>`).join("");
    }

    const formWard = document.getElementById("eq-form-ward");
    if (formWard) {
        formWard.innerHTML = `<option value="">Select Ward...</option>` +
            (wards || []).map(w => `<option value="${w.id}">${escapeHtml(w.ward_name)} (${escapeHtml(w.ward_type || 'General')})</option>`).join("");
    }

    const formRoom = document.getElementById("eq-form-room");
    if (formRoom) {
        formRoom.innerHTML = `<option value="">Select Room...</option>` +
            (rooms || []).map(r => `<option value="${r.id}">Room ${escapeHtml(r.room_number)} (${escapeHtml(r.room_type || 'Standard')})</option>`).join("");
    }
}

/**
 * Load fleet metrics KPI
 */
async function loadMetrics() {
    try {
        const res = await fetchEquipmentMetrics();
        if (res && res.data) {
            state.metrics = res.data;
            renderMetrics(res.data);
        }
    } catch (err) {
        console.error("Failed to load equipment metrics:", err);
    }
}

function renderMetrics(m) {
    document.getElementById("eq-kpi-total").innerText = m.total_assets || 0;
    document.getElementById("eq-kpi-critical").innerText = `${m.life_critical_count || 0} Life Critical`;
    document.getElementById("eq-kpi-operational").innerText = m.operational_count || 0;
    document.getElementById("eq-kpi-rate").innerText = `${m.operational_rate || 0}% Active`;
    document.getElementById("eq-kpi-needs-calibration").innerText = m.needs_calibration_count || 0;
    document.getElementById("eq-kpi-due-30").innerText = `(${m.calibration_due_30_days || 0} due in 30d)`;
    document.getElementById("eq-kpi-out-of-service").innerText = (m.under_repair_count || 0) + (m.decommissioned_count || 0);
    document.getElementById("eq-kpi-repair-detail").innerText = `${m.under_repair_count || 0} under repair`;
}

/**
 * Load fleet assets
 */
async function loadAssets() {
    const tbody = document.getElementById("eq-table-body");
    const countEl = document.getElementById("eq-table-count");

    try {
        const res = await fetchEquipmentAssets(state.filters);
        if (res && res.data) {
            state.assets = res.data;
            renderAssetsTable(res.data);
            if (countEl) countEl.innerText = `Showing ${res.data.length} equipment machinery records`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">Failed to load assets: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderAssetsTable(assets) {
    const tbody = document.getElementById("eq-table-body");
    if (!assets || assets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--text-muted, #94a3b8);">No equipment assets matching filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = assets.map(a => {
        const critClass = a.criticality_level === 'Life Critical' ? 'eq-criticality-life' :
                         a.criticality_level === 'High' ? 'eq-criticality-high' :
                         a.criticality_level === 'Medium' ? 'eq-criticality-medium' : 'eq-criticality-low';

        let statusClass = 'eq-badge-operational';
        if (a.status === 'Needs Calibration') statusClass = 'eq-badge-calibration';
        else if (a.status === 'Under Repair') statusClass = 'eq-badge-repair';
        else if (a.status === 'Decommissioned') statusClass = 'eq-badge-decommissioned';

        let calibInfo = `<span style="color: #64748b;">Not scheduled</span>`;
        if (a.next_calibration_due) {
            if (a.is_calibration_overdue == 1) {
                calibInfo = `<span style="color: #ef4444; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Overdue (${escapeHtml(a.next_calibration_due)})
                </span>`;
            } else if (a.days_until_calibration <= 30) {
                calibInfo = `<span style="color: #d97706; font-weight: 600;">Due in ${a.days_until_calibration}d (${escapeHtml(a.next_calibration_due)})</span>`;
            } else {
                calibInfo = `<span style="color: #15803d;">${escapeHtml(a.next_calibration_due)}</span>`;
            }
        }

        const locationStr = [a.department_name, a.ward_name, a.room_number ? `Rm ${a.room_number}` : null].filter(Boolean).join(" &bull; ") || "Unassigned";

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <td style="padding: 12px 16px; font-weight: 600; font-family: monospace; color: #2563eb;">
                    ${escapeHtml(a.asset_tag)}
                </td>
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 600; color: var(--text-primary, #0f172a);">${escapeHtml(a.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted, #64748b);">
                        ${escapeHtml(a.manufacturer || 'Unknown Mfg')} &bull; Model: ${escapeHtml(a.model_number || 'N/A')} &bull; S/N: ${escapeHtml(a.serial_number || 'N/A')}
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <div style="margin-bottom: 4px; font-size: 0.8125rem;">${escapeHtml(a.category)}</div>
                    <span class="eq-badge ${critClass}">${escapeHtml(a.criticality_level)}</span>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    ${locationStr}
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    ${calibInfo}
                </td>
                <td style="padding: 12px 16px;">
                    <span class="eq-badge ${statusClass}">${escapeHtml(a.status)}</span>
                </td>
                <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                    <button class="btn btn-sm btn-outline eq-btn-action-logs" data-id="${a.id}" data-name="${escapeHtml(a.name)}" data-tag="${escapeHtml(a.asset_tag)}" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;" title="View / Add Maintenance Log">
                        Logs
                    </button>
                    <button class="btn btn-sm btn-outline eq-btn-action-status" data-id="${a.id}" data-name="${escapeHtml(a.name)}" data-tag="${escapeHtml(a.asset_tag)}" data-status="${a.status}" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; margin-left: 4px;" title="Change Status">
                        Status
                    </button>
                    <button class="btn btn-sm btn-outline eq-btn-action-edit" data-id="${a.id}" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; margin-left: 4px;" title="Edit Asset">
                        Edit
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Attach row events
    tbody.querySelectorAll(".eq-btn-action-logs").forEach(b => {
        b.onclick = () => openLogsModal(parseInt(b.getAttribute("data-id"), 10), b.getAttribute("data-name"), b.getAttribute("data-tag"));
    });
    tbody.querySelectorAll(".eq-btn-action-status").forEach(b => {
        b.onclick = () => openStatusModal(parseInt(b.getAttribute("data-id"), 10), b.getAttribute("data-name"), b.getAttribute("data-tag"), b.getAttribute("data-status"));
    });
    tbody.querySelectorAll(".eq-btn-action-edit").forEach(b => {
        b.onclick = () => openAssetModal(parseInt(b.getAttribute("data-id"), 10));
    });
}

/* =====================================================================
   PREVENTIVE MAINTENANCE (PM) CALENDAR & SCHEDULES LOGIC
===================================================================== */

/**
 * Load PM Calendar Summary KPIs
 */
async function loadPMSummary() {
    try {
        const res = await fetchPMSummary();
        if (res && res.data) {
            state.pmSummary = res.data;
            renderPMSummary(res.data);
        }
    } catch (err) {
        console.error("Failed to load PM summary:", err);
    }
}

function renderPMSummary(s) {
    document.getElementById("biomed-kpi-active-schedules").innerText = s.active_schedules || 0;
    document.getElementById("biomed-kpi-total-schedules").innerText = `${s.total_schedules || 0} total tracked`;
    document.getElementById("biomed-kpi-critical").innerText = s.life_critical_schedules || 0;
    document.getElementById("biomed-kpi-overdue").innerText = s.overdue_schedules || 0;
    document.getElementById("biomed-kpi-due-month").innerText = s.due_this_month || 0;
    document.getElementById("biomed-kpi-due-30").innerText = `${s.due_in_30_days || 0} in next 30 days`;
    document.getElementById("biomed-kpi-compliance").innerText = `${s.compliance_rate || 100}%`;

    // Overdue badge on navigation tab
    const badgeOverdue = document.getElementById("biomed-tab-overdue-count");
    if (badgeOverdue) {
        if (s.overdue_schedules > 0) {
            badgeOverdue.innerText = s.overdue_schedules;
            badgeOverdue.style.display = "inline-block";
        } else {
            badgeOverdue.style.display = "none";
        }
    }

    // Work order summary counts
    document.getElementById("biomed-kpi-wo-total").innerText = s.total_work_orders || 0;
    document.getElementById("biomed-kpi-wo-open").innerText = s.open_work_orders || 0;
    document.getElementById("biomed-kpi-wo-completed").innerText = s.completed_work_orders || 0;
    document.getElementById("biomed-kpi-wo-quarantined").innerText = s.quarantined_work_orders || 0;

    const badgeWO = document.getElementById("biomed-tab-open-wo-count");
    if (badgeWO) {
        if (s.open_work_orders > 0) {
            badgeWO.innerText = s.open_work_orders;
            badgeWO.style.display = "inline-block";
        } else {
            badgeWO.style.display = "none";
        }
    }
}

/**
 * Load PM Schedules
 */
async function loadPMSchedules() {
    const tbody = document.getElementById("biomed-pm-table-body");
    const countEl = document.getElementById("biomed-pm-table-count");

    try {
        const res = await fetchPMSchedules(state.pmFilters);
        if (res && res.data) {
            state.pmSchedules = res.data;
            renderPMSchedulesTable(res.data);
            if (countEl) countEl.innerText = `Showing ${res.data.length} PM schedules`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">Failed to load PM schedules: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderPMSchedulesTable(schedules) {
    const tbody = document.getElementById("biomed-pm-table-body");
    if (!schedules || schedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--text-muted, #94a3b8);">No Preventive Maintenance schedules found matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = schedules.map(s => {
        // Criticality badge
        const critClass = s.criticality_tier === 'life_critical' ? 'eq-criticality-life' :
                         s.criticality_tier === 'high' ? 'eq-criticality-high' :
                         s.criticality_tier === 'medium' ? 'eq-criticality-medium' : 'eq-criticality-low';
        const critLabel = s.criticality_tier === 'life_critical' ? 'STAT Life-Critical' :
                         s.criticality_tier === 'high' ? 'High Criticality' :
                         s.criticality_tier === 'medium' ? 'Medium' : 'Low';

        // Frequency Label
        const freqLabel = s.frequency === 'monthly' ? 'Monthly' :
                         s.frequency === 'bi_monthly' ? 'Bi-Monthly (60d)' :
                         s.frequency === 'quarterly' ? 'Quarterly' :
                         s.frequency === 'semi_annual' ? 'Semi-Annual (6m)' :
                         s.frequency === 'annual' ? 'Annual (12m)' : 'Biennial (2y)';

        // Countdown Days badge
        let dueBadge = '';
        if (s.urgency_status === 'overdue') {
            const overdueDays = Math.abs(s.days_until_due);
            dueBadge = `<div style="color: #b91c1c; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: rgba(239,68,68,0.1); padding: 2px 6px; border-radius: 4px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Overdue by ${overdueDays}d
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Due: ${escapeHtml(s.next_due_date)}</div>`;
        } else if (s.urgency_status === 'due_soon') {
            dueBadge = `<div style="color: #b45309; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: rgba(245,158,11,0.15); padding: 2px 6px; border-radius: 4px;">
                Due in ${s.days_until_due}d
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Due: ${escapeHtml(s.next_due_date)}</div>`;
        } else {
            dueBadge = `<div style="color: #15803d; font-weight: 600;">In ${s.days_until_due}d</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Due: ${escapeHtml(s.next_due_date)}</div>`;
        }

        const taskCount = s.task_count || 0;

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 700; font-family: monospace; color: #2563eb;">${escapeHtml(s.schedule_code)}</div>
                    <span class="eq-badge ${critClass}" style="margin-top: 4px;">${critLabel}</span>
                </td>
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 600; color: #0f172a;">${escapeHtml(s.equipment_name)}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        Tag: <strong style="color: #2563eb;">${escapeHtml(s.asset_tag)}</strong> &bull; ${escapeHtml(s.department_name || 'General')} &bull; ${escapeHtml(s.ward_name || '')}
                    </div>
                </td>
                <td style="padding: 12px 16px; max-width: 280px;">
                    <div style="font-weight: 500; font-size: 0.8125rem; color: #1e293b;">${escapeHtml(s.title)}</div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                        ${taskCount} itemized tasks &bull; ${escapeHtml(s.safety_standards_reference || 'IEC 62353')}
                    </div>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div style="font-weight: 600; color: #334155;">${freqLabel}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">~${s.estimated_duration_hours || 2}h servicing</div>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    ${dueBadge}
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div style="font-weight: 600; color: #1e293b;">${escapeHtml(s.assigned_engineer_name || 'Assigned Lead')}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(s.vendor_or_contractor_name || 'In-House')}</div>
                </td>
                <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                    <button class="btn btn-sm btn-outline biomed-btn-inspect-checklist" data-id="${s.id}" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;" title="Inspect Tasks & Tolerances">
                        Tasks (${taskCount})
                    </button>
                    <button class="btn btn-sm btn-primary biomed-btn-dispatch-wo" data-id="${s.id}" data-title="${escapeHtml(s.title)}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; background: #2563eb; color: #fff; border: none; cursor: pointer; margin-left: 4px;" title="Spawn Work Order">
                        Dispatch WO
                    </button>
                    <button class="btn btn-sm btn-outline biomed-btn-edit-sch" data-id="${s.id}" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; margin-left: 4px;" title="Edit PM Schedule">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline biomed-btn-delete-sch" data-id="${s.id}" data-code="${escapeHtml(s.schedule_code)}" style="padding: 4px 6px; font-size: 0.75rem; border: 1px solid #fca5a5; border-radius: 4px; background: #fff; color: #dc2626; cursor: pointer; margin-left: 4px;" title="Delete PM Schedule">
                        &times;
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Attach row events
    tbody.querySelectorAll(".biomed-btn-inspect-checklist").forEach(b => {
        b.onclick = () => openChecklistModal(parseInt(b.getAttribute("data-id"), 10));
    });
    tbody.querySelectorAll(".biomed-btn-dispatch-wo").forEach(b => {
        b.onclick = () => handleDispatchWorkOrder(parseInt(b.getAttribute("data-id"), 10), b.getAttribute("data-title"));
    });
    tbody.querySelectorAll(".biomed-btn-edit-sch").forEach(b => {
        b.onclick = () => openScheduleModal(parseInt(b.getAttribute("data-id"), 10));
    });
    tbody.querySelectorAll(".biomed-btn-delete-sch").forEach(b => {
        b.onclick = () => handleDeleteSchedule(parseInt(b.getAttribute("data-id"), 10), b.getAttribute("data-code"));
    });
}

/**
 * Open PM Checklist Inspector modal
 */
async function openChecklistModal(scheduleId) {
    try {
        const res = await fetchPMSchedule(scheduleId);
        if (!res || !res.data) {
            showToast("Failed to load PM schedule details.", "error");
            return;
        }

        const s = res.data;
        state.selectedSchedule = s;

        document.getElementById("biomed-checklist-sch-code").innerText = `${s.schedule_code} &bull; ${s.frequency.toUpperCase()}`;
        document.getElementById("biomed-checklist-title").innerText = s.title;
        document.getElementById("biomed-checklist-asset").innerText = `${s.equipment_name} (${s.asset_tag})`;
        document.getElementById("biomed-checklist-location").innerText = `${s.department_name || 'General Facility'} &bull; ${s.ward_name || ''}`;
        document.getElementById("biomed-checklist-freq").innerText = `${s.frequency} (Interval: ${s.interval_months} mo)`;
        document.getElementById("biomed-checklist-standard").innerText = s.safety_standards_reference || 'IEC 62353 / NFPA 99';

        const tbody = document.getElementById("biomed-checklist-table-body");
        const tasks = s.task_checklist || [];

        if (tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 24px; text-align: center; color: #94a3b8;">No checklist tasks configured for this PM schedule.</td></tr>`;
        } else {
            tbody.innerHTML = tasks.map(t => {
                const critBadge = t.is_critical
                    ? `<span style="background: rgba(220,38,38,0.1); color: #dc2626; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">MANDATORY</span>`
                    : `<span style="background: rgba(100,116,139,0.1); color: #64748b; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Routine</span>`;

                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 12px; font-weight: 600; color: #64748b;">${t.task_no || 1}</td>
                        <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${escapeHtml(t.task_name)}</td>
                        <td style="padding: 10px 12px; color: #475569; font-family: monospace; font-size: 0.75rem;">${escapeHtml(t.standards_or_tolerance || 'Per OEM Spec')}</td>
                        <td style="padding: 10px 12px; text-align: center;">${critBadge}</td>
                    </tr>
                `;
            }).join("");
        }

        openModal("biomed-modal-checklist");
    } catch (err) {
        showToast("Error inspecting checklist: " + err.message, "error");
    }
}

/**
 * Handle dispatching work order from PM schedule
 */
async function handleDispatchWorkOrder(scheduleId, title) {
    if (!confirm(`Dispatch an immediate Biomedical Work Order for "${title}"?`)) return;

    try {
        const today = new Date().toISOString().split("T")[0];
        const res = await generateWorkOrderFromSchedule(scheduleId, today, "Dispatched directly from PM Calendar");
        if (res && res.success) {
            showToast(res.message || "Work order generated successfully!", "success");
            await Promise.all([loadPMSummary(), loadPMSchedules(), loadWorkOrders()]);
            // Switch to work orders tab to view
            switchBiomedTab("workorders");
        } else {
            showToast(res.message || "Failed to dispatch work order.", "error");
        }
    } catch (err) {
        showToast("Error dispatching work order: " + err.message, "error");
    }
}

/**
 * Open PM Schedule Modal (Create or Edit)
 */
async function openScheduleModal(id = null) {
    const form = document.getElementById("biomed-form-schedule");
    form.reset();

    // Populate machinery asset select
    const assetSelect = document.getElementById("biomed-sch-asset-id");
    if (assetSelect) {
        assetSelect.innerHTML = `<option value="">Select machinery asset...</option>` +
            state.assets.map(a => `<option value="${a.id}">[${escapeHtml(a.asset_tag)}] ${escapeHtml(a.name)} (${escapeHtml(a.department_name || 'General')})</option>`).join("");
    }

    const container = document.getElementById("biomed-checklist-container");
    container.innerHTML = "";

    if (id) {
        document.getElementById("biomed-modal-schedule-title").innerText = "Edit Preventive Maintenance Schedule";
        try {
            const res = await fetchPMSchedule(id);
            if (res && res.data) {
                const s = res.data;
                document.getElementById("biomed-sch-id").value = s.id;
                document.getElementById("biomed-sch-asset-id").value = s.asset_id;
                document.getElementById("biomed-sch-tier").value = s.criticality_tier;
                document.getElementById("biomed-sch-title").value = s.title;
                document.getElementById("biomed-sch-type").value = s.maintenance_type;
                document.getElementById("biomed-sch-frequency").value = s.frequency;
                document.getElementById("biomed-sch-duration").value = s.estimated_duration_hours;
                document.getElementById("biomed-sch-next-due").value = s.next_due_date;
                document.getElementById("biomed-sch-grace").value = s.grace_period_days;
                document.getElementById("biomed-sch-last-performed").value = s.last_performed_date || "";
                document.getElementById("biomed-sch-engineer").value = s.assigned_engineer_name || "";
                document.getElementById("biomed-sch-vendor").value = s.vendor_or_contractor_name || "";
                document.getElementById("biomed-sch-standards").value = s.safety_standards_reference || "";

                const tasks = s.task_checklist || [];
                if (tasks.length > 0) {
                    tasks.forEach(t => addTaskRowToScheduleModal(t.task_name, t.standards_or_tolerance, t.is_critical));
                } else {
                    addDefaultTaskRows();
                }
            }
        } catch (err) {
            showToast("Failed to load schedule for editing.", "error");
            return;
        }
    } else {
        document.getElementById("biomed-modal-schedule-title").innerText = "Configure Preventive Maintenance (PM) Schedule";
        document.getElementById("biomed-sch-id").value = "";
        // Default next due in 30 days
        const d = new Date();
        d.setDate(d.getDate() + 30);
        document.getElementById("biomed-sch-next-due").value = d.toISOString().split("T")[0];
        addDefaultTaskRows();
    }

    openModal("biomed-modal-schedule");
}

function addDefaultTaskRows() {
    addTaskRowToScheduleModal("Visual Physical & Integrity Inspection", "No cracks, fluid ingress, or cable fraying", true);
    addTaskRowToScheduleModal("IEC 62353 Electrical Safety Analyzer", "Chassis leakage < 100 uA, Ground bond < 0.200 Ohm", true);
    addTaskRowToScheduleModal("Operational Calibration & Transducer Check", "OEM accuracy within +/- 3%", true);
    addTaskRowToScheduleModal("Battery Capacity & Emergency Backup Test", "Holds rated operating load >= 30 mins", false);
    addTaskRowToScheduleModal("Safety Alarm & Auto-Cutoff Verification", "Audio/visual high-priority alarms trip correctly", true);
}

function addTaskRowToScheduleModal(name = "", standard = "", isCritical = true) {
    const container = document.getElementById("biomed-checklist-container");
    const count = container.children.length + 1;

    const row = document.createElement("div");
    row.className = "biomed-task-row";
    row.style = "display: grid; grid-template-columns: 24px 1.5fr 1.5fr 90px 24px; gap: 8px; align-items: center; background: #fff; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1;";
    row.innerHTML = `
        <span style="font-size: 0.75rem; font-weight: 700; color: #64748b;">${count}</span>
        <input type="text" placeholder="Task description..." value="${escapeHtml(name)}" class="task-input-name" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px;">
        <input type="text" placeholder="Standard / tolerance..." value="${escapeHtml(standard)}" class="task-input-std" style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px;">
        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 600; color: #dc2626; cursor: pointer;">
            <input type="checkbox" class="task-input-crit" ${isCritical ? 'checked' : ''}> Critical
        </label>
        <button type="button" class="btn-remove-row" style="background: none; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; padding: 0;">&times;</button>
    `;

    row.querySelector(".btn-remove-row").onclick = () => row.remove();
    container.appendChild(row);
}

async function handleScheduleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("biomed-sch-id").value;
    const taskRows = document.querySelectorAll("#biomed-checklist-container .biomed-task-row");
    const taskChecklist = [];

    taskRows.forEach((r, idx) => {
        const name = r.querySelector(".task-input-name").value.trim();
        const std = r.querySelector(".task-input-std").value.trim();
        const crit = r.querySelector(".task-input-crit").checked;
        if (name) {
            taskChecklist.push({
                task_no: idx + 1,
                task_name: name,
                standards_or_tolerance: std,
                is_critical: crit
            });
        }
    });

    const payload = {
        asset_id: parseInt(document.getElementById("biomed-sch-asset-id").value, 10),
        title: document.getElementById("biomed-sch-title").value.trim(),
        maintenance_type: document.getElementById("biomed-sch-type").value,
        frequency: document.getElementById("biomed-sch-frequency").value,
        criticality_tier: document.getElementById("biomed-sch-tier").value,
        estimated_duration_hours: parseFloat(document.getElementById("biomed-sch-duration").value) || 2.0,
        next_due_date: document.getElementById("biomed-sch-next-due").value,
        grace_period_days: parseInt(document.getElementById("biomed-sch-grace").value, 10) || 14,
        last_performed_date: document.getElementById("biomed-sch-last-performed").value || null,
        assigned_engineer_name: document.getElementById("biomed-sch-engineer").value.trim(),
        vendor_or_contractor_name: document.getElementById("biomed-sch-vendor").value.trim(),
        safety_standards_reference: document.getElementById("biomed-sch-standards").value.trim(),
        is_auto_generate_work_order: document.getElementById("biomed-sch-auto-wo").checked ? 1 : 0,
        task_checklist: taskChecklist
    };

    try {
        let res;
        if (id) {
            res = await updatePMSchedule(parseInt(id, 10), payload);
        } else {
            res = await createPMSchedule(payload);
        }

        if (res && res.success) {
            showToast(res.message || "PM schedule saved successfully.", "success");
            closeModal("biomed-modal-schedule");
            await Promise.all([loadPMSummary(), loadPMSchedules(), loadWorkOrders()]);
        } else {
            showToast(res.message || "Failed to save PM schedule.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

async function handleDeleteSchedule(id, code) {
    if (!confirm(`Are you sure you want to delete Preventive Maintenance schedule "${code}"?`)) return;

    try {
        const res = await deletePMSchedule(id);
        if (res && res.success) {
            showToast(res.message || "PM schedule deleted.", "success");
            await Promise.all([loadPMSummary(), loadPMSchedules()]);
        } else {
            showToast(res.message || "Failed to delete schedule.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error.", "error");
    }
}

/* =====================================================================
   WORK ORDERS & BREAKDOWN REPAIRS LOGIC
===================================================================== */

/**
 * Load Work Orders
 */
async function loadWorkOrders() {
    const tbody = document.getElementById("biomed-wo-table-body");
    const countEl = document.getElementById("biomed-wo-table-count");

    try {
        const res = await fetchBiomedWorkOrders(state.woFilters);
        if (res && res.data) {
            state.workOrders = res.data;
            renderWorkOrdersTable(res.data);
            if (countEl) countEl.innerText = `Showing ${res.data.length} work orders`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #ef4444;">Failed to load work orders: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderWorkOrdersTable(orders) {
    const tbody = document.getElementById("biomed-wo-table-body");
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--text-muted, #94a3b8);">No Biomedical Work Orders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(wo => {
        let statusBadge = '';
        if (wo.status === 'completed_passed') {
            statusBadge = `<span style="background: rgba(16,185,129,0.15); color: #15803d; font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 9999px;">Completed & Passed</span>`;
        } else if (wo.status === 'failed_quarantined') {
            statusBadge = `<span style="background: rgba(239,68,68,0.15); color: #b91c1c; font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 9999px;">Failed &amp; Quarantined</span>`;
        } else if (wo.status === 'in_progress') {
            statusBadge = `<span style="background: rgba(37,99,235,0.15); color: #2563eb; font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 9999px;">In Progress</span>`;
        } else {
            statusBadge = `<span style="background: rgba(100,116,139,0.15); color: #64748b; font-weight: 600; font-size: 0.75rem; padding: 3px 8px; border-radius: 9999px;">Scheduled</span>`;
        }

        const prioBadge = wo.priority === 'stat_life_critical'
            ? `<span style="color: #dc2626; font-weight: 700; font-size: 0.75rem;">STAT Life Critical</span>`
            : `<span style="color: #64748b; font-size: 0.75rem;">${escapeHtml(wo.priority)}</span>`;

        const elecPass = wo.electrical_safety_passed == 1
            ? `<span style="color: #15803d; font-size: 0.75rem; font-weight: 600;">IEC 62353 PASS</span>`
            : `<span style="color: #ef4444; font-size: 0.75rem; font-weight: 700;">ELEC FAIL</span>`;

        const calibPass = wo.calibration_passed == 1
            ? `<span style="color: #15803d; font-size: 0.75rem; font-weight: 600;">Calib PASS</span>`
            : `<span style="color: #ef4444; font-size: 0.75rem; font-weight: 700;">Calib FAIL</span>`;

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 700; font-family: monospace; color: #2563eb;">${escapeHtml(wo.work_order_number)}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(wo.scheduled_date)}</div>
                </td>
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 600; color: #0f172a;">${escapeHtml(wo.equipment_name)}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">Tag: <strong style="color: #2563eb;">${escapeHtml(wo.asset_tag)}</strong> &bull; ${escapeHtml(wo.department_name || '')}</div>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div>${escapeHtml(wo.work_order_type)}</div>
                    <div>${prioBadge}</div>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div style="font-weight: 600;">${escapeHtml(wo.lead_engineer_name)}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(wo.service_vendor_name || 'In-House')}</div>
                </td>
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div>${elecPass}</div>
                    <div>${calibPass}</div>
                </td>
                <td style="padding: 12px 16px;">
                    ${statusBadge}
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                    <button class="btn btn-sm btn-primary biomed-btn-execute-wo" data-id="${wo.id}" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; background: #2563eb; color: #fff; border: none; cursor: pointer;">
                        Execute / Signoff
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".biomed-btn-execute-wo").forEach(b => {
        b.onclick = () => openWorkOrderModal(parseInt(b.getAttribute("data-id"), 10));
    });
}

/**
 * Open Work Order Modal for inspection, electrical safety values, and supervisor signoff
 */
async function openWorkOrderModal(id) {
    try {
        const res = await fetchBiomedWorkOrder(id);
        if (!res || !res.data) {
            showToast("Failed to load work order.", "error");
            return;
        }

        const wo = res.data;
        document.getElementById("biomed-wo-id").value = wo.id;
        document.getElementById("biomed-wo-modal-no").innerText = `${wo.work_order_number} &bull; ${wo.work_order_type.toUpperCase()}`;
        document.getElementById("biomed-wo-modal-title").innerText = `Work Order: ${wo.equipment_name}`;

        document.getElementById("biomed-wo-asset-tag").innerText = `${wo.equipment_name} (${wo.asset_tag}) &bull; S/N: ${wo.serial_number || 'N/A'}`;
        document.getElementById("biomed-wo-eng-name").innerText = `${wo.lead_engineer_name} (${wo.service_vendor_name || 'In-House Biomed'})`;

        document.getElementById("biomed-wo-status").value = wo.status;
        document.getElementById("biomed-wo-scheduled-date").value = wo.scheduled_date;
        document.getElementById("biomed-wo-completed-at").value = wo.completed_at ? wo.completed_at.replace(" ", "T").substring(0, 16) : "";

        document.getElementById("biomed-wo-leakage").value = wo.chassis_leakage_microamp || "";
        document.getElementById("biomed-wo-resistance").value = wo.ground_resistance_ohms || "";
        document.getElementById("biomed-wo-elec-pass").value = wo.electrical_safety_passed ? "1" : "0";
        document.getElementById("biomed-wo-calib-pass").value = wo.calibration_passed ? "1" : "0";

        document.getElementById("biomed-wo-findings").value = wo.findings || "";
        document.getElementById("biomed-wo-actions").value = wo.corrective_actions || "";
        document.getElementById("biomed-wo-labor").value = wo.labor_hours || 0;
        document.getElementById("biomed-wo-cost").value = wo.total_cost || 0;
        document.getElementById("biomed-wo-signoff").value = wo.supervisor_signoff_by || "";

        openModal("biomed-modal-workorder");
    } catch (err) {
        showToast("Error loading work order: " + err.message, "error");
    }
}

async function handleWorkOrderFormSubmit(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("biomed-wo-id").value, 10);
    const payload = {
        status: document.getElementById("biomed-wo-status").value,
        completed_at: document.getElementById("biomed-wo-completed-at").value ? document.getElementById("biomed-wo-completed-at").value.replace("T", " ") + ":00" : null,
        chassis_leakage_microamp: document.getElementById("biomed-wo-leakage").value ? parseFloat(document.getElementById("biomed-wo-leakage").value) : null,
        ground_resistance_ohms: document.getElementById("biomed-wo-resistance").value ? parseFloat(document.getElementById("biomed-wo-resistance").value) : null,
        electrical_safety_passed: document.getElementById("biomed-wo-elec-pass").value === "1",
        calibration_passed: document.getElementById("biomed-wo-calib-pass").value === "1",
        findings: document.getElementById("biomed-wo-findings").value.trim(),
        corrective_actions: document.getElementById("biomed-wo-actions").value.trim(),
        labor_hours: parseFloat(document.getElementById("biomed-wo-labor").value) || 0,
        total_cost: parseFloat(document.getElementById("biomed-wo-cost").value) || 0,
        supervisor_signoff_by: document.getElementById("biomed-wo-signoff").value.trim()
    };

    try {
        const res = await updateBiomedWorkOrder(id, payload);
        if (res && res.success) {
            showToast(res.message || "Work order updated successfully.", "success");
            closeModal("biomed-modal-workorder");
            await Promise.all([loadPMSummary(), loadPMSchedules(), loadWorkOrders(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to update work order.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error.", "error");
    }
}

/* =====================================================================
   EXISTING ASSET CRUD & MAINTENANCE LOG HANDLERS
===================================================================== */

async function openAssetModal(id = null) {
    const form = document.getElementById("eq-form-asset");
    form.reset();

    if (id) {
        document.getElementById("eq-modal-asset-title").innerText = "Edit Equipment Asset";
        try {
            const res = await fetchEquipmentAsset(id);
            if (res && res.data) {
                const a = res.data;
                document.getElementById("eq-form-id").value = a.id;
                document.getElementById("eq-form-name").value = a.name || "";
                document.getElementById("eq-form-tag").value = a.asset_tag || "";
                document.getElementById("eq-form-category").value = a.category || "Monitoring";
                document.getElementById("eq-form-criticality").value = a.criticality_level || "Medium";
                document.getElementById("eq-form-mfg").value = a.manufacturer || "";
                document.getElementById("eq-form-model").value = a.model_number || "";
                document.getElementById("eq-form-sn").value = a.serial_number || "";
                document.getElementById("eq-form-facility").value = a.facility_id || "";
                document.getElementById("eq-form-department").value = a.department_id || "";
                document.getElementById("eq-form-building").value = a.building_id || "";
                document.getElementById("eq-form-ward").value = a.ward_id || "";
                document.getElementById("eq-form-room").value = a.room_id || "";
                document.getElementById("eq-form-purchase-date").value = a.purchase_date || "";
                document.getElementById("eq-form-purchase-cost").value = a.purchase_cost || "";
                document.getElementById("eq-form-warranty-date").value = a.warranty_expiration_date || "";
                document.getElementById("eq-form-last-calibration").value = a.last_calibration_date || "";
                document.getElementById("eq-form-next-calibration").value = a.next_calibration_due || "";
                document.getElementById("eq-form-status").value = a.status || "Operational";
                document.getElementById("eq-form-status-reason").value = a.status_reason || "";
                document.getElementById("eq-form-notes").value = a.notes || "";
            }
        } catch (err) {
            showToast("Failed to load asset for editing.", "error");
            return;
        }
    } else {
        document.getElementById("eq-modal-asset-title").innerText = "Register Equipment Asset";
        document.getElementById("eq-form-id").value = "";
    }

    openModal("eq-modal-asset");
}

async function handleAssetFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("eq-form-id").value;
    const payload = {
        name: document.getElementById("eq-form-name").value.trim(),
        asset_tag: document.getElementById("eq-form-tag").value.trim() || null,
        category: document.getElementById("eq-form-category").value,
        criticality_level: document.getElementById("eq-form-criticality").value,
        manufacturer: document.getElementById("eq-form-mfg").value.trim() || null,
        model_number: document.getElementById("eq-form-model").value.trim() || null,
        serial_number: document.getElementById("eq-form-sn").value.trim() || null,
        facility_id: document.getElementById("eq-form-facility").value || null,
        department_id: document.getElementById("eq-form-department").value || null,
        building_id: document.getElementById("eq-form-building").value || null,
        ward_id: document.getElementById("eq-form-ward").value || null,
        room_id: document.getElementById("eq-form-room").value || null,
        purchase_date: document.getElementById("eq-form-purchase-date").value || null,
        purchase_cost: document.getElementById("eq-form-purchase-cost").value || null,
        warranty_expiration_date: document.getElementById("eq-form-warranty-date").value || null,
        last_calibration_date: document.getElementById("eq-form-last-calibration").value || null,
        next_calibration_due: document.getElementById("eq-form-next-calibration").value || null,
        status: document.getElementById("eq-form-status").value,
        status_reason: document.getElementById("eq-form-status-reason").value.trim() || null,
        notes: document.getElementById("eq-form-notes").value.trim() || null
    };

    try {
        let res;
        if (id) {
            res = await updateEquipmentAsset(parseInt(id, 10), payload);
        } else {
            res = await createEquipmentAsset(payload);
        }

        if (res && res.success) {
            showToast(res.message || "Equipment asset saved successfully.", "success");
            closeModal("eq-modal-asset");
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to save equipment asset.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

function openStatusModal(id, name, tag, currentStatus) {
    document.getElementById("eq-status-asset-id").value = id;
    document.getElementById("eq-status-asset-name").innerText = name;
    document.getElementById("eq-status-asset-tag").innerText = `Tag: ${tag}`;
    document.getElementById("eq-status-select").value = currentStatus;
    document.getElementById("eq-status-reason").value = "";
    openModal("eq-modal-status");
}

async function handleQuickStatusSubmit(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("eq-status-asset-id").value, 10);
    const status = document.getElementById("eq-status-select").value;
    const reason = document.getElementById("eq-status-reason").value.trim();

    try {
        const res = await updateEquipmentStatus(id, status, reason);
        if (res && res.success) {
            showToast("Asset status updated.", "success");
            closeModal("eq-modal-status");
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to update status.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

async function openLogsModal(id, name, tag) {
    document.getElementById("eq-log-equipment-id").value = id;
    document.getElementById("eq-logs-asset-header").innerText = `${name} (${tag})`;
    document.getElementById("eq-form-record-log").reset();
    document.getElementById("eq-log-date").value = new Date().toISOString().split("T")[0];

    try {
        const res = await fetchEquipmentAsset(id);
        if (res && res.data) {
            renderLogsTable(res.data.maintenance_logs || []);
        }
    } catch (err) {
        console.error("Failed to load logs:", err);
    }

    openModal("eq-modal-logs");
}

function renderLogsTable(logs) {
    const tbody = document.getElementById("eq-logs-table-body");
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #94a3b8);">No maintenance history records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(l => {
        const resultColor = l.result_status === 'Pass' ? '#15803d' : l.result_status === 'Fail' ? '#b91c1c' : '#d97706';
        return `
            <tr style="border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <td style="padding: 8px 12px; font-weight: 500;">${escapeHtml(l.performed_date)}</td>
                <td style="padding: 8px 12px;">
                    <span style="font-weight: 600; color: #2563eb;">${escapeHtml(l.log_type)}</span>
                </td>
                <td style="padding: 8px 12px;">
                    <span style="color: ${resultColor}; font-weight: 600;">${escapeHtml(l.result_status)}</span>
                </td>
                <td style="padding: 8px 12px; color: #475569;">${escapeHtml(l.performed_by || 'N/A')}</td>
                <td style="padding: 8px 12px; max-width: 250px;">
                    <div>${escapeHtml(l.findings || 'No findings recorded')}</div>
                    ${l.actions_taken ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Action: ${escapeHtml(l.actions_taken)}</div>` : ''}
                </td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 500;">
                    ${formatCurrency(l.cost)}
                </td>
            </tr>
        `;
    }).join("");
}

async function handleRecordLogSubmit(e) {
    e.preventDefault();

    const equipmentId = parseInt(document.getElementById("eq-log-equipment-id").value, 10);
    const payload = {
        log_type: document.getElementById("eq-log-type").value,
        performed_date: document.getElementById("eq-log-date").value,
        result_status: document.getElementById("eq-log-result").value,
        performed_by: document.getElementById("eq-log-performed-by").value.trim(),
        next_due_date: document.getElementById("eq-log-next-due").value || null,
        cost: document.getElementById("eq-log-cost").value || null,
        findings: document.getElementById("eq-log-findings").value.trim(),
        actions_taken: document.getElementById("eq-log-actions").value.trim()
    };

    try {
        const res = await recordEquipmentLog(equipmentId, payload);
        if (res && res.success) {
            showToast("Maintenance / Calibration log recorded successfully.", "success");
            await openLogsModal(equipmentId);
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to record log.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
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

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
