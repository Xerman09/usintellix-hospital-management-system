<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Check from which module immunizations are saved - look at the patient detail record
echo "=== Check encounter_immunizations or similar ===\n";
$stmt = $pdo->query("SHOW TABLES LIKE '%immun%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check how it is stored in the health-records/immunizations module
echo "\n=== Check all encounter tables related to immunizations ===\n";
$stmt = $pdo->query("SELECT * FROM patient_immunizations");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check if there's a different column for patient reference
echo "\n=== DESCRIBE patient_immunizations full ===\n";
$stmt = $pdo->query("DESCRIBE patient_immunizations");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
