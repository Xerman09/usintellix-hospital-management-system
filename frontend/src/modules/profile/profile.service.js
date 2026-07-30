import { api } from "../../core/api.js";

export async function fetchProfile()
{
    return await api("/profile");
}

export async function updateProfile(data)
{
    return await api(
        "/profile",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}

export async function changePassword(data)
{
    return await api(
        "/profile/password",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}

export async function uploadAvatar(file)
{
    const formData = new FormData();
    formData.append("avatar", file);

    return await api(
        "/profile/avatar",
        {
            method: "POST",
            headers: {},
            body: formData
        }
    );
}

export async function removeAvatar()
{
    return await api(
        "/profile/avatar",
        {
            method: "DELETE"
        }
    );
}
