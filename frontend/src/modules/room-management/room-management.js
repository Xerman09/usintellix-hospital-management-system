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
    deleteBed
} from "./room-management.service.js?v=2";
import { showToast } from "../../core/toast.js";

let state = {
    user: null,
    activeTab: "monitor",
    monitorData: null,
    buildings: [],
    rooms: [],
    beds: [],
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
    }
}

async function loadAllData() {
    await Promise.all([
        loadMonitorData(),
        loadBuildingsOptions()
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
