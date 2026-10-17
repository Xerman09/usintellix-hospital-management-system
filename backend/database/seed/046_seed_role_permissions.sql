-- Seed 046: Default Dynamic Role Permissions Capability Matrix
-- Subsystem 1: User Management & Role-Based Access Control (RBAC)

-- Admin (Superuser / Full Capability Grant)
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    -- Admin & Master Data
    SELECT 'admin' AS module, 'admin_users' AS capability UNION ALL
    SELECT 'admin', 'admin_roles' UNION ALL
    SELECT 'admin', 'admin_facilities' UNION ALL
    SELECT 'admin', 'admin_departments' UNION ALL
    SELECT 'admin', 'admin_audit_logs' UNION ALL
    SELECT 'admin', 'admin_settings' UNION ALL
    -- PAS
    SELECT 'pas', 'pas_view_patients' UNION ALL
    SELECT 'pas', 'pas_register_patient' UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'pas', 'pas_admissions' UNION ALL
    SELECT 'pas', 'pas_discharges' UNION ALL
    SELECT 'pas', 'pas_transfers' UNION ALL
    -- Clinical EHR
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_soap_notes' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs' UNION ALL
    SELECT 'clinical_ehr', 'ehr_problems_allergies' UNION ALL
    SELECT 'clinical_ehr', 'ehr_cpoe_orders' UNION ALL
    SELECT 'clinical_ehr', 'ehr_nursing_care' UNION ALL
    SELECT 'clinical_ehr', 'ehr_or_live' UNION ALL
    -- Pharmacy
    SELECT 'pharmacy', 'pharmacy_prescribe' UNION ALL
    SELECT 'pharmacy', 'pharmacy_verify' UNION ALL
    SELECT 'pharmacy', 'pharmacy_dispense' UNION ALL
    SELECT 'pharmacy', 'pharmacy_emar' UNION ALL
    SELECT 'pharmacy', 'pharmacy_inventory' UNION ALL
    -- Diagnostics
    SELECT 'diagnostics', 'lab_orders' UNION ALL
    SELECT 'diagnostics', 'lab_specimens' UNION ALL
    SELECT 'diagnostics', 'lab_results' UNION ALL
    SELECT 'diagnostics', 'rad_orders' UNION ALL
    SELECT 'diagnostics', 'rad_worklist' UNION ALL
    SELECT 'diagnostics', 'rad_reporting' UNION ALL
    SELECT 'diagnostics', 'blood_bank' UNION ALL
    SELECT 'diagnostics', 'dietary_services' UNION ALL
    -- Billing
    SELECT 'billing', 'billing_view' UNION ALL
    SELECT 'billing', 'billing_charges' UNION ALL
    SELECT 'billing', 'billing_cashier' UNION ALL
    SELECT 'billing', 'billing_claims' UNION ALL
    SELECT 'billing', 'billing_tariffs' UNION ALL
    -- HR
    SELECT 'hr', 'hr_staff_profiles' UNION ALL
    SELECT 'hr', 'hr_scheduling' UNION ALL
    SELECT 'hr', 'hr_leave_requests' UNION ALL
    SELECT 'hr', 'hr_payroll' UNION ALL
    SELECT 'hr', 'hr_cme_training' UNION ALL
    -- Supply Chain
    SELECT 'supply_chain', 'supply_inventory' UNION ALL
    SELECT 'supply_chain', 'supply_procurement' UNION ALL
    SELECT 'supply_chain', 'supply_cssd' UNION ALL
    SELECT 'supply_chain', 'supply_biomedical' UNION ALL
    -- Analytics
    SELECT 'analytics', 'analytics_clinical' UNION ALL
    SELECT 'analytics', 'analytics_financial' UNION ALL
    SELECT 'analytics', 'analytics_compliance' UNION ALL
    -- Doctor Portal
    SELECT 'doctor_portal', 'doc_workspace' UNION ALL
    SELECT 'doctor_portal', 'doc_schedule' UNION ALL
    SELECT 'doctor_portal', 'doc_critical_inbox' UNION ALL
    SELECT 'doctor_portal', 'doc_signoff'
) c
WHERE r.name = 'admin';

-- Doctor
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_soap_notes' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs' UNION ALL
    SELECT 'clinical_ehr', 'ehr_problems_allergies' UNION ALL
    SELECT 'clinical_ehr', 'ehr_cpoe_orders' UNION ALL
    SELECT 'clinical_ehr', 'ehr_or_live' UNION ALL
    SELECT 'pharmacy', 'pharmacy_prescribe' UNION ALL
    SELECT 'diagnostics', 'lab_orders' UNION ALL
    SELECT 'diagnostics', 'lab_results' UNION ALL
    SELECT 'diagnostics', 'rad_orders' UNION ALL
    SELECT 'diagnostics', 'rad_reporting' UNION ALL
    SELECT 'diagnostics', 'blood_bank' UNION ALL
    SELECT 'diagnostics', 'dietary_services' UNION ALL
    SELECT 'billing', 'billing_view' UNION ALL
    SELECT 'doctor_portal', 'doc_workspace' UNION ALL
    SELECT 'doctor_portal', 'doc_schedule' UNION ALL
    SELECT 'doctor_portal', 'doc_critical_inbox' UNION ALL
    SELECT 'doctor_portal', 'doc_signoff'
) c
WHERE r.name = 'doctor';

