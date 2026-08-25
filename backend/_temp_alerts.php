<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$stmt = $pdo->query('SHOW TABLES');
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Let's also look at all columns of all tables
$alertColumns = [];
foreach ($tables as $t) {
    if (stripos($t, 'alert') !== false) {
        echo "TABLE: $t\n";
    }
    
    $cols = $pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($cols as $c) {
        if (stripos($c, 'alert') !== false) {
            $alertColumns[] = "$t.$c";
        }
    }
}
echo "COLUMNS:\n" . implode("\n", $alertColumns) . "\n";
