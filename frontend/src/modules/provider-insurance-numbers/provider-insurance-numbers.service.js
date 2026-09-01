import { api } from "../../core/api.js?v=5";

export async function fetchProviderInsuranceNumbers()
{
    return await api("/provider-insurance-numbers");
}

export async function updateProviderInsuranceNumbers(providerId, data)
{
    return await api(
        "/provider-insurance-numbers",
        {
            method: "PUT",
            body: JSON.stringify({ provider_id: providerId, ...data })
        }
    );
}
