<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\DoctorCommissions\Services\DoctorCommissionService;

echo "Seeding Settled Doctor Case Commissions from Billing (Subsystem 6)...\n";

$pdo = Database::connection();
$service = new DoctorCommissionService();

// Clean up duplicate seed test rows if any or check existing
$existingCount = (int)$pdo->query("SELECT COUNT(*) FROM billing_doctor_commission_ledger WHERE notes LIKE '%October 2026 Billing Settlement%'")->fetchColumn();
if ($existingCount > 0) {
    echo "Already seeded {$existingCount} October 2026 settled case commissions.\n";
    exit(0);
}

$cases = [
    // --- 1. CONSULTATIONS (Outpatient / Ambulatory) ---
    [
        'doctor_id' => 103,
        'doctor_name' => 'Dr. Jonathan Hayes',
        'doctor_specialty' => 'Interventional Cardiology',
        'patient_id' => 1,
        'patient_name' => 'Eleanor Vance',
        'source_type' => 'ambulatory_encounter',
        'source_ref' => 'ENC-2026-10012',
        'item_code' => 'SRV-CONS-CARDIO',
        'desc' => 'Outpatient Cardiology Specialist Consultation & 12-Lead ECG Review',
        'cat' => 'consultation',
        'gross' => 250.00,
        'status' => 'earned',
        'date' => '2026-10-04 10:30:00'
    ],
    [
        'doctor_id' => 103,
        'doctor_name' => 'Dr. Jonathan Hayes',
        'doctor_specialty' => 'Interventional Cardiology',
        'patient_id' => 2,
        'patient_name' => 'Marcus Vance',
        'source_type' => 'ambulatory_encounter',
        'source_ref' => 'ENC-2026-10045',
        'item_code' => 'SRV-CONS-CARDIO-REV',
        'desc' => 'Cardiovascular Stress Echo Evaluation & Follow-Up Review',
        'cat' => 'consultation',
        'gross' => 300.00,
        'status' => 'earned',
        'date' => '2026-10-12 14:15:00'
    ],
    [
        'doctor_id' => 101,
        'doctor_name' => 'Dr. Marcus Vance',
        'doctor_specialty' => 'Internal Medicine',
        'patient_id' => 3,
        'patient_name' => 'Robert Hawthorne',
        'source_type' => 'ambulatory_encounter',
        'source_ref' => 'ENC-2026-10088',
        'item_code' => 'SRV-CONS-IM-01',
        'desc' => 'Internal Medicine Comprehensive Health Assessment & Metabolic Screening',
        'cat' => 'consultation',
        'gross' => 280.00,
        'status' => 'earned',
        'date' => '2026-10-08 09:45:00'
    ],
    [
        'doctor_id' => 111,
        'doctor_name' => 'Dr. Jennifer Reyes',
        'doctor_specialty' => 'Obstetrics & Gynecology',
        'patient_id' => 4,
        'patient_name' => 'Clara Oswald',
        'source_type' => 'ambulatory_encounter',
        'source_ref' => 'ENC-2026-10102',
        'item_code' => 'SRV-CONS-OBGYN',
        'desc' => 'Antenatal High-Risk Pregnancy Obstetric Consultation',
        'cat' => 'consultation',
        'gross' => 220.00,
        'status' => 'earned',
        'date' => '2026-10-14 11:20:00'
    ],
    [
        'doctor_id' => 109,
        'doctor_name' => 'Dr. Sofia Morales',
        'doctor_specialty' => 'Emergency Medicine',
        'patient_id' => 5,
        'patient_name' => 'David Tennant',
        'source_type' => 'cashier_transaction',
        'source_ref' => 'TXN-2026-10219',
        'item_code' => 'SRV-CONS-ER-URG',
        'desc' => 'Urgent Care Specialist Clinical Assessment & Resuscitation',
        'cat' => 'consultation',
        'gross' => 350.00,
        'status' => 'earned',
        'date' => '2026-10-18 21:05:00'
    ],

    // --- 2. WARD ROUNDS (Inpatient Daily Rounds) ---
    [
        'doctor_id' => 102,
        'doctor_name' => 'Dr. Elena Rostova',
        'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
        'patient_id' => 1,
        'patient_name' => 'Eleanor Vance',
        'source_type' => 'inpatient_folio',
        'source_ref' => 'FOL-2026-10022',
        'item_code' => 'SRV-ROUNDS-SURG',
        'desc' => 'Post-Operative Inpatient Ward Rounds (Days 1–3) Bedside Monitoring',
        'cat' => 'daily_ward_round',
        'gross' => 600.00,
        'status' => 'earned',
        'date' => '2026-10-06 08:30:00'
    ],
    [
        'doctor_id' => 102,
        'doctor_name' => 'Dr. Elena Rostova',
        'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
        'patient_id' => 6,
        'patient_name' => 'Sarah Connor',
        'source_type' => 'inpatient_folio',
        'source_ref' => 'FOL-2026-10051',
        'item_code' => 'SRV-ROUNDS-SURG-2',
        'desc' => 'Attending Surgeon Post-Appendectomy Daily Inpatient Rounds (2 Days)',
        'cat' => 'daily_ward_round',
        'gross' => 400.00,
        'status' => 'earned',
        'date' => '2026-10-15 08:45:00'
    ],
    [
        'doctor_id' => 103,
        'doctor_name' => 'Dr. Jonathan Hayes',
        'doctor_specialty' => 'Interventional Cardiology',
        'patient_id' => 3,
        'patient_name' => 'Robert Hawthorne',
        'source_type' => 'inpatient_folio',
        'source_ref' => 'FOL-2026-10034',
        'item_code' => 'SRV-ROUNDS-ICU-CARD',
        'desc' => 'Cardiac Care Unit (CCU) Inpatient Attending Specialist Rounds (4 Days)',
        'cat' => 'daily_ward_round',
        'gross' => 800.00,
        'status' => 'earned',
        'date' => '2026-10-10 09:00:00'
    ],
    [
        'doctor_id' => 101,
        'doctor_name' => 'Dr. Marcus Vance',
        'doctor_specialty' => 'Internal Medicine',
        'patient_id' => 7,
        'patient_name' => 'James Holden',
        'source_type' => 'inpatient_folio',
        'source_ref' => 'FOL-2026-10077',
        'item_code' => 'SRV-ROUNDS-IM',
        'desc' => 'Internal Medicine Ward Rounds for Acute Exacerbation of COPD (3 Days)',
        'cat' => 'daily_ward_round',
        'gross' => 450.00,
        'status' => 'earned',
        'date' => '2026-10-16 09:15:00'
    ],
    [
        'doctor_id' => 111,
        'doctor_name' => 'Dr. Jennifer Reyes',
        'doctor_specialty' => 'Obstetrics & Gynecology',
        'patient_id' => 4,
        'patient_name' => 'Clara Oswald',
        'source_type' => 'inpatient_folio',
        'source_ref' => 'FOL-2026-10090',
        'item_code' => 'SRV-ROUNDS-MAT',
        'desc' => 'Maternity Ward Post-Partum Attending Physician Inpatient Rounds',
        'cat' => 'daily_ward_round',
        'gross' => 350.00,
        'status' => 'earned',
        'date' => '2026-10-17 10:00:00'
    ],

    // --- 3. SURGICAL PROCEDURES (Lead Surgeon, Assistant, Anesthesiology) ---
    [
        'doctor_id' => 102,
        'doctor_name' => 'Dr. Elena Rostova',
        'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
        'patient_id' => 1,
        'patient_name' => 'Eleanor Vance',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10015',
        'item_code' => 'SRV-SURG-LAP-CHOLE',
        'desc' => 'Operating Room Lead Surgeon: Laparoscopic Cholecystectomy with Cholangiogram',
        'cat' => 'surgical_lead',
        'gross' => 2200.00,
        'status' => 'earned',
        'date' => '2026-10-05 11:00:00'
    ],
    [
        'doctor_id' => 102,
        'doctor_name' => 'Dr. Elena Rostova',
        'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
        'patient_id' => 6,
        'patient_name' => 'Sarah Connor',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10029',
        'item_code' => 'SRV-SURG-APP',
        'desc' => 'Operating Room Lead Surgeon: Laparoscopic Appendectomy for Acute Appendicitis',
        'cat' => 'surgical_lead',
        'gross' => 1400.00,
        'status' => 'earned',
        'date' => '2026-10-14 16:30:00'
    ],
    [
        'doctor_id' => 108,
        'doctor_name' => 'Dr. Christopher Nolan',
        'doctor_specialty' => 'Orthopedic Surgery',
        'patient_id' => 8,
        'patient_name' => 'Thomas Wayne',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10041',
        'item_code' => 'SRV-SURG-ORIF-FEMUR',
        'desc' => 'Operating Room Lead Surgeon: Open Reduction & Internal Fixation (ORIF) Left Femur',
        'cat' => 'surgical_lead',
        'gross' => 2800.00,
        'status' => 'earned',
        'date' => '2026-10-11 13:00:00'
    ],
    [
        'doctor_id' => 108,
        'doctor_name' => 'Dr. Christopher Nolan',
        'doctor_specialty' => 'Orthopedic Surgery',
        'patient_id' => 9,
        'patient_name' => 'Martha Wayne',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10065',
        'item_code' => 'SRV-SURG-TKA',
        'desc' => 'Operating Room Lead Surgeon: Unilateral Total Knee Arthroplasty (TKA)',
        'cat' => 'surgical_lead',
        'gross' => 3200.00,
        'status' => 'earned',
        'date' => '2026-10-19 09:30:00'
    ],
    [
        'doctor_id' => 104,
        'doctor_name' => 'Dr. Arthur Sterling',
        'doctor_specialty' => 'Senior Anesthesiologist',
        'patient_id' => 1,
        'patient_name' => 'Eleanor Vance',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10015',
        'item_code' => 'SRV-ANES-LAP-GEN',
        'desc' => 'Senior Anesthesiologist: General Endotracheal Anesthesia (Laparoscopic Case 150 mins)',
        'cat' => 'anesthesiology',
        'gross' => 750.00,
        'status' => 'earned',
        'date' => '2026-10-05 11:00:00'
    ],
    [
        'doctor_id' => 104,
        'doctor_name' => 'Dr. Arthur Sterling',
        'doctor_specialty' => 'Senior Anesthesiologist',
        'patient_id' => 8,
        'patient_name' => 'Thomas Wayne',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10041',
        'item_code' => 'SRV-ANES-SPINAL',
        'desc' => 'Senior Anesthesiologist: Combined Spinal-Epidural Regional Anesthesia for Major Trauma',
        'cat' => 'anesthesiology',
        'gross' => 850.00,
        'status' => 'earned',
        'date' => '2026-10-11 13:00:00'
    ],
    [
        'doctor_id' => 104,
        'doctor_name' => 'Dr. Arthur Sterling',
        'doctor_specialty' => 'Senior Anesthesiologist',
        'patient_id' => 4,
        'patient_name' => 'Clara Oswald',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10082',
        'item_code' => 'SRV-ANES-OB-SPINAL',
        'desc' => 'Senior Anesthesiologist: Spinal Anesthesia for Urgent Cesarean Delivery',
        'cat' => 'anesthesiology',
        'gross' => 700.00,
        'status' => 'earned',
        'date' => '2026-10-16 14:00:00'
    ],
    [
        'doctor_id' => 111,
        'doctor_name' => 'Dr. Jennifer Reyes',
        'doctor_specialty' => 'Obstetrics & Gynecology',
        'patient_id' => 4,
        'patient_name' => 'Clara Oswald',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10082',
        'item_code' => 'SRV-SURG-C-SEC',
        'desc' => 'Operating Room Lead Surgeon: Primary Low Transverse Cesarean Section Delivery',
        'cat' => 'surgical_lead',
        'gross' => 2000.00,
        'status' => 'earned',
        'date' => '2026-10-16 14:00:00'
    ],
    [
        'doctor_id' => 102,
        'doctor_name' => 'Dr. Elena Rostova',
        'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
        'patient_id' => 8,
        'patient_name' => 'Thomas Wayne',
        'source_type' => 'or_surgery',
        'source_ref' => 'OR-2026-10041',
        'item_code' => 'SRV-SURG-ASST',
        'desc' => 'First Assistant Operating Surgeon: Complex Polytrauma Debridement & Fixation',
        'cat' => 'surgical_assistant',
        'gross' => 900.00,
        'status' => 'earned',
        'date' => '2026-10-11 13:00:00'
    ]
];

