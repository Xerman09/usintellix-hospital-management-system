<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Check CVX codes table
echo "=== cvx_codes table ===\n";
$stmt = $pdo->query('SELECT * FROM cvx_codes LIMIT 10');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Count: " . count($rows) . "\n";
print_r($rows);
