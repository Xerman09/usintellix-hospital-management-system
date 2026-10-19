import { api } from "../../core/api.js?v=10";

export async function fetchMonitorData(filters = {}) {
    const params = new URLSearchParams();
    if (filters.building_id) params.set("building_id", filters.building_id);
    if (filters.floor_number) params.set("floor_number", filters.floor_number);
    if (filters.room_type) params.set("room_type", filters.room_type);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/room-management/monitor${qs ? `?${qs}` : ""}`);
}

export async function fetchBuildings(activeOnly = false) {
    return await api(`/room-management/buildings${activeOnly ? "?active_only=1" : ""}`);
}

export async function createBuilding(data) {
    return await api("/room-management/buildings", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateBuilding(data) {
    return await api("/room-management/buildings", {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function deleteBuilding(id) {
    return await api("/room-management/buildings", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function fetchRooms(filters = {}) {
    const params = new URLSearchParams();
    if (filters.building_id) params.set("building_id", filters.building_id);
    if (filters.floor_number) params.set("floor_number", filters.floor_number);
    if (filters.room_type) params.set("room_type", filters.room_type);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/room-management/rooms${qs ? `?${qs}` : ""}`);
}

export async function fetchRoomDetail(id) {
    return await api(`/room-management/rooms/detail?id=${id}`);
}

export async function createRoom(data) {
    return await api("/room-management/rooms", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateRoom(data) {
    return await api("/room-management/rooms", {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function deleteRoom(id) {
    return await api("/room-management/rooms", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function fetchBeds(filters = {}) {
    const params = new URLSearchParams();
    if (filters.room_id) params.set("room_id", filters.room_id);
    if (filters.building_id) params.set("building_id", filters.building_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.bed_type) params.set("bed_type", filters.bed_type);
    if (filters.room_type) params.set("room_type", filters.room_type);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/room-management/beds${qs ? `?${qs}` : ""}`);
}

export async function createBed(data) {
    return await api("/room-management/beds", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateBed(data) {
    return await api("/room-management/beds", {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function updateBedStatus(id, status) {
    return await api("/room-management/beds/status", {
        method: "PUT",
        body: JSON.stringify({ id, status })
    });
}

export async function deleteBed(id) {
    return await api("/room-management/beds", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function fetchHospitalWards() {
    return await api("/inpatient-admissions/wards");
}

// =============================================================================
// EVS BED TURNOVER PIPELINE API
// =============================================================================

export async function fetchEvsTurnovers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.stage) params.set("stage", filters.stage);
    if (filters.active_only) params.set("active_only", "1");
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.cleaning_type) params.set("cleaning_type", filters.cleaning_type);
    if (filters.ward_id) params.set("ward_id", filters.ward_id);
    if (filters.building_id) params.set("building_id", filters.building_id);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/room-management/evs/turnovers${qs ? `?${qs}` : ""}`);
}

export async function fetchEvsStats() {
    return await api("/room-management/evs/stats");
}

export async function fetchEvsTurnoverDetail(id) {
    return await api(`/room-management/evs/turnover/detail?id=${id}`);
}

export async function createEvsTurnover(data) {
    return await api("/room-management/evs/turnovers", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function assignEvsStaff(id, data) {
    return await api("/room-management/evs/turnover/assign", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function startEvsCleaning(id, data = {}) {
    return await api("/room-management/evs/turnover/start", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function completeEvsCleaning(id, data) {
    return await api("/room-management/evs/turnover/complete", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function inspectEvsTurnover(id, data) {
    return await api("/room-management/evs/turnover/inspect", {
        method: "POST",
        body: JSON.stringify({ id, ...data })
    });
}

export async function cancelEvsTurnover(id, reason) {
    return await api("/room-management/evs/turnover/cancel", {
        method: "POST",
        body: JSON.stringify({ id, reason })
    });
}