-- Clinician
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_soap_notes' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs' UNION ALL
    SELECT 'clinical_ehr', 'ehr_problems_allergies' UNION ALL
    SELECT 'doctor_portal', 'doc_workspace' UNION ALL
    SELECT 'doctor_portal', 'doc_schedule' UNION ALL
    SELECT 'doctor_portal', 'doc_critical_inbox'
) c
WHERE r.name = 'clinician';

-- Nurse
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'pas', 'pas_admissions' UNION ALL
    SELECT 'pas', 'pas_transfers' UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs' UNION ALL
    SELECT 'clinical_ehr', 'ehr_problems_allergies' UNION ALL
    SELECT 'clinical_ehr', 'ehr_nursing_care' UNION ALL
    SELECT 'clinical_ehr', 'ehr_or_live' UNION ALL
    SELECT 'pharmacy', 'pharmacy_emar' UNION ALL
    SELECT 'diagnostics', 'lab_orders' UNION ALL
    SELECT 'diagnostics', 'lab_specimens' UNION ALL
    SELECT 'diagnostics', 'dietary_services' UNION ALL
    SELECT 'billing', 'billing_view'
) c
WHERE r.name = 'nurse';

-- Charge Nurse (Nurse + shift management + discharges)
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'pas', 'pas_admissions' UNION ALL
    SELECT 'pas', 'pas_transfers' UNION ALL
    SELECT 'pas', 'pas_discharges' UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs' UNION ALL
    SELECT 'clinical_ehr', 'ehr_problems_allergies' UNION ALL
    SELECT 'clinical_ehr', 'ehr_nursing_care' UNION ALL
    SELECT 'clinical_ehr', 'ehr_or_live' UNION ALL
    SELECT 'pharmacy', 'pharmacy_emar' UNION ALL
    SELECT 'diagnostics', 'lab_orders' UNION ALL
    SELECT 'diagnostics', 'lab_specimens' UNION ALL
    SELECT 'diagnostics', 'dietary_services' UNION ALL
    SELECT 'billing', 'billing_view' UNION ALL
    SELECT 'hr', 'hr_scheduling' UNION ALL
    SELECT 'hr', 'hr_leave_requests'
) c
WHERE r.name = 'charge_nurse';

-- CNA (Certified Nursing Assistant)
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'clinical_ehr', 'ehr_vital_signs'
) c
WHERE r.name = 'cna';

-- Pharmacist
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'clinical_ehr', 'ehr_view_chart' UNION ALL
    SELECT 'pharmacy', 'pharmacy_verify' UNION ALL
    SELECT 'pharmacy', 'pharmacy_dispense' UNION ALL
    SELECT 'pharmacy', 'pharmacy_emar' UNION ALL
    SELECT 'pharmacy', 'pharmacy_inventory'
) c
WHERE r.name = 'pharmacist';

-- Accountant
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'billing', 'billing_view' UNION ALL
    SELECT 'billing', 'billing_charges' UNION ALL
    SELECT 'billing', 'billing_cashier' UNION ALL
    SELECT 'billing', 'billing_claims' UNION ALL
    SELECT 'billing', 'billing_tariffs' UNION ALL
    SELECT 'analytics', 'analytics_financial' UNION ALL
    SELECT 'hr', 'hr_payroll'
) c
WHERE r.name = 'accountant';

-- Receptionist
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'pas', 'pas_register_patient' UNION ALL
    SELECT 'pas', 'pas_appointments' UNION ALL
    SELECT 'pas', 'pas_admissions' UNION ALL
    SELECT 'pas', 'pas_transfers' UNION ALL
    SELECT 'pas', 'pas_discharges' UNION ALL
    SELECT 'billing', 'billing_view' UNION ALL
    SELECT 'billing', 'billing_cashier'
) c
WHERE r.name = 'receptionist';

-- Lab Technician
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'diagnostics', 'lab_orders' UNION ALL
    SELECT 'diagnostics', 'lab_specimens' UNION ALL
    SELECT 'diagnostics', 'lab_results' UNION ALL
    SELECT 'diagnostics', 'blood_bank'
) c
WHERE r.name = 'lab_technician';

-- Radiologic Technologist
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'diagnostics', 'rad_orders' UNION ALL
    SELECT 'diagnostics', 'rad_worklist'
) c
WHERE r.name = 'radiologic_technologist';

-- Staff
INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'pas' AS module, 'pas_view_patients' AS capability UNION ALL
    SELECT 'hr', 'hr_staff_profiles'
) c
WHERE r.name = 'staff';
