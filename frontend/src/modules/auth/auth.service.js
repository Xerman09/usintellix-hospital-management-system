import { api } from "../../core/api.js";


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