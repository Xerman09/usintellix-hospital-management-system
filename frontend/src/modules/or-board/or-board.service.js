import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

export const fetchOrBoard = (date) => api(`/or-live/board${query({ date })}`);
/** The case record: stages, WHO checklist, intra-op record, options. */
export const fetchOrRecord = (id) => api(`/or-live/case${query({ id })}`);
/** data: id, stage (the next one), at?, pacu_bed_no?, pacu_aldrete_score?, postop_disposition? */
export const moveOrStage = (data) => post("/or-live/stage", data);
export const undoOrStage = (id, reason) => post("/or-live/stage/undo", { id, reason });
export const cancelOrCaseLive = (id, reason) => post("/or-live/stage", { id, stage: "Cancelled", cancellation_reason: reason });
export const setOrDelay = (id, reason) => post("/or-live/delay", { id, reason });
export const saveOrChecklist = (id, phase, answers, notes) => post("/or-live/checklist", { id, phase, answers, notes });
export const saveOrTimes = (data) => post("/or-live/times", data);
export const addOrVitals = (data) => post("/or-live/vitals", data);
export const removeOrVitals = (id) => post("/or-live/vitals/remove", { id });
export const fetchOrStock = (warehouseId, q) => api(`/or-live/stock${query({ warehouse_id: warehouseId, q })}`);
export const addOrItem = (data) => post("/or-live/items", data);
export const voidOrItem = (id, reason) => post("/or-live/items/void", { id, reason });
export const addOrSpecimen = (data) => post("/or-live/specimens", data);
export const removeOrSpecimen = (id) => post("/or-live/specimens/remove", { id });
/** Room status, e.g. Available once cleaning is done (OR Management's endpoint). */
export const setOrSuiteStatus = (suiteId, status) => post("/or-management/suites/status", { suite_id: suiteId, status });
/* Post-op (Phase 5) */
export const addOrPacu = (data) => post("/or-live/pacu", data);
export const removeOrPacu = (id) => post("/or-live/pacu/remove", { id });
/** data: id, destination (bed | home | facility), bed_id?, facility?, override_reason?, notes?, at? */
export const releaseOrCase = (data) => post("/or-live/release", data);
export const saveOrReport = (data) => post("/or-live/report", data);
export const signOrReport = (data) => post("/or-live/report/sign", data);
export const addOrAddendum = (id, body) => post("/or-live/report/addendum", { id, body });
export const fetchOrReportPrint = (id) => api(`/or-live/report/print${query({ id })}`);
/* Charges (Phase 6) */
/** data: id (case), lines [{charge_type, item_id?, description, quantity, unit_price, provider_user_id?}], discount_type?, discount_id_no?, discount_rate?, discount_reason? */
export const postOrCharges = (data) => post("/or-live/charges", data);
export const voidOrCharge = (id, reason) => post("/or-live/charges/void", { id, reason });
