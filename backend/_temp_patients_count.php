<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Count total patients
$stmt = $pdo->query('SELECT count(*) as total FROM patients WHERE deleted_at IS NULL');
$total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
echo "Total Patients: $total\n";

// Count adults
$stmt = $pdo->query('SELECT count(*) as total FROM patients WHERE deleted_at IS NULL AND timestampdiff(YEAR, dob, curdate()) >= 18');
$adults = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
echo "Total Adults: $adults\n";
