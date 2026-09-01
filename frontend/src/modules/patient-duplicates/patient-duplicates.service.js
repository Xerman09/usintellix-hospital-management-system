import { api } from "../../core/api.js?v=5";

export async function fetchDuplicateGroups()
{
    return await api("/patient-duplicates");
}

export async function dismissDuplicateGroup(groupKey)
{
    return await api(
        "/patient-duplicates/dismiss",
        {
            method: "POST",
            body: JSON.stringify({ group_key: groupKey })
        }
    );
}
