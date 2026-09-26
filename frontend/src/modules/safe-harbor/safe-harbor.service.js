import { api } from "../../core/api.js?v=5";

export async function fetchSafeHarborStats() {
    return await api("/deidentification/stats");
}

export async function fetchExportsList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.dataset_type && filters.dataset_type !== "all") params.append("dataset_type", filters.dataset_type);
    if (filters.purpose_of_use && filters.purpose_of_use !== "all") params.append("purpose_of_use", filters.purpose_of_use);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await api(`/deidentification/exports${queryString}`);
}

export async function generateDeidentifiedDataset(data) {
    return await api("/deidentification/generate", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function fetchExportDetails(id) {
    return await api(`/deidentification/exports/${id}`);
}

export async function fetchAttestationCertificate(id) {
    return await api(`/deidentification/exports/${id}/attestation`);
}

export async function queryReidentificationVault(exportId, pseudonym) {
    return await api(`/deidentification/exports/${exportId}/lookup`, {
        method: "POST",
        body: JSON.stringify({ subject_pseudonym: pseudonym })
    });
}

export async function fetchStatutoryChecklist() {
    return await api("/deidentification/checklist");
}

export function getExportCsvUrl(id) {
    return `./api/deidentification/exports/${id}/csv`;
}

export function getExportJsonUrl(id) {
    return `./api/deidentification/exports/${id}/json?download=1`;
}

export function getRegistryCsvUrl() {
    return "./api/deidentification/registry/csv";
}
