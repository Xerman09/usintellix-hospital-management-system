import { api } from "../../core/api.js?v=5";

export async function fetchDepartments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.type && filters.type !== "all") params.set("type", filters.type);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.facility_id && filters.facility_id !== "all") params.set("facility_id", filters.facility_id);

    const qs = params.toString();
    return await api(`/departments${qs ? `?${qs}` : ""}`);
}

export async function fetchDepartmentStats() {
    return await api("/departments/stats");
}

export async function fetchDepartmentOptions() {
    return await api("/departments/options");
}

export async function fetchDepartmentDetail(id) {
    return await api(`/departments/show?id=${id}`);
}

export async function fetchDepartmentStaff(departmentId) {
    return await api(`/departments/staff?id=${departmentId}`);
}

export async function createDepartment(data) {
    return await api("/departments", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateDepartment(id, data) {
    return await api("/departments", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

export async function deleteDepartment(id) {
    return await api("/departments", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}
