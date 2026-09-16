// Small "recently viewed" tracker, same one-concern-per-tiny-core-file
// convention as pending-patient-view.js/pending-finder-search.js. Hooked
// into openPatientChartTab() (patients-list.js) -- the single real
// chokepoint every "open this patient's chart" action across the whole
// app already funnels through -- so it captures every entry point
// (Finder, Patient List, Flow board, Calendar, etc.) without needing to
// be called from each one individually.
const STORAGE_KEY = "recentlyViewedPatients";
const MAX_ENTRIES = 10;

export function recordRecentPatient(patient)
{
    if (!patient || !patient.id) return;

    let list = getRecentPatients().filter((p) => p.id !== patient.id);

    list.unshift({
        id: patient.id,
        patient_no: patient.patient_no,
        first_name: patient.first_name,
        middle_name: patient.middle_name,
        last_name: patient.last_name,
        suffix: patient.suffix,
        birthdate: patient.birthdate,
        contact_home_phone: patient.contact_home_phone,
        viewed_at: new Date().toISOString()
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
}

export function getRecentPatients()
{
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}
