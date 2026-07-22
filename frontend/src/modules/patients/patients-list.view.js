export function PatientsListView(user)
{
    const canAdd = user?.role === "receptionist";
    const canDelete = user?.role === "admin";
    const subtitle = user?.role === "doctor"
        ? "Patients assigned to you."
        : "All registered patients for your organization.";

    return `
<div class="form-page">
    <div class="form-card">
        <div class="panel-header-row">
            <div>
                <h1>Patients</h1>
                <p class="form-subtitle">${subtitle}</p>
            </div>
            <div class="panel-header-actions">
                <input type="text" id="patientSearchInput" class="form-input search-input" placeholder="Search by name or patient no...">
                <select id="patientProviderFilter" class="form-input filter-select">
                    <option value="all">All Providers</option>
                    <option value="unassigned">Unassigned Provider</option>
                </select>
                ${canAdd ? `<button type="button" class="btn-primary-inline" id="openAddPatientModal">+ New Patient</button>` : ""}
            </div>
        </div>

        <div id="listAlert"></div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Patient No</th>
                        <th>Name</th>
                        <th>Sex</th>
                        <th>Birthdate</th>
                        <th>Provider</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="patientsTableBody">
                    <tr><td colspan="6" class="table-empty">Loading patients...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="editPatientModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit Patient</h2>
            <button type="button" class="modal-close" id="closeEditPatientModal">&times;</button>
        </div>
        <p class="form-subtitle">Update this patient's demographic record.</p>

        <div id="editFormAlert"></div>

        <div class="modal-tabs">
            <button type="button" class="modal-tab active" data-tab="basic">Basic Info</button>
            <button type="button" class="modal-tab" data-tab="choices">Choices</button>
            <button type="button" class="modal-tab" data-tab="stats">Stats</button>
            <button type="button" class="modal-tab" data-tab="contact">Contact Info</button>
            <button type="button" class="modal-tab" data-tab="emergency">Emergency Contact</button>
        </div>

        <form id="editPatientForm">
            <input type="hidden" id="edit_id">

            <div class="modal-tab-panel active" data-panel="basic">
                <div class="form-grid">
                    <div class="form-group">
                        <label>First Name</label>
                        <input id="edit_first_name" class="form-input" placeholder="First name">
                        <span class="form-error" id="err-edit_first_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Middle Name</label>
                        <input id="edit_middle_name" class="form-input" placeholder="Middle name (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Last Name</label>
                        <input id="edit_last_name" class="form-input" placeholder="Last name">
                        <span class="form-error" id="err-edit_last_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Suffix</label>
                        <input id="edit_suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Sex</label>
                        <select id="edit_sex" class="form-input">
                            <option value="">Select sex</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <span class="form-error" id="err-edit_sex"></span>
                    </div>

                    <div class="form-group">
                        <label>Birthdate</label>
                        <input id="edit_birthdate" type="date" class="form-input">
                        <span class="form-error" id="err-edit_birthdate"></span>
                    </div>

                    <div class="form-group">
                        <label>Civil Status</label>
                        <select id="edit_civil_status" class="form-input">
                            <option value="">Select civil status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                        </select>
                        <span class="form-error" id="err-edit_civil_status"></span>
                    </div>

                    <div class="form-group">
                        <label>Blood Type</label>
                        <select id="edit_blood_type" class="form-input">
                            <option value="">Select blood type</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                        <span class="form-error" id="err-edit_blood_type"></span>
                    </div>

                    <div class="form-group">
                        <label>Height (cm)</label>
                        <input id="edit_height" type="number" step="0.01" class="form-input" placeholder="e.g 165.50">
                        <span class="form-error" id="err-edit_height"></span>
                    </div>

                    <div class="form-group">
                        <label>Weight (kg)</label>
                        <input id="edit_weight" type="number" step="0.01" class="form-input" placeholder="e.g 60.00">
                        <span class="form-error" id="err-edit_weight"></span>
                    </div>

                </div>
            </div>

            <div class="modal-tab-panel" data-panel="choices">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Provider</label>
                        <select id="edit_provider_id" class="form-input">
                            <option value="">Select provider (optional)</option>
                        </select>
                        <span class="form-error" id="err-edit_provider_id"></span>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Allow SMS Communication</label>
                        <select id="edit_allow_sms" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Voice Call Communication</label>
                        <select id="edit_allow_voice_calls" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Email Communication</label>
                        <select id="edit_allow_email" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Health Information Exchange (HIE)</label>
                        <select id="edit_allow_hie" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="stats">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Race</label>
                        <input id="edit_race" class="form-input" placeholder="Race (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Ethnicity</label>
                        <input id="edit_ethnicity" class="form-input" placeholder="Ethnicity (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Religion</label>
                        <input id="edit_religion" class="form-input" placeholder="Religion (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Language</label>
                        <input id="edit_language" class="form-input" placeholder="Language spoken (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="contact">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Address</label>
                        <input id="edit_address_line" class="form-input" placeholder="House/Unit No., Street, Barangay">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>City</label>
                        <input id="edit_city" class="form-input" placeholder="City">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Province</label>
                        <input id="edit_province" class="form-input" placeholder="Province">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Zip Code</label>
                        <input id="edit_zip_code" class="form-input" placeholder="e.g 4200">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input id="edit_contact_email" type="email" class="form-input" placeholder="name@example.com">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Home Phone</label>
                        <input id="edit_home_phone" class="form-input" placeholder="Landline (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Mobile Phone</label>
                        <input id="edit_mobile_phone" class="form-input" placeholder="09XXXXXXXXX">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Work Phone</label>
                        <input id="edit_work_phone" class="form-input" placeholder="Work phone (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="emergency">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Contact Name</label>
                        <input id="edit_emergency_contact_name" class="form-input" placeholder="Full name">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Relationship</label>
                        <input id="edit_emergency_relationship" class="form-input" placeholder="e.g Mother, Spouse">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Phone</label>
                        <input id="edit_emergency_phone" class="form-input" placeholder="09XXXXXXXXX">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Address</label>
                        <input id="edit_emergency_address" class="form-input" placeholder="Address (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                ${canDelete ? `<button type="button" class="btn-danger" id="deletePatientFromEdit">Delete Patient</button>` : ""}
                <button type="button" class="btn-secondary" id="cancelEditPatient">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>

${canAdd ? `
<div class="modal-overlay" id="addPatientModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Register Patient</h2>
            <button type="button" class="modal-close" id="closeAddPatientModal">&times;</button>
        </div>
        <p class="form-subtitle">Create a login account and patient record.</p>

        <div id="formAlert"></div>

        <div class="modal-tabs">
            <button type="button" class="modal-tab active" data-tab="basic">Basic Info</button>
            <button type="button" class="modal-tab" data-tab="choices">Choices</button>
            <button type="button" class="modal-tab" data-tab="stats">Stats</button>
            <button type="button" class="modal-tab" data-tab="contact">Contact Info</button>
            <button type="button" class="modal-tab" data-tab="emergency">Emergency Contact</button>
        </div>

        <form id="addPatientForm">
            <div class="modal-tab-panel active" data-panel="basic">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Username</label>
                        <input id="username" class="form-input" placeholder="e.g juan.delacruz">
                        <span class="form-error" id="err-username"></span>
                    </div>

                    <div class="form-group full">
                        <label>Password</label>
                        <input id="password" type="password" class="form-input" placeholder="••••••••">
                        <span class="form-error" id="err-password"></span>
                    </div>

                    <div class="form-group">
                        <label>First Name</label>
                        <input id="first_name" class="form-input" placeholder="First name">
                        <span class="form-error" id="err-first_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Middle Name</label>
                        <input id="middle_name" class="form-input" placeholder="Middle name (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Last Name</label>
                        <input id="last_name" class="form-input" placeholder="Last name">
                        <span class="form-error" id="err-last_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Suffix</label>
                        <input id="suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Sex</label>
                        <select id="sex" class="form-input">
                            <option value="">Select sex</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <span class="form-error" id="err-sex"></span>
                    </div>

                    <div class="form-group">
                        <label>Birthdate</label>
                        <input id="birthdate" type="date" class="form-input">
                        <span class="form-error" id="err-birthdate"></span>
                    </div>

                    <div class="form-group">
                        <label>Civil Status</label>
                        <select id="civil_status" class="form-input">
                            <option value="">Select civil status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                        </select>
                        <span class="form-error" id="err-civil_status"></span>
                    </div>

                    <div class="form-group">
                        <label>Blood Type</label>
                        <select id="blood_type" class="form-input">
                            <option value="">Select blood type</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                        <span class="form-error" id="err-blood_type"></span>
                    </div>

                    <div class="form-group">
                        <label>Height (cm)</label>
                        <input id="height" type="number" step="0.01" class="form-input" placeholder="e.g 165.50">
                        <span class="form-error" id="err-height"></span>
                    </div>

                    <div class="form-group">
                        <label>Weight (kg)</label>
                        <input id="weight" type="number" step="0.01" class="form-input" placeholder="e.g 60.00">
                        <span class="form-error" id="err-weight"></span>
                    </div>

                </div>
            </div>

            <div class="modal-tab-panel" data-panel="choices">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Provider</label>
                        <select id="provider_id" class="form-input">
                            <option value="">Select provider (optional)</option>
                        </select>
                        <span class="form-error" id="err-provider_id"></span>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Allow SMS Communication</label>
                        <select id="allow_sms" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Voice Call Communication</label>
                        <select id="allow_voice_calls" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Email Communication</label>
                        <select id="allow_email" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Allow Health Information Exchange (HIE)</label>
                        <select id="allow_hie" class="form-input">
                            <option value="">Unassigned</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="stats">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Race</label>
                        <input id="race" class="form-input" placeholder="Race (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Ethnicity</label>
                        <input id="ethnicity" class="form-input" placeholder="Ethnicity (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Religion</label>
                        <input id="religion" class="form-input" placeholder="Religion (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Language</label>
                        <input id="language" class="form-input" placeholder="Language spoken (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="contact">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Address</label>
                        <input id="address_line" class="form-input" placeholder="House/Unit No., Street, Barangay">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>City</label>
                        <input id="city" class="form-input" placeholder="City">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Province</label>
                        <input id="province" class="form-input" placeholder="Province">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Zip Code</label>
                        <input id="zip_code" class="form-input" placeholder="e.g 4200">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input id="contact_email" type="email" class="form-input" placeholder="name@example.com">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Home Phone</label>
                        <input id="home_phone" class="form-input" placeholder="Landline (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Mobile Phone</label>
                        <input id="mobile_phone" class="form-input" placeholder="09XXXXXXXXX">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Work Phone</label>
                        <input id="work_phone" class="form-input" placeholder="Work phone (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="emergency">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Contact Name</label>
                        <input id="emergency_contact_name" class="form-input" placeholder="Full name">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Relationship</label>
                        <input id="emergency_relationship" class="form-input" placeholder="e.g Mother, Spouse">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Phone</label>
                        <input id="emergency_phone" class="form-input" placeholder="09XXXXXXXXX">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Address</label>
                        <input id="emergency_address" class="form-input" placeholder="Address (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAddPatient">Cancel</button>
                <button class="login-btn" type="submit">Register Patient</button>
            </div>
        </form>
    </div>
</div>
` : ""}
`;
}
