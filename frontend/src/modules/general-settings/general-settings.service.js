import { api } from "../../core/api.js?v=5";

export async function fetchGeneralSettings()
{
    return await api("/general-settings");
}

export async function updateGeneralSettings(data)
{
    return await api(
        "/general-settings",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}
