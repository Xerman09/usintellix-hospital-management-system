import { api } from "../../core/api.js";

export async function fetchRooms()
{
    return await api("/rooms");
}
