import { api } from "../../core/api.js";

export async function createPatient(data)
{
    return await api(
        "/patients",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}
