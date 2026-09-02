import { api } from "../../core/api.js?v=5";

export async function fetchAclOverview()
{
    return await api("/acl-groups/overview");
}

export async function fetchAclMemberships(userId)
{
    const query = new URLSearchParams({ user_id: userId }).toString();

    return await api(`/acl-groups/memberships?${query}`);
}

export async function addAclMembership(userId, groupIds)
{
    return await api(
        "/acl-groups/memberships/add",
        {
            method: "POST",
            body: JSON.stringify({ user_id: userId, group_ids: groupIds })
        }
    );
}

export async function removeAclMembership(userId, groupIds)
{
    return await api(
        "/acl-groups/memberships/remove",
        {
            method: "POST",
            body: JSON.stringify({ user_id: userId, group_ids: groupIds })
        }
    );
}
