import { api } from "../../core/api.js?v=5";

export async function fetchGeneralSettings()
{
    return await api("/general-settings");
}

export async function fetchTimezones()
{
    return await api("/general-settings/timezones");
}

export async function updateTimezone(timezone)
{
    return await api(
        "/general-settings/timezone",
        {
            method: "PUT",
            body: JSON.stringify({ timezone })
        }
    );
}

export async function fetchApprovalLimits()
{
    return await api("/approval-limits");
}

export async function updateApprovalLimits(limits)
{
    return await api(
        "/approval-limits",
        {
            method: "PUT",
            body: JSON.stringify({ limits })
        }
    );
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
