import { api } from "../../core/api.js";

export async function fetchProcedureOrderConfigs()
{
    return await api("/procedure-order-configs");
}

export async function createProcedureOrderConfig(data)
{
    return await api(
        "/procedure-order-configs",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateProcedureOrderConfig(id, data)
{
    return await api(
        "/procedure-order-configs",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteProcedureOrderConfig(id)
{
    return await api(
        "/procedure-order-configs",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
