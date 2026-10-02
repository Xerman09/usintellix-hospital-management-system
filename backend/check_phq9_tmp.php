<?php
require_once __DIR__ . '/app/Core/Autoload.php';
use App\Core\Database;
use App\Core\Env;
Env::load(__DIR__);
$pdo = Database::connection();
$r = $pdo->query("SHOW TABLES LIKE 'encounter_phq9'");
echo "PHQ-9 table: " . ($r->rowCount() > 0 ? 'EXISTS' : 'DOES NOT EXIST') . "\n";
$r2 = $pdo->query("DESCRIBE encounter_gad7");
while ($row = $r2->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " | " . $row['Type'] . " | " . ($row['Null'] ?? '') . "\n";
}
