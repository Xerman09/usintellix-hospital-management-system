import { api } from '../../core/api.js?v=5';

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
