import { api } from "../../core/api.js?v=10";

export async function fetchDashboardStats()
{
    return await api("/dashboard/stats");
}
