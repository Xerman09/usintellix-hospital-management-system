import { clearSession } from "./session.js?v=5";
import { API_URL } from "./api-url.js?v=2";

// Worked out in core/api-url.js (session.js needs it too, and importing it from
// here would be a cycle). Re-exported because much of the app reads it from api.js.
export { API_URL };

// Endpoints where a 401 is a normal form-validation outcome (wrong
// password / wrong 2FA code), not a sign that the session died -- these
// must never trigger the auto-redirect below, or a failed login attempt
// would blow away its own error message mid-submit.
const AUTH_ENDPOINTS = ["/login", "/verify-2fa", "/resend-2fa", "/auth/expired-password"];

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

    if (response.status === 403 && (data?.code === "HIPAA_BREAK_GLASS_REQUIRED" || data?.break_glass_required)) {
        window.dispatchEvent(new CustomEvent("hipaaBreakGlassRequired", { detail: data }));
    }

    // The server now enforces must_change_password (PasswordChangeGuard), so a
    // session can be refused mid-use -- an administrator can set the flag on
    // somebody who is already signed in. Back to the sign-in screen, where the
    // forced-change step is already presented on the next successful login.
    //
    // Deliberately a round trip through login rather than opening the
    // forced-change form here: that form lives in the login view, and a
    // password change should start from a fresh authentication anyway.
    const passwordChangeRequired = response.status === 403
        && (data?.code === "PASSWORD_CHANGE_REQUIRED" || data?.password_change_required);

    if (sessionExpired || databaseUnreachable || passwordChangeRequired) {
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