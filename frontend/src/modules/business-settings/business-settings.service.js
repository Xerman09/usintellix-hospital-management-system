import { api } from "../../core/api.js?v=5";

export async function fetchBusinessSettings()
{
    return await api("/business-settings");
}

export async function updateBusinessSettings(data)
{
    return await api(
        "/business-settings",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}

export async function uploadBusinessLogo(file)
{
    const formData = new FormData();
    formData.append("logo", file);

    return await api(
        "/business-settings/logo",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function removeBusinessLogo()
{
    return await api(
        "/business-settings/logo",
        {
            method: "DELETE"
        }
    );
}
