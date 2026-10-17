import { api } from "../../core/api.js?v=10";

/**
 * Fetch equipment machinery assets with query filters.
 */
export async function fetchEquipmentAssets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.criticality_level) params.set("criticality_level", filters.criticality_level);
    if (filters.department_id) params.set("department_id", filters.department_id);
    if (filters.ward_id) params.set("ward_id", filters.ward_id);
    if (filters.calibration_filter) params.set("calibration_filter", filters.calibration_filter);

    const qs = params.toString();
    return await api(`/equipment-assets${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch real-time equipment KPI metrics.
 */
export async function fetchEquipmentMetrics() {
    return await api("/equipment-assets/metrics");
}

/**
 * Fetch facilities, departments, wards, rooms master locations.
 */
export async function fetchEquipmentLocations() {
    return await api("/equipment-assets/locations");
}

/**
 * Fetch single equipment asset with maintenance history.
 */
export async function fetchEquipmentAsset(id) {
    return await api(`/equipment-assets/show?id=${id}`);
}

/**
 * Create a new hospital machinery asset.
 */
export async function createEquipmentAsset(data) {
    return await api("/equipment-assets", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

/**
 * Update an existing hospital machinery asset.
 */
export async function updateEquipmentAsset(id, data) {
    return await api("/equipment-assets", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

/**
 * Fast status transition (Operational, Needs Calibration, Under Repair, Decommissioned).
 */
export async function updateEquipmentStatus(id, status, reason = "") {
    return await api("/equipment-assets/status", {
        method: "POST",
        body: JSON.stringify({ id, status, reason })
    });
}

/**
 * Record a calibration or preventive maintenance log entry.
 */
export async function recordEquipmentLog(equipmentId, logData) {
    return await api("/equipment-assets/logs", {
        method: "POST",
        body: JSON.stringify({ equipment_id: equipmentId, ...logData })
    });
}

/**
 * Soft-delete an equipment asset.
 */
export async function deleteEquipmentAsset(id) {
    return await api("/equipment-assets", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
