export function ProfileView()
{
    return `
<style>
.prof-page-modern {
    width: 100%;
    font-size: 13.5px;
    color: #334155;
}

.prof-card-modern {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 24px;
}

.prof-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 24px;
}

.prof-header-modern h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
}

.prof-btn-edit-modern {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: white;
    color: #334155;
    border: 1px solid #cbd5e1;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s, border-color 0.15s;
}

.prof-btn-edit-modern:hover {
    background: #f8fafc;
    border-color: #94a3b8;
}

.prof-section-modern {
    margin-bottom: 32px;
}

.prof-section-title-modern {
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.prof-fields-grid-modern {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px 24px;
}

.prof-field-modern {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.prof-label-modern {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
}

.prof-val-modern {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
}

.prof-insurance-panel-modern {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
}

.prof-insurance-header-modern {
    background: #f8fafc;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
}

.prof-insurance-table-modern {
    width: 100%;
    border-collapse: collapse;
}

.prof-insurance-table-modern th, .prof-insurance-table-modern td {
    padding: 12px 16px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #f1f5f9;
}

.prof-insurance-table-modern th {
    font-weight: 600;
    font-size: 12px;
    color: #64748b;
    width: 20%;
}

.prof-insurance-table-modern td {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
}

.prof-insurance-table-modern tr:last-child th,
.prof-insurance-table-modern tr:last-child td {
    border-bottom: none;
}
</style>

<div class="prof-page-modern">
    <div class="prof-card-modern">
        <div class="prof-header-modern">
            <h1>Profile From Medical Records</h1>
            <button type="button" class="prof-btn-edit-modern" id="openEditProfileModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                Edit Profile
            </button>
        </div>
        
        <div id="formAlert"></div>

        <!-- WHO -->
        <div class="prof-section-modern">
            <div class="prof-section-title-modern">Who</div>
            <div class="prof-fields-grid-modern">
                <div class="prof-field-modern"><div class="prof-label-modern">Name</div><div class="prof-val-modern" id="oemr_name">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">External ID</div><div class="prof-val-modern" id="oemr_external_id">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">DOB</div><div class="prof-val-modern" id="oemr_dob">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Birth Sex</div><div class="prof-val-modern" id="oemr_birth_sex">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">S.S.</div><div class="prof-val-modern" id="oemr_ss">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Marital Status</div><div class="prof-val-modern" id="oemr_marital_status">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Sex</div><div class="prof-val-modern" id="oemr_sex">-</div></div>
            </div>
        </div>

        <!-- CONTACT -->
        <div class="prof-section-modern">
            <div class="prof-section-title-modern">Contact</div>
            <div class="prof-fields-grid-modern">
                <div class="prof-field-modern"><div class="prof-label-modern">Address</div><div class="prof-val-modern" id="oemr_address">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">City</div><div class="prof-val-modern" id="oemr_city">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">State</div><div class="prof-val-modern" id="oemr_state">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Postal Code</div><div class="prof-val-modern" id="oemr_postal_code">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Country</div><div class="prof-val-modern" id="oemr_country">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Mother's Name</div><div class="prof-val-modern" id="oemr_mothers_name">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Emergency Contact</div><div class="prof-val-modern" id="oemr_emergency_contact">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Emergency Phone</div><div class="prof-val-modern" id="oemr_emergency_phone">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Home Phone</div><div class="prof-val-modern" id="oemr_home_phone">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Work Phone</div><div class="prof-val-modern" id="oemr_work_phone">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Mobile Phone</div><div class="prof-val-modern" id="oemr_mobile_phone">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Contact Email</div><div class="prof-val-modern" id="oemr_contact_email">-</div></div>
            </div>
        </div>

        <!-- CHOICES -->
        <div class="prof-section-modern">
            <div class="prof-section-title-modern">Choices</div>
            <div class="prof-fields-grid-modern">
                <div class="prof-field-modern"><div class="prof-label-modern">Provider</div><div class="prof-val-modern" id="oemr_provider">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Pharmacy</div><div class="prof-val-modern" id="oemr_pharmacy">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">HIPAA Notice Received</div><div class="prof-val-modern" id="oemr_hipaa">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Voice Message</div><div class="prof-val-modern" id="oemr_allow_voice">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Leave Message With</div><div class="prof-val-modern" id="oemr_leave_message">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Mail Message</div><div class="prof-val-modern" id="oemr_allow_mail">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow SMS</div><div class="prof-val-modern" id="oemr_allow_sms">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Email</div><div class="prof-val-modern" id="oemr_allow_email">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Immunization Registry Use</div><div class="prof-val-modern" id="oemr_allow_immun_reg">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Immunization Info Sharing</div><div class="prof-val-modern" id="oemr_allow_immun_share">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Health Information Exchange</div><div class="prof-val-modern" id="oemr_allow_health_exchange">-</div></div>
                <div class="prof-field-modern"><div class="prof-label-modern">Allow Patient Portal</div><div class="prof-val-modern" id="oemr_allow_patient_portal">-</div></div>
            </div>
        </div>

        <!-- EMPLOYER & STATS -->
        <div class="prof-section-modern" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
                <div class="prof-section-title-modern">Employer</div>
                <div class="prof-field-modern"><div class="prof-label-modern">Occupation</div><div class="prof-val-modern" id="oemr_occupation">-</div></div>
            </div>
            <div>
                <div class="prof-section-title-modern">Stats</div>
                <div class="prof-field-modern"><div class="prof-label-modern">Language</div><div class="prof-val-modern" id="oemr_language">-</div></div>
            </div>
        </div>

        <!-- INSURANCE PANELS -->
        <div class="prof-insurance-panel-modern">
            <div class="prof-insurance-header-modern">Primary Insurance</div>
            <table class="prof-insurance-table-modern">
                <tbody>
                    <tr>
                        <th>Provider</th><td id="oemr_ins1_provider">-</td>
                        <th>Plan Name</th><td id="oemr_ins1_plan">-</td>
                        <th>Policy Number</th><td id="oemr_ins1_policy">-</td>
                    </tr>
                    <tr>
                        <th>Group Number</th><td id="oemr_ins1_group">-</td>
                        <th>Subscriber First Name</th><td id="oemr_ins1_sub_first">-</td>
                        <th>Subscriber Last Name</th><td id="oemr_ins1_sub_last">-</td>
                    </tr>
                    <tr>
                        <th>Relationship</th><td id="oemr_ins1_sub_rel">-</td>
                        <th>Subscriber SS</th><td id="oemr_ins1_sub_ss">-</td>
                        <th>Subscriber DOB</th><td id="oemr_ins1_sub_dob">-</td>
                    </tr>
                    <tr>
                        <th>Subscriber Phone</th><td id="oemr_ins1_sub_phone">-</td>
                        <th>Subscriber Address</th><td id="oemr_ins1_sub_address">-</td>
                        <th>Subscriber Zip</th><td id="oemr_ins1_sub_zip">-</td>
                    </tr>
                    <tr>
                        <th>Subscriber City</th><td id="oemr_ins1_sub_city">-</td>
                        <th>Subscriber State</th><td id="oemr_ins1_sub_state">-</td>
                        <th>Subscriber Country</th><td id="oemr_ins1_sub_country">-</td>
                    </tr>
                    <tr>
                        <th>Subscriber Employer</th><td id="oemr_ins1_sub_emp">-</td>
                        <th>Employer Street</th><td id="oemr_ins1_sub_emp_street">-</td>
                        <th>Employer City</th><td id="oemr_ins1_sub_emp_city">-</td>
                    </tr>
                    <tr>
                        <th>Employer Zip</th><td id="oemr_ins1_sub_emp_zip">-</td>
                        <th>Employer State</th><td id="oemr_ins1_sub_emp_state">-</td>
                        <th>Employer Country</th><td id="oemr_ins1_sub_emp_country">-</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="prof-insurance-panel-modern">
            <div class="prof-insurance-header-modern">Secondary Insurance</div>
            <div style="padding: 16px; color: #64748b; font-size: 13px;">No Secondary Insurance Found</div>
        </div>

        <div class="prof-insurance-panel-modern">
            <div class="prof-insurance-header-modern">Tertiary Insurance</div>
            <div style="padding: 16px; color: #64748b; font-size: 13px;">No Tertiary Insurance Found</div>
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
