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

/* =====================================================================
   BIOMEDICAL ENGINEERING: PREVENTIVE MAINTENANCE & CALENDAR API
===================================================================== */

/**
 * Fetch summary KPIs for PM Calendar.
 */
export async function fetchPMSummary() {
    return await api("/equipment-assets/biomed/summary");
}

/**
 * Fetch PM Schedules with optional filters.
 */
export async function fetchPMSchedules(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.maintenance_type) params.set("maintenance_type", filters.maintenance_type);
    if (filters.frequency) params.set("frequency", filters.frequency);
    if (filters.criticality_tier) params.set("criticality_tier", filters.criticality_tier);
    if (filters.status) params.set("status", filters.status);
    if (filters.asset_id) params.set("asset_id", filters.asset_id);
    if (filters.due_filter) params.set("due_filter", filters.due_filter);

    const qs = params.toString();
    return await api(`/equipment-assets/biomed/schedules${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch single PM schedule by ID.
 */
export async function fetchPMSchedule(id) {
    return await api(`/equipment-assets/biomed/schedules/show?id=${id}`);
}

/**
 * Create a new PM Schedule.
 */
export async function createPMSchedule(data) {
    return await api("/equipment-assets/biomed/schedules", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

/**
 * Update an existing PM Schedule.
 */
export async function updatePMSchedule(id, data) {
    return await api("/equipment-assets/biomed/schedules", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

/**
 * Delete a PM Schedule.
 */
export async function deletePMSchedule(id) {
    return await api("/equipment-assets/biomed/schedules", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

/**
 * Fetch calendar events (PM schedules & scheduled work orders).
 */
export async function fetchPMCalendarEvents(year, month) {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    const qs = params.toString();
    return await api(`/equipment-assets/biomed/calendar${qs ? `?${qs}` : ""}`);
}

/**
 * Spawn a Work Order directly from a PM Schedule.
 */
export async function generateWorkOrderFromSchedule(scheduleId, scheduledDate, notes = "") {
    return await api("/equipment-assets/biomed/schedules/generate-wo", {
        method: "POST",
        body: JSON.stringify({ schedule_id: scheduleId, scheduled_date: scheduledDate, notes })
    });
}

/* =====================================================================
   BIOMEDICAL ENGINEERING: BREAKDOWN TICKETING WORKBENCH API
===================================================================== */

/**
 * Fetch summary KPIs for breakdown ticketing.
 */
export async function fetchBreakdownSummary() {
    return await api("/equipment-assets/biomed/breakdown-summary");
}

/**
 * Fetch breakdown tickets.
 */
export async function fetchBreakdownTickets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.asset_id) params.set("asset_id", filters.asset_id);

    const qs = params.toString();
    return await api(`/equipment-assets/biomed/tickets${qs ? `?${qs}` : ""}`);
}

/**
 * File an emergency or urgent breakdown ticket (locks out machine).
 */
export async function createBreakdownTicket(data) {
    return await api("/equipment-assets/biomed/tickets", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

/**
 * Resolve a breakdown ticket, logging diagnostics, parts, labor, and release back to operational.
 */
export async function resolveBreakdownTicket(id, data) {
    return await api("/equipment-assets/biomed/tickets/resolve", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

/* =====================================================================
   BIOMEDICAL ENGINEERING: WORK ORDERS API
===================================================================== */

/**
 * Fetch Biomedical Work Orders.
 */
export async function fetchBiomedWorkOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.work_order_type) params.set("work_order_type", filters.work_order_type);
    if (filters.asset_id) params.set("asset_id", filters.asset_id);

    const qs = params.toString();
    return await api(`/equipment-assets/biomed/work-orders${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch single Work Order by ID.
 */
export async function fetchBiomedWorkOrder(id) {
    return await api(`/equipment-assets/biomed/work-orders/show?id=${id}`);
}

/**
 * Create a new Work Order.
 */
export async function createBiomedWorkOrder(data) {
    return await api("/equipment-assets/biomed/work-orders", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

/**
 * Update an existing Work Order.
 */
export async function updateBiomedWorkOrder(id, data) {
    return await api("/equipment-assets/biomed/work-orders", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}
