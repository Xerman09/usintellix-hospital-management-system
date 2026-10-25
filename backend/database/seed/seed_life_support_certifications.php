<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

echo "Seeding Life Support Clinical Certifications Tracker...\n";

$pdo = Database::connection();

// Check if already seeded
$cnt = (int)$pdo->query("SELECT COUNT(*) FROM hr_life_support_certifications")->fetchColumn();
if ($cnt > 0) {
    echo "Life support certifications already seeded ({$cnt} records found).\n";
    exit(0);
}

// 1. Requirements Matrix
$requirements = [
    // Emergency Medicine
    ['Emergency Medicine', 'Attending Emergency Physician', 'BLS', 1, 30, 'Suspension of Resuscitation Attending privileges and ER duty shifts'],
    ['Emergency Medicine', 'Attending Emergency Physician', 'ACLS', 1, 30, 'Suspension of Code Blue Team Leader privileges in Emergency Dept'],
    ['Emergency Medicine', 'Attending Emergency Physician', 'ATLS', 1, 30, 'Suspension of Trauma Code Team Leader assignment in Trauma Bay'],
    ['Emergency Medicine', 'Attending Emergency Physician', 'PALS', 1, 30, 'Suspension from Pediatric Resuscitation Bay Lead privileges'],
    ['Emergency Medicine', 'Emergency Staff Nurse', 'BLS', 1, 15, 'Lockout from ER triage and resuscitation bay clinical shifts'],
    ['Emergency Medicine', 'Emergency Staff Nurse', 'ACLS', 1, 15, 'Reassignment away from adult resuscitation / trauma bay beds'],
    ['Emergency Medicine', 'Emergency Staff Nurse', 'PALS', 1, 15, 'Reassignment away from pediatric emergency beds'],

    // Intensive Care Unit (ICU)
    ['Intensive Care Unit (ICU)', 'Critical Care Intensivist / Anesthesiologist', 'BLS', 1, 30, 'Lockout from ICU bedside admitting privileges'],
    ['Intensive Care Unit (ICU)', 'Critical Care Intensivist / Anesthesiologist', 'ACLS', 1, 30, 'Suspension of Rapid Response Team (RRT) Physician coverage'],
    ['Intensive Care Unit (ICU)', 'Critical Care Nurse Specialist', 'BLS', 1, 15, 'Lockout from ICU ventilator and critical care bed assignments'],
    ['Intensive Care Unit (ICU)', 'Critical Care Nurse Specialist', 'ACLS', 1, 15, 'Suspension of Code Blue nurse response team roster eligibility'],

    // Surgery & Trauma
    ['General Surgery', 'General & Trauma Surgeon', 'BLS', 1, 30, 'Suspension of Operating Room surgical privileges'],
    ['General Surgery', 'General & Trauma Surgeon', 'ACLS', 1, 30, 'Suspension of intraoperative resuscitation oversight'],
    ['General Surgery', 'General & Trauma Surgeon', 'ATLS', 1, 30, 'Suspension from Level 1 / Level 2 Trauma Activation Call roster'],
    ['Orthopedic Surgery', 'Orthopedic Surgeon', 'BLS', 1, 30, 'Suspension of OR privileges'],
    ['Orthopedic Surgery', 'Orthopedic Surgeon', 'ATLS', 1, 30, 'Suspension of complex polytrauma surgery privileges'],

    // Cardiology
    ['Cardiology', 'Interventional Cardiologist', 'BLS', 1, 30, 'Lockout from Cath Lab operative procedures'],
    ['Cardiology', 'Interventional Cardiologist', 'ACLS', 1, 30, 'Mandatory requirement for acute coronary intervention & cath lab sedation'],

    // Obstetrics & Gynecology (OB-GYN)
    ['Obstetrics & Gynecology', 'Obstetrician & Gynecologist', 'BLS', 1, 30, 'Suspension from Labor & Delivery suites'],
    ['Obstetrics & Gynecology', 'Obstetrician & Gynecologist', 'NRP', 1, 30, 'Suspension from neonatal emergency delivery management'],

    // Pediatrics & Neonatology
    ['Pediatrics', 'Pediatrician / Neonatologist', 'BLS', 1, 30, 'Suspension from pediatric ward admitting privileges'],
    ['Pediatrics', 'Pediatrician / Neonatologist', 'PALS', 1, 30, 'Suspension from Pediatric Emergency / PICU attending coverage'],
    ['Pediatrics', 'Pediatrician / Neonatologist', 'NRP', 1, 30, 'Mandatory requirement for NICU delivery suite resuscitation'],

    // General Nursing Staff
    ['Nursing Services', 'Registered Staff Nurse', 'BLS', 1, 30, 'Suspension of direct inpatient bedside care duties']
];

