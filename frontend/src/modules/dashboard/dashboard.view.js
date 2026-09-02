import { getUser } from "../../core/session.js";

function staffNavLinks(role)
{
    const appointmentsLink = ["admin", "receptionist"].includes(role)
        ? `<a data-tab="appointments">Calendar</a>`
        : "";

    return `
        ${appointmentsLink}
        <a data-tab="patient_finder">Finder</a>
        <a data-tab="patient_flow">Flow</a>
        <a data-tab="recalls">Recalls</a>
        <a data-tab="messaging">Messaging</a>
        <div class="nav-dropdown">
            <span>Patient</span>
            <div class="dropdown-content">
                <a data-tab="patients">New/Search</a>
                <a data-tab="patient_dashboard" class="patient-dependent-nav">Dashboard</a>
                <div class="dropdown-submenu patient-dependent-nav">
                    <span class="dropdown-submenu-trigger">
                        Visits
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="patient_create_visit">Create Visit</a>
                        <a data-tab="patient_current_visit">Current</a>
                        <a data-tab="patient_visits_history">Visit History</a>
                    </div>
                </div>
                <div class="dropdown-submenu patient-dependent-nav">
                    <span class="dropdown-submenu-trigger">
                        Records
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="patient_records_history">Patient History</a>
                        <a data-tab="patient_records_request">Patient Records Request</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Fees</span>
            <div class="dropdown-content">
                <a data-tab="fee_sheet">Fee Sheet</a>
                <a data-tab="payment">Payment</a>
                <a data-tab="checkout">Checkout</a>
                <a data-tab="billing_manager">Billing Manager</a>
                <a data-tab="batch_payments">Batch Payments</a>
                <a data-tab="posting_payments">Posting Payments</a>
                <a data-tab="edi_history">EDI History</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Modules</span>
            <div class="dropdown-content">
                <a data-tab="manage_modules">Manage Modules</a>
                <a data-tab="carecoordination">Carecoordination</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Procedures</span>
            <div class="dropdown-content">
                <a data-tab="providers">Providers</a>
                <a data-tab="procedure_configuration">Configuration</a>
                <a data-tab="procedure_load_compendium">Load Compendium</a>
                <a class="patient-dependent-nav" data-tab="procedure_pending_review">Pending Review</a>
                <a class="patient-dependent-nav" data-tab="procedure_patient_results">Patient Results</a>
                <a class="patient-dependent-nav" data-tab="procedure_lab_overview">Lab Overview</a>
                <a data-tab="procedure_batch_results">Batch Results</a>
                <a data-tab="procedure_electronic_reports">Electronic Reports</a>
                <a data-tab="procedure_lab_documents">Lab Documents</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Admin</span>
            <div class="dropdown-content">
                <a data-tab="settings">Config</a>
                ${role === "admin" ? `
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Clinic
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="facilities">Facilities</a>
                        <a data-tab="admin_clinic_calendar">Calendar</a>
                        <a data-tab="admin_clinic_import_holidays">Import Holidays</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Patients
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="admin_patient_reminders">Patient Reminders</a>
                        <a data-tab="admin_merge_patients">Merge Patients</a>
                        <a data-tab="admin_manage_duplicates">Manage Duplicates</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Practice
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="business_settings">Practice Settings</a>
                        <a data-tab="admin_practice_rules">Rules</a>
                        <a data-tab="admin_plans_configuration">Plans Configuration</a>
                        <a data-tab="admin_alert_manager">Alert Manager</a>
                        <a data-tab="admin_practice_alerts">Alerts</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Coding
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="codes">Codes</a>
                        <a data-tab="admin_coding_native_data_loads">Native Data Loads</a>
                        <a data-tab="admin_coding_external_data_loads">External Data Loads</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Forms
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="admin_forms_administration">Forms Administration</a>
                        <a data-tab="admin_forms_layouts">Layouts</a>
                        <a data-tab="admin_forms_lists">Lists</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Documents
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="admin_document_templates">Document Templates</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        System
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="admin_system_files">Files</a>
                        <a data-tab="admin_system_language">Language</a>
                        <a data-tab="admin_system_logs">Logs</a>
                        <a data-tab="admin_system_audit_log_tamper">Audit Log Tamper</a>
                        <a data-tab="admin_system_diagnostics">Diagnostics</a>
                        <a data-tab="admin_system_email_send_test">Email Send Test</a>
                        <a data-tab="admin_system_api_clients">API Clients</a>
                    </div>
                </div>
                ` : ""}
                <a data-tab="employees">Users</a>
                ${role === "admin" ? `<a data-tab="general_settings">Two Factor Authentication</a>` : ""}
                <a data-tab="admin_address_book">Address Book</a>
                ${role === "admin" ? `
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        ACL
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="role_management">Roles</a>
                        <a data-tab="admin_acl_administration">Access Control List Administration</a>
                    </div>
                </div>
                ` : ""}
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Reports</span>
            <div class="dropdown-content">
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Clients
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="clients_list">List</a>
                        <a data-tab="clients_rx">Rx</a>
                        <a data-tab="patient_list_creation">Patient List Creation</a>
                        <a data-tab="message_list">Message List</a>
                        <a data-tab="clinical_reports">Clinical</a>
                        <a data-tab="referrals_reports">Referrals</a>
                        <a data-tab="immunization_registry">Immunization Registry</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Clinic
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="clinic_report_results">Report Results</a>
                        <a data-tab="clinic_standard_measures">Standard Measures</a>
                        <a data-tab="clinic_automated_measures">Automated Measures (AMC)</a>
                        <a data-tab="clinic_real_world_testing">2026 Real World Testing Report</a>
                        <a data-tab="clinic_alerts_log">Alerts Log</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Visits
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="reports_visits_daily">Daily Report</a>
                        <a data-tab="reports_visits_appointments">Appointments</a>
                        <a data-tab="reports_visits_flow_board">Patient Flow Board</a>
                        <a data-tab="reports_visits_encounters">Encounters</a>
                        <a data-tab="reports_visits_appt_enc">Appt-Enc</a>
                        <a data-tab="reports_visits_superbill">Superbill</a>
                        <a data-tab="reports_visits_eligibility">Eligibility</a>
                        <a data-tab="reports_visits_eligibility_response">Eligibility Response</a>
                        <a data-tab="reports_visits_chart_activity">Chart Activity</a>
                        <a data-tab="reports_visits_charts_out">Charts Out</a>
                        <a data-tab="reports_visits_services">Services</a>
                        <a data-tab="reports_visits_syndromic_surveillance">Syndromic Surveillance</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Financial
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="reports_financial_sales">Sales</a>
                        <a data-tab="reports_financial_cash_rec">Cash Rec</a>
                        <a data-tab="reports_financial_front_rec">Front Rec</a>
                        <a data-tab="reports_financial_pmt_method">Pmt Method</a>
                        <a data-tab="reports_financial_collections">Collections and Aging</a>
                        <a data-tab="reports_financial_pat_ledger">Pat Ledger</a>
                        <a data-tab="reports_financial_summary_service_code">Financial Summary by Service Code</a>
                        <a data-tab="reports_financial_payment_processing">Payment Processing</a>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Procedures
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="reports_procedures_pending_res">Pending Res</a>
                        <a data-tab="reports_procedures_statistics">Statistics</a>
                    </div>
                </div>
                <a data-tab="insurance_reports">Insurance</a>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Blank Forms
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <div class="dropdown-submenu">
                            <span class="dropdown-submenu-trigger">
                                Core
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                            </span>
                            <div class="dropdown-submenu-content">
                                <a data-tab="blank_forms_core_demographics">Demographics</a>
                                <a data-tab="blank_forms_core_superbill">Superbill/Fee Sheet</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Services
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="services_background">Background Services</a>
                        <a data-tab="services_direct_message_log">Direct Message Log</a>
                        <a data-tab="services_ip_tracker">IP Tracker</a>
                    </div>
                </div>

            </div>
        </div>
        <div class="nav-dropdown">
            <span>Miscellaneous</span>
            <div class="dropdown-content">
                <a data-tab="misc_settings">Settings</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <span>Popups</span>
            <div class="dropdown-content">
                <a data-tab="popup_management">Management</a>
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
                        <a data-tab="cqm_source_of_payments">CQM Source of Payment</a>
                        <a data-tab="pos_codes">POS Code Management</a>
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
                <div class="dropdown-submenu">
                    <span class="dropdown-submenu-trigger">
                        Specimen
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    </span>
                    <div class="dropdown-submenu-content">
                        <a data-tab="specimen_sites">Specimen Site Management</a>
                        <a data-tab="specimen_methods">Specimen Method Management</a>
                        <a data-tab="specimen_types">Specimen Type Management</a>
                        <a data-tab="specimen_conditions">Specimen Condition Management</a>
                    </div>
                </div>
                <a data-tab="preference_types">Preference Type</a>
                <a data-tab="surgeries">Surgeries</a>
                <a data-tab="void_reasons">Void Reason Management</a>
                <a data-tab="care_plan_reason_codes">Care Plan Reason Code Management</a>
                <div class="dropdown-section-label">Procedures</div>
                <a data-tab="provider_categories">Provider Categories</a>
                <a data-tab="visit_categories">Visit Categories</a>
                <a data-tab="screening_tools">Screening Tools</a>
                <a data-tab="classes">Classes</a>
                <a data-tab="visit_types">Visit Type</a>
                <a data-tab="facilities">Facility</a>
                <a data-tab="facility_billings">Facility Billing</a>
                <a data-tab="vendor_management">Vendor Management</a>
                <a data-tab="container_group_management">Container Group Name Management</a>
                <a data-tab="allergies">Allergy Management</a>
                <a data-tab="medical_problems">Medical Problem Management</a>
                <a data-tab="medication_management">Medication Management</a>
                <a data-tab="prescription_categories">Prescription Categories</a>
                <a data-tab="payer_types">Payer Type Management</a>
                <a data-tab="x12_partners">X12 Partner</a>
                <a data-tab="insurances">Insurance Management</a>
                <a data-tab="organization_types">Organization Type Registration</a>
                <a data-tab="price_levels">Price Level Management</a>
            </div>
        </div>
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

const RECEPTIONIST_NAV_LINKS = `
    <a data-tab="appointments">Calendar</a>
    <a data-tab="patient_finder">Finder</a>
    <a data-tab="patient_flow">Flow</a>
    <a data-tab="recalls">Recalls</a>
    <div class="nav-dropdown">
        <span>Patient</span>
        <div class="dropdown-content">
            <a data-tab="patients">New/Search</a>
            <a data-tab="patient_dashboard" class="patient-dependent-nav">Dashboard</a>
            <div class="dropdown-submenu patient-dependent-nav">
                <span class="dropdown-submenu-trigger">
                    Visits
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </span>
                <div class="dropdown-submenu-content">
                    <a data-tab="patient_create_visit">Create Visit</a>
                    <a data-tab="patient_current_visit">Current</a>
                    <a data-tab="patient_visits_history">Visit History</a>
                </div>
            </div>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Reports</span>
        <div class="dropdown-content">
            <div class="dropdown-submenu">
                <span class="dropdown-submenu-trigger">
                    Visits
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </span>
                <div class="dropdown-submenu-content">
                    <a data-tab="reports_visits_daily">Daily Report</a>
                    <a data-tab="reports_visits_appointments">Appointments</a>
                    <a data-tab="reports_visits_flow_board">Patient Flow Board</a>
                    <a data-tab="reports_visits_eligibility">Eligibility</a>
                    <a data-tab="reports_visits_eligibility_response">Eligibility Response</a>
                    <a data-tab="reports_visits_charts_out">Charts Out</a>
                </div>
            </div>
            <div class="dropdown-submenu">
                <span class="dropdown-submenu-trigger">
                    Financial
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </span>
                <div class="dropdown-submenu-content">
                    <a data-tab="reports_financial_front_rec">Front Rec</a>
                    <a data-tab="reports_financial_cash_rec">Cash Rec</a>
                    <a data-tab="reports_financial_pmt_method">Pmt Method</a>
                </div>
            </div>
            <a data-tab="insurance_reports">Insurance</a>
            <a data-tab="patient_list_creation">Patient List Creation</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Miscellaneous</span>
        <div class="dropdown-content">
            <a data-tab="misc_settings">Settings</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Popups</span>
        <div class="dropdown-content">
            <a data-tab="popup_management">Management</a>
        </div>
    </div>
`;

const DOCTOR_NAV_LINKS = `
    <a data-tab="appointments">Calendar</a>
    <div class="nav-dropdown">
        <span>Patient</span>
        <div class="dropdown-content">
            <a data-tab="patients">New/Search</a>
            <a data-tab="patient_finder">Dashboard</a>
            <div class="dropdown-submenu">
                <span class="dropdown-submenu-trigger">
                    Visits
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </span>
                <div class="dropdown-submenu-content">
                    <a data-tab="patient_flow">Flow</a>
                    <a data-tab="appointments">Appointments</a>
                </div>
            </div>
            <div class="dropdown-submenu">
                <span class="dropdown-submenu-trigger">
                    Records
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </span>
                <div class="dropdown-submenu-content">
                    <a data-tab="health_records">Health Records</a>
                    <a data-tab="medications">Medications</a>
                    <a data-tab="documents">Documents</a>
                </div>
            </div>
        </div>
    </div>
    <a data-tab="patient_flow">Flow</a>
    <a data-tab="recalls">Recalls</a>
    <a data-tab="messaging">Messages</a>
    <a data-tab="settings">Settings</a>
    <a data-tab="help">Help</a>
`;

function getNavLinks(role)
{
    if (role === "patient") return PATIENT_NAV_LINKS;
    if (role === "doctor") return DOCTOR_NAV_LINKS;
    if (role === "receptionist") return RECEPTIONIST_NAV_LINKS;
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