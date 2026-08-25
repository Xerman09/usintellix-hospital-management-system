<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Look for any report history/log tables
echo "=== Tables with 'report' in name ===\n";
$stmt = $pdo->query("SHOW TABLES LIKE '%report%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== Tables with 'log' or 'history' in name ===\n";
$stmt = $pdo->query("SHOW TABLES LIKE '%log%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt = $pdo->query("SHOW TABLES LIKE '%history%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
