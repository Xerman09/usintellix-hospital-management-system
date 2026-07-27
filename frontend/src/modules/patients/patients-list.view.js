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

.pd-widget-demographics {
    grid-column: 1 / -1;
}

.pd-demo-tabs {
    display: flex;
    gap: 2px;
    padding: 0 8px;
    border-bottom: 1px solid #e5e9f0;
    overflow-x: auto;
}

.pd-demo-tab {
    padding: 8px 12px;
    border: none;
    background: none;
    font-size: 12px;
    font-weight: 600;
    color: #71809b;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
}

.pd-demo-tab:hover {
    color: var(--accent-text);
}

.pd-demo-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
}

.pd-demo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 28px;
}

.pd-demo-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.pd-demo-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
    color: #94a3b8;
}

.pd-demo-value {
    font-size: 13.5px;
    color: #25324b;
}

.pd-demo-value.empty {
    color: #c3cbd9;
    font-style: italic;
}

@media (max-width: 640px) {
    .pd-demo-grid { grid-template-columns: 1fr; }
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

.pd-allergy-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
}

.pd-allergy-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid #e5e9f0;
    border-radius: 6px;
    background: #fbfcfe;
}

.pd-allergy-name {
    font-size: 12.5px;
    font-weight: 600;
    color: #29323f;
}

.pd-allergy-remove {
    flex-shrink: 0;
    border: none;
    background: none;
    color: #b91c1c;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
}

.pd-allergy-remove:hover {
    text-decoration: underline;
}

.pd-allergy-form {
    display: flex;
    gap: 6px;
    margin-top: 4px;
}

.pd-allergy-form select {
    flex: 1;
    height: 30px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    font-size: 12px;
    background: white;
}

