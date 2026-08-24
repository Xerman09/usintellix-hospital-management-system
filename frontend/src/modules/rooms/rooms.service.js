import { api } from "../../core/api.js?v=5";

export async function fetchRooms()
{
    return await api("/rooms");
}
