import { API_URL } from "./api-url.js?v=2";

export function saveUser(user)
{
    sessionStorage.setItem(
        "user",
        JSON.stringify(user)
    );
}


export function getUser()
{
    const user =
        sessionStorage.getItem("user");


    return user
        ? JSON.parse(user)
        : null;
}


export function clearSession()
{
    sessionStorage.removeItem("user");
}


export function isAuthenticated()
{
    return getUser() !== null;
}

export async function syncSessionUser()
{
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        if (res.ok) {
            const json = await res.json();
            if (json && json.success && json.data?.user) {
                saveUser(json.data.user);
                return json.data.user;
            }
        } else if (res.status === 401) {
            clearSession();
            return null;
        }
    } catch (e) {
        // Network or offline, fallback to existing local storage
    }
    return getUser();
}