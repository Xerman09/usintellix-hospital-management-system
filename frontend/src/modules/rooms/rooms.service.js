import { api } from "../../core/api.js?v=10";

export async function fetchRooms()
{
    return await api("/rooms");
}
