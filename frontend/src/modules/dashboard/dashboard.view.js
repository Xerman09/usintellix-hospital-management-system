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
        ${role === "admin" ? `<a data-tab="business_settings">Business Information</a>` : ""}
        <div class="nav-dropdown">
            <span>Procedures</span>
            <div class="dropdown-content">
                <a data-tab="providers">Providers</a>
                <a data-tab="provider_categories">Provider Categories</a>
                <a data-tab="visit_categories">Visit Categories</a>
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
            </div>
        </div>
        <div class="nav-dropdown">
            <span>File Management</span>
            <div class="dropdown-content">
                <div class="dropdown-section-label">Code</div>
                <a data-tab="icd10_diagnoses">ICD10 Diagnosis</a>
                <a data-tab="cvx_codes">CVX Immunization Codes</a>
                <a data-tab="cqm_valuesets">CQM Valueset</a>
                <a data-tab="preference_types">Preference Type</a>
            </div>
        </div>
        
    `;
}

const PATIENT_NAV_LINKS = `
    <a data-tab="appointments">Calendar</a>
    <div class="nav-dropdown">
        <span>Patient Health Records</span>
        <div class="dropdown-content">
            <a data-tab="health_records">Health Records Summary</a>
        </div>
    </div>
    <a data-tab="messaging">Messaging</a>
    <a data-tab="recalls">Recalls</a>

    <a data-tab="laboratory">Laboratory</a>
    <a data-tab="medications">Medications</a>
    <a data-tab="billing">Billing</a>
    <a data-tab="documents">Documents</a>
`;

const DOCTOR_NAV_LINKS = `
    <a data-tab="patient_finder">Finder</a>
    <a data-tab="patients">Patients</a>
    <a data-tab="appointments">Calendar</a>
    <a data-tab="messaging">Messaging</a>
    <a data-tab="recalls">Recalls</a>
    <a data-tab="patient_flow">Flow</a>
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
            <input type="text" class="nav-search" placeholder="Search by any demographic...">
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

    <div class="tab-bar" id="tabBar">
        <!-- Tabs will be rendered here dynamically -->
    </div>

    <main class="tab-content-area" id="tabContent">
        <!-- Active tab content goes here -->
    </main>
</div>
`;
}