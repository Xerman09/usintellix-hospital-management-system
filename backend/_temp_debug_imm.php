<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

echo "=== All patient_immunizations (no filters) ===\n";
$stmt = $pdo->query('SELECT * FROM patient_immunizations LIMIT 10');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== Check if deleted_at is blocking ===\n";
$stmt = $pdo->query('SELECT id, patient_id, cvx_code, vaccine_name, vis_date_given, deleted_at FROM patient_immunizations');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== Check patient table for patient_id join ===\n";
$stmt = $pdo->query('SELECT id, patient_no, first_name, last_name, deleted_at FROM patients LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
