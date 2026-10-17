import { api } from "../../core/api.js?v=10";

export async function fetchRoles()
{
    return await api("/roles");
}

export async function createRole(data)
{
    return await api(
        "/roles",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function updateRole(id, data)
{
    return await api(
        "/roles",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function deleteRole(id)
{
    return await api(
        "/roles",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}

export async function fetchPermissionsMatrix()
{
    return await api("/roles/permissions");
}

export async function fetchRolePermissions(roleId)
{
    return await api(`/roles/role-permissions?role_id=${encodeURIComponent(roleId)}`);
}

export async function saveRolePermissions(roleId, capabilities)
{
    return await api(
        "/roles/permissions",
        {
            method: "PUT",
            body: JSON.stringify({ role_id: roleId, capabilities })
        }
    );
}

export async function fetchUserPermissions()
{
    return await api("/user/permissions");
}
