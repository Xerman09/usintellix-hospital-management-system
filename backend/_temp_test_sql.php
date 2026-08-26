<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("SHOW TABLES LIKE '%chart%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Chart tables:\n";
    print_r($tables);
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
