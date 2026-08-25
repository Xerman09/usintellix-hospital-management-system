<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$tables = ['patient_flow'];
foreach ($tables as $t) {
    echo "TABLE: $t\n";
    $cols = $pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) {
        echo "  " . $c['Field'] . " (" . $c['Type'] . ")\n";
    }
}
