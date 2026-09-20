<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';
require_once __DIR__ . '/../backend/config/database.php';

use App\Core\Database;

echo "=== SEEDING INPATIENT BED MANAGEMENT & ADT ===\n";

$db = Database::connection();

// 1. Run Schema Migration
$sql = file_get_contents(__DIR__ . '/../backend/database/schema/190_inpatient_bed_adt.sql');
$db->exec($sql);
echo "[OK] Schema 190_inpatient_bed_adt.sql migrated successfully.\n";

// Clear existing ADT data if resetting
$db->exec("SET FOREIGN_KEY_CHECKS = 0;");
$db->exec("TRUNCATE TABLE inpatient_transfers;");
$db->exec("TRUNCATE TABLE inpatient_admissions;");
$db->exec("TRUNCATE TABLE hospital_beds;");
$db->exec("TRUNCATE TABLE hospital_wards;");
$db->exec("SET FOREIGN_KEY_CHECKS = 1;");

// 2. Insert Wards
$wards = [
    [
        'ward_code'          => 'ICU',
        'ward_name'          => 'Intensive Care Unit (ICU)',
        'ward_type'          => 'ICU',
        'floor_location'     => '4th Floor - Tower A',
        'gender_restriction' => 'All',
        'head_nurse'         => 'Maria Santos, RN, CCRN',
        'beds' => [
            ['ICU-01', 'Room 401', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor, Syringe Pumps'],
            ['ICU-02', 'Room 402', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor, Syringe Pumps'],
            ['ICU-03', 'Room 403', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor, CRRT Port'],
            ['ICU-04', 'Room 404', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor'],
            ['ICU-05', 'Room 405', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor'],
            ['ICU-06', 'Room 406', 'ICU Monitor Bed', 'Telemetry, Ventilator, Hemodynamic Monitor'],
        ]
    ],
    [
        'ward_code'          => 'SURG-W',
        'ward_name'          => 'Surgical Inpatient Ward',
        'ward_type'          => 'Surgical',
        'floor_location'     => '2nd Floor - West Wing',
        'gender_restriction' => 'All',
        'head_nurse'         => 'Jennifer Reyes, RN, BSN',
        'beds' => [
            ['SURG-201A', 'Room 201', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Call Bell'],
            ['SURG-201B', 'Room 201', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Call Bell'],
            ['SURG-202A', 'Room 202', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Overhead Trapeze'],
            ['SURG-202B', 'Room 202', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Call Bell'],
            ['SURG-203A', 'Room 203', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Call Bell'],
            ['SURG-203B', 'Room 203', 'Standard Acute Bed', 'Oxygen, Suction, Electric Bed, Call Bell'],
            ['SURG-204A', 'Room 204', 'Stepdown Bed',       'Telemetry, Oxygen, Suction, Air Mattress'],
            ['SURG-204B', 'Room 204', 'Stepdown Bed',       'Telemetry, Oxygen, Suction, Air Mattress'],
        ]
    ],
    [
        'ward_code'          => 'MED-W',
        'ward_name'          => 'Medical Inpatient Ward',
        'ward_type'          => 'Medical',
        'floor_location'     => '3rd Floor - East Wing',
        'gender_restriction' => 'All',
        'head_nurse'         => 'Rochelle Dizon, RN',
        'beds' => [
            ['MED-301A', 'Room 301', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-301B', 'Room 301', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-302A', 'Room 302', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-302B', 'Room 302', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-303A', 'Room 303', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-303B', 'Room 303', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-304A', 'Room 304', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
            ['MED-304B', 'Room 304', 'Standard Acute Bed', 'Oxygen, Suction, IV Pole, Patient Monitor'],
        ]
    ],
    [
        'ward_code'          => 'PED-W',
        'ward_name'          => 'Pediatric Care Unit',
        'ward_type'          => 'Pediatric',
        'floor_location'     => '1st Floor - Children Pavillion',
        'gender_restriction' => 'Pediatric',
        'head_nurse'         => 'Grace Tan, RN, CPN',
        'beds' => [
            ['PEDS-101', 'Room 101', 'Pediatric Crib',    'Pediatric Rails, O2 Blender, Radiant Warmer, Toys'],
            ['PEDS-102', 'Room 102', 'Pediatric Crib',    'Pediatric Rails, O2 Blender, Vital Signs Monitor'],
            ['PEDS-103', 'Room 103', 'Standard Acute Bed', 'Pediatric Bed, Parent Recliner, Oxygen, Suction'],
            ['PEDS-104', 'Room 104', 'Standard Acute Bed', 'Pediatric Bed, Parent Recliner, Oxygen, Suction'],
        ]
    ],
    [
        'ward_code'          => 'ISOL',
        'ward_name'          => 'Isolation Negative Pressure Unit',
        'ward_type'          => 'Isolation',
        'floor_location'     => '4th Floor - Bio-Containment Suite',
        'gender_restriction' => 'All',
        'head_nurse'         => 'Arnel Mendoza, RN, CIC',
        'beds' => [
            ['ISOL-01', 'Room 451', 'Negative Pressure Isolation', 'Negative Pressure -2.5Pa, Anteroom, HEPA Filter, UV Germicidal'],
            ['ISOL-02', 'Room 452', 'Negative Pressure Isolation', 'Negative Pressure -2.5Pa, Anteroom, HEPA Filter, UV Germicidal'],
        ]
    ]
];

$wardIdMap = [];
$bedIdMap = [];

$wardStmt = $db->prepare("
    INSERT INTO hospital_wards (ward_code, ward_name, ward_type, floor_location, gender_restriction, total_beds_count, head_nurse, is_active, created_at)
    VALUES (:code, :name, :type, :floor, :gender, :total, :head, 1, NOW())
");

$bedStmt = $db->prepare("
    INSERT INTO hospital_beds (ward_id, bed_number, room_number, bed_type, status, features, is_active, created_at)
    VALUES (:ward_id, :bed_num, :room_num, :bed_type, :status, :features, 1, NOW())
");

foreach ($wards as $w) {
    $wardStmt->execute([
        'code'   => $w['ward_code'],
        'name'   => $w['ward_name'],
        'type'   => $w['ward_type'],
        'floor'  => $w['floor_location'],
        'gender' => $w['gender_restriction'],
        'total'  => count($w['beds']),
        'head'   => $w['head_nurse'],
    ]);
    $wardId = (int) $db->lastInsertId();
    $wardIdMap[$w['ward_code']] = $wardId;

    foreach ($w['beds'] as $b) {
        $bedStmt->execute([
            'ward_id'  => $wardId,
            'bed_num'  => $b[0],
            'room_num' => $b[1],
            'bed_type' => $b[2],
            'status'   => 'Available',
            'features' => $b[3],
        ]);
        $bedId = (int) $db->lastInsertId();
        $bedIdMap[$b[0]] = $bedId;
    }
}
echo "[OK] 5 Wards and 28 Beds seeded.\n";

// 3. Seed Inpatient Admissions linked to EHR Patients
// Find real patients
$patients = $db->query("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients ORDER BY id ASC LIMIT 28")->fetchAll(PDO::FETCH_ASSOC);
$pMap = [];
foreach ($patients as $p) {
    $pMap[$p['patient_no']] = $p;
}

$now = date('Y-m-d H:i:s');
$admissionsData = [
    [
        'adm_no'      => 'ADM-2026-0001',
        'patient_mrn' => 'PAT-000021',
        'ward_code'   => 'SURG-W',
        'bed_code'    => 'SURG-201A',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-2 days 08:30')),
        'source'      => 'Post-Op PACU / Surgical',
        'type'        => 'Urgent',
        'diagnosis'   => 'K80.00 Acute Cholecystitis with Cholelithiasis (Post-Op Day 2)',
        'doctor'      => 'Dr. Mark Villareal, MD, FPCS',
        'nurse'       => 'J. Reyes, RN',
        'isolation'   => 'Standard',
        'expected'    => date('Y-m-d', strtotime('+1 day')),
        'status'      => 'Admitted',
    ],
    [
        'adm_no'      => 'ADM-2026-0002',
        'patient_mrn' => 'PAT-000022',
        'ward_code'   => 'ICU',
        'bed_code'    => 'ICU-01',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-1 days 14:15')),
        'source'      => 'Post-Op PACU / Surgical',
        'type'        => 'Emergency / STAT',
        'diagnosis'   => 'I25.10 Coronary Artery Disease post CABG x3 graft',
        'doctor'      => 'Dr. Patricia Lim, MD, FPCC',
        'nurse'       => 'M. Santos, RN, CCRN',
        'isolation'   => 'Standard',
        'expected'    => date('Y-m-d', strtotime('+3 days')),
        'status'      => 'Admitted',
    ],
    [
        'adm_no'      => 'ADM-2026-0003',
        'patient_mrn' => 'PAT-000023',
        'ward_code'   => 'SURG-W',
        'bed_code'    => 'SURG-202A',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-3 days 09:00')),
        'source'      => 'Post-Op PACU / Surgical',
        'type'        => 'Elective',
        'diagnosis'   => 'M17.11 Primary Osteoarthritis, Right Knee (Post-TKR Day 3)',
        'doctor'      => 'Dr. Patrick Gomez, MD, FPOA',
        'nurse'       => 'C. De Leon, RN',
        'isolation'   => 'Standard',
        'expected'    => date('Y-m-d', strtotime('+2 days')),
        'status'      => 'Admitted',
    ],
    [
        'adm_no'      => 'ADM-2026-0004',
        'patient_mrn' => 'PAT-000024',
        'ward_code'   => 'MED-W',
        'bed_code'    => 'MED-301A',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-4 days 19:40')),
        'source'      => 'Emergency Room (ER)',
        'type'        => 'Urgent',
        'diagnosis'   => 'J18.9 Community-Acquired Pneumonia with Acute COPD Exacerbation',
        'doctor'      => 'Dr. Evelyn Cruz, MD, FPCP',
        'nurse'       => 'R. Dizon, RN',
        'isolation'   => 'Droplet',
        'expected'    => date('Y-m-d', strtotime('+1 day')),
        'status'      => 'Admitted',
    ],
    [
        'adm_no'      => 'ADM-2026-0005',
        'patient_mrn' => 'PAT-000025',
        'ward_code'   => 'SURG-W',
        'bed_code'    => 'SURG-203A',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-3 days 11:20')),
        'source'      => 'Outpatient Clinic',
        'type'        => 'Elective',
        'diagnosis'   => 'K35.80 Acute Appendectomy recovery - Vitally Stable',
        'doctor'      => 'Dr. Mark Villareal, MD, FPCS',
        'nurse'       => 'J. Reyes, RN',
        'isolation'   => 'Standard',
        'expected'    => date('Y-m-d'),
        'status'      => 'Pending Discharge',
    ],
    [
        'adm_no'      => 'ADM-2026-0006',
        'patient_mrn' => 'PAT-000026',
        'ward_code'   => 'ISOL',
        'bed_code'    => 'ISOL-01',
        'adm_date'    => date('Y-m-d H:i:s', strtotime('-5 days 16:10')),
        'source'      => 'Emergency Room (ER)',
        'type'        => 'Urgent',
        'diagnosis'   => 'A15.0 Tuberculosis of lung, confirmed by sputum microscopy',
        'doctor'      => 'Dr. Evelyn Cruz, MD, FPCP',
        'nurse'       => 'A. Mendoza, RN, CIC',
        'isolation'   => 'Airborne',
        'expected'    => date('Y-m-d', strtotime('+7 days')),
        'status'      => 'Admitted',
    ],
];

$admStmt = $db->prepare("
    INSERT INTO inpatient_admissions (
        admission_number, patient_id, patient_name, patient_mrn, patient_age, gender,
        ward_id, bed_id, admission_date, admission_source, admission_type,
        admitting_diagnosis, attending_physician, primary_nurse, isolation_precautions,
        expected_discharge_date, status, created_at
    ) VALUES (
        :adm_no, :pid, :pname, :pmrn, :page, :gender,
        :wid, :bid, :adate, :source, :type,
        :diag, :doc, :nurse, :isol,
        :expected, :status, :created_at
    )
");

foreach ($admissionsData as $adm) {
    $mrn = $adm['patient_mrn'];
    $pat = $pMap[$mrn] ?? null;

    $pName = $pat ? trim($pat['first_name'] . ' ' . $pat['middle_name'] . ' ' . $pat['last_name']) : 'Patient ' . $mrn;
    $pId = $pat ? (int) $pat['id'] : null;
    $gender = $pat ? $pat['sex'] : 'Male';
    $age = 45;
    if ($pat && !empty($pat['birthdate'])) {
        $age = (new \DateTime())->diff(new \DateTime($pat['birthdate']))->y;
    }

    $wId = $wardIdMap[$adm['ward_code']];
    $bId = $bedIdMap[$adm['bed_code']];

    $admStmt->execute([
        'adm_no'     => $adm['adm_no'],
        'pid'        => $pId,
        'pname'      => $pName,
        'pmrn'       => $mrn,
        'page'       => $age,
        'gender'     => $gender,
        'wid'        => $wId,
        'bid'        => $bId,
        'adate'      => $adm['adm_date'],
        'source'     => $adm['source'],
        'type'       => $adm['type'],
        'diag'       => $adm['diagnosis'],
        'doc'        => $adm['doctor'],
        'nurse'      => $adm['nurse'],
        'isol'       => $adm['isolation'],
        'expected'   => $adm['expected'],
        'status'     => $adm['status'],
        'created_at' => $adm['adm_date'],
    ]);

    $admId = (int) $db->lastInsertId();

    // Mark bed status
    $bedStatus = $adm['status'] === 'Pending Discharge' ? 'Pending Discharge' : 'Occupied';
    $db->prepare("UPDATE hospital_beds SET status = :status, current_admission_id = :aid WHERE id = :bid")
       ->execute(['status' => $bedStatus, 'aid' => $admId, 'bid' => $bId]);
}
echo "[OK] 6 Active Inpatient Admissions seeded and beds linked.\n";

// Set 1 bed in Dirty / Turnover
$dirtyBedId = $bedIdMap['SURG-204A'];
$db->prepare("UPDATE hospital_beds SET status = 'Dirty / Turnover', current_admission_id = NULL WHERE id = :bid")
   ->execute(['bid' => $dirtyBedId]);

// Set 1 bed in Maintenance
$maintBedId = $bedIdMap['ICU-06'];
$db->prepare("UPDATE hospital_beds SET status = 'Maintenance', current_admission_id = NULL WHERE id = :bid")
   ->execute(['bid' => $maintBedId]);

echo "[OK] Dirty / Turnover and Maintenance beds marked.\n";
echo "=== SEEDING COMPLETED SUCCESSFULLY ===\n";
