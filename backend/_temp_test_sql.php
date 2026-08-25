<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $sql = "DESCRIBE facilities";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