$stmtReq = $pdo->prepare("
    INSERT INTO `hr_life_support_requirements`
        (`department_name`, `clinical_role`, `cert_type`, `is_mandatory`, `grace_period_days`, `clinical_impact_on_lapse`)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE `is_mandatory` = VALUES(`is_mandatory`), `grace_period_days` = VALUES(`grace_period_days`)
");

foreach ($requirements as $r) {
    $stmtReq->execute($r);
}
echo "Seeded " . count($requirements) . " life support role requirements.\n";

// 2. Realistic Life Support Certifications
// Today reference: 2026-10-25
$certifications = [
    // 1. Dr. Marcus Vance (Emp #101) - Internal Medicine
    [
        'code' => 'LSC-2026-0001',
        'emp_id' => 101,
        'name' => 'Dr. Marcus Vance, MD',
        'role' => 'Attending Physician - Internal Medicine',
        'dept_id' => 1,
        'dept_name' => 'Internal Medicine',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-829104',
        'ecard' => 'EC-BLS-2025-VANCE',
        'issue_date' => '2025-05-10',
        'expiry_date' => '2027-05-10',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Robert Callahan, RN, AHA BLS Lead Faculty',
        'site' => 'Metropolitan AHA Regional Training Center',
        'ver_status' => 'verified',
        'notes' => 'AHA eCard verified on direct portal.'
    ],
    [
        'code' => 'LSC-2026-0002',
        'emp_id' => 101,
        'name' => 'Dr. Marcus Vance, MD',
        'role' => 'Attending Physician - Internal Medicine',
        'dept_id' => 1,
        'dept_name' => 'Internal Medicine',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-719302',
        'ecard' => 'EC-ACL-2025-VANCE',
        'issue_date' => '2025-05-12',
        'expiry_date' => '2027-05-12',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Paul Henderson, MD, ACLS Director',
        'site' => 'Metropolitan AHA Regional Training Center',
        'ver_status' => 'verified',
        'notes' => 'Full provider credential. Current for adult medical code responses.'
    ],

    // 2. Dr. Elena Rostova (Emp #102) - General & Trauma Surgery
    [
        'code' => 'LSC-2026-0003',
        'emp_id' => 102,
        'name' => 'Dr. Elena Rostova, MD, FACS',
        'role' => 'Chief of Surgery / Trauma Attending',
        'dept_id' => 2,
        'dept_name' => 'General Surgery',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-902143',
        'ecard' => 'EC-BLS-ROSTOVA-2025',
        'issue_date' => '2025-02-14',
        'expiry_date' => '2027-02-14',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Sarah Jenkins, EMT-P',
        'site' => 'Hospital Simulation & Resuscitation Center',
        'ver_status' => 'verified',
        'notes' => 'Healthcare Provider course certified with high pass.'
    ],
    [
        'code' => 'LSC-2026-0004',
        'emp_id' => 102,
        'name' => 'Dr. Elena Rostova, MD, FACS',
        'role' => 'Chief of Surgery / Trauma Attending',
        'dept_id' => 2,
        'dept_name' => 'General Surgery',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-883921',
        'ecard' => 'EC-ACL-ROSTOVA-2025',
        'issue_date' => '2025-02-16',
        'expiry_date' => '2027-02-16',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Gregory House, MD',
        'site' => 'Hospital Simulation & Resuscitation Center',
        'ver_status' => 'verified',
        'notes' => 'Active provider certificate for OR and trauma resuscitation.'
    ],
    [
        'code' => 'LSC-2026-0005',
        'emp_id' => 102,
        'name' => 'Dr. Elena Rostova, MD, FACS',
        'role' => 'Chief of Surgery / Trauma Attending',
        'dept_id' => 2,
        'dept_name' => 'General Surgery',
        'cert_type' => 'ATLS',
        'issuing_org' => 'American College of Surgeons (ACS) Committee on Trauma',
        'cert_no' => 'ACS-ATLS-449102',
        'ecard' => 'ACS-COT-ROSTOVA-2023',
        'issue_date' => '2023-08-15',
        'expiry_date' => '2027-08-15',
        'validity_years' => 4,
        'status' => 'active',
        'instructor' => 'Dr. Richard Bailey, FACS, ATLS Course Director',
        'site' => 'University Trauma Institute & Simulation Lab',
        'ver_status' => 'verified',
        'notes' => '4-Year ACS ATLS Provider Certification. Satisfies Level 1 Trauma Leader credentialing.'
    ],

    // 3. Dr. Jonathan Hayes (Emp #103) - Interventional Cardiology
    [
        'code' => 'LSC-2026-0006',
        'emp_id' => 103,
        'name' => 'Dr. Jonathan Hayes, MD, FACC',
        'role' => 'Interventional Cardiologist',
        'dept_id' => 3,
        'dept_name' => 'Cardiology',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-772910',
        'ecard' => 'EC-BLS-HAYES-2025',
        'issue_date' => '2025-01-10',
        'expiry_date' => '2027-01-10',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Robert Callahan, RN',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Current and compliant.'
    ],
    [
        'code' => 'LSC-2026-0007',
        'emp_id' => 103,
        'name' => 'Dr. Jonathan Hayes, MD, FACC',
        'role' => 'Interventional Cardiologist',
        'dept_id' => 3,
        'dept_name' => 'Cardiology',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-661029',
        'ecard' => 'EC-ACL-HAYES-2025',
        'issue_date' => '2025-01-12',
        'expiry_date' => '2027-01-12',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Paul Henderson, MD',
        'site' => 'Metropolitan Heart Center',
        'ver_status' => 'verified',
        'notes' => 'Cath lab resuscitation lead certified.'
    ],

    // 4. Dr. Arthur Sterling (Emp #104) - Anesthesiology & Critical Care
    [
        'code' => 'LSC-2026-0008',
        'emp_id' => 104,
        'name' => 'Dr. Arthur Sterling, MD',
        'role' => 'Chief of Anesthesia & Critical Care',
        'dept_id' => 4,
        'dept_name' => 'Anesthesiology',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-552019',
        'ecard' => 'EC-BLS-STERLING-25',
        'issue_date' => '2025-04-10',
        'expiry_date' => '2027-04-10',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Sarah Jenkins, EMT-P',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Compliant.'
    ],
    [
        'code' => 'LSC-2026-0009',
        'emp_id' => 104,
        'name' => 'Dr. Arthur Sterling, MD',
        'role' => 'Chief of Anesthesia & Critical Care',
        'dept_id' => 4,
        'dept_name' => 'Anesthesiology',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-443029',
        'ecard' => 'EC-ACL-STERLING-25',
        'issue_date' => '2025-04-12',
        'expiry_date' => '2027-04-12',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Paul Henderson, MD',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'AHA ACLS Instructor certified.'
    ],
    [
        'code' => 'LSC-2026-0010',
        'emp_id' => 104,
        'name' => 'Dr. Arthur Sterling, MD',
        'role' => 'Chief of Anesthesia & Critical Care',
        'dept_id' => 4,
        'dept_name' => 'Anesthesiology',
        'cert_type' => 'PALS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-PAL-332918',
        'ecard' => 'EC-PAL-STERLING-25',
        'issue_date' => '2025-04-15',
        'expiry_date' => '2027-04-15',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Emily Watson, MD, FAAP',
        'site' => 'Pediatric Resuscitation Training Center',
        'ver_status' => 'verified',
        'notes' => 'Certified for pediatric anesthesia induction emergencies.'
    ],

    // 5. Dr. Sofia Morales (Emp #109) - Emergency Medicine (ACLS Expiring in 21 days!)
    [
        'code' => 'LSC-2026-0011',
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'role' => 'Emergency Medicine Attending',
        'dept_id' => 5,
        'dept_name' => 'Emergency Department',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-991048',
        'ecard' => 'EC-BLS-MORALES-25',
        'issue_date' => '2025-06-18',
        'expiry_date' => '2027-06-18',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Robert Callahan, RN',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Active BLS Provider.'
    ],
    [
        'code' => 'LSC-2026-0012',
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'role' => 'Emergency Medicine Attending',
        'dept_id' => 5,
        'dept_name' => 'Emergency Department',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-112039',
        'ecard' => 'EC-ACL-MORALES-24',
        'issue_date' => '2024-11-15',
        'expiry_date' => '2026-11-15', // 21 days from 2026-10-25 -> expiring_soon / urgent 30-day notice!
        'validity_years' => 2,
        'status' => 'expiring_soon',
        'instructor' => 'Dr. Michael Chang, MD',
        'site' => 'Regional Emergency Training Facility',
        'ver_status' => 'verified',
        'notes' => 'Urgent recertification scheduled with AHA center for Nov 10, 2026.'
    ],
    [
        'code' => 'LSC-2026-0013',
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'role' => 'Emergency Medicine Attending',
        'dept_id' => 5,
        'dept_name' => 'Emergency Department',
        'cert_type' => 'ATLS',
        'issuing_org' => 'American College of Surgeons (ACS) Committee on Trauma',
        'cert_no' => 'ACS-ATL-882049',
        'ecard' => 'ACS-COT-MORALES-24',
        'issue_date' => '2024-03-01',
        'expiry_date' => '2028-03-01',
        'validity_years' => 4,
        'status' => 'active',
        'instructor' => 'Dr. Richard Bailey, FACS',
        'site' => 'University Trauma Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Valid until 2028.'
    ],
    [
        'code' => 'LSC-2026-0014',
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'role' => 'Emergency Medicine Attending',
        'dept_id' => 5,
        'dept_name' => 'Emergency Department',
        'cert_type' => 'PALS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-PAL-551029',
        'ecard' => 'EC-PAL-MORALES-25',
        'issue_date' => '2025-06-20',
        'expiry_date' => '2027-06-20',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. Emily Watson, MD',
        'site' => 'Pediatric Resuscitation Center',
        'ver_status' => 'verified',
        'notes' => 'PALS active.'
    ],

    // 6. Dr. Christopher Nolan (Emp #108) - Orthopedic Surgery (ATLS expiring in 46 days -> 60-day notice)
    [
        'code' => 'LSC-2026-0015',
        'emp_id' => 108,
        'name' => 'Dr. Christopher Nolan, MD',
        'role' => 'Attending Orthopedic Surgeon',
        'dept_id' => 6,
        'dept_name' => 'Orthopedics',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-667120',
        'ecard' => 'EC-BLS-NOLAN-25',
        'issue_date' => '2025-05-18',
        'expiry_date' => '2027-05-18',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Sarah Jenkins, EMT-P',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'BLS active.'
    ],
    [
        'code' => 'LSC-2026-0016',
        'emp_id' => 108,
        'name' => 'Dr. Christopher Nolan, MD',
        'role' => 'Attending Orthopedic Surgeon',
        'dept_id' => 6,
        'dept_name' => 'Orthopedics',
        'cert_type' => 'ATLS',
        'issuing_org' => 'American College of Surgeons (ACS) Committee on Trauma',
        'cert_no' => 'ACS-ATL-331092',
        'ecard' => 'ACS-COT-NOLAN-22',
        'issue_date' => '2022-12-10',
        'expiry_date' => '2026-12-10', // 46 days remaining -> 60-day notice
        'validity_years' => 4,
        'status' => 'expiring_soon',
        'instructor' => 'Dr. Richard Bailey, FACS',
        'site' => 'Trauma Resuscitation Institute',
        'ver_status' => 'verified',
        'notes' => 'Recertification reminder dispatched. Enrolled in December refresher course.'
    ],

    // 7. Dr. Jennifer Reyes (Emp #111) - OB-GYN & Neonatal Care (NRP Valid, BLS Valid)
    [
        'code' => 'LSC-2026-0017',
        'emp_id' => 111,
        'name' => 'Dr. Jennifer Reyes, MD, FACOG',
        'role' => 'Attending Obstetrician & Gynecologist',
        'dept_id' => 7,
        'dept_name' => 'Obstetrics & Gynecology',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-441098',
        'ecard' => 'EC-BLS-REYES-25',
        'issue_date' => '2025-07-01',
        'expiry_date' => '2027-07-01',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Sarah Jenkins, EMT-P',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Current.'
    ],
    [
        'code' => 'LSC-2026-0018',
        'emp_id' => 111,
        'name' => 'Dr. Jennifer Reyes, MD, FACOG',
        'role' => 'Attending Obstetrician & Gynecologist',
        'dept_id' => 7,
        'dept_name' => 'Obstetrics & Gynecology',
        'cert_type' => 'NRP',
        'issuing_org' => 'American Academy of Pediatrics (AAP) / AHA',
        'cert_no' => 'AAP-NRP-992019',
        'ecard' => 'AAP-NRP-REYES-25',
        'issue_date' => '2025-07-05',
        'expiry_date' => '2027-07-05',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Dr. David Miller, MD, FAAP, NRP Director',
        'site' => 'Maternal & Neonatal Simulation Institute',
        'ver_status' => 'verified',
        'notes' => 'Advanced 8th Edition NRP provider: umbilical line placement & advanced resuscitation.'
    ],

    // 8. Rochelle Dizon (Emp #112) - ICU Nurse Specialist (ACLS Expiring in 6 DAYS -> Critical 7-day Alert!)
    [
        'code' => 'LSC-2026-0019',
        'emp_id' => 112,
        'name' => 'Rochelle Dizon, BSN, RN, CCRN',
        'role' => 'Critical Care Nurse Specialist (ICU)',
        'dept_id' => 4,
        'dept_name' => 'Intensive Care Unit (ICU)',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-228190',
        'ecard' => 'EC-BLS-DIZON-25',
        'issue_date' => '2025-08-01',
        'expiry_date' => '2027-08-01',
        'validity_years' => 2,
        'status' => 'active',
        'instructor' => 'Robert Callahan, RN',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'Active BLS Provider.'
    ],
    [
        'code' => 'LSC-2026-0020',
        'emp_id' => 112,
        'name' => 'Rochelle Dizon, BSN, RN, CCRN',
        'role' => 'Critical Care Nurse Specialist (ICU)',
        'dept_id' => 4,
        'dept_name' => 'Intensive Care Unit (ICU)',
        'cert_type' => 'ACLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-ACL-771092',
        'ecard' => 'EC-ACL-DIZON-24',
        'issue_date' => '2024-10-31',
        'expiry_date' => '2026-10-31', // 6 DAYS from 2026-10-25 -> Critical 7-day risk!
        'validity_years' => 2,
        'status' => 'expiring_soon',
        'instructor' => 'Dr. Paul Henderson, MD',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => 'CRITICAL 7-DAY WARNING: Recertification test scheduled for October 29.'
    ],

    // 9. Maria Santos (Emp #110) - Registered Staff Nurse (BLS Expiring in 26 days, NRP Expired 76 days ago!)
    [
        'code' => 'LSC-2026-0021',
        'emp_id' => 110,
        'name' => 'Maria Santos, RN',
        'role' => 'Senior Inpatient Staff Nurse',
        'dept_id' => 8,
        'dept_name' => 'Nursing Services',
        'cert_type' => 'BLS',
        'issuing_org' => 'American Heart Association (AHA)',
        'cert_no' => 'AHA-BLS-334190',
        'ecard' => 'EC-BLS-SANTOS-24',
        'issue_date' => '2024-11-20',
        'expiry_date' => '2026-11-20', // 26 days remaining -> 30-day urgent alert
        'validity_years' => 2,
        'status' => 'expiring_soon',
        'instructor' => 'Sarah Jenkins, EMT-P',
        'site' => 'Hospital Simulation Center',
        'ver_status' => 'verified',
        'notes' => '30-day urgent recertification warning dispatched.'
    ],
    [
        'code' => 'LSC-2026-0022',
        'emp_id' => 110,
        'name' => 'Maria Santos, RN',
        'role' => 'Senior Inpatient Staff Nurse',
        'dept_id' => 8,
        'dept_name' => 'Nursing Services',
        'cert_type' => 'NRP',
        'issuing_org' => 'American Academy of Pediatrics (AAP) / AHA',
        'cert_no' => 'AAP-NRP-118290',
        'ecard' => 'AAP-NRP-SANTOS-24',
        'issue_date' => '2024-08-10',
        'expiry_date' => '2026-08-10', // Expired 76 days ago -> expired status!
        'validity_years' => 2,
        'status' => 'expired',
        'instructor' => 'Dr. David Miller, MD',
        'site' => 'Maternal & Neonatal Simulation Institute',
        'ver_status' => 'unverified',
        'notes' => 'EXPIRED LAPSE: Temporary clinical restriction in place. Barred from neonatal resuscitation shifts.'
    ]
];

$stmtCert = $pdo->prepare("
    INSERT INTO `hr_life_support_certifications` (
        `certification_code`, `employee_id`, `staff_name`, `staff_role`,
        `department_id`, `department_name`, `cert_type`, `issuing_organization`,
        `certificate_number`, `ecard_code`, `issue_date`, `expiry_date`,
        `validity_years`, `status`, `instructor_name`, `training_site`,
        `verification_status`, `verified_by_user`, `verified_at`, `notes`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'Dr. Arthur Sterling, CMO / Credentials Chair', NOW(), ?
    )
");

foreach ($certifications as $c) {
    $stmtCert->execute([
        $c['code'], $c['emp_id'], $c['name'], $c['role'],
        $c['dept_id'], $c['dept_name'], $c['cert_type'], $c['issuing_org'],
        $c['cert_no'], $c['ecard'], $c['issue_date'], $c['expiry_date'],
        $c['validity_years'], $c['status'], $c['instructor'], $c['site'],
        $c['ver_status'], $c['notes']
    ]);
}
echo "Seeded " . count($certifications) . " life support certifications.\n";

// Update sequence counter
$pdo->exec("UPDATE `billing_tariff_counters` SET `last_number` = 22 WHERE `counter_type` = 'LIFE_SUPPORT_CERT' AND `year` = 2026");

// 3. Seed Recertification Reminders Audit Log
$reminders = [
    [
        'cert_id' => 12, // Dr. Sofia Morales ACLS
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'cert_type' => 'ACLS',
        'tier' => '30_day_urgent',
        'days' => 21,
        'expiry' => '2026-11-15',
        'channel' => 'in_app',
        'email' => 'sofia.morales@hospital.org',
        'title' => 'URGENT 30-DAY ACLS RECERTIFICATION REMINDER',
        'body' => 'Notice: Your Advanced Cardiovascular Life Support (ACLS) certificate #AHA-ACL-112039 expires on 2026-11-15 (in 21 days). Please complete your recertification skills check and submit the renewed AHA eCard to the Medical Staff Office to prevent suspension of Code Blue Team Leader privileges.',
        'status' => 'dispatched'
    ],
    [
        'cert_id' => 16, // Dr. Christopher Nolan ATLS
        'emp_id' => 108,
        'name' => 'Dr. Christopher Nolan, MD',
        'cert_type' => 'ATLS',
        'tier' => '60_day_notice',
        'days' => 46,
        'expiry' => '2026-12-10',
        'channel' => 'in_app',
        'email' => 'christopher.nolan@hospital.org',
        'title' => '60-Day Recertification Notice: Advanced Trauma Life Support (ATLS)',
        'body' => 'Formal Advisory: Your ACS ATLS Provider Certification #ACS-ATL-331092 will expire in 46 days (2026-12-10). Register for the upcoming ACS simulation refresher before the cycle deadline.',
        'status' => 'acknowledged'
    ],
    [
        'cert_id' => 20, // Rochelle Dizon ACLS (6 days remaining!)
        'emp_id' => 112,
        'name' => 'Rochelle Dizon, BSN, RN, CCRN',
        'cert_type' => 'ACLS',
        'tier' => '7_day_critical',
        'days' => 6,
        'expiry' => '2026-10-31',
        'channel' => 'clinical_director_alert',
        'email' => 'rochelle.dizon@hospital.org',
        'title' => 'CRITICAL 7-DAY WARNING: ICU ACLS CERTIFICATION EXPIRATION',
        'body' => 'IMMEDIATE ATTENTION: Your ACLS Certification #AHA-ACL-771092 expires on 2026-10-31 (in 6 days). Failure to renew by expiration will trigger automatic removal from the ICU Code Blue and Ventilator patient roster under Hospital Policy HR-CLIN-402.',
        'status' => 'dispatched'
    ],
    [
        'cert_id' => 21, // Maria Santos BLS (26 days)
        'emp_id' => 110,
        'name' => 'Maria Santos, RN',
        'cert_type' => 'BLS',
        'tier' => '30_day_urgent',
        'days' => 26,
        'expiry' => '2026-11-20',
        'channel' => 'in_app',
        'email' => 'maria.santos@hospital.org',
        'title' => 'Urgent 30-Day Reminder: AHA BLS Provider Recertification',
        'body' => 'Reminder: Your Basic Life Support (BLS) certification #AHA-BLS-334190 will expire in 26 days. The hospital education center is hosting hands-on skills checks every Tuesday and Thursday.',
        'status' => 'dispatched'
    ],
    [
        'cert_id' => 22, // Maria Santos NRP (Expired 76 days ago!)
        'emp_id' => 110,
        'name' => 'Maria Santos, RN',
        'cert_type' => 'NRP',
        'tier' => 'expired_lapse',
        'days' => -76,
        'expiry' => '2026-08-10',
        'channel' => 'clinical_director_alert',
        'email' => 'maria.santos@hospital.org',
        'title' => 'CLINICAL RESTRICTION NOTICE: EXPIRED NRP CERTIFICATION',
        'body' => 'GOVERNANCE ALERT: Your Neonatal Resuscitation Program (NRP) certification #AAP-NRP-118290 lapsed on 2026-08-10. Direct delivery suite and neonatal emergency response privileges are suspended until renewed verification is logged.',
        'status' => 'delivered'
    ]
];

$stmtRem = $pdo->prepare("
    INSERT INTO `hr_life_support_reminders` (
        `certification_id`, `employee_id`, `staff_name`, `cert_type`,
        `reminder_tier`, `days_remaining`, `expiry_date`, `notification_channel`,
        `recipient_email`, `message_title`, `message_body`, `dispatched_at`, `status`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, NOW(), ?
    )
");

foreach ($reminders as $rem) {
    $stmtRem->execute([
        $rem['cert_id'], $rem['emp_id'], $rem['name'], $rem['cert_type'],
        $rem['tier'], $rem['days'], $rem['expiry'], $rem['channel'],
        $rem['email'], $rem['title'], $rem['body'], $rem['status']
    ]);
}
echo "Seeded " . count($reminders) . " automated recertification reminder log entries.\n";

echo "Life support clinical certifications seeding completed successfully.\n";