$count = 0;
foreach ($cases as $c) {
    $schedule = $service->findMatchingSchedule($c['doctor_id'], $c['cat'], $c['item_code']);
    $split = $service->computeCommissionShares($c['gross'], $schedule);
    $voucherNo = DoctorCommissionService::generateVoucherNumber($pdo);

    $ins = $pdo->prepare("
        INSERT INTO billing_doctor_commission_ledger (
            voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
            patient_id, patient_name, source_type, source_reference,
            item_code, service_description, service_category,
            gross_pf_amount, split_doctor_percent, split_hospital_percent,
            hospital_share_amount, doctor_share_gross, withholding_tax_percent,
            withholding_tax_amount, net_commission_payable, settlement_status,
            settlement_date, notes, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, NOW(), NOW()
        )
    ");

    $ins->execute([
        $voucherNo,
        $schedule['id'] ?? null,
        $c['doctor_id'],
        $c['doctor_name'],
        $c['doctor_specialty'],
        $c['patient_id'],
        $c['patient_name'],
        $c['source_type'],
        $c['source_ref'],
        $c['item_code'],
        $c['desc'],
        $c['cat'],
        $split['gross_pf'],
        $split['doctor_percent'],
        $split['hospital_percent'],
        $split['hospital_share'],
        $split['doctor_share_gross'],
        $split['withholding_tax_rate'],
        $split['withholding_tax_amount'],
        $split['net_payable'],
        $c['status'],
        $c['date'],
        "October 2026 Billing Settlement | Subsystem 6 Cashier/Folio Sync"
    ]);

    $count++;
}

echo "Successfully seeded {$count} settled doctor commission line items across Consultations, Ward Rounds, and Surgical Procedures!\n";
