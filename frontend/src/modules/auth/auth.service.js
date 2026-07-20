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