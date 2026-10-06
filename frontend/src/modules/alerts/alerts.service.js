import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

/** Unread count, alerts waiting for an acknowledgement (pop-ups), the latest few. */
export const pollAlerts = () => api("/alerts/poll");
/** filters: status (all/unread/open/closed), urgency, type, q, page */
export const fetchAlerts = (filters = {}) => api(`/alerts${query(filters)}`);
/** With who it was for and who saw / opened / acknowledged it. */
export const fetchAlert = (id) => api(`/alerts/show${query({ id })}`);
export const fetchAlertOptions = () => api("/alerts/options");
export const markAlertsSeen = (ids) => post("/alerts/seen", { ids });
export const markAlertRead = (id) => post("/alerts/read", { id });
export const markAllAlertsRead = () => post("/alerts/read-all", {});
export const acknowledgeAlert = (id, note = "") => post("/alerts/acknowledge", { id, note });
/** data: urgency, title, body?, patient_id?, targets: [{type: user|role|department|everyone, id?, role?}], requires_ack? */
export const sendAlert = (data) => post("/alerts/send", data);

/* Admin (Phase 2): escalation chains and the alert log report. */
export const fetchEscalation = () => api("/alerts/escalation");
/** data: alert_type ('*' = default), applies_to (critical|urgent), is_active, steps: [{wait_minutes, target_type, target_id?, target_role?}] */
export const saveEscalation = (data) => post("/alerts/escalation", data);
export const removeEscalation = (alertType) => post("/alerts/escalation/remove", { alert_type: alertType });
/** filters: from, to, type, urgency */
export const fetchAlertReport = (filters = {}) => api(`/alerts/report${query(filters)}`);