.pd-allergy-form button {
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.pd-allergy-msg {
    margin: 6px 0 0;
    font-size: 11.5px;
    color: #b91c1c;
}

.allergy-more-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 18px;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.allergy-more-toggle svg {
    width: 14px;
    height: 14px;
    transition: transform .15s ease;
}

.allergy-more-toggle.expanded svg {
    transform: rotate(180deg);
}

.allergy-more-fields {
    margin-bottom: 18px;
}

.allergy-more-fields[hidden] {
    display: none;
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
            <button type="button" class="modal-tab" data-tab="employer">Employer</button>
            <button type="button" class="modal-tab" data-tab="misc">Misc</button>
            <button type="button" class="modal-tab" data-tab="related">Related</button>
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

            <div class="modal-tab-panel" data-panel="employer">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Occupation</label>
                        <input id="edit_employer_occupation" class="form-input" placeholder="Occupation (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employer Name</label>
                        <input id="edit_employer_name" class="form-input" placeholder="Employer name (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Employer Address</label>
                        <input id="edit_employer_address_line" class="form-input" placeholder="Address line">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Employer Address Line 2</label>
                        <input id="edit_employer_address_line2" class="form-input" placeholder="Address line 2 (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>City</label>
                        <input id="edit_employer_city" class="form-input" placeholder="City">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>State</label>
                        <input id="edit_employer_state" class="form-input" placeholder="State/Province">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Postal Code</label>
                        <input id="edit_employer_postal_code" class="form-input" placeholder="Postal code">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Country</label>
                        <input id="edit_employer_country" class="form-input" placeholder="Country">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Industry</label>
                        <input id="edit_employer_industry" class="form-input" placeholder="Industry (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employment Start Date</label>
                        <input id="edit_employer_employment_start_date" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Employment End Date</label>
                        <input id="edit_employer_employment_end_date" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="misc">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Date Deceased</label>
                        <input id="edit_date_deceased" type="date" class="form-input">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Reason Deceased</label>
                        <input id="edit_reason_deceased" class="form-input" placeholder="Reason (optional)">
                        <span class="form-error"></span>
                    </div>
                </div>
            </div>

            <div class="modal-tab-panel" data-panel="related">
                <div class="form-grid">
                    <div class="form-group full">
                        <label>Guardian Name</label>
                        <input id="edit_guardian_name" class="form-input" placeholder="Full name">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Relationship</label>
                        <input id="edit_guardian_relationship" class="form-input" placeholder="e.g Parent, Guardian">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Sex</label>
                        <select id="edit_guardian_sex" class="form-input">
                            <option value="">Select sex</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Address</label>
                        <input id="edit_guardian_address" class="form-input" placeholder="Address (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>City</label>
                        <input id="edit_guardian_city" class="form-input" placeholder="City">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>State</label>
                        <input id="edit_guardian_state" class="form-input" placeholder="State/Province">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Postal Code</label>
                        <input id="edit_guardian_postal_code" class="form-input" placeholder="Postal code">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Country</label>
                        <input id="edit_guardian_country" class="form-input" placeholder="Country">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Phone</label>
                        <input id="edit_guardian_phone" class="form-input" placeholder="Phone (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group">
                        <label>Work Phone</label>
                        <input id="edit_guardian_work_phone" class="form-input" placeholder="Work phone (optional)">
                        <span class="form-error"></span>
                    </div>

                    <div class="form-group full">
                        <label>Email</label>
                        <input id="edit_guardian_email" type="email" class="form-input" placeholder="name@example.com">
                        <span class="form-error"></span>
                    </div>
                </div>

                <div style="margin-top: 18px;">
                    <label style="font-weight: 600; font-size: 13px; color: #52627a;">Related Persons</label>
                    <p class="form-subtitle" style="margin-top: 4px;">None recorded.</p>
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
                    <div class="pd-widget pd-widget-demographics">
                        <div class="pd-widget-header">
                            <div class="pd-widget-header-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="M4 9h16M9 4v16"></path></svg>
                                <h3>Demographics</h3>
                            </div>
                        </div>
                        <div class="pd-demo-tabs" id="pdDemoTabs">
                            <button type="button" class="pd-demo-tab active" data-demo-tab="who">Who</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="contact">Contact</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="choices">Choices</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="employer">Employer</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="stats">Stats</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="misc">Misc</button>
                            <button type="button" class="pd-demo-tab" data-demo-tab="related">Related</button>
                        </div>
                        <div class="pd-widget-body" id="pdDemoPanels"></div>
                    </div>
                    ${dashboardWidget("Care Team", '<circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path>', "No provider assigned yet.")}
                    ${dashboardWidget("Allergies", '<path d="M12 2 2 22h20L12 2Z"></path><path d="M12 9v5M12 17h.01"></path>', "No known allergies recorded.", { bodyId: "pdAllergiesBody", addBtnId: "pdAllergiesAddBtn", addBtnLabel: "Edit", addBtnDisabled: false })}
                    ${dashboardWidget("Problems", '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>', "No active problems recorded.", { bodyId: "pdProblemsBody", addBtnId: "pdProblemsAddBtn", addBtnLabel: "Edit", addBtnDisabled: false })}
                    ${dashboardWidget("Medications", '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>', "No active medications recorded.", { bodyId: "pdMedicationsBody", addBtnId: "pdMedicationsAddBtn", addBtnLabel: "Edit", addBtnDisabled: false })}
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

<div class="modal-overlay" id="allergyDetailModalOverlay">
    <div class="modal-box" style="max-width: 800px;">
        <div class="modal-header">
            <h2>Allergies</h2>
            <button type="button" class="modal-close" id="closeAllergyDetailModal">&times;</button>
        </div>
        <p class="form-subtitle">Full allergy history for this patient.</p>

        <div id="allergyDetailAlert"></div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
            <button type="button" class="btn-primary-inline" id="openAddAllergyBtn">+ Add Allergy</button>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Allergy</th>
                        <th>Reaction</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="allergyDetailTableBody">
                    <tr><td colspan="6" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="allergyFormModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="allergyFormTitle">Add Allergy</h2>
            <button type="button" class="modal-close" id="closeAllergyFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Record allergy details for this patient.</p>

        <div id="allergyFormAlert"></div>

        <form id="allergyForm">
            <input type="hidden" id="allergy_record_id">

            <div class="form-grid">
                <div class="form-group full">
                    <label>Allergy</label>
                    <select id="allergy_catalog_id" class="form-input">
                        <option value="">Select allergy...</option>
                    </select>
                    <span class="form-error" id="err-allergy_catalog_id"></span>
                </div>

                <div class="form-group">
                    <label>Begin Date</label>
                    <input id="allergy_begin_date" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>End Date</label>
                    <input id="allergy_end_date" type="date" class="form-input" placeholder="Leave blank if still active">
                </div>

                <div class="form-group">
                    <label>Reaction</label>
                    <select id="allergy_reaction" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Rash">Rash</option>
                        <option value="Hives">Hives</option>
                        <option value="Itching">Itching</option>
                        <option value="Swelling">Swelling</option>
                        <option value="Nausea/Vomiting">Nausea/Vomiting</option>
                        <option value="Difficulty Breathing">Difficulty Breathing</option>
                        <option value="Anaphylaxis">Anaphylaxis</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Severity</label>
                    <select id="allergy_severity" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Comments</label>
                    <textarea id="allergy_comments" class="form-input" style="min-height: 70px;"></textarea>
                </div>
            </div>

            <button type="button" class="allergy-more-toggle" id="allergyMoreToggle">
                <span>Show More Fields</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
            </button>

            <div class="form-grid allergy-more-fields" id="allergyMoreFields" hidden>
                <div class="form-group full">
                    <label>Coding</label>
                    <div class="scm-trigger-row" style="align-items: flex-start;">
                        <textarea id="allergy_coding" class="form-input" placeholder="No code selected" rows="4" style="resize: vertical;"></textarea>
                        <button type="button" class="btn-secondary scm-trigger-btn" id="openSelectCodesBtn" style="margin-top: 0;">Select Codes</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Occurrence</label>
                    <select id="allergy_occurrence" class="form-input">
                        <option value="">Unknown or N/A</option>
                        <option value="First Time">First Time</option>
                        <option value="Recurrence">Recurrence</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Outcome</label>
                    <select id="allergy_outcome" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Recovered">Recovered</option>
                        <option value="Recovering">Recovering</option>
                        <option value="Not Recovered">Not Recovered</option>
                        <option value="Recovered with Sequelae">Recovered with Sequelae</option>
                        <option value="Fatal">Fatal</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Classification Type</label>
                    <select id="allergy_classification_type" class="form-input">
                        <option value="">NA</option>
                        <option value="Drug Allergy">Drug Allergy</option>
                        <option value="Food Allergy">Food Allergy</option>
                        <option value="Environmental Allergy">Environmental Allergy</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Verification Status</label>
                    <select id="allergy_verification_status" class="form-input">
                        <option value="Unconfirmed">Unconfirmed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Refuted">Refuted</option>
                        <option value="Entered in Error">Entered in Error</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Referred By</label>
                    <input id="allergy_referred_by" class="form-input">
                </div>

                <div class="form-group">
                    <label>Destination</label>
                    <input id="allergy_destination" class="form-input">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAllergyForm">Cancel</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="problemDetailModalOverlay">
    <div class="modal-box" style="max-width: 800px;">
        <div class="modal-header">
            <h2>Medical Problems</h2>
            <button type="button" class="modal-close" id="closeProblemDetailModal">&times;</button>
        </div>
        <p class="form-subtitle">Full problem history for this patient.</p>

        <div id="problemDetailAlert"></div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
            <button type="button" class="btn-primary-inline" id="openAddProblemBtn">+ Add Problem</button>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Problem</th>
                        <th>Occurrence</th>
                        <th>Status</th>
                        <th>Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="problemDetailTableBody">
                    <tr><td colspan="5" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="problemFormModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="problemFormTitle">Add Problem</h2>
            <button type="button" class="modal-close" id="closeProblemFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Record a medical problem for this patient.</p>

        <div id="problemFormAlert"></div>

        <form id="problemForm">
            <input type="hidden" id="problem_record_id">

            <div class="form-grid">
                <div class="form-group full">
                    <label>Select from list <span style="font-weight: 400; color: #a2aec4;">(or type your own in Title)</span></label>
                    <select id="problem_catalog_id" class="form-input">
                        <option value="">Custom / type your own...</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Title</label>
                    <input id="problem_title" class="form-input" placeholder="e.g. Hypertension">
                    <span class="form-error" id="err-problem_title"></span>
                </div>

                <div class="form-group">
                    <label>Begin Date</label>
                    <input id="problem_begin_date" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>End Date</label>
                    <input id="problem_end_date" type="date" class="form-input" placeholder="Leave blank if still active">
                </div>

                <div class="form-group full">
                    <label>Comments</label>
                    <textarea id="problem_comments" class="form-input" style="min-height: 70px;"></textarea>
                </div>
            </div>

            <button type="button" class="allergy-more-toggle" id="problemMoreToggle">
                <span>Show More Fields</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
            </button>

            <div class="form-grid allergy-more-fields" id="problemMoreFields" hidden>
                <div class="form-group full">
                    <label>Coding</label>
                    <div class="scm-trigger-row" style="align-items: flex-start;">
                        <textarea id="problem_coding" class="form-input" placeholder="No code selected" rows="4" style="resize: vertical;"></textarea>
                        <button type="button" class="btn-secondary scm-trigger-btn" id="openSelectCodesBtnProblem" style="margin-top: 0;">Select Codes</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Occurrence</label>
                    <select id="problem_occurrence" class="form-input">
                        <option value="">Unknown or N/A</option>
                        <option value="First Time">First Time</option>
                        <option value="Recurrence">Recurrence</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Outcome</label>
                    <select id="problem_outcome" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Recovered">Recovered</option>
                        <option value="Recovering">Recovering</option>
                        <option value="Not Recovered">Not Recovered</option>
                        <option value="Recovered with Sequelae">Recovered with Sequelae</option>
                        <option value="Fatal">Fatal</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Classification Type</label>
                    <select id="problem_classification_type" class="form-input">
                        <option value="">NA</option>
                        <option value="Encounter Diagnosis">Encounter Diagnosis</option>
                        <option value="Problem List">Problem List</option>
                        <option value="Chronic">Chronic</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Verification Status</label>
                    <select id="problem_verification_status" class="form-input">
                        <option value="Unconfirmed">Unconfirmed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Refuted">Refuted</option>
                        <option value="Entered in Error">Entered in Error</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Referred By</label>
                    <input id="problem_referred_by" class="form-input">
                </div>

                <div class="form-group">
                    <label>Destination</label>
                    <input id="problem_destination" class="form-input">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelProblemForm">Cancel</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="medicationDetailModalOverlay">
    <div class="modal-box" style="max-width: 800px;">
        <div class="modal-header">
            <h2>Medications</h2>
            <button type="button" class="modal-close" id="closeMedicationDetailModal">&times;</button>
        </div>
        <p class="form-subtitle">Full medication history for this patient.</p>

        <div id="medicationDetailAlert"></div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
            <button type="button" class="btn-primary-inline" id="openAddMedicationBtn">+ Add Medication</button>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Medication</th>
                        <th>Occurrence</th>
                        <th>Status</th>
                        <th>Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="medicationDetailTableBody">
                    <tr><td colspan="5" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="medicationFormModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="medicationFormTitle">Add Medication</h2>
            <button type="button" class="modal-close" id="closeMedicationFormModal">&times;</button>
        </div>
        <p class="form-subtitle">Record a medication for this patient.</p>

        <div id="medicationFormAlert"></div>

        <form id="medicationForm">
            <input type="hidden" id="medication_record_id">

            <div class="form-grid">
                <div class="form-group full">
                    <label>Select from list <span style="font-weight: 400; color: #a2aec4;">(or type your own in Title)</span></label>
                    <select id="medication_catalog_id" class="form-input">
                        <option value="">Custom / type your own...</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Title</label>
                    <input id="medication_title" class="form-input" placeholder="e.g. Lisinopril">
                    <span class="form-error" id="err-medication_title"></span>
                </div>

                <div class="form-group">
                    <label>Begin Date</label>
                    <input id="medication_begin_date" type="date" class="form-input">
                </div>

                <div class="form-group">
                    <label>End Date</label>
                    <input id="medication_end_date" type="date" class="form-input" placeholder="Leave blank if still active">
                </div>

                <div class="form-group">
                    <label>Medication Usage</label>
                    <select id="medication_medication_usage" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Home/Community">Home/Community</option>
                        <option value="Inpatient">Inpatient</option>
                        <option value="Outpatient">Outpatient</option>
                        <option value="Long Term Care">Long Term Care</option>
                        <option value="Facility Administered">Facility Administered</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Medication Request Intent</label>
                    <select id="medication_request_intent" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Order">Order</option>
                        <option value="Plan">Plan</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Original Order">Original Order</option>
                        <option value="Instance Order">Instance Order</option>
                        <option value="Option">Option</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Is Primary Record <span style="font-weight: 400; color: #a2aec4;">(not reported by secondary source)</span></label>
                    <div class="scm-radio-row">
                        <label class="scm-radio-option">
                            <input type="radio" name="medication_is_primary_record" id="medication_is_primary_record_yes" value="1" checked>
                            Yes
                        </label>
                        <label class="scm-radio-option">
                            <input type="radio" name="medication_is_primary_record" id="medication_is_primary_record_no" value="0">
                            No
                        </label>
                    </div>
                </div>

                <div class="form-group full">
                    <label>Comments</label>
                    <textarea id="medication_comments" class="form-input" style="min-height: 70px;"></textarea>
                </div>
            </div>

            <button type="button" class="allergy-more-toggle" id="medicationMoreToggle">
                <span>Show More Fields</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
            </button>

            <div class="form-grid allergy-more-fields" id="medicationMoreFields" hidden>
                <div class="form-group full">
                    <label>Coding</label>
                    <div class="scm-trigger-row" style="align-items: flex-start;">
                        <textarea id="medication_coding" class="form-input" placeholder="No code selected" rows="4" style="resize: vertical;"></textarea>
                        <button type="button" class="btn-secondary scm-trigger-btn" id="openSelectCodesBtnMedication" style="margin-top: 0;">Select Codes</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Occurrence</label>
                    <select id="medication_occurrence" class="form-input">
                        <option value="">Unknown or N/A</option>
                        <option value="First Time">First Time</option>
                        <option value="Recurrence">Recurrence</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Outcome</label>
                    <select id="medication_outcome" class="form-input">
                        <option value="">Unassigned</option>
                        <option value="Recovered">Recovered</option>
                        <option value="Recovering">Recovering</option>
                        <option value="Not Recovered">Not Recovered</option>
                        <option value="Recovered with Sequelae">Recovered with Sequelae</option>
                        <option value="Fatal">Fatal</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Classification Type</label>
                    <select id="medication_classification_type" class="form-input">
                        <option value="">NA</option>
                        <option value="Encounter Diagnosis">Encounter Diagnosis</option>
                        <option value="Problem List">Problem List</option>
                        <option value="Chronic">Chronic</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Verification Status</label>
                    <select id="medication_verification_status" class="form-input">
                        <option value="Unconfirmed">Unconfirmed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Refuted">Refuted</option>
                        <option value="Entered in Error">Entered in Error</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Referred By</label>
                    <input id="medication_referred_by" class="form-input">
                </div>

                <div class="form-group">
                    <label>Destination</label>
                    <input id="medication_destination" class="form-input">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelMedicationForm">Cancel</button>
                <button class="login-btn" type="submit">Save</button>
            </div>
        </form>
    </div>
</div>

<style>
.scm-trigger-row {
    display: flex;
    gap: 10px;
}

.scm-trigger-row .form-input {
    flex: 1;
    background: #f8fafc;
    color: #52627a;
    cursor: default;
}

.scm-trigger-btn {
    white-space: nowrap;
}

.scm-radio-row {
    display: flex;
    align-items: center;
    gap: 24px;
    height: 44px;
}

.scm-radio-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #25324b;
    cursor: pointer;
}

.scm-radio-option input {
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.scm-box {
    max-width: 900px;
}

.scm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 18px 0 16px;
    flex-wrap: wrap;
}

.scm-source-select {
    width: auto;
    min-width: 190px;
}

.scm-search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
}

