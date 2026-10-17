import { api } from "../../core/api.js?v=10";

/**
 * Fetch complete visual organizational hierarchy tree for a facility.
 */
export async function fetchFacilityOrgTree(facilityId = null) {
    const params = new URLSearchParams();
    if (facilityId) params.set("facility_id", facilityId);
    const qs = params.toString();
    return await api(`/department-org/tree${qs ? `?${qs}` : ""}`);
}

/**
 * Appoint / change Head of Department (Doctor/Chair).
 */
export async function assignHeadOfDepartment(departmentId, employeeId) {
    return await api("/department-org/assign-head", {
        method: "POST",
        body: JSON.stringify({
            department_id: departmentId,
            employee_id: employeeId
        })
    });
}

/**
 * Assign or move a ward under a department.
 */
export async function assignWardToDepartment(wardId, departmentId) {
    return await api("/department-org/assign-ward", {
        method: "POST",
        body: JSON.stringify({
            ward_id: wardId,
            department_id: departmentId
        })
    });
}
