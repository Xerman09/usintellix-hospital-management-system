export function PatientsListView(user)
{
    const canAdd = user?.role === "receptionist";
    const canDelete = user?.role === "admin";
    const subtitle = user?.role === "doctor"
        ? "Patients assigned to you."
        : "All registered patients for your organization.";

    return `
<style>
.pat-page {
    width: 100%;
    font-size: 13.5px;
}

.pat-card {
    width: 100%;
}

.pat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.pat-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pat-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid #dbe1ea;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pat-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.pat-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.pat-header .form-subtitle {
    margin: 1px 0 0;
    font-size: 12.5px;
    max-width: 480px;
}

.pat-add-btn {
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

.pat-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.pat-add-btn svg {
    width: 14px;
    height: 14px;
}

.pat-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0 14px;
    flex-wrap: wrap;
}

.pat-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: #55647c;
    white-space: nowrap;
}

.pat-stat-pill svg {
    width: 13px;
    height: 13px;
    color: #8b98ac;
}

.pat-toolbar-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
    flex-wrap: wrap;
}

.pat-search-wrap {
    position: relative;
    flex: 1;
    max-width: 280px;
    min-width: 190px;
}

.pat-search-wrap svg {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: #96a2b8;
    pointer-events: none;
}

.pat-search-input {
    width: 100%;
    height: 32px;
    padding: 0 30px 0 32px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
    transition: border-color .12s;
}

.pat-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.pat-search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: none;
    color: #8b98ac;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.pat-search-clear.show {
    display: flex;
}

.pat-search-clear:hover {
    background: #eef1f6;
    color: #38455a;
}

.pat-filter-select {
    height: 32px;
    min-width: 170px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
    cursor: pointer;
    transition: border-color .12s;
}

.pat-filter-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.pat-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.pat-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pat-table th {
    text-align: left;
    padding: 9px 14px;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
}

.pat-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.pat-table tbody tr:last-child td {
    border-bottom: none;
}

.pat-table tbody tr.pat-row {
    cursor: pointer;
}

.pat-table tbody tr:hover {
    background: #f8fafc;
}

.pat-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pat-avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 12px;
}

.pat-name {
    font-weight: 600;
    color: #14181f;
}

.pat-patient-no {
    font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
    font-size: 12px;
    color: #55647c;
}

.pat-muted {
    color: #6b7787;
}

.pat-muted.empty {
    color: #a3adbd;
}

.pat-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #3b475a;
    font-size: 11.5px;
    font-weight: 600;
}

.pat-tag.empty {
    background: none;
    border-color: transparent;
    color: #a3adbd;
    font-weight: 400;
    padding: 2px 0;
}

.pat-sex-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid transparent;
    font-size: 11.5px;
    font-weight: 600;
}

.pat-sex-badge.male {
    border-color: var(--accent-border);
    color: var(--accent);
}

.pat-sex-badge.female {
    border-color: #f9c9de;
    color: #be185d;
}

.pat-sex-badge.unset {
    border-color: #e2e8f0;
    color: #8b98ac;
}

.pat-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

.pat-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color .1s, border-color .1s;
}

.pat-icon-btn svg {
    width: 13px;
    height: 13px;
}

.pat-icon-btn.edit {
    color: #3b475a;
}

.pat-icon-btn.edit:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
}

.pat-icon-btn.view {
    color: var(--accent);
}

.pat-icon-btn.view:hover {
    background: var(--accent-light);
    border-color: var(--accent-border);
}

.pat-icon-btn.delete {
    color: #b91c1c;
}

.pat-icon-btn.delete:hover {
    background: #fef2f2;
    border-color: #fecaca;
}

.pat-empty-state {
    text-align: left;
    padding: 32px 20px !important;
}

.pat-empty-state .pat-empty-icon {
    display: none;
}

.pat-empty-state p {
    margin: 2px 0 0;
    color: #6b7787;
    font-size: 13px;
}

.pat-empty-state strong {
    display: block;
    color: #29323f;
    font-size: 13.5px;
    font-weight: 600;
}

.pat-skeleton-row td {
    padding: 12px 14px;
}

.pat-skeleton-bar {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, #eef1f5 25%, #e4e8ee 37%, #eef1f5 63%);
    background-size: 400% 100%;
    animation: pat-shimmer 1.4s ease infinite;
}

@keyframes pat-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
    .pat-header { flex-direction: column; align-items: stretch; }
    .pat-add-btn { width: 100%; justify-content: center; }
    .pat-toolbar { flex-direction: column; align-items: stretch; }
    .pat-toolbar-controls { justify-content: stretch; }
    .pat-search-wrap { max-width: none; }
}

/* ===== Patient Dashboard modal (OpenEMR-style) ===== */

.pd-modal-box {
    max-width: 1120px;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 92vh;
}

.pd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #e5e9f0;
    flex-shrink: 0;
}

.pd-topbar-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pd-topbar-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 13px;
}

.pd-topbar h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #14181f;
}

.pd-topbar p {
    margin: 1px 0 0;
    font-size: 12px;
    color: #6b7787;
}

.pd-body {
    display: flex;
    overflow: hidden;
    flex: 1;
    min-height: 0;
}

.pd-sidebar {
    width: 232px;
    flex-shrink: 0;
    padding: 18px 16px;
    border-right: 1px solid #e5e9f0;
    background: #fbfcfe;
    overflow-y: auto;
}

.pd-sidebar-avatar {
    width: 52px;
    height: 52px;
    margin: 0 0 10px;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 19px;
}

.pd-sidebar-name {
    text-align: left;
    font-size: 14px;
    font-weight: 700;
    color: #14181f;
    margin: 0 0 1px;
}

.pd-sidebar-sub {
    text-align: left;
    font-size: 12px;
    color: #6b7787;
    margin: 0 0 16px;
}

.pd-fact-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.pd-fact {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.pd-fact-label {
    font-size: 11.5px;
    color: #8b98ac;
}

.pd-fact-value {
    font-size: 12.5px;
    color: #29323f;
    font-weight: 600;
    text-align: right;
}

.pd-fact-value.empty {
    font-weight: 400;
    color: #a3adbd;
}

.pd-quick-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.pd-quick-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    color: #3b475a;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color .1s;
}

.pd-quick-btn:hover {
    background: var(--accent-light);
    color: var(--accent);
}

.pd-quick-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: #8b98ac;
}

.pd-main {
    flex: 1;
    overflow-y: auto;
    padding: 18px 20px;
}

.pd-widget-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.pd-widget {
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
}

.pd-widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 12px;
    border-bottom: 1px solid #e5e9f0;
}

.pd-widget-header-title {
    display: flex;
    align-items: center;
    gap: 7px;
}

.pd-widget-header-title svg {
    width: 14px;
    height: 14px;
    color: #6b7787;
    flex-shrink: 0;
}

.pd-widget-header h3 {
    margin: 0;
    font-size: 12.5px;
    font-weight: 700;
    color: #29323f;
}

.pd-widget-add {
    border: none;
    background: none;
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
}

.pd-widget-add:hover {
    text-decoration: underline;
}

.pd-widget-body {
    padding: 12px;
}

.pd-widget-empty {
    display: flex;
    align-items: center;
    gap: 7px;
}

.pd-widget-empty svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    color: #b7c0cf;
}

.pd-widget-empty p {
    margin: 0;
    font-size: 12px;
    color: #8b98ac;
}

@media (max-width: 860px) {
    .pd-widget-grid { grid-template-columns: 1fr; }
    .pd-body { flex-direction: column; }
    .pd-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e5e9f0; }
}
</style>

<div class="pat-page">
    <div class="pat-card">
        <div class="pat-header">
            <div class="pat-header-title">
                <div class="pat-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                    <h1>Patients</h1>
                    <p class="form-subtitle">${subtitle}</p>
                </div>
            </div>
            ${canAdd ? `
            <button type="button" class="pat-add-btn" id="openAddPatientModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                New Patient
            </button>` : ""}
        </div>

        <div id="listAlert"></div>

        <div class="pat-toolbar">
            <span class="pat-stat-pill" id="patientCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span id="patientCountText">0 patients</span>
            </span>
            <div class="pat-toolbar-controls">
                <select id="patientProviderFilter" class="pat-filter-select">
                    <option value="all">All Providers</option>
                    <option value="unassigned">Unassigned Provider</option>
                </select>
                <div class="pat-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" id="patientSearchInput" class="pat-search-input" placeholder="Search by name or patient no...">
                    <button type="button" class="pat-search-clear" id="patientSearchClear" aria-label="Clear search">&times;</button>
                </div>
            </div>
        </div>

        <div class="pat-table-wrap">
            <table class="pat-table">
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
                    <tr class="pat-skeleton-row"><td colspan="6"><div class="pat-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="pat-skeleton-row"><td colspan="6"><div class="pat-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="pat-skeleton-row"><td colspan="6"><div class="pat-skeleton-bar" style="width: 70%;"></div></td></tr>
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

<div class="modal-overlay" id="patientDashboardModalOverlay">
    <div class="modal-box pd-modal-box">
        <div class="pd-topbar">
            <div class="pd-topbar-title">
                <div class="pd-topbar-avatar" id="pdAvatar">?</div>
                <div>
                    <h2 id="pdName">&nbsp;</h2>
                    <p id="pdSubtitle">&nbsp;</p>
                </div>
            </div>
            <button type="button" class="modal-close" id="closePatientDashboardModal">&times;</button>
        </div>

        <div class="pd-body">
            <div class="pd-sidebar">
                <div class="pd-sidebar-avatar" id="pdSidebarAvatar">?</div>
                <p class="pd-sidebar-name" id="pdSidebarName">&nbsp;</p>
                <p class="pd-sidebar-sub" id="pdSidebarSub">&nbsp;</p>

                <div class="pd-fact-list">
                    <div class="pd-fact">
                        <span class="pd-fact-label">Sex</span>
                        <span class="pd-fact-value" id="pdFactSex">-</span>
                    </div>
                    <div class="pd-fact">
                        <span class="pd-fact-label">Birthdate</span>
                        <span class="pd-fact-value" id="pdFactBirthdate">-</span>
                    </div>
                    <div class="pd-fact">
                        <span class="pd-fact-label">Blood Type</span>
                        <span class="pd-fact-value" id="pdFactBloodType">-</span>
                    </div>
                    <div class="pd-fact">
                        <span class="pd-fact-label">Care Provider</span>
                        <span class="pd-fact-value" id="pdFactProvider">-</span>
                    </div>
                </div>

                <div class="pd-quick-actions">
                    <button type="button" class="pd-quick-btn" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                        Edit Demographics
                    </button>
                    <button type="button" class="pd-quick-btn" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                        Schedule Appointment
                    </button>
                    <button type="button" class="pd-quick-btn" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>
                        New Document
                    </button>
                </div>
            </div>

            <div class="pd-main">
                <div class="pd-widget-grid">
                    ${dashboardWidget("Demographics", '<path d="M4 4h16v16H4z"></path><path d="M4 9h16M9 4v16"></path>', "No demographic details recorded yet.")}
                    ${dashboardWidget("Care Team", '<circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path>', "No provider assigned yet.")}
                    ${dashboardWidget("Allergies", '<path d="M12 2 2 22h20L12 2Z"></path><path d="M12 9v5M12 17h.01"></path>', "No known allergies recorded.")}
                    ${dashboardWidget("Problems", '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>', "No active problems recorded.")}
                    ${dashboardWidget("Medications", '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>', "No active medications recorded.")}
                    ${dashboardWidget("Immunizations", '<path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path>', "No immunization records yet.")}
                    ${dashboardWidget("Vitals", '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>', "No vitals recorded yet.")}
                    ${dashboardWidget("Insurance", '<path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z"></path>', "No insurance on file.")}
                    ${dashboardWidget("Appointments", '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path>', "No upcoming appointments.")}
                    ${dashboardWidget("Documents", '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path>', "No documents uploaded yet.")}
                </div>
            </div>
        </div>
    </div>
</div>
`;
}

function dashboardWidget(title, iconPath, emptyText)
{
    return `
    <div class="pd-widget">
        <div class="pd-widget-header">
            <div class="pd-widget-header-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
                <h3>${title}</h3>
            </div>
            <button type="button" class="pd-widget-add" disabled>+ Add</button>
        </div>
        <div class="pd-widget-body">
            <div class="pd-widget-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
                <p>${emptyText}</p>
            </div>
        </div>
    </div>
    `;
}
