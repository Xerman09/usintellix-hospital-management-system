import { api } from "../../core/api.js?v=10";

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

export async function updateEmployee(id, data)
{
    return await api(
        "/employees",
        {
            method:"PUT",
            body:JSON.stringify({ id, ...data })
        }
    );
}

export async function fetchEmployees()
{
    return await api("/employees");
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

export async function unlockEmployee(userId)
{
    return await api(
        "/employees/unlock",
        {
            method: "POST",
            body: JSON.stringify({ user_id: userId })
        }
    );
}

export async function updateEmployeeStatus(userId, status, reason = null)
{
    return await api(
        "/employees/status",
        {
            method: "POST",
            body: JSON.stringify({ user_id: userId, status, reason })
        }
    );
}

export async function fetchEmployeeSessions(userId)
{
    return await api(`/employees/sessions?user_id=${encodeURIComponent(userId)}`);
}

export async function revokeSession(sessionId, reason = null)
{
    return await api(
        "/employees/sessions/revoke",
        {
            method: "POST",
            body: JSON.stringify({ session_id: sessionId, reason })
        }
    );
}

export async function revokeAllSessions(userId, reason = null)
{
    return await api(
        "/employees/sessions/revoke-all",
        {
            method: "POST",
            body: JSON.stringify({ user_id: userId, reason })
        }
    );
}

