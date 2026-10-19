<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

try {
    $db = Database::connection();
    echo "Connected to database.\n";

    $sql = file_get_contents(__DIR__ . '/../backend/database/schema/301_alter_inpatient_transfers_nurse_handover.sql');
    $db->exec($sql);
    echo "SUCCESS: 301_alter_inpatient_transfers_nurse_handover.sql executed!\n";

    $cols = $db->query("DESCRIBE inpatient_transfers")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "- {$c['Field']} ({$c['Type']})\n";
    }
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
