<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
echo 'Total Patients: ' . $pdo->query('SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL')->fetchColumn() . "\n";
echo 'Patients with encounters: ' . $pdo->query('SELECT COUNT(DISTINCT patient_id) FROM encounters WHERE deleted_at IS NULL')->fetchColumn() . "\n";
