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