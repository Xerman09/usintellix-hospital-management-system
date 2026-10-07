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

/* ---- restocking ---- */
/** The pharmacy's queue: requests waiting to be filled, and those on the way. */
export const fetchRestockQueue = () => api("/ward-cabinet/restock-queue");
/** quantities: {item_id: qty} (0 = leave out) */
export const fillRestock = (id, quantities, sentVia = "") => post("/ward-cabinet/restock/fill", { id, quantities, sent_via: sentVia });
/** lots: [{id, quantity_received, short_reason?, short_notes?}] -- left out = arrived in full */
export const receiveRestock = (id, lots = [], notes = "") => post("/ward-cabinet/restock/receive", { id, lots, notes });
export const flagRestockUrgent = (id, reason) => post("/ward-cabinet/restock/urgent", { id, reason });
export const requestRestockNow = (wardId, urgent = false, reason = "") => post("/ward-cabinet/restock/request", { ward_id: wardId, urgent: urgent ? 1 : 0, reason });
