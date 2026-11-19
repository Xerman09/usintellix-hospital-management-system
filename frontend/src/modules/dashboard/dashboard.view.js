import { getUser } from "../../core/session.js?v=5";

function buildSplitMenu(menuId, filterPlaceholder, sections)
{
    const visibleSections = sections.filter((s) => s && s.links && s.links.trim().length > 0);
    if (!visibleSections.length) return "";

    const tabsHtml = visibleSections.map((s, idx) => {
        const count = (s.links.match(/<a\b/g) || []).length;
        return `
            <button type="button" class="nav-split-tab${idx === 0 ? " is-active" : ""}" data-split-target="${menuId}-${s.id}">
                <span class="nav-split-tab-label">${s.label}</span>
                <span class="nav-split-tab-count">${count}</span>
            </button>`;
    }).join("");

    const panesHtml = visibleSections.map((s, idx) => {
        const count = (s.links.match(/<a\b/g) || []).length;
        const gridClass = count > 6 ? "nav-split-grid two-col" : "nav-split-grid";
        return `
            <div class="nav-split-pane${idx === 0 ? " is-active" : ""}" data-split-pane="${menuId}-${s.id}" data-section-name="${s.label}">
                <div class="nav-split-pane-header">${s.label}</div>
                <div class="${gridClass}">
                    ${s.links}
                </div>
            </div>`;
    }).join("");

    return `
        <div class="dropdown-content nav-split-menu" data-split-menu="${menuId}">
            <div class="nav-split-sidebar" role="tablist">
                ${tabsHtml}
            </div>
            <div class="nav-split-body">
                <div class="nav-split-search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" class="nav-split-filter" placeholder="${filterPlaceholder}" autocomplete="off">
                </div>
                <div class="nav-split-panes">
                    ${panesHtml}
                    <div class="nav-split-search-results" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;
}

function staffNavLinks(role)
{
    const clinicalMenu = buildSplitMenu("clinical", "Filter clinical pages...", [
        {
            id: "access",
            label: "Patient Access & Flow",
            links: `
                <a data-tab="patient_finder">Patient Finder</a>
                <a data-tab="patients">New / Search Patients</a>
                <a data-tab="patient_flow">Patient Flow Board</a>
                ${role === "admin" ? `<a data-tab="portal_checkins">Online Check-ins</a>` : ""}
                ${role === "admin" ? `<a data-tab="portal_proxy_requests">Record Access Requests</a>` : ""}
            `
        },
        {
            id: "inpatient",
            label: "Inpatient & ER",
            links: `
                <a data-tab="inpatient_admissions">Inpatient Bed Management (ADT)</a>
                <a data-tab="er">Emergency Room (ER)</a>
                ${["admin", "receptionist", "doctor", "clinician", "charge_nurse"].includes(role) ? `<a data-tab="er_report">ER Report</a>` : ""}
                <a data-tab="icu">ICU Flowsheet</a>
                ${["admin", "doctor", "clinician", "charge_nurse"].includes(role) ? `<a data-tab="icu_report">ICU Report</a>` : ""}
                <a data-tab="inpatient_vitals">Inpatient Vital Signs</a>
                <a data-tab="nurse_assignments">Nursing Shift Assignments</a>
                <a data-tab="room_management">Rooms &amp; Bed Availability</a>
                <a data-tab="census">Daily Census</a>
                ${["admin", "receptionist", "doctor", "clinician", "charge_nurse", "accountant"].includes(role) ? `<a data-tab="census_report">Census Reports</a>` : ""}
                <a data-tab="visitor_management">Visitor Passes &amp; Registry</a>
            `
        },
        {
            id: "surgery",
            label: "Surgery & Acute Care",
            links: `
                <a data-tab="or_board">OR Live Board</a>
                <a data-tab="or_schedule">OR Surgical Schedule</a>
                <a data-tab="or_management">Operating Room (OR) Management</a>
                <a data-tab="surgery_requests">Surgery Requests</a>
                <a data-tab="or_reports">OR Operative Reports</a>
                <a data-tab="code_blue">Code Blue Resuscitation</a>
                ${["admin", "clinician"].includes(role) ? `<a data-tab="code_blue_report">Code Blue Report</a>` : ""}
                <a data-tab="carecoordination">Care Coordination</a>
            `
        },
        {
            id: "chart",
            label: "Active Patient Chart",
            links: `
                <a data-tab="patient_dashboard" class="patient-dependent-nav">Patient Dashboard</a>
                <a data-tab="clinical_reminders" class="patient-dependent-nav">Clinical Reminders</a>
                <a data-tab="patient_create_visit" class="patient-dependent-nav">Create Encounter</a>
                <a data-tab="patient_current_visit" class="patient-dependent-nav">Current Encounter</a>
                <a data-tab="patient_visits_history" class="patient-dependent-nav">Visit History</a>
                <a data-tab="patient_records_history" class="patient-dependent-nav">Medical History</a>
                <a data-tab="patient_records_request" class="patient-dependent-nav">Records Request</a>
            `
        }
    ]);

    const diagnosticsMenu = buildSplitMenu("diagnostics", "Filter lab & imaging...", [
        {
            id: "lab",
            label: "Laboratory",
            links: `
                <a data-tab="lab_worklist">Lab Worklist</a>
                <a data-tab="lab_report">Lab Test Reports</a>
                <a data-tab="procedure_lab_overview" class="patient-dependent-nav">Lab Overview</a>
                <a data-tab="procedure_batch_results">Batch Results Entry</a>
                <a data-tab="procedure_electronic_reports">Electronic Lab Reports</a>
                <a data-tab="procedure_lab_documents">Diagnostic Documents</a>
                ${role === "admin" ? `<a data-tab="lab_critical_ranges">Critical Alert Ranges</a>` : ""}
                <a data-tab="procedure_load_compendium">Load Lab Compendium</a>
                <a data-tab="procedure_pending_review" class="patient-dependent-nav">Pending Reviews</a>
                <a data-tab="procedure_patient_results" class="patient-dependent-nav">Patient Results</a>
            `
        },
        {
            id: "radiology",
            label: "Radiology & Services",
            links: `
                <a data-tab="rad_worklist">Radiology Worklist</a>
                <a data-tab="rad_report">Radiology Diagnostic Reports</a>
                <a data-tab="misc_dicom_viewer">DICOM Imaging Viewer</a>
                ${["admin", "doctor", "clinician", "nurse", "lab_technician"].includes(role) ? `<a data-tab="blood_bank">Blood Bank &amp; Donors</a>` : ""}
                ${["admin", "doctor", "clinician", "nurse", "dietitian"].includes(role) ? `<a data-tab="dietary">Dietary &amp; Nutrition Services</a>` : ""}
                <a data-tab="providers">Diagnostic Providers</a>
                <a data-tab="procedure_configuration">Procedure Configuration</a>
            `
        }
    ]);

    const pharmacyMenu = buildSplitMenu("pharmacy", "Filter pharmacy & stock...", [
        {
            id: "ops",
            label: "Dispensing & MAR",
            links: `
                ${["admin", "receptionist", "doctor", "accountant"].includes(role) ? `<a data-tab="pharmacy_dashboard">Pharmacy Dashboard</a>` : ""}
                ${["admin", "receptionist", "doctor"].includes(role) ? `<a data-tab="pharmacy_dispensing">Prescription Dispensing</a>` : ""}
                ${["admin", "receptionist", "doctor"].includes(role) ? `<a data-tab="pharmacy_reports">Pharmacy Reports</a>` : ""}
                <a data-tab="med_verification">Medication Order Verification</a>
                <a data-tab="mar">Medication Rounds (MAR)</a>
                <a data-tab="dd_register">DD Controlled Drug Register</a>
                <a data-tab="ward_cabinet">Ward Dispensing Cabinets</a>
                <a data-tab="restock_queue">Cabinet Restock Requests</a>
                <a data-tab="ward_stock_report">Ward Stock Report</a>
            `
        },
        {
            id: "catalog",
            label: "Catalog & Inventory",
            links: `
                <a data-tab="inventory_management">Drug Catalog &amp; Stock</a>
                <a data-tab="supply_catalog">Non-Pharma Supply Catalog</a>
                ${role === "admin" ? `<a data-tab="medication_management">Clinical Formulary</a>` : ""}
                <a data-tab="goods_receipt">Goods Receipt Notes (GRN)</a>
                <a data-tab="cssd">CSSD Instrument Sets &amp; Trays</a>
                <a data-tab="inventory_warehouses">Storage Locations</a>
                <a data-tab="inventory_destroyed">Destroyed &amp; Expired Drugs</a>
            `
        },
        {
            id: "procurement",
            label: "Procurement & Vendors",
            links: `
                <a data-tab="pharmacy_requisitions">Purchase Requests</a>
                <a data-tab="pharmacy_purchase_orders">Purchase Orders (PO)</a>
                <a data-tab="pharmacy_receiving">Inward Receiving</a>
                <a data-tab="pharmacy_suppliers">Suppliers &amp; Vendors</a>
                <a data-tab="pharmacy_supplier_prices">Supplier Contract Prices</a>
                <a data-tab="pharmacy_supplier_invoices">Supplier Invoices</a>
                <a data-tab="pharmacy_supplier_returns">Supplier Returns</a>
                ${["admin", "accountant"].includes(role) ? `<a data-tab="pharmacy_payables">Accounts Payable</a>` : ""}
            `
        },
        ["admin", "receptionist", "doctor", "accountant"].includes(role) ? {
            id: "audits",
            label: "Stock Control & Audits",
            links: `
                <a data-tab="pharmacy_stock_transfers">Stock Transfers</a>
                <a data-tab="pharmacy_medicine_ledger">Medicine Transaction Ledger</a>
                <a data-tab="pharmacy_lot_trace">Lot &amp; Batch Tracing</a>
                <a data-tab="pharmacy_stock_levels">Stock Levels &amp; Par</a>
                <a data-tab="pharmacy_stock_counts">Physical Stock Count</a>
                <a data-tab="pharmacy_procurement_reports">Procurement Reports</a>
            `
        } : null,
        role === "admin" ? {
            id: "setup",
            label: "Pharmacy Setup",
            links: `
                <a data-tab="dosage_forms">Dosage Forms</a>
                <a data-tab="drug_categories">Drug Categories</a>
                <a data-tab="administration_routes">Administration Routes</a>
                <a data-tab="amount_units">Amount Units</a>
            `
        } : null
    ]);

    const billingMenu = buildSplitMenu("billing", "Filter billing & finance...", [
        {
            id: "cashiering",
            label: "Cashiering & Charges",
            links: `
                <a data-tab="inpatient_billing">Inpatient Master Folio &amp; Cashier</a>
                <a data-tab="split_cashiering">Split-Tender Cashiering</a>
                <a data-tab="patient_deposits">Advance Deposits &amp; Drawdowns</a>
                <a data-tab="fee_sheet" class="patient-dependent-nav">Clinical Fee Sheet</a>
                <a data-tab="checkout" class="patient-dependent-nav">Outpatient Checkout</a>
                <a data-tab="payment">Collect Payment</a>
                <a data-tab="portal_payments">Online Patient Payments</a>
                <a data-tab="batch_payments">Batch Payments</a>
                <a data-tab="posting_payments">ERA / EOB Payment Posting</a>
                <a data-tab="refund_authorization">Refund Authorization Pipeline</a>
            `
        },
        {
            id: "rcm",
            label: "Claims & Revenue Cycle",
            links: `
                <a data-tab="billing_manager">Billing &amp; Claims Manager</a>
                <a data-tab="claim_denials">Claim Denial &amp; Appeals</a>
                <a data-tab="ar_aging">AR Aging &amp; Collections Engine</a>
                <a data-tab="tariff_master">Master Tariff Book &amp; Packages</a>
                <a data-tab="facility_billings">Facility Billing</a>
                <a data-tab="edi_history">EDI Claims History</a>
            `
        }
    ]);

    const reportsMenu = buildSplitMenu("reports", "Filter all reports...", [
        {
            id: "executive",
            label: "Executive & BI",
            links: `
                <a data-tab="clinic_quality_dashboard">Clinical Quality &amp; Utilization</a>
                <a data-tab="clinic_safety_scorecard">Executive Quality Scorecard</a>
                <a data-tab="reports_financial_bi">Executive Financial &amp; BI (RevPAB)</a>
                <a data-tab="reports_departmental_profitability">Departmental Profitability</a>
                <a data-tab="reports_claim_denial_pareto">Claim Denial Rate &amp; Pareto</a>
            `
        },
        {
            id: "financial",
            label: "Financial Reports",
            links: `
                <a data-tab="reports_financial_sales">Sales &amp; Revenue Realization</a>
                <a data-tab="reports_financial_cash_rec">Cash Reconciliation Summary</a>
                <a data-tab="reports_financial_collections">Collections &amp; Aging Buckets</a>
                <a data-tab="reports_financial_summary_service_code">Revenue by Service Code</a>
                <a data-tab="reports_financial_payment_processing">Payment Processing Report</a>
                <a data-tab="reports_financial_prepayment_balances">Prepayment Balances</a>
                <a data-tab="reports_financial_pat_ledger">Patient Billing Ledger</a>
                <a data-tab="reports_financial_front_rec">Front Desk Receipts</a>
                <a data-tab="reports_financial_pmt_method">Payment Method Analysis</a>
            `
        },
        {
            id: "clinical",
            label: "Clinical & Safety",
            links: `
                <a data-tab="clinical_reports">Clinical Practice Reports</a>
                <a data-tab="clinic_incident_log">Incident &amp; Adverse Events Log</a>
                <a data-tab="clinic_critical_tat">Critical Diagnostic TAT</a>
                <a data-tab="clinic_hai_ssi">HAI &amp; SSI Infections</a>
                <a data-tab="clinic_readmission_mortality">30-Day Readmission &amp; Mortality</a>
                <a data-tab="clinic_surgical_safety">Surgical Safety &amp; Time-Out</a>
                <a data-tab="clinic_alerts_log">Clinical Alerts &amp; Escalations</a>
                <a data-tab="clinic_report_results">Standard Measures &amp; CQM</a>
                <a data-tab="clinic_standard_measures">Standard Measures</a>
                <a data-tab="clinic_automated_measures">Automated Measures (AMC)</a>
                <a data-tab="clinic_real_world_testing">ONC Real World Testing Report</a>
            `
        },
        {
            id: "regulatory",
            label: "Regulatory & Public Health",
            links: `
                <a data-tab="regulatory_disease_surveillance">Notifiable Disease Surveillance</a>
                <a data-tab="regulatory_ahsr_export">Annual Hospital Report (AHSR)</a>
                <a data-tab="immunization_registry">Public Immunization Registry</a>
                <a data-tab="safe_harbor">Safe Harbor De-ID Export (§ 164.514)</a>
            `
        },
        {
            id: "visits",
            label: "Visits & Encounters",
            links: `
                <a data-tab="reports_visits_daily">Daily Activity Report</a>
                <a data-tab="reports_visits_encounters">Encounters by Department</a>
                <a data-tab="reports_visits_appointments">Appointment Statistics</a>
                <a data-tab="reports_visits_flow_board">Patient Flow Board Analytics</a>
                <a data-tab="reports_visits_chart_activity">Medical Chart Activity</a>
                <a data-tab="reports_visits_charts_out">Charts Out Tracker</a>
                <a data-tab="reports_visits_services">Services Utilization</a>
                <a data-tab="reports_visits_superbill">Superbill Encounters</a>
                <a data-tab="reports_visits_eligibility">Insurance Eligibility</a>
                <a data-tab="reports_visits_eligibility_response">Eligibility Responses</a>
                <a data-tab="reports_visits_syndromic_surveillance">Syndromic Surveillance</a>
                <a data-tab="reports_visits_appt_enc">Appt-Encounter Correlation</a>
            `
        },
        {
            id: "operations",
            label: "Inventory & Registries",
            links: `
                <a data-tab="reports_inventory_list">Inventory Stock Valuation</a>
                <a data-tab="reports_inventory_activity">Stock Movement Activity</a>
                <a data-tab="reports_inventory_transactions">Inventory Transactions</a>
                <a data-tab="clients_list">Patient &amp; Client Registry</a>
                <a data-tab="clients_rx">Prescription Registry</a>
                <a data-tab="patient_list_creation">Patient Cohort Builder</a>
                <a data-tab="message_list">Clinical Message Logs</a>
                <a data-tab="referrals_reports">Referral Tracking</a>
                <a data-tab="reports_procedures_pending_res">Pending Procedure Results</a>
                <a data-tab="reports_procedures_statistics">Procedure Statistics</a>
                <a data-tab="reports_insurance_distribution">Payer Mix Distribution</a>
                <a data-tab="reports_insurance_indigents">Indigent Patient Care</a>
                <a data-tab="reports_insurance_unique_sp">Unique Service Providers</a>
                <a data-tab="services_background">Background Services</a>
                <a data-tab="services_direct_message_log">Direct Messaging Audit</a>
                <a data-tab="services_ip_tracker">Network IP Tracker</a>
            `
        }
    ]);

    const adminMenu = buildSplitMenu("admin", "Filter admin & settings...", [
        {
            id: "hospital",
            label: "Hospital & Facilities",
            links: `
                <a data-tab="facilities">Facilities &amp; Campuses</a>
                <a data-tab="room_management">Buildings, Rooms &amp; Beds</a>
                <a data-tab="department_management">Department Hierarchy</a>
                <a data-tab="department_org">Department Org Mapping</a>
                <a data-tab="equipment_assets">Biomedical &amp; Capital Assets</a>
                <a data-tab="display_devices">TV Displays &amp; Waiting Queues</a>
                <a data-tab="business_settings">Hospital &amp; Practice Settings</a>
                ${role === "admin" ? `<a data-tab="global_settings">Global System Settings</a>` : ""}
                <a data-tab="settings">System Configuration</a>
                ${role === "admin" ? `<a data-tab="general_settings">Two-Factor Authentication</a>` : ""}
            `
        },
        {
            id: "hr",
            label: "Workforce & HR",
            links: `
                <a data-tab="employees">Staff Directory &amp; Users</a>
                ${role === "admin" ? `<a data-tab="role_management">Roles &amp; Permissions (RBAC)</a>` : ""}
                ${role === "admin" ? `<a data-tab="nursing_staff">Nursing Staff &amp; Ward Mapping</a>` : ""}
                <a data-tab="attendance">Staff Attendance Time Clock</a>
                <a data-tab="leave_management">Staff Leaves &amp; Coverage</a>
                <a data-tab="duty_rosters">Doctor On-Call &amp; Duty Rosters</a>
                <a data-tab="salary_structures">Staff Salary Structures</a>
                <a data-tab="payroll">Hospital Payroll &amp; Payslips</a>
                <a data-tab="cme">CME / CPD Medical Education Ledger</a>
                <a data-tab="life_support">Clinical Certifications (BLS/ACLS)</a>
                <a data-tab="performance_evaluations">Performance Appraisals &amp; Rubrics</a>
                <a data-tab="admin_address_book">System Address Book</a>
            `
        },
        {
            id: "hipaa",
            label: "HIPAA & Security",
            links: `
                <a data-tab="hipaa_officers">HIPAA Officers (§ 164.530 / § 164.308)</a>
                <a data-tab="hipaa_audit">HIPAA Audit Logs &amp; Integrity</a>
                <a data-tab="audit_trail_diffs">Granular Change Diffs</a>
                <a data-tab="security_incidents">Security Incidents &amp; Breach Response</a>
                <a data-tab="business_associates">BAA Vendor Registry (§ 164.502(e))</a>
                <a data-tab="drs_requests">Right of Access (DRS Pipeline § 164.524)</a>
                <a data-tab="amendments">Medical Record Amendments (§ 164.526)</a>
                <a data-tab="backup_recovery">Backup &amp; Disaster Recovery (§ 164.308)</a>
                <a data-tab="workforce_governance">Workforce HIPAA Training Log</a>
            `
        },
        {
            id: "coding",
            label: "Clinical Dictionaries",
            links: `
                <a data-tab="codes">Master Coding System</a>
                <a data-tab="icd10_diagnoses">ICD-10 Clinical Diagnoses</a>
                <a data-tab="cvx_codes">CVX Vaccine Codes</a>
                <a data-tab="cqm_valuesets">CQM Value Sets</a>
                <a data-tab="cqm_source_of_payments">CQM Source of Payment</a>
                <a data-tab="pos_codes">POS Code Management</a>
                <a data-tab="immunizations">Immunization Registry Setup</a>
                <a data-tab="surgeries">Surgical Procedures Catalog</a>
                <a data-tab="allergies">Allergies Master Catalog</a>
                <a data-tab="medical_problems">Problem List Master</a>
                <a data-tab="specializations">Medical Specializations</a>
                <a data-tab="preference_types">Clinical Preference Types</a>
                <a data-tab="void_reasons">Void Reasons Management</a>
                <a data-tab="care_plan_reason_codes">Care Plan Reason Codes</a>
                <a data-tab="specimen_sites">Specimen Sites</a>
                <a data-tab="specimen_methods">Specimen Methods</a>
                <a data-tab="specimen_types">Specimen Types</a>
                <a data-tab="specimen_conditions">Specimen Conditions</a>
            `
        },
        {
            id: "lookups",
            label: "Operations & Payers",
            links: `
                <a data-tab="provider_categories">Provider Categories</a>
                <a data-tab="visit_categories">Visit Categories</a>
                <a data-tab="visit_types">Visit Types</a>
                <a data-tab="screening_tools">Screening Tools</a>
                <a data-tab="classes">Patient Classes</a>
                <a data-tab="payer_types">Payer Types</a>
                <a data-tab="insurances">Insurance Providers &amp; Plans</a>
                <a data-tab="x12_partners">EDI Clearinghouses &amp; X12 Partners</a>
                <a data-tab="vendor_management">Vendor Directory</a>
                <a data-tab="container_group_management">Container Groups</a>
                <a data-tab="prescription_categories">Prescription Categories</a>
                <a data-tab="organization_types">Organization Types</a>
                <a data-tab="price_levels">Price Level Management</a>
                <a data-tab="information_sources">Information Sources</a>
                <a data-tab="refusal_reasons">Refusal Reasons</a>
                <a data-tab="completion_statuses">Completion Statuses</a>
                <a data-tab="administration_sites">Administration Sites</a>
            `
        },
        role === "admin" ? {
            id: "system",
            label: "System & Logs",
            links: `
                <a data-tab="admin_system_diagnostics">System Diagnostics</a>
                <a data-tab="admin_system_logs">System Server Logs</a>
                <a data-tab="admin_system_audit_log_tamper">Audit Log Tamper Detector</a>
                <a data-tab="admin_system_api_clients">API Clients &amp; Tokens</a>
                <a data-tab="admin_system_email_send_test">Email Send Test</a>
                <a data-tab="admin_system_files">System File Manager</a>
                <a data-tab="admin_system_language">Language Settings</a>
                <a data-tab="system_documentation">System Documentation</a>
                <a data-tab="admin_acl_administration">ACL Administration</a>
                <a data-tab="manage_modules">Manage Modules</a>
                <a data-tab="admin_merge_patients">Merge Patients</a>
                <a data-tab="admin_manage_duplicates">Manage Duplicates</a>
            `
        } : null,
        role === "admin" ? {
            id: "forms",
            label: "Forms, Rules & Data",
            links: `
                <a data-tab="template_maintenance">Template Maintenance</a>
                <a data-tab="admin_document_templates">Document Templates</a>
                <a data-tab="admin_forms_administration">Forms Administration</a>
                <a data-tab="admin_forms_layouts">Form Layouts</a>
                <a data-tab="admin_forms_lists">Form Lists</a>
                <a data-tab="admin_practice_rules">Practice Rules</a>
                <a data-tab="admin_plans_configuration">Plans Configuration</a>
                <a data-tab="admin_alert_manager">Alert Manager</a>
                <a data-tab="admin_practice_alerts">Practice Alerts</a>
                <a data-tab="admin_coding_native_data_loads">Native Data Loads</a>
                <a data-tab="admin_coding_external_data_loads">External Data Loads</a>
            `
        } : null
    ]);

    const toolsMenu = buildSplitMenu("tools", "Filter tools & utilities...", [
        {
            id: "quick",
            label: "Messaging & Actions",
            links: `
                <a data-tab="messaging">Internal Staff Messaging</a>
                <a data-tab="popup_issues" class="patient-dependent-nav">Clinical Issues &amp; Allergies</a>
                <a data-tab="popup_appointments" class="patient-dependent-nav">Quick Appointments</a>
                <a data-tab="popup_superbill" class="patient-dependent-nav">Quick Superbill</a>
                <a data-tab="popup_payment" class="patient-dependent-nav">Quick Payment</a>
                <a data-tab="popup_checkout" class="patient-dependent-nav">Quick Checkout</a>
                <a data-tab="popup_chart_label" class="patient-dependent-nav">Patient Chart Labels</a>
                <a data-tab="popup_barcode_label" class="patient-dependent-nav">Specimen Barcode Labels</a>
                <a data-tab="popup_address_label" class="patient-dependent-nav">Patient Address Labels</a>
                <a data-tab="popup_letter" class="patient-dependent-nav">Patient Letters &amp; Referrals</a>
                <a data-tab="popup_export" class="patient-dependent-nav">Chart Data Export</a>
                <a data-tab="popup_import" class="patient-dependent-nav">External Data Import</a>
            `
        },
        {
            id: "office",
            label: "Office & Governance",
            links: `
                <a data-tab="misc_announcements">Hospital Announcements</a>
                <a data-tab="misc_office_notes">Department Office Notes</a>
                <a data-tab="misc_authorizations">Prior Authorizations Log</a>
                <a data-tab="misc_chart_tracker">Physical Chart Paper Tracker</a>
                <a data-tab="misc_patient_education">Patient Education Handouts</a>
                <a data-tab="misc_disclosures">Accounting of Disclosures</a>
                <a data-tab="misc_security_incidents">Security Incidents &amp; Breach Assessment</a>
                <a data-tab="misc_batch_com">Batch Communication Tool</a>
                <a data-tab="misc_new_documents">New Documents Queue</a>
                <a data-tab="misc_portal_dashboard">Patient Portal Dashboard</a>
            `
        },
        {
            id: "portal",
            label: "Patient Portal Tools",
            links: `
                ${role === "admin" ? `<a data-tab="portal_explanations">Patient Test Explanations</a>` : ""}
                ${["admin", "doctor", "clinician", "nurse"].includes(role) ? `<a data-tab="portal_diagnosis_guides">Diagnosis Guides</a>` : ""}
                ${["admin", "receptionist", "doctor", "clinician", "nurse"].includes(role) ? `
                <a data-tab="portal_uploads">Patient Document Uploads</a>
                <a data-tab="portal_insurance_requests">Insurance Card Requests</a>
                <a data-tab="portal_questionnaires">Intake Questionnaires</a>
                <a data-tab="portal_care_gaps">Health Maintenance Gaps</a>
                <a data-tab="portal_estimates">Cost Estimates</a>
                <a data-tab="portal_fastpass">FastPass Appointment Slots</a>` : ""}
                ${["admin", "doctor", "clinician", "nurse"].includes(role) ? `
                <a data-tab="portal_evisits">Online E-Visits</a>
                <a data-tab="portal_chart">Patient Health Record View</a>` : ""}
                ${["admin", "doctor", "clinician", "nurse", "charge_nurse", "cna"].includes(role) ? `
                <a data-tab="portal_reading_imports">Imported Health Readings</a>` : ""}
            `
        },
        {
            id: "forms",
            label: "Blank Forms & Help",
            links: `
                <a data-tab="blank_forms_core_demographics">Blank Demographics Form</a>
                <a data-tab="blank_forms_core_superbill">Blank Superbill / Fee Sheet Form</a>
                <a data-tab="misc_blank_forms_referral">Referral Request Form</a>
                <a data-tab="help">Help &amp; Documentation</a>
            `
        }
    ]);

    return `
        <div class="nav-dropdown">
            <span>Clinical</span>
            ${clinicalMenu}
        </div>

        <div class="nav-dropdown">
            <span>Scheduling</span>
            <div class="dropdown-content">
                <div class="dropdown-section-label">Appointments &amp; Calendars</div>
                <a data-tab="appointments">Master Calendar</a>
                <a data-tab="clinic_schedules">Clinic Operating Schedules</a>
                <a data-tab="duty_rosters">Doctor On-Call &amp; Duty Rosters</a>
                <a data-tab="recalls">Preventive Care Recalls</a>
                ${role === "admin" ? `<a data-tab="admin_clinic_calendar">Facility Calendar</a>` : ""}
                ${role === "admin" ? `<a data-tab="admin_clinic_import_holidays">Import Holidays</a>` : ""}
                ${role === "admin" ? `<a data-tab="admin_patient_reminders">Patient Automated Reminders</a>` : ""}
            </div>
        </div>

        <div class="nav-dropdown">
            <span>Diagnostics</span>
            ${diagnosticsMenu}
        </div>

        <div class="nav-dropdown">
            <span>Pharmacy</span>
            ${pharmacyMenu}
        </div>

        <div class="nav-dropdown">
            <span>Billing</span>
            ${billingMenu}
        </div>

        <div class="nav-dropdown">
            <span>Reports</span>
            ${reportsMenu}
        </div>

        <div class="nav-dropdown">
            <span>Admin</span>
            ${adminMenu}
        </div>

        <div class="nav-dropdown">
            <span>Tools</span>
            ${toolsMenu}
        </div>
    `;
}

const PATIENT_NAV_LINKS = `
    <a data-tab="mychart_todo">To Do</a>
    <div class="nav-dropdown">
        <span>Appointments &amp; Visits</span>
        <div class="dropdown-content">
            <a data-tab="appointments">Appointments Calendar</a>
            <a data-tab="mychart_checkin">Check In Online</a>
            <a data-tab="mychart_visits">My Past Visits</a>
            <a data-tab="recalls">Care Recalls &amp; Follow-ups</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Health Records</span>
        <div class="dropdown-content">
            <a data-tab="health_records">Health Records Summary</a>
            <a data-tab="mychart_results">Test Results</a>
            <a data-tab="medications">My Medications</a>
            <a data-tab="mychart_track">Track My Health</a>
            <a data-tab="health_reminders">Health Reminders</a>
            <a data-tab="reports">Medical Reports</a>
            <a data-tab="documents">My Documents</a>
        </div>
    </div>
    <a data-tab="billing">Billing &amp; Payments</a>
    <div class="nav-dropdown">
        <span>Messages &amp; Updates</span>
        <div class="dropdown-content">
            <a data-tab="messaging">Doctor Messages</a>
            <a data-tab="misc_announcements">Hospital Announcements</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Account</span>
        <div class="dropdown-content">
            <a data-tab="mychart_account">Account &amp; Family Sharing</a>
            <a data-tab="profile">My Profile</a>
            <a data-tab="settings">Account Settings</a>
            <a data-tab="help">Help &amp; Support</a>
        </div>
    </div>
`;

const RECEPTIONIST_NAV_LINKS = `
    <a data-tab="appointments">Calendar</a>
    <div class="nav-dropdown">
        <span>Patient Access</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Registration &amp; Flow</div>
            <a data-tab="patient_finder">Patient Finder</a>
            <a data-tab="patients">Register / Search Patients</a>
            <a data-tab="patient_flow">Patient Flow Board</a>
            <a data-tab="portal_checkins">Online Check-ins</a>
            <a data-tab="portal_proxy_requests">Record Access Requests</a>
            <a data-tab="recalls">Patient Recalls</a>
            <a data-tab="visitor_management">Visitor Management &amp; Passes</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Inpatient &amp; Beds</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Bed &amp; Ward Status</div>
            <a data-tab="inpatient_admissions">Inpatient (ADT) Admissions</a>
            <a data-tab="room_management">Rooms &amp; Beds Availability</a>
            <a data-tab="census">Daily Census</a>
            <a data-tab="er">Emergency Room (ER)</a>
            <a data-tab="clinic_schedules">Clinic Operating Schedules</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Cashiering</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Patient Accounts</div>
            <a data-tab="payment">Collect Payment</a>
            <a data-tab="checkout" class="patient-dependent-nav">Patient Checkout</a>
            <a data-tab="fee_sheet" class="patient-dependent-nav">Fee Sheet</a>
            <a data-tab="split_cashiering">Split-Tender Cashiering</a>
            <a data-tab="patient_deposits">Advance Deposits</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Reports</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Reception Reports</div>
            <a data-tab="reports_visits_appointments">Appointments Report</a>
            <a data-tab="reports_visits_flow_board">Patient Flow Board Report</a>
            <a data-tab="census_report">Census Reports</a>
            <a data-tab="er_report">ER Report</a>
            <a data-tab="clients_list">Client List</a>
            <a data-tab="reports_visits_daily">Daily Activity Report</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Tools</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Front Desk Utilities</div>
            <a data-tab="messaging">Internal Messaging</a>
            <a data-tab="popup_address_label" class="patient-dependent-nav">Address Labels</a>
            <a data-tab="popup_barcode_label" class="patient-dependent-nav">Barcode Labels</a>
            <a data-tab="popup_chart_label" class="patient-dependent-nav">Chart Labels</a>
            <a data-tab="popup_letter" class="patient-dependent-nav">Letters</a>
            <a data-tab="blank_forms_core_demographics">Blank Demographics Form</a>
            <a data-tab="blank_forms_core_superbill">Blank Fee Sheet</a>
            <a data-tab="help">Help</a>
        </div>
    </div>
`;

const DOCTOR_CLINICAL_MENU = buildSplitMenu("doc-clinical", "Filter clinical pages...", [
    {
        id: "inpatient",
        label: "Patients & Inpatient",
        links: `
            <a data-tab="patient_finder">Patient Finder</a>
            <a data-tab="patients">New / Search Patients</a>
            <a data-tab="inpatient_admissions">Inpatient (ADT) Wards</a>
            <a data-tab="inpatient_vitals">Inpatient Vital Signs</a>
            <a data-tab="icu">ICU Flowsheet</a>
            <a data-tab="icu_report">ICU Report</a>
            <a data-tab="er">Emergency Room (ER)</a>
            <a data-tab="er_report">ER Report</a>
            <a data-tab="census">Daily Census</a>
            <a data-tab="census_report">Census Reports</a>
            <a data-tab="room_management">Rooms &amp; Beds Availability</a>
            <a data-tab="equipment_assets">Biomedical &amp; Equipment Assets</a>
        `
    },
    {
        id: "chart",
        label: "Acute Care & Chart",
        links: `
            <a data-tab="code_blue">Code Blue Resuscitation</a>
            <a data-tab="code_blue_report">Code Blue Report</a>
            <a data-tab="patient_dashboard" class="patient-dependent-nav">Patient Chart Dashboard</a>
            <a data-tab="patient_create_visit" class="patient-dependent-nav">Create Encounter</a>
            <a data-tab="patient_current_visit" class="patient-dependent-nav">Current Encounter</a>
            <a data-tab="patient_visits_history" class="patient-dependent-nav">Visit History</a>
            <a data-tab="health_records" class="patient-dependent-nav">Health Records</a>
            <a data-tab="medications" class="patient-dependent-nav">Medications</a>
            <a data-tab="documents" class="patient-dependent-nav">Documents</a>
        `
    }
]);

const DOCTOR_NAV_LINKS = `
    <div class="nav-dropdown">
        <span>Clinical</span>
        ${DOCTOR_CLINICAL_MENU}
    </div>
    <div class="nav-dropdown">
        <span>Scheduling</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Appointments &amp; Rosters</div>
            <a data-tab="appointments">My Calendar &amp; Appointments</a>
            <a data-tab="patient_flow">Patient Flow Board</a>
            <a data-tab="clinic_schedules">Clinic Operating Schedules</a>
            <a data-tab="recalls">Preventive Care Recalls</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Diagnostics</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Lab &amp; Imaging</div>
            <a data-tab="lab_worklist">Lab Worklist</a>
            <a data-tab="lab_report">Lab Reports</a>
            <a data-tab="rad_worklist">Radiology Worklist</a>
            <a data-tab="rad_report">Radiology Reports</a>
            <a data-tab="misc_dicom_viewer">DICOM Imaging Viewer</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Pharmacy</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Medications &amp; Rounds</div>
            <a data-tab="mar">Medicine Rounds (MAR)</a>
            <a data-tab="pharmacy_dispensing">Dispensing</a>
            <a data-tab="inventory_management">Drug Catalog &amp; Formulary</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Reports</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Clinical &amp; Quality</div>
            <a data-tab="clinic_quality_dashboard">Clinical Quality &amp; Utilization</a>
            <a data-tab="clinical_reports">Clinical Practice Reports</a>
            <a data-tab="reports_visits_encounters">Encounter Statistics</a>
            <a data-tab="regulatory_disease_surveillance">Disease Surveillance (PIDSR / CIF)</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Tools</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Communication &amp; Utilities</div>
            <a data-tab="messaging">Messages &amp; Clinical Inbox</a>
            <a data-tab="popup_issues" class="patient-dependent-nav">Clinical Issues &amp; Allergies</a>
            <a data-tab="popup_letter" class="patient-dependent-nav">Patient Letters &amp; Referrals</a>
            <a data-tab="misc_announcements">Hospital Announcements</a>
            <a data-tab="misc_office_notes">Office Notes</a>
            <a data-tab="misc_authorizations">Authorizations</a>
            <a data-tab="misc_patient_education">Patient Education Handouts</a>
            <a data-tab="blank_forms_core_demographics">Demographics Form</a>
            <a data-tab="blank_forms_core_superbill">Superbill / Fee Sheet Form</a>
            <a data-tab="misc_blank_forms_referral">Referral Form</a>
            <a data-tab="settings">Doctor Settings</a>
            <a data-tab="help">Help</a>
        </div>
    </div>
`;

function nurseNavLinks(role)
{
    return `
    <div class="nav-dropdown">
        <span>Patients &amp; Wards</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Ward Status &amp; Admissions</div>
            <a data-tab="inpatient_admissions">Inpatient (ADT) Wards</a>
            <a data-tab="patient_finder">Patient Finder</a>
            <a data-tab="patients">Patient Search</a>
            <a data-tab="patient_flow">Patient Flow Board</a>
            <a data-tab="inpatient_vitals">Inpatient Vital Signs</a>
            <a data-tab="icu">ICU Flowsheet</a>
            ${role === "charge_nurse" ? `<a data-tab="icu_report">ICU Report</a>` : ""}
            <a data-tab="er">Emergency Room (ER)</a>
            <a data-tab="room_management">Rooms &amp; Beds Availability</a>
            <a data-tab="census">Daily Census</a>
            <a data-tab="visitor_management">Visitor Passes</a>
            <a data-tab="equipment_assets">Biomedical Equipment</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Clinical Care</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Nursing Documentation</div>
            <a data-tab="mar">Medicine Rounds (MAR)</a>
            <a data-tab="ward_cabinet">Ward Dispensing Cabinet</a>
            <a data-tab="dd_register">DD Controlled Drug Register</a>
            <a data-tab="nurse_assignments">Nursing Shift Assignments</a>
            ${role === "charge_nurse" ? `<a data-tab="nursing_staff">Nursing Staff Management</a>` : ""}
            ${role === "charge_nurse" ? `<a data-tab="ward_stock_report">Ward Stock Report</a>` : ""}
            <a data-tab="code_blue">Code Blue Resuscitation</a>
            ${role === "charge_nurse" ? `<a data-tab="code_blue_report">Code Blue Report</a>` : ""}
            <a data-tab="lab_worklist">Lab Worklist</a>
            <a data-tab="rad_worklist">Radiology Worklist</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Surgery</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Operating Suites</div>
            <a data-tab="or_board">OR Live Board</a>
            <a data-tab="or_schedule">OR Surgical Schedule</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Tools</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Nursing Utilities</div>
            <a data-tab="messaging">Internal Messaging</a>
            <a data-tab="portal_checkins">Online Check-ins</a>
            <a data-tab="popup_issues" class="patient-dependent-nav">Clinical Issues</a>
            <a data-tab="popup_chart_label" class="patient-dependent-nav">Chart Labels</a>
            <a data-tab="popup_barcode_label" class="patient-dependent-nav">Barcode Labels</a>
            <a data-tab="help">Help</a>
        </div>
    </div>
    `;
}

const PHARMACIST_NAV_LINKS = `
    <a data-tab="med_verification">Order Verification</a>
    <div class="nav-dropdown">
        <span>Dispensing &amp; Stock</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Pharmacy Operations</div>
            <a data-tab="pharmacy_dispensing">Outpatient Dispensing</a>
            <a data-tab="mar">Inpatient Medicine Rounds (MAR)</a>
            <a data-tab="dd_register">DD Controlled Register</a>
            <a data-tab="restock_queue">Cabinet Restock Requests</a>
            <a data-tab="ward_cabinet">Ward Cabinets</a>
            <a data-tab="ward_stock_report">Ward Stock Report</a>
            <a data-tab="inventory_management">Drug Catalog &amp; Par Levels</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Patients &amp; Wards</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Inpatient Census</div>
            <a data-tab="patients">Patient Directory</a>
            <a data-tab="inpatient_admissions">Inpatient Wards</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Tools &amp; Messages</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Pharmacy Tools</div>
            <a data-tab="messaging">Clinical Messaging</a>
            <a data-tab="help">Help</a>
        </div>
    </div>
`;

const CNA_NAV_LINKS = `
    <div class="nav-dropdown">
        <span>Patients &amp; Wards</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Ward Patient Care</div>
            <a data-tab="patients">Patient Directory</a>
            <a data-tab="nurse_assignments">My Assigned Patients</a>
            <a data-tab="inpatient_admissions">Inpatient Wards</a>
            <a data-tab="er">Emergency Room (ER)</a>
            <a data-tab="room_management">Rooms &amp; Beds</a>
            <a data-tab="patient_flow">Patient Flow Board</a>
        </div>
    </div>
    <div class="nav-dropdown">
        <span>Vitals &amp; Care</span>
        <div class="dropdown-content">
            <div class="dropdown-section-label">Observations</div>
            <a data-tab="inpatient_vitals">Vital Signs Entry</a>
            <a data-tab="icu">ICU Flowsheet</a>
        </div>
    </div>
    <a data-tab="messaging">Messages</a>
`;

// My Work (what is assigned to me today) comes first for clinical, pharmacy, and lab roles.
const MY_WORK_LINK_ROLES = ["nurse", "charge_nurse", "cna", "doctor", "clinician", "pharmacist", "lab_technician", "admin"];

export function getNavLinks(role)
{
    const links = navLinksFor(role);
    return MY_WORK_LINK_ROLES.includes(role) ? `<a data-tab="my_work">My Work</a>${links}` : links;
}

function navLinksFor(role)
{
    if (role === "patient") return PATIENT_NAV_LINKS;
    if (role === "doctor") return DOCTOR_NAV_LINKS;
    if (role === "receptionist") return RECEPTIONIST_NAV_LINKS;
    if (role === "nurse" || role === "charge_nurse") return nurseNavLinks(role);
    if (role === "cna") return CNA_NAV_LINKS;
    if (role === "pharmacist") return PHARMACIST_NAV_LINKS;
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
            <button type="button" class="nav-quick-jump-btn" id="navQuickJumpBtn" title="Quick Jump to any menu or module (Ctrl+K)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <kbd>Ctrl K</kbd>
            </button>
            <div class="nav-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input type="text" class="nav-search" placeholder="Search patient...">
            </div>
            <div class="nav-dropdown proxy-switcher" id="proxySwitcher" style="display: none;">
                <span id="proxySwitcherLabel">Viewing: <strong>Me</strong></span>
                <div class="dropdown-content dropdown-right" id="proxySwitcherMenu"></div>
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
                    <a data-tab="change_password" style="cursor: pointer;">Change Password</a>
                    <a data-tab="appearance" style="cursor: pointer;">Appearance</a>
                    <a data-tab="settings" style="cursor: pointer;">Settings</a>
                    ${user?.role === "admin" ? `<a data-tab="role_management" style="cursor: pointer;">Roles &amp; Permissions (RBAC)</a>` : ""}
                    <div class="profile-docs-accordion" id="profileDocsAccordion">
                        <div class="profile-docs-trigger" id="profileDocsTrigger" role="button" tabindex="0">
                            <span class="profile-docs-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Docs
                            </span>
                            <svg class="profile-docs-chevron" id="profileDocsChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="profile-docs-submenu" id="profileDocsSubmenu" style="display: none;">
                            <a data-tab="system_documentation" class="profile-doc-link" style="cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                                System Documentation
                            </a>
                            <a data-tab="privacy_policy" class="profile-doc-link" style="cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                Privacy Policy
                            </a>
                            <a data-tab="terms_conditions" class="profile-doc-link" style="cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Terms &amp; Conditions
                            </a>
                        </div>
                    </div>
                    <hr>
                    <a id="logoutBtn" style="cursor: pointer; color: #dc2626;">Logout</a>
                </div>
            </div>
        </div>
    </nav>

    <div id="passwordExpirationBanner" style="display: none;"></div>

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
        <div class="patient-context-encounters" id="patientContextEncounters">
            <button type="button" class="pc-encounter-icon-btn" id="patientContextHistoryBtn" title="Past Encounters / Visit History" aria-label="Past Encounters">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                </svg>
            </button>
            <div class="pc-encounter-btn-group">
                <div class="pc-encounter-dropdown-wrap" id="patientContextDropdownWrap">
                    <button type="button" class="pc-encounter-dropdown-btn" id="patientContextEncounterBtn" aria-haspopup="true" aria-expanded="false" title="Select Encounter">
                        <svg class="pc-btn-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span id="patientContextEncounterBtnText">Select Encounter</span>
                        <span class="pc-count-badge" id="patientContextEncounterCountBadge">0</span>
                        <svg class="pc-encounter-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="pc-encounter-menu" id="patientContextEncounterMenu" style="display: none;">
                        <div class="pc-encounter-menu-header">
                            <div class="pc-menu-title-wrap">
                                <span class="pc-menu-title">Patient Encounters</span>
                                <span class="pc-menu-counter" id="patientContextMenuCounter">0 visits</span>
                            </div>
                            <button type="button" class="pc-menu-quick-add-btn" id="pcMenuQuickAddBtn" title="Create New Encounter">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                <span>New</span>
                            </button>
                        </div>
                        <div class="pc-encounter-search-wrap" id="patientContextSearchWrap" style="display: none;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" class="pc-encounter-search-input" id="pcEncounterSearchInput" placeholder="Filter encounters..." autocomplete="off">
                        </div>
                        <div class="pc-encounter-list" id="patientContextEncounterList">
                            <!-- Loaded dynamically -->
                        </div>
                        <div class="pc-encounter-menu-footer">
                            <button type="button" class="pc-menu-footer-link" id="pcMenuHistoryLink">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                <span>View All Visit History</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" class="pc-encounter-icon-btn pc-encounter-add-btn" id="patientContextNewEncounterBtn" title="Create New Encounter" aria-label="Create Encounter">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Active Patient Quick Banner (compact reminder shown below tabs if context bar is scrolled off) -->
    <div class="active-patient-strip" id="activePatientStrip" style="display: none;">
        <span class="active-patient-strip-icon">👤</span>
        <span class="active-patient-strip-text">Active Chart: <strong id="activePatientStripName">--</strong></span>
        <span class="active-patient-strip-meta" id="activePatientStripMeta"></span>
        <button type="button" class="active-patient-strip-btn" id="activePatientStripGoChart">Open Chart</button>
        <button type="button" class="active-patient-strip-btn-alt" id="activePatientStripEncounter">New Encounter</button>
        <button type="button" class="active-patient-strip-clear" id="activePatientStripClear" title="Clear active patient">&times;</button>
    </div>

    <div class="main-content">
        <!-- Persistent Tab Bar -->
        <div class="tab-bar-container">
            <div class="tab-bar" id="tabBar">
                <!-- Tabs will be rendered here dynamically -->
            </div>
        </div>

        <!-- Dynamic Tab Content -->
        <div id="tabContent" class="tab-content-container">
            <!-- Active tab view will be rendered here -->
        </div>
    </div>
</div>

<div class="modal-overlay" id="logoutConfirmModalOverlay">
    <div class="modal-card" style="max-width: 420px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
        <h3 style="margin-bottom: 8px;">Confirm Logout</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Are you sure you want to log out of the Intellix Hospital System?</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-secondary" id="cancelLogoutBtn" type="button">Stay Logged In</button>
            <button class="btn btn-danger" id="confirmLogoutBtn" type="button">Log Out</button>
        </div>
    </div>
</div>
`;
}
