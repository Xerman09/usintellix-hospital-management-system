import { api } from "../../core/api.js?v=10";

/**
 * Fetch overview of all departments with clinic operating statuses.
 */
export async function fetchDepartmentsOverview(facilityId = null) {
    const params = new URLSearchParams();
    if (facilityId) params.set("facility_id", facilityId);
    const qs = params.toString();
    return await api(`/clinic-schedules/overview${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch 7-day weekly schedule for a department.
 */
export async function fetchDepartmentSchedule(departmentId, facilityId = null) {
    const params = new URLSearchParams();
    params.set("department_id", departmentId);
    if (facilityId) params.set("facility_id", facilityId);
    const qs = params.toString();
    return await api(`/clinic-schedules/show?${qs}`);
}

/**
 * Bulk save / update weekly 7-day schedule for a department.
 */
export async function saveWeeklySchedule(departmentId, schedules, facilityId = null) {
    return await api("/clinic-schedules/save", {
        method: "POST",
        body: JSON.stringify({
            department_id: departmentId,
            facility_id: facilityId,
            schedules: schedules
        })
    });
}

/**
 * Copy settings from one day to other target days.
 */
export async function copyDaySchedule(departmentId, sourceDay, targetDays, facilityId = null) {
    return await api("/clinic-schedules/copy-day", {
        method: "POST",
        body: JSON.stringify({
            department_id: departmentId,
            facility_id: facilityId,
            source_day: sourceDay,
            target_days: targetDays
        })
    });
}
