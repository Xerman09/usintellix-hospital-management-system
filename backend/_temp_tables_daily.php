<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$interest = ['patient', 'appointment', 'visit', 'bill', 'charge', 'payment', 'facility', 'user', 'provider', 'encounter'];
$found = [];
foreach ($tables as $t) {
    foreach ($interest as $i) {
        if (stripos($t, $i) !== false) {
            $found[] = $t;
            break;
        }
    }
}
echo implode("\n", $found) . "\n";
