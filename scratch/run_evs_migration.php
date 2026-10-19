<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

try {
    $db = Database::connection();
    echo "Connected to database successfully.\n";

    $sql = file_get_contents(__DIR__ . '/../backend/database/schema/300_bed_turnover_evs_logs.sql');
    $db->exec($sql);
    echo "SUCCESS: bed_turnover_logs table created!\n";

    // Verify table exists
    $cols = $db->query("DESCRIBE bed_turnover_logs")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "- {$c['Field']} ({$c['Type']})\n";
    }
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
