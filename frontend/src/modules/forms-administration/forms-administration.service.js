import { api } from "../../core/api.js?v=5";

export async function fetchFormDefinitions()
{
    return await api("/form-definitions");
}

export async function saveFormDefinitions(rows)
{
    return await api(
        "/form-definitions",
        {
            method: "PUT",
            body: JSON.stringify({ rows })
        }
    );
}
