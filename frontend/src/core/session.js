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
        const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        let baseUrl = "https://ihs.dm3system.com/backend/public";
        if (isLocalHost) {
            const frontendMarker = "/frontend";
            const path = window.location.pathname;
            const markerIndex = path.indexOf(frontendMarker);
            const projectBase = markerIndex !== -1 ? path.slice(0, markerIndex) : "";
            baseUrl = `${window.location.origin}${projectBase}/backend/public`;
        }

        const res = await fetch(`${baseUrl}/auth/me`, {
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