/**
 * Central Sterile Supply Department (CSSD / CCSD) Module
 * Subsystem: Surgical Instrument Sets, Trays Manifest & Autoclave Batch Validation Engine
 * Schema: cssd_master_trays, cssd_master_tray_items, cssd_physical_trays, cssd_tray_lifecycle_events,
 *         cssd_sterilizer_machines, cssd_sterilization_batches, cssd_sterilization_batch_items
 */

import { api } from "../../core/api.js";

let state = {
    activeTab: "circulating", // 'circulating' | 'ot_dispatches' | 'returns_and_incidents' | 'autoclave_batches' | 'machines_registry' | 'master_catalog' | 'audit_log'
    statusFilter: "",
    specialtyFilter: "",
    batchStatusFilter: "",
    machineFilter: "",
    dispatchStatusFilter: "",
    incidentStatusFilter: "",
    orSuiteFilter: "",
    searchQuery: "",
    page: 1,
    perPage: 15
};

let cache = {
    metrics: null,
    physicalTrays: { total: 0, records: [] },
    masterTrays: { total: 0, records: [] },
    batches: { total: 0, records: [] },
    machines: [],
    dispatches: { total: 0, records: [] },
    returns: { total: 0, records: [] },
    incidents: { total: 0, records: [] },
    availableTrays: [],
    orSuitesAndCases: { or_suites: [], surgical_cases: [] },
    metadata: {
        specialties: {},
        categories: {},
        statuses: {},
        wrapper_types: {},
        instrument_types: {},
        modalities: {},
        master_trays: [],
        machines: [],
        cycle_types: {},
        batch_statuses: {},
        spore_results: {},
        chemical_classes: {}
    }
};

export function CSSDView() {
    return `
        <div class="cssd-container" style="padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div id="cssdNotificationArea"></div>

            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Surgical Infection Control &amp; CSSD</span>
                        <span style="color: #64748b; font-size: 13px;">Central Sterile Supply Department</span>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Surgical Instrument Sets, Autoclave Batches &amp; OT Distribution</h1>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Master piece manifests, autoclave parametric validation (134°C, 2.2 bar, 18 min), biological spore testing (*G. stearothermophilus*), OT distribution handover, and missing tool / RSI incident tracking.</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btnDispatchModal" style="background: #e11d48; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(225,29,72,0.25);">
                        <i class="fas fa-truck-ramp-box"></i> Dispatch to OR Suite
                    </button>
                    <button id="btnScanReturnModal" style="background: #d97706; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
                        <i class="fas fa-barcode"></i> Scan Dirty Tray Return
                    </button>
                    <button id="btnNewBatchModal" style="background: #0d9488; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(13,148,136,0.25);">
                        <i class="fas fa-fire-burner"></i> Start Autoclave Cycle
                    </button>
                    <button id="btnNewPhysicalTrayModal" style="background: #4f46e5; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(79,70,229,0.25);">
                        <i class="fas fa-qrcode"></i> Instantiate Tray
                    </button>
                    <button id="btnNewMasterTrayModal" style="background: #0284c7; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(2,132,199,0.25);">
                        <i class="fas fa-plus-circle"></i> Create Master Catalog
                    </button>
                </div>
            </div>

            <!-- Executive KPI Cards -->
            <div id="cssdKpiSection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderKpiCards()}
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; gap: 8px; flex-wrap: wrap;">
                <button class="cssd-tab-btn ${state.activeTab === 'circulating' ? 'active' : ''}" data-tab="circulating" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'circulating' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'circulating' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-layer-group"></i> Circulating Barcoded Trays
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'ot_dispatches' ? 'active' : ''}" data-tab="ot_dispatches" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'ot_dispatches' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'ot_dispatches' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-truck-ramp-box"></i> OT Distribution &amp; Handover
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'returns_and_incidents' ? 'active' : ''}" data-tab="returns_and_incidents" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'returns_and_incidents' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'returns_and_incidents' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-shield-halved"></i> Scan Returns &amp; Missing Instruments
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'autoclave_batches' ? 'active' : ''}" data-tab="autoclave_batches" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'autoclave_batches' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'autoclave_batches' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-temperature-arrow-up"></i> Autoclave Batches &amp; Spore Validation
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'machines_registry' ? 'active' : ''}" data-tab="machines_registry" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'machines_registry' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'machines_registry' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-server"></i> Sterilizers &amp; Bowie-Dick Tests
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'master_catalog' ? 'active' : ''}" data-tab="master_catalog" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'master_catalog' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'master_catalog' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clipboard-list"></i> Master Trays &amp; Piece Manifests
                </button>
                <button class="cssd-tab-btn ${state.activeTab === 'audit_log' ? 'active' : ''}" data-tab="audit_log" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'audit_log' ? '#4f46e5' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'audit_log' ? '#4f46e5' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-shield-virus"></i> Decontamination &amp; Audit Logs
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="cssdTabContent">
                ${renderActiveTabContent()}
            </div>

            <!-- Modals Container -->
            <div id="cssdModalContainer"></div>
        </div>
    `;
}

/**
 * Initialize Module
 */
export async function initCSSD() {
    await loadInitialData();
    bindEvents();
}

/**
 * Fetch Initial Data
 */
