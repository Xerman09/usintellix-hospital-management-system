<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

$stmt = $pdo->query("DESCRIBE messages");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- message_statuses ---\n";
$stmt = $pdo->query("DESCRIBE message_statuses");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- message_types ---\n";
$stmt = $pdo->query("DESCRIBE message_types");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
