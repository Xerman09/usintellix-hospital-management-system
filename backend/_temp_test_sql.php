<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("SELECT DISTINCT code_type FROM codes");
    $types = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Distinct code types:\n";
    print_r($types);
    
    $stmt = $pdo->query("SELECT DISTINCT category FROM codes");
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Distinct categories:\n";
    print_r($categories);
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
