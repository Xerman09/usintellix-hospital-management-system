import { clearSession } from "./session.js";

export const API_URL = "https://ihs.dm3system.com/backend/public";

// Endpoints where a 401 is a normal form-validation outcome (wrong
// password / wrong 2FA code), not a sign that the session died -- these
// must never trigger the auto-redirect below, or a failed login attempt
// would blow away its own error message mid-submit.
const AUTH_ENDPOINTS = ["/login", "/verify-2fa"];

// Guards against a burst of concurrent requests (e.g. a Promise.all)
// all hitting 401 at once and triggering the redirect several times.
// Cleared on the next navigation so the guard doesn't stay latched
// forever after just one use -- without this, a second session expiry
// later in the same tab (after logging back in) would silently never
// redirect again.
let redirectingToLogin = false;

window.addEventListener("hashchange", () => {
    redirectingToLogin = false;
});

export async function api(endpoint, options = {})
{
    let response;

    try {
        response = await fetch(
            API_URL + endpoint,
            {
                credentials: "include",

                headers:{
                    "Content-Type":"application/json"
                },

                ...options
            }
        );
    } catch (error) {
        return {
            success: false,
            message: "Unable to reach the server. Please check your connection and try again."
        };
    }

    let data;

    try {
        data = await response.json();
    } catch (error) {
        return {
            success: false,
            message: `Unexpected server response (HTTP ${response.status}).`
        };
    }

    const sessionExpired = response.status === 401 && !AUTH_ENDPOINTS.includes(endpoint);
    const databaseUnreachable = response.status === 500 && typeof data?.message === "string"
        && data.message.startsWith("Database Connection Failed");

    if (sessionExpired || databaseUnreachable) {
        redirectToLogin();
    }

    return data;
}

function redirectToLogin()
{
    if (redirectingToLogin || window.location.hash.startsWith("#/login")) {
        return;
    }

    redirectingToLogin = true;

    clearSession();
    window.location.hash = "#/login";
}