import { showToast } from "../../core/toast.js";
import { fetchAclOverview, fetchAclMemberships, addAclMembership, removeAclMembership } from "./acl-groups.service.js";

let users = [];
let selectedUserId = null;

export async function initAclGroups()
{
    document.getElementById("aclRemoveBtn").addEventListener("click", handleRemove);
    document.getElementById("aclAddBtn").addEventListener("click", handleAdd);
    document.getElementById("aclActiveList").addEventListener("change", updateMoveButtonState);
    document.getElementById("aclInactiveList").addEventListener("change", updateMoveButtonState);

    await loadOverview();
}

async function loadOverview()
{
    const userListEl = document.getElementById("aclUserList");

    const result = await fetchAclOverview();

    if (!result.success) {
        userListEl.innerHTML = `<div class="acl-loading">${escapeHtml(result.message || "Failed to load ACL data.")}</div>`;
        return;
    }

    users = result.data.users || [];
    renderUserList();

    if (users.length) {
        await selectUser(users[0].id);
    }
}

function renderUserList()
{
    const userListEl = document.getElementById("aclUserList");

    if (!users.length) {
        userListEl.innerHTML = `<div class="acl-loading">No users found.</div>`;
        return;
    }

    userListEl.innerHTML = users.map((user) => `
        <div class="acl-user-row">
            <a class="acl-user-link ${user.id === selectedUserId ? "active" : ""}" data-user-id="${user.id}">${escapeHtml(user.username)}</a>
            <span class="acl-edit-icon" data-user-id="${user.id}" title="Edit memberships">&#9998;</span>
        </div>
    `).join("");

    userListEl.querySelectorAll("[data-user-id]").forEach((el) => {
        el.addEventListener("click", () => selectUser(Number(el.dataset.userId)));
    });
}

async function selectUser(userId)
{
    selectedUserId = userId;
    renderUserList();

    const user = users.find((u) => u.id === userId);
    const selectedEl = document.getElementById("aclSelectedUser");

    selectedEl.innerHTML = user
        ? `${escapeHtml(user.username)}${user.is_inactive ? '<span class="acl-inactive-icon" title="Inactive user account">&#128683;</span>' : ""}`
        : "Select a user below";

    document.getElementById("aclAlert").innerHTML = "";

    const activeList = document.getElementById("aclActiveList");
    const inactiveList = document.getElementById("aclInactiveList");
    activeList.innerHTML = `<option disabled>Loading...</option>`;
    inactiveList.innerHTML = "";

    const result = await fetchAclMemberships(userId);

    if (!result.success) {
        activeList.innerHTML = "";
        showToast(result.message || "Failed to load memberships.", "error");
        return;
    }

    renderLists(result.data.active || [], result.data.inactive || []);
}

function renderLists(active, inactive)
{
    const activeList = document.getElementById("aclActiveList");
    const inactiveList = document.getElementById("aclInactiveList");

    activeList.innerHTML = active.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
    inactiveList.innerHTML = inactive.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");

    updateMoveButtonState();
}

function updateMoveButtonState()
{
    const activeSelected = [...document.getElementById("aclActiveList").selectedOptions];
    const inactiveSelected = [...document.getElementById("aclInactiveList").selectedOptions];

    document.getElementById("aclRemoveBtn").disabled = activeSelected.length === 0;
    document.getElementById("aclAddBtn").disabled = inactiveSelected.length === 0;
}

async function handleRemove()
{
    if (!selectedUserId) return;

    const groupIds = [...document.getElementById("aclActiveList").selectedOptions].map((o) => Number(o.value));

    if (!groupIds.length) return;

    await runMutation(removeAclMembership, groupIds);
}

async function handleAdd()
{
    if (!selectedUserId) return;

    const groupIds = [...document.getElementById("aclInactiveList").selectedOptions].map((o) => Number(o.value));

    if (!groupIds.length) return;

    await runMutation(addAclMembership, groupIds);
}

async function runMutation(mutationFn, groupIds)
{
    const removeBtn = document.getElementById("aclRemoveBtn");
    const addBtn = document.getElementById("aclAddBtn");
    removeBtn.disabled = true;
    addBtn.disabled = true;

    const result = await mutationFn(selectedUserId, groupIds);

    if (!result.success) {
        document.getElementById("aclAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to update memberships.")}</div>`;
        updateMoveButtonState();
        return;
    }

    showToast(result.message, "success");

    const membershipResult = await fetchAclMemberships(selectedUserId);

    if (membershipResult.success) {
        renderLists(membershipResult.data.active || [], membershipResult.data.inactive || []);
    }
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
