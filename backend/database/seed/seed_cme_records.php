<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

echo "Seeding CME / CPD Records & Quota Targets...\n";

$pdo = Database::connection();

// Check if already seeded
$cnt = (int)$pdo->query("SELECT COUNT(*) FROM hr_cme_records")->fetchColumn();
if ($cnt > 0) {
    echo "CME records already seeded ({$cnt} records found).\n";
    exit(0);
}

// 1. Quota Targets
$quotas = [
    [
        'employee_id' => 102, // Dr. Elena Rostova
        'target_year' => 2026,
        'license_type' => 'State Medical License & Surgery Board Renewal',
        'required_units' => 50.00,
        'earned_units' => 42.50,
        'cycle_start_date' => '2025-01-01',
        'renewal_due_date' => '2026-12-31',
        'compliance_status' => 'compliant',
        'notes' => 'Mandatory triennial CME requirement for surgical attending privileges.'
    ],
    [
        'employee_id' => 103, // Dr. Jonathan Hayes
        'target_year' => 2026,
        'license_type' => 'Interventional Cardiology Specialty Maintenance (MOC)',
        'required_units' => 30.00,
        'earned_units' => 28.00,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-11-30',
        'compliance_status' => 'compliant',
        'notes' => 'American Board of Internal Medicine (ABIM) continuous certification.'
    ],
    [
        'employee_id' => 104, // Dr. Arthur Sterling
        'target_year' => 2026,
        'license_type' => 'Anesthesiology & Critical Care Board Recertification',
        'required_units' => 35.00,
        'earned_units' => 32.00,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-12-15',
        'compliance_status' => 'compliant',
        'notes' => 'Includes mandatory advanced pediatric airway and hemodynamic monitoring credits.'
    ],
    [
        'employee_id' => 108, // Dr. Christopher Nolan
        'target_year' => 2026,
        'license_type' => 'Orthopedic Surgery Board Renewal',
        'required_units' => 40.00,
        'earned_units' => 18.00,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-12-31',
        'compliance_status' => 'behind_schedule',
        'notes' => 'Requires 22 more units before Q4 renewal deadline; needs subspecialty trauma seminar.'
    ],
    [
        'employee_id' => 111, // Dr. Jennifer Reyes
        'target_year' => 2026,
        'license_type' => 'Obstetrics & Gynecology License Recertification',
        'required_units' => 30.00,
        'earned_units' => 24.50,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-12-31',
        'compliance_status' => 'on_track',
        'notes' => 'Satisfied maternal-fetal medicine and neonatal resuscitation prerequisites.'
    ],
    [
        'employee_id' => 109, // Dr. Sofia Morales
        'target_year' => 2026,
        'license_type' => 'Emergency Medicine Board Renewal (ABEM)',
        'required_units' => 30.00,
        'earned_units' => 29.00,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-11-15',
        'compliance_status' => 'compliant',
        'notes' => 'Completed trauma life support and disaster triage symposiums.'
    ],
    [
        'employee_id' => 101, // Dr. Marcus Vance
        'target_year' => 2026,
        'license_type' => 'Internal Medicine Physician License Triennial',
        'required_units' => 50.00,
        'earned_units' => 52.00,
        'cycle_start_date' => '2024-01-01',
        'renewal_due_date' => '2026-12-31',
        'compliance_status' => 'compliant',
        'notes' => 'Exceeded required units; fully compliant for 2027 renewal filing.'
    ],
    [
        'employee_id' => 110, // Maria Santos
        'target_year' => 2026,
        'license_type' => 'Registered Professional Nurse CPD Renewal',
        'required_units' => 20.00,
        'earned_units' => 19.50,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-10-31',
        'compliance_status' => 'compliant',
        'notes' => 'Mandatory nursing IV therapy and infection control competencies fulfilled.'
    ],
    [
        'employee_id' => 112, // Rochelle Dizon
        'target_year' => 2026,
        'license_type' => 'Critical Care Nurse Specialist CPD',
        'required_units' => 20.00,
        'earned_units' => 8.00,
        'cycle_start_date' => '2026-01-01',
        'renewal_due_date' => '2026-11-30',
        'compliance_status' => 'behind_schedule',
        'notes' => 'Needs 12 CPD points before Q4 license renewal window.'
    ]
];

