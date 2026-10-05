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
