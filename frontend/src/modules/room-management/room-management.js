import {
    fetchMonitorData,
    fetchBuildings,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    fetchRooms,
    fetchRoomDetail,
    createRoom,
    updateRoom,
    deleteRoom,
    fetchBeds,
    createBed,
    updateBed,
    updateBedStatus,
    deleteBed,
    fetchHospitalWards,
    fetchEvsTurnovers,
    fetchEvsStats,
    fetchEvsTurnoverDetail,
    createEvsTurnover,
    assignEvsStaff,
    startEvsCleaning,
    completeEvsCleaning,
    inspectEvsTurnover,
    cancelEvsTurnover
} from "./room-management.service.js?v=6";
import { showToast } from "../../core/toast.js";

let state = {
    user: null,
    activeTab: "monitor",
    monitorData: null,
    buildings: [],
    rooms: [],
    beds: [],
    evsLogs: [],
    evsStats: null,
    evsFilters: {
        stage: "all",
        priority: "",
        cleaning_type: "",
        search: ""
    },
    filters: {
        building_id: "",
        room_type: "",
        status: "",
        search: ""
    }
};

export async function initRoomManagement(user) {
    state.user = user;
    setupEventListeners();
    await loadAllData();
}

function setupEventListeners() {
    // 1. Tab Navigation
    document.querySelectorAll("#rmTabsBar .rm-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-rm-tab");
            switchTab(target);
        });
    });

    // 2. Filters
    const bldgFilter = document.getElementById("rmFilterBuilding");
    const typeFilter = document.getElementById("rmFilterRoomType");
    const statusFilter = document.getElementById("rmFilterStatus");
    const searchInput = document.getElementById("rmSearchInput");

    bldgFilter?.addEventListener("change", () => {
        state.filters.building_id = bldgFilter.value;
        loadCurrentTabView();
    });

    typeFilter?.addEventListener("change", () => {
        state.filters.room_type = typeFilter.value;
        loadCurrentTabView();
    });

    statusFilter?.addEventListener("change", () => {
        state.filters.status = statusFilter.value;
        loadCurrentTabView();
    });

    let searchTimer = null;
    searchInput?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.filters.search = searchInput.value;
            loadCurrentTabView();
        }, 300);
    });

    // 3. Refresh Button
    document.getElementById("rmBtnRefresh")?.addEventListener("click", async () => {
        await loadAllData();
        showToast("Hospital availability and room census refreshed.", "info");
    });

    // 4. Modal Close Handlers
    document.querySelectorAll("[data-close-rm-modal]").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".rm-modal-backdrop").forEach((m) => m.classList.remove("open"));
        });
    });

    // Close when clicking outside modal content
    document.querySelectorAll(".rm-modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) backdrop.classList.remove("open");
        });
    });

    // 5. Quick Bed Finder Modal
    document.getElementById("rmBtnQuickFinder")?.addEventListener("click", openQuickFinderModal);
    document.getElementById("qfExecuteSearch")?.addEventListener("click", executeQuickFinderSearch);

    // 6. Action Openers (Admin)
    document.getElementById("rmBtnAddBuilding")?.addEventListener("click", () => openBuildingModal());
    document.getElementById("rmBtnAddRoom")?.addEventListener("click", () => openRoomModal());
    document.getElementById("rmBtnAddBed")?.addEventListener("click", () => openBedModal());

    // 7. Form Submissions
    document.getElementById("rmFormBuilding")?.addEventListener("submit", handleBuildingSubmit);
    document.getElementById("rmFormRoom")?.addEventListener("submit", handleRoomSubmit);
    document.getElementById("rmFormBed")?.addEventListener("submit", handleBedSubmit);
    document.getElementById("btnSaveBedAction")?.addEventListener("click", handleBedActionSubmit);

    // 8. EVS Pipeline Listeners
    document.querySelectorAll("#evsStageFilters .evs-pill-btn").forEach((pill) => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#evsStageFilters .evs-pill-btn").forEach((p) => p.classList.remove("active"));
            pill.classList.add("active");
            state.evsFilters.stage = pill.getAttribute("data-evs-stage") || "all";
            loadEvsData();
        });
    });

    document.getElementById("evsFilterPriority")?.addEventListener("change", (e) => {
        state.evsFilters.priority = e.target.value;
        loadEvsData();
    });

    document.getElementById("evsFilterType")?.addEventListener("change", (e) => {
        state.evsFilters.cleaning_type = e.target.value;
        loadEvsData();
    });

    let evsSearchTimer = null;
    document.getElementById("evsSearchInput")?.addEventListener("input", (e) => {
        clearTimeout(evsSearchTimer);
        evsSearchTimer = setTimeout(() => {
            state.evsFilters.search = e.target.value;
            loadEvsData();
        }, 300);
    });

    document.getElementById("evsBtnInitiateTurnover")?.addEventListener("click", openEvsInitiateModal);
    document.getElementById("evsBtnRefresh")?.addEventListener("click", async () => {
        await loadEvsData();
        showToast("EVS bed turnover pipeline refreshed.", "info");
    });

    document.getElementById("btnSaveEvsInitiate")?.addEventListener("click", handleEvsInitiateSubmit);
    document.getElementById("btnSaveEvsAssign")?.addEventListener("click", handleEvsAssignSubmit);
    document.getElementById("btnSaveEvsStart")?.addEventListener("click", handleEvsStartSubmit);
    document.getElementById("btnSaveEvsComplete")?.addEventListener("click", handleEvsCompleteSubmit);
    document.getElementById("btnSaveEvsInspect")?.addEventListener("click", handleEvsInspectSubmit);
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================

function switchTab(tabKey) {
    state.activeTab = tabKey;
    document.querySelectorAll("#rmTabsBar .rm-tab-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-rm-tab") === tabKey);
    });

    document.getElementById("rmTabContentMonitor").style.display = tabKey === "monitor" ? "block" : "none";
    document.getElementById("rmTabContentBeds").style.display = tabKey === "beds" ? "block" : "none";
    document.getElementById("rmTabContentRooms").style.display = tabKey === "rooms" ? "block" : "none";
    document.getElementById("rmTabContentBuildings").style.display = tabKey === "buildings" ? "block" : "none";
    const evsContent = document.getElementById("rmTabContentEvs");
    if (evsContent) evsContent.style.display = tabKey === "evs" ? "block" : "none";

    loadCurrentTabView();
}

async function loadCurrentTabView() {
    if (state.activeTab === "monitor") {
        await loadMonitorData();
    } else if (state.activeTab === "beds") {
        await loadBedsData();
    } else if (state.activeTab === "rooms") {
        await loadRoomsData();
    } else if (state.activeTab === "buildings") {
        await loadBuildingsData();
    } else if (state.activeTab === "evs") {
        await loadEvsData();
    }
}

async function loadAllData() {
    await Promise.all([
        loadMonitorData(),
        loadBuildingsOptions(),
        loadEvsBadge()
    ]);
}


// =============================================================================
// DATA LOADERS & RENDERERS
// =============================================================================

