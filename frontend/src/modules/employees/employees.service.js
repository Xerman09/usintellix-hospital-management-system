import { api } from "../../core/api.js?v=5";

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

export async function fetchEmployeesByRole(role)
{
    return await api(`/employees?role=${encodeURIComponent(role)}`);
}
