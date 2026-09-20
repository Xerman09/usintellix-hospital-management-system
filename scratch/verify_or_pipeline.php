<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';
require_once __DIR__ . '/../backend/config/database.php';

use App\Core\Database;
use App\Modules\OrManagement\Services\OrManagementService;

echo "=== VERIFYING OR MANAGEMENT FULL PIPELINE ===\n";

$db = Database::connection();
$service = new OrManagementService();

// 1. Check suites
$suites = $service->getSuites();
echo "OR Suites count: " . count($suites) . "\n";
assert(count($suites) >= 6, "Expected at least 6 suites");

// 2. Check schedule
$schedule = $service->getSchedule(['date' => date('Y-m-d')]);
echo "Schedule Cases today count: " . count($schedule['cases']) . "\n";
echo "KPIs: Total=" . ($schedule['kpis']['total_cases'] ?? 0) . 
     ", InProgress=" . ($schedule['kpis']['in_progress'] ?? 0) . 
     ", PACU=" . ($schedule['kpis']['in_pacu'] ?? 0) . 
     ", Utilization=" . ($schedule['kpis']['utilization_rate'] ?? 0) . "%\n";

// 3. Check EHR patient linking
echo "\n--- Checking patient linking in existing cases ---\n";
foreach ($schedule['cases'] as $c) {
    if (!empty($c['patient_id'])) {
        $stmt = $db->prepare("SELECT id, patient_no, first_name, last_name FROM patients WHERE id = :id");
        $stmt->execute(['id' => $c['patient_id']]);
        $pat = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($pat) {
            echo "[OK] Case {$c['case_number']} -> Patient #{$pat['id']} {$pat['first_name']} {$pat['last_name']} ({$pat['patient_no']})\n";
        } else {
            echo "[WARN] Case {$c['case_number']} has patient_id {$c['patient_id']} but not found in patients table\n";
        }
    }
}

// 4. Test booking a new case linked to PAT-000021
echo "\n--- Testing booking new surgical case ---\n";
$newCaseData = [
    'or_suite_id'                => $suites[0]['id'],
    'scheduled_date'             => date('Y-m-d'),
    'scheduled_start_time'       => '15:30:00',
    'estimated_duration_minutes' => 90,
    'case_priority'              => 'Urgent',
    'perioperative_stage'        => 'Scheduled',
    'surgical_specialty'         => 'General Surgery',
    'procedure_name'             => 'Exploratory Laparotomy with Adhesiolysis',
    'preop_diagnosis'            => 'Small Bowel Obstruction',
    'lead_surgeon'               => 'Dr. Mark Villareal, MD, FPCS',
    'assistant_surgeon'          => 'Dr. Ronald Santos, MD',
    'anesthesiologist'           => 'Dr. Karen Ong, MD, DPBA',
    'anesthesia_type'            => 'General',
    'scrub_nurse'                => 'E. Ramos, RN',
    'circulating_nurse'          => 'A. Bautista, RN',
    'preop_cleared'              => 1,
    'consent_signed'             => 1,
    'blood_reserved'             => 1,
    'blood_units_reserved'       => 2,
    'notes'                      => 'Urgent decompress required',
    'patient_id'                 => 21,
    'patient_name'               => 'EHR Test Patient 21',
    'patient_mrn'                => 'PAT-000021'
];

$booked = $service->scheduleCase($newCaseData, 1);
echo "Successfully booked new case: ID=" . $booked['id'] . ", Case#=" . $booked['case_number'] . "\n";
assert(!empty($booked['id']), "Booked case should have ID");

// 5. Test stage transitions
echo "\n--- Testing stage transitions ---\n";
// Step A: In Room
$s1 = $service->transitionStage($booked['id'], 'In Room / Induction');
echo "Stage transitioned to: {$s1['perioperative_stage']}, Actual In Room: {$s1['actual_in_room_time']}\n";
assert(!empty($s1['actual_in_room_time']), "In Room time should be populated");

// Check suite is marked 'In Surgery'
$stA = $db->query("SELECT status, current_case_id FROM or_suites WHERE id = {$suites[0]['id']}")->fetch(PDO::FETCH_ASSOC);
echo "Suite status: {$stA['status']}, current_case_id: {$stA['current_case_id']}\n";
assert($stA['status'] === 'In Surgery', "Suite should be In Surgery");

// Step B: Incision
$s2 = $service->transitionStage($booked['id'], 'Incision / In Progress');
echo "Stage transitioned to: {$s2['perioperative_stage']}, Actual Incision: {$s2['actual_incision_time']}\n";
assert(!empty($s2['actual_incision_time']), "Incision time should be populated");

// Step C: PACU
$s3 = $service->transitionStage($booked['id'], 'In PACU', [
    'pacu_bed_no' => 'PACU-04',
    'estimated_blood_loss_ml' => 150,
    'postop_diagnosis' => 'Adhesions divided successfully'
]);
echo "Stage transitioned to: {$s3['perioperative_stage']}, Actual Out Room: {$s3['actual_out_room_time']}, PACU Bed: {$s3['pacu_bed_no']}, EBL: {$s3['estimated_blood_loss_ml']} mL\n";
assert(!empty($s3['actual_out_room_time']), "Out room time should be populated");

// Check suite is now marked 'Cleaning / Turnover'
$stB = $db->query("SELECT status, turnover_started_at FROM or_suites WHERE id = {$suites[0]['id']}")->fetch(PDO::FETCH_ASSOC);
echo "Suite status after PACU: {$stB['status']}, Turnover started: {$stB['turnover_started_at']}\n";
assert($stB['status'] === 'Cleaning / Turnover', "Suite should be in Cleaning / Turnover");

// Step D: Transferred / Discharged
$s4 = $service->transitionStage($booked['id'], 'Transferred / Discharged', [
    'pacu_aldrete_score' => 9,
    'postop_disposition' => 'Surgical Inpatient Ward'
]);
echo "Stage transitioned to: {$s4['perioperative_stage']}, Aldrete Score: {$s4['pacu_aldrete_score']}, Disp: {$s4['postop_disposition']}\n";
assert($s4['pacu_aldrete_score'] === 9, "Aldrete score should be 9");

// 6. Test suite status change
echo "\n--- Testing suite status reset ---\n";
$service->updateSuiteStatus($suites[0]['id'], 'Available');
$stC = $db->query("SELECT status FROM or_suites WHERE id = {$suites[0]['id']}")->fetch(PDO::FETCH_ASSOC);
echo "Suite reset status: {$stC['status']}\n";
assert($stC['status'] === 'Available', "Suite status should be Available");

echo "\nALL PIPELINE TESTS PASSED EXCELLENTLY!\n";
