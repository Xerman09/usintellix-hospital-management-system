import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return q ? `?${q}` : "";
};

/** filters: ward_id ('none' = no ward yet), role, q */
export const fetchNursingStaff = (filters = {}) => api(`/nursing-staff${query(filters)}`);
/** data: user_id, ward_ids[], primary_ward_id? */
export const saveNurseWards = (data) => api("/nursing-staff/wards", { method: "POST", body: JSON.stringify(data) });
export const fetchNurseWardHistory = (userId) => api(`/nursing-staff/history${query({ user_id: userId })}`);
/** The signed-in person's role and wards. */
export const fetchMyWards = () => api("/nursing-staff/mine");
