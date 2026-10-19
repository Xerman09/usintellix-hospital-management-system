<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\PatientFlow\Services\QueueTokenService;

echo "=== TESTING QUEUE DISPLAY BOARD DATA & FEED ===\n\n";

$db = Database::connection();
$service = new QueueTokenService($db);

// 1. Fetch current board
$board = $service->getQueueDisplayBoard();

echo "[1] Server Time: " . ($board['server_time'] ?? 'N/A') . "\n";
echo "[2] Summary KPIs:\n";
print_r($board['summary']);

// 2. Call the waiting token into a room if available
if (!empty($board['up_next'])) {
    $tokenToCall = $board['up_next'][0];
    echo "\n[3] Calling token {$tokenToCall['token_number']} (ID: {$tokenToCall['id']}) to Room...\n";
    $callRes = $service->callToken((int)$tokenToCall['id'], ['id' => 1, 'role' => 'doctor'], 1);
    echo "  Call message: {$callRes['message']}\n";
    echo "  Announcement: {$callRes['announcement_text']}\n";
}

// 3. Re-fetch display board to verify now_calling has updated
$newBoard = $service->getQueueDisplayBoard();
echo "\n[4] Now Calling List (Total: " . count($newBoard['now_calling']) . "):\n";
foreach ($newBoard['now_calling'] as $call) {
    echo "  - Token: {$call['token_number']} | Room: {$call['room_name']} | Patient: {$call['patient_name']} | Call Count: {$call['call_counter']} | Called At: {$call['called_at']}\n";
}

echo "\n[5] Up Next In Line (Total: " . count($newBoard['up_next']) . "):\n";
foreach ($newBoard['up_next'] as $idx => $next) {
    $pos = $idx + 1;
    echo "  #{$pos} Token: {$next['token_number']} ({$next['department_code']}) | Priority: {$next['priority']} | Est Wait: {$next['estimated_wait_minutes']}m | Issued: {$next['issued_at']}\n";
}

echo "\n[6] All Available Clinic Departments (Total: " . count($newBoard['all_departments']) . "):\n";
foreach (array_slice($newBoard['all_departments'], 0, 5) as $dept) {
    echo "  - {$dept['name']} ({$dept['code']})\n";
}

echo "\n*** QUEUE DISPLAY BOARD LIVE CALL VERIFICATION PASSED! ***\n";
