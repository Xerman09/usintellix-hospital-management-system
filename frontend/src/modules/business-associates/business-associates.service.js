import { api } from "../../core/api.js?v=5";

export async function fetchVendors(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/business-associates${query ? "?" + query : ""}`);
}

export async function fetchVendorStats() {
    return await api("/business-associates/stats");
}

export async function fetchVendor(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/business-associates/show?${query}`);
}

export async function createVendor(data) {
    return await api("/business-associates", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function updateVendor(id, data) {
    return await api("/business-associates", {
        method: "PUT",
        body: JSON.stringify({ id, ...data })
    });
}

export async function deleteVendor(id) {
    return await api("/business-associates", {
        method: "DELETE",
        body: JSON.stringify({ id })
    });
}

export async function fetchVendorDossier(id) {
    const query = new URLSearchParams({ id }).toString();
    return await api(`/business-associates/dossier?${query}`);
}

export function getVendorExportCsvUrl(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return `/api/business-associates/export-csv${query ? "?" + query : ""}`;
}
