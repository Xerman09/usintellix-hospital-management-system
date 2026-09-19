import { api, API_URL } from "../../core/api.js?v=5";

export function getAnnouncementImageUrl(relativePath) {
    if (!relativePath) return null;
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
        return relativePath;
    }
    const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return `${API_URL}${cleanPath}`;
}

export async function fetchAnnouncements(filters = {}) {
    const params = new URLSearchParams({ mode: "manage" });
    if (filters.search) params.append("search", filters.search);
    if (filters.status && filters.status !== "all") params.append("status", filters.status);
    if (filters.priority && filters.priority !== "all") params.append("priority", filters.priority);
    if (filters.role && filters.role !== "all") params.append("role", filters.role);

    return await api(`/announcements?${params.toString()}`);
}

export async function fetchActiveAnnouncements() {
    return await api("/announcements/active");
}

export async function fetchAnnouncement(id) {
    return await api(`/announcements/show?id=${encodeURIComponent(id)}`);
}

export async function fetchAnnouncementRoles() {
    return await api("/announcements/roles");
}

export async function createAnnouncement(formData) {
    return await api("/announcements", {
        method: "POST",
        headers: {},
        body: formData
    });
}

export async function updateAnnouncement(formData) {
    return await api("/announcements/update", {
        method: "POST",
        headers: {},
        body: formData
    });
}

export async function deleteAnnouncement(id) {
    return await api("/announcements", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}