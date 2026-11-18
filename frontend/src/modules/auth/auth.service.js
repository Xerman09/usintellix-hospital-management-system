import { api } from "../../core/api.js?v=10";


export async function login(username,password)
{
    return await api(
        "/login",
        {
            method:"POST",

            body:JSON.stringify({
                username,
                password
            })
        }
    );
}


export async function logout()
{
    return await api(
        "/logout",
        {
            method:"POST"
        }
    );
}


export async function verifyTwoFactor(code)
{
    return await api(
        "/verify-2fa",
        {
            method:"POST",

            body:JSON.stringify({
                code
            })
        }
    );
}


export async function resendTwoFactor()
{
    return await api(
        "/resend-2fa",
        {
            method:"POST"
        }
    );
}


export async function completeFirstLogin(data)
{
    return await api(
        "/auth/first-login",
        {
            method:"PUT",
            body:JSON.stringify(data)
        }
    );
}

export async function updateExpiredPassword(data)
{
    return await api(
        "/auth/expired-password",
        {
            method:"PUT",
            body:JSON.stringify(data)
        }
    );
}

export async function acknowledgeNpp(data)
{
    return await api(
        "/auth/npp-acknowledge",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateBreachedPassword(data)
{
    return await api(
        "/auth/breached-password",
        {
            method: "PUT",
            body: JSON.stringify(data)
        }
    );
}

export async function checkPasswordBreach(password)
{
    return await api(
        "/auth/check-password-breach",
        {
            method: "POST",
            body: JSON.stringify({ password })
        }
    );
}

/*
 * Forgot Password.
 *
 * requestPasswordReset() always resolves successfully, whatever the username
 * was -- the server answers identically for a real account, one that does not
 * exist, a suspended one and one with no address on file, so that this endpoint
 * cannot be used to find out which usernames are real. Do not add handling that
 * treats a failure as "no such user": there isn't one.
 */
export async function requestPasswordReset(username)
{
    return await api(
        "/auth/password-reset/request",
        {
            method:"POST",

            body:JSON.stringify({
                username
            })
        }
    );
}

/** Check a code without spending it, so the user is told it is wrong before typing a password twice. */
export async function verifyPasswordResetCode(username,code)
{
    return await api(
        "/auth/password-reset/verify",
        {
            method:"POST",

            body:JSON.stringify({
                username,
                code
            })
        }
    );
}

/** Spend the code and set the new password. */
export async function completePasswordReset(username,code,password)
{
    return await api(
        "/auth/password-reset/complete",
        {
            method:"POST",

            body:JSON.stringify({
                username,
                code,
                password
            })
        }
    );
}