.scm-search-wrap .form-input {
    width: 260px;
}

.scm-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: white;
    color: #52627a;
    cursor: pointer;
    transition: .12s;
    flex-shrink: 0;
}

.scm-icon-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent-text);
}

.scm-icon-btn svg {
    width: 16px;
    height: 16px;
}

.scm-table-wrap {
    max-height: 380px;
    overflow-y: auto;
    border: 1px solid #eef1f7;
    border-radius: 14px;
}

.scm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.scm-table th {
    position: sticky;
    top: 0;
    text-align: left;
    padding: 12px 16px;
    color: #71809b;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
}

.scm-table th .scm-sort-arrow {
    margin-left: 4px;
    opacity: .5;
    font-size: 10px;
}

.scm-table td {
    padding: 11px 16px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
}

.scm-table tbody tr:last-child td {
    border-bottom: none;
}

.scm-table tbody tr {
    cursor: pointer;
    transition: background-color .1s;
}

.scm-table tbody tr:hover {
    background: #fafbff;
}

.scm-table tbody tr.selected {
    background: var(--accent-light);
    font-weight: 700;
}

.scm-selected-count {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-text);
    white-space: nowrap;
}

.scm-code-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f4fa;
    color: #52627a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
}

.scm-empty {
    text-align: center !important;
    padding: 40px 20px !important;
    color: #71809b;
}

