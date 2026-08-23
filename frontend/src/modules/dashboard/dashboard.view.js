import { getUser } from "../../core/session.js";

function staffNavLinks(role)
{
    const appointmentsLink = ["admin", "receptionist"].includes(role)
        ? `<a data-tab="appointments">Calendar</a>`
        : "";

    return `
        ${appointmentsLink}
        <a data-tab="patient_finder">Finder</a>
        <a data-tab="patients">Patients</a>
        <a data-tab="employees">Employees</a>
        <a data-tab="messaging">Messaging</a>
        <a data-tab="recalls">Recalls</a>
        <a data-tab="patient_flow">Flow</a>
        ${role === "admin" ? `<a data-tab="role_management">Role Management</a>` : ""}
        <div class="nav-dropdown">
            <span>Procedures</span>
            <div class="dropdown-content">
                <a data-tab="providers">Providers</a>
                <a data-tab="provider_categories">Provider Categories</a>
                <a data-tab="visit_categories">Visit Categories</a>
                <a data-tab="screening_tools">Screening Tools</a>
                <a data-tab="classes">Classes</a>
                <a data-tab="visit_types">Visit Type</a>
                <a data-tab="facilities">Facility</a>
                <a data-tab="facility_billings">Facility Billing</a>
                <a data-tab="allergies">Allergy Management</a>
                <a data-tab="medical_problems">Medical Problem Management</a>
                <a data-tab="medication_management">Medication Management</a>
                <a data-tab="prescription_categories">Prescription Categories</a>
                <a data-tab="payer_types">Payer Type Management</a>
                <a data-tab="x12_partners">X12 Partner</a>
                <a data-tab="cqm_source_of_payments">CQM Source of Payment</a>
                <a data-tab="insurances">Insurance Management</a>
                <a data-tab="organization_types">Organization Type Registration</a>
                <a data-tab="pos_codes">POS Code Management</a>
                <a data-tab="price_levels">Price Level Management</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>File Management</span>
            <div class="dropdown-content">
                <div class="dropdown-section-label">Code</div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Codes
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="icd10_diagnoses">ICD10 Diagnosis</a>
                        <a data-tab="cvx_codes">CVX Immunization Codes</a>
                        <a data-tab="cqm_valuesets">CQM Valueset</a>
                        <a data-tab="codes">Codes</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Immunization
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="immunizations">Immunizations</a>
                        <a data-tab="administration_routes">Routes</a>
                        <a data-tab="administration_sites">Administration Sites</a>
                        <a data-tab="amount_units">Amount Units</a>
                        <a data-tab="information_sources">Information Sources</a>
                        <a data-tab="refusal_reasons">Refusal Reasons</a>
                        <a data-tab="completion_statuses">Completion Statuses</a>
                    </div>
                </div>
                <a data-tab="preference_types">Preference Type</a>
                <a data-tab="surgeries">Surgeries</a>
                <a data-tab="void_reasons">Void Reason Management</a>
                <a data-tab="care_plan_reason_codes">Care Plan Reason Code Management</a>
                <a data-tab="specimen_sites">Specimen Site Management</a>
                <a data-tab="specimen_methods">Specimen Method Management</a>
                <a data-tab="specimen_types">Specimen Type Management</a>
                <a data-tab="specimen_conditions">Specimen Condition Management</a>
            </div>
        </div>
        ${role === "admin" ? `
        <div class="nav-dropdown">
            <span>Admin</span>
            <div class="dropdown-content">
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Practice
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="business_settings">Practice Settings</a>
                        <a data-tab="pharmacies">Pharmacies</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        General Setting
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="general_settings">Two Factor Authentication</a>
                    </div>
                </div>
            </div>
        </div>
        ` : ""}
        <a data-tab="settings">Settings</a>
        <a data-tab="help">Help</a>
    `;
}

