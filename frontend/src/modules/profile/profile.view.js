export function ProfileView()
{
    return `
<style>
.prof-page {
    width: 100%;
    font-size: 13.5px;
}

.prof-card {
    width: 100%;
}

.prof-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.prof-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.prof-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.prof-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.prof-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.prof-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.prof-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.prof-add-btn svg {
    width: 14px;
    height: 14px;
}

.prof-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid #dbe1ea;
    border-radius: 6px;
    background: white;
    color: #3b475a;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s, border-color .12s;
    white-space: nowrap;
}

.prof-icon-btn:hover {
    background: #f1f5f9;
    border-color: #c8d2e0;
}

.prof-icon-btn svg {
    width: 14px;
    height: 14px;
}

.profile-avatar-menu-wrap {
    position: relative;
    flex-shrink: 0;
}

.prof-avatar-dropdown {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: white;
    min-width: 170px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.14);
    border-radius: 8px;
    border: 1px solid #e5e9f0;
    z-index: 20;
    padding: 6px;
    flex-direction: column;
    gap: 2px;
}

.profile-avatar-menu-wrap.open .prof-avatar-dropdown {
    display: flex;
}

.prof-avatar-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: none;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    text-align: left;
}

.prof-avatar-dropdown-item:hover {
    background: #f3f4f6;
}

.prof-avatar-dropdown-item svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.prof-avatar-dropdown-item.danger {
    color: #b91c1c;
}

.prof-avatar-dropdown-item.danger:hover {
    background: #fef2f2;
}

@media (max-width: 640px) {
    .prof-header { flex-direction: column; align-items: stretch; }
    .prof-header-actions { justify-content: flex-end; }
}
</style>

<div class="prof-page">
    <div class="prof-card">
        <div class="prof-header">
            <div class="prof-header-title">
                <div class="profile-avatar-menu-wrap" id="avatarMenuWrap">
                    <div class="profile-avatar-wrap" id="avatarMenuTrigger" title="Change photo">
                        <div class="profile-avatar" id="profileAvatarDisplay">?</div>
                        <div class="profile-avatar-overlay">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        </div>
                    </div>
                    <div class="prof-avatar-dropdown" id="avatarDropdown">
                        <button type="button" class="prof-avatar-dropdown-item" id="chooseAvatarBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            Choose Icon
                        </button>
                        <button type="button" class="prof-avatar-dropdown-item danger" id="removeAvatarBtn" style="display:none;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                            Remove Icon
                        </button>
                    </div>
                    <input type="file" id="avatarFileInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;">
                </div>
                <div>
                    <h1 id="profileHeaderName">My Profile</h1>
                    <p class="form-subtitle" id="profileHeaderSub">View and update your account information.</p>
                </div>
            </div>
            <div class="prof-header-actions">
                <button type="button" class="prof-add-btn" id="openEditProfileModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                    Edit
                </button>
                <button type="button" class="prof-icon-btn" id="openChangePasswordModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Change Password
                </button>
            </div>
        </div>

        <div id="formAlert"></div>

        <div class="form-grid" style="margin-top: 20px;">
            <div class="form-group">
                <label>Username</label>
                <p id="ro_username">-</p>
            </div>

            <div class="form-group">
                <label>Role</label>
                <p id="ro_role">-</p>
            </div>

            <div class="form-group" id="ro_no_group" style="display:none;">
                <label id="ro_no_label">ID No.</label>
                <p id="ro_no">-</p>
            </div>

            <div class="form-group" id="ro_department_group" style="display:none;">
                <label>Department</label>
                <p id="ro_department">-</p>
            </div>

            <div class="form-group">
                <label>First Name</label>
                <p id="ro_first_name">-</p>
            </div>

            <div class="form-group">
                <label>Middle Name</label>
                <p id="ro_middle_name">-</p>
            </div>

            <div class="form-group">
                <label>Last Name</label>
                <p id="ro_last_name">-</p>
            </div>

            <div class="form-group">
                <label>Suffix</label>
                <p id="ro_suffix">-</p>
            </div>

            <div class="form-group profile-employee-field" style="display:none;">
                <label>Email</label>
                <p id="ro_email">-</p>
            </div>

            <div class="form-group profile-employee-field" style="display:none;">
                <label>Phone</label>
                <p id="ro_phone">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Contact Email</label>
                <p id="ro_contact_email">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Mobile Phone</label>
                <p id="ro_mobile_phone">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Home Phone</label>
                <p id="ro_home_phone">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Work Phone</label>
                <p id="ro_work_phone">-</p>
            </div>

            <div class="form-group full profile-patient-field" style="display:none;">
                <label>Address</label>
                <p id="ro_address_line">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>City</label>
                <p id="ro_city">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Province</label>
                <p id="ro_province">-</p>
            </div>

            <div class="form-group profile-patient-field" style="display:none;">
                <label>Zip Code</label>
                <p id="ro_zip_code">-</p>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="editProfileModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit Profile</h2>
            <button type="button" class="modal-close" id="closeEditProfileModal">&times;</button>
        </div>
        <p class="form-subtitle">Update your name and contact information.</p>

        <div id="editProfileFormAlert"></div>

        <form id="editProfileForm">
            <div class="form-grid">
                <div class="form-group">
                    <label>First Name</label>
                    <input id="edit_first_name" class="form-input">
                    <span class="form-error" id="err-edit_first_name"></span>
                </div>

                <div class="form-group">
                    <label>Middle Name</label>
                    <input id="edit_middle_name" class="form-input" placeholder="Optional">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Last Name</label>
                    <input id="edit_last_name" class="form-input">
                    <span class="form-error" id="err-edit_last_name"></span>
                </div>

                <div class="form-group">
                    <label>Suffix</label>
                    <input id="edit_suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-employee-field" style="display:none;">
                    <label>Email</label>
                    <input id="edit_email" type="email" class="form-input">
                    <span class="form-error" id="err-edit_email"></span>
                </div>

                <div class="form-group profile-employee-field" style="display:none;">
                    <label>Phone</label>
                    <input id="edit_phone" class="form-input">
                    <span class="form-error" id="err-edit_phone"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Contact Email</label>
                    <input id="edit_contact_email" type="email" class="form-input">
                    <span class="form-error" id="err-edit_contact_email"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Mobile Phone</label>
                    <input id="edit_mobile_phone" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Home Phone</label>
                    <input id="edit_home_phone" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Work Phone</label>
                    <input id="edit_work_phone" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group full profile-patient-field" style="display:none;">
                    <label>Address</label>
                    <input id="edit_address_line" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>City</label>
                    <input id="edit_city" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Province</label>
                    <input id="edit_province" class="form-input">
                    <span class="form-error"></span>
                </div>

                <div class="form-group profile-patient-field" style="display:none;">
                    <label>Zip Code</label>
                    <input id="edit_zip_code" class="form-input">
                    <span class="form-error"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelEditProfile">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="changePasswordModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Change Password</h2>
            <button type="button" class="modal-close" id="closeChangePasswordModal">&times;</button>
        </div>
        <p class="form-subtitle">Update the password used to sign in.</p>

        <div id="passwordFormAlert"></div>

        <form id="passwordForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Current Password</label>
                    <input id="current_password" type="password" class="form-input">
                    <span class="form-error" id="err-current_password"></span>
                </div>

                <div class="form-group full">
                    <label>New Password</label>
                    <input id="new_password" type="password" class="form-input">
                    <span class="form-error" id="err-new_password"></span>
                </div>

                <div class="form-group full">
                    <label>Confirm New Password</label>
                    <input id="confirm_password" type="password" class="form-input">
                    <span class="form-error" id="err-confirm_password"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelChangePassword">Cancel</button>
                <button class="login-btn" type="submit">Change Password</button>
            </div>
        </form>
    </div>
</div>
`;
}
