import { api } from "../../core/api.js";

export async function fetchProviders()
{
    return await api("/providers");
}

export async function createProvider(data)
{
    return await api(
        "/providers",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}

export async function deleteProvider(id)
{
    return await api(
        "/providers",
        {
            method:"DELETE",
            body:JSON.stringify({ id })
        }
    );
}
