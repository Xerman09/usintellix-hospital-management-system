import { api } from "../../core/api.js";

export async function registerCompany(data)
{
    return await api(
        "/tenants/register",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}