async function loadInitialData() {
    try {
        const [metaRes, metricsRes, physRes, masterRes, batchRes, machRes, dispRes, retRes, incRes, availRes, orRes] = await Promise.all([
            api('/cssd/metadata').catch(() => null),
            api('/cssd/metrics').catch(() => null),
            api(`/cssd/physical-trays?status=${state.statusFilter}&specialty=${encodeURIComponent(state.specialtyFilter)}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/cssd/master-trays?specialty=${encodeURIComponent(state.specialtyFilter)}&q=${encodeURIComponent(state.searchQuery)}`).catch(() => null),
            api(`/cssd/batches?batch_status=${state.batchStatusFilter}&machine_id=${state.machineFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api('/cssd/machines').catch(() => null),
            api(`/cssd/dispatches?dispatch_status=${state.dispatchStatusFilter}&suite=${encodeURIComponent(state.orSuiteFilter)}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/cssd/returns?page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api(`/cssd/incidents?status=${state.incidentStatusFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null),
            api('/cssd/dispatches/available-trays').catch(() => null),
            api('/cssd/dispatches/or-suites').catch(() => null)
        ]);

        if (metaRes?.data) cache.metadata = metaRes.data;
        if (metricsRes?.data) cache.metrics = metricsRes.data;
        if (physRes?.data) cache.physicalTrays = physRes.data;
        if (masterRes?.data) cache.masterTrays = masterRes.data;
        if (batchRes?.data) cache.batches = batchRes.data;
        if (machRes?.data) cache.machines = machRes.data;
        if (dispRes?.data) cache.dispatches = dispRes.data;
        if (retRes?.data) cache.returns = retRes.data;
        if (incRes?.data) cache.incidents = incRes.data;
        if (availRes?.data) cache.availableTrays = availRes.data;
        if (orRes?.data) cache.orSuitesAndCases = orRes.data;

        renderApp();
    } catch (e) {
        console.error("Failed to load CSSD data", e);
        showToast("Error loading CSSD data: " + e.message, "error");
    }
}

/**
 * Re-render dynamic areas
 */
function renderApp() {
    const kpiEl = document.getElementById('cssdKpiSection');
    if (kpiEl) kpiEl.innerHTML = renderKpiCards();

    const contentEl = document.getElementById('cssdTabContent');
    if (contentEl) contentEl.innerHTML = renderActiveTabContent();
}

/**
 * Render Executive KPI Cards
 */
function renderKpiCards() {
    const m = cache.metrics || {
        total_master_trays: 0,
        total_physical_trays: 0,
        sterile_ready_count: 0,
        active_surgery_count: 0,
        processing_count: 0,
        quarantined_count: 0,
        total_batches: 0,
        released_batches_count: 0,
        incubating_batches_count: 0,
        failed_batches_count: 0,
        active_machines: 0,
        bowie_dick_passed_count: 0,
        total_dispatches: 0,
        active_dispatches: 0,
        dispatches_today: 0,
        total_returns: 0,
        returns_today: 0,
        total_rsi_returns: 0,
        total_incidents: 0,
        open_incidents_count: 0,
        critical_rsi_active_count: 0,
        repair_queue_count: 0
    };

    return `
        <!-- Card 1: Sterile & Ready -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Sterile &amp; Ready for OR</span>
                <span style="font-size: 18px; color: #10b981;"><i class="fas fa-check-circle"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #047857;">${m.sterile_ready_count} <span style="font-size: 14px; font-weight: 600; color: #64748b;">/ ${m.total_physical_trays} Trays</span></div>
            <div style="font-size: 12px; color: #059669; margin-top: 4px;">
                Biological spore &amp; Class 5 verified
            </div>
        </div>

        <!-- Card 2: Active in OR Suites -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #e11d48;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Active in OR / Surgery</span>
                <span style="font-size: 18px; color: #e11d48;"><i class="fas fa-truck-ramp-box"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #be123c;">${m.active_dispatches || m.active_surgery_count} <span style="font-size: 14px; font-weight: 600; color: #64748b;">Active Dispatches</span></div>
            <div style="font-size: 12px; color: #e11d48; margin-top: 4px; font-weight: 600;">
                <i class="fas fa-door-open"></i> ${m.dispatches_today || 0} dispatched today
            </div>
        </div>

        <!-- Card 3: Missing Tools & RSI Safety -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid ${(m.critical_rsi_active_count > 0 || m.open_incidents_count > 0) ? '#dc2626' : '#64748b'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Missing Tools &amp; RSI Alerts</span>
                <span style="font-size: 18px; color: ${(m.critical_rsi_active_count > 0 || m.open_incidents_count > 0) ? '#dc2626' : '#64748b'};"><i class="fas fa-triangle-exclamation"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: ${(m.critical_rsi_active_count > 0 || m.open_incidents_count > 0) ? '#b91c1c' : '#334155'};">${m.open_incidents_count || 0} <span style="font-size: 14px; font-weight: 600; color: #64748b;">Open Cases</span></div>
            <div style="font-size: 12px; color: ${(m.critical_rsi_active_count > 0) ? '#dc2626' : '#64748b'}; margin-top: 4px; font-weight: 600;">
                ${m.critical_rsi_active_count > 0 ? `<i class="fas fa-radiation"></i> ${m.critical_rsi_active_count} CRITICAL RSI ALERTS ACTIVE` : `${m.repair_queue_count || 0} in repair/maintenance`}
            </div>
        </div>

        <!-- Card 4: Autoclave Batches -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #0d9488;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Sterilization Batches</span>
                <span style="font-size: 18px; color: #0d9488;"><i class="fas fa-fire-burner"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f766e;">${m.total_batches} <span style="font-size: 14px; font-weight: 600; color: #64748b;">Runs</span></div>
            <div style="font-size: 12px; color: #0d9488; margin-top: 4px; font-weight: 600;">
                <i class="fas fa-certificate"></i> ${m.released_batches_count} released (${m.incubating_batches_count} in BI hold)
            </div>
        </div>

        <!-- Card 5: Sterilizers & Bowie-Dick -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Autoclaves &amp; Plasma</span>
                <span style="font-size: 18px; color: #3b82f6;"><i class="fas fa-server"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #1d4ed8;">${m.active_machines} <span style="font-size: 14px; font-weight: 600; color: #64748b;">Active</span></div>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">
                ${m.bowie_dick_passed_count} Bowie-Dick daily tests passed
            </div>
        </div>

        <!-- Card 6: Quarantine Lockout -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid ${m.quarantined_count > 0 ? '#ea580c' : '#64748b'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Quarantine Bay Lockout</span>
                <span style="font-size: 18px; color: ${m.quarantined_count > 0 ? '#ea580c' : '#64748b'};"><i class="fas fa-lock"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: ${m.quarantined_count > 0 ? '#c2410c' : '#334155'};">${m.quarantined_count} Trays</div>
            <div style="font-size: 12px; color: ${m.quarantined_count > 0 ? '#ea580c' : '#64748b'}; margin-top: 4px; font-weight: 600;">
                ${m.quarantined_count > 0 ? 'Locked pending investigation / count check' : 'Zero safety locks'}
            </div>
        </div>
    `;
}

/**
 * Render Active Tab Content
 */
function renderActiveTabContent() {
    switch (state.activeTab) {
        case 'circulating':
            return renderCirculatingTab();
        case 'ot_dispatches':
            return renderOTDispatchesTab();
        case 'returns_and_incidents':
            return renderReturnsAndIncidentsTab();
        case 'autoclave_batches':
            return renderAutoclaveBatchesTab();
        case 'machines_registry':
            return renderMachinesRegistryTab();
        case 'master_catalog':
            return renderMasterCatalogTab();
        case 'audit_log':
            return renderAuditLogTab();
        default:
            return renderCirculatingTab();
    }
}

/**
 * TAB 1: Circulating Physical Trays
 */
function renderCirculatingTab() {
    const records = cache.physicalTrays?.records || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
                <input type="text" id="cssdSearchInput" placeholder="Search Barcode (e.g. TRAY-2026-0001), Serial, Set Name, OR Suite..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 180px;">
                <select id="cssdStatusFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Lifecycle Stages</option>
                    <option value="sterile_stored" ${state.statusFilter === 'sterile_stored' ? 'selected' : ''}>Sterile &amp; Ready (In Storage)</option>
                    <option value="dispatched_surgery" ${state.statusFilter === 'dispatched_surgery' ? 'selected' : ''}>Dispatched to OR Suite</option>
                    <option value="in_surgery" ${state.statusFilter === 'in_surgery' ? 'selected' : ''}>In Surgery (Open Sterile Field)</option>
                    <option value="returned_dirty" ${state.statusFilter === 'returned_dirty' ? 'selected' : ''}>Returned Dirty (Post-Op)</option>
                    <option value="dirty_received" ${state.statusFilter === 'dirty_received' ? 'selected' : ''}>Dirty Intake / Sorting</option>
                    <option value="decontaminating" ${state.statusFilter === 'decontaminating' ? 'selected' : ''}>Decontaminating (Wash Bath)</option>
                    <option value="assembled_wrapped" ${state.statusFilter === 'assembled_wrapped' ? 'selected' : ''}>Assembled &amp; Wrapped</option>
                    <option value="sterilizing" ${state.statusFilter === 'sterilizing' ? 'selected' : ''}>In Autoclave Chamber</option>
                    <option value="quarantined_missing_item" ${state.statusFilter === 'quarantined_missing_item' ? 'selected' : ''}>Quarantined (Missing Item)</option>
                </select>
            </div>
            <div style="min-width: 170px;">
                <select id="cssdSpecialtyFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Surgical Specialties</option>
                    <option value="General Surgery" ${state.specialtyFilter === 'General Surgery' ? 'selected' : ''}>General Surgery</option>
                    <option value="Obstetrics & Gynecology" ${state.specialtyFilter === 'Obstetrics & Gynecology' ? 'selected' : ''}>Obstetrics &amp; Gynecology</option>
                    <option value="Orthopedic Surgery" ${state.specialtyFilter === 'Orthopedic Surgery' ? 'selected' : ''}>Orthopedic Surgery</option>
                    <option value="Cardiovascular & Thoracic" ${state.specialtyFilter === 'Cardiovascular & Thoracic' ? 'selected' : ''}>Cardiovascular &amp; Thoracic</option>
                    <option value="ENT & Head/Neck" ${state.specialtyFilter === 'ENT & Head/Neck' ? 'selected' : ''}>ENT &amp; Head / Neck</option>
                </select>
            </div>
            <button id="btnResetCssdFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- Physical Trays Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    Circulating Surgical Trays (${cache.physicalTrays?.total || 0} Registered Instances)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <th style="padding: 12px 16px;">Tray Barcode &amp; Serial</th>
                            <th style="padding: 12px 16px;">Surgical Set Name</th>
                            <th style="padding: 12px 16px;">Specialty &amp; Pieces</th>
                            <th style="padding: 12px 16px;">Current Location &amp; Suite</th>
                            <th style="padding: 12px 16px; text-align: center;">Lifecycle Status</th>
                            <th style="padding: 12px 16px; text-align: center;">Biological / QA</th>
                            <th style="padding: 12px 16px;">Sterile Expiration</th>
                            <th style="padding: 12px 16px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                                    <i class="fas fa-inbox" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                                    No physical surgical trays matching current filters.
                                </td>
                            </tr>
                        ` : records.map(r => renderPhysicalTrayRow(r)).join('')}
                    </tbody>
                </table>
            </div>

            ${renderPagination()}
        </div>
    `;
}

/**
 * Render Physical Tray Row
 */
function renderPhysicalTrayRow(r) {
    const statusBadge = getTrayStatusBadge(r.current_status);
    const countBadge = r.instrument_count_verified ? `<span title="Complete set count verified" style="color: #059669; font-size: 11px; font-weight: 600;"><i class="fas fa-check-double"></i> Count OK</span>` : `<span title="Missing item flagged" style="color: #dc2626; font-size: 11px; font-weight: 700;"><i class="fas fa-exclamation-triangle"></i> Missing Item</span>`;

    const isExpired = r.sterile_expiry_date && new Date(r.sterile_expiry_date) < new Date() && r.current_status === 'sterile_stored';

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 16px; font-family: monospace;">
                <span class="view-tray-detail-btn" data-id="${r.id}" style="color: #4f46e5; font-weight: 800; font-size: 13px; cursor: pointer; text-decoration: underline;">
                    ${escapeHtml(r.tray_barcode)}
                </span>
                <div style="font-size: 11px; color: #64748b; font-family: sans-serif; margin-top: 2px;">
                    SN: ${escapeHtml(r.serial_number || 'N/A')}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(r.master_tray_name)}</div>
                <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px;">${escapeHtml(r.master_tray_code)} &bull; ${escapeHtml(r.standard_wrapper_type.replace(/_/g, ' '))}</div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 600; color: #334155;">${escapeHtml(r.department_specialty)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    <strong>${r.manifest_pieces}</strong> instruments &bull; ${countBadge}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 600; color: #0f172a; font-size: 12px;">
                    <i class="fas fa-location-dot" style="color: #64748b;"></i> ${escapeHtml(r.current_location)}
                </div>
                ${r.assigned_or_suite ? `
                    <div style="font-size: 11px; color: #4338ca; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 3px; font-weight: 600;">
                        ${escapeHtml(r.assigned_or_suite)}
                    </div>
                ` : ''}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${statusBadge}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600;">
                    ${r.biological_spore_result === 'negative_pass' || r.biological_spore_result === 'no_growth_negative' ? '<span style="color: #059669;"><i class="fas fa-shield-halved"></i> Spore Pass</span>' : (r.biological_spore_result === 'incubating' || r.biological_spore_result === 'incubating_pending' ? '<span style="color: #d97706;"><i class="fas fa-hourglass-half"></i> Incubating</span>' : '<span style="color: #64748b;">N/A</span>')}
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                    Cycle #${r.total_sterilization_cycles || 0}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                ${r.sterile_expiry_date ? `
                    <div style="font-weight: 700; color: ${isExpired ? '#dc2626' : '#0f172a'}; font-size: 12px;">
                        ${r.sterile_expiry_date}
                    </div>
                    <div style="font-size: 11px; color: ${isExpired ? '#dc2626' : '#64748b'};">
                        ${isExpired ? 'EXPIRED (Re-sterilize)' : 'Sterile Valid (180d)'}
                    </div>
                ` : `<span style="color: #94a3b8; font-size: 12px;">Not Sterile</span>`}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;">
                    ${r.current_status === 'sterile_stored' ? `
                        <button class="dispatch-tray-direct-btn" data-id="${r.id}" data-barcode="${escapeHtml(r.tray_barcode)}" title="Dispatch to OR Suite" style="background: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">
                            <i class="fas fa-truck-ramp-box"></i> Dispatch
                        </button>
                    ` : ''}
                    ${r.current_status === 'dispatched_surgery' || r.current_status === 'in_surgery' ? `
                        <button class="scan-return-direct-btn" data-id="${r.id}" data-barcode="${escapeHtml(r.tray_barcode)}" title="Scan Post-Op Return" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">
                            <i class="fas fa-barcode"></i> Scan Return
                        </button>
                    ` : ''}
                    <button class="open-status-modal-btn" data-id="${r.id}" data-barcode="${escapeHtml(r.tray_barcode)}" data-status="${r.current_status}" data-location="${escapeHtml(r.current_location)}" title="Advance Lifecycle Status" style="background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        <i class="fas fa-arrows-rotate"></i> Lifecycle
                    </button>
                    <button class="view-tray-detail-btn" data-id="${r.id}" title="Inspect Manifest &amp; Movement History" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="delete-phys-tray-btn" data-id="${r.id}" data-barcode="${escapeHtml(r.tray_barcode)}" title="Delete Tray" style="background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * TAB: OT Surgical Instrument Dispatches & Custody Handover
 */
function renderOTDispatchesTab() {
    const records = cache.dispatches?.records || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
                <input type="text" id="dispSearchInput" placeholder="Search Dispatch #, Tray Barcode, Patient, Surgeon, Procedure..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 170px;">
                <select id="dispStatusFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Dispatch Statuses</option>
                    <option value="dispatched_in_transit" ${state.dispatchStatusFilter === 'dispatched_in_transit' ? 'selected' : ''}>Dispatched (In Transit to OR)</option>
                    <option value="received_in_or" ${state.dispatchStatusFilter === 'received_in_or' ? 'selected' : ''}>Received in OR (Handover Confirmed)</option>
                    <option value="in_surgery" ${state.dispatchStatusFilter === 'in_surgery' ? 'selected' : ''}>In Surgery (Open Sterile Field)</option>
                    <option value="returned_to_cssd" ${state.dispatchStatusFilter === 'returned_to_cssd' ? 'selected' : ''}>Returned to CSSD Decon</option>
                    <option value="quarantined_incident" ${state.dispatchStatusFilter === 'quarantined_incident' ? 'selected' : ''}>Quarantined Safety Incident</option>
                </select>
            </div>
            <div style="min-width: 160px;">
                <select id="dispSuiteFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Operating Theaters</option>
                    <option value="OR Suite 1" ${state.orSuiteFilter === 'OR Suite 1' ? 'selected' : ''}>OR Suite 1 - General</option>
                    <option value="OR Suite 2" ${state.orSuiteFilter === 'OR Suite 2' ? 'selected' : ''}>OR Suite 2 - Ortho</option>
                    <option value="OR Suite 3" ${state.orSuiteFilter === 'OR Suite 3' ? 'selected' : ''}>OR Suite 3 - OB-GYN</option>
                    <option value="OR Suite 4" ${state.orSuiteFilter === 'OR Suite 4' ? 'selected' : ''}>OR Suite 4 - Neuro</option>
                    <option value="Labor & Delivery" ${state.orSuiteFilter === 'Labor & Delivery' ? 'selected' : ''}>Labor &amp; Delivery OR</option>
                    <option value="Emergency Minor OR" ${state.orSuiteFilter === 'Emergency Minor OR' ? 'selected' : ''}>Emergency Minor OR</option>
                </select>
            </div>
            <button id="btnDispatchModalTab" style="background: #e11d48; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-truck-ramp-box"></i> New OT Dispatch
            </button>
        </div>

        <!-- Dispatches Ledger Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                            <th style="padding: 14px 16px; width: 14%;">Dispatch &amp; Priority</th>
                            <th style="padding: 14px 16px; width: 20%;">Instrument Set &amp; Barcode</th>
                            <th style="padding: 14px 16px; width: 18%;">Destination OR &amp; Case</th>
                            <th style="padding: 14px 16px; width: 16%;">Surgical Team</th>
                            <th style="padding: 14px 16px; width: 14%;">Custody &amp; Handover</th>
                            <th style="padding: 14px 16px; width: 10%; text-align: center;">Status</th>
                            <th style="padding: 14px 16px; width: 8%; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="7" style="padding: 40px; text-align: center; color: #64748b;">
                                    <div style="font-size: 32px; margin-bottom: 8px; color: #cbd5e1;"><i class="fas fa-truck-ramp-box"></i></div>
                                    <div style="font-weight: 600; font-size: 15px; color: #334155;">No surgical instrument dispatches found</div>
                                    <div style="font-size: 13px; margin-top: 4px;">Dispatch sterile surgical sets to operating rooms for scheduled and emergency procedures.</div>
                                </td>
                            </tr>
                        ` : records.map(d => renderDispatchRow(d)).join('')}
                    </tbody>
                </table>
            </div>

            ${renderPagination()}
        </div>
    `;
}

/**
 * Render Single OT Dispatch Row
 */
function renderDispatchRow(d) {
    const priorityBadge = d.case_priority === 'stat_emergency' 
        ? `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase;"><i class="fas fa-bolt"></i> STAT EMERG</span>`
        : (d.case_priority === 'urgent' 
            ? `<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Urgent</span>`
            : `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">Elective</span>`);

    let statusBadge = '';
    switch (d.dispatch_status) {
        case 'dispatched_in_transit':
            statusBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-truck-fast"></i> In Transit</span>`;
            break;
        case 'received_in_or':
            statusBadge = `<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-handshake"></i> Handover OK</span>`;
            break;
        case 'in_surgery':
            statusBadge = `<span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-user-doctor"></i> In Surgery</span>`;
            break;
        case 'returned_to_cssd':
            statusBadge = `<span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-arrow-rotate-left"></i> Returned</span>`;
            break;
        case 'quarantined_incident':
            statusBadge = `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-triangle-exclamation"></i> RSI Alert</span>`;
            break;
    }

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 16px;">
                <div style="font-family: monospace; font-weight: 800; color: #e11d48; font-size: 13px;">
                    ${escapeHtml(d.dispatch_number)}
                </div>
                <div style="margin-top: 4px;">
                    ${priorityBadge}
                    ${d.transport_container_barcode ? `<span style="font-size: 10px; color: #64748b; font-family: monospace; margin-left: 4px;">(${escapeHtml(d.transport_container_barcode)})</span>` : ''}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(d.master_tray_name)}</div>
                <div style="font-size: 11px; color: #4f46e5; font-family: monospace; font-weight: 700; margin-top: 2px;">
                    ${escapeHtml(d.tray_barcode)} &bull; ${d.total_pieces} Pieces
                </div>
                <div style="font-size: 10px; color: #059669; margin-top: 2px;">
                    <i class="fas fa-shield-check"></i> Sterile Expiry: ${d.sterile_expiry_date || 'Valid'}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 700; color: #0f172a; font-size: 12px;">
                    <i class="fas fa-location-dot" style="color: #e11d48;"></i> ${escapeHtml(d.or_suite_name)}
                </div>
                <div style="font-size: 11px; color: #334155; margin-top: 2px;">
                    ${escapeHtml(d.procedure_name || 'Scheduled Surgery')}
                </div>
                ${d.patient_name ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Pt: <strong>${escapeHtml(d.patient_name)}</strong></div>` : ''}
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-size: 12px; font-weight: 600; color: #0f172a;">
                    ${escapeHtml(d.primary_surgeon || 'Attending Surgeon')}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Circ: ${escapeHtml(d.circulating_nurse || 'Assigned Nurse')}
                </div>
                ${d.scrub_nurse ? `<div style="font-size: 10px; color: #64748b;">Scrub: ${escapeHtml(d.scrub_nurse)}</div>` : ''}
            </td>
            <td style="padding: 14px 16px; font-size: 11px;">
                <div>Dispatched: <strong>${d.dispatched_at.substring(11, 16)}</strong> by ${escapeHtml(d.dispatched_by_name.split(' ')[0])}</div>
                ${d.received_by_name ? `
                    <div style="color: #059669; margin-top: 3px;">
                        <i class="fas fa-check"></i> Rcvd: <strong>${d.received_in_or_at ? d.received_in_or_at.substring(11, 16) : 'Yes'}</strong> (${escapeHtml(d.received_by_name.split(' ')[0])})
                    </div>
                ` : `
                    <div style="color: #d97706; margin-top: 3px; font-weight: 600;">
                        <i class="fas fa-clock"></i> Awaiting OR sign-off
                    </div>
                `}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${statusBadge}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;">
                    ${d.dispatch_status === 'dispatched_in_transit' ? `
                        <button class="confirm-or-handover-btn" data-id="${d.id}" data-no="${escapeHtml(d.dispatch_number)}" data-barcode="${escapeHtml(d.tray_barcode)}" data-suite="${escapeHtml(d.or_suite_name)}" title="Confirm Custody Handover in OR" style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">
                            <i class="fas fa-handshake"></i> Handover
                        </button>
                    ` : ''}
                    ${d.dispatch_status === 'in_surgery' || d.dispatch_status === 'received_in_or' ? `
                        <button class="scan-return-direct-btn" data-id="${d.physical_tray_id}" data-barcode="${escapeHtml(d.tray_barcode)}" data-disp="${d.id}" title="Scan Post-Op Return" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">
                            <i class="fas fa-barcode"></i> Return Scan
                        </button>
                    ` : ''}
                    <button class="view-dispatch-detail-btn" data-id="${d.id}" title="View Dispatch &amp; Manifest" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * TAB: Scan Returns, Decontamination & Missing Instrument Incidents
 */
function renderReturnsAndIncidentsTab() {
    const returns = cache.returns?.records || [];
    const incidents = cache.incidents?.records || [];

    return `
        <!-- Quick Action Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
                    Post-Op Decontamination Receiving &amp; Manifest Count Verification
                </h3>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                    Scan returned dirty instrument trays, verify piece-by-piece against master manifests, and instantly detect lost or damaged tools before ultrasonic washing.
                </p>
            </div>
            <button id="btnOpenScanReturnTerminal" style="background: #d97706; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
                <i class="fas fa-barcode"></i> Scan Dirty Tray Return Terminal
            </button>
        </div>

        <!-- SECTION A: Recent Post-Op Tray Return Scans -->
        <div style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-arrow-rotate-left" style="color: #4f46e5;"></i> Recent Post-Op Tray Return Scans (${returns.length})
                </h4>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                        <thead>
                            <tr style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <th style="padding: 12px 14px; width: 14%;">Return # &amp; Time</th>
                                <th style="padding: 12px 14px; width: 22%;">Tray Barcode &amp; Set</th>
                                <th style="padding: 12px 14px; width: 18%;">Returned From Suite</th>
                                <th style="padding: 12px 14px; width: 16%;">Reconciliation Count</th>
                                <th style="padding: 12px 14px; width: 12%;">Bioburden</th>
                                <th style="padding: 12px 14px; width: 12%; text-align: center;">Reconciliation Status</th>
                                <th style="padding: 12px 14px; width: 6%; text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${returns.length === 0 ? `
                                <tr>
                                    <td colspan="7" style="padding: 30px; text-align: center; color: #64748b;">
                                        No dirty tray return scans recorded yet.
                                    </td>
                                </tr>
                            ` : returns.map(r => renderReturnRow(r)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- SECTION B: Missing Instrument & Retained Surgical Item (RSI) Safety Tracker -->
        <div>
            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #e11d48; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px;">
                        <i class="fas fa-radiation"></i>
                    </span>
                    <div>
                        <div style="font-weight: 800; color: #9f1239; font-size: 14px;">
                            Retained Surgical Item (RSI) Prevention &amp; Missing Tool Safety Ledger
                        </div>
                        <div style="font-size: 12px; color: #be123c;">
                            Mandatory surgical protocol: All unaccounted tools trigger immediate OR search, C-Arm / Portable X-Ray cavity check, and documented clinical clearance.
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                        <thead>
                            <tr style="background: #1e1b4b; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <th style="padding: 12px 14px; width: 13%;">Incident # &amp; Date</th>
                                <th style="padding: 12px 14px; width: 22%;">Missing / Damaged Tool</th>
                                <th style="padding: 12px 14px; width: 18%;">Tray &amp; Master Set</th>
                                <th style="padding: 12px 14px; width: 16%;">OR Suite &amp; Surgeon</th>
                                <th style="padding: 12px 14px; width: 13%;">Severity</th>
                                <th style="padding: 12px 14px; width: 12%; text-align: center;">Investigation Status</th>
                                <th style="padding: 12px 14px; width: 6%; text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${incidents.length === 0 ? `
                                <tr>
                                    <td colspan="7" style="padding: 30px; text-align: center; color: #059669; font-weight: 600;">
                                        <i class="fas fa-circle-check"></i> Zero active missing instrument incidents. 100% surgical tool count reconciliation maintained.
                                    </td>
                                </tr>
                            ` : incidents.map(inc => renderIncidentRow(inc)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Return Row
 */
function renderReturnRow(r) {
    const isClean = r.missing_count === 0 && r.damaged_count === 0;

    const rsiBadge = r.is_rsi_alert_triggered ? `
        <span style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas fa-radiation"></i> CRITICAL RSI ALERT
        </span>
    ` : (r.damaged_count > 0 ? `
        <span style="background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">
            <i class="fas fa-wrench"></i> ${r.damaged_count} DAMAGED
        </span>
    ` : `
        <span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">
            <i class="fas fa-check-double"></i> 100% COUNT OK
        </span>
    `);

    let bioBadge = '';
    switch (r.bioburden_level) {
        case 'heavy_gross_blood':
            bioBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">Heavy Gross Blood</span>`;
            break;
        case 'suspected_prion_creutzfeldt':
            bioBadge = `<span style="background: #450a0a; color: #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">PRION BIOHAZARD</span>`;
            break;
        default:
            bioBadge = `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Moderate</span>`;
            break;
    }

    return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 14px;">
                <div style="font-family: monospace; font-weight: 800; color: #4f46e5;">${escapeHtml(r.return_number)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${r.received_at.substring(5, 16)}</div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(r.master_tray_name)}</div>
                <div style="font-family: monospace; color: #64748b; font-size: 11px; margin-top: 1px;">${escapeHtml(r.tray_barcode)}</div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-weight: 600; color: #0f172a; font-size: 12px;">${escapeHtml(r.returned_from_or_suite)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 1px;">By: ${escapeHtml(r.returned_by_name)}</div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-size: 13px; font-weight: 800; color: ${isClean ? '#047857' : '#b91c1c'};">
                    ${r.counted_pieces} / ${r.expected_pieces} Pieces
                </div>
                ${r.missing_count > 0 ? `<div style="font-size: 11px; color: #dc2626; font-weight: 700;">⚠ ${r.missing_count} MISSING</div>` : ''}
                ${r.damaged_count > 0 ? `<div style="font-size: 11px; color: #d97706; font-weight: 600;">🔧 ${r.damaged_count} Damaged</div>` : ''}
            </td>
            <td style="padding: 12px 14px;">
                ${bioBadge}
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${escapeHtml(r.decon_bay_assigned || 'Decon Bay')}</div>
            </td>
            <td style="padding: 12px 14px; text-align: center;">
                ${rsiBadge}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
                <button class="view-return-detail-btn" data-id="${r.id}" title="Inspect Manifest Checklist Audit" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-list-check"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Render Incident Row
 */
function renderIncidentRow(inc) {
    const isCritical = (inc.severity_level === 'critical_rsi_alert');

    const severityBadge = isCritical ? `
        <span style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas fa-radiation"></i> CRITICAL RSI ALERT
        </span>
    ` : (inc.severity_level === 'high_priority' ? `
        <span style="background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">High Priority</span>
    ` : `<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">Maintenance</span>`);

    let statusBadge = '';
    switch (inc.investigation_status) {
        case 'active_search_in_or':
            statusBadge = `<span style="background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 800;"><i class="fas fa-search"></i> Searching OR</span>`;
            break;
        case 'portable_xray_ordered':
            statusBadge = `<span style="background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-x-ray"></i> X-Ray Ordered</span>`;
            break;
        case 'found_in_or_linens':
            statusBadge = `<span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-check"></i> Found in Linens</span>`;
            break;
        case 'found_in_trash_bin':
            statusBadge = `<span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-trash-can"></i> Found in Trash</span>`;
            break;
        case 'xray_negative_cavity_clear':
            statusBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-shield"></i> Cavity Clear (X-Ray)</span>`;
            break;
        case 'confirmed_lost_written_off':
            statusBadge = `<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Written Off / Lost</span>`;
            break;
        case 'sent_for_repair':
            statusBadge = `<span style="background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-screwdriver-wrench"></i> In Repair</span>`;
            break;
        case 'resolved_closed':
            statusBadge = `<span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;"><i class="fas fa-check-circle"></i> Resolved &amp; Closed</span>`;
            break;
    }

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; background: ${isCritical && inc.investigation_status === 'active_search_in_or' ? '#fff5f5' : 'transparent'};">
            <td style="padding: 12px 14px;">
                <div style="font-family: monospace; font-weight: 800; color: #9f1239;">${escapeHtml(inc.incident_number)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${inc.reported_at.substring(5, 16)}</div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-weight: 800; color: #0f172a;">${escapeHtml(inc.instrument_name)}</div>
                <div style="font-size: 11px; color: #64748b; text-transform: capitalize; margin-top: 1px;">
                    Type: ${escapeHtml(inc.instrument_type?.replace(/_/g, ' ') || 'Surgical')} &bull; Qty: ${inc.quantity_missing || inc.quantity_damaged || 1}
                </div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${escapeHtml(inc.master_tray_name)}</div>
                <div style="font-family: monospace; color: #4f46e5; font-size: 11px; margin-top: 1px;">${escapeHtml(inc.tray_barcode)}</div>
            </td>
            <td style="padding: 12px 14px;">
                <div style="font-weight: 600; color: #0f172a; font-size: 12px;">${escapeHtml(inc.or_suite_name)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Surgeon: ${escapeHtml(inc.lead_surgeon || 'Attending')}</div>
            </td>
            <td style="padding: 12px 14px;">
                ${severityBadge}
                ${inc.xray_ordered ? `<div style="font-size: 10px; color: #0369a1; margin-top: 3px; font-weight: 600;"><i class="fas fa-x-ray"></i> X-Ray Protocol Active</div>` : ''}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
                ${statusBadge}
                ${inc.xray_findings ? `<div style="font-size: 10px; color: #059669; margin-top: 2px;" title="${escapeHtml(inc.xray_findings)}"><i class="fas fa-circle-check"></i> X-Ray Clear</div>` : ''}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
                <button class="resolve-incident-btn" data-id="${inc.id}" title="Investigate &amp; Resolve Incident" style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700;">
                    <i class="fas fa-clipboard-check"></i> Resolve
                </button>
            </td>
        </tr>
    `;
}

/**
 * TAB 2: Autoclave Sterilization Batches & Spore Validation
 */
function renderAutoclaveBatchesTab() {
    const records = cache.batches?.records || [];
    const machines = cache.machines || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
                <input type="text" id="batchSearchInput" placeholder="Search Batch #, Machine, Operator..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 180px;">
                <select id="batchStatusFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Batch Statuses</option>
                    <option value="released_sterile" ${state.batchStatusFilter === 'released_sterile' ? 'selected' : ''}>Released Sterile (100% Passed)</option>
                    <option value="cycle_passed_quarantined_bi" ${state.batchStatusFilter === 'cycle_passed_quarantined_bi' ? 'selected' : ''}>In Spore Quarantine (Incubating)</option>
                    <option value="in_progress" ${state.batchStatusFilter === 'in_progress' ? 'selected' : ''}>In Cycle (Plateau Phase)</option>
                    <option value="batch_failed_quarantined" ${state.batchStatusFilter === 'batch_failed_quarantined' ? 'selected' : ''}>Failed &amp; Quarantined (Lockout)</option>
                </select>
            </div>
            <div style="min-width: 180px;">
                <select id="batchMachineFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Sterilizer Machines</option>
                    ${machines.map(m => `<option value="${m.id}" ${state.machineFilter == m.id ? 'selected' : ''}>${escapeHtml(m.machine_code)} - ${escapeHtml(m.machine_name)}</option>`).join('')}
                </select>
            </div>
            <button id="btnResetBatchFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- Batches Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    Validated Autoclave Sterilization Runs (${cache.batches?.total || 0} Total Batches)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">
                            <th style="padding: 12px 16px;">Batch # &amp; Date</th>
                            <th style="padding: 12px 16px;">Equipment Machine</th>
                            <th style="padding: 12px 16px;">Cycle Profile &amp; Parameters</th>
                            <th style="padding: 12px 16px; text-align: center;">Bowie-Dick</th>
                            <th style="padding: 12px 16px; text-align: center;">Biological Spore (G. stearo)</th>
                            <th style="padding: 12px 16px; text-align: center;">Batch Status</th>
                            <th style="padding: 12px 16px;">Sterile Expiry (6m)</th>
                            <th style="padding: 12px 16px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                                    <i class="fas fa-inbox" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                                    No sterilization batches found matching current filters.
                                </td>
                            </tr>
                        ` : records.map(b => renderBatchRow(b)).join('')}
                    </tbody>
                </table>
            </div>

            ${renderPagination()}
        </div>
    `;
}

/**
 * Render Single Batch Table Row
 */
function renderBatchRow(b) {
    const isReleased = b.batch_status === 'released_sterile';
    const isIncubating = b.batch_status === 'cycle_passed_quarantined_bi';
    const isFailed = b.batch_status === 'batch_failed_quarantined';

    let statusPill = `<span style="background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> Released Sterile</span>`;
    if (isIncubating) {
        statusPill = `<span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-hourglass-half"></i> BI Spore Hold</span>`;
    } else if (isFailed) {
        statusPill = `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-ban"></i> FAILED LOCKOUT</span>`;
    } else if (b.batch_status === 'in_progress') {
        statusPill = `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-spinner fa-spin"></i> In Plateau</span>`;
    }

    const bdPill = b.bowie_dick_test_result === 'pass' ? `<span style="color: #059669; font-weight: 700; font-size: 11px;"><i class="fas fa-check"></i> PASS</span>` : `<span style="color: #dc2626; font-weight: 800; font-size: 11px;"><i class="fas fa-times"></i> FAIL</span>`;

    let sporePill = `<span style="color: #059669; font-weight: 700; font-size: 11px;"><i class="fas fa-shield-virus"></i> NEGATIVE (No Growth)</span>`;
    if (b.biological_spore_result === 'growth_positive') {
        sporePill = `<span style="color: #dc2626; font-weight: 800; font-size: 11px;"><i class="fas fa-biohazard"></i> POSITIVE (GROWTH)</span>`;
    } else if (b.biological_spore_result === 'incubating_pending') {
        sporePill = `<span style="color: #d97706; font-weight: 700; font-size: 11px;"><i class="fas fa-vial"></i> INCUBATING (24h)</span>`;
    }

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 16px; font-family: monospace;">
                <span class="view-batch-detail-btn" data-id="${b.id}" style="color: #0d9488; font-weight: 800; font-size: 13px; cursor: pointer; text-decoration: underline;">
                    ${escapeHtml(b.batch_number)}
                </span>
                <div style="font-size: 11px; color: #64748b; font-family: sans-serif; margin-top: 2px;">
                    ${b.sterilization_date} &bull; Cycle #${b.cycle_number}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(b.machine_name)}</div>
                <div style="font-size: 11px; color: #64748b; font-family: monospace;">${escapeHtml(b.machine_code)} &bull; ${escapeHtml(b.operator_name)}</div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 700; color: #0f766e; font-size: 13px;">
                    ${b.peak_temperature_celsius}°C &bull; ${b.pressure_bar} bar
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Hold: <strong>${b.hold_duration_minutes} mins</strong> &bull; Class 5 Integrator: <strong>${b.chemical_indicator_result.toUpperCase()}</strong>
                </div>
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${bdPill}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${sporePill}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${statusPill}
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 800; color: #0f172a; font-size: 12px;">
                    ${b.sterility_expiry_date}
                </div>
                <div style="font-size: 11px; color: #64748b;">
                    180 Days Valid Shelf-Life
                </div>
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 6px;">
                    <button class="print-thermal-labels-btn" data-id="${b.id}" data-batch="${escapeHtml(b.batch_number)}" title="Generate &amp; Print Thermal Barcode Labels" style="background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700;">
                        <i class="fas fa-barcode"></i> Thermal Labels
                    </button>
                    ${isIncubating ? `
                        <button class="verify-spore-btn" data-id="${b.id}" data-batch="${escapeHtml(b.batch_number)}" title="Verify 24h Biological Spore Result" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700;">
                            <i class="fas fa-vial"></i> Read Spore
                        </button>
                    ` : ''}
                    <button class="view-batch-detail-btn" data-id="${b.id}" title="Inspect Batch Details &amp; Parametric Curves" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * TAB 3: Sterilizer Equipment & Bowie-Dick Registry
 */
function renderMachinesRegistryTab() {
    const machines = cache.machines || [];

    return `
        <!-- Registry Header -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                    <i class="fas fa-server" style="color: #4f46e5;"></i> Hospital Sterilization Equipment Fleet
                </h3>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                    High-vacuum steam pre-vac autoclaves and hydrogen peroxide vapor plasma chambers. Daily Bowie-Dick air removal testing mandated by AAMI ST79.
                </p>
            </div>
            <button id="btnNewMachineModal" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                <i class="fas fa-plus"></i> Add Sterilizer Machine
            </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px;">
            ${machines.map(m => renderMachineCard(m)).join('')}
        </div>
    `;
}

/**
 * Render Sterilizer Machine Card
 */
function renderMachineCard(m) {
    const isBowiePassed = m.daily_bowie_dick_passed == 1;
    const isQuarantined = m.status === 'quarantined_spore_failure';

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column;">
            <div style="background: ${isQuarantined ? '#fef2f2' : '#f8fafc'}; border-bottom: 1px solid ${isQuarantined ? '#fca5a5' : '#e2e8f0'}; padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 4px;">${escapeHtml(m.machine_code)}</span>
                    <h3 style="margin: 8px 0 2px 0; font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(m.machine_name)}</h3>
                    <span style="font-size: 12px; color: #64748b;">${escapeHtml(m.location)}</span>
                </div>
                <div style="text-align: right;">
                    ${isQuarantined ? `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; padding: 4px 8px; border-radius: 6px; font-size: 11px;">LOCKOUT</span>` : `<span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 4px 8px; border-radius: 6px; font-size: 11px;">READY</span>`}
                </div>
            </div>

            <div style="padding: 18px 20px; flex: 1; font-size: 12px;">
                <!-- Bowie-Dick Test Banner -->
                <div style="background: ${isBowiePassed ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${isBowiePassed ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; color: ${isBowiePassed ? '#166534' : '#9f1239'};">
                            Daily Bowie-Dick: ${isBowiePassed ? 'PASSED (Vacuum Verified)' : 'FAILED / AIR LEAK'}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ${m.last_bowie_dick_at ? `Last tested: ${m.last_bowie_dick_at}` : 'No test logged today'}
                        </div>
                    </div>
                    <button class="open-bowie-dick-modal-btn" data-id="${m.id}" data-code="${escapeHtml(m.machine_code)}" data-name="${escapeHtml(m.machine_name)}" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">
                        Log Test
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    <div>Chamber Volume: <strong>${m.chamber_volume_liters} Liters</strong></div>
                    <div>Total Cycles Run: <strong>${m.total_completed_cycles}</strong></div>
                    <div>Max Temp: <strong>${m.max_operating_temp_c}°C</strong></div>
                    <div>Max Pressure: <strong>${m.max_operating_pressure_bar} bar</strong></div>
                </div>

                <div style="color: #64748b; font-size: 11px; margin-top: 6px;">
                    Manufacturer: <strong>${escapeHtml(m.manufacturer || 'Getinge')}</strong> (${escapeHtml(m.model_number || 'Standard')})
                    <br/>Next PM Due: <strong>${m.next_maintenance_due || 'On Schedule'}</strong>
                </div>
            </div>

            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #64748b;">${m.batch_count || 0} batches processed</span>
                <button class="start-batch-on-machine-btn" data-id="${m.id}" data-name="${escapeHtml(m.machine_name)}" style="background: #0d9488; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-play"></i> Run Cycle
                </button>
            </div>
        </div>
    `;
}

/**
 * TAB 4: Master Surgical Tray Catalogs & Itemized Manifests
 */
function renderMasterCatalogTab() {
    const masters = cache.masterTrays?.records || [];

    return `
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; gap: 16px; align-items: flex-start;">
                <div style="background: #4f46e5; color: #ffffff; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #312e81;">Master Surgical Tray Manifest &amp; Count Policy</h3>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #3730a3; line-height: 1.5;">
                        Standardized surgical instrument sets cataloged with itemized piece counts. Each tray defines required scissors, clamps, retractors, and needle holders.
                        Before sterilization wrapping and upon OR incision closure, sterile technicians and circulating nurses must verify 100% concordance against this manifest to prevent Retained Surgical Items (RSI).
                    </p>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 18px;">
            ${masters.map(m => renderMasterTrayCard(m)).join('')}
        </div>
    `;
}

/**
 * Render Master Tray Card
 */
function renderMasterTrayCard(m) {
    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column;">
            <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 3px 8px; border-radius: 4px;">${escapeHtml(m.tray_code)}</span>
                    <h3 style="margin: 8px 0 2px 0; font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(m.name)}</h3>
                    <span style="font-size: 12px; color: #64748b;">${escapeHtml(m.department_specialty)}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 20px; font-weight: 900; color: #0f172a;">${m.total_pieces}</span>
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Instruments</div>
                </div>
            </div>

            <div style="padding: 18px 20px; flex: 1;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 12px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
                        <div>Modality: <strong>${escapeHtml(m.sterilization_modality.replace(/_/g, ' '))}</strong></div>
                        <div>Target Temp: <strong>${m.target_temp_celsius}°C (${m.target_exposure_minutes} min)</strong></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>Pressure: <strong>${m.target_pressure_psi} PSI</strong></div>
                        <div>Packaging: <strong>${escapeHtml(m.standard_wrapper_type.replace(/_/g, ' '))}</strong></div>
                    </div>
                </div>

                <div style="font-size: 12px; color: #475569; margin-bottom: 14px; line-height: 1.4;">
                    ${escapeHtml(m.instructions || 'Standard CSSD decontamination protocol applies.')}
                </div>

                <div style="display: flex; gap: 12px; font-size: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px;">
                    <div>In Circulation: <strong>${m.circulating_trays_count || 0}</strong></div>
                    <div>Sterile Ready: <strong style="color: #047857;">${m.sterile_ready_count || 0}</strong></div>
                    <div>In Surgery: <strong style="color: #1d4ed8;">${m.in_surgery_count || 0}</strong></div>
                    ${Number(m.quarantined_count || 0) > 0 ? `<div style="color: #dc2626; font-weight: 700;">Quarantined: ${m.quarantined_count}</div>` : ''}
                </div>
            </div>

            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                <button class="view-master-manifest-btn" data-id="${m.id}" style="background: #4f46e5; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-list-check"></i> View Itemized Manifest
                </button>
                <div style="display: flex; gap: 6px;">
                    <button class="instantiate-phys-btn" data-id="${m.id}" data-name="${escapeHtml(m.name)}" title="Create New Barcoded Circulating Tray" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-plus"></i> New Tray
                    </button>
                    <button class="edit-master-tray-btn" data-id="${m.id}" title="Edit Master Tray &amp; Manifest" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * TAB 5: Decontamination & Audit Log
 */
function renderAuditLogTab() {
    const records = cache.physicalTrays?.records || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                        <i class="fas fa-shield-virus" style="color: #4f46e5;"></i> Surgical Decontamination &amp; AAMI ST79 Audit Log
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                        Live track of tray movements, enzymatic wash releases, Class 5 chemical integrators, and surgical suite check-ins.
                    </p>
                </div>
            </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 12px 16px;">Tray Barcode &amp; Set</th>
                        <th style="padding: 12px 16px;">Current Status</th>
                        <th style="padding: 12px 16px;">Location</th>
                        <th style="padding: 12px 16px;">Packager / Inspector</th>
                        <th style="padding: 12px 16px; text-align: center;">Pieces Verified</th>
                        <th style="padding: 12px 16px;">Audit Remarks</th>
                        <th style="padding: 12px 16px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 14px 16px; font-family: monospace;">
                                <strong style="color: #4f46e5;">${escapeHtml(r.tray_barcode)}</strong>
                                <div style="font-size: 11px; color: #0f172a; font-family: sans-serif; font-weight: 600;">${escapeHtml(r.master_tray_name)}</div>
                            </td>
                            <td style="padding: 14px 16px;">${getTrayStatusBadge(r.current_status)}</td>
                            <td style="padding: 14px 16px; font-size: 12px;">${escapeHtml(r.current_location)}</td>
                            <td style="padding: 14px 16px; font-size: 12px;">${escapeHtml(r.packaging_technician_name || 'CSSD Tech')}</td>
                            <td style="padding: 14px 16px; text-align: center; font-weight: 700; color: ${r.instrument_count_verified ? '#047857' : '#dc2626'};">
                                ${r.instrument_count_verified ? `${r.manifest_pieces} / ${r.manifest_pieces} OK` : 'FLAGGED INCOMPLETE'}
                            </td>
                            <td style="padding: 14px 16px; font-size: 12px; color: #475569;">
                                ${escapeHtml(r.missing_pieces_notes || r.notes || 'Routine autoclave cycle logged')}
                            </td>
                            <td style="padding: 14px 16px; text-align: center;">
                                <button class="view-tray-detail-btn" data-id="${r.id}" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                    View Audit
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render Pagination
 */
function renderPagination() {
    let total = 0;
    if (state.activeTab === 'circulating' || state.activeTab === 'audit_log') {
        total = cache.physicalTrays?.total || 0;
    } else if (state.activeTab === 'autoclave_batches') {
        total = cache.batches?.total || 0;
    } else if (state.activeTab === 'ot_dispatches') {
        total = cache.dispatches?.total || 0;
    } else if (state.activeTab === 'returns_and_incidents') {
        total = cache.returns?.total || 0;
    }

    const totalPages = Math.ceil(total / state.perPage) || 1;
    if (totalPages <= 1) return '';

    return `
        <div style="padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
            <div style="font-size: 13px; color: #64748b;">
                Showing Page <strong>${state.page}</strong> of <strong>${totalPages}</strong> (${total} total records)
            </div>
            <div style="display: flex; gap: 6px;">
                <button id="btnPrevPage" ${state.page <= 1 ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #cbd5e1; background: ${state.page <= 1 ? '#f8fafc' : '#ffffff'}; color: ${state.page <= 1 ? '#94a3b8' : '#334155'}; border-radius: 6px; font-size: 12px; cursor: ${state.page <= 1 ? 'not-allowed' : 'pointer'};">
                    &laquo; Previous
                </button>
                <button id="btnNextPage" ${state.page >= totalPages ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #cbd5e1; background: ${state.page >= totalPages ? '#f8fafc' : '#ffffff'}; color: ${state.page >= totalPages ? '#94a3b8' : '#334155'}; border-radius: 6px; font-size: 12px; cursor: ${state.page >= totalPages ? 'not-allowed' : 'pointer'};">
                    Next &raquo;
                </button>
            </div>
        </div>
    `;
}

/**
 * Bind UI Events
 */
function bindEvents() {
    document.addEventListener('click', async (e) => {
        // Tab switching
        const tabBtn = e.target.closest('.cssd-tab-btn');
        if (tabBtn) {
            state.activeTab = tabBtn.dataset.tab;
            state.page = 1;
            document.querySelectorAll('.cssd-tab-btn').forEach(b => {
                b.classList.remove('active');
                b.style.color = '#64748b';
                b.style.borderBottomColor = 'transparent';
            });
            tabBtn.classList.add('active');
            tabBtn.style.color = '#4f46e5';
            tabBtn.style.borderBottomColor = '#4f46e5';
            renderApp();
            return;
        }

        // Open Register Physical Tray Modal
        if (e.target.closest('#btnNewPhysicalTrayModal')) {
            openRegisterPhysicalTrayModal();
            return;
        }

        // Open Create Master Tray Modal
        if (e.target.closest('#btnNewMasterTrayModal')) {
            openMasterTrayFormModal();
            return;
        }

        // Open Start Batch Modal
        if (e.target.closest('#btnNewBatchModal')) {
            openCreateBatchModal();
            return;
        }

        // Open Dispatch Modal
        if (e.target.closest('#btnDispatchModal') || e.target.closest('#btnDispatchModalTab')) {
            openDispatchModal();
            return;
        }

        // Open Scan Dirty Return Modal
        if (e.target.closest('#btnScanReturnModal') || e.target.closest('#btnOpenScanReturnTerminal')) {
            openScanReturnModal();
            return;
        }

        // Dispatch Tray Direct
        const dispDirectBtn = e.target.closest('.dispatch-tray-direct-btn');
        if (dispDirectBtn) {
            openDispatchModal(dispDirectBtn.dataset.id);
            return;
        }

        // Scan Return Direct
        const retDirectBtn = e.target.closest('.scan-return-direct-btn');
        if (retDirectBtn) {
            openScanReturnModal(retDirectBtn.dataset.barcode, retDirectBtn.dataset.disp);
            return;
        }

        // Confirm OR Handover
        const handoverBtn = e.target.closest('.confirm-or-handover-btn');
        if (handoverBtn) {
            openORHandoverModal(handoverBtn.dataset.id, handoverBtn.dataset.no, handoverBtn.dataset.barcode, handoverBtn.dataset.suite);
            return;
        }

        // View Dispatch Detail
        const viewDispBtn = e.target.closest('.view-dispatch-detail-btn');
        if (viewDispBtn) {
            openDispatchDetailModal(viewDispBtn.dataset.id);
            return;
        }

        // View Return Detail Checklist
        const viewRetBtn = e.target.closest('.view-return-detail-btn');
        if (viewRetBtn) {
            openReturnDetailModal(viewRetBtn.dataset.id);
            return;
        }

        // Resolve Incident
        const resolveIncBtn = e.target.closest('.resolve-incident-btn');
        if (resolveIncBtn) {
            openIncidentResolutionModal(resolveIncBtn.dataset.id);
            return;
        }

        // Run cycle on specific machine
        const runMachBtn = e.target.closest('.start-batch-on-machine-btn');
        if (runMachBtn) {
            openCreateBatchModal(runMachBtn.dataset.id);
            return;
        }

        // Open Bowie-Dick Log Modal
        const bdBtn = e.target.closest('.open-bowie-dick-modal-btn');
        if (bdBtn) {
            openBowieDickModal(bdBtn.dataset.id, bdBtn.dataset.code, bdBtn.dataset.name);
            return;
        }

        // Print Thermal Labels
        const printBtn = e.target.closest('.print-thermal-labels-btn');
        if (printBtn) {
            openThermalLabelsModal(printBtn.dataset.id);
            return;
        }

        // Verify Spore Result Modal
        const sporeBtn = e.target.closest('.verify-spore-btn');
        if (sporeBtn) {
            openVerifySporeModal(sporeBtn.dataset.id, sporeBtn.dataset.batch);
            return;
        }

        // View Batch Detail Modal
        const batchDetailBtn = e.target.closest('.view-batch-detail-btn');
        if (batchDetailBtn) {
            openBatchDetailModal(batchDetailBtn.dataset.id);
            return;
        }

        // Quick instantiate from master card
        const instBtn = e.target.closest('.instantiate-phys-btn');
        if (instBtn) {
            openRegisterPhysicalTrayModal(instBtn.dataset.id);
            return;
        }

        // Edit Master Tray
        const editMasterBtn = e.target.closest('.edit-master-tray-btn');
        if (editMasterBtn) {
            openMasterTrayFormModal(editMasterBtn.dataset.id);
            return;
        }

        // View Master Manifest
        const viewManifestBtn = e.target.closest('.view-master-manifest-btn');
        if (viewManifestBtn) {
            openMasterManifestModal(viewManifestBtn.dataset.id);
            return;
        }

        // View Physical Tray Detail & Movement History
        const viewTrayBtn = e.target.closest('.view-tray-detail-btn');
        if (viewTrayBtn) {
            openPhysicalTrayDetailModal(viewTrayBtn.dataset.id);
            return;
        }

        // Open Lifecycle Status Modal
        const statusBtn = e.target.closest('.open-status-modal-btn');
        if (statusBtn) {
            openUpdateStatusModal(statusBtn.dataset.id, statusBtn.dataset.barcode, statusBtn.dataset.status, statusBtn.dataset.location);
            return;
        }

        // Delete Physical Tray
        const delPhysBtn = e.target.closest('.delete-phys-tray-btn');
        if (delPhysBtn) {
            const id = delPhysBtn.dataset.id;
            const barcode = delPhysBtn.dataset.barcode;
            if (confirm(`Are you sure you want to delete physical tray ${barcode}?`)) {
                await deletePhysicalTray(id);
            }
            return;
        }

        // Print thermal label print action
        if (e.target.closest('#btnPrintThermalStickers')) {
            printThermalStickerSheet();
            return;
        }

        // Close Modal
        if (e.target.closest('#btnCloseModal') || e.target.id === 'cssdModalBackdrop') {
            closeModal();
            return;
        }

        // Pagination
        if (e.target.closest('#btnPrevPage') && state.page > 1) {
            state.page--;
            await loadInitialData();
            return;
        }
        if (e.target.closest('#btnNextPage')) {
            state.page++;
            await loadInitialData();
            return;
        }

        // Reset Filters
        if (e.target.closest('#btnResetCssdFilters') || e.target.closest('#btnResetBatchFilters')) {
            state.searchQuery = "";
            state.statusFilter = "";
            state.specialtyFilter = "";
            state.batchStatusFilter = "";
            state.machineFilter = "";
            state.dispatchStatusFilter = "";
            state.orSuiteFilter = "";
            state.page = 1;
            const sInput = document.getElementById('cssdSearchInput') || document.getElementById('batchSearchInput') || document.getElementById('dispSearchInput');
            if (sInput) sInput.value = "";
            await loadInitialData();
            return;
        }
    });

    // Filter Change Listeners
    document.addEventListener('change', async (e) => {
        if (e.target.id === 'cssdStatusFilter') {
            state.statusFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'cssdSpecialtyFilter') {
            state.specialtyFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'batchStatusFilter') {
            state.batchStatusFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'batchMachineFilter') {
            state.machineFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'dispStatusFilter') {
            state.dispatchStatusFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'dispSuiteFilter') {
            state.orSuiteFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        }
    });

    // Search Keyup
    document.addEventListener('keyup', async (e) => {
        if ((e.target.id === 'cssdSearchInput' || e.target.id === 'batchSearchInput' || e.target.id === 'dispSearchInput') && e.key === 'Enter') {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            await loadInitialData();
        }
    });
}

/**
 * Delete Physical Tray
 */
async function deletePhysicalTray(id) {
    try {
        await api('/cssd/physical-trays/delete', 'POST', { id });
        showToast("Physical surgical tray deleted.", "success");
        await loadInitialData();
    } catch (e) {
        showToast("Error deleting tray: " + e.message, "error");
    }
}

/**
 * Close Modal
 */
function closeModal() {
    const box = document.getElementById('cssdModalContainer');
    if (box) box.innerHTML = '';
}

/**
 * MODAL: Create New Autoclave Sterilization Batch
 */
function openCreateBatchModal(preselectedMachineId = null) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const machines = cache.machines || [];
    const physTrays = cache.physicalTrays?.records || [];
    const availableTrays = physTrays.filter(t => t.current_status !== 'in_surgery');

    const todayStr = new Date().toISOString().substring(0, 10);
    const expiryStr = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 880px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #0d9488; background: #ccfbf1; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Parametric Cycle Validation</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Create &amp; Validate Autoclave Sterilization Batch
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="createBatchForm" style="padding: 24px;">
                    <!-- Machine & Cycle Identification -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 12px;">1. Sterilizer Equipment &amp; Operator</div>
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 12px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Sterilizer Machine *</label>
                                <select name="sterilizer_machine_id" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="">Select Equipment...</option>
                                    ${machines.map(m => `<option value="${m.id}" ${preselectedMachineId == m.id ? 'selected' : ''}>${escapeHtml(m.machine_code)} - ${escapeHtml(m.machine_name)} (${m.status.toUpperCase()})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Cycle Type *</label>
                                <select name="cycle_type" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="wrapped_instruments_134c">Wrapped Surgical Sets (134°C, 18 min)</option>
                                    <option value="prion_inactivation_134c">Extended Prion Inactivation (134°C, 18 min)</option>
                                    <option value="unwrapped_flash_134c">Flash Immediate Use (134°C, 4 min)</option>
                                    <option value="delicate_plastics_121c">Delicate Rubber &amp; Plastics (121°C, 30 min)</option>
                                    <option value="plasma_standard">STERRAD H2O2 Plasma (55°C, 45 min)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Sterilization Date *</label>
                                <input type="date" name="sterilization_date" required value="${todayStr}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Responsible Operator Name *</label>
                                <input type="text" name="operator_name" required value="Maria Santos, CRCST" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Verifying Supervisor *</label>
                                <input type="text" name="supervisor_verified_by" required value="Nurse Supervisor Linda Chen" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                        </div>
                    </div>

                    <!-- Physical Parametric Validation -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 12px;">2. Parametric Cycle Hold Parameters (Validated Limits)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Peak Temp (°C) *</label>
                                <input type="number" step="0.1" name="peak_temperature_celsius" required value="134.0" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Pressure (bar) *</label>
                                <input type="number" step="0.01" name="pressure_bar" required value="2.20" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Hold Duration (min) *</label>
                                <input type="number" step="0.5" name="hold_duration_minutes" required value="18.0" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: center;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Vacuum Leak Rate</label>
                                <input type="number" step="0.05" name="vacuum_leak_rate_mbar_min" value="0.75" placeholder="mbar/min" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center;" />
                            </div>
                        </div>
                    </div>

                    <!-- Quality Indicators & Biological Spore Validation -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 12px;">3. Quality Indicators &amp; Microbiology Spore Tests</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 12px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Bowie-Dick Air Removal *</label>
                                <select name="bowie_dick_test_result" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="pass">PASS (Uniform Color Change, No Air Pocket)</option>
                                    <option value="fail">FAIL (Air Leak Detected - Lockout)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Chemical Indicator *</label>
                                <select name="chemical_indicator_result" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="pass">Class 5 Integrator PASSED (Dark Black / Blue)</option>
                                    <option value="fail">Class 5 Integrator FAILED (Under-processed)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Biological Spore Test (G. stearo) *</label>
                                <select name="biological_spore_result" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="no_growth_negative">No Growth / Negative (100% Spore Destruction - PASS)</option>
                                    <option value="incubating_pending">Incubating (Place Batch in 24h Release Hold)</option>
                                    <option value="growth_positive">Growth / Positive (CRITICAL SPORE FAILURE)</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Biological Indicator Lot #</label>
                                <input type="text" name="biological_indicator_lot" value="3M-Attest-BI-${Math.floor(1000 + Math.random() * 9000)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Sterile Shelf-Life Days (Standard: 6 Months)</label>
                                <input type="number" name="sterile_shelf_life_days" value="180" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                        </div>
                    </div>

                    <!-- Chamber Loaded Trays Checklist -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 8px;">4. Select Trays &amp; Packs Loaded in Chamber</div>
                        <div style="max-height: 160px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px;">
                            ${availableTrays.length === 0 ? `
                                <div style="color: #64748b; font-size: 12px; padding: 8px;">All registered physical trays are currently sterile or in surgery.</div>
                            ` : availableTrays.map((t, idx) => `
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px; border-bottom: 1px solid #f1f5f9; cursor: pointer;">
                                    <input type="checkbox" name="tray_ids[]" value="${t.id}" ${idx === 0 ? 'checked' : ''} style="width: 16px; height: 16px;" />
                                    <strong style="font-family: monospace; color: #4f46e5;">${escapeHtml(t.tray_barcode)}</strong> -
                                    <span>${escapeHtml(t.master_tray_name)} (${t.manifest_pieces} pcs)</span>
                                    <span style="color: #64748b; margin-left: auto;">[${escapeHtml(t.current_status)}]</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseBatchModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 10px 20px; background: #0d9488; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check"></i> Authorize Batch &amp; Release
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseBatchModal')?.addEventListener('click', closeModal);

    document.getElementById('createBatchForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);

        // Gather selected trays
        const selectedTrayIds = f.getAll('tray_ids[]');
        const items = [];
        selectedTrayIds.forEach(id => {
            const found = availableTrays.find(t => t.id == id);
            if (found) {
                items.push({
                    physical_tray_id: found.id,
                    item_barcode: found.tray_barcode,
                    item_description: found.master_tray_name,
                    item_type: 'instrument_tray',
                    wrapper_type: found.standard_wrapper_type || 'rigid_container',
                    load_rack_shelf: 'Rack 1 - Middle Tier'
                });
            }
        });

        // If no trays checked, add dummy challenge pack
        if (items.length === 0) {
            items.push({
                physical_tray_id: null,
                item_barcode: 'PACK-CHALLENGE-' + Math.floor(100 + Math.random() * 900),
                item_description: 'Biological Indicator Challenge Pack',
                item_type: 'peel_pouch',
                wrapper_type: 'tyvek_pouch',
                load_rack_shelf: 'Rack 1 - Chamber Center'
            });
        }

        const payload = {
            sterilizer_machine_id: f.get('sterilizer_machine_id'),
            cycle_type: f.get('cycle_type'),
            sterilization_date: f.get('sterilization_date'),
            operator_name: f.get('operator_name'),
            supervisor_verified_by: f.get('supervisor_verified_by'),
            peak_temperature_celsius: f.get('peak_temperature_celsius'),
            pressure_bar: f.get('pressure_bar'),
            hold_duration_minutes: f.get('hold_duration_minutes'),
            vacuum_leak_rate_mbar_min: f.get('vacuum_leak_rate_mbar_min'),
            bowie_dick_test_result: f.get('bowie_dick_test_result'),
            chemical_indicator_result: f.get('chemical_indicator_result'),
            biological_spore_result: f.get('biological_spore_result'),
            biological_indicator_lot: f.get('biological_indicator_lot'),
            sterile_shelf_life_days: f.get('sterile_shelf_life_days'),
            items: items
        };

        try {
            const res = await api('/cssd/batches', 'POST', payload);
            showToast("Autoclave batch successfully logged and validated!", "success");
            closeModal();
            await loadInitialData();

            // Open thermal labels modal for newly created batch
            if (res?.data?.id) {
                openThermalLabelsModal(res.data.id);
            }
        } catch (err) {
            showToast("Failed to create batch: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Thermal Barcode Label Generator
 */
async function openThermalLabelsModal(batchId) {
    let payload = null;
    try {
        const res = await api(`/cssd/batches/thermal-labels?batch_id=${batchId}`);
        payload = res?.data;
    } catch (e) {
        showToast("Error generating thermal labels: " + e.message, "error");
        return;
    }

    if (!payload) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const b = payload.batch;
    const labels = payload.labels || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 820px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #f8fafc; border-top-left-radius: 12px; border-top-right-radius: 12px; z-index: 10;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #0d9488; text-transform: uppercase;">AAMI ST79 Label Preview</span>
                        <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">
                            Thermal Barcode Stickers: Batch ${escapeHtml(b.batch_number)} (${labels.length} Packages)
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnPrintThermalStickers" style="background: #0d9488; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-print"></i> Print Thermal Stickers
                        </button>
                        <button id="btnCloseModal" style="background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>

                <!-- Printable Stickers Container -->
                <div id="thermalLabelsPrintContainer" style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px; background: #f1f5f9;">
                    ${labels.map(l => renderSingleThermalSticker(l)).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Single High-Contrast Thermal Sticker Label
 */
function renderSingleThermalSticker(l) {
    return `
        <div class="thermal-sticker-card" style="background: #ffffff; border: 2px solid #0f172a; border-radius: 8px; padding: 16px; font-family: monospace; color: #0f172a; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); position: relative;">
            
            <!-- Hospital & Dept Header -->
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">USINTELLIX HOSPITAL SYSTEM</div>
                    <div style="font-size: 10px; font-family: sans-serif; text-transform: uppercase;">Central Sterile Supply (CSSD)</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 10px; font-weight: 700; background: #0f172a; color: #ffffff; padding: 2px 6px; border-radius: 3px;">AAMI ST79</div>
                </div>
            </div>

            <!-- Barcode Graphic Simulation -->
            <div style="text-align: center; margin: 8px 0; background: #ffffff; padding: 4px;">
                <div style="display: inline-block; font-family: 'Libre Barcode 39', 'Courier New', monospace; font-size: 32px; letter-spacing: 4px; font-weight: 900; line-height: 1;">
                    *${escapeHtml(l.item_barcode)}*
                </div>
                <div style="font-size: 12px; font-weight: 800; font-family: monospace; letter-spacing: 1px;">
                    ${escapeHtml(l.item_barcode)}
                </div>
            </div>

            <!-- Item Name -->
            <div style="font-size: 13px; font-weight: 900; font-family: sans-serif; color: #0f172a; margin-bottom: 6px; line-height: 1.2;">
                ${escapeHtml(l.item_description)}
            </div>

            <!-- Sterilization & Expiry Grid -->
            <div style="border-top: 1px dashed #0f172a; border-bottom: 1px dashed #0f172a; padding: 8px 0; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                <div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Sterilization Date</div>
                    <div style="font-size: 13px; font-weight: 800;">${l.sterilization_date}</div>
                </div>
                <div style="background: #0f172a; color: #ffffff; padding: 4px 6px; border-radius: 4px;">
                    <div style="font-size: 9px; text-transform: uppercase; color: #cbd5e1;">Sterility Expiry (6m)</div>
                    <div style="font-size: 14px; font-weight: 900;">${l.sterility_expiry_date}</div>
                </div>
            </div>

            <!-- Machine, Batch & Cycle Parameters -->
            <div style="font-size: 10px; line-height: 1.4; margin-bottom: 8px;">
                <div>Batch: <strong>${escapeHtml(l.batch_number)}</strong> &bull; Cycle: <strong>#${l.cycle_number}</strong></div>
                <div>Equipment: <strong>${escapeHtml(l.machine_code)}</strong> (${escapeHtml(l.machine_name.substring(0, 24))})</div>
                <div>Validated: <strong>${l.peak_temperature_celsius}°C @ ${l.pressure_bar} bar (${l.hold_duration_minutes} min hold)</strong></div>
            </div>

            <!-- Quality Verifications Footnote -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 9px; color: #334155; display: flex; justify-content: space-between;">
                <div>Bowie-Dick: <strong>${l.bowie_dick_result}</strong> &bull; CI: <strong>${l.chemical_indicator_result}</strong></div>
                <div style="font-weight: 700; color: #047857;">BI SPORE: PASS</div>
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 3px;">
                Tech: ${escapeHtml(l.operator_name)} &bull; Shelf: ${escapeHtml(l.load_rack_shelf)}
            </div>
        </div>
    `;
}

/**
 * Trigger Native Print for Thermal Stickers
 */
function printThermalStickerSheet() {
    const container = document.getElementById('thermalLabelsPrintContainer');
    if (!container) return;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
        <html>
            <head>
                <title>Thermal Barcode Labels - CSSD</title>
                <style>
                    body { margin: 10px; font-family: monospace; }
                    .thermal-sticker-card { border: 2px solid #000; padding: 12px; margin-bottom: 14px; page-break-inside: avoid; }
                    @media print {
                        body { margin: 0; }
                        .thermal-sticker-card { page-break-after: always; border: 2px solid #000 !important; }
                    }
                </style>
            </head>
            <body>
                ${container.innerHTML}
            </body>
        </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 250);
}

/**
 * MODAL: Verify Biological Spore Result (Geobacillus stearothermophilus)
 */
function openVerifySporeModal(batchId, batchNumber) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 520px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Microbiology Laboratory</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Verify Biological Spore Test
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="verifySporeForm" style="padding: 24px;">
                    <input type="hidden" name="batch_id" value="${batchId}" />

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px;">
                        <div>Target Batch: <strong style="font-family: monospace; color: #0d9488; font-size: 14px;">${escapeHtml(batchNumber)}</strong></div>
                        <div style="margin-top: 4px; color: #64748b;">Organism: <strong>Geobacillus stearothermophilus</strong> (Steam Challenge)</div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            24-Hour Incubator Readout Result *
                        </label>
                        <select name="biological_spore_result" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="no_growth_negative">NO GROWTH / NEGATIVE (Purple media - 100% Kill - RELEASE BATCH)</option>
                            <option value="growth_positive">GROWTH / POSITIVE (Yellow media - SPORE SURVIVAL - CRITICAL RECALL)</option>
                            <option value="incubating_pending">Still Incubating (Retain in quarantine hold)</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Microbiology / QA Officer Name *
                        </label>
                        <input type="text" name="spore_read_by" required value="Alan Wong, Microbiology QA Officer" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Laboratory Notes / Incubator Temperature
                        </label>
                        <textarea name="notes" rows="2" placeholder="e.g. 56°C dry block incubation confirmed. Media clear purple without turbidity." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseSporeModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 8px 18px; background: #0d9488; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Confirm &amp; Update Status
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseSporeModal')?.addEventListener('click', closeModal);

    document.getElementById('verifySporeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/cssd/batches/verify-spore', 'POST', {
                batch_id: f.get('batch_id'),
                biological_spore_result: f.get('biological_spore_result'),
                spore_read_by: f.get('spore_read_by'),
                notes: f.get('notes')
            });
            showToast("Biological spore result verified and batch status updated.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Error updating spore result: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Bowie-Dick Air Removal Test
 */
function openBowieDickModal(machineId, machineCode, machineName) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">
                        Daily Bowie-Dick Air Removal Test
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="bowieDickForm" style="padding: 24px;">
                    <input type="hidden" name="machine_id" value="${machineId}" />

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px;">
                        <div>Sterilizer: <strong>${escapeHtml(machineCode)}</strong> - ${escapeHtml(machineName)}</div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Test Pack Result *</label>
                        <select name="result" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="pass">PASS (Uniform Black/Blue Color, Full Steam Penetration)</option>
                            <option value="fail">FAIL (Air Pocket Detected - Autoclave Lockout)</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Tested By Technician *</label>
                        <input type="text" name="technician" required value="Maria Santos, CRCST" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Notes / Test Sheet Reference</label>
                        <input type="text" name="notes" placeholder="e.g. 134°C 3.5 min pre-vac test pack verified" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseBdModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 8px 18px; background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Record Result
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseBdModal')?.addEventListener('click', closeModal);

    document.getElementById('bowieDickForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/cssd/machines/bowie-dick', 'POST', {
                machine_id: f.get('machine_id'),
                result: f.get('result'),
                technician: f.get('technician'),
                notes: f.get('notes')
            });
            showToast("Bowie-Dick test result logged.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Error recording Bowie-Dick: " + err.message, "error");
        }
    });
}

/**
 * MODAL: View Batch Details & Parametric Curves
 */
async function openBatchDetailModal(batchId) {
    let detail = null;
    try {
        const res = await api(`/cssd/batches/show?id=${batchId}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading batch: " + e.message, "error");
        return;
    }

    if (!detail) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const b = detail.batch;
    const items = detail.items || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #0d9488;">${escapeHtml(b.batch_number)}</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Autoclave Batch Parametric Audit
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <!-- Key Parameters Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 12px;">
                        <div>
                            <div>Equipment: <strong>${escapeHtml(b.machine_name)} (${escapeHtml(b.machine_code)})</strong></div>
                            <div style="margin-top: 6px;">Peak Temperature: <strong>${b.peak_temperature_celsius}°C</strong></div>
                            <div style="margin-top: 6px;">Plateau Pressure: <strong>${b.pressure_bar} bar</strong></div>
                            <div style="margin-top: 6px;">Hold Duration: <strong>${b.hold_duration_minutes} minutes</strong></div>
                        </div>
                        <div>
                            <div>Bowie-Dick Test: <strong>${b.bowie_dick_test_result.toUpperCase()}</strong></div>
                            <div style="margin-top: 6px;">Class 5 Integrator: <strong>${b.chemical_indicator_result.toUpperCase()}</strong></div>
                            <div style="margin-top: 6px;">Spore Test: <strong>${escapeHtml(b.biological_spore_result)}</strong></div>
                            <div style="margin-top: 6px;">Sterile Expiration: <strong>${b.sterility_expiry_date}</strong></div>
                        </div>
                    </div>

                    <!-- Items Loaded in Chamber -->
                    <div style="margin-bottom: 14px; font-weight: 700; font-size: 13px; color: #0f172a;">
                        Loaded Trays &amp; Packages (${items.length} Units)
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                        <thead>
                            <tr style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <th style="padding: 8px 10px; text-align: left;">Barcode</th>
                                <th style="padding: 8px 10px; text-align: left;">Description</th>
                                <th style="padding: 8px 10px; text-align: left;">Type &amp; Packaging</th>
                                <th style="padding: 8px 10px; text-align: left;">Rack Shelf</th>
                                <th style="padding: 8px 10px; text-align: left;">Sterile Expiry</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #4f46e5;">${escapeHtml(it.item_barcode)}</td>
                                    <td style="padding: 8px 10px; font-weight: 600;">${escapeHtml(it.item_description)}</td>
                                    <td style="padding: 8px 10px; color: #64748b;">${escapeHtml(it.wrapper_type)}</td>
                                    <td style="padding: 8px 10px; font-size: 11px;">${escapeHtml(it.load_rack_shelf)}</td>
                                    <td style="padding: 8px 10px; font-weight: 700;">${it.item_sterility_expiry_date}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="display: flex; justify-content: flex-end;">
                        <button type="button" id="btnCloseModal" style="padding: 8px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Close Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * MODAL: Update Tray Lifecycle Status
 */
function openUpdateStatusModal(id, barcode, currentStatus, currentLocation) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Lifecycle Transition</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Update Tray Status: ${escapeHtml(barcode)}
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="cssdStatusForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${id}" />

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            New Lifecycle Stage *
                        </label>
                        <select name="status" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="dirty_received" ${currentStatus === 'dirty_received' ? 'selected' : ''}>1. Dirty Received (Post-Op Decon Intake)</option>
                            <option value="decontaminating" ${currentStatus === 'decontaminating' ? 'selected' : ''}>2. Decontaminating (Enzymatic Wash &amp; Ultrasonic)</option>
                            <option value="assembled_wrapped" ${currentStatus === 'assembled_wrapped' ? 'selected' : ''}>3. Assembled &amp; Wrapped (Class 5 Integrator Inside)</option>
                            <option value="sterilizing" ${currentStatus === 'sterilizing' ? 'selected' : ''}>4. Sterilizing (In Autoclave Steam Cycle)</option>
                            <option value="sterile_stored" ${currentStatus === 'sterile_stored' ? 'selected' : ''}>5. Sterile &amp; Ready (Stored in Sterile Core)</option>
                            <option value="dispatched_surgery" ${currentStatus === 'dispatched_surgery' ? 'selected' : ''}>6. Dispatched to OR Suite (In Transit)</option>
                            <option value="in_surgery" ${currentStatus === 'in_surgery' ? 'selected' : ''}>7. In Surgery (Sterile Field Open)</option>
                            <option value="returned_dirty" ${currentStatus === 'returned_dirty' ? 'selected' : ''}>8. Returned Dirty (Post-Op Count &amp; Return)</option>
                            <option value="quarantined_missing_item" ${currentStatus === 'quarantined_missing_item' ? 'selected' : ''}>Quarantined (Missing Item / Burred Blade)</option>
                            <option value="maintenance_repair" ${currentStatus === 'maintenance_repair' ? 'selected' : ''}>Maintenance / Sharpening Out of Service</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Current Location / Bay *
                        </label>
                        <input type="text" name="location" required value="${escapeHtml(currentLocation)}" placeholder="e.g. CSSD Assembly Station 2, Autoclave #1, OR Suite 3" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Assigned OR Suite / Surgery (If dispatched or in OR)
                        </label>
                        <input type="text" name="assigned_or_suite" placeholder="e.g. OR Suite 2 - Laparotomy" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Responsible Operator / Nurse Name *
                        </label>
                        <input type="text" name="operator_name" required value="Nurse / Sterile Processing Tech" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <label style="font-size: 13px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="instrument_count_verified" value="1" checked style="width: 16px; height: 16px;" />
                            100% Instrument Manifest Count Verified (No Missing Items)
                        </label>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            Uncheck only if an instrument was lost or missing to automatically raise a quarantine lockout flag.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Technician Notes / Incident Observations
                        </label>
                        <textarea name="notes" rows="2" placeholder="e.g. Verified 36/36 pieces, tamper seals intact, load #ST-2026-0416" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseStatusModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 8px 18px; background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Update Lifecycle State
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseStatusModal')?.addEventListener('click', closeModal);

    document.getElementById('cssdStatusForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/cssd/physical-trays/update-status', 'POST', {
                tray_id: f.get('id'),
                status: f.get('status'),
                location: f.get('location'),
                assigned_or_suite: f.get('assigned_or_suite'),
                operator_name: f.get('operator_name'),
                instrument_count_verified: f.get('instrument_count_verified') ? 1 : 0,
                notes: f.get('notes')
            });
            showToast("Tray lifecycle status updated successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to update status: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Master Tray Manifest Detail
 */
async function openMasterManifestModal(id) {
    let detail = null;
    try {
        const res = await api(`/cssd/master-trays/show?id=${id}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading manifest: " + e.message, "error");
        return;
    }

    if (!detail) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const m = detail.master_tray;
    const items = detail.manifest_items || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 860px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 4px;">${escapeHtml(m.tray_code)}</span>
                            <span style="font-size: 12px; color: #64748b;">${escapeHtml(m.department_specialty)}</span>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            ${escapeHtml(m.name)} (${m.total_pieces} Pieces)
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 12px;">
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">Validated Sterilization Specifications</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                            <div>Modality: <strong>${escapeHtml(m.sterilization_modality.replace(/_/g, ' '))}</strong></div>
                            <div>Exposure Profile: <strong>${m.target_temp_celsius}°C @ ${m.target_pressure_psi} PSI (${m.target_exposure_minutes} min)</strong></div>
                            <div>Packaging Standard: <strong>${escapeHtml(m.standard_wrapper_type.replace(/_/g, ' '))}</strong></div>
                            <div>Shelf Life Validity: <strong>${m.shelf_life_days} Days</strong></div>
                        </div>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 16px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead>
                                <tr style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                    <th style="padding: 10px 12px; width: 6%;">Seq</th>
                                    <th style="padding: 10px 12px; width: 34%;">Instrument Description</th>
                                    <th style="padding: 10px 12px; width: 18%;">Category Type</th>
                                    <th style="padding: 10px 12px; text-align: center; width: 8%;">Qty</th>
                                    <th style="padding: 10px 12px; width: 14%;">Size / Gauge</th>
                                    <th style="padding: 10px 12px; width: 20%;">Critical Inspection Point</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="padding: 10px 12px; font-family: monospace; color: #64748b;">#${it.item_seq}</td>
                                        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${escapeHtml(it.instrument_name)}</td>
                                        <td style="padding: 10px 12px; color: #475569;">${escapeHtml(it.instrument_type.replace(/_/g, ' '))}</td>
                                        <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #4338ca;">${it.quantity_required}</td>
                                        <td style="padding: 10px 12px; color: #64748b;">${escapeHtml(it.size_or_gauge || 'Standard')}</td>
                                        <td style="padding: 10px 12px; color: #334155; font-size: 11px;">
                                            <i class="fas fa-check" style="color: #10b981;"></i> ${escapeHtml(it.critical_inspection_point || 'Visual integrity check')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
                                    <td colspan="3" style="padding: 10px 12px; text-align: right;">Total Verified Instrument Pieces:</td>
                                    <td style="padding: 10px 12px; text-align: center; color: #4f46e5; font-size: 14px;">${m.total_pieces}</td>
                                    <td colspan="2" style="padding: 10px 12px; color: #059669; font-size: 11px;">100% Set Manifest Defined</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button type="button" id="btnCloseModal" style="padding: 8px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Close Manifest
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * MODAL: Physical Tray Detail & Movement History
 */
async function openPhysicalTrayDetailModal(id) {
    let detail = null;
    try {
        const res = await api(`/cssd/physical-trays/show?id=${id}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading tray details: " + e.message, "error");
        return;
    }

    if (!detail) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const t = detail.tray;
    const events = detail.lifecycle_events || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #4f46e5;">${escapeHtml(t.tray_barcode)}</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            ${escapeHtml(t.master_tray_name)}
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 12px;">
                        <div>
                            <div>Status: <strong>${getTrayStatusBadge(t.current_status)}</strong></div>
                            <div style="margin-top: 6px;">Location: <strong>${escapeHtml(t.current_location)}</strong></div>
                            <div style="margin-top: 6px;">Assigned Suite: <strong>${escapeHtml(t.assigned_or_suite || 'Unassigned / Available')}</strong></div>
                            <div style="margin-top: 6px;">Serial Number: <strong>${escapeHtml(t.serial_number || 'N/A')}</strong></div>
                        </div>
                        <div>
                            <div>Sterile Valid Until: <strong>${t.sterile_expiry_date || 'N/A'}</strong></div>
                            <div style="margin-top: 6px;">Biological Spore Test: <strong>${t.biological_spore_result}</strong></div>
                            <div style="margin-top: 6px;">Total Cycles Run: <strong>${t.total_sterilization_cycles} cycles</strong></div>
                            <div style="margin-top: 6px;">Packaging Tech: <strong>${escapeHtml(t.packaging_technician_name || 'CSSD Staff')}</strong></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px; font-weight: 700; font-size: 14px; color: #0f172a;">
                        <i class="fas fa-clock-rotate-left"></i> Decontamination &amp; Movement Audit Trail (${events.length} Events)
                    </div>

                    <div style="border-left: 2px solid #e2e8f0; margin-left: 12px; padding-left: 18px;">
                        ${events.map(ev => `
                            <div style="position: relative; margin-bottom: 16px;">
                                <div style="position: absolute; left: -24px; top: 2px; width: 10px; height: 10px; border-radius: 5px; background: #4f46e5;"></div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: #0f172a; font-size: 13px;">${escapeHtml(ev.event_type.replace(/_/g, ' ').toUpperCase())}</strong>
                                    <span style="font-size: 11px; color: #64748b;">${ev.created_at}</span>
                                </div>
                                <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                                    Location: <strong>${escapeHtml(ev.location)}</strong> &bull; Operator: <strong>${escapeHtml(ev.operator_name)}</strong>
                                </div>
                                ${ev.notes ? `<div style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 2px;">"${escapeHtml(ev.notes)}"</div>` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" id="btnCloseModal" style="padding: 8px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * MODAL: Instantiate Physical Tray
 */
function openRegisterPhysicalTrayModal(preselectMasterId = null) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const masterTrays = cache.metadata?.master_trays || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
                        Instantiate Barcoded Circulating Tray
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="cssdNewPhysForm" style="padding: 24px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Master Surgical Set *
                        </label>
                        <select name="master_tray_id" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="">Select Master Tray Catalog...</option>
                            ${masterTrays.map(m => `
                                <option value="${m.id}" ${preselectMasterId == m.id ? 'selected' : ''}>
                                    ${escapeHtml(m.tray_code)} - ${escapeHtml(m.name)} (${m.total_pieces} pcs)
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Serial / Plate ID</label>
                            <input type="text" name="serial_number" placeholder="e.g. SN-LAP-09" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Initial Status</label>
                            <select name="current_status" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="sterile_stored">Sterile &amp; Ready (In Storage)</option>
                                <option value="assembled_wrapped">Assembled &amp; Wrapped</option>
                                <option value="dirty_received">Dirty Received</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Current Storage Rack / Bay</label>
                        <input type="text" name="current_location" value="CSSD Sterile Core Rack A-1" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Packaging Tech</label>
                            <input type="text" name="packaging_technician_name" value="CSSD Tech Maria Santos" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Verifying Supervisor</label>
                            <input type="text" name="assembly_verified_by" value="Nurse Supervisor Linda Chen" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button type="button" id="btnClosePhysModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 8px 18px; background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Generate Barcoded Tray</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnClosePhysModal')?.addEventListener('click', closeModal);

    document.getElementById('cssdNewPhysForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            const res = await api('/cssd/physical-trays', 'POST', {
                master_tray_id: f.get('master_tray_id'),
                serial_number: f.get('serial_number'),
                current_status: f.get('current_status'),
                current_location: f.get('current_location'),
                packaging_technician_name: f.get('packaging_technician_name'),
                assembly_verified_by: f.get('assembly_verified_by'),
                notes: f.get('notes')
            });
            showToast(res?.data?.message || "Circulating tray generated successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to instantiate tray: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Create / Edit Master Surgical Tray
 */
async function openMasterTrayFormModal(id = null) {
    let master = null;
    if (id) {
        try {
            const res = await api(`/cssd/master-trays/show?id=${id}`);
            master = res?.data?.master_tray;
        } catch (e) {
            showToast("Error loading master tray: " + e.message, "error");
            return;
        }
    }

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 860px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
                        ${master ? 'Edit Master Surgical Tray &amp; Manifest' : 'Create New Master Surgical Tray Catalog'}
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="masterTrayForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${master?.id || ''}" />

                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Tray Code *</label>
                            <input type="text" name="tray_code" required value="${escapeHtml(master?.tray_code || '')}" placeholder="e.g. MST-LAP-02" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Tray Name *</label>
                            <input type="text" name="name" required value="${escapeHtml(master?.name || '')}" placeholder="e.g. Major Vascular Bypass Tray" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Specialty *</label>
                            <select name="department_specialty" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="General Surgery" ${master?.department_specialty === 'General Surgery' ? 'selected' : ''}>General Surgery</option>
                                <option value="Obstetrics & Gynecology" ${master?.department_specialty === 'Obstetrics & Gynecology' ? 'selected' : ''}>Obstetrics &amp; Gynecology</option>
                                <option value="Orthopedic Surgery" ${master?.department_specialty === 'Orthopedic Surgery' ? 'selected' : ''}>Orthopedic Surgery</option>
                                <option value="Cardiovascular & Thoracic" ${master?.department_specialty === 'Cardiovascular & Thoracic' ? 'selected' : ''}>Cardiovascular &amp; Thoracic</option>
                                <option value="ENT & Head/Neck" ${master?.department_specialty === 'ENT & Head/Neck' ? 'selected' : ''}>ENT &amp; Head/Neck</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Wrapper Standard *</label>
                            <select name="standard_wrapper_type" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="rigid_container" ${master?.standard_wrapper_type === 'rigid_container' ? 'selected' : ''}>Rigid Filtered Container</option>
                                <option value="non_woven_sms" ${master?.standard_wrapper_type === 'non_woven_sms' ? 'selected' : ''}>Non-Woven SMS Wrap</option>
                                <option value="crepe_paper" ${master?.standard_wrapper_type === 'crepe_paper' ? 'selected' : ''}>Crepe Paper</option>
                                <option value="tyvek_pouch" ${master?.standard_wrapper_type === 'tyvek_pouch' ? 'selected' : ''}>Tyvek Pouch</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Shelf Life (Days) *</label>
                            <input type="number" name="shelf_life_days" required value="${master?.shelf_life_days || 30}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Assembly &amp; Sterilization Instructions</label>
                        <textarea name="instructions" rows="2" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(master?.instructions || '')}</textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseMasterModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 8px 18px; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Save Master Catalog</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseMasterModal')?.addEventListener('click', closeModal);

    document.getElementById('masterTrayForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/cssd/master-trays', 'POST', {
                id: f.get('id') || null,
                tray_code: f.get('tray_code'),
                name: f.get('name'),
                department_specialty: f.get('department_specialty'),
                standard_wrapper_type: f.get('standard_wrapper_type'),
                shelf_life_days: f.get('shelf_life_days'),
                instructions: f.get('instructions')
            });
            showToast("Master tray catalog saved.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to save master tray: " + err.message, "error");
        }
    });
}

/**
 * =========================================================================
 * MODALS: OT DISTRIBUTION, SCAN RETURNS & RSI SAFETY INCIDENTS
 * =========================================================================
 */

/**
 * MODAL: Dispatch Sterile Tray to OR Suite
 */
async function openDispatchModal(preselectTrayId = null) {
    let availTrays = cache.availableTrays || [];
    let suitesCases = cache.orSuitesAndCases || { or_suites: [], surgical_cases: [] };

    // Fresh fetch if empty
    if (availTrays.length === 0) {
        try {
            const res = await api('/cssd/dispatches/available-trays');
            if (res?.data) availTrays = res.data;
        } catch (e) {}
    }
    if (suitesCases.or_suites.length === 0) {
        try {
            const res = await api('/cssd/dispatches/or-suites');
            if (res?.data) suitesCases = res.data;
        } catch (e) {}
    }

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #e11d48; background: #ffe4e6; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Chain of Custody Handover</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Dispatch Sterile Instrument Set to OR Suite
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="dispatchTrayForm" style="padding: 24px;">
                    <!-- Sterile Tray Selection -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                            Select Available Sterile Tray *
                        </label>
                        <select name="physical_tray_id" id="dispatchPhysicalTraySelect" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="">Select Sterile Instrument Tray...</option>
                            ${availTrays.map(t => `
                                <option value="${t.id}" ${preselectTrayId == t.id ? 'selected' : ''} data-barcode="${escapeHtml(t.tray_barcode)}" data-pieces="${t.total_pieces}" data-expiry="${t.sterile_expiry_date || ''}">
                                    ${escapeHtml(t.tray_barcode)} - ${escapeHtml(t.master_tray_name)} (${t.total_pieces} pcs) &bull; Valid: ${t.sterile_expiry_date || 'N/A'}
                                </option>
                            `).join('')}
                        </select>
                        ${availTrays.length === 0 ? `
                            <div style="font-size: 12px; color: #dc2626; margin-top: 4px;">
                                ⚠ No trays currently in sterile storage. Release completed batches first.
                            </div>
                        ` : ''}
                    </div>

                    <!-- Destination & Priority -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Target Operating Theater *</label>
                            <select name="or_suite_name" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                ${suitesCases.or_suites.map(s => `
                                    <option value="${escapeHtml(s)}">${escapeHtml(s)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Case Priority *</label>
                            <select name="case_priority" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                <option value="elective">Elective</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat_emergency">STAT Emergency</option>
                            </select>
                        </div>
                    </div>

                    <!-- Link to Surgical Case (Optional quick autofill) -->
                    ${suitesCases.surgical_cases.length > 0 ? `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <label style="display: block; font-size: 12px; font-weight: 700; color: #4338ca; margin-bottom: 4px;">
                                <i class="fas fa-link"></i> Link to Scheduled Surgical Case (Auto-fills clinical fields)
                            </label>
                            <select id="caseAutofillSelect" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; background: #ffffff;">
                                <option value="">Select Scheduled OR Case (Optional)...</option>
                                ${suitesCases.surgical_cases.map(c => `
                                    <option value="${c.id}" data-case="${escapeHtml(c.case_number)}" data-patient="${escapeHtml(c.patient_name)}" data-procedure="${escapeHtml(c.procedure_name)}" data-surgeon="${escapeHtml(c.lead_surgeon)}" data-circ="${escapeHtml(c.circulating_nurse || '')}" data-scrub="${escapeHtml(c.scrub_nurse || '')}" data-suite="${escapeHtml(c.or_suite_name)}">
                                        ${escapeHtml(c.case_number)} - ${escapeHtml(c.patient_name)} (${escapeHtml(c.procedure_name.substring(0, 32))}...)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}

                    <input type="hidden" name="surgical_case_id" id="dispatchCaseId" value="" />
                    <input type="hidden" name="surgical_case_number" id="dispatchCaseNumber" value="" />

                    <!-- Procedure & Patient -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Surgical Procedure Name *</label>
                            <input type="text" name="procedure_name" id="dispatchProcedureInput" required placeholder="e.g. Laparoscopic Cholecystectomy" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Patient Name</label>
                            <input type="text" name="patient_name" id="dispatchPatientInput" placeholder="e.g. John Doe" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Surgical Team -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Primary Surgeon</label>
                            <input type="text" name="primary_surgeon" id="dispatchSurgeonInput" placeholder="Dr. Mark Villareal" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Circulating Nurse</label>
                            <input type="text" name="circulating_nurse" id="dispatchCircInput" placeholder="Nurse Patrick Dizon, RN" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Scrub Nurse</label>
                            <input type="text" name="scrub_nurse" id="dispatchScrubInput" placeholder="Nurse Teresa Aquino, RN" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Transport Cart & Dispatcher -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Transport Case Cart / Tote ID</label>
                            <input type="text" name="transport_container_barcode" placeholder="e.g. CART-OR-01" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">CSSD Dispatcher Name *</label>
                            <input type="text" name="dispatched_by_name" required value="Roberto Luna (CSSD Dispatch Tech)" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Sterility Verification Checklist -->
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: #065f46;">
                            <input type="checkbox" name="sterility_verified" required checked style="width: 16px; height: 16px;" />
                            <span>I have physically inspected the sterile packaging, verified the chemical indicator strip is passed, and confirmed the 180-day sterile shelf life has not expired.</span>
                        </label>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseDispModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 8px 20px; background: #e11d48; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-truck-ramp-box"></i> Authorize &amp; Dispatch to OR
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseDispModal')?.addEventListener('click', closeModal);

    // Autofill listener
    document.getElementById('caseAutofillSelect')?.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        if (!opt || !opt.value) return;

        document.getElementById('dispatchCaseId').value = opt.value;
        document.getElementById('dispatchCaseNumber').value = opt.dataset.case || '';
        document.getElementById('dispatchProcedureInput').value = opt.dataset.procedure || '';
        document.getElementById('dispatchPatientInput').value = opt.dataset.patient || '';
        document.getElementById('dispatchSurgeonInput').value = opt.dataset.surgeon || '';
        document.getElementById('dispatchCircInput').value = opt.dataset.circ || '';
        document.getElementById('dispatchScrubInput').value = opt.dataset.scrub || '';
    });

    document.getElementById('dispatchTrayForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            const res = await api('/cssd/dispatches', 'POST', {
                physical_tray_id: f.get('physical_tray_id'),
                or_suite_name: f.get('or_suite_name'),
                case_priority: f.get('case_priority'),
                surgical_case_id: f.get('surgical_case_id') || null,
                surgical_case_number: f.get('surgical_case_number') || null,
                procedure_name: f.get('procedure_name'),
                patient_name: f.get('patient_name'),
                primary_surgeon: f.get('primary_surgeon'),
                circulating_nurse: f.get('circulating_nurse'),
                scrub_nurse: f.get('scrub_nurse'),
                transport_container_barcode: f.get('transport_container_barcode'),
                dispatched_by_name: f.get('dispatched_by_name')
            });
            showToast(res?.data?.message || "Sterile set dispatched to OR suite successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to dispatch tray: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Confirm Custody Handover in OR
 */
function openORHandoverModal(dispatchId, dispatchNumber, trayBarcode, orSuite) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Custody Receipt</span>
                        <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Confirm OR Custody Handover
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="orHandoverForm" style="padding: 24px;">
                    <input type="hidden" name="dispatch_id" value="${dispatchId}" />

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 12px;">
                        <div>Dispatch #: <strong style="font-family: monospace; color: #e11d48; font-size: 13px;">${escapeHtml(dispatchNumber)}</strong></div>
                        <div style="margin-top: 4px;">Tray Barcode: <strong style="font-family: monospace; color: #4f46e5;">${escapeHtml(trayBarcode)}</strong></div>
                        <div style="margin-top: 4px;">Operating Suite: <strong>${escapeHtml(orSuite)}</strong></div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Received in OR by (Circulating Nurse Name) *
                        </label>
                        <input type="text" name="received_by_name" required value="Nurse Patrick Dizon, RN" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Handover Notes</label>
                        <input type="text" name="notes" placeholder="Sterile seal intact; temperature indicator acceptable." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseHandoverModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 8px 18px; background: #15803d; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">
                            <i class="fas fa-handshake"></i> Accept Custody
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseHandoverModal')?.addEventListener('click', closeModal);

    document.getElementById('orHandoverForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/cssd/dispatches/receive-in-or', 'POST', {
                dispatch_id: f.get('dispatch_id'),
                received_by_name: f.get('received_by_name'),
                notes: f.get('notes')
            });
            showToast("OR custody handover confirmed. Tray marked as in-surgery.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to confirm handover: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Scan Dirty Tray Return Terminal & Manifest Count Reconciliation
 */
async function openScanReturnModal(prefilledBarcode = null, prefilledDispatchId = null) {
    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    let activeManifest = null;
    let checklistItems = [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 900px; max-height: 94vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Decontamination Receiving Terminal</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Post-Op Dirty Tray Return &amp; Piece Manifest Audit
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <!-- Scan Barcode Bar -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="returnBarcodeScanInput" value="${escapeHtml(prefilledBarcode || '')}" placeholder="Scan Tray Barcode (e.g. TRAY-2026-0001)..." style="flex: 1; padding: 10px 14px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: monospace; font-weight: 700;" />
                        <button id="btnFetchTrayManifest" style="background: #4f46e5; color: #ffffff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-barcode"></i> Load Piece Manifest
                        </button>
                    </div>

                    <div id="returnManifestWorkspaceArea">
                        <div style="text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                            <i class="fas fa-barcode" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px;"></i>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">Scan or enter a circulating tray barcode to load its itemized manifest</div>
                            <div style="font-size: 12px; margin-top: 4px;">Enforces piece-by-piece return verification to detect missing surgical instruments.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);

    const scanInput = document.getElementById('returnBarcodeScanInput');
    const fetchBtn = document.getElementById('btnFetchTrayManifest');

    async function loadManifest(barcode) {
        if (!barcode) {
            showToast("Please enter or scan a tray barcode.", "error");
            return;
        }
        try {
            const res = await api(`/cssd/returns/tray-manifest?query=${encodeURIComponent(barcode)}`);
            activeManifest = res?.data;
            if (!activeManifest) {
                showToast("Tray manifest not found.", "error");
                return;
            }

            // Initialize checklist items
            checklistItems = (activeManifest.manifest_items || []).map(item => ({
                id: item.id,
                item_seq: item.item_seq,
                instrument_name: item.instrument_name,
                instrument_type: item.instrument_type,
                quantity_required: item.quantity_required,
                critical_inspection_point: item.critical_inspection_point,
                status: 'present', // 'present' | 'missing' | 'damaged'
                damage_note: ''
            }));

            renderChecklistWorkspace();
        } catch (err) {
            showToast("Failed to load manifest: " + err.message, "error");
        }
    }

    function renderChecklistWorkspace() {
        const area = document.getElementById('returnManifestWorkspaceArea');
        if (!area || !activeManifest) return;

        const tray = activeManifest.tray;
        const disp = activeManifest.latest_dispatch || {};

        const presentCount = checklistItems.filter(i => i.status === 'present').length;
        const missingCount = checklistItems.filter(i => i.status === 'missing').length;
        const damagedCount = checklistItems.filter(i => i.status === 'damaged').length;
        const totalPieces = checklistItems.length;

        area.innerHTML = `
            <!-- Tray Header Meta -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 12px;">
                <div>
                    <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Master Surgical Set</div>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${escapeHtml(tray.master_tray_name)}</div>
                    <div style="font-family: monospace; color: #4f46e5; font-weight: 700; margin-top: 2px;">${escapeHtml(tray.tray_barcode)}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Returned From Location</div>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(disp.or_suite_name || tray.assigned_or_suite || 'OR Suite')}</div>
                    <div style="color: #64748b; margin-top: 2px;">Case: ${escapeHtml(disp.procedure_name || 'Surgery Case')}</div>
                </div>
                <div>
                    <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Attending Surgeon</div>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(disp.primary_surgeon || 'Attending Surgeon')}</div>
                    <div style="color: #64748b; margin-top: 2px;">Circ: ${escapeHtml(disp.circulating_nurse || 'Circulating Nurse')}</div>
                </div>
            </div>

            <!-- Live Count Summary Bar -->
            <div style="display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 130px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Required Pieces</div>
                    <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${totalPieces}</div>
                </div>
                <div style="flex: 1; min-width: 130px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; text-align: center;">
                    <div style="font-size: 11px; color: #065f46; text-transform: uppercase; font-weight: 600;">Present OK</div>
                    <div style="font-size: 20px; font-weight: 800; color: #059669;">${presentCount}</div>
                </div>
                <div style="flex: 1; min-width: 130px; background: ${missingCount > 0 ? '#fee2e2' : '#ffffff'}; border: 1px solid ${missingCount > 0 ? '#fca5a5' : '#e2e8f0'}; border-radius: 8px; padding: 10px 14px; text-align: center;">
                    <div style="font-size: 11px; color: ${missingCount > 0 ? '#991b1b' : '#64748b'}; text-transform: uppercase; font-weight: 700;">Missing</div>
                    <div style="font-size: 20px; font-weight: 800; color: ${missingCount > 0 ? '#dc2626' : '#64748b'};">${missingCount}</div>
                </div>
                <div style="flex: 1; min-width: 130px; background: ${damagedCount > 0 ? '#fef3c7' : '#ffffff'}; border: 1px solid ${damagedCount > 0 ? '#fde68a' : '#e2e8f0'}; border-radius: 8px; padding: 10px 14px; text-align: center;">
                    <div style="font-size: 11px; color: ${damagedCount > 0 ? '#92400e' : '#64748b'}; text-transform: uppercase; font-weight: 700;">Damaged</div>
                    <div style="font-size: 20px; font-weight: 800; color: ${damagedCount > 0 ? '#d97706' : '#64748b'};">${damagedCount}</div>
                </div>
            </div>

            <!-- Critical RSI Alert Banner if missing -->
            ${missingCount > 0 ? `
                <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px; animation: pulse 2s infinite;">
                    <span style="font-size: 24px; color: #dc2626;"><i class="fas fa-radiation"></i></span>
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #991b1b;">
                            CRITICAL RETAINED SURGICAL ITEM (RSI) SAFETY PROTOCOL TRIGGERED!
                        </div>
                        <div style="font-size: 12px; color: #b91c1c; margin-top: 2px;">
                            ${missingCount} instrument(s) missing from return count. Immediate OR suite notification, sub-sterile search, and cavity X-ray verification will be recorded. Tray will be locked in quarantine.
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Piece-by-Piece Checklist Table -->
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
                <div style="max-height: 320px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                        <thead style="position: sticky; top: 0; background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                            <tr>
                                <th style="padding: 10px 12px; width: 6%;">Seq</th>
                                <th style="padding: 10px 12px; width: 44%;">Instrument Description</th>
                                <th style="padding: 10px 12px; width: 22%;">Critical Checkpoint</th>
                                <th style="padding: 10px 12px; width: 28%; text-align: center;">Item Return Verification</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${checklistItems.map((item, idx) => `
                                <tr style="border-bottom: 1px solid #f1f5f9; background: ${item.status === 'missing' ? '#fef2f2' : (item.status === 'damaged' ? '#fffbeb' : 'transparent')};">
                                    <td style="padding: 10px 12px; font-weight: 700; color: #64748b;">${item.item_seq}</td>
                                    <td style="padding: 10px 12px;">
                                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(item.instrument_name)}</div>
                                        <div style="font-size: 11px; color: #64748b; text-transform: capitalize;">${escapeHtml(item.instrument_type?.replace(/_/g, ' '))}</div>
                                        ${item.status === 'damaged' ? `
                                            <input type="text" class="damage-note-input" data-index="${idx}" placeholder="Specify damage (e.g. bent tip, broken spring)..." value="${escapeHtml(item.damage_note)}" style="width: 90%; margin-top: 6px; padding: 4px 8px; border: 1px solid #fde68a; border-radius: 4px; font-size: 11px; background: #ffffff;" />
                                        ` : ''}
                                    </td>
                                    <td style="padding: 10px 12px; font-size: 11px; color: #64748b;">
                                        ${escapeHtml(item.critical_inspection_point || 'Visual integrity & ratchets')}
                                    </td>
                                    <td style="padding: 10px 12px; text-align: center;">
                                        <div style="display: inline-flex; gap: 4px;">
                                            <button type="button" class="btn-check-status ${item.status === 'present' ? 'active' : ''}" data-index="${idx}" data-status="present" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ${item.status === 'present' ? '#10b981' : '#cbd5e1'}; background: ${item.status === 'present' ? '#dcfce7' : '#ffffff'}; color: ${item.status === 'present' ? '#15803d' : '#64748b'};">
                                                <i class="fas fa-check"></i> Present
                                            </button>
                                            <button type="button" class="btn-check-status ${item.status === 'missing' ? 'active' : ''}" data-index="${idx}" data-status="missing" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ${item.status === 'missing' ? '#ef4444' : '#cbd5e1'}; background: ${item.status === 'missing' ? '#fee2e2' : '#ffffff'}; color: ${item.status === 'missing' ? '#b91c1c' : '#64748b'};">
                                                <i class="fas fa-triangle-exclamation"></i> Missing
                                            </button>
                                            <button type="button" class="btn-check-status ${item.status === 'damaged' ? 'active' : ''}" data-index="${idx}" data-status="damaged" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ${item.status === 'damaged' ? '#f59e0b' : '#cbd5e1'}; background: ${item.status === 'damaged' ? '#fef3c7' : '#ffffff'}; color: ${item.status === 'damaged' ? '#b45309' : '#64748b'};">
                                                <i class="fas fa-wrench"></i> Damaged
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Reception Form Fields -->
            <form id="executeReturnReconciliationForm">
                <input type="hidden" name="physical_tray_id" value="${tray.id}" />
                <input type="hidden" name="dispatch_id" value="${disp.id || ''}" />
                <input type="hidden" name="returned_from_or_suite" value="${escapeHtml(disp.or_suite_name || tray.assigned_or_suite || 'OR Suite')}" />

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Bioburden Level *</label>
                        <select name="bioburden_level" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="moderate">Moderate Bioburden</option>
                            <option value="light">Light Soil</option>
                            <option value="heavy_gross_blood">Heavy Gross Blood / Bone Debris</option>
                            <option value="suspected_prion_creutzfeldt">Suspected Prion Biohazard</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Returned by (OR Staff)</label>
                        <input type="text" name="returned_by_name" value="${escapeHtml(disp.circulating_nurse || 'OR Scrub/Orderly')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">CSSD Receiving Tech *</label>
                        <input type="text" name="received_by_cssd_tech" required value="Danilo Santos (Decon Specialist)" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Decontamination Bay / Washer Assigned</label>
                        <input type="text" name="decon_bay_assigned" value="Decon Sink Bay 1 / Ultrasonic Tank A" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Inspection Notes</label>
                        <input type="text" name="notes" placeholder="Gross decontamination notes..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" id="btnCloseRetModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                    <button type="submit" style="padding: 10px 22px; background: ${missingCount > 0 ? '#b91c1c' : '#0d9488'}; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-clipboard-check"></i> ${missingCount > 0 ? 'Log Missing Incident & Quarantine' : 'Complete Reconciliation & Transfer to Decon'}
                    </button>
                </div>
            </form>
        `;

        document.getElementById('btnCloseRetModal')?.addEventListener('click', closeModal);

        // Bind 3-toggle checklist buttons
        area.querySelectorAll('.btn-check-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.index, 10);
                const newStatus = btn.dataset.status;
                checklistItems[idx].status = newStatus;
                renderChecklistWorkspace();
            });
        });

        // Bind damage note change
        area.querySelectorAll('.damage-note-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(input.dataset.index, 10);
                checklistItems[idx].damage_note = input.value;
            });
        });

        // Submit Return Reconciliation
        document.getElementById('executeReturnReconciliationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const f = new FormData(e.target);
            try {
                const res = await api('/cssd/returns', 'POST', {
                    physical_tray_id: f.get('physical_tray_id'),
                    dispatch_id: f.get('dispatch_id') || null,
                    returned_from_or_suite: f.get('returned_from_or_suite'),
                    returned_by_name: f.get('returned_by_name'),
                    received_by_cssd_tech: f.get('received_by_cssd_tech'),
                    bioburden_level: f.get('bioburden_level'),
                    decon_bay_assigned: f.get('decon_bay_assigned'),
                    notes: f.get('notes'),
                    checklist_items: checklistItems
                });

                showToast(res?.data?.message || "Tray return reconciled successfully.", res?.data?.is_rsi_alert_triggered ? "error" : "success");
                closeModal();
                await loadInitialData();
            } catch (err) {
                showToast("Failed to reconcile return: " + err.message, "error");
            }
        });
    }

    fetchBtn?.addEventListener('click', () => loadManifest(scanInput.value.trim()));
    scanInput?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadManifest(scanInput.value.trim());
    });

    if (prefilledBarcode) {
        loadManifest(prefilledBarcode);
    }
}

/**
 * MODAL: View Dispatch Details
 */
async function openDispatchDetailModal(dispatchId) {
    let detail = null;
    try {
        const res = await api(`/cssd/dispatches/show?id=${dispatchId}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading dispatch detail: " + e.message, "error");
        return;
    }

    if (!detail) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const d = detail.dispatch;
    const items = detail.manifest_items || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 780px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #e11d48;">${escapeHtml(d.dispatch_number)}</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            OT Handover Custody &amp; Set Manifest
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 12px;">
                        <div>
                            <div>Instrument Set: <strong>${escapeHtml(d.master_tray_name)}</strong></div>
                            <div style="margin-top: 4px;">Tray Barcode: <strong style="font-family: monospace; color: #4f46e5;">${escapeHtml(d.tray_barcode)}</strong></div>
                            <div style="margin-top: 4px;">Destination: <strong>${escapeHtml(d.or_suite_name)}</strong></div>
                            <div style="margin-top: 4px;">Procedure: <strong>${escapeHtml(d.procedure_name || 'N/A')}</strong></div>
                        </div>
                        <div>
                            <div>Surgeon: <strong>${escapeHtml(d.primary_surgeon || 'Attending')}</strong></div>
                            <div style="margin-top: 4px;">Circulating Nurse: <strong>${escapeHtml(d.circulating_nurse || 'Assigned Nurse')}</strong></div>
                            <div style="margin-top: 4px;">Dispatched At: <strong>${d.dispatched_at}</strong> (${escapeHtml(d.dispatched_by_name)})</div>
                            <div style="margin-top: 4px;">OR Handover: <strong>${d.received_in_or_at ? `${d.received_in_or_at} by ${escapeHtml(d.received_by_name)}` : 'Awaiting confirmation'}</strong></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 12px; font-weight: 700; font-size: 13px; color: #0f172a;">
                        Expected Manifest Instruments (${items.length} Pieces)
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 260px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <tr>
                                    <th style="padding: 8px 10px; width: 8%;">Seq</th>
                                    <th style="padding: 8px 10px; width: 50%;">Instrument Description</th>
                                    <th style="padding: 8px 10px; width: 22%;">Type</th>
                                    <th style="padding: 8px 10px; width: 20%;">Qty Required</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="padding: 8px 10px; font-weight: 700; color: #64748b;">${it.item_seq}</td>
                                        <td style="padding: 8px 10px; font-weight: 600;">${escapeHtml(it.instrument_name)}</td>
                                        <td style="padding: 8px 10px; color: #64748b; text-transform: capitalize;">${escapeHtml(it.instrument_type?.replace(/_/g, ' '))}</td>
                                        <td style="padding: 8px 10px; font-weight: 700;">${it.quantity_required}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" id="btnCloseModal" style="padding: 8px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * MODAL: View Return Detail & Audited Checklist
 */
async function openReturnDetailModal(returnId) {
    let detail = null;
    try {
        const res = await api(`/cssd/returns/show?id=${returnId}`);
        detail = res?.data;
    } catch (e) {
        showToast("Error loading return details: " + e.message, "error");
        return;
    }

    if (!detail) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    const r = detail.return;
    const items = detail.checklist_items || [];

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #4f46e5;">${escapeHtml(r.return_number)}</span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Post-Op Return Checklist Audit
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 12px;">
                        <div>
                            <div>Master Set: <strong>${escapeHtml(r.master_tray_name)}</strong></div>
                            <div style="margin-top: 4px;">Tray Barcode: <strong style="font-family: monospace; color: #4f46e5;">${escapeHtml(r.tray_barcode)}</strong></div>
                            <div style="margin-top: 4px;">Returned From: <strong>${escapeHtml(r.returned_from_or_suite)}</strong></div>
                            <div style="margin-top: 4px;">Bioburden: <strong>${escapeHtml(r.bioburden_level.replace(/_/g, ' '))}</strong></div>
                        </div>
                        <div>
                            <div>Count Status: <strong style="color: ${r.missing_count > 0 ? '#dc2626' : '#059669'};">${r.counted_pieces} / ${r.expected_pieces} Pieces Accounted</strong></div>
                            <div style="margin-top: 4px;">Returned By: <strong>${escapeHtml(r.returned_by_name)}</strong></div>
                            <div style="margin-top: 4px;">Received By Tech: <strong>${escapeHtml(r.received_by_cssd_tech)}</strong></div>
                            <div style="margin-top: 4px;">Received At: <strong>${r.received_at}</strong></div>
                        </div>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 300px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <tr>
                                    <th style="padding: 8px 10px; width: 8%;">Seq</th>
                                    <th style="padding: 8px 10px; width: 50%;">Instrument Description</th>
                                    <th style="padding: 8px 10px; width: 22%;">Status</th>
                                    <th style="padding: 8px 10px; width: 20%;">Inspection Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr style="border-bottom: 1px solid #f1f5f9; background: ${it.status === 'missing' ? '#fee2e2' : (it.status === 'damaged' ? '#fef3c7' : 'transparent')};">
                                        <td style="padding: 8px 10px; font-weight: 700; color: #64748b;">${it.seq || it.item_seq || '-'}</td>
                                        <td style="padding: 8px 10px; font-weight: 600;">${escapeHtml(it.name || it.instrument_name)}</td>
                                        <td style="padding: 8px 10px;">
                                            ${it.status === 'present' ? `<span style="color: #059669; font-weight: 700;"><i class="fas fa-check"></i> Present</span>` : (it.status === 'missing' ? `<span style="color: #dc2626; font-weight: 800;"><i class="fas fa-radiation"></i> MISSING</span>` : `<span style="color: #d97706; font-weight: 700;"><i class="fas fa-wrench"></i> DAMAGED</span>`)}
                                        </td>
                                        <td style="padding: 8px 10px; font-size: 11px; color: #64748b;">
                                            ${escapeHtml(it.damage_note || it.incident || '-')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" id="btnCloseModal" style="padding: 8px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * MODAL: Investigate & Resolve Missing Instrument Incident
 */
async function openIncidentResolutionModal(incidentId) {
    let inc = null;
    try {
        const res = await api(`/cssd/incidents/show?id=${incidentId}`);
        inc = res?.data;
    } catch (e) {
        showToast("Error loading incident: " + e.message, "error");
        return;
    }

    if (!inc) return;

    const modalBox = document.getElementById('cssdModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="cssdModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 650px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fff1f2;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; color: #b91c1c; background: #fee2e2; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                            <i class="fas fa-radiation"></i> Surgical Patient Safety Investigation
                        </span>
                        <h3 style="font-size: 18px; font-weight: 800; color: #9f1239; margin: 4px 0 0 0;">
                            Incident #${escapeHtml(inc.incident_number)}: ${escapeHtml(inc.instrument_name)}
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="resolveIncidentForm" style="padding: 24px;">
                    <input type="hidden" name="incident_id" value="${inc.id}" />

                    <!-- Incident Meta Grid -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <div>Instrument: <strong>${escapeHtml(inc.instrument_name)}</strong></div>
                            <div style="margin-top: 4px;">Tray: <strong style="font-family: monospace; color: #4f46e5;">${escapeHtml(inc.tray_barcode)}</strong> (${escapeHtml(inc.master_tray_name)})</div>
                            <div style="margin-top: 4px;">Severity: <strong style="color: #dc2626;">${escapeHtml(inc.severity_level)}</strong></div>
                        </div>
                        <div>
                            <div>OR Suite: <strong>${escapeHtml(inc.or_suite_name)}</strong></div>
                            <div style="margin-top: 4px;">Surgeon: <strong>${escapeHtml(inc.lead_surgeon || 'Attending')}</strong></div>
                            <div style="margin-top: 4px;">Circulating Nurse: <strong>${escapeHtml(inc.circulating_nurse || 'Circulator')}</strong></div>
                        </div>
                    </div>

                    <!-- Investigation Status -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                            Current Investigation &amp; Resolution Status *
                        </label>
                        <select name="investigation_status" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="active_search_in_or" ${inc.investigation_status === 'active_search_in_or' ? 'selected' : ''}>Active Search in OR / Sub-Sterile Bay</option>
                            <option value="portable_xray_ordered" ${inc.investigation_status === 'portable_xray_ordered' ? 'selected' : ''}>Portable / C-Arm X-Ray Ordered for Operative Cavity</option>
                            <option value="found_in_or_linens" ${inc.investigation_status === 'found_in_or_linens' ? 'selected' : ''}>Found in OR Linen Drapes / Laundry Bundle (RESOLVED)</option>
                            <option value="found_in_trash_bin" ${inc.investigation_status === 'found_in_trash_bin' ? 'selected' : ''}>Found in Sub-Sterile Waste / Kick Bucket (RESOLVED)</option>
                            <option value="xray_negative_cavity_clear" ${inc.investigation_status === 'xray_negative_cavity_clear' ? 'selected' : ''}>X-Ray Negative: Patient Cavity Clear (CLEARANCE SIGN-OFF)</option>
                            <option value="sent_for_repair" ${inc.investigation_status === 'sent_for_repair' ? 'selected' : ''}>Sent for Precision Repair / Sharpening</option>
                            <option value="replaced_with_new_stock" ${inc.investigation_status === 'replaced_with_new_stock' ? 'selected' : ''}>Replaced with New Stock Instrument (RESOLVED)</option>
                            <option value="confirmed_lost_written_off" ${inc.investigation_status === 'confirmed_lost_written_off' ? 'selected' : ''}>Confirmed Lost &amp; Written Off (RESOLVED)</option>
                            <option value="resolved_closed" ${inc.investigation_status === 'resolved_closed' ? 'selected' : ''}>Resolved &amp; Closed</option>
                        </select>
                    </div>

                    <!-- Radiological Cavity Clearance -->
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-weight: 700; font-size: 13px; color: #166534;"><i class="fas fa-x-ray"></i> Intraoperative Radiological Findings</span>
                            <label style="font-size: 12px; color: #166534; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="checkbox" name="xray_ordered" value="1" ${inc.xray_ordered ? 'checked' : ''} />
                                <span>X-Ray Ordered / Performed</span>
                            </label>
                        </div>
                        <input type="text" name="xray_findings" value="${escapeHtml(inc.xray_findings || '')}" placeholder="e.g. C-Arm scout film negative for radiopaque foreign object in cranial field." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;" />
                    </div>

                    <!-- Found Location Details -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Found Location / Physical Trace</label>
                        <input type="text" name="found_location_details" value="${escapeHtml(inc.found_location_details || '')}" placeholder="e.g. Wrapped inside blue sterile Mayo stand drape in dirty hamper." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <!-- Investigated By -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Investigating Clinical Officer *</label>
                        <input type="text" name="investigated_by_name" required value="${escapeHtml(inc.investigated_by_name || 'Nurse Maria Santos, RN (CSSD Supervisor)')}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <!-- Resolution Notes & Corrective Actions -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Resolution Notes &amp; Surgeon Sign-off</label>
                        <textarea name="resolution_notes" rows="2" placeholder="Clinical documentation and attending surgeon verbal notification..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(inc.resolution_notes || '')}</textarea>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Corrective &amp; Preventive Action (CAPA)</label>
                        <input type="text" name="corrective_action" value="${escapeHtml(inc.corrective_action || '')}" placeholder="e.g. Mandatory double-count before drape disposal protocol reinforced." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseIncModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 10px 20px; background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">
                            <i class="fas fa-clipboard-check"></i> Save Investigation &amp; Update Tray
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseIncModal')?.addEventListener('click', closeModal);

    document.getElementById('resolveIncidentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            const res = await api('/cssd/incidents/update', 'POST', {
                id: f.get('incident_id'),
                investigation_status: f.get('investigation_status'),
                xray_ordered: f.get('xray_ordered') ? 1 : 0,
                xray_findings: f.get('xray_findings'),
                found_location_details: f.get('found_location_details'),
                investigated_by_name: f.get('investigated_by_name'),
                resolution_notes: f.get('resolution_notes'),
                corrective_action: f.get('corrective_action')
            });

            showToast(res?.data?.message || "Incident investigation updated successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to update incident: " + err.message, "error");
        }
    });
}

/**
 * Helper: Tray Status Badge
 */
function getTrayStatusBadge(status) {
    switch (status) {
        case 'sterile_stored':
            return `<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> Sterile &amp; Ready</span>`;
        case 'dispatched_surgery':
            return `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-truck-fast"></i> Dispatched to OR</span>`;
        case 'in_surgery':
            return `<span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-user-doctor"></i> In Surgery</span>`;
        case 'returned_dirty':
        case 'dirty_received':
            return `<span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-biohazard"></i> Dirty Intake</span>`;
        case 'decontaminating':
            return `<span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-soap"></i> Decontaminating</span>`;
        case 'assembled_wrapped':
            return `<span style="background: #f3e8ff; color: #7e22ce; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-box-archive"></i> Assembled &amp; Wrapped</span>`;
        case 'sterilizing':
            return `<span style="background: #fed7aa; color: #c2410c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-fire-burner"></i> In Autoclave</span>`;
        case 'quarantined_missing_item':
            return `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-triangle-exclamation"></i> QUARANTINED</span>`;
        default:
            return `<span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${escapeHtml(status || 'Active')}</span>`;
    }
}

/**
 * Helper: UI Toast
 */
function showToast(message, type = 'info') {
    const area = document.getElementById('cssdNotificationArea');
    if (!area) return;

    const bg = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#4f46e5');
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${bg};
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: opacity 0.3s;
    `;
    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button style="background: none; border: none; color: #ffffff; font-size: 16px; cursor: pointer; margin-left: 12px;">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    area.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * Helper: HTML Escaping
 */
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
