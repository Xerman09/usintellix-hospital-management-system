import { api } from '../../core/api.js?v=10';

/**
 * Fetch live whiteboard census data (wards, beds, KPIs, recent transfers)
 */
export async function fetchWhiteboard(filters = {}) {
    const params = new URLSearchParams();
    if (filters.ward_code && filters.ward_code !== 'all') params.set('ward_code', filters.ward_code);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const qs = params.toString();
    return await api(`/inpatient-admissions/whiteboard${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch all hospital wards
 */
export async function fetchWards() {
    return await api('/inpatient-admissions/wards');
}

/**
 * Fetch hospital beds with optional ward or status filters
 */
export async function fetchBeds(wardId = null, status = null) {
    const params = new URLSearchParams();
    if (wardId) params.set('ward_id', wardId);
    if (status) params.set('status', status);

    const qs = params.toString();
    return await api(`/inpatient-admissions/beds${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch detailed admission record by admission ID
 */
export async function fetchAdmissionDetails(id) {
    return await api(`/inpatient-admissions/details?id=${id}`);
}

/**
 * Admit a patient to a hospital bed
 */
export async function admitPatient(payload) {
    return await api('/inpatient-admissions/admit', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Transfer a patient to another bed/ward
 */
export async function transferPatient(payload) {
    return await api('/inpatient-admissions/transfer', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Mark an admitted patient as Pending Discharge
 */
export async function markPendingDischarge(admissionId, notes = '') {
    return await api('/inpatient-admissions/pending-discharge', {
        method: 'POST',
        body: JSON.stringify({
            admission_id: admissionId,
            notes: notes
        })
    });
}

/**
 * Complete patient discharge
 */
export async function dischargePatient(payload) {
    return await api('/inpatient-admissions/discharge', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Update bed operational status (e.g., Housekeeping sanitization sign-off)
 */
export async function updateBedStatus(bedId, status, notes = '') {
    return await api('/inpatient-admissions/beds/status', {
        method: 'POST',
        body: JSON.stringify({
            bed_id: bedId,
            status: status,
            notes: notes
        })
    });
}

/**
 * Create a new hospital ward (Admin)
 */
export async function createWard(payload) {
    return await api('/inpatient-admissions/wards', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Register a new bed (Admin)
 */
export async function createBed(payload) {
    return await api('/inpatient-admissions/beds', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Fetch clinical discharge summary (saved or pre-populated draft)
 */
export async function fetchDischargeSummary(admissionId) {
    return await api(`/inpatient-admissions/discharge-summary?admission_id=${admissionId}`);
}

/**
 * Save draft clinical discharge summary
 */
export async function saveDischargeSummaryDraft(payload) {
    return await api('/inpatient-admissions/discharge-summary/save-draft', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Finalize, electronically sign, and officially discharge the inpatient
 */
export async function finalizeDischargeSummary(payload) {
    return await api('/inpatient-admissions/discharge-summary/finalize', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Get direct print/PDF URL for discharge summary
 */
export function getDischargeSummaryPrintUrl(admissionId) {
    return `/api/inpatient-admissions/discharge-summary/print?admission_id=${admissionId}`;
}

/**
 * Accept a pending transfer handover (receiving ward nurse bedside sign-off)
 */
export async function acceptTransferHandover(payload) {
    return await api('/inpatient-admissions/transfer/accept', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Fetch transfer detail including SBAR, vitals, and dual signatures
 */
export async function fetchTransferDetail(transferId) {
    return await api(`/inpatient-admissions/transfer/detail?id=${transferId}`);
}

/**
 * Fetch transfers pending receiving ward nurse acceptance
 */
export async function fetchPendingHandovers(wardId = null) {
    const qs = wardId ? `?ward_id=${wardId}` : '';
    return await api(`/inpatient-admissions/transfer/pending${qs}`);
}




/**
 * Fetch all daily ward rounds for an admission
 */
export async function fetchDailyRounds(admissionId) {
    return await api(`/inpatient-admissions/daily-rounds?admission_id=${admissionId}`);
}

/**
 * Fetch a single daily ward round by ID
 */
export async function fetchDailyRound(id) {
    return await api(`/inpatient-admissions/daily-rounds/show?id=${id}`);
}

/**
 * Fetch daily round configuration options (trajectories, diets, activity orders)
 */
export async function fetchDailyRoundOptions() {
    return await api('/inpatient-admissions/daily-rounds/options');
}

/**
 * Save / Document a new daily doctor ward round
 */
export async function saveDailyRound(payload) {
    return await api('/inpatient-admissions/daily-rounds', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Update an existing daily ward round
 */
export async function updateDailyRound(payload) {
    return await api('/inpatient-admissions/daily-rounds/update', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Delete a daily ward round
 */
export async function deleteDailyRound(id) {
    return await api('/inpatient-admissions/daily-rounds/delete', {
        method: 'POST',
        body: JSON.stringify({ id })
    });
}