async function loadMonitorData() {
    const container = document.getElementById("rmMonitorContainer");
    try {
        const res = await fetchMonitorData(state.filters);
        if (res && res.success && res.data) {
            state.monitorData = res.data;
            updateKpiCounters(res.data.kpis);
            renderMonitorView(res.data);
            updateTabBadges(res.data.kpis);
        } else {
            const errMsg = (res && res.message) ? res.message : "Failed to load hospital availability data.";
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <h3 style="margin: 0 0 6px 0; color: var(--text-primary);">Unable to Load Availability Map</h3>
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #ef4444;">${escapeHtml(errMsg)}</p>
                        <button type="button" class="rm-btn rm-btn-primary" id="rmBtnRetryMonitor">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Retry
                        </button>
                    </div>
                `;
                document.getElementById("rmBtnRetryMonitor")?.addEventListener("click", () => {
                    container.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-muted);">Loading hospital availability map...</p>`;
                    loadMonitorData();
                });
            }
            showToast(errMsg, "error");
        }
    } catch (err) {
        console.error("Error loading room monitor:", err);
        showToast("Failed to load availability data.", "error");
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <h3 style="margin: 0 0 6px 0; color: var(--text-primary);">Error Loading Availability Map</h3>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #ef4444;">${escapeHtml(err?.message || "An unexpected error occurred.")}</p>
                    <button type="button" class="rm-btn rm-btn-primary" id="rmBtnRetryMonitorCatch">
                        Retry
                    </button>
                </div>
            `;
            document.getElementById("rmBtnRetryMonitorCatch")?.addEventListener("click", () => {
                container.innerHTML = `<p style="text-align: center; padding: 40px; color: var(--text-muted);">Loading hospital availability map...</p>`;
                loadMonitorData();
            });
        }
    }
}

function updateKpiCounters(kpis) {
    if (!kpis) return;
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setTxt("kpiTotalBeds", kpis.total_beds ?? 0);
    setTxt("kpiTotalRooms", kpis.total_rooms ?? 0);
    setTxt("kpiAvailableBeds", kpis.available_beds ?? 0);
    setTxt("kpiOccupiedBeds", kpis.occupied_beds ?? 0);
    setTxt("kpiReservedBeds", kpis.reserved_beds ?? 0);
    setTxt("kpiDirtyBeds", kpis.dirty_beds ?? 0);
    setTxt("kpiMaintenanceBeds", kpis.maintenance_beds ?? 0);

    const availPct = kpis.total_beds > 0 ? ((kpis.available_beds / kpis.total_beds) * 100).toFixed(1) : 0;
    setTxt("kpiAvailablePercent", `${availPct}% available now`);
    setTxt("kpiOccupancyRate", `${kpis.occupancy_rate ?? 0}% occupancy rate`);
}

function updateTabBadges(kpis) {
    if (!kpis) return;
    const badgeBeds = document.getElementById("tabBadgeBeds");
    const badgeRooms = document.getElementById("tabBadgeRooms");
    if (badgeBeds) badgeBeds.textContent = kpis.total_beds ?? 0;
    if (badgeRooms) badgeRooms.textContent = kpis.total_rooms ?? 0;
}


function renderMonitorView(data) {
    const container = document.getElementById("rmMonitorContainer");
    if (!container) return;

    const buildings = data.buildings || [];
    if (buildings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="opacity: 0.4; margin-bottom: 12px;"><path d="M3 21h18M3 7v14M21 7v14M6 7V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path></svg>
                <h3 style="margin: 0 0 6px 0; color: var(--text-primary);">No Hospital Infrastructure Found</h3>
                <p style="margin: 0; font-size: 13px;">No buildings or rooms match the current search filters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = buildings.map((bldg) => {
        const floors = bldg.floors || {};
        const floorKeys = Object.keys(floors);

        if (floorKeys.length === 0) {
            return `
                <div class="rm-bldg-section">
                    <div class="rm-bldg-header">
                        <div>
                            <div class="rm-bldg-title">
                                🏢 ${escapeHtml(bldg.building_name)} <span style="font-size: 11px; opacity: 0.7;">[${escapeHtml(bldg.building_code)}]</span>
                            </div>
                            <div class="rm-bldg-desc">${escapeHtml(bldg.location_description || "No description")}</div>
                        </div>
                    </div>
                    <p style="color: var(--text-muted); font-size: 12px; font-style: italic; padding: 10px 16px;">No rooms registered on this building matching current filter.</p>
                </div>
            `;
        }

        const floorsHtml = floorKeys.map((floorName) => {
            const rooms = floors[floorName] || [];

            const roomsHtml = rooms.map((room) => {
                const badgeClass = getRoomBadgeClass(room.status);
                const beds = room.beds || [];

                const bedsHtml = beds.length > 0
                    ? beds.map((bed) => {
                        const chipClass = getBedChipClass(bed.status);
                        const occupant = bed.patient_name
                            ? `<strong>${escapeHtml(bed.patient_name)}</strong> <span style="opacity: 0.8; font-size: 10.5px;">(${escapeHtml(bed.patient_mrn || "")})</span>`
                            : `<span style="opacity: 0.85;">Vacant</span>`;

                        return `
                            <div class="rm-bed-chip ${chipClass}" data-bed-action-id="${bed.id}" title="Click to view or change bed status">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-weight: 700;">🛏️ ${escapeHtml(bed.bed_number)}</span>
                                    <span style="font-size: 10.5px; opacity: 0.75;">• ${escapeHtml(bed.bed_type)}</span>
                                </div>
                                <div style="font-size: 11px; text-align: right;">
                                    ${occupant}
                                </div>
                            </div>
                        `;
                    }).join("")
                    : `<p style="font-size: 11.5px; color: var(--text-muted); font-style: italic; margin: 4px 0;">No beds assigned to this room.</p>`;

                const rateFormatted = parseFloat(room.daily_rate) > 0 ? `$${parseFloat(room.daily_rate).toFixed(2)}/day` : "Free / Standard";

                return `
                    <div class="rm-room-card">
                        <div>
                            <div class="rm-room-top">
                                <div class="rm-room-number-wrap">
                                    <span class="rm-room-number">${escapeHtml(room.room_number)}</span>
                                    <span class="rm-room-type-badge">${escapeHtml(room.room_type)}</span>
                                </div>
                                <span class="rm-room-rate-badge">${rateFormatted}</span>
                            </div>
                            <div class="rm-room-details">
                                <span class="rm-badge ${badgeClass}">${escapeHtml(room.status)}</span>
                                &bull; Cap: <strong>${escapeHtml(room.max_beds)}</strong> bed${room.max_beds > 1 ? "s" : ""}
                                ${room.gender_restriction !== "All" ? `&bull; <span style="color: var(--accent);">${escapeHtml(room.gender_restriction)}</span>` : ""}
                                ${room.room_name ? `<br><em style="color: var(--text-primary); font-weight: 500;">${escapeHtml(room.room_name)}</em>` : ""}
                            </div>
                            ${room.amenities ? `<div class="rm-room-amenities">✨ ${escapeHtml(room.amenities)}</div>` : ""}
                        </div>
                        <div class="rm-beds-container">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 2px;">
                                <span>Beds Unit (${beds.length}/${room.max_beds})</span>
                                <span>Status / Occupant</span>
                            </div>
                            ${bedsHtml}
                        </div>
                    </div>
                `;
            }).join("");

            return `
                <div class="rm-floor-section">
                    <div class="rm-floor-title">
                        <span>📍 ${escapeHtml(floorName)}</span>
                        <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">(${rooms.length} room${rooms.length > 1 ? "s" : ""})</span>
                    </div>
                    <div class="rm-rooms-grid">
                        ${roomsHtml}
                    </div>
                </div>
            `;
        }).join("");

        return `
            <div class="rm-bldg-section">
                <div class="rm-bldg-header">
                    <div>
                        <div class="rm-bldg-title">
                            🏢 ${escapeHtml(bldg.building_name)} <span style="font-size: 11.5px; opacity: 0.7;">[${escapeHtml(bldg.building_code)}]</span>
                        </div>
                        <div class="rm-bldg-desc">${escapeHtml(bldg.location_description || "")}</div>
                    </div>
                </div>
                ${floorsHtml}
            </div>
        `;
    }).join("");

    // Wire bed chip click actions
    container.querySelectorAll("[data-bed-action-id]").forEach((chip) => {
        chip.addEventListener("click", (e) => {
            e.stopPropagation();
            const bedId = chip.getAttribute("data-bed-action-id");
            openBedActionModal(bedId);
        });
    });
}

function getRoomBadgeClass(status) {
    switch (status) {
        case "Available": return "rm-badge-green";
        case "Partially Occupied": return "rm-badge-yellow";
        case "Occupied": return "rm-badge-red";
        case "Dirty / Turnover": return "rm-badge-amber";
        case "Maintenance":
        case "Blocked": return "rm-badge-gray";
        default: return "rm-badge-gray";
    }
}

function getBedChipClass(status) {
    switch (status) {
        case "Available": return "rm-bed-chip-avail";
        case "Occupied": return "rm-bed-chip-occ";
        case "Reserved": return "rm-bed-chip-res";
        case "Dirty / Turnover": return "rm-bed-chip-dirty";
        case "Maintenance":
        case "Blocked": return "rm-bed-chip-maint";
        default: return "rm-bed-chip-avail";
    }
}

// =============================================================================
// BEDS DIRECTORY TAB
// =============================================================================

async function loadBedsData() {
    const tbody = document.getElementById("rmBedsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading beds...</td></tr>`;

    try {
        const res = await fetchBeds(state.filters);
        if (res && res.success && res.data) {
            state.beds = res.data;
            renderBedsTable(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">${escapeHtml(res?.message || "Failed to load beds.")}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading beds:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">Failed to load beds.</td></tr>`;
    }
}


function renderBedsTable(beds) {
    const tbody = document.getElementById("rmBedsTableBody");
    if (!tbody) return;

    if (beds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No beds found matching current filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = beds.map((b) => {
        const badgeClass = getBedChipClass(b.status).replace("rm-bed-chip-", "rm-badge-");
        const occupant = b.patient_name
            ? `<div><strong>${escapeHtml(b.patient_name)}</strong></div><div style="font-size: 11px; color: var(--text-muted);">MRN: ${escapeHtml(b.patient_mrn || "-")}</div>`
            : `<span style="color: var(--text-muted); font-style: italic;">Vacant</span>`;

        const rate = b.daily_rate || b.room_rate || 0;
        const rateFormatted = parseFloat(rate) > 0 ? `$${parseFloat(rate).toFixed(2)}/day` : "Standard";

        return `
            <tr>
                <td style="font-weight: 700; color: var(--text-primary);">🛏️ ${escapeHtml(b.bed_number)}</td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(b.room_number || "Unassigned")}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(b.building_name || "")}</div>
                </td>
                <td>${escapeHtml(b.floor_number || "-")}</td>
                <td><span class="rm-room-type-badge">${escapeHtml(b.bed_type)}</span></td>
                <td style="font-weight: 600; color: #10b981;">${rateFormatted}</td>
                <td><span class="rm-badge ${badgeClass}">${escapeHtml(b.status)}</span></td>
                <td>${occupant}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="rm-btn" data-edit-bed-status="${b.id}" style="padding: 4px 8px; font-size: 11.5px;">Status</button>
                    ${state.user?.role === "admin" ? `
                        <button type="button" class="rm-btn" data-edit-bed="${b.id}" style="padding: 4px 8px; font-size: 11.5px;">Edit</button>
                        ${b.status !== "Occupied" ? `<button type="button" class="rm-btn" data-delete-bed="${b.id}" style="padding: 4px 8px; font-size: 11.5px; color: #ef4444;">Delete</button>` : ""}
                    ` : ""}
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-bed-status]").forEach((btn) => {
        btn.addEventListener("click", () => openBedActionModal(btn.getAttribute("data-edit-bed-status")));
    });

    tbody.querySelectorAll("[data-edit-bed]").forEach((btn) => {
        btn.addEventListener("click", () => openBedModal(btn.getAttribute("data-edit-bed")));
    });

    tbody.querySelectorAll("[data-delete-bed]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteBed(btn.getAttribute("data-delete-bed")));
    });
}

