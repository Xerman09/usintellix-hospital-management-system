import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** The current shift's medicine round. wardId: a ward id, or "mine" (my patients this shift). */
export const fetchMarBoard = (wardId = "") => api(`/mar/board${query({ ward_id: wardId })}`);
/** One patient's MAR for a shift (default: the shift running now). */
export const fetchMar = (admissionId, date = "", shiftId = "") => api(`/mar/admission${query({ admission_id: admissionId, date, shift_id: shiftId })}`);
/** data: order_id, scheduled_at?, given_at?, reason?, note?, witness_username?, witness_password? */
export const giveDose = (data) => post("/mar/give", data);
/** data: order_id, scheduled_at, reason, note? */
export const holdDose = (data) => post("/mar/hold", data);
export const refuseDose = (data) => post("/mar/refuse", data);
export const voidDose = (id, reason) => post("/mar/void", { id, reason });
/** Pain score 30-60 min after an as-needed pain dose. */
export const recheckPain = (id, painScore, note = "") => post("/mar/recheck", { id, pain_score: painScore, note });
/** filters: from?, to?, ward?, drug_id? */
export const fetchDdRegister = (filters = {}) => api(`/dd-register${query(filters)}`);
