import { api } from "../../core/api.js";

export async function createEmployee(data)
{
    return await api(
        "/employees",
        {
            method:"POST",
            body:JSON.stringify(data)
        }
    );
}

export async function fetchRoles()
{
    return await api("/roles");
}

export async function fetchDepartments()
{
    return await api("/departments");
}
