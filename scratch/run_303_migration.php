<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

echo "=== RUNNING MIGRATION 303: VISITOR MANAGEMENT ===\n\n";

$db = Database::connection();

$sql = file_get_contents(__DIR__ . '/../backend/database/schema/303_visitor_management.sql');

// Split SQL queries by semicolon
$queries = array_filter(array_map('trim', explode(';', $sql)));

foreach ($queries as $i => $q) {
    if (empty($q)) continue;
    try {
        $db->exec($q);
        echo " [Query " . ($i + 1) . "] Executed successfully.\n";
    } catch (\Throwable $e) {
        echo " [Query " . ($i + 1) . "] Error: " . $e->getMessage() . "\n";
    }
}

// Verify tables created
echo "\nVerifying tables created:\n";
$tables = ['ward_visitor_policies', 'visitor_passes'];
foreach ($tables as $tbl) {
    $count = $db->query("SHOW TABLES LIKE '{$tbl}'")->rowCount();
    echo " Table {$tbl}: " . ($count ? "EXISTS (OK)" : "MISSING (ERROR)") . "\n";
}

$policyCount = $db->query("SELECT COUNT(*) FROM ward_visitor_policies")->fetchColumn();
echo " Default visitor policies seeded: {$policyCount}\n";

echo "\n*** MIGRATION 303 RUN COMPLETED! ***\n";
