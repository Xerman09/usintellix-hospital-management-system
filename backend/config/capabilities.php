<?php

declare(strict_types=1);

/**
 * Enterprise Subsystems & Granular Permissions Capability Matrix
 * Defines all granular capabilities across the 10 enterprise subsystems of USIntellix HMS.
 */

return [
    'admin' => [
        'name' => 'admin',
        'title' => 'System Administration & Security',
        'icon' => 'shield',
        'description' => 'User management, RBAC, facility units, audit logs, and security controls',
        'capabilities' => [
            'admin_users' => [
                'name' => 'admin_users',
                'label' => 'Manage Users & Credentials',
                'description' => 'Create, edit, lock, unlock user accounts and reset credentials',
            ],
            'admin_roles' => [
                'name' => 'admin_roles',
                'label' => 'Manage Roles & Permissions',
                'description' => 'Define roles and customize granular capability access matrices',
            ],
            'admin_facilities' => [
                'name' => 'admin_facilities',
                'label' => 'Facility & Room Master Data',
                'description' => 'Configure hospital campuses, wings, wards, and rooms',
            ],
            'admin_equipment' => [
                'name' => 'admin_equipment',
                'label' => 'Biomedical Equipment Assets',
                'description' => 'Track critical machinery, calibration due dates, and maintenance lifecycles',
            ],
            'admin_departments' => [
                'name' => 'admin_departments',
                'label' => 'Department Management',
                'description' => 'Manage clinical, diagnostic, and administrative hospital departments',
            ],
            'admin_clinic_schedules' => [
                'name' => 'admin_clinic_schedules',
                'label' => 'Clinic Operating Schedules',
                'description' => 'Configure department operating hours, weekly clinic timetables, slot durations, and daily capacities',
            ],
            'admin_audit_logs' => [
                'name' => 'admin_audit_logs',
                'label' => 'HIPAA Security Audit Logs',
                'description' => 'Inspect access logs, security events, and unauthorized access attempts',
            ],
            'admin_settings' => [
                'name' => 'admin_settings',
                'label' => 'Enterprise System Settings',
                'description' => 'Configure global hospital operational parameters and branding',
            ],
        ],
    ],

    'pas' => [
        'name' => 'pas',
        'title' => 'Patient Administration & Bed Management',
        'icon' => 'user-check',
        'description' => 'Patient registry, outpatient booking, inpatient admissions, bed board, and transfers',
        'capabilities' => [
            'pas_view_patients' => [
                'name' => 'pas_view_patients',
                'label' => 'View Patient Directory',
                'description' => 'Search and view patient demographic records and master index',
            ],
            'pas_register_patient' => [
                'name' => 'pas_register_patient',
                'label' => 'Register & Edit Patients',
                'description' => 'Register new patients and update demographic & insurance information',
            ],
            'pas_appointments' => [
                'name' => 'pas_appointments',
                'label' => 'Appointment Scheduling',
                'description' => 'Book, reschedule, cancel, and check-in patient appointments',
            ],
            'pas_admissions' => [
                'name' => 'pas_admissions',
                'label' => 'Inpatient Admissions & Bed Allocation',
                'description' => 'Admit patients, allocate beds, and view live hospital bed occupancy',
            ],
            'pas_discharges' => [
                'name' => 'pas_discharges',
                'label' => 'Patient Discharge & Disposition',
                'description' => 'Process discharge orders, summarize care, and clear beds',
            ],
            'pas_transfers' => [
                'name' => 'pas_transfers',
                'label' => 'Ward & Bed Transfers',
                'description' => 'Coordinate inter-ward patient bed transfers and room reassignments',
            ],
        ],
    ],

    'clinical_ehr' => [
        'name' => 'clinical_ehr',
        'title' => 'Clinical Documentation & Electronic Health Records',
        'icon' => 'file-text',
        'description' => 'SOAP documentation, medical summaries, vital signs, CPOE, care plans, and OR',
        'capabilities' => [
            'ehr_view_chart' => [
                'name' => 'ehr_view_chart',
                'label' => 'View Clinical Chart',
                'description' => 'Access complete patient medical chart, past encounters, and history',
            ],
            'ehr_soap_notes' => [
                'name' => 'ehr_soap_notes',
                'label' => 'Author Clinical SOAP Notes',
                'description' => 'Write progress notes, subjective findings, assessment, and plans',
            ],
            'ehr_vital_signs' => [
                'name' => 'ehr_vital_signs',
                'label' => 'Record Vital Signs',
                'description' => 'Record temperature, BP, pulse, SpO2, respiratory rate, and pain score',
            ],
            'ehr_problems_allergies' => [
                'name' => 'ehr_problems_allergies',
                'label' => 'Manage Problems & Allergies',
                'description' => 'Document ICD-10 diagnoses, active medical problems, and adverse reactions',
            ],
            'ehr_cpoe_orders' => [
                'name' => 'ehr_cpoe_orders',
                'label' => 'Computerized Provider Order Entry (CPOE)',
                'description' => 'Place bedside orders for lab, imaging, diets, and nursing treatments',
            ],
            'ehr_nursing_care' => [
                'name' => 'ehr_nursing_care',
                'label' => 'Nursing Care Plans & Flowsheet',
                'description' => 'Maintain nursing assessments, shift handover notes, and daily flowsheets',
            ],
            'ehr_or_live' => [
                'name' => 'ehr_or_live',
                'label' => 'Operating Room (OR) Live Board',
                'description' => 'Track surgical stages, perioperative checklist, PACU, and OR turnover',
            ],
        ],
    ],

    'pharmacy' => [
        'name' => 'pharmacy',
        'title' => 'Pharmacy & Medication Management',
        'icon' => 'pill',
        'description' => 'e-Prescribing, clinical verification, drug dispensing, eMAR, and inventory',
        'capabilities' => [
            'pharmacy_prescribe' => [
                'name' => 'pharmacy_prescribe',
                'label' => 'e-Prescribe Medications',
                'description' => 'Author prescription orders with dosage, route, frequency, and instructions',
            ],
            'pharmacy_verify' => [
                'name' => 'pharmacy_verify',
                'label' => 'Pharmacist Clinical Verification',
                'description' => 'Review drug interactions, contraindications, allergies, and approve orders',
            ],
            'pharmacy_dispense' => [
                'name' => 'pharmacy_dispense',
                'label' => 'Dispense Medications',
                'description' => 'Fulfill orders, pick inventory, print bottle labels, and mark dispensed',
            ],
            'pharmacy_emar' => [
                'name' => 'pharmacy_emar',
                'label' => 'eMAR Administration Logging',
                'description' => 'Record bedside administration, scan medication barcodes, log refusals',
            ],
            'pharmacy_inventory' => [
                'name' => 'pharmacy_inventory',
                'label' => 'Formulary & Stock Management',
                'description' => 'Manage hospital drug formulary catalog, batch tracking, and reorder levels',
            ],
        ],
    ],

    'diagnostics' => [
        'name' => 'diagnostics',
        'title' => 'Diagnostics & Auxiliary Services',
        'icon' => 'activity',
        'description' => 'Laboratory LIS, Radiology RIS/PACS, Blood Bank, and Dietary nutrition',
        'capabilities' => [
            'lab_orders' => [
                'name' => 'lab_orders',
                'label' => 'Order & Track Lab Tests',
                'description' => 'Order pathology, microbiology, hematology, and chemistry tests',
            ],
            'lab_specimens' => [
                'name' => 'lab_specimens',
                'label' => 'Sample Collection & Barcoding',
                'description' => 'Log phlebotomy collection, print barcode labels, and receive specimens',
            ],
            'lab_results' => [
                'name' => 'lab_results',
                'label' => 'Enter & Verify Lab Results',
                'description' => 'Enter analyzer test values, flag critical panic values, and verify reports',
            ],
            'rad_orders' => [
                'name' => 'rad_orders',
                'label' => 'Order Radiology Imaging',
                'description' => 'Place orders for X-ray, CT, MRI, Ultrasound, and interventional studies',
            ],
            'rad_worklist' => [
                'name' => 'rad_worklist',
                'label' => 'Radiology Modality Worklist',
                'description' => 'Manage imaging modality queues, patient intake, and technologist tasks',
            ],
            'rad_reporting' => [
                'name' => 'rad_reporting',
                'label' => 'Author Radiology PACS Reports',
                'description' => 'Review DICOM imaging studies, author diagnostic impressions, and sign off',
            ],
            'blood_bank' => [
                'name' => 'blood_bank',
                'label' => 'Blood Bank & Transfusions',
                'description' => 'Manage donor records, blood inventory, cross-matching, and transfusion logs',
            ],
            'dietary_services' => [
                'name' => 'dietary_services',
                'label' => 'Dietary & Nutrition Services',
                'description' => 'Order patient therapeutic meals, manage kitchen prep lists and diets',
            ],
        ],
    ],

    'billing' => [
        'name' => 'billing',
        'title' => 'Billing, Finance & Revenue Cycle',
        'icon' => 'dollar-sign',
        'description' => 'Patient billing, cashiering, insurance claims, financial ledger, and tariff pricing',
        'capabilities' => [
            'billing_view' => [
                'name' => 'billing_view',
                'label' => 'View Invoices & Balances',
                'description' => 'View patient bills, outstanding balances, receipts, and account summaries',
            ],
            'billing_charges' => [
                'name' => 'billing_charges',
                'label' => 'Capture Charges & Invoicing',
                'description' => 'Generate itemized bills for procedures, lab, pharmacy, and bed days',
            ],
            'billing_cashier' => [
                'name' => 'billing_cashier',
                'label' => 'Payment Processing & Cashiering',
                'description' => 'Collect cash, credit cards, digital payments, and issue official receipts',
            ],
            'billing_claims' => [
                'name' => 'billing_claims',
                'label' => 'Insurance Pre-Auth & Claims',
                'description' => 'Track payer pre-authorizations, submit claims, and manage claim denials',
            ],
            'billing_tariffs' => [
                'name' => 'billing_tariffs',
                'label' => 'Tariff Pricing & Packages',
                'description' => 'Configure service price master, room rates, package deals, and doctor fees',
            ],
        ],
    ],

    'hr' => [
        'name' => 'hr',
        'title' => 'Human Resources & Workforce Management',
        'icon' => 'users',
        'description' => 'Staff directory, duty rosters, shift swaps, leave tracking, and payroll processing',
        'capabilities' => [
            'hr_staff_profiles' => [
                'name' => 'hr_staff_profiles',
                'label' => 'Staff Directory & Credentials',
                'description' => 'Manage staff profiles, medical licenses, specializations, and contracts',
            ],
            'hr_scheduling' => [
                'name' => 'hr_scheduling',
                'label' => 'Rosters & Shift Planning',
                'description' => 'Manage department shift rotas, on-call schedules, and shift coverage',
            ],
            'hr_leave_requests' => [
                'name' => 'hr_leave_requests',
                'label' => 'Leave Management & Approvals',
                'description' => 'Process annual, sick, and emergency leave requests with auto-coverage',
            ],
            'hr_payroll' => [
                'name' => 'hr_payroll',
                'label' => 'Payroll & Doctor Commissions',
                'description' => 'Calculate staff salaries, overtime, and doctor fee shares per procedure',
            ],
            'hr_cme_training' => [
                'name' => 'hr_cme_training',
                'label' => 'CME & Training Certifications',
                'description' => 'Track Continuing Medical Education credits, BLS/ACLS, and appraisals',
            ],
        ],
    ],

    'supply_chain' => [
        'name' => 'supply_chain',
        'title' => 'Supply Chain & Asset Management',
        'icon' => 'truck',
        'description' => 'General inventory, purchase orders, vendor GRN, CSSD, and biomedical maintenance',
        'capabilities' => [
            'supply_inventory' => [
                'name' => 'supply_inventory',
                'label' => 'Consumables & Central Store',
                'description' => 'Monitor warehouse stock levels, departmental issues, and replenishment',
            ],
            'supply_procurement' => [
                'name' => 'supply_procurement',
                'label' => 'Procurement & Purchase Orders',
                'description' => 'Manage supplier quotations, purchase orders (PO), and Goods Receipt (GRN)',
            ],
            'supply_cssd' => [
                'name' => 'supply_cssd',
                'label' => 'Sterile Supply Department (CSSD)',
                'description' => 'Track autoclave sterilization batches, surgical trays, and OT distribution',
            ],
            'supply_biomedical' => [
                'name' => 'supply_biomedical',
                'label' => 'Biomedical Equipment Maintenance',
                'description' => 'Schedule preventive maintenance, calibration logs, and breakdown tickets',
            ],
        ],
    ],

    'analytics' => [
        'name' => 'analytics',
        'title' => 'Analytics, Reporting & Compliance',
        'icon' => 'bar-chart-2',
        'description' => 'Clinical quality dashboards, revenue BI, and statutory regulatory filings',
        'capabilities' => [
            'analytics_clinical' => [
                'name' => 'analytics_clinical',
                'label' => 'Clinical & Quality Dashboards',
                'description' => 'Monitor readmission rates, hospital infections, and average length of stay (ALOS)',
            ],
            'analytics_financial' => [
                'name' => 'analytics_financial',
                'label' => 'Financial & Revenue BI',
                'description' => 'Analyze bed occupancy yield, department profitability, and claim denial rates',
            ],
            'analytics_compliance' => [
                'name' => 'analytics_compliance',
                'label' => 'Regulatory & Health Filings',
                'description' => 'Generate mandatory disease surveillance data, MOH reports, and public health exports',
            ],
        ],
    ],

    'doctor_portal' => [
        'name' => 'doctor_portal',
        'title' => 'Doctor Portal & Clinical Workspace',
        'icon' => 'user-check',
        'description' => 'Physician daily census, round manager, critical results inbox, and schedule blocks',
        'capabilities' => [
            'doc_workspace' => [
                'name' => 'doc_workspace',
                'label' => 'Doctor Workspace & Inpatient Census',
                'description' => 'Access assigned patient my-list, round manager, and shift handovers',
            ],
            'doc_schedule' => [
                'name' => 'doc_schedule',
                'label' => 'Personal Roster & Schedule Blocks',
                'description' => 'View personal clinic/OT roster and block appointment slots for emergencies',
            ],
            'doc_critical_inbox' => [
                'name' => 'doc_critical_inbox',
                'label' => 'Critical Results & Panic Values Inbox',
                'description' => 'Receive push notifications and review incoming critical diagnostic results',
            ],
            'doc_signoff' => [
                'name' => 'doc_signoff',
                'label' => 'Order & Report Electronic Sign-Off',
                'description' => 'Review and electronically sign pending diagnostic orders and discharge summaries',
            ],
        ],
    ],
];