.scm-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 14px;
    flex-wrap: wrap;
}

.scm-page-info {
    font-size: 13px;
    color: #71809b;
}

.scm-page-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.scm-page-btn {
    height: 32px;
    padding: 0 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #34435c;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
}

.scm-page-btn:hover:not(:disabled) {
    border-color: var(--accent-border);
    color: var(--accent-text);
}

.scm-page-btn:disabled {
    opacity: .45;
    cursor: not-allowed;
}

.scm-page-indicator {
    font-size: 13px;
    font-weight: 600;
    color: #25324b;
    white-space: nowrap;
}

#confirmSelectCodes:disabled {
    opacity: .5;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .scm-toolbar { flex-direction: column; align-items: stretch; }
    .scm-search-wrap .form-input { width: 100%; flex: 1; }
    .scm-source-select { width: 100%; }
}
</style>

<div class="modal-overlay" id="selectCodesModalOverlay">
    <div class="modal-box scm-box">
        <div class="modal-header">
            <h2>Select Codes</h2>
            <button type="button" class="modal-close" id="closeSelectCodesModal">&times;</button>
        </div>

        <div class="scm-toolbar">
            <select class="form-input scm-source-select" id="scmSourceSelect">
                <option value="icd10">ICD10 Diagnosis</option>
                <option value="cqm">CQM Valueset</option>
                <option value="oid">OID Valueset</option>
            </select>

            <div class="scm-search-wrap">
                <input type="text" class="form-input" id="scmSearchInput" placeholder="Search for code or description...">
                <button type="button" class="scm-icon-btn" id="scmSearchBtn" title="Search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                </button>
                <button type="button" class="scm-icon-btn" id="scmClearBtn" title="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                </button>
            </div>
        </div>

        <div class="scm-table-wrap">
            <table class="scm-table">
                <thead>
                    <tr>
                        <th data-sort="code">Code <span class="scm-sort-arrow" id="scmSortArrowCode"></span></th>
                        <th data-sort="description">Description <span class="scm-sort-arrow" id="scmSortArrowDescription"></span></th>
                    </tr>
                </thead>
                <tbody id="scmTableBody">
                    <tr><td colspan="2" class="scm-empty">Search to find codes.</td></tr>
                </tbody>
            </table>
        </div>

        <div class="scm-pagination">
            <span class="scm-page-info" id="scmPageInfo"></span>
            <span class="scm-selected-count" id="scmSelectedCount"></span>
            <div class="scm-page-controls">
                <button type="button" class="scm-page-btn" id="scmPrevPage">Prev</button>
                <span class="scm-page-indicator" id="scmPageIndicator">Page 1 of 1</span>
                <button type="button" class="scm-page-btn" id="scmNextPage">Next</button>
            </div>
        </div>

        <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelSelectCodes">Cancel</button>
            <button type="button" class="login-btn" id="confirmSelectCodes" disabled>Ok</button>
        </div>
    </div>
</div>
`;
}

function dashboardWidget(title, iconPath, emptyText, options = {})
{
    const { bodyId, addBtnId, addBtnLabel = "+ Add", addBtnDisabled = true } = options;

    const body = bodyId
        ? `<div class="pd-widget-body" id="${bodyId}">
                <div class="pd-widget-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
                    <p>Loading...</p>
                </div>
            </div>`
        : `<div class="pd-widget-body">
                <div class="pd-widget-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
                    <p>${emptyText}</p>
                </div>
            </div>`;

    return `
    <div class="pd-widget">
        <div class="pd-widget-header">
            <div class="pd-widget-header-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
                <h3>${title}</h3>
            </div>
            <button type="button" class="pd-widget-add"${addBtnId ? ` id="${addBtnId}"` : ""}${addBtnDisabled ? " disabled" : ""}>${addBtnLabel}</button>
        </div>
        ${body}
    </div>
    `;
}
