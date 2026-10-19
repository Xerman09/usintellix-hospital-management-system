<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

try {
    $db = Database::connection();
    $sql = file_get_contents(__DIR__ . '/../backend/database/schema/299_inpatient_discharge_summaries.sql');
    $db->exec($sql);
    echo "SUCCESS: inpatient_discharge_summaries table created!\n";
    
    $cols = $db->query("DESCRIBE inpatient_discharge_summaries")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "- {$c['Field']} ({$c['Type']})\n";
    }
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
