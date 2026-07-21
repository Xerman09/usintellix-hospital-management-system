import { api } from "../../core/api.js";


export async function login(subdomain,username,password)
{
    return await api(
        "/login",
        {
            method:"POST",

            body:JSON.stringify({
                subdomain,
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