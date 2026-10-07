import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** One ward's cabinet: stock, doses that can be taken out now, what's taken and not given, activity. */
export const fetchCabinet = (wardId = "") => api(`/ward-cabinet${query({ ward_id: wardId })}`);
/** data: order_id, slot_at?, quantity?, note? */
export const withdrawDose = (data) => post("/ward-cabinet/withdraw", data);
export const returnWithdrawal = (id, reason = "") => post("/ward-cabinet/return", { id, reason });
/** data: reason, witness_username?, witness_password? */
export const wasteWithdrawal = (id, data) => post("/ward-cabinet/waste", { id, ...data });
/** levels: [{drug_id, min_level, max_level}] */
export const saveCabinetLevels = (wardId, levels) => post("/ward-cabinet/levels", { ward_id: wardId, levels });
