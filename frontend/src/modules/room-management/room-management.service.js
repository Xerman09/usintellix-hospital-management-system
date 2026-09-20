import { api } from "../../core/api.js?v=5";

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
