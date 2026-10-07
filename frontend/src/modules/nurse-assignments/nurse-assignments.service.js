import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** filters: ward_id?, date?, shift_id? (default: my main ward, the shift running now) */
export const fetchAssignmentBoard = (filters = {}) => api(`/nurse-assignments${query(filters)}`);
/** data: ward_id, date, shift_id, rows: [{admission_id, nurse_user_id, cna_user_id}] */
export const saveAssignments = (data) => post("/nurse-assignments", data);
export const copyPreviousShift = (data) => post("/nurse-assignments/copy-previous", data);
export const fetchMyPatients = () => api("/nurse-assignments/mine");
/** Ward / bed, nurse and CNA this shift and next, latest hand-over (null when not admitted). */
export const fetchPatientNursing = (patientId) => api(`/nurse-assignments/patient${query({ patient_id: patientId })}`);
export const fetchHandovers = (admissionId) => api(`/nurse-assignments/handovers${query({ admission_id: admissionId })}`);
/** data: admission_id, date, shift_id, situation, background?, assessment?, recommendation? */
export const writeHandover = (data) => post("/nurse-assignments/handovers", data);
export const receiveHandover = (id) => post("/nurse-assignments/handovers/receive", { id });
