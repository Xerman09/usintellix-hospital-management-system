import { api } from "../../core/api.js";

export async function fetchDashboardStats()
{
    return await api("/dashboard/stats");
}
