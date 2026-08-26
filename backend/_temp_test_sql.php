<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("SHOW TABLES LIKE '%order%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Order tables:\n";
    print_r($tables);
    
    $stmt = $pdo->query("SHOW TABLES LIKE '%procedure%'");
    $tables2 = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Procedure tables:\n";
    print_r($tables2);
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
