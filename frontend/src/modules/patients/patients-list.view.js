export function PatientsListView(user)
{
    const canAdd = user?.role === "receptionist";
    const canDelete = user?.role === "admin";

    return `
<div class="form-page">
    <div class="form-card">
        <div class="panel-header-row">
            <div>
                <h1>Patients</h1>
                <p class="form-subtitle">All registered patients for your organization.</p>
            </div>
            ${canAdd ? `<button type="button" class="btn-primary-inline" id="openAddPatientModal">+ Add New Patient</button>` : ""}
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

        <form id="editPatientForm">
            <input type="hidden" id="edit_id">

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

                <div class="form-group">
                    <label>Provider</label>
                    <select id="edit_provider_id" class="form-input">
                        <option value="">Select provider (optional)</option>
                    </select>
                    <span class="form-error" id="err-edit_provider_id"></span>
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

        <form id="addPatientForm">
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

                <div class="form-group">
                    <label>Provider</label>
                    <select id="provider_id" class="form-input">
                        <option value="">Select provider (optional)</option>
                    </select>
                    <span class="form-error" id="err-provider_id"></span>
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
