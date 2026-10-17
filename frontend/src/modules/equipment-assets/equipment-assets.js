import {
    fetchEquipmentAssets,
    fetchEquipmentMetrics,
    fetchEquipmentLocations,
    fetchEquipmentAsset,
    createEquipmentAsset,
    updateEquipmentAsset,
    updateEquipmentStatus,
    recordEquipmentLog,
    deleteEquipmentAsset
} from "./equipment-assets.service.js";
import { showToast } from "../../core/toast.js";

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
    selectedAsset: null
};

/**
 * Initialize Equipment Assets Module
 */
export async function initEquipmentAssets(user = {}) {
    state.user = user;

    // Attach listeners
    setupEventListeners();

    // Initial loads
    await loadLocations();
    await Promise.all([
        loadMetrics(),
        loadAssets()
    ]);
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
    // Refresh button
    const btnRefresh = document.getElementById("eq-btn-refresh");
    if (btnRefresh) {
        btnRefresh.onclick = async () => {
            await Promise.all([loadMetrics(), loadAssets()]);
            showToast("Equipment data refreshed.", "info");
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

    // Filter Department select
    const filterDept = document.getElementById("eq-filter-department");
    if (filterDept) {
        const currentVal = filterDept.value;
        filterDept.innerHTML = `<option value="">All Departments</option>` +
            (departments || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
        filterDept.value = currentVal;
    }

    // Modal Facility select
    const formFacility = document.getElementById("eq-form-facility");
    if (formFacility) {
        formFacility.innerHTML = `<option value="">Select Facility...</option>` +
            (facilities || []).map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");
    }

    // Modal Department select
    const formDept = document.getElementById("eq-form-department");
    if (formDept) {
        formDept.innerHTML = `<option value="">Select Department...</option>` +
            (departments || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
    }

    // Modal Building select
    const formBuilding = document.getElementById("eq-form-building");
    if (formBuilding) {
        formBuilding.innerHTML = `<option value="">Select Building...</option>` +
            (buildings || []).map(b => `<option value="${b.id}">${escapeHtml(b.building_name)} (${escapeHtml(b.building_code || '')})</option>`).join("");
    }

    // Modal Ward select
    const formWard = document.getElementById("eq-form-ward");
    if (formWard) {
        formWard.innerHTML = `<option value="">Select Ward...</option>` +
            (wards || []).map(w => `<option value="${w.id}">${escapeHtml(w.ward_name)} (${escapeHtml(w.ward_type || 'General')})</option>`).join("");
    }

    // Modal Room select
    const formRoom = document.getElementById("eq-form-room");
    if (formRoom) {
        formRoom.innerHTML = `<option value="">Select Room...</option>` +
            (rooms || []).map(r => `<option value="${r.id}">Room ${escapeHtml(r.room_number)} (${escapeHtml(r.room_type || 'Standard')})</option>`).join("");
    }
}

/**
 * Load and display KPI summary metrics
 */
async function loadMetrics() {
    try {
        const res = await fetchEquipmentMetrics();
        if (res && res.data) {
            state.metrics = res.data;
            const m = res.data;

            const elTotal = document.getElementById("eq-kpi-total");
            const elCritical = document.getElementById("eq-kpi-critical");
            const elOperational = document.getElementById("eq-kpi-operational");
            const elRate = document.getElementById("eq-kpi-rate");
            const elNeedsCalib = document.getElementById("eq-kpi-needs-calibration");
            const elDue30 = document.getElementById("eq-kpi-due-30");
            const elOutOfService = document.getElementById("eq-kpi-out-of-service");
            const elRepairDetail = document.getElementById("eq-kpi-repair-detail");

            if (elTotal) elTotal.textContent = m.total_assets ?? 0;
            if (elCritical) elCritical.textContent = `${m.life_critical_count ?? 0} Life Critical`;
            if (elOperational) elOperational.textContent = m.operational ?? 0;
            if (elRate) elRate.textContent = `${m.operational_rate ?? 0}% Active`;
            if (elNeedsCalib) elNeedsCalib.textContent = m.needs_calibration ?? 0;
            if (elDue30) elDue30.textContent = `(${m.due_in_30_days ?? 0} due in 30d)`;
            if (elOutOfService) elOutOfService.textContent = m.out_of_service ?? 0;
            if (elRepairDetail) elRepairDetail.textContent = `${m.under_repair ?? 0} in repair, ${m.decommissioned ?? 0} retired`;
        }
    } catch (err) {
        console.error("Failed to load equipment metrics:", err);
    }
}

/**
 * Load and display equipment assets in table
 */
async function loadAssets() {
    const tbody = document.getElementById("eq-table-body");
    const countEl = document.getElementById("eq-table-count");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 30px; text-align: center; color: var(--text-muted, #94a3b8);">
                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; animation: eq-spin 0.8s linear infinite;"></div>
                    <div style="margin-top: 8px;">Refreshing equipment fleet...</div>
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetchEquipmentAssets(state.filters);
        state.assets = (res && res.data) ? res.data : [];

        if (countEl) {
            countEl.textContent = `Showing ${state.assets.length} equipment machinery ${state.assets.length === 1 ? 'unit' : 'units'}`;
        }

        renderTable();
    } catch (err) {
        console.error("Failed to load assets:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 24px; text-align: center; color: #dc2626;">
                        Failed to retrieve equipment assets. Please check network connection.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Render equipment rows into tbody
 */
function renderTable() {
    const tbody = document.getElementById("eq-table-body");
    if (!tbody) return;

    if (!state.assets || state.assets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: var(--text-muted, #64748b);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <div style="font-weight: 600; font-size: 0.9375rem;">No equipment assets found</div>
                    <div style="font-size: 0.8125rem; margin-top: 4px;">Try adjusting your search criteria or register a new biomedical asset.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.assets.map(asset => {
        // Criticality badge class
        let critClass = "eq-criticality-medium";
        if (asset.criticality_level === "Life Critical") critClass = "eq-criticality-life";
        else if (asset.criticality_level === "High") critClass = "eq-criticality-high";
        else if (asset.criticality_level === "Low") critClass = "eq-criticality-low";

        // Status badge class
        let statusClass = "eq-badge-operational";
        if (asset.status === "Needs Calibration") statusClass = "eq-badge-calibration";
        else if (asset.status === "Under Repair") statusClass = "eq-badge-repair";
        else if (asset.status === "Decommissioned") statusClass = "eq-badge-decommissioned";

        // Location text
        const locParts = [];
        if (asset.department_name) locParts.push(`<b>${escapeHtml(asset.department_name)}</b>`);
        if (asset.ward_name) locParts.push(escapeHtml(asset.ward_name));
        if (asset.room_number) locParts.push(`Room ${escapeHtml(asset.room_number)}`);
        const locDisplay = locParts.length > 0 ? locParts.join(" &bull; ") : '<span style="color:#94a3b8;">Unassigned</span>';

        // Calibration Due Display
        let calibHtml = '<span style="color: #94a3b8;">Not scheduled</span>';
        if (asset.next_calibration_due) {
            const days = parseInt(asset.days_until_calibration, 10);
            if (days < 0) {
                calibHtml = `
                    <div style="display: flex; align-items: center; gap: 4px; color: #dc2626; font-weight: 600;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <span>Overdue by ${Math.abs(days)}d</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">Due: ${asset.next_calibration_due}</div>
                `;
            } else if (days <= 30) {
                calibHtml = `
                    <div style="display: flex; align-items: center; gap: 4px; color: #d97706; font-weight: 600;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>Due in ${days}d</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">Due: ${asset.next_calibration_due}</div>
                `;
            } else {
                calibHtml = `
                    <div style="color: #16a34a; font-weight: 500;">In ${days} days</div>
                    <div style="font-size: 0.75rem; color: #64748b;">Due: ${asset.next_calibration_due}</div>
                `;
            }
        }

        return `
            <tr style="border-bottom: 1px solid var(--border-color, #f1f5f9); transition: background 0.15s ease;" onmouseover="this.style.background='var(--bg-row-hover, #f8fafc)'" onmouseout="this.style.background='transparent'">
                <!-- Tag -->
                <td style="padding: 12px 16px;">
                    <div style="font-family: monospace; font-weight: 700; color: #1e293b; background: rgba(0,0,0,0.04); display: inline-block; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.06);">
                        ${escapeHtml(asset.asset_tag)}
                    </div>
                    ${asset.serial_number ? `<div style="font-size: 0.75rem; color: var(--text-muted, #64748b); margin-top: 2px;">SN: ${escapeHtml(asset.serial_number)}</div>` : ''}
                </td>

                <!-- Name & Model -->
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 600; color: var(--text-primary, #0f172a); font-size: 0.9375rem;">
                        ${escapeHtml(asset.name)}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted, #64748b); display: flex; gap: 8px; margin-top: 2px;">
                        ${asset.manufacturer ? `<span>Mfg: <b>${escapeHtml(asset.manufacturer)}</b></span>` : ''}
                        ${asset.model_number ? `<span>Model: <b>${escapeHtml(asset.model_number)}</b></span>` : ''}
                    </div>
                </td>

                <!-- Category & Criticality -->
                <td style="padding: 12px 16px;">
                    <div style="margin-bottom: 4px;">
                        <span class="eq-badge eq-badge-operational" style="background: rgba(37,99,235,0.08); color: #2563eb;">
                            ${escapeHtml(asset.category)}
                        </span>
                    </div>
                    <div>
                        <span class="eq-badge ${critClass}">
                            ${escapeHtml(asset.criticality_level)}
                        </span>
                    </div>
                </td>

                <!-- Location -->
                <td style="padding: 12px 16px; font-size: 0.8125rem;">
                    <div>${locDisplay}</div>
                    ${asset.building_name ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">${escapeHtml(asset.building_name)}</div>` : ''}
                </td>

                <!-- Calibration Schedule -->
                <td style="padding: 12px 16px;">
                    ${calibHtml}
                </td>

                <!-- Status -->
                <td style="padding: 12px 16px;">
                    <span class="eq-badge ${statusClass}">
                        ${escapeHtml(asset.status)}
                    </span>
                    ${asset.status_reason ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 2px; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(asset.status_reason)}">${escapeHtml(asset.status_reason)}</div>` : ''}
                </td>

                <!-- Actions -->
                <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                    <button class="btn btn-sm eq-action-logs" data-id="${asset.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; margin-right: 4px;" title="Maintenance Logs & Calibration Record">
                        Logs
                    </button>
                    <button class="btn btn-sm eq-action-status" data-id="${asset.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; margin-right: 4px;" title="Quick Status Change">
                        Status
                    </button>
                    <button class="btn btn-sm eq-action-edit" data-id="${asset.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; margin-right: 4px;" title="Edit Asset Information">
                        Edit
                    </button>
                    <button class="btn btn-sm eq-action-delete" data-id="${asset.id}" data-name="${escapeHtml(asset.name)}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #fee2e2; background: #fff; color: #dc2626; cursor: pointer;" title="Archive Asset">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Wire action buttons
    tbody.querySelectorAll(".eq-action-logs").forEach(btn => {
        btn.onclick = () => openLogsModal(parseInt(btn.getAttribute("data-id"), 10));
    });

    tbody.querySelectorAll(".eq-action-status").forEach(btn => {
        btn.onclick = () => openQuickStatusModal(parseInt(btn.getAttribute("data-id"), 10));
    });

    tbody.querySelectorAll(".eq-action-edit").forEach(btn => {
        btn.onclick = () => openAssetModal(parseInt(btn.getAttribute("data-id"), 10));
    });

    tbody.querySelectorAll(".eq-action-delete").forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            const name = btn.getAttribute("data-name");
            handleDeleteAsset(id, name);
        };
    });
}

/**
 * Open Asset Modal (Create or Edit)
 */
async function openAssetModal(assetId = null) {
    const form = document.getElementById("eq-form-asset");
    const title = document.getElementById("eq-modal-asset-title");
    if (!form) return;

    form.reset();
    document.getElementById("eq-form-id").value = "";

    if (assetId) {
        title.textContent = "Edit Equipment Asset";
        try {
            const res = await fetchEquipmentAsset(assetId);
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
            showToast("Failed to fetch asset details: " + err.message, "error");
            return;
        }
    } else {
        title.textContent = "Register New Biomedical Asset";
    }

    openModal("eq-modal-asset");
}

/**
 * Handle Asset Create / Edit form submission
 */
async function handleAssetFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("eq-form-id").value;
    const isEdit = Boolean(id);

    const payload = {
        name: document.getElementById("eq-form-name").value.trim(),
        asset_tag: document.getElementById("eq-form-tag").value.trim(),
        category: document.getElementById("eq-form-category").value,
        criticality_level: document.getElementById("eq-form-criticality").value,
        manufacturer: document.getElementById("eq-form-mfg").value.trim(),
        model_number: document.getElementById("eq-form-model").value.trim(),
        serial_number: document.getElementById("eq-form-sn").value.trim(),
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
        status_reason: document.getElementById("eq-form-status-reason").value.trim(),
        notes: document.getElementById("eq-form-notes").value.trim()
    };

    const submitBtn = document.getElementById("eq-btn-save-asset");
    if (submitBtn) submitBtn.disabled = true;

    try {
        let res;
        if (isEdit) {
            res = await updateEquipmentAsset(parseInt(id, 10), payload);
        } else {
            res = await createEquipmentAsset(payload);
        }

        if (res && res.success) {
            showToast(res.message || "Equipment asset saved successfully.", "success");
            closeModal("eq-modal-asset");
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to save asset.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Open Quick Status modal
 */
function openQuickStatusModal(assetId) {
    const asset = state.assets.find(a => parseInt(a.id, 10) === assetId);
    if (!asset) return;

    document.getElementById("eq-status-asset-id").value = asset.id;
    document.getElementById("eq-status-asset-name").textContent = asset.name;
    document.getElementById("eq-status-asset-tag").textContent = `Tag: ${asset.asset_tag} | Current Status: ${asset.status}`;
    document.getElementById("eq-status-select").value = asset.status;
    document.getElementById("eq-status-reason").value = "";

    openModal("eq-modal-status");
}

/**
 * Handle quick status change submission
 */
async function handleQuickStatusSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("eq-status-asset-id").value, 10);
    const status = document.getElementById("eq-status-select").value;
    const reason = document.getElementById("eq-status-reason").value.trim();

    try {
        const res = await updateEquipmentStatus(id, status, reason);
        if (res && res.success) {
            showToast(`Asset status updated to ${status}.`, "success");
            closeModal("eq-modal-status");
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to update status.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

/**
 * Open Maintenance & Calibration History modal
 */
async function openLogsModal(assetId) {
    const form = document.getElementById("eq-form-record-log");
    const header = document.getElementById("eq-logs-asset-header");
    const tbody = document.getElementById("eq-logs-table-body");

    if (form) form.reset();
    document.getElementById("eq-log-equipment-id").value = assetId;
    document.getElementById("eq-log-date").value = new Date().toISOString().split("T")[0];

    // Default next due to +6 months
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 6);
    document.getElementById("eq-log-next-due").value = nextDate.toISOString().split("T")[0];

    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">Loading maintenance history...</td></tr>`;
    }

    openModal("eq-modal-logs");

    try {
        const res = await fetchEquipmentAsset(assetId);
        if (res && res.data) {
            const a = res.data;
            if (header) {
                header.textContent = `${a.name} (Tag: ${a.asset_tag}) | Model: ${a.model_number || 'N/A'} | Status: ${a.status}`;
            }

            renderLogsTable(a.maintenance_logs || []);
        }
    } catch (err) {
        showToast("Failed to load maintenance logs: " + err.message, "error");
    }
}

/**
 * Render maintenance logs table
 */
function renderLogsTable(logs) {
    const tbody = document.getElementById("eq-logs-table-body");
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #94a3b8);">No maintenance history records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(l => {
        let resultColor = "#16a34a";
        if (l.result_status === "Fail") resultColor = "#dc2626";
        else if (l.result_status === "Incomplete") resultColor = "#ea580c";

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; font-weight: 600;">${escapeHtml(l.performed_date)}</td>
                <td style="padding: 8px 12px;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: #f1f5f9; font-weight: 600;">
                        ${escapeHtml(l.log_type)}
                    </span>
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
                    ${l.cost && parseFloat(l.cost) > 0 ? `$${parseFloat(l.cost).toFixed(2)}` : '$0.00'}
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * Handle new maintenance / calibration log submission
 */
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
            // Refresh logs modal view
            await openLogsModal(equipmentId);
            // Refresh main table & metrics
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to record log.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

/**
 * Handle asset deletion (soft-delete / archive)
 */
async function handleDeleteAsset(id, name) {
    if (!confirm(`Are you sure you want to archive equipment asset "${name}"? This removes it from active fleet lists.`)) {
        return;
    }

    try {
        const res = await deleteEquipmentAsset(id);
        if (res && res.success) {
            showToast(res.message || "Asset archived successfully.", "success");
            await Promise.all([loadMetrics(), loadAssets()]);
        } else {
            showToast(res.message || "Failed to archive asset.", "error");
        }
    } catch (err) {
        showToast(err.message || "Network error occurred.", "error");
    }
}

/**
 * Modal helpers
 */
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

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
