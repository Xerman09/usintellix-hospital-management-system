import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** Routes, dose units, frequencies (with default times). */
export const fetchOrderOptions = () => api("/med-orders/options");
export const searchOrderDrugs = (q) => api(`/med-orders/drugs${query({ q })}`);
/** Allergy / duplicate checks for a medicine before ordering. */
export const checkOrder = (admissionId, drugId) => post("/med-orders/check", { admission_id: admissionId, drug_id: drugId });
export const createOrder = (data) => post("/med-orders", data);
export const fetchAdmissionOrders = (admissionId) => api(`/med-orders/admission${query({ admission_id: admissionId })}`);
export const fetchPatientOrders = (patientId) => api(`/med-orders/patient${query({ patient_id: patientId })}`);
export const fetchVerificationQueue = () => api("/med-orders/queue");
/** data: note?, acknowledge?, override_reason? */
export const verifyOrder = (id, data = {}) => post("/med-orders/verify", { id, ...data });
export const rejectOrder = (id, reason) => post("/med-orders/reject", { id, reason });
export const discontinueOrder = (id, reason) => post("/med-orders/discontinue", { id, reason });
