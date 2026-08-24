import { api } from "../../core/api.js?v=5";

export async function fetchDashboardStats()
{
    return await api("/dashboard/stats");
}
