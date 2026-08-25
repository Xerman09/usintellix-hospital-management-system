<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$stmt = $pdo->query('DESCRIBE providers');
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($results);
