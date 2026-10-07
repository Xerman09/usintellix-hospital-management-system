import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** One ward's inpatients with their latest vitals and what is due. */
export const fetchVitalsBoard = (wardId) => api(`/inpatient-vitals${query({ ward_id: wardId })}`);
/** The chart widget (null when the patient is not admitted). */
export const fetchPatientVitals = (patientId) => api(`/inpatient-vitals/patient${query({ patient_id: patientId })}`);
/** hours: 24 / 72 / 168 / 0 = whole stay */
export const fetchVitalsHistory = (admissionId, hours = 72) => api(`/inpatient-vitals/history${query({ admission_id: admissionId, hours })}`);
export const recordVitals = (data) => post("/inpatient-vitals", data);
export const voidVitals = (id, reason) => post("/inpatient-vitals/void", { id, reason });
/** Doctors / admins: 1 = standard, 2 = prescribed 88-92% target. */
export const setSpo2Scale = (admissionId, scale, reason) => post("/inpatient-vitals/scale", { admission_id: admissionId, spo2_scale: scale, reason });
export const setVitalsSchedule = (admissionId, everyHours, reason) => post("/inpatient-vitals/schedule", { admission_id: admissionId, every_hours: everyHours, reason });
