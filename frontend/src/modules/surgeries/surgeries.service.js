import { api } from "../../core/api.js?v=5";

const query = (filters) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
    return q ? `?${q}` : "";
};

/** Active surgery types (also the patient chart's past-surgery picker). */
export async function fetchSurgeries()
{
    return await api("/surgeries");
}

/** filters: specialization_id?, include_inactive?, q? */
export async function fetchSurgeryCatalog(filters = {})
{
    return await api(`/surgeries${query(filters)}`);
}

/** One surgery type with its preference card. */
export async function fetchSurgery(id)
{
    return await api(`/surgeries/show${query({ id })}`);
}

/** Specializations, categories, anesthesia types, wound classes, Drug Catalog items. */
export async function fetchSurgeryOptions()
{
    return await api("/surgeries/options");
}

export async function createSurgery(data)
{
    return await api("/surgeries", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSurgery(id, data)
{
    return await api("/surgeries", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteSurgery(id)
{
    return await api("/surgeries", { method: "DELETE", body: JSON.stringify({ id }) });
}
