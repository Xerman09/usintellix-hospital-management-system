<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\RoomManagement\Services\BedTurnoverService;
use App\Modules\RoomManagement\Services\RoomManagementService;

echo "=== STARTING EVS BED TURNOVER PIPELINE VERIFICATION ===\n\n";

$db = Database::connection();
$service = new BedTurnoverService();
$rmService = new RoomManagementService();

// Step 1: Pick an available bed or reset one for test
$bedStmt = $db->query("SELECT id, bed_number, status, room_id FROM hospital_beds ORDER BY id ASC LIMIT 1");
$bed = $bedStmt->fetch(PDO::FETCH_ASSOC);

if (!$bed) {
    echo "ERROR: No hospital beds found in database.\n";
    exit(1);
}

$bedId = (int)$bed['id'];
echo "[1] Testing Bed: ID {$bedId} (Number: {$bed['bed_number']}, Current Status: {$bed['status']})\n";

// Clear any open turnovers for this test bed
$db->prepare("DELETE FROM bed_turnover_logs WHERE bed_id = :id")->execute([':id' => $bedId]);

// Step 2: Initiate turnover
echo "[2] Initiating turnover...\n";
$initRes = $service->initiateTurnover($bedId, null, 1, 'STAT', 'Terminal Cleaning', 'STAT terminal sanitization requested for rapid turnaround.');
echo "Initiate result: " . json_encode($initRes) . "\n";
assert($initRes['success'] === true, "Initiate turnover should succeed");
$turnoverId = (int)$initRes['turnover_id'];
$turnoverNum = $initRes['turnover_number'];
echo "-> Created Turnover ID: {$turnoverId}, Number: {$turnoverNum}\n";

// Verify bed is now 'Dirty / Turnover'
$checkBed = $rmService->findBed($bedId);
echo "-> Bed status in hospital_beds: {$checkBed['status']}\n";
assert($checkBed['status'] === 'Dirty / Turnover', "Bed status should be 'Dirty / Turnover'");

// Step 3: Assign staff
echo "\n[3] Assigning EVS staff...\n";
$assignRes = $service->assignStaff($turnoverId, [
    'staff_id' => 99,
    'staff_name' => 'Maria Santos (EVS Lead)',
    'cleaning_priority' => 'STAT',
    'cleaning_type' => 'Terminal Cleaning',
    'target_sla_minutes' => 30
]);
echo "Assign result: " . $assignRes['message'] . "\n";
assert($assignRes['success'] === true, "Assign staff should succeed");
$detail = $service->getTurnoverDetail($turnoverId);
assert($detail['assigned_evs_staff_name'] === 'Maria Santos (EVS Lead)');

// Step 4: Start cleaning
echo "\n[4] Starting cleaning...\n";
$startRes = $service->startCleaning($turnoverId, [
    'cleaned_by' => 'Maria Santos (EVS Lead)'
]);
echo "Start result: " . $startRes['message'] . "\n";
assert($startRes['success'] === true, "Start cleaning should succeed");
$detail = $service->getTurnoverDetail($turnoverId);
assert($detail['status'] === 'Cleaning In-Progress');
assert(!empty($detail['cleaning_started_at']));

// Step 5: Complete cleaning & submit checklist
echo "\n[5] Completing cleaning with sanitization checklist...\n";
$checklist = [
    'linens_stripped_and_replaced' => true,
    'high_touch_surfaces_disinfected' => true,
    'floor_wet_mopped_disinfectant' => true,
    'bathroom_sanitized' => true,
    'trash_biohazard_emptied' => true,
    'terminal_uv_disinfection_run' => true,
    'ppe_and_soap_restocked' => true
];
$compRes = $service->completeCleaning($turnoverId, [
    'checklist' => $checklist,
    'cleaned_by' => 'Maria Santos (EVS Lead)',
    'notes' => 'Terminal UV cycle completed. Negative pressure room wiped down.'
]);
echo "Complete result: " . $compRes['message'] . "\n";
assert($compRes['success'] === true, "Complete cleaning should succeed");
$detail = $service->getTurnoverDetail($turnoverId);
assert($detail['status'] === 'Sanitized / Pending Inspection');
assert(!empty($detail['cleaning_completed_at']));
assert($detail['cleaning_duration_minutes'] >= 0);

// Step 6: Inspect and Release bed to Available
echo "\n[6] Inspecting and releasing bed...\n";
$inspRes = $service->inspectAndRelease($turnoverId, [
    'inspection_status' => 'Passed',
    'inspector_name' => 'Nurse Supervisor Elena Reyes, RN',
    'notes' => 'Room fully sanitized, pristine condition, negative pressure verified.'
], 1);
echo "Inspect result: " . $inspRes['message'] . "\n";
assert($inspRes['success'] === true, "Inspect and release should succeed");

// Verify turnover log status
$finalDetail = $service->getTurnoverDetail($turnoverId);
echo "Final turnover status: {$finalDetail['status']}\n";
echo "Inspection status: {$finalDetail['inspection_status']}\n";
echo "Turnover duration: {$finalDetail['turnover_duration_minutes']} min(s)\n";
echo "SLA Breached: " . ($finalDetail['is_sla_breached'] ? 'YES' : 'NO') . "\n";
assert($finalDetail['status'] === 'Completed / Available');
assert($finalDetail['inspection_status'] === 'Passed');

// Verify bed in hospital_beds is now 'Available'
$finalBed = $rmService->findBed($bedId);
echo "-> Bed status in hospital_beds is now: {$finalBed['status']}\n";
assert($finalBed['status'] === 'Available', "Bed must be released to 'Available'");

// Step 7: Check stats
echo "\n[7] Checking EVS Stats...\n";
$stats = $service->getStats();
echo "Stats: " . json_encode($stats, JSON_PRETTY_PRINT) . "\n";
assert(isset($stats['pending_dirty']));
assert(isset($stats['avg_turnover_minutes']));
assert(isset($stats['sla_compliance_rate']));

echo "\n*** ALL 7 TESTS PASSED SUCCESSFULLY! ***\n";
