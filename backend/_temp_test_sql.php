<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("SHOW TABLES LIKE '%service%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    print_r($tables);
    
    $stmt2 = $pdo->query("SHOW TABLES LIKE '%background%'");
    $tables2 = $stmt2->fetchAll(PDO::FETCH_COLUMN);
    print_r($tables2);
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
