import { api } from "../../core/api.js?v=5";

export async function fetchWorkforceStats() {
    return await api("/workforce/stats");
}

export async function fetchStaffTrainingList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.department_id) params.append("department_id", filters.department_id);
    if (filters.status && filters.status !== "all") params.append("status", filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await api(`/workforce/staff${queryString}`);
}

export async function recordTrainingEvent(data) {
    return await api("/workforce/trainings", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function fetchTrainingDetails(id) {
    return await api(`/workforce/trainings/${id}`);
}

export async function fetchStaffTrainingHistory(employeeId) {
    return await api(`/workforce/staff/${employeeId}/trainings`);
}

export async function fetchSanctionsList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.category && filters.category !== "all") params.append("category", filters.category);
    if (filters.severity && filters.severity !== "all") params.append("severity", filters.severity);
    if (filters.status && filters.status !== "all") params.append("status", filters.status);
    if (filters.employee_id) params.append("employee_id", filters.employee_id);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await api(`/workforce/sanctions${queryString}`);
}

export async function recordSanctionEvent(data) {
    return await api("/workforce/sanctions", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateSanctionEvent(id, data) {
    return await api(`/workforce/sanctions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function fetchSanctionDossier(id) {
    return await api(`/workforce/sanctions/${id}/dossier`);
}

export function getTrainingsCsvUrl() {
    return "./api/workforce/export/trainings-csv";
}

export function getSanctionsCsvUrl() {
    return "./api/workforce/export/sanctions-csv";
}
