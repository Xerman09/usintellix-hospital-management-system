<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("DESCRIBE patient_medical_problems");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "patient_medical_problems columns:\n";
    print_r($columns);
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