const PATIENT_NAV_LINKS = `
    <a data-tab="appointments">Appointments</a>
    <div class="nav-dropdown">
        <span>Patient Health Records</span>
        <div class="dropdown-content">
            <a data-tab="health_records">Health Records Summary</a>
        </div>
    </div>
    <a data-tab="messaging">Messaging</a>
    <a data-tab="recalls">Recalls</a>

    <a data-tab="medications">Medications</a>
    <a data-tab="billing">Billing</a>
    <a data-tab="reports">Medical Reports</a>
    <a data-tab="documents">Documents</a>
    <a data-tab="profile">Profile</a>
    <a data-tab="settings">Settings</a>
    <a data-tab="help">Help</a>
`;

const DOCTOR_NAV_LINKS = `
    <a data-tab="appointments">Calendar</a>
    <a data-tab="patient_finder">Finder</a>
    <a data-tab="patient_flow">Flow</a>
    <a data-tab="recalls">Recalls</a>
    <a data-tab="messaging">Messages</a>
    <a data-tab="patients">Patients</a>
    <a data-tab="settings">Settings</a>
    <a data-tab="help">Help</a>
`;

function getNavLinks(role)
{
    if (role === "patient") return PATIENT_NAV_LINKS;
    if (role === "doctor") return DOCTOR_NAV_LINKS;
    return staffNavLinks(role);
}

export function DashboardView()
{
    const user = getUser();
    const navLinks = getNavLinks(user?.role);

    return `
<div class="dashboard-container">
    <nav class="top-navbar">
        <div class="navbar-logo">
            <img data-app-logo src="./assets/logo.png?v=1" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'28\\' height=\\'28\\'><rect width=\\'28\\' height=\\'28\\' fill=\\'%231d4ed8\\' rx=\\'4\\'/></svg>'">
            <span data-app-name>Intellix</span>
        </div>

        <div class="navbar-links" id="navbarLinks">
            ${navLinks}
        </div>

        <div class="navbar-right">
            <div class="nav-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="nav-search" placeholder="Search by any demographic...">
            </div>
            <div class="nav-profile nav-dropdown">
                <div class="avatar" id="avatarLetter">A</div>
                <div class="dropdown-content dropdown-right profile-dropdown">
                    <div class="profile-header">
                        <strong id="profileName">User Name</strong>
                        <div id="profileRole" style="text-transform: capitalize;">Role</div>
                    </div>
                    <hr>
                    <a data-tab="profile" style="cursor: pointer;">Profile</a>
                    <a data-tab="appearance" style="cursor: pointer;">Appearance</a>
                    <a data-tab="settings" style="cursor: pointer;">Settings</a>
                    <a id="logoutBtn" style="cursor: pointer; color: #dc2626;">Logout</a>
                </div>
            </div>
        </div>
    </nav>

    <div class="patient-context-bar" id="patientContextBar" style="display: none;">
        <div class="patient-context-photo" id="patientContextPhoto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>
        </div>
        <div class="patient-context-info">
            <div class="patient-context-name-row">
                <a href="#" id="patientContextName" class="patient-context-name">&nbsp;</a>
                <button type="button" class="patient-context-close" id="patientContextClose" aria-label="Clear selected patient">&times;</button>
            </div>
            <div class="patient-context-meta" id="patientContextMeta">&nbsp;</div>
        </div>
    </div>

    <div class="tab-bar" id="tabBar">
        <!-- Tabs will be rendered here dynamically -->
    </div>

    <main class="tab-content-area" id="tabContent">
        <!-- Active tab content goes here -->
    </main>
</div>

<div class="modal-overlay" id="logoutConfirmModalOverlay">
    <div class="modal-box logout-confirm-box">
        <button type="button" class="modal-close logout-confirm-close" id="closeLogoutConfirmModal">&times;</button>
        <div class="logout-confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <path d="M16 17l5-5-5-5"></path>
                <path d="M21 12H9"></path>
            </svg>
        </div>
        <h2 class="logout-confirm-title">Log Out</h2>
        <p class="logout-confirm-text">You're about to end your session. You'll need to sign in again to continue.</p>
        <div class="logout-confirm-actions">
            <button type="button" class="btn-secondary" id="cancelLogoutBtn">Cancel</button>
            <button type="button" class="logout-confirm-btn" id="confirmLogoutBtn">Log Out</button>
        </div>
    </div>
</div>
`;
}