import { api } from "../../core/api.js?v=5";


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