// =============================================================================
// ROOMS DIRECTORY TAB
// =============================================================================

async function loadRoomsData() {
    const tbody = document.getElementById("rmRoomsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading rooms...</td></tr>`;

    try {
        const res = await fetchRooms(state.filters);
        if (res && res.success && res.data) {
            state.rooms = res.data;
            renderRoomsTable(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">${escapeHtml(res?.message || "Failed to load rooms.")}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading rooms:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">Failed to load rooms.</td></tr>`;
    }
}


function renderRoomsTable(rooms) {
    const tbody = document.getElementById("rmRoomsTableBody");
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No rooms found matching current filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = rooms.map((r) => {
        const badgeClass = getRoomBadgeClass(r.status);
        const rateFormatted = parseFloat(r.daily_rate) > 0 ? `$${parseFloat(r.daily_rate).toFixed(2)}/day` : "Free / Standard";

        return `
            <tr>
                <td style="font-weight: 700;">🚪 ${escapeHtml(r.room_number)}</td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(r.building_name)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(r.floor_number)}</div>
                </td>
                <td><span class="rm-room-type-badge">${escapeHtml(r.room_type)}</span></td>
                <td style="font-weight: 600; color: #10b981;">${rateFormatted}</td>
                <td><strong>${escapeHtml(r.bed_count || 0)}</strong> / ${escapeHtml(r.max_beds)} beds</td>
                <td><span class="rm-badge ${badgeClass}">${escapeHtml(r.status)}</span></td>
                <td style="font-size: 11.5px; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(r.amenities || "-")}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    ${state.user?.role === "admin" ? `
                        <button type="button" class="rm-btn" data-edit-room="${r.id}" style="padding: 4px 8px; font-size: 11.5px;">Edit</button>
                        ${parseInt(r.occupied_bed_count || 0) === 0 ? `<button type="button" class="rm-btn" data-delete-room="${r.id}" style="padding: 4px 8px; font-size: 11.5px; color: #ef4444;">Delete</button>` : ""}
                    ` : ""}
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-room]").forEach((btn) => {
        btn.addEventListener("click", () => openRoomModal(btn.getAttribute("data-edit-room")));
    });

    tbody.querySelectorAll("[data-delete-room]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteRoom(btn.getAttribute("data-delete-room")));
    });
}

// =============================================================================
// BUILDINGS DIRECTORY TAB
// =============================================================================

async function loadBuildingsData() {
    const tbody = document.getElementById("rmBuildingsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading buildings...</td></tr>`;

    try {
        const res = await fetchBuildings();
        if (res && res.success && res.data) {
            state.buildings = res.data;
            renderBuildingsTable(res.data);
            const bldgBadge = document.getElementById("tabBadgeBuildings");
            if (bldgBadge) bldgBadge.textContent = res.data.length;
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">${escapeHtml(res?.message || "Failed to load buildings.")}</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading buildings:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #ef4444;">Failed to load buildings.</td></tr>`;
    }
}


function renderBuildingsTable(buildings) {
    const tbody = document.getElementById("rmBuildingsTableBody");
    if (!tbody) return;

    if (buildings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No buildings registered yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = buildings.map((b) => {
        return `
            <tr>
                <td style="font-weight: 700; color: var(--accent);">🏢 ${escapeHtml(b.building_code)}</td>
                <td style="font-weight: 600;">${escapeHtml(b.building_name)}</td>
                <td>${escapeHtml(b.total_floors)} floors</td>
                <td><strong>${escapeHtml(b.total_rooms || 0)}</strong> rooms</td>
                <td><strong>${escapeHtml(b.total_beds || 0)}</strong> beds (${escapeHtml(b.available_beds || 0)} avail)</td>
                <td><span class="rm-badge ${b.is_active ? "rm-badge-green" : "rm-badge-gray"}">${b.is_active ? "Active" : "Inactive"}</span></td>
                <td style="font-size: 12px; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(b.location_description || "-")}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    ${state.user?.role === "admin" ? `
                        <button type="button" class="rm-btn" data-edit-bldg="${b.id}" style="padding: 4px 8px; font-size: 11.5px;">Edit</button>
                        ${parseInt(b.total_rooms || 0) === 0 ? `<button type="button" class="rm-btn" data-delete-bldg="${b.id}" style="padding: 4px 8px; font-size: 11.5px; color: #ef4444;">Delete</button>` : ""}
                    ` : ""}
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-bldg]").forEach((btn) => {
        btn.addEventListener("click", () => openBuildingModal(btn.getAttribute("data-edit-bldg")));
    });

    tbody.querySelectorAll("[data-delete-bldg]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteBuilding(btn.getAttribute("data-delete-bldg")));
    });
}

// =============================================================================
// QUICK BED FINDER (RECEPTIONIST)
// =============================================================================

async function openQuickFinderModal() {
    const modal = document.getElementById("rmModalQuickFinder");
    if (!modal) return;

    // Populate building dropdown
    const bldgSelect = document.getElementById("qfBuilding");
    if (bldgSelect) {
        bldgSelect.innerHTML = `<option value="">-- Any Building --</option>` +
            state.buildings.map(b => `<option value="${b.id}">${escapeHtml(b.building_name)}</option>`).join("");
    }

    executeQuickFinderSearch();
    modal.classList.add("open");
}

async function executeQuickFinderSearch() {
    const resultsContainer = document.getElementById("qfResultsList");
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--text-muted);">Searching available beds...</p>`;

    const desiredType = document.getElementById("qfRoomType")?.value || "";
    const desiredBldg = document.getElementById("qfBuilding")?.value || "";

    try {
        const res = await fetchBeds({ status: "Available", room_type: desiredType, building_id: desiredBldg });
        const availableBeds = res.success ? (res.data || []) : [];

        if (availableBeds.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <p style="margin: 0; font-weight: 600;">No vacant beds match the selected criteria.</p>
                    <p style="margin: 4px 0 0 0; font-size: 11.5px;">Try selecting another room type or building.</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = availableBeds.map(b => {
            const rate = b.daily_rate || b.room_rate || 0;
            const rateStr = parseFloat(rate) > 0 ? `$${parseFloat(rate).toFixed(2)} / day` : "Standard";

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-color); background: var(--bg-surface);">
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">
                            🛏️ ${escapeHtml(b.bed_number)} &bull; <span style="font-weight: normal; color: var(--accent);">${escapeHtml(b.room_number)}</span>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                            ${escapeHtml(b.building_name)} &bull; ${escapeHtml(b.floor_number || "-")} &bull; <span class="rm-room-type-badge">${escapeHtml(b.room_type || b.bed_type)}</span>
                        </div>
                        ${b.features ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; font-style: italic;">✨ ${escapeHtml(b.features)}</div>` : ""}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: #10b981; font-size: 13px; margin-bottom: 4px;">${rateStr}</div>
                        <button type="button" class="rm-btn rm-btn-primary" data-qf-reserve="${b.id}" style="padding: 4px 10px; font-size: 11.5px;">
                            Reserve Bed
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        resultsContainer.querySelectorAll("[data-qf-reserve]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const bedId = btn.getAttribute("data-qf-reserve");
                btn.disabled = true;
                btn.textContent = "Reserving...";
                const updateRes = await updateBedStatus(bedId, "Reserved");
                if (updateRes.success) {
                    showToast("Bed status updated to Reserved for patient.", "success");
                    document.getElementById("rmModalQuickFinder")?.classList.remove("open");
                    await loadAllData();
                } else {
                    showToast(updateRes.message || "Failed to reserve bed.", "error");
                    btn.disabled = false;
                    btn.textContent = "Reserve Bed";
                }
            });
        });

    } catch (err) {
        console.error("Error in Quick Bed Finder:", err);
        resultsContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: red;">Error executing search.</p>`;
    }
}

// =============================================================================
// MODALS & CRUD OPERATIONS
// =============================================================================

async function loadBuildingsOptions() {
    try {
        const res = await fetchBuildings(true);
        if (res && res.success && res.data) {
            state.buildings = res.data;
            const filterBldg = document.getElementById("rmFilterBuilding");
            if (filterBldg) {
                const curVal = filterBldg.value;
                filterBldg.innerHTML = `<option value="">All Buildings</option>` +
                    res.data.map(b => `<option value="${b.id}">${escapeHtml(b.building_name)}</option>`).join("");
                filterBldg.value = curVal;
            }
        }
    } catch (err) {
        console.error("Failed to load buildings options:", err);
    }
}

// BUILDING MODAL
function openBuildingModal(bldgId = null) {
    const modal = document.getElementById("rmModalBuilding");
    const form = document.getElementById("rmFormBuilding");
    if (!modal || !form) return;
    form.reset();

    if (bldgId) {
        const bldg = state.buildings.find(b => String(b.id) === String(bldgId));
        if (bldg) {
            document.getElementById("rmModalBuildingTitle").textContent = "Edit Hospital Building";
            document.getElementById("bldgFormId").value = bldg.id;
            document.getElementById("bldgFormCode").value = bldg.building_code;
            document.getElementById("bldgFormName").value = bldg.building_name;
            document.getElementById("bldgFormFloors").value = bldg.total_floors;
            document.getElementById("bldgFormDesc").value = bldg.location_description || "";
        }
    } else {
        document.getElementById("rmModalBuildingTitle").textContent = "Register Hospital Building";
        document.getElementById("bldgFormId").value = "";
    }

    modal.classList.add("open");
}

async function handleBuildingSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("bldgFormId").value;
    const payload = {
        id: id ? parseInt(id) : null,
        building_code: document.getElementById("bldgFormCode").value,
        building_name: document.getElementById("bldgFormName").value,
        total_floors: parseInt(document.getElementById("bldgFormFloors").value) || 1,
        location_description: document.getElementById("bldgFormDesc").value
    };

    try {
        const res = id ? await updateBuilding(payload) : await createBuilding(payload);
        if (res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalBuilding").classList.remove("open");
            await loadAllData();
            if (state.activeTab === "buildings") await loadBuildingsData();
        } else {
            showToast(res.message || "Failed to save building.", "error");
        }
    } catch (err) {
        console.error("Building save error:", err);
        showToast("An unexpected error occurred.", "error");
    }
}

async function handleDeleteBuilding(id) {
    if (!confirm("Are you sure you want to delete this building?")) return;
    try {
        const res = await deleteBuilding(id);
        if (res.success) {
            showToast(res.message, "success");
            await loadAllData();
            if (state.activeTab === "buildings") await loadBuildingsData();
        } else {
            showToast(res.message || "Failed to delete building.", "error");
        }
    } catch (err) {
        console.error("Delete building error:", err);
        showToast("Error deleting building.", "error");
    }
}

// ROOM MODAL
async function openRoomModal(roomId = null) {
    const modal = document.getElementById("rmModalRoom");
    const form = document.getElementById("rmFormRoom");
    if (!modal || !form) return;
    form.reset();

    // Populate buildings select
    const bldgSelect = document.getElementById("roomFormBuilding");
    if (bldgSelect) {
        bldgSelect.innerHTML = state.buildings.map(b => `<option value="${b.id}">${escapeHtml(b.building_name)}</option>`).join("");
    }

    const autoBedsWrap = document.getElementById("wrapAutoBeds");

    if (roomId) {
        document.getElementById("rmModalRoomTitle").textContent = "Edit Hospital Room";
        document.getElementById("roomFormId").value = roomId;
        if (autoBedsWrap) autoBedsWrap.style.display = "none";

        try {
            const res = await fetchRoomDetail(roomId);
            if (res.success && res.data) {
                const room = res.data;
                document.getElementById("roomFormBuilding").value = room.building_id;
                document.getElementById("roomFormFloor").value = room.floor_number;
                document.getElementById("roomFormNumber").value = room.room_number;
                document.getElementById("roomFormName").value = room.room_name || "";
                document.getElementById("roomFormType").value = room.room_type;
                document.getElementById("roomFormRate").value = room.daily_rate;
                document.getElementById("roomFormMaxBeds").value = room.max_beds;
                document.getElementById("roomFormGender").value = room.gender_restriction;
                document.getElementById("roomFormAmenities").value = room.amenities || "";
            }
        } catch (err) {
            console.error("Error fetching room details:", err);
        }
    } else {
        document.getElementById("rmModalRoomTitle").textContent = "Register Hospital Room";
        document.getElementById("roomFormId").value = "";
        if (autoBedsWrap) autoBedsWrap.style.display = "block";
    }

    modal.classList.add("open");
}

async function handleRoomSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("roomFormId").value;
    const payload = {
        id: id ? parseInt(id) : null,
        building_id: parseInt(document.getElementById("roomFormBuilding").value),
        floor_number: document.getElementById("roomFormFloor").value,
        room_number: document.getElementById("roomFormNumber").value,
        room_name: document.getElementById("roomFormName").value,
        room_type: document.getElementById("roomFormType").value,
        daily_rate: parseFloat(document.getElementById("roomFormRate").value) || 0,
        max_beds: parseInt(document.getElementById("roomFormMaxBeds").value) || 1,
        gender_restriction: document.getElementById("roomFormGender").value,
        amenities: document.getElementById("roomFormAmenities").value,
        auto_create_beds: document.getElementById("roomFormAutoBeds")?.checked ? 1 : 0
    };

    try {
        const res = id ? await updateRoom(payload) : await createRoom(payload);
        if (res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalRoom").classList.remove("open");
            await loadAllData();
            if (state.activeTab === "rooms") await loadRoomsData();
        } else {
            showToast(res.message || "Failed to save room.", "error");
        }
    } catch (err) {
        console.error("Room save error:", err);
        showToast("An unexpected error occurred.", "error");
    }
}

async function handleDeleteRoom(id) {
    if (!confirm("Are you sure you want to delete this room and all associated vacant beds?")) return;
    try {
        const res = await deleteRoom(id);
        if (res.success) {
            showToast(res.message, "success");
            await loadAllData();
            if (state.activeTab === "rooms") await loadRoomsData();
        } else {
            showToast(res.message || "Failed to delete room.", "error");
        }
    } catch (err) {
        console.error("Delete room error:", err);
        showToast("Error deleting room.", "error");
    }
}

// BED MODAL
async function openBedModal(bedId = null) {
    const modal = document.getElementById("rmModalBed");
    const form = document.getElementById("rmFormBed");
    if (!modal || !form) return;
    form.reset();

    // Populate rooms select
    const roomsRes = await fetchRooms();
    const rooms = roomsRes.success ? (roomsRes.data || []) : [];
    const roomSelect = document.getElementById("bedFormRoom");
    if (roomSelect) {
        roomSelect.innerHTML = rooms.map(r => `<option value="${r.id}">${escapeHtml(r.building_name)} &bull; ${escapeHtml(r.room_number)} (${escapeHtml(r.room_type)})</option>`).join("");
    }

    if (bedId) {
        document.getElementById("rmModalBedTitle").textContent = "Edit Hospital Bed";
        document.getElementById("bedFormId").value = bedId;

        const bed = state.beds.find(b => String(b.id) === String(bedId));
        if (bed) {
            if (roomSelect) roomSelect.value = bed.room_id || "";
            document.getElementById("bedFormNumber").value = bed.bed_number;
            document.getElementById("bedFormType").value = bed.bed_type;
            document.getElementById("bedFormStatus").value = bed.status;
            document.getElementById("bedFormRate").value = bed.daily_rate || "";
            document.getElementById("bedFormFeatures").value = bed.features || "";
        }
    } else {
        document.getElementById("rmModalBedTitle").textContent = "Register Hospital Bed";
        document.getElementById("bedFormId").value = "";
    }

    modal.classList.add("open");
}

async function handleBedSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("bedFormId").value;
    const payload = {
        id: id ? parseInt(id) : null,
        room_id: parseInt(document.getElementById("bedFormRoom").value),
        bed_number: document.getElementById("bedFormNumber").value,
        bed_type: document.getElementById("bedFormType").value,
        status: document.getElementById("bedFormStatus").value,
        daily_rate: document.getElementById("bedFormRate").value ? parseFloat(document.getElementById("bedFormRate").value) : null,
        features: document.getElementById("bedFormFeatures").value
    };

    try {
        const res = id ? await updateBed(payload) : await createBed(payload);
        if (res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalBed").classList.remove("open");
            await loadAllData();
            if (state.activeTab === "beds") await loadBedsData();
        } else {
            showToast(res.message || "Failed to save bed.", "error");
        }
    } catch (err) {
        console.error("Bed save error:", err);
        showToast("An unexpected error occurred.", "error");
    }
}

async function handleDeleteBed(id) {
    if (!confirm("Are you sure you want to delete this bed?")) return;
    try {
        const res = await deleteBed(id);
        if (res.success) {
            showToast(res.message, "success");
            await loadAllData();
            if (state.activeTab === "beds") await loadBedsData();
        } else {
            showToast(res.message || "Failed to delete bed.", "error");
        }
    } catch (err) {
        console.error("Delete bed error:", err);
        showToast("Error deleting bed.", "error");
    }
}

// BED STATUS ACTION MODAL
async function openBedActionModal(bedId) {
    const modal = document.getElementById("rmModalBedAction");
    if (!modal) return;

    let bed = state.beds.find(b => String(b.id) === String(bedId));
    if (!bed && state.monitorData) {
        for (const bldg of state.monitorData.buildings) {
            for (const floor of Object.values(bldg.floors || {})) {
                for (const room of floor) {
                    const found = (room.beds || []).find(b => String(b.id) === String(bedId));
                    if (found) {
                        bed = { ...found, room_number: room.room_number, building_name: bldg.building_name };
                        break;
                    }
                }
            }
        }
    }

    if (!bed) {
        showToast("Bed record not found.", "error");
        return;
    }

    document.getElementById("actionBedId").value = bed.id;
    document.getElementById("actionBedStatusSelect").value = bed.status;

    const occupantInfo = bed.patient_name
        ? `<div style="margin-top: 6px; color: #1d4ed8;"><strong>Occupant:</strong> ${escapeHtml(bed.patient_name)} (${escapeHtml(bed.patient_mrn || "")})</div>`
        : `<div style="margin-top: 6px; color: #059669;"><strong>Vacant</strong> &mdash; No patient admitted</div>`;

    document.getElementById("actionBedDetails").innerHTML = `
        <div style="font-weight: 700; font-size: 14px;">🛏️ ${escapeHtml(bed.bed_number)} &bull; ${escapeHtml(bed.room_number || "")}</div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(bed.building_name || "")} &bull; ${escapeHtml(bed.bed_type || "Standard Bed")}
        </div>
        ${occupantInfo}
    `;

    modal.classList.add("open");
}

async function handleBedActionSubmit() {
    const bedId = document.getElementById("actionBedId").value;
    const newStatus = document.getElementById("actionBedStatusSelect").value;
    const btn = document.getElementById("btnSaveBedAction");

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating...";
    }

    try {
        const res = await updateBedStatus(bedId, newStatus);
        if (res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalBedAction").classList.remove("open");
            await loadAllData();
            if (state.activeTab === "beds") await loadBedsData();
        } else {
            showToast(res.message || "Failed to update bed status.", "error");
        }
    } catch (err) {
        console.error("Bed status update error:", err);
        showToast("Error updating status.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Update Status";
        }
    }
}

function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =============================================================================
// EVS BED TURNOVER PIPELINE LOGIC
// =============================================================================

async function loadEvsBadge() {
    try {
        const res = await fetchEvsStats();
        if (res && res.success && res.data) {
            state.evsStats = res.data;
            const badge = document.getElementById("tabBadgeEvs");
            if (badge) {
                const count = res.data.active_turnovers || 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? "inline-block" : "none";
            }
        }
    } catch (e) {
        console.error("Failed to load EVS stats badge:", e);
    }
}

async function loadEvsData() {
    const tbody = document.getElementById("evsTableBody");
    if (!tbody) return;

    try {
        const [statsRes, logsRes] = await Promise.all([
            fetchEvsStats(),
            fetchEvsTurnovers(state.evsFilters)
        ]);

        if (statsRes && statsRes.success && statsRes.data) {
            state.evsStats = statsRes.data;
            const s = statsRes.data;
            const dirtyEl = document.getElementById("evsKpiDirty");
            const cleanEl = document.getElementById("evsKpiCleaning");
            const inspEl = document.getElementById("evsKpiInspection");
            const avgEl = document.getElementById("evsKpiAvgTurnover");
            const slaEl = document.getElementById("evsKpiSlaRate");
            const breachSub = document.getElementById("evsKpiBreachesSub");
            const badge = document.getElementById("tabBadgeEvs");

            if (dirtyEl) dirtyEl.textContent = s.pending_dirty;
            if (cleanEl) cleanEl.textContent = s.in_progress;
            if (inspEl) inspEl.textContent = s.pending_inspection;
            if (avgEl) avgEl.textContent = `${s.avg_turnover_minutes || 0} mins`;
            if (slaEl) slaEl.textContent = `${s.sla_compliance_rate || 100}%`;
            if (breachSub) breachSub.textContent = `${s.active_sla_breaches || 0} active breaches`;
            if (badge) {
                badge.textContent = s.active_turnovers || 0;
                badge.style.display = (s.active_turnovers > 0) ? "inline-block" : "none";
            }
        }

        if (logsRes && logsRes.success) {
            state.evsLogs = logsRes.data || [];
            renderEvsTable(state.evsLogs);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #ef4444;">${logsRes?.message || "Failed to load turnover pipeline."}</td></tr>`;
        }
    } catch (err) {
        console.error("Failed to load EVS data:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #ef4444;">Network error while retrieving EVS logs.</td></tr>`;
    }
}

function renderEvsTable(logs) {
    const tbody = document.getElementById("evsTableBody");
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="margin-bottom: 8px; opacity: 0.6;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                    <div>No bed turnovers found matching the selected filter criteria.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map((log) => {
        // Priority Badge
        let priorityClass = "evs-priority-routine";
        let priorityIcon = "⚪";
        if (log.cleaning_priority === "STAT") {
            priorityClass = "evs-priority-stat";
            priorityIcon = "🚨";
        } else if (log.cleaning_priority === "Urgent") {
            priorityClass = "evs-priority-urgent";
            priorityIcon = "⚠️";
        }

        // Stage Badge
        let stageBadge = "";
        if (log.status === "Vacated / Dirty") {
            stageBadge = `<span class="evs-stage-badge evs-stage-dirty"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#b45309;"></span> Vacated / Dirty</span>`;
        } else if (log.status === "Cleaning In-Progress") {
            stageBadge = `<span class="evs-stage-badge evs-stage-cleaning"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#1d4ed8;"></span> Cleaning In-Progress</span>`;
        } else if (log.status === "Sanitized / Pending Inspection") {
            stageBadge = `<span class="evs-stage-badge evs-stage-inspection"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#6d28d9;"></span> Pending Inspection</span>`;
        } else if (log.status === "Completed / Available") {
            stageBadge = `<span class="evs-stage-badge evs-stage-completed"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#047857;"></span> Released / Available</span>`;
        } else if (log.status === "Inspection Failed") {
            stageBadge = `<span class="evs-stage-badge evs-stage-failed"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#b91c1c;"></span> Inspection Failed</span>`;
        } else {
            stageBadge = `<span class="rm-badge">${escapeHtml(log.status)}</span>`;
        }

        // SLA calculation
        const elapsedMins = log.elapsed_turnover_minutes || 0;
        const targetSla = log.target_sla_minutes || 45;
        let slaHtml = "";

        if (log.status === "Completed / Available") {
            const actualDuration = log.turnover_duration_minutes || elapsedMins;
            if (log.is_sla_breached) {
                slaHtml = `
                    <div style="font-weight: 700; color: #ef4444; font-size: 13px;">${actualDuration} mins</div>
                    <span class="rm-badge" style="background: rgba(239, 68, 68, 0.15); color: #b91c1c;">SLA BREACHED (+${actualDuration - targetSla}m)</span>
                `;
            } else {
                slaHtml = `
                    <div style="font-weight: 700; color: #10b981; font-size: 13px;">${actualDuration} mins</div>
                    <span class="rm-badge" style="background: rgba(16, 185, 129, 0.15); color: #047857;">MET SLA (Target: ${targetSla}m)</span>
                `;
            }
        } else {
            if (log.is_sla_breached) {
                slaHtml = `
                    <div style="font-weight: 700; color: #ef4444; font-size: 13px;">${elapsedMins} mins elapsed</div>
                    <span class="rm-badge" style="background: rgba(239, 68, 68, 0.15); color: #b91c1c;">BREACHED (+${elapsedMins - targetSla}m)</span>
                `;
            } else {
                const remaining = Math.max(0, targetSla - elapsedMins);
                slaHtml = `
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${elapsedMins} mins elapsed</div>
                    <span class="rm-badge" style="background: rgba(59, 130, 246, 0.15); color: #1d4ed8;">${remaining}m remaining (SLA: ${targetSla}m)</span>
                `;
            }
        }

        // Actions
        let actionButtons = "";
        if (log.status === "Vacated / Dirty") {
            actionButtons += `
                <button type="button" class="rm-btn rm-btn-secondary btn-evs-assign" data-id="${log.id}" style="padding: 4px 8px; font-size: 11px;">
                    👤 Assign
                </button>
                <button type="button" class="rm-btn rm-btn-primary btn-evs-start" data-id="${log.id}" style="padding: 4px 8px; font-size: 11px;">
                    ▶️ Start
                </button>
            `;
        } else if (log.status === "Cleaning In-Progress") {
            actionButtons += `
                <button type="button" class="rm-btn rm-btn-success btn-evs-complete" data-id="${log.id}" style="padding: 4px 8px; font-size: 11px;">
                    ✅ Complete
                </button>
            `;
        } else if (log.status === "Sanitized / Pending Inspection" || log.status === "Inspection Failed") {
            actionButtons += `
                <button type="button" class="rm-btn rm-btn-accent btn-evs-inspect" data-id="${log.id}" style="padding: 4px 8px; font-size: 11px;">
                    🔬 Inspect & Release
                </button>
            `;
        }

        actionButtons += `
            <button type="button" class="rm-btn btn-evs-detail" data-id="${log.id}" title="Audit trail & timestamps" style="padding: 4px 8px; font-size: 11px;">
                📋 Info
            </button>
        `;

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                        <span class="${priorityClass}">${priorityIcon} ${escapeHtml(log.cleaning_priority)}</span>
                    </div>
                    <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: var(--text-primary);">${escapeHtml(log.turnover_number)}</div>
                </td>
                <td>
                    <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(log.bed_number)}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">
                        ${escapeHtml(log.ward_name || "General Ward")} &bull; ${escapeHtml(log.room_number || log.bed_room_number || "Room")}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(log.building_name || "")}</div>
                </td>
                <td>
                    <div style="font-size: 12px; font-weight: 600;">${escapeHtml(log.vacated_at ? new Date(log.vacated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently")}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(log.vacated_at ? new Date(log.vacated_at).toLocaleDateString() : "")}</div>
                    ${log.patient_name ? `<div style="font-size: 11px; color: var(--accent); margin-top: 2px;">Prev: ${escapeHtml(log.patient_name)}</div>` : ""}
                </td>
                <td>
                    ${stageBadge}
                    ${log.notes ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHtml(log.notes)}">${escapeHtml(log.notes)}</div>` : ""}
                </td>
                <td>
                    <div style="font-weight: 600; font-size: 12.5px;">${escapeHtml(log.assigned_evs_staff_name || log.cleaned_by || "Unassigned")}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(log.cleaning_type || "Routine Turnover")}</div>
                    ${log.cleaned_by && log.cleaned_by !== log.assigned_evs_staff_name ? `<div style="font-size: 10.5px; color: var(--text-muted);">Cleaned by: ${escapeHtml(log.cleaned_by)}</div>` : ""}
                </td>
                <td>
                    ${slaHtml}
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    // Wire action click handlers
    tbody.querySelectorAll(".btn-evs-assign").forEach((btn) => {
        btn.addEventListener("click", () => openEvsAssignModal(parseInt(btn.getAttribute("data-id"))));
    });
    tbody.querySelectorAll(".btn-evs-start").forEach((btn) => {
        btn.addEventListener("click", () => openEvsStartModal(parseInt(btn.getAttribute("data-id"))));
    });
    tbody.querySelectorAll(".btn-evs-complete").forEach((btn) => {
        btn.addEventListener("click", () => openEvsCompleteModal(parseInt(btn.getAttribute("data-id"))));
    });
    tbody.querySelectorAll(".btn-evs-inspect").forEach((btn) => {
        btn.addEventListener("click", () => openEvsInspectModal(parseInt(btn.getAttribute("data-id"))));
    });
    tbody.querySelectorAll(".btn-evs-detail").forEach((btn) => {
        btn.addEventListener("click", () => openEvsDetailModal(parseInt(btn.getAttribute("data-id"))));
    });
}

// -----------------------------------------------------------------------------
// EVS Modal Handlers
// -----------------------------------------------------------------------------

async function openEvsInitiateModal() {
    const modal = document.getElementById("rmModalEvsInitiate");
    const bedSelect = document.getElementById("evsInitiateBedSelect");
    if (!modal || !bedSelect) return;

    bedSelect.innerHTML = `<option value="">Loading beds...</option>`;
    modal.classList.add("open");

    try {
        const res = await fetchBeds({});
        if (res && res.success && res.data) {
            bedSelect.innerHTML = `<option value="">-- Select Vacated / Dirty Bed --</option>` +
                res.data.map((b) => `<option value="${b.id}" ${b.status === "Dirty / Turnover" ? "selected" : ""}>Bed ${escapeHtml(b.bed_number)} (${escapeHtml(b.room_number)} - ${escapeHtml(b.ward_name)}) [${escapeHtml(b.status)}]</option>`).join("");
        }
    } catch (e) {
        console.error("Failed to populate beds:", e);
        bedSelect.innerHTML = `<option value="">Failed to load beds</option>`;
    }
}

async function handleEvsInitiateSubmit() {
    const bedId = document.getElementById("evsInitiateBedSelect")?.value;
    const priority = document.getElementById("evsInitiatePriority")?.value || "Routine";
    const cleaningType = document.getElementById("evsInitiateCleaningType")?.value || "Terminal Cleaning";
    const notes = document.getElementById("evsInitiateNotes")?.value || "";

    if (!bedId) {
        showToast("Please select a hospital bed.", "error");
        return;
    }

    const btn = document.getElementById("btnSaveEvsInitiate");
    if (btn) { btn.disabled = true; btn.textContent = "Logging..."; }

    try {
        const res = await createEvsTurnover({
            bed_id: parseInt(bedId),
            cleaning_priority: priority,
            cleaning_type: cleaningType,
            notes: notes
        });

        if (res && res.success) {
            showToast(res.message || "Bed turnover initiated successfully.", "success");
            document.getElementById("rmModalEvsInitiate")?.classList.remove("open");
            await loadEvsData();
            await loadAllData();
        } else {
            showToast(res?.message || "Failed to initiate turnover.", "error");
        }
    } catch (err) {
        console.error("Error creating turnover:", err);
        showToast("Error initiating bed turnover.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Log Turnover"; }
    }
}

function openEvsAssignModal(turnoverId) {
    const log = state.evsLogs.find((l) => l.id == turnoverId);
    if (!log) return;

    document.getElementById("evsAssignTurnoverId").value = turnoverId;
    document.getElementById("evsAssignBedBanner").innerHTML = `
        <strong>Bed:</strong> ${escapeHtml(log.bed_number)} (${escapeHtml(log.ward_name)} - ${escapeHtml(log.room_number)}) &bull; 
        <strong>Turnover:</strong> ${escapeHtml(log.turnover_number)}
    `;
    document.getElementById("evsAssignStaffName").value = log.assigned_evs_staff_name || "";
    document.getElementById("evsAssignPriority").value = log.cleaning_priority || "Routine";
    document.getElementById("evsAssignSla").value = log.target_sla_minutes || 45;
    document.getElementById("evsAssignNotes").value = log.notes || "";

    document.getElementById("rmModalEvsAssign")?.classList.add("open");
}

async function handleEvsAssignSubmit() {
    const id = document.getElementById("evsAssignTurnoverId")?.value;
    const staffName = document.getElementById("evsAssignStaffName")?.value?.trim();
    const priority = document.getElementById("evsAssignPriority")?.value;
    const sla = document.getElementById("evsAssignSla")?.value;
    const notes = document.getElementById("evsAssignNotes")?.value;

    if (!staffName) {
        showToast("Please provide staff name.", "error");
        return;
    }

    const btn = document.getElementById("btnSaveEvsAssign");
    if (btn) { btn.disabled = true; btn.textContent = "Assigning..."; }

    try {
        const res = await assignEvsStaff(parseInt(id), {
            staff_name: staffName,
            cleaning_priority: priority,
            target_sla_minutes: parseInt(sla) || 45,
            notes: notes
        });

        if (res && res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalEvsAssign")?.classList.remove("open");
            await loadEvsData();
        } else {
            showToast(res?.message || "Failed to assign staff.", "error");
        }
    } catch (e) {
        console.error("Assign error:", e);
        showToast("Error assigning staff.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Assign Staff"; }
    }
}

function openEvsStartModal(turnoverId) {
    const log = state.evsLogs.find((l) => l.id == turnoverId);
    if (!log) return;

    document.getElementById("evsStartTurnoverId").value = turnoverId;
    document.getElementById("evsStartBedBanner").innerHTML = `
        <strong>Bed:</strong> ${escapeHtml(log.bed_number)} &bull; <strong>Turnover:</strong> ${escapeHtml(log.turnover_number)}<br />
        <strong>Cleaning Type:</strong> ${escapeHtml(log.cleaning_type)} &bull; <strong>Priority:</strong> ${escapeHtml(log.cleaning_priority)}
    `;
    document.getElementById("evsStartCleanedBy").value = log.assigned_evs_staff_name || (state.user?.name || "EVS Staff");

    document.getElementById("rmModalEvsStart")?.classList.add("open");
}

async function handleEvsStartSubmit() {
    const id = document.getElementById("evsStartTurnoverId")?.value;
    const cleanedBy = document.getElementById("evsStartCleanedBy")?.value?.trim();

    if (!cleanedBy) {
        showToast("Please provide staff name.", "error");
        return;
    }

    const btn = document.getElementById("btnSaveEvsStart");
    if (btn) { btn.disabled = true; btn.textContent = "Starting..."; }

    try {
        const res = await startEvsCleaning(parseInt(id), { cleaned_by: cleanedBy });
        if (res && res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalEvsStart")?.classList.remove("open");
            await loadEvsData();
        } else {
            showToast(res?.message || "Failed to start cleaning.", "error");
        }
    } catch (e) {
        console.error("Start error:", e);
        showToast("Error starting cleaning.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Confirm Start Cleaning"; }
    }
}

function openEvsCompleteModal(turnoverId) {
    const log = state.evsLogs.find((l) => l.id == turnoverId);
    if (!log) return;

    document.getElementById("evsCompleteTurnoverId").value = turnoverId;
    document.getElementById("evsCompleteBedBanner").innerHTML = `
        <strong>Bed:</strong> ${escapeHtml(log.bed_number)} &bull; <strong>Turnover:</strong> ${escapeHtml(log.turnover_number)}<br />
        <strong>Cleaning Started:</strong> ${log.cleaning_started_at ? new Date(log.cleaning_started_at).toLocaleTimeString() : "Recently"} &bull; 
        <strong>Current Elapsed:</strong> ${log.elapsed_cleaning_minutes || 0} mins
    `;
    document.getElementById("evsCompleteCleanedBy").value = log.cleaned_by || log.assigned_evs_staff_name || (state.user?.name || "");
    document.getElementById("evsCompleteNotes").value = log.notes || "";

    // Reset checkboxes to checked
    ["chkLinen", "chkSurfaces", "chkRestroom", "chkFloor", "chkTrash", "chkTerminal"].forEach((chkId) => {
        const el = document.getElementById(chkId);
        if (el) el.checked = true;
    });

    document.getElementById("rmModalEvsComplete")?.classList.add("open");
}

async function handleEvsCompleteSubmit() {
    const id = document.getElementById("evsCompleteTurnoverId")?.value;
    const cleanedBy = document.getElementById("evsCompleteCleanedBy")?.value?.trim();
    const notes = document.getElementById("evsCompleteNotes")?.value;

    if (!cleanedBy) {
        showToast("Staff name is required.", "error");
        return;
    }

    const checklist = {
        linens_stripped_and_replaced: document.getElementById("chkLinen")?.checked || false,
        high_touch_surfaces_disinfected: document.getElementById("chkSurfaces")?.checked || false,
        restroom_sanitized: document.getElementById("chkRestroom")?.checked || false,
        floor_disinfectant_mopped: document.getElementById("chkFloor")?.checked || false,
        waste_and_biohazard_disposed: document.getElementById("chkTrash")?.checked || false,
        terminal_sanitation_uv_cycle: document.getElementById("chkTerminal")?.checked || false
    };

    const btn = document.getElementById("btnSaveEvsComplete");
    if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }

    try {
        const res = await completeEvsCleaning(parseInt(id), {
            checklist: checklist,
            cleaned_by: cleanedBy,
            notes: notes
        });

        if (res && res.success) {
            showToast(res.message, "success");
            document.getElementById("rmModalEvsComplete")?.classList.remove("open");
            await loadEvsData();
        } else {
            showToast(res?.message || "Failed to complete cleaning.", "error");
        }
    } catch (e) {
        console.error("Complete error:", e);
        showToast("Error completing cleaning.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Submit Sanitization & Request Inspection"; }
    }
}

function openEvsInspectModal(turnoverId) {
    const log = state.evsLogs.find((l) => l.id == turnoverId);
    if (!log) return;

    document.getElementById("evsInspectTurnoverId").value = turnoverId;
    document.getElementById("evsInspectBedBanner").innerHTML = `
        <strong>Bed:</strong> ${escapeHtml(log.bed_number)} &bull; <strong>Turnover:</strong> ${escapeHtml(log.turnover_number)}<br />
        <strong>Cleaned By:</strong> ${escapeHtml(log.cleaned_by || log.assigned_evs_staff_name || "Housekeeping Staff")}<br />
        <strong>Total Elapsed:</strong> ${log.elapsed_turnover_minutes || 0} mins (SLA: ${log.target_sla_minutes || 45} mins)
    `;
    document.getElementById("evsInspectDecision").value = "Passed";
    document.getElementById("evsInspectorName").value = state.user?.name ? `${state.user.name} (${state.user.role || 'Staff'})` : "Charge Nurse / EVS Supervisor";
    document.getElementById("evsInspectNotes").value = "";

    document.getElementById("rmModalEvsInspect")?.classList.add("open");
}

async function handleEvsInspectSubmit() {
    const id = document.getElementById("evsInspectTurnoverId")?.value;
    const decision = document.getElementById("evsInspectDecision")?.value;
    const inspector = document.getElementById("evsInspectorName")?.value?.trim();
    const notes = document.getElementById("evsInspectNotes")?.value;

    if (!inspector) {
        showToast("Inspector name is required.", "error");
        return;
    }

    const btn = document.getElementById("btnSaveEvsInspect");
    if (btn) { btn.disabled = true; btn.textContent = "Submitting Sign-Off..."; }

    try {
        const res = await inspectEvsTurnover(parseInt(id), {
            inspection_status: decision,
            inspector_name: inspector,
            notes: notes
        });

        if (res && res.success) {
            showToast(res.message, decision === "Passed" ? "success" : "warning");
            document.getElementById("rmModalEvsInspect")?.classList.remove("open");
            await loadEvsData();
            await loadAllData();
            if (state.activeTab === "beds") await loadBedsData();
        } else {
            showToast(res?.message || "Failed to submit inspection.", "error");
        }
    } catch (e) {
        console.error("Inspect error:", e);
        showToast("Error submitting inspection.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Sign-Off & Submit"; }
    }
}

async function openEvsDetailModal(turnoverId) {
    const modal = document.getElementById("rmModalEvsDetail");
    const body = document.getElementById("evsDetailBody");
    if (!modal || !body) return;

    body.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Loading details...</div>`;
    modal.classList.add("open");

    try {
        const res = await fetchEvsTurnoverDetail(turnoverId);
        if (res && res.success && res.data) {
            const d = res.data;
            const checklist = d.checklist || {};
            const checklistItems = Object.entries(checklist).map(([key, val]) => `
                <li style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-bottom: 4px;">
                    <span style="color: ${val ? '#10b981' : '#ef4444'}; font-weight: bold;">${val ? '✓' : '✗'}</span>
                    <span>${escapeHtml(key.replace(/_/g, ' '))}</span>
                </li>
            `).join("");

            body.innerHTML = `
                <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${escapeHtml(d.turnover_number)}</span>
                        <span class="rm-badge">${escapeHtml(d.status)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12.5px;">
                        <div><strong>Bed:</strong> ${escapeHtml(d.bed_number)} (${escapeHtml(d.bed_type)})</div>
                        <div><strong>Ward & Room:</strong> ${escapeHtml(d.ward_name)} - ${escapeHtml(d.room_number)}</div>
                        <div><strong>Priority:</strong> ${escapeHtml(d.cleaning_priority)}</div>
                        <div><strong>Cleaning Type:</strong> ${escapeHtml(d.cleaning_type)}</div>
                        <div><strong>Target SLA:</strong> ${d.target_sla_minutes} mins</div>
                        <div><strong>SLA Breached:</strong> <span style="font-weight:700; color:${d.is_sla_breached ? '#ef4444' : '#10b981'};">${d.is_sla_breached ? 'YES' : 'NO'}</span></div>
                    </div>
                </div>

                <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Operational Timeline</div>
                <div style="border-left: 2px solid var(--border-color); margin-left: 10px; padding-left: 14px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; font-size: 12px;">
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">Bed Vacated</div>
                        <div style="color: var(--text-muted);">${d.vacated_at ? new Date(d.vacated_at).toLocaleString() : 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">Staff Assigned</div>
                        <div style="color: var(--text-muted);">${escapeHtml(d.assigned_evs_staff_name || 'Unassigned')}</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">Cleaning Started</div>
                        <div style="color: var(--text-muted);">${d.cleaning_started_at ? new Date(d.cleaning_started_at).toLocaleString() : 'Not started'} ${d.cleaned_by ? `(by ${escapeHtml(d.cleaned_by)})` : ''}</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">Cleaning Completed & Sanitized</div>
                        <div style="color: var(--text-muted);">${d.cleaning_completed_at ? new Date(d.cleaning_completed_at).toLocaleString() : 'Pending'} ${d.cleaning_duration_minutes ? `(${d.cleaning_duration_minutes} mins)` : ''}</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">Inspection & Release</div>
                        <div style="color: var(--text-muted);">${d.released_at ? `${new Date(d.released_at).toLocaleString()} (Released by ${escapeHtml(d.inspector_name || 'N/A')})` : 'Pending'}</div>
                    </div>
                </div>

                ${checklistItems ? `
                    <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Sanitization Checklist Verification</div>
                    <ul style="list-style: none; padding: 0; margin: 0 0 16px 0; background: var(--bg-surface-alt); border-radius: 6px; padding: 12px; border: 1px solid var(--border-color);">
                        ${checklistItems}
                    </ul>
                ` : ''}

                ${d.notes ? `
                    <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">Notes & Observations</div>
                    <div style="background: var(--bg-surface-alt); border-radius: 6px; padding: 10px; font-size: 12.5px; border: 1px solid var(--border-color);">
                        ${escapeHtml(d.notes)}
                    </div>
                ` : ''}
            `;
        } else {
            body.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Failed to load detail.</div>`;
        }
    } catch (e) {
        console.error("Detail error:", e);
        body.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error retrieving turnover detail.</div>`;
    }
}

