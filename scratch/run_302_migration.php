<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

$db = Database::connection();
$sql = file_get_contents(__DIR__ . '/../backend/database/schema/302_appointment_queue_tokens.sql');

try {
    $db->exec($sql);
    echo "Migration 302 applied successfully!" . PHP_EOL;

    $stmt = $db->query("SHOW TABLES LIKE 'appointment_queue_tokens'");
    echo "appointment_queue_tokens: " . ($stmt->fetch() ? "CREATED" : "FAILED") . PHP_EOL;

    $stmt2 = $db->query("SHOW COLUMNS FROM patient_flow LIKE 'queue_token_id'");
    echo "patient_flow.queue_token_id: " . ($stmt2->fetch() ? "ADDED" : "FAILED") . PHP_EOL;
} catch (Exception $e) {
    echo "Migration Error: " . $e->getMessage() . PHP_EOL;
}
