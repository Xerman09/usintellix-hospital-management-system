<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$tables = ['%dispense%', '%rx%', '%drug%'];
foreach ($tables as $t) {
    echo "Tables like $t:\n";
    $stmt = $pdo->query("SHOW TABLES LIKE '$t'");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        echo $row[0] . "\n";
    }
}
