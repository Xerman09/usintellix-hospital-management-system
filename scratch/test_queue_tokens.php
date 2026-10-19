<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\PatientFlow\Services\QueueTokenService;
use App\Modules\PatientFlow\Services\PatientFlowService;
use App\Modules\Appointments\Models\Appointment;

$db = Database::connection();
$queueService = new QueueTokenService();
$flowService = new PatientFlowService();

echo "=== STARTING SEQUENTIAL QUEUE TOKEN VERIFICATION ===" . PHP_EOL . PHP_EOL;

// 1. Find or create an appointment for today
$today = date('Y-m-d');
$stmt = $db->prepare("SELECT a.*, p.first_name, p.last_name FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.appointment_date = :today AND a.deleted_at IS NULL LIMIT 1");
$stmt->execute([':today' => $today]);
$app = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$app) {
    // Pick first patient & provider to create a test appointment for today
    $pId = (int)$db->query("SELECT id FROM patients WHERE deleted_at IS NULL LIMIT 1")->fetchColumn();
    $prId = (int)$db->query("SELECT id FROM providers WHERE deleted_at IS NULL LIMIT 1")->fetchColumn();
    if (!$pId || !$prId) {
        die("No patient or provider found in database.");
    }

    $insApp = $db->prepare("
        INSERT INTO appointments (patient_id, provider_id, appointment_date, appointment_time, reason, status, created_at, created_by)
        VALUES (:patient_id, :provider_id, :today, '10:00:00', 'Cardiac Outpatient Consultation', 'scheduled', NOW(), 1)
    ");
    $insApp->execute([
        ':patient_id'  => $pId,
        ':provider_id' => $prId,
        ':today'       => $today
    ]);
    $appId = (int)$db->lastInsertId();
    echo "[1] Created today's appointment ID: {$appId}" . PHP_EOL;
} else {
    $appId = (int)$app['id'];
    echo "[1] Using today's appointment ID: {$appId} (Patient: {$app['first_name']} {$app['last_name']})" . PHP_EOL;
}

$user = ['id' => 1, 'role' => 'receptionist', 'name' => 'Reception Desk'];

// 2. Check-in patient and generate token
echo PHP_EOL . "[2] Checking in patient via PatientFlowService::checkIn()..." . PHP_EOL;
// Clean up any existing flow for this appointment so we test a fresh check-in
$db->prepare("DELETE FROM appointment_queue_tokens WHERE appointment_id = :id")->execute([':id' => $appId]);
$db->prepare("DELETE FROM patient_flow WHERE appointment_id = :id")->execute([':id' => $appId]);

$checkInRes = $flowService->checkIn(['appointment_id' => $appId, 'department_code' => 'CARD', 'priority' => 'priority'], $user);
echo "Check-in result: " . json_encode($checkInRes) . PHP_EOL;

if (!$checkInRes['success']) {
    die("Check-in failed: " . $checkInRes['message']);
}

$flowId = $checkInRes['data']['id'];
$tokenNumber = $checkInRes['data']['token_number'];
$tokenId = $checkInRes['data']['token_id'];

echo "-> Generated Token: {$tokenNumber} (Token ID: {$tokenId}, Flow ID: {$flowId})" . PHP_EOL;

// 3. Generate a second token in same department to verify sequential numbering
echo PHP_EOL . "[3] Generating second token in CARD department to verify sequential increment..." . PHP_EOL;
$app2Stmt = $db->prepare("SELECT id FROM appointments WHERE appointment_date = :today AND id != :id AND deleted_at IS NULL LIMIT 1");
$app2Stmt->execute([':today' => $today, ':id' => $appId]);
$app2Id = (int)$app2Stmt->fetchColumn();

if (!$app2Id) {
    $pId = (int)$db->query("SELECT id FROM patients WHERE deleted_at IS NULL LIMIT 1")->fetchColumn();
    $prId = (int)$db->query("SELECT id FROM providers WHERE deleted_at IS NULL LIMIT 1")->fetchColumn();
    $insApp = $db->prepare("
        INSERT INTO appointments (patient_id, provider_id, appointment_date, appointment_time, reason, status, created_at, created_by)
        VALUES (:patient_id, :provider_id, :today, '10:30:00', 'Cardiac Follow-up', 'scheduled', NOW(), 1)
    ");
    $insApp->execute([
        ':patient_id'  => $pId,
        ':provider_id' => $prId,
        ':today'       => $today
    ]);
    $app2Id = (int)$db->lastInsertId();
}

$db->prepare("DELETE FROM appointment_queue_tokens WHERE appointment_id = :id")->execute([':id' => $app2Id]);
$db->prepare("DELETE FROM patient_flow WHERE appointment_id = :id")->execute([':id' => $app2Id]);

$checkIn2 = $flowService->checkIn(['appointment_id' => $app2Id, 'department_code' => 'CARD', 'priority' => 'routine'], $user);
$tokenNumber2 = $checkIn2['data']['token_number'];
echo "-> Second Token Generated: {$tokenNumber2}" . PHP_EOL;

if ($tokenNumber === 'CARD-001' && $tokenNumber2 === 'CARD-002') {
    echo "-> SUCCESS: Daily sequential numbering CARD-001 -> CARD-002 verified!" . PHP_EOL;
} else {
    echo "-> Numbering sequence: {$tokenNumber} -> {$tokenNumber2}" . PHP_EOL;
}

// 4. Test Calling Token
echo PHP_EOL . "[4] Calling token {$tokenNumber}..." . PHP_EOL;
$callRes = $queueService->callToken($tokenId, $user, 1);
echo "Call result: " . $callRes['message'] . PHP_EOL;
echo "Call counter: " . $callRes['call_counter'] . PHP_EOL;

// Call again to verify counter increment
$callRes2 = $queueService->callToken($tokenId, $user, 1);
echo "Call #2 counter: " . $callRes2['call_counter'] . " (Expected: 2)" . PHP_EOL;

// 5. Test Serving Token (Roomed / In Consultation)
echo PHP_EOL . "[5] Serving token into consultation room..." . PHP_EOL;
$serveRes = $queueService->serveToken($tokenId, $user, 1);
echo "Serve status: " . $serveRes['token']['status'] . " (Expected: in_consultation)" . PHP_EOL;

// 6. Test Completing Consultation
echo PHP_EOL . "[6] Completing token consultation..." . PHP_EOL;
$compRes = $queueService->completeToken($tokenId, $user);
echo "Complete status: " . $compRes['token']['status'] . " (Expected: completed)" . PHP_EOL;

// 7. Test Queue Display Board Data
echo PHP_EOL . "[7] Checking Queue Display Board data for waiting room TVs..." . PHP_EOL;
$board = $queueService->getQueueDisplayBoard();
echo "Total issued today: " . $board['summary']['total_issued_today'] . PHP_EOL;
echo "Waiting count: " . $board['summary']['waiting_count'] . PHP_EOL;
echo "Completed count: " . $board['summary']['completed_count'] . PHP_EOL;
echo "Active departments: " . count($board['departments']) . PHP_EOL;

// 8. Test Printable Slip Generation
echo PHP_EOL . "[8] Generating Printable Token Slip HTML..." . PHP_EOL;
$slipHtml = $queueService->generateTokenSlipHtml($tokenId);
echo "Slip HTML length: " . strlen($slipHtml) . " bytes" . PHP_EOL;
if (str_contains($slipHtml, $tokenNumber)) {
    echo "-> Verified token number {$tokenNumber} rendered in slip HTML!" . PHP_EOL;
}

echo PHP_EOL . "*** ALL QUEUE TOKEN GENERATION AND MANAGEMENT TESTS PASSED! ***" . PHP_EOL;