$insQ = $pdo->prepare("
    INSERT INTO hr_cme_quota_targets (
        employee_id, target_year, license_type, required_units, earned_units,
        cycle_start_date, renewal_due_date, compliance_status, notes, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, NOW(), NOW()
    )
");

foreach ($quotas as $q) {
    $insQ->execute([
        $q['employee_id'], $q['target_year'], $q['license_type'], $q['required_units'], $q['earned_units'],
        $q['cycle_start_date'], $q['renewal_due_date'], $q['compliance_status'], $q['notes']
    ]);
}
echo "Seeded " . count($quotas) . " CME Quota Targets.\n";

// 2. CME Records
$records = [
    // Dr. Elena Rostova (Surgery)
    [
        'code' => 'CME-2026-0001',
        'emp_id' => 102,
        'title' => 'American College of Surgeons (ACS) Clinical Congress 2026',
        'type' => 'conference',
        'accreditor' => 'American College of Surgeons / ACCME',
        'date' => '2026-10-04',
        'venue' => 'San Diego Convention Center, CA',
        'units' => 18.50,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ACS-CC-2026-98124',
        'cert_file' => 'cert_elena_acs_congress.pdf',
        'status' => 'verified',
        'target_license' => 'State Medical License & Surgery Board Renewal'
    ],
    [
        'code' => 'CME-2026-0002',
        'emp_id' => 102,
        'title' => 'Advanced Minimally Invasive Laparoscopic Masterclass',
        'type' => 'workshop',
        'accreditor' => 'Society of American Gastrointestinal and Endoscopic Surgeons (SAGES)',
        'date' => '2026-06-12',
        'venue' => 'Johns Hopkins Simulation Center, Baltimore, MD',
        'units' => 14.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'SAGES-WKS-2026-4412',
        'cert_file' => 'cert_elena_sages_laparoscopy.pdf',
        'status' => 'verified',
        'target_license' => 'State Medical License & Surgery Board Renewal'
    ],
    [
        'code' => 'CME-2026-0003',
        'emp_id' => 102,
        'title' => 'Healthcare Ethics, Informed Consent & Patient Safety in Complex Surgery',
        'type' => 'webinar',
        'accreditor' => 'AMA PRA Category 1 Credit Provider',
        'date' => '2026-03-18',
        'venue' => 'Online Virtual Interactive Webinar',
        'units' => 5.00,
        'category' => 'Ethics & Patient Safety',
        'cert_no' => 'AMA-ETH-2026-0129',
        'cert_file' => 'cert_elena_ethics.pdf',
        'status' => 'verified',
        'target_license' => 'State Medical License & Surgery Board Renewal'
    ],
    [
        'code' => 'CME-2026-0004',
        'emp_id' => 102,
        'title' => 'Hospital Surgical Mortality & Morbidity (M&M) Grand Rounds (Q1-Q2)',
        'type' => 'institutional_grand_rounds',
        'accreditor' => 'UsIntellix Medical Education Committee',
        'date' => '2026-07-22',
        'venue' => 'Hospital Main Auditorium & Virtual Broadcast',
        'units' => 5.00,
        'category' => 'Category 2 (Self-Directed)',
        'cert_no' => 'UIH-MM-2026-08',
        'cert_file' => 'cert_elena_grandrounds.pdf',
        'status' => 'verified',
        'target_license' => 'State Medical License & Surgery Board Renewal'
    ],

    // Dr. Jonathan Hayes (Cardiology)
    [
        'code' => 'CME-2026-0005',
        'emp_id' => 103,
        'title' => 'American College of Cardiology (ACC) Scientific Sessions 2026',
        'type' => 'conference',
        'accreditor' => 'American College of Cardiology / ACCME',
        'date' => '2026-04-02',
        'venue' => 'Atlanta World Congress Center, GA',
        'units' => 16.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ACC-SS-2026-7811',
        'cert_file' => 'cert_hayes_acc.pdf',
        'status' => 'verified',
        'target_license' => 'Interventional Cardiology Specialty Maintenance (MOC)'
    ],
    [
        'code' => 'CME-2026-0006',
        'emp_id' => 103,
        'title' => 'Transcatheter Aortic Valve Replacement (TAVR) Hands-on Simulator Training',
        'type' => 'workshop',
        'accreditor' => 'Cardiovascular Research Foundation (CRF)',
        'date' => '2026-08-14',
        'venue' => 'Cleveland Clinic Wet Lab Simulator',
        'units' => 12.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'CRF-TAVR-2026-009',
        'cert_file' => 'cert_hayes_tavr.pdf',
        'status' => 'verified',
        'target_license' => 'Interventional Cardiology Specialty Maintenance (MOC)'
    ],

    // Dr. Arthur Sterling (Anesthesiology)
    [
        'code' => 'CME-2026-0007',
        'emp_id' => 104,
        'title' => 'American Society of Anesthesiologists (ASA) ANESTHESIOLOGY 2026',
        'type' => 'conference',
        'accreditor' => 'American Society of Anesthesiologists / ACCME',
        'date' => '2026-10-18',
        'venue' => 'Philadelphia Convention Center, PA',
        'units' => 20.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ASA-AN-2026-90412',
        'cert_file' => 'cert_sterling_asa.pdf',
        'status' => 'verified',
        'target_license' => 'Anesthesiology & Critical Care Board Recertification'
    ],
    [
        'code' => 'CME-2026-0008',
        'emp_id' => 104,
        'title' => 'Ultrasound-Guided Regional Nerve Blocks & Acute Pain Management',
        'type' => 'workshop',
        'accreditor' => 'American Society of Regional Anesthesia and Pain Medicine (ASRA)',
        'date' => '2026-05-19',
        'venue' => 'Mayo Clinic Clinical Simulation Pavilion',
        'units' => 8.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ASRA-US-2026-302',
        'cert_file' => 'cert_sterling_asra.pdf',
        'status' => 'verified',
        'target_license' => 'Anesthesiology & Critical Care Board Recertification'
    ],
    [
        'code' => 'CME-2026-0009',
        'emp_id' => 104,
        'title' => 'Advanced Cardiac Life Support (ACLS) Instructor Recertification',
        'type' => 'workshop',
        'accreditor' => 'American Heart Association (AHA)',
        'date' => '2026-02-10',
        'venue' => 'UsIntellix Hospital Resuscitation Training Center',
        'units' => 4.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'AHA-ACLS-2026-8801',
        'cert_file' => 'cert_sterling_acls.pdf',
        'status' => 'verified',
        'target_license' => 'Anesthesiology & Critical Care Board Recertification'
    ],

    // Dr. Christopher Nolan (Orthopedics)
    [
        'code' => 'CME-2026-0010',
        'emp_id' => 108,
        'title' => 'American Academy of Orthopaedic Surgeons (AAOS) Annual Meeting',
        'type' => 'conference',
        'accreditor' => 'American Academy of Orthopaedic Surgeons / ACCME',
        'date' => '2026-03-24',
        'venue' => 'McCormick Place, Chicago, IL',
        'units' => 18.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'AAOS-2026-55412',
        'cert_file' => 'cert_nolan_aaos.pdf',
        'status' => 'verified',
        'target_license' => 'Orthopedic Surgery Board Renewal'
    ],

    // Dr. Jennifer Reyes (OB-GYN)
    [
        'code' => 'CME-2026-0011',
        'emp_id' => 111,
        'title' => 'American College of Obstetricians and Gynecologists (ACOG) Annual Meeting',
        'type' => 'conference',
        'accreditor' => 'ACOG / ACCME',
        'date' => '2026-05-08',
        'venue' => 'San Francisco Moscone Center, CA',
        'units' => 16.50,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ACOG-AM-2026-1189',
        'cert_file' => 'cert_reyes_acog.pdf',
        'status' => 'verified',
        'target_license' => 'Obstetrics & Gynecology License Recertification'
    ],
    [
        'code' => 'CME-2026-0012',
        'emp_id' => 111,
        'title' => 'Neonatal Resuscitation Program (NRP) 8th Edition Provider Course',
        'type' => 'workshop',
        'accreditor' => 'American Academy of Pediatrics (AAP) / AHA',
        'date' => '2026-08-20',
        'venue' => 'UsIntellix NICU Skills Lab',
        'units' => 8.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'NRP-8TH-2026-0044',
        'cert_file' => 'cert_reyes_nrp.pdf',
        'status' => 'verified',
        'target_license' => 'Obstetrics & Gynecology License Recertification'
    ],

    // Maria Santos (Nursing Supervisor)
    [
        'code' => 'CME-2026-0013',
        'emp_id' => 110,
        'title' => 'American Nurses Credentialing Center (ANCC) National Magnet Conference',
        'type' => 'conference',
        'accreditor' => 'ANCC / Commission on Accreditation',
        'date' => '2026-09-15',
        'venue' => 'New Orleans Ernest N. Morial Center, LA',
        'units' => 12.00,
        'category' => 'Category 1 (Formal CME)',
        'cert_no' => 'ANCC-MAG-2026-891',
        'cert_file' => 'cert_santos_ancc.pdf',
        'status' => 'verified',
        'target_license' => 'Registered Professional Nurse CPD Renewal'
    ],
    [
        'code' => 'CME-2026-0014',
        'emp_id' => 110,
        'title' => 'Hospital Infection Prevention & Bloodborne Pathogens Control',
        'type' => 'workshop',
        'accreditor' => 'Association for Professionals in Infection Control (APIC)',
        'date' => '2026-04-11',
        'venue' => 'UsIntellix Hospital Nursing Education Hall',
        'units' => 7.50,
        'category' => 'Infection Control',
        'cert_no' => 'APIC-IPC-2026-091',
        'cert_file' => 'cert_santos_infection_control.pdf',
        'status' => 'verified',
        'target_license' => 'Registered Professional Nurse CPD Renewal'
    ]
];

$insR = $pdo->prepare("
    INSERT INTO hr_cme_records (
        record_code, employee_id, activity_title, activity_type, accrediting_body,
        activity_date, venue, credit_units, category_type, certificate_number,
        certificate_file_name, verification_status, target_license_type, target_cycle_year,
        created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 2026,
        NOW(), NOW()
    )
");

foreach ($records as $r) {
    $insR->execute([
        $r['code'], $r['emp_id'], $r['title'], $r['type'], $r['accreditor'],
        $r['date'], $r['venue'], $r['units'], $r['category'], $r['cert_no'],
        $r['cert_file'], $r['status'], $r['target_license']
    ]);
}

echo "Successfully seeded " . count($records) . " CME / CPD Activity Records!\n";
