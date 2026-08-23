export function AddPatientView()
{
    return `
<div class="form-page">
    <div class="form-card">
        <h1>Register Patient</h1>
        <p class="form-subtitle">Create a login account and patient record.</p>

        <div id="formAlert"></div>

        <div class="modal-tabs">
            <button type="button" class="modal-tab active" data-tab="basic">Basic Info</button>
            <button type="button" class="modal-tab" data-tab="choices">Choices</button>
            <button type="button" class="modal-tab" data-tab="stats">Stats</button>
            <button type="button" class="modal-tab" data-tab="contact">Contact Info</button>
            <button type="button" class="modal-tab" data-tab="related_persons">Related Persons</button>
            <button type="button" class="modal-tab" data-tab="employer">Employer</button>
            <button type="button" class="modal-tab" data-tab="misc">Misc</button>
        </div>

        <form id="addPatientForm">
            <div class="modal-tab-panel active" data-panel="basic">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Username <span style="color: #dc2626;">*</span></label>
                        <input id="username" class="form-input" placeholder="e.g juan.delacruz">
                        <span class="form-error" id="err-username"></span>
                    </div>

                    <div class="form-group full">
                        <label>Password <span style="color: #dc2626;">*</span></label>
                        <input id="password" type="password" class="form-input" placeholder="••••••••">
                        <span class="form-error" id="err-password"></span>
                    </div>

                    <div class="form-group">
                        <label>First Name <span style="color: #dc2626;">*</span></label>
                        <input id="first_name" class="form-input" placeholder="First name">
                        <span class="form-error" id="err-first_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Middle Name</label>
                        <input id="middle_name" class="form-input" placeholder="Middle name (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Last Name <span style="color: #dc2626;">*</span></label>
                        <input id="last_name" class="form-input" placeholder="Last name">
                        <span class="form-error" id="err-last_name"></span>
                    </div>

                    <div class="form-group">
                        <label>Suffix</label>
                        <input id="suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Sex <span style="color: #dc2626;">*</span></label>
                        <select id="sex" class="form-input">
                            <option value="">Select sex</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <span class="form-error" id="err-sex"></span>
                    </div>

                    <div class="form-group">
                        <label>Birthdate <span style="color: #dc2626;">*</span></label>
                        <input id="birthdate" type="date" class="form-input">
                        <span class="form-error" id="err-birthdate"></span>
                    </div>

                    <div class="form-group">
                        <label>Civil Status <span style="color: #dc2626;">*</span></label>
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
                        <label>Blood Type <span style="color: #dc2626;">*</span></label>
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
                        <label>Height (cm) <span style="color: #dc2626;">*</span></label>
                        <input id="height" type="number" step="0.01" class="form-input" placeholder="e.g 165.50">
                        <span class="form-error" id="err-height"></span>
                    </div>

                    <div class="form-group">
                        <label>Weight (kg) <span style="color: #dc2626;">*</span></label>
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

            <div class="modal-tab-panel" data-panel="related_persons">
                <p class="form-subtitle">Save the patient first — you can add related persons afterward from the Edit Patient view.</p>
            </div>

            <div class="modal-tab-panel" data-panel="employer">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Occupation</label>
                        <input id="employer_occupation" class="form-input" placeholder="Occupation (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employer Name</label>
                        <input id="employer_name" class="form-input" placeholder="Employer name (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Employer Address</label>
                        <input id="employer_address_line" class="form-input" placeholder="Address line">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Employer Address Line 2</label>
                        <input id="employer_address_line2" class="form-input" placeholder="Address line 2 (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>City</label>
                        <input id="employer_city" class="form-input" placeholder="City">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>State</label>
                        <input id="employer_state" class="form-input" placeholder="State/Province">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Postal Code</label>
                        <input id="employer_postal_code" class="form-input" placeholder="Postal code">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Country</label>
                        <input id="employer_country" class="form-input" placeholder="Country">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Industry</label>
                        <input id="employer_industry" class="form-input" placeholder="Industry (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employment Start Date</label>
                        <input id="employer_employment_start_date" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employment End Date</label>
                        <input id="employer_employment_end_date" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="misc">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Date Deceased</label>
                        <input id="date_deceased" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Reason Deceased</label>
                        <input id="reason_deceased" class="form-input" placeholder="Reason (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <a href="#/dashboard" class="btn-secondary">Cancel</a>
                <button class="login-btn" type="submit">Register Patient</button>
            </div>
        </form>
    </div>
</div>
`;
}
