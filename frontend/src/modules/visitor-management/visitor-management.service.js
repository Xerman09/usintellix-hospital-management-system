import { api } from "../../core/api.js?v=10";

/**
 * Fetch all visitor passes with optional filters.
 */
export async function fetchVisitorPasses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.ward_id) params.set("ward_id", filters.ward_id);
    if (filters.admission_id) params.set("admission_id", filters.admission_id);
    if (filters.date) params.set("date", filters.date);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/visitor-passes${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch live active visitors feed.
 */
export async function fetchActiveVisitors(filters = {}) {
    const params = new URLSearchParams();
    if (filters.ward_id) params.set("ward_id", filters.ward_id);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString();
    return await api(`/visitor-passes/active${qs ? `?${qs}` : ""}`);
}

/**
 * Fetch visitor dashboard KPIs and ward distribution.
 */
export async function fetchVisitorStats() {
    return await api("/visitor-passes/stats");
}

/**
 * Fetch active admitted patients for the pass-issuance modal.
 */
export async function fetchAdmissionsOptions(search = "") {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const qs = params.toString();
    return await api(`/visitor-passes/admissions-options${qs ? `?${qs}` : ""}`);
}

/**
 * Issue a new hospital visitor pass.
 */
export async function issueVisitorPass(data) {
    return await api("/visitor-passes/issue", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

/**
 * Check-out a visitor pass by ID or barcode/pass number.
 */
export async function checkOutVisitorPass(identifier) {
    return await api("/visitor-passes/check-out", {
        method: "POST",
        body: JSON.stringify({ pass_id: identifier, barcode: identifier })
    });
}

/**
 * Scan & verify visitor barcode at security checkpoint.
 */
export async function verifyVisitorBarcode(barcode) {
    return await api("/visitor-passes/verify", {
        method: "POST",
        body: JSON.stringify({ barcode: barcode })
    });
}

/**
 * Revoke a visitor pass.
 */
export async function revokeVisitorPass(passId, reason) {
    return await api("/visitor-passes/revoke", {
        method: "POST",
        body: JSON.stringify({ pass_id: passId, reason: reason })
    });
}

/**
 * Open thermal badge printing window.
 */
export function openBadgePrintWindow(passId) {
    const url = `/api/visitor-passes/badge?pass_id=${passId}`;
    const win = window.open(url, "VisitorBadgePrint", "width=450,height=550,resizable=yes,scrollbars=yes");
    if (win) {
        win.focus();
    }
}
