<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Check patient_immunizations
echo "=== patient_immunizations ===\n";
$stmt = $pdo->query('DESCRIBE patient_immunizations');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check immunizations (cvx codes)
echo "=== immunizations (CVX) ===\n";
$stmt = $pdo->query('DESCRIBE immunizations');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check sample data
echo "=== sample patient_immunizations ===\n";
$stmt = $pdo->query('SELECT * FROM patient_immunizations LIMIT 3');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== sample immunizations ===\n";
$stmt = $pdo->query('SELECT * FROM immunizations LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
