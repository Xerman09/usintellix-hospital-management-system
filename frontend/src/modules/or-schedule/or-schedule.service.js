import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** filters: start, days (1 | 7), suite_id?, specialization_id?, surgeon_user_id? */
export const fetchOrSchedule = (filters) => api(`/or-schedule${query(filters)}`);
export const fetchOrCase = (id) => api(`/or-schedule/case${query({ id })}`);
/** Specializations, surgeries, doctors (with specializations), staff. */
export const fetchOrOptions = () => api("/or-management/options");
export const fetchOrSuites = () => api("/or-management/suites");
export const checkOrBooking = (proposal) => post("/or-schedule/check", proposal);
export const bookOrRequest = (data) => post("/or-schedule/book", data);
export const rescheduleOrCase = (data) => post("/or-schedule/reschedule", data);
export const cancelOrCase = (id, reason, returnRequest) => post("/or-schedule/cancel", { id, reason, return_request: returnRequest ? 1 : 0 });
export const fetchOrBlocks = () => api("/or-schedule/blocks");
export const saveOrBlock = (data) => post("/or-schedule/blocks", data);
export const removeOrBlock = (id) => post("/or-schedule/blocks/remove", { id });
export const setOrTurnover = (id, minutes) => post("/or-schedule/turnover", { id, turnover_minutes: minutes });
