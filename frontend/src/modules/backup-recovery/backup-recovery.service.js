import { api, API_URL } from "../../core/api.js?v=5";

// ==========================================
// Backup & Contingency Verification Service (§ 164.308(a)(7))
// ==========================================

export async function fetchBackupStats() {
    return await api("/backup/stats");
}

export async function fetchLatestBackup() {
    return await api("/backup/latest");
}

export async function fetchBackupsList(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/backup/list${query ? "?" + query : ""}`);
}

export async function triggerBackup(type = 'manual_on_demand') {
    return await api("/backup/create", {
        method: "POST",
        body: JSON.stringify({ type })
    });
}

export async function verifyBackupIntegrity(id) {
    return await api("/backup/verify", {
        method: "POST",
        body: JSON.stringify({ id })
    });
}

export async function fetchDrillsList(filters = {}) {
    const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await api(`/backup/drills${query ? "?" + query : ""}`);
}

export async function logDisasterRecoveryDrill(data) {
    return await api("/backup/drills", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export function getBackupsExportUrl() {
    return `${API_URL}/backup/export/backups`;
}

export function getDrillsExportUrl() {
    return `${API_URL}/backup/export/drills`;
}
