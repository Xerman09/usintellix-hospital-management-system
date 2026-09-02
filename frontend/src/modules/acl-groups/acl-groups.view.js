export function AclGroupsView()
{
    return `
<style>
.acl-page {
    width: 100%;
    font-size: 13.5px;
    color: #1a2338;
}

.acl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #f4f6fa;
    border: 1px solid #d7dee8;
    border-radius: 8px 8px 0 0;
}

.acl-header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.acl-header-icons {
    display: flex;
    gap: 14px;
    color: #71809b;
}

.acl-body {
    border: 1px solid #d7dee8;
    border-top: none;
    border-radius: 0 0 8px 8px;
    padding: 16px 18px 24px;
}

.acl-mode-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid #eef1f5;
    font-weight: 600;
}

.acl-mode-row input {
    width: 16px;
    height: 16px;
}

.acl-mode-row .acl-info-icon {
    color: #1e4fd8;
    cursor: help;
}

.acl-panel {
    background: #e7ebf2;
    border-radius: 6px;
    padding: 16px 20px 20px;
}

.acl-selected-user {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #34435c;
}

.acl-inactive-icon {
    color: #71809b;
}

.acl-lists {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
}

.acl-list-col {
    display: flex;
    flex-direction: column;
}

.acl-list-col label {
    font-weight: 700;
    margin-bottom: 6px;
}

.acl-listbox {
    width: 200px;
    height: 140px;
    border: 1px solid #cfd4dc;
    border-radius: 4px;
    padding: 4px;
    background: white;
    font-size: 13px;
}

.acl-listbox option {
    padding: 3px 4px;
}

.acl-move-btns {
    display: flex;
    gap: 60px;
    margin-top: 14px;
}

.acl-move-btn {
    height: 32px;
    padding: 0 16px;
    border: 1px solid #a9c0e8;
    border-radius: 5px;
    background: #eef3fc;
    color: #1e4fd8;
    font-weight: 700;
    cursor: pointer;
}

.acl-move-btn:hover {
    background: #dce7fa;
}

.acl-move-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
}

.acl-alert {
    margin-top: 12px;
    max-width: 480px;
}

.acl-user-list {
    margin-top: 18px;
}

.acl-user-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
}

.acl-user-link {
    color: #7a3b12;
    cursor: pointer;
    font-weight: 500;
}

.acl-user-link:hover {
    text-decoration: underline;
}

.acl-user-link.active {
    font-weight: 700;
    color: #1e4fd8;
}

.acl-edit-icon {
    color: #7a3b12;
    cursor: pointer;
    font-size: 12px;
}

.acl-loading {
    color: #71809b;
    padding: 20px 0;
}
</style>

<div class="acl-page">
    <div class="acl-header">
        <h1>Access Control List Administration</h1>
        <div class="acl-header-icons">
            <span title="Open in new tab">&#8663;</span>
            <span title="Help" class="acl-info-icon">?</span>
        </div>
    </div>

    <div class="acl-body">
        <div class="acl-mode-row">
            <input type="checkbox" checked disabled title="User Memberships is currently the only available mode.">
            <span>User Memberships</span>
            <span class="acl-info-icon" title="Choose a user below to view and edit which ACL groups they belong to.">&#9432;</span>
        </div>

        <div class="acl-panel">
            <div class="acl-selected-user" id="aclSelectedUser">Select a user below</div>

            <div class="acl-lists">
                <div class="acl-list-col">
                    <label>Active</label>
                    <select multiple class="acl-listbox" id="aclActiveList"></select>
                </div>
                <div class="acl-list-col">
                    <label>Inactive</label>
                    <select multiple class="acl-listbox" id="aclInactiveList"></select>
                </div>
            </div>

            <div class="acl-move-btns">
                <button type="button" class="acl-move-btn" id="aclRemoveBtn" title="Remove selected Active group(s)" disabled>&gt;&gt;</button>
                <button type="button" class="acl-move-btn" id="aclAddBtn" title="Add selected Inactive group(s)" disabled>&lt;&lt;</button>
            </div>

            <div class="acl-alert" id="aclAlert"></div>
        </div>

        <div class="acl-user-list" id="aclUserList">
            <div class="acl-loading">Loading users...</div>
        </div>
    </div>
</div>
`;
}
