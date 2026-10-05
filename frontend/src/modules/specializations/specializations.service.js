import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

/** filters: include_inactive?, category? -> {rows, categories} */
export async function fetchSpecializations(filters = {}) {
    return api(`/specializations${query(filters)}`);
}

export async function saveSpecialization(data) {
    return api("/specializations", { method: data.id ? "PUT" : "POST", body: JSON.stringify(data) });
}

export async function setSpecializationActive(id, isActive) {
    return api("/specializations/active", { method: "POST", body: JSON.stringify({ id, is_active: isActive ? 1 : 0 }) });
}